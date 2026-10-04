const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const OnlineTest = require('../models/OnlineTest');
const TestResult = require('../models/TestResult');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { notifyMany } = require('../utils/notify');
const { uploadSingle, fileUrl } = require('../utils/upload');
const { awardXp, XP } = require('../utils/xp');
const { recordMistakes } = require('../utils/mistakes');
const {
    getAccessibleStudent,
    resolveStudent,
    getOwnStudent,
    classScopeFilter,
    isOwnerOrAdmin,
    isObjectId,
    sameId,
} = require('../utils/access');

const NUMERIC_TOLERANCE = 0.01;
const SUBMIT_GRACE_MS = 2 * 60 * 1000; // allow late network submissions up to 2 min after endTime

const EDITABLE_FIELDS = ['title', 'description', 'questionPaperUrl', 'subjectId', 'classId', 'batchId', 'questions',
    'duration', 'totalMarks', 'passingMarks', 'negativeMarks', 'startTime', 'endTime', 'status', 'isMock', 'sections', 'pattern'];

// JEE Main pattern: 3 sections x (20 MCQ +4/-1 + 5 numerical +4/0), 180 min
const JEE_MAIN = {
    duration: 180,
    sectionNames: ['Physics', 'Chemistry', 'Mathematics'],
    perSection: 25,
    mcq: { marks: 4, negativeMarks: 1 },
    numerical: { marks: 4, negativeMarks: 0 },
};

const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc; }, {});

// Normalise incoming question payloads
const normalizeQuestions = (questions, pattern) => (Array.isArray(questions) ? questions : []).map(q => {
    const type = q.type === 'numerical' ? 'numerical' : 'mcq';
    const jee = pattern === 'jee_main' ? JEE_MAIN[type] : null;
    const out = {
        questionText: q.questionText,
        type,
        options: type === 'mcq' ? (Array.isArray(q.options) ? q.options.map(String) : []) : [],
        marks: q.marks !== undefined && q.marks !== '' && q.marks !== null ? Number(q.marks) : (jee ? jee.marks : 1),
    };
    if (q.negativeMarks !== undefined && q.negativeMarks !== '' && q.negativeMarks !== null && Number.isFinite(Number(q.negativeMarks))) {
        out.negativeMarks = Math.abs(Number(q.negativeMarks));
    } else if (jee) {
        out.negativeMarks = jee.negativeMarks;
    }
    if (q.solution !== undefined && q.solution !== null) out.solution = String(q.solution).slice(0, 20000);
    if (q.chapter !== undefined && q.chapter !== null) out.chapter = String(q.chapter).slice(0, 200);
    if (q.bankItemId && isObjectId(String(q.bankItemId))) out.bankItemId = q.bankItemId;
    if (q._id && isObjectId(String(q._id))) out._id = q._id;
    if (type === 'mcq') out.correctOption = Number(q.correctOption);
    else out.correctAnswer = Number(q.correctAnswer);
    return out;
});

const sumMarks = (questions) => questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

// Normalise sections [{name, subjectId?, questionIndexes:[Number]}]; returns { sections } or { error }
function normalizeSections(sections, questionCount) {
    if (!Array.isArray(sections)) return { sections: [] };
    const out = [];
    for (const sec of sections) {
        if (!sec || !String(sec.name || '').trim()) return { error: 'Each section needs a name' };
        const idx = (Array.isArray(sec.questionIndexes) ? sec.questionIndexes : []).map(Number);
        if (idx.some(i => !Number.isInteger(i) || i < 0 || i >= questionCount)) {
            return { error: 'Section "' + sec.name + '" has an invalid question index' };
        }
        const row = { name: String(sec.name).trim().slice(0, 100), questionIndexes: [...new Set(idx)] };
        if (sec.subjectId && isObjectId(String(sec.subjectId))) row.subjectId = sec.subjectId;
        out.push(row);
    }
    return { sections: out };
}

// Default JEE Main sections: consecutive blocks (25 each for a 75-question paper) named Physics, Chemistry, Mathematics
function defaultJeeSections(questionCount) {
    if (questionCount === 0) return [];
    const per = questionCount === JEE_MAIN.perSection * 3 ? JEE_MAIN.perSection : Math.ceil(questionCount / 3);
    return JEE_MAIN.sectionNames.map((name, s) => ({
        name,
        questionIndexes: Array.from({ length: per }, (_, i) => s * per + i).filter(i => i < questionCount),
    })).filter(sec => sec.questionIndexes.length);
}

