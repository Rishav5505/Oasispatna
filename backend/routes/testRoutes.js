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
    'duration', 'totalMarks', 'passingMarks', 'negativeMarks', 'startTime', 'endTime', 'status'];

const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc; }, {});

// Normalise incoming question payloads
const normalizeQuestions = (questions) => (Array.isArray(questions) ? questions : []).map(q => {
    const type = q.type === 'numerical' ? 'numerical' : 'mcq';
    const out = {
        questionText: q.questionText,
        type,
        options: type === 'mcq' ? (Array.isArray(q.options) ? q.options.map(String) : []) : [],
        marks: q.marks !== undefined && q.marks !== '' ? Number(q.marks) : 1,
    };
    if (q._id && isObjectId(String(q._id))) out._id = q._id;
    if (type === 'mcq') out.correctOption = Number(q.correctOption);
    else out.correctAnswer = Number(q.correctAnswer);
    return out;
});

const sumMarks = (questions) => questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

// Strip answers from a test for student-facing payloads
const sanitizeTest = (t) => {
    const obj = t.toObject ? t.toObject() : { ...t };
    obj.questions = (obj.questions || []).map(q => ({
        _id: q._id,
        questionText: q.questionText,
        type: q.type || 'mcq',
        options: q.options,
        marks: q.marks,
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

        const negative = Number(test.negativeMarks) || 0;
        let score = 0, correct = 0, wrong = 0, unattempted = 0;

        const processedAnswers = test.questions.map(q => {
            const a = answers.find(x => x && x.questionId != null && String(x.questionId) === String(q._id)) || {};
            const marks = Number(q.marks) || 1;

            if ((q.type || 'mcq') === 'numerical') {
                const raw = a.numericAnswer !== undefined ? a.numericAnswer : (a.answer !== undefined ? a.answer : a.selectedOption);
                if (isBlank(raw) || Number.isNaN(Number(raw))) {
                    unattempted++;
                    return { questionId: q._id, isCorrect: false };
                }
                const val = Number(raw);
                const isCorrect = q.correctAnswer != null && Math.abs(val - Number(q.correctAnswer)) <= NUMERIC_TOLERANCE;
                if (isCorrect) { score += marks; correct++; } else { score -= negative; wrong++; }
                return { questionId: q._id, numericAnswer: val, isCorrect };
            }

            const raw = a.selectedOption;
            if (isBlank(raw) || Number.isNaN(Number(raw))) {
                unattempted++;
                return { questionId: q._id, isCorrect: false };
            }
            const sel = Number(raw);
            const isCorrect = sel === Number(q.correctOption);
            if (isCorrect) { score += marks; correct++; } else { score -= negative; wrong++; }
            return { questionId: q._id, selectedOption: sel, isCorrect };
        });

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
            timeTaken: Number.isFinite(timeTaken) && timeTaken >= 0 ? Math.round(timeTaken) : undefined
        });

        await result.save();
        res.json({ ...result.toObject(), correct, wrong, unattempted });
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

        res.json({
            ...studentResult.toObject(),
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
        data.questions = normalizeQuestions(data.questions);
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
        if (data.questions !== undefined) data.questions = normalizeQuestions(data.questions);
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