// Validate isMock / pattern / sections on a payload (questionsForIndexes = the questions the sections point into)
function applyMockFields(data, questionsForIndexes) {
    if (data.pattern !== undefined && !['custom', 'jee_main'].includes(data.pattern)) return 'Invalid pattern';
    if (data.isMock !== undefined) data.isMock = data.isMock === true || data.isMock === 'true';
    if (data.sections !== undefined) {
        const { sections, error } = normalizeSections(data.sections, (questionsForIndexes || []).length);
        if (error) return error;
        data.sections = sections;
    }
    return null;
}

// % of submissions with score <= mine (2 decimals)
const percentileOf = (score, allScores) => {
    if (!allScores.length) return 0;
    const le = allScores.filter(x => x <= score).length;
    return Math.round((le / allScores.length) * 10000) / 100;
};

// Strip answers from a test for student-facing payloads
const sanitizeTest = (t) => {
    const obj = t.toObject ? t.toObject() : { ...t };
    obj.questions = (obj.questions || []).map(q => ({
        _id: q._id,
        questionText: q.questionText,
        type: q.type || 'mcq',
        options: q.options,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
    }));
    return obj;
};

const isBlank = (v) => v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));

const percentage = (score, total) => (total > 0 ? Math.round((score / total) * 10000) / 100 : 0);

// Notify students of the test's class (and batch, if set)
async function notifyStudentsOfTest(req, test) {
    const query = { classId: test.classId };
    if (test.batchId) query.batchId = test.batchId;
    const students = await Student.find(query).select('userId');
    const subject = await Subject.findById(test.subjectId).select('name');
    const subjectName = subject ? subject.name : 'your subject';
    await notifyMany(req.io, students.map(s => ({
        recipient: s.userId,
        title: 'New Online Test Added',
        message: `A new test "${test.title}" for ${subjectName} is now available.`,
        type: 'academic'
    })));
}

// Get all tests for a student (class-scoped, answers stripped)
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;

        const results = await TestResult.find({ studentId: student._id });
        const attemptedIds = results.map(r => r.testId);

        const tests = await OnlineTest.find({
            $and: [
                classScopeFilter(student),
                // Active tests, plus completed tests the student already attempted (to view results)
                { $or: [{ status: 'active' }, { status: 'completed', _id: { $in: attemptedIds } }] }
            ]
        })
            .populate('subjectId', 'name')
            .sort({ createdAt: -1 });

        const testsWithStatus = tests.map(t => {
            const result = results.find(r => r.testId.toString() === t._id.toString());
            return {
                ...sanitizeTest(t),
                attempted: !!result,
                score: result ? result.score : null
            };
        });

        res.json(testsWithStatus);
    } catch (err) {
        console.error('Fetch student tests error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Performance analysis for a student
router.get('/student/:studentId/analysis', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;

        const results = await TestResult.find({ studentId: student._id })
            .populate({ path: 'testId', select: 'title subjectId', populate: { path: 'subjectId', select: 'name' } })
            .sort({ submittedAt: 1 });

        const rows = results.map(r => ({
            pct: percentage(r.score, r.totalMarks),
            test: r.testId,
            date: r.submittedAt
        }));

        const testsTaken = rows.length;
        const avg = testsTaken ? rows.reduce((a, r) => a + r.pct, 0) / testsTaken : 0;
        const best = testsTaken ? Math.max(...rows.map(r => r.pct)) : 0;

        const subjMap = new Map();
        rows.forEach(r => {
            const subj = r.test && r.test.subjectId;
            if (!subj) return;
            const key = String(subj._id || subj);
            if (!subjMap.has(key)) subjMap.set(key, { subjectId: subj._id || subj, subjectName: subj.name || 'Subject', total: 0, testsTaken: 0 });
            const e = subjMap.get(key);
            e.total += r.pct;
            e.testsTaken += 1;
        });

        res.json({
            overall: {
                testsTaken,
                avgPercentage: Math.round(avg * 100) / 100,
                bestPercentage: Math.round(best * 100) / 100
            },
            bySubject: [...subjMap.values()].map(e => ({
                subjectId: e.subjectId,
                subjectName: e.subjectName,
                testsTaken: e.testsTaken,
                avgPercentage: Math.round((e.total / e.testsTaken) * 100) / 100
            })),
            trend: rows.map(r => ({
                testTitle: r.test ? r.test.title : 'Deleted test',
                date: r.date,
                percentage: r.pct
            }))
        });
    } catch (err) {
        console.error('Test analysis error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit a test
router.post('/submit', auth, async (req, res) => {
    try {
        const { testId } = req.body;
        const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

        // Student role: always derive the student from the token (ignore body studentId)
        let student;
        if (req.user.role === 'student') {
            student = await Student.findOne({ userId: req.user.id });
            if (!student) return res.status(404).json({ message: 'Student profile not found' });
        } else if (req.user.role === 'admin' || req.user.role === 'teacher') {
            student = await resolveStudent(req.body.studentId);
            if (!student) return res.status(404).json({ message: 'Student not found' });
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!isObjectId(String(testId))) return res.status(400).json({ message: 'Invalid test id' });
        const test = await OnlineTest.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        if (test.status !== 'active') return res.status(400).json({ message: 'This test is not active' });
        const now = Date.now();
        if (test.startTime && now < new Date(test.startTime).getTime()) {
            return res.status(400).json({ message: 'This test has not started yet' });
        }
        if (test.endTime && now > new Date(test.endTime).getTime() + SUBMIT_GRACE_MS) {
            return res.status(400).json({ message: 'The submission window for this test has closed' });
        }
        if ((test.classId && !sameId(test.classId, student.classId)) || (test.batchId && !sameId(test.batchId, student.batchId))) {
            return res.status(403).json({ message: 'This test is not assigned to your class' });
        }

        const existing = await TestResult.findOne({ testId: test._id, studentId: student._id });
        if (existing) return res.status(400).json({ message: 'You have already submitted this test' });

        const testNegative = Number(test.negativeMarks) || 0;
        let score = 0, correct = 0, wrong = 0, unattempted = 0;
        const perQuestion = []; // by question index: { delta, max, outcome: 'correct'|'wrong'|'skip' }
        const wrongItems = [];

        const processedAnswers = test.questions.map((q, qi) => {
            const a = answers.find(x => x && x.questionId != null && String(x.questionId) === String(q._id)) || {};
            const marks = Number(q.marks) || 1;
            // Per-question negative marks override (falls back to test-level)
            const negative = q.negativeMarks != null && Number.isFinite(Number(q.negativeMarks)) ? Math.abs(Number(q.negativeMarks)) : testNegative;
            const track = (outcome, yourAnswer) => {
                perQuestion[qi] = { delta: outcome === 'correct' ? marks : (outcome === 'wrong' ? -negative : 0), max: marks, outcome };
                if (outcome === 'wrong') wrongItems.push({ q, qi, yourAnswer });
            };

            if ((q.type || 'mcq') === 'numerical') {
                const raw = a.numericAnswer !== undefined ? a.numericAnswer : (a.answer !== undefined ? a.answer : a.selectedOption);
                if (isBlank(raw) || Number.isNaN(Number(raw))) {
                    unattempted++;
                    track('skip');
                    return { questionId: q._id, isCorrect: false };
                }
                const val = Number(raw);
                const isCorrect = q.correctAnswer != null && Math.abs(val - Number(q.correctAnswer)) <= NUMERIC_TOLERANCE;
                if (isCorrect) { score += marks; correct++; } else { score -= negative; wrong++; }
                track(isCorrect ? 'correct' : 'wrong', val);
                return { questionId: q._id, numericAnswer: val, isCorrect };
            }

            const raw = a.selectedOption;
            if (isBlank(raw) || Number.isNaN(Number(raw))) {
                unattempted++;
                track('skip');
                return { questionId: q._id, isCorrect: false };
            }
            const sel = Number(raw);
            const isCorrect = sel === Number(q.correctOption);
            if (isCorrect) { score += marks; correct++; } else { score -= negative; wrong++; }
            track(isCorrect ? 'correct' : 'wrong', sel);
            return { questionId: q._id, selectedOption: sel, isCorrect };
        });

        // Section-wise scores (mock tests)
        const sectionScores = (test.sections || []).map(sec => {
            const row = { name: sec.name, score: 0, max: 0, correct: 0, wrong: 0 };
            (sec.questionIndexes || []).forEach(i => {
                const p = perQuestion[i];
                if (!p) return;
                row.score += p.delta;
                row.max += p.max;
                if (p.outcome === 'correct') row.correct++;
                if (p.outcome === 'wrong') row.wrong++;
            });
            row.score = Math.round(row.score * 100) / 100;
            return row;
        });
        const sectionSubject = (qi) => {
            const sec = (test.sections || []).find(x => (x.questionIndexes || []).includes(qi));
            return (sec && sec.subjectId) || test.subjectId;
        };
        const xpEarned = correct * XP.TEST_CORRECT;

        score = Math.round(score * 100) / 100;
        const timeTaken = Number(req.body.timeTaken);

        const result = new TestResult({
            testId: test._id,
            studentId: student._id,
            answers: processedAnswers,
            score,
            totalMarks: test.totalMarks,
            correct,
            wrong,
            unattempted,
            sectionScores,
            xpEarned,
            timeTaken: Number.isFinite(timeTaken) && timeTaken >= 0 ? Math.round(timeTaken) : undefined
        });

        await result.save();

        // Percentile among all submissions so far (stored as a snapshot; reads recompute it live)
        const allScores = (await TestResult.find({ testId: test._id }).select('score')).map(r => r.score);
        const percentile = percentileOf(score, allScores);
        result.percentile = percentile;
        await TestResult.updateOne({ _id: result._id }, { $set: { percentile } });

        // Side effects: Mistake Notebook + XP (helpers never throw)
        await recordMistakes(student._id, wrongItems.map(({ q, qi, yourAnswer }) => ({
            question: q.toObject ? q.toObject() : q,
            yourAnswer,
            subjectId: sectionSubject(qi),
            chapter: q.chapter,
        })), { source: 'test', testId: test._id });
        if (xpEarned > 0) await awardXp(student._id, xpEarned);

        res.json({ ...result.toObject(), correct, wrong, unattempted, sectionScores, percentile, xpEarned });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get test result with rank
router.get('/result/:testId/:studentId', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;
        if (!isObjectId(req.params.testId)) return res.status(400).json({ message: 'Invalid test id' });

        const results = await TestResult.find({ testId: req.params.testId }).sort({ score: -1, submittedAt: 1 });
        const sid = student._id.toString();
        const studentResult = results.find(r => r.studentId.toString() === sid);

        if (!studentResult) return res.status(404).json({ message: 'Result not found' });

        const rank = results.findIndex(r => r.studentId.toString() === sid) + 1;
        const obj = studentResult.toObject();

        res.json({
            ...obj,
            sectionScores: obj.sectionScores || [],
            percentile: percentileOf(studentResult.score, results.map(r => r.score)),
            rank,
            totalStudents: results.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new test (Teacher/Admin)
router.post('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        const data = pick(req.body, EDITABLE_FIELDS);
        data.questions = normalizeQuestions(data.questions, data.pattern);
        if (data.pattern === 'jee_main') {
            if (data.isMock === undefined) data.isMock = true;
            if (data.duration === undefined || data.duration === '' || data.duration === null) data.duration = JEE_MAIN.duration;
            if (data.sections === undefined || (Array.isArray(data.sections) && data.sections.length === 0)) {
                data.sections = defaultJeeSections(data.questions.length);
            }
        }
        const mockErr = applyMockFields(data, data.questions);
        if (mockErr) return res.status(400).json({ message: mockErr });
        data.status = ['draft', 'active', 'completed'].includes(req.body.status) ? req.body.status : 'active';
        data.negativeMarks = Math.abs(Number(req.body.negativeMarks)) || 0;
        if (data.totalMarks === undefined || data.totalMarks === '' || data.totalMarks === null) {
            data.totalMarks = sumMarks(data.questions);
        }
        if (!data.batchId) delete data.batchId;
        data.teacherId = req.user.id;

        const newTest = new OnlineTest(data);
        await newTest.save();

        if (newTest.status === 'active') await notifyStudentsOfTest(req, newTest);

        res.json(newTest);
    } catch (err) {
        console.error('Test Creation Error:', err);
        if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update a test (owner teacher | admin)
router.put('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid test id' });
        const test = await OnlineTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Test not found' });
        if (!isOwnerOrAdmin(req.user, test)) return res.status(403).json({ message: 'Access denied' });

        const wasActive = test.status === 'active';
        const data = pick(req.body, EDITABLE_FIELDS);
        if (data.questions !== undefined) data.questions = normalizeQuestions(data.questions, data.pattern || test.pattern);
        const mockErr = applyMockFields(data, data.questions !== undefined ? data.questions : test.questions);
        if (mockErr) return res.status(400).json({ message: mockErr });
        if (data.negativeMarks !== undefined) data.negativeMarks = Math.abs(Number(data.negativeMarks)) || 0;
        if (data.status !== undefined && !['draft', 'active', 'completed'].includes(data.status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        if (data.batchId === '' || data.batchId === null) { test.batchId = undefined; delete data.batchId; }

        test.set(data);
        if (data.questions !== undefined && (req.body.totalMarks === undefined || req.body.totalMarks === '')) {
            test.totalMarks = sumMarks(test.questions);
        }
        await test.save();

        if (!wasActive && test.status === 'active') await notifyStudentsOfTest(req, test);

        res.json(test);
    } catch (err) {
        console.error('Test Update Error:', err);
        if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server error' });
    }
});

// Change test status (owner teacher | admin)
router.patch('/:id/status', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['draft', 'active', 'completed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid test id' });

        const test = await OnlineTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Test not found' });
        if (!isOwnerOrAdmin(req.user, test)) return res.status(403).json({ message: 'Access denied' });

        const wasActive = test.status === 'active';
        test.status = status;
        await test.save();
        if (!wasActive && status === 'active') await notifyStudentsOfTest(req, test);

        res.json(test);
    } catch (err) {
        console.error('Test Status Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a test and its results (owner teacher | admin)
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid test id' });
        const test = await OnlineTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Test not found' });
        if (!isOwnerOrAdmin(req.user, test)) return res.status(403).json({ message: 'Access denied' });

        const { deletedCount } = await TestResult.deleteMany({ testId: test._id });
        await OnlineTest.deleteOne({ _id: test._id });
        res.json({ message: 'Test deleted', resultsDeleted: deletedCount });
    } catch (err) {
        console.error('Test Delete Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all tests for a specific teacher (self or admin)
router.get('/teacher/:userId', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (req.user.role === 'teacher' && String(req.user.id) !== String(req.params.userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const tests = await OnlineTest.find({ teacherId: req.params.userId })
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all tests (Admin view)
router.get('/all', auth, roleAuth('admin'), async (req, res) => {
    try {
        const tests = await OnlineTest.find()
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get results for a specific test (Teacher/Admin)
router.get('/:testId/results', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.testId)) return res.status(400).json({ message: 'Invalid test id' });
        const results = await TestResult.find({ testId: req.params.testId })
            .populate('studentId', 'name')
            .sort({ score: -1, submittedAt: 1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Leaderboard for a test (students/parents of that class, teachers, admins)
router.get('/:id/leaderboard', auth, async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid test id' });
        const test = await OnlineTest.findById(req.params.id).select('classId totalMarks title');
        if (!test) return res.status(404).json({ message: 'Test not found' });

        let me = null;
        if (req.user.role === 'student' || req.user.role === 'parent') {
            me = await getOwnStudent(req.user);
            if (!me || (test.classId && !sameId(me.classId, test.classId))) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else if (!['teacher', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const results = await TestResult.find({ testId: test._id })
            .populate('studentId', 'name')
            .sort({ score: -1, submittedAt: 1 });

        const allScores = results.map(r => r.score);
        // Standard competition ranking (ties share a rank)
        let prevScore = null;
        let prevRank = 0;
        const rows = results.map((r, i) => {
            const rank = r.score === prevScore ? prevRank : i + 1;
            prevScore = r.score;
            prevRank = rank;
            const row = {
                rank,
                studentName: r.studentId ? r.studentId.name : 'Student',
                score: r.score,
                totalMarks: r.totalMarks,
                percentage: percentage(r.score, r.totalMarks),
                percentile: percentileOf(r.score, allScores),
                isMe: !!(me && r.studentId && sameId(r.studentId._id, me._id))
            };
            if (r.timeTaken != null) row.timeTaken = r.timeTaken;
            return row;
        });

        const top = rows.slice(0, 20);
        const mine = rows.findIndex(r => r.isMe);
        if (mine >= 20) top.push(rows[mine]);

        res.json(top);
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Upload Question Paper (Teacher/Admin)
router.post('/upload', auth, roleAuth('teacher', 'admin'), uploadSingle('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.json({ url: fileUrl(req.file) });
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
