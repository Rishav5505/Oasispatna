const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const QuestionBankItem = require('../models/QuestionBankItem');
const DailyPractice = require('../models/DailyPractice');
const PracticeAttempt = require('../models/PracticeAttempt');
const StudentStats = require('../models/StudentStats');
const Mistake = require('../models/Mistake');
const Bookmark = require('../models/Bookmark');
const Chapter = require('../models/Chapter');
const ChapterCoverage = require('../models/ChapterCoverage');
const ChapterProgress = require('../models/ChapterProgress');
const StudySession = require('../models/StudySession');
const { getAccessibleStudent, getOwnStudent, isObjectId, isOwnerOrAdmin, sameId } = require('../utils/access');
const { istDateString, addDays } = require('../utils/time');
const { XP, levelFor, nextLevelXpFor, weekKey, currentWeeklyXp, awardXp } = require('../utils/xp');
const { recordMistakes, gradeAnswer } = require('../utils/mistakes');

// Implemented per FEATURES_CONTRACT.md (A2-A6)

const DPP_SIZE = 10;
const oid = (id) => new mongoose.Types.ObjectId(String(id));
const round2 = (n) => Math.round(n * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ---------- student resolution helpers ----------

// The caller must be a student; returns their Student doc (sends 403/404 otherwise)
async function requireStudent(req, res) {
  if (req.user.role !== 'student') {
    res.status(403).json({ message: 'Only students can do this' });
    return null;
  }
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) {
    res.status(404).json({ message: 'Student profile not found' });
    return null;
  }
  return student;
}

// Read access: student -> self; parent -> ?studentId (linked) or own child; teacher/admin -> ?studentId
async function studentForRead(req, res) {
  const qid = req.query.studentId;
  if (req.user.role === 'student') return requireStudent(req, res);
  if (qid) return getAccessibleStudent(req, res, qid);
  if (req.user.role === 'parent') {
    const s = await getOwnStudent(req.user);
    if (!s) res.status(404).json({ message: 'No linked student found' });
    return s;
  }
  res.status(400).json({ message: 'studentId is required' });
  return null;
}

// =====================================================================
// A2 Daily practice (DPP) + XP
// =====================================================================

async function getOrCreateDpp(classId, date) {
  const existing = await DailyPractice.findOne({ classId, date });
  if (existing) return existing;

  const pool = await QuestionBankItem.aggregate([
    { $match: { $or: [{ classId: oid(classId) }, { classId: null }, { classId: { $exists: false } }] } },
    { $sample: { size: DPP_SIZE * 6 } },
  ]);
  if (!pool.length) return null;

  // Round-robin across subjects so the set is mixed
  const bySubject = new Map();
  pool.forEach(q => {
    const k = String(q.subjectId);
    if (!bySubject.has(k)) bySubject.set(k, []);
    bySubject.get(k).push(q);
  });
  const lists = [...bySubject.values()];
  const picked = [];
  const target = Math.min(DPP_SIZE, pool.length);
  while (picked.length < target) {
    for (const list of lists) {
      if (picked.length >= target) break;
      if (list.length) picked.push(list.shift());
    }
  }

  const questions = picked.map(b => ({
    bankItemId: b._id,
    type: b.type || 'mcq',
    questionText: b.questionText,
    options: b.type === 'numerical' ? [] : (b.options || []),
    correctOption: b.type === 'numerical' ? undefined : b.correctOption,
    correctAnswer: b.type === 'numerical' ? b.correctAnswer : undefined,
    solution: b.solution || '',
    marks: b.marks != null ? b.marks : 4,
    negativeMarks: b.negativeMarks != null ? b.negativeMarks : 1,
    subjectId: b.subjectId,
    chapter: b.chapter || '',
  }));

  try {
    return await DailyPractice.create({ classId, date, questions });
  } catch (err) {
    if (err && err.code === 11000) return DailyPractice.findOne({ classId, date }); // created concurrently
    throw err;
  }
}

const publicDpp = (dpp) => ({
  _id: dpp._id,
  date: dpp.date,
  questions: dpp.questions.map(q => ({ _id: q._id, type: q.type || 'mcq', questionText: q.questionText, options: q.options, marks: q.marks })),
});

const solutionsFor = (dpp, attempt) => dpp.questions.map(q => {
  const a = (attempt.answers || []).find(x => sameId(x.questionId, q._id));
  return {
    questionId: q._id,
    correctOption: q.correctOption,
    correctAnswer: q.correctAnswer,
    solution: q.solution || '',
    isCorrect: !!(a && a.isCorrect),
  };
});

const attemptResult = (dpp, attempt) => ({
  score: attempt.score,
  total: attempt.total,
  correct: attempt.correct,
  wrong: attempt.wrong,
  xpEarned: attempt.xpEarned,
  streak: attempt.streak,
  solutions: solutionsFor(dpp, attempt),
});

// GET /practice/dpp/today
router.get('/dpp/today', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    if (!student.classId) return res.status(404).json({ message: 'No practice set yet' });

    const dpp = await getOrCreateDpp(student.classId, istDateString());
    if (!dpp || !dpp.questions.length) return res.status(404).json({ message: 'No practice set yet' });

    const attempt = await PracticeAttempt.findOne({ studentId: student._id, dppId: dpp._id });
    const out = { dpp: publicDpp(dpp), attempted: !!attempt };
    if (attempt) out.result = attemptResult(dpp, attempt);
    res.json(out);
  } catch (err) {
    console.error('DPP today error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /practice/dpp/:id/submit
router.post('/dpp/:id/submit', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid practice id' });

    const dpp = await DailyPractice.findById(req.params.id);
    if (!dpp) return res.status(404).json({ message: 'Practice set not found' });
    if (!sameId(dpp.classId, student.classId)) return res.status(403).json({ message: 'This practice set is not for your class' });
    const today = istDateString();
    if (dpp.date !== today) return res.status(400).json({ message: "This practice set has expired. Try today's set." });

    if (await PracticeAttempt.exists({ studentId: student._id, dppId: dpp._id })) {
      return res.status(409).json({ message: "You have already attempted today's practice" });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    let score = 0, total = 0, correct = 0, wrong = 0;
    const wrongItems = [];
    const processed = dpp.questions.map(q => {
      const a = answers.find(x => x && x.questionId != null && String(x.questionId) === String(q._id)) || {};
      const marks = Number(q.marks) || 0;
      total += marks;
      const g = gradeAnswer(q, a);
      const row = { questionId: q._id, isCorrect: g.isCorrect };
      if (!g.attempted) return row;
      if ((q.type || 'mcq') === 'numerical') row.numericAnswer = g.value; else row.selectedOption = g.value;
      if (g.isCorrect) { correct++; score += marks; } else {
        wrong++;
        score -= Math.abs(Number(q.negativeMarks) || 0);
        wrongItems.push({ q, yourAnswer: g.value });
      }
      return row;
    });

    const xpEarned = correct * XP.DPP_CORRECT + XP.DPP_COMPLETION;

    // DPP streak (IST days)
    const prev = await StudentStats.findOne({ studentId: student._id }).select('streak lastDppDate');
    let streak = 1;
    if (prev && prev.lastDppDate === today) streak = prev.streak || 1;
    else if (prev && prev.lastDppDate === addDays(today, -1)) streak = (prev.streak || 0) + 1;

    const timeTaken = Number(req.body.timeTaken);
    let attempt;
    try {
      attempt = await PracticeAttempt.create({
        studentId: student._id,
        dppId: dpp._id,
        date: dpp.date,
        answers: processed,
        score: round2(score),
        total,
        correct,
        wrong,
        xpEarned,
        streak,
        timeTaken: Number.isFinite(timeTaken) && timeTaken >= 0 ? Math.round(timeTaken) : undefined,
      });
    } catch (err) {
      if (err && err.code === 11000) return res.status(409).json({ message: "You have already attempted today's practice" });
      throw err;
    }

    await StudentStats.updateOne(
      { studentId: student._id },
      { $set: { streak, lastDppDate: today }, $max: { bestStreak: streak } },
      { upsert: true }
    );
    await awardXp(student._id, xpEarned);
    await recordMistakes(student._id, wrongItems.map(({ q, yourAnswer }) => ({
      question: q.toObject ? q.toObject() : q,
      yourAnswer,
      subjectId: q.subjectId,
      chapter: q.chapter,
    })), { source: 'dpp', dppId: dpp._id });

    res.json(attemptResult(dpp, attempt));
  } catch (err) {
    console.error('DPP submit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /practice/stats/me -> {xp, weeklyXp, level, nextLevelXp, rank}
router.get('/stats/me', auth, async (req, res) => {
  try {
    const student = await studentForRead(req, res);
    if (!student) return;
    const stats = await StudentStats.findOne({ studentId: student._id });
    const xp = stats ? stats.xp || 0 : 0;

    let rank = null;
    if (student.classId) {
      const classmates = await Student.find({ classId: student.classId }).select('_id');
      const above = await StudentStats.countDocuments({ studentId: { $in: classmates.map(s => s._id) }, xp: { $gt: xp } });
      rank = above + 1;
    }
    res.json({
      xp,
      weeklyXp: currentWeeklyXp(stats),
      level: levelFor(xp),
      nextLevelXp: nextLevelXpFor(xp),
      rank,
      streak: stats ? stats.streak || 0 : 0,
      bestStreak: stats ? stats.bestStreak || 0 : 0,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /practice/leaderboard?scope=week|all (class of the caller; teacher/admin pass ?classId=)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const scope = req.query.scope === 'all' ? 'all' : 'week';
    let me = null;
    let classId;
    if (req.user.role === 'student' || req.user.role === 'parent') {
      me = await getOwnStudent(req.user);
      if (!me || !me.classId) return res.json([]);
      classId = me.classId;
    } else if (['teacher', 'admin'].includes(req.user.role)) {
      if (!isObjectId(String(req.query.classId || ''))) return res.status(400).json({ message: 'classId is required' });
      classId = req.query.classId;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const students = await Student.find({ classId }).select('name');
    const stats = await StudentStats.find({ studentId: { $in: students.map(s => s._id) } });
    const statMap = new Map(stats.map(s => [String(s.studentId), s]));
    const wk = weekKey();

    const rows = students.map(s => {
      const st = statMap.get(String(s._id));
      const totalXp = st ? st.xp || 0 : 0;
      return {
        studentId: s._id,
        name: s.name,
        xp: scope === 'all' ? totalXp : currentWeeklyXp(st, wk),
        level: levelFor(totalXp),
        isMe: !!(me && sameId(me._id, s._id)),
      };
    }).sort((a, b) => b.xp - a.xp || String(a.name).localeCompare(String(b.name)));

    let prevXp = null, prevRank = 0;
    rows.forEach((r, i) => {
      r.rank = r.xp === prevXp ? prevRank : i + 1;
      prevXp = r.xp;
      prevRank = r.rank;
    });

    const top = rows.slice(0, 20);
    const mine = rows.findIndex(r => r.isMe);
    if (mine >= 20) top.push(rows[mine]);
    res.json(top.map(r => ({ rank: r.rank, name: r.name, xp: r.xp, level: r.level, isMe: r.isMe, studentId: r.studentId })));
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================================================================
// A3 Mistake notebook
// =====================================================================

const hideAnswer = (m) => {
  const obj = m.toObject ? m.toObject() : { ...m };
  if (obj.questionRef) {
    obj.questionRef = { ...obj.questionRef };
    delete obj.questionRef.correctOption;
    delete obj.questionRef.correctAnswer;
    delete obj.questionRef.solution;
  }
  return obj;
};

// GET /practice/mistakes?status=&subjectId=&reveal=1 (parent: ?studentId=)
router.get('/mistakes', auth, async (req, res) => {
  try {
    const student = await studentForRead(req, res);
    if (!student) return;
    const filter = { studentId: student._id };
    if (['open', 'mastered'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.subjectId) {
      if (!isObjectId(req.query.subjectId)) return res.status(400).json({ message: 'Invalid subjectId' });
      filter.subjectId = req.query.subjectId;
    }
    const reveal = req.query.reveal === '1' || req.query.reveal === 'true';
    const list = await Mistake.find(filter).populate('subjectId', 'name').populate('testId', 'title').sort({ updatedAt: -1 }).limit(500);
    res.json(list.map(m => (m.status === 'open' && !reveal ? hideAnswer(m) : m.toObject())));
  } catch (err) {
    console.error('Mistakes list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /practice/mistakes/:id/retry {selectedOption|numericAnswer}
router.post('/mistakes/:id/retry', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const m = await Mistake.findById(req.params.id);
    if (!m || !sameId(m.studentId, student._id)) return res.status(404).json({ message: 'Mistake not found' });

    const g = gradeAnswer(m.questionRef || {}, req.body || {});
    if (!g.attempted) return res.status(400).json({ message: 'selectedOption or numericAnswer is required' });

    m.attempts = (m.attempts || 0) + 1;
    m.lastAttemptAt = new Date();
    if (g.isCorrect) {
      m.correctCount = (m.correctCount || 0) + 1;
      if (m.correctCount >= 2) m.status = 'mastered';
    }
    await m.save();
    const q = m.questionRef || {};
    res.json({ isCorrect: g.isCorrect, correctOption: q.correctOption, correctAnswer: q.correctAnswer, solution: q.solution || '', status: m.status });
  } catch (err) {
    console.error('Mistake retry error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /practice/mistakes/:id
router.delete('/mistakes/:id', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const r = await Mistake.deleteOne({ _id: req.params.id, studentId: student._id });
    if (!r.deletedCount) return res.status(404).json({ message: 'Mistake not found' });
    res.json({ message: 'Removed from notebook' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================================================================
// A4 Bookmarks
// =====================================================================

router.get('/bookmarks', auth, async (req, res) => {
  try {
    const student = await studentForRead(req, res);
    if (!student) return;
    const filter = { studentId: student._id };
    if (['question', 'material', 'note'].includes(req.query.kind)) filter.kind = req.query.kind;
    const list = await Bookmark.find(filter).populate('subjectId', 'name').sort({ createdAt: -1 }).limit(500);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/bookmarks', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    const { kind, refId, title, content, subjectId } = req.body || {};
    if (!['question', 'material', 'note'].includes(kind)) return res.status(400).json({ message: "kind must be 'question', 'material' or 'note'" });
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'title is required' });
    if (refId && !isObjectId(String(refId))) return res.status(400).json({ message: 'Invalid refId' });
    if (subjectId && !isObjectId(String(subjectId))) return res.status(400).json({ message: 'Invalid subjectId' });

    if (refId) {
      const dup = await Bookmark.findOne({ studentId: student._id, kind, refId });
      if (dup) return res.json(dup);
    }
    const bm = await Bookmark.create({
      studentId: student._id,
      kind,
      refId: refId || undefined,
      title: String(title).trim().slice(0, 300),
      content: content ? String(content).slice(0, 20000) : '',
      subjectId: subjectId || undefined,
    });
    res.status(201).json(bm);
  } catch (err) {
    console.error('Bookmark create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/bookmarks/:id', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const r = await Bookmark.deleteOne({ _id: req.params.id, studentId: student._id });
    if (!r.deletedCount) return res.status(404).json({ message: 'Bookmark not found' });
    res.json({ message: 'Bookmark removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================================================================
// A5 Syllabus tracker + lesson plan
// =====================================================================

// GET /practice/syllabus/chapters?classId=&subjectId=
router.get('/syllabus/chapters', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.classId) { if (!isObjectId(req.query.classId)) return res.status(400).json({ message: 'Invalid classId' }); filter.classId = req.query.classId; }
    if (req.query.subjectId) { if (!isObjectId(req.query.subjectId)) return res.status(400).json({ message: 'Invalid subjectId' }); filter.subjectId = req.query.subjectId; }
    const chapters = await Chapter.find(filter).populate('subjectId', 'name').populate('classId', 'name').sort({ subjectId: 1, order: 1, name: 1 });
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /practice/syllabus/chapters {subjectId, classId?, name, order?} or {subjectId, classId?, names:[...]}
router.post('/syllabus/chapters', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const { subjectId, name, names } = req.body || {};
    let { classId } = req.body || {};
    if (!isObjectId(String(subjectId || ''))) return res.status(400).json({ message: 'Valid subjectId is required' });
    const subject = await Subject.findById(subjectId).select('classId');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (classId && !isObjectId(String(classId))) return res.status(400).json({ message: 'Invalid classId' });
    if (!classId) classId = subject.classId || undefined;

    if (Array.isArray(names)) {
      const clean = names.map(n => String(n || '').trim()).filter(Boolean).slice(0, 200);
      if (!clean.length) return res.status(400).json({ message: 'names must contain at least one chapter name' });
      const last = await Chapter.findOne({ subjectId, classId }).sort({ order: -1 }).select('order');
      const base = last ? (last.order || 0) + 1 : 1;
      const docs = await Chapter.insertMany(clean.map((n, i) => ({ subjectId, classId, name: n.slice(0, 200), order: base + i })));
      return res.status(201).json(docs);
    }

    if (!name || !String(name).trim()) return res.status(400).json({ message: 'name is required' });
    let order = Number(req.body.order);
    if (!Number.isFinite(order)) {
      const last = await Chapter.findOne({ subjectId, classId }).sort({ order: -1 }).select('order');
      order = last ? (last.order || 0) + 1 : 1;
    }
    const ch = await Chapter.create({ subjectId, classId, name: String(name).trim().slice(0, 200), order });
    res.status(201).json(ch);
  } catch (err) {
    console.error('Chapter create error:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/syllabus/chapters/:id', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const ch = await Chapter.findById(req.params.id);
    if (!ch) return res.status(404).json({ message: 'Chapter not found' });
    const { name, order, subjectId, classId } = req.body || {};
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: 'name cannot be empty' });
      ch.name = String(name).trim().slice(0, 200);
    }
    if (order !== undefined && Number.isFinite(Number(order))) ch.order = Number(order);
    if (subjectId !== undefined) {
      if (!isObjectId(String(subjectId))) return res.status(400).json({ message: 'Invalid subjectId' });
      ch.subjectId = subjectId;
    }
    if (classId !== undefined) {
      if (classId && !isObjectId(String(classId))) return res.status(400).json({ message: 'Invalid classId' });
      ch.classId = classId || undefined;
    }
    await ch.save();
    res.json(ch);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/syllabus/chapters/:id', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const ch = await Chapter.findById(req.params.id);
    if (!ch) return res.status(404).json({ message: 'Chapter not found' });
    await Promise.all([
      ChapterCoverage.deleteMany({ chapterId: ch._id }),
      ChapterProgress.deleteMany({ chapterId: ch._id }),
      Chapter.deleteOne({ _id: ch._id }),
    ]);
    res.json({ message: 'Chapter deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Chapters for a class: chapters with that classId, plus unscoped chapters of the class's subjects
async function chaptersForClass(classId, extraSubjectIds = []) {
  const subjects = await Subject.find({ $or: [{ classId }, { _id: { $in: extraSubjectIds } }] }).select('name');
  const subjectIds = subjects.map(s => s._id);
  const chapters = await Chapter.find({
    $or: [{ classId }, { classId: null, subjectId: { $in: subjectIds } }, { classId: { $exists: false }, subjectId: { $in: subjectIds } }],
  }).populate('subjectId', 'name').sort({ order: 1, name: 1 });
  return chapters;
}

const groupBySubject = (chapters) => {
  const map = new Map();
  chapters.forEach(ch => {
    const subj = ch.subjectId;
    const key = String(subj && subj._id ? subj._id : subj);
    if (!map.has(key)) map.set(key, { subjectId: subj && subj._id ? subj._id : subj, subjectName: (subj && subj.name) || 'Subject', chapters: [] });
    map.get(key).chapters.push(ch);
  });
  return [...map.values()];
};

// GET /practice/syllabus/me (student; parent ?studentId=)
router.get('/syllabus/me', auth, async (req, res) => {
  try {
    const student = await studentForRead(req, res);
    if (!student) return;
    if (!student.classId) return res.json([]);

    const chapters = await chaptersForClass(student.classId, student.subjects || []);
    const chapterIds = chapters.map(c => c._id);

    const coverageFilter = { chapterId: { $in: chapterIds } };
    if (student.batchId) coverageFilter.batchId = student.batchId;
    else coverageFilter.batchId = { $in: (await Batch.find({ classId: student.classId }).select('_id')).map(b => b._id) };
    const [coverage, progress] = await Promise.all([
      ChapterCoverage.find(coverageFilter).select('chapterId'),
      ChapterProgress.find({ studentId: student._id, chapterId: { $in: chapterIds } }).select('chapterId status'),
    ]);
    const taught = new Set(coverage.map(c => String(c.chapterId)));
    const statusMap = new Map(progress.map(p => [String(p.chapterId), p.status]));

    const out = groupBySubject(chapters).map(g => {
      const rows = g.chapters.map(ch => ({
        _id: ch._id,
        name: ch.name,
        order: ch.order,
        taughtInClass: taught.has(String(ch._id)),
        myStatus: statusMap.get(String(ch._id)) || 'not_started',
      }));
      return {
        subjectId: g.subjectId,
        subjectName: g.subjectName,
        chapters: rows,
        percentDone: pct(rows.filter(r => r.myStatus === 'done').length, rows.length),
        percentTaught: pct(rows.filter(r => r.taughtInClass).length, rows.length),
      };
    });
    res.json(out);
  } catch (err) {
    console.error('Syllabus me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /practice/syllabus/progress/:chapterId {status} (student)
router.put('/syllabus/progress/:chapterId', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    const { status } = req.body || {};
    if (!['not_started', 'in_progress', 'done'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    if (!isObjectId(req.params.chapterId)) return res.status(400).json({ message: 'Invalid chapter id' });
    if (!(await Chapter.exists({ _id: req.params.chapterId }))) return res.status(404).json({ message: 'Chapter not found' });

    const doc = await ChapterProgress.findOneAndUpdate(
      { studentId: student._id, chapterId: req.params.chapterId },
      { $set: { status } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    console.error('Syllabus progress error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /practice/syllabus/coverage {batchId, chapterId, coveredOn?} (teacher | admin)
router.post('/syllabus/coverage', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { batchId, chapterId, coveredOn } = req.body || {};
    if (!isObjectId(String(batchId || '')) || !isObjectId(String(chapterId || ''))) return res.status(400).json({ message: 'Valid batchId and chapterId are required' });
    const [batch, chapter] = await Promise.all([Batch.findById(batchId).select('classId'), Chapter.findById(chapterId).select('classId')]);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
    if (batch.classId && chapter.classId && !sameId(batch.classId, chapter.classId)) {
      return res.status(400).json({ message: 'Chapter does not belong to this batch\'s class' });
    }
    let when = coveredOn ? new Date(coveredOn) : new Date();
    if (Number.isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid coveredOn date' });

    const doc = await ChapterCoverage.findOneAndUpdate(
      { batchId, chapterId },
      { $set: { coveredOn: when, teacherId: req.user.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(doc);
  } catch (err) {
    console.error('Coverage create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /practice/syllabus/coverage/:id (marking teacher | admin)
router.delete('/syllabus/coverage/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const doc = await ChapterCoverage.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Coverage not found' });
    if (doc.teacherId && !isOwnerOrAdmin(req.user, doc, 'teacherId')) return res.status(403).json({ message: 'Access denied' });
    await ChapterCoverage.deleteOne({ _id: doc._id });
    res.json({ message: 'Coverage removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /practice/syllabus/coverage?batchId= -> per subject chapters with covered flag & %
router.get('/syllabus/coverage', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { batchId } = req.query;
    if (!isObjectId(String(batchId || ''))) return res.status(400).json({ message: 'batchId is required' });
    const batch = await Batch.findById(batchId).select('classId name');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    if (!batch.classId) return res.json([]);

    const chapters = await chaptersForClass(batch.classId);
    const coverage = await ChapterCoverage.find({ batchId, chapterId: { $in: chapters.map(c => c._id) } });
    const covMap = new Map(coverage.map(c => [String(c.chapterId), c]));

    res.json(groupBySubject(chapters).map(g => {
      const rows = g.chapters.map(ch => {
        const cov = covMap.get(String(ch._id));
        return { _id: ch._id, name: ch.name, order: ch.order, covered: !!cov, coverageId: cov ? cov._id : null, coveredOn: cov ? cov.coveredOn : null };
      });
      const coveredCount = rows.filter(r => r.covered).length;
      return { subjectId: g.subjectId, subjectName: g.subjectName, chapters: rows, coveredCount, total: rows.length, percentCovered: pct(coveredCount, rows.length) };
    }));
  } catch (err) {
    console.error('Coverage list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================================================================
// A6 Study timer
// =====================================================================

// POST /practice/study/sessions {subjectId?, minutes (1-180), mode}
router.post('/study/sessions', auth, async (req, res) => {
  try {
    const student = await requireStudent(req, res);
    if (!student) return;
    const minutes = Math.round(Number(req.body.minutes));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return res.status(400).json({ message: 'minutes must be between 1 and 180' });
    const { subjectId } = req.body;
    if (subjectId && !isObjectId(String(subjectId))) return res.status(400).json({ message: 'Invalid subjectId' });
    const mode = req.body.mode === 'pomodoro' ? 'pomodoro' : 'free';

    const now = new Date();
    const date = istDateString(now);
    const agg = await StudySession.aggregate([
      { $match: { studentId: student._id, date } },
      { $group: { _id: null, xp: { $sum: '$xpEarned' } } },
    ]);
    const usedToday = agg.length ? agg[0].xp : 0;
    const xpEarned = Math.max(0, Math.min(minutes * XP.STUDY_PER_MINUTE, XP.STUDY_DAILY_CAP - usedToday));

    const session = await StudySession.create({
      studentId: student._id,
      subjectId: subjectId || undefined,
      minutes,
      startedAt: new Date(now.getTime() - minutes * 60 * 1000),
      endedAt: now,
      date,
      mode,
      xpEarned,
    });
    if (xpEarned > 0) await awardXp(student._id, xpEarned);
    res.status(201).json({ session, xpEarned });
  } catch (err) {
    console.error('Study session error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /practice/study/summary?days=7 -> {todayMinutes, weekMinutes, daily:[{date, minutes}], bySubject:[{subjectName, minutes}]}
router.get('/study/summary', auth, async (req, res) => {
  try {
    const student = await studentForRead(req, res);
    if (!student) return;
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const today = istDateString();
    const from = addDays(today, -(days - 1));
    const weekFrom = addDays(today, -6);
    const queryFrom = from < weekFrom ? from : weekFrom;

    const sessions = await StudySession.find({ studentId: student._id, date: { $gte: queryFrom } }).populate('subjectId', 'name');

    const daily = [];
    for (let i = days - 1; i >= 0; i--) daily.push({ date: addDays(today, -i), minutes: 0 });
    const dayMap = new Map(daily.map(d => [d.date, d]));
    const subjMap = new Map();
    let todayMinutes = 0, weekMinutes = 0;

    sessions.forEach(s => {
      if (s.date === today) todayMinutes += s.minutes;
      if (s.date >= weekFrom) weekMinutes += s.minutes;
      if (s.date >= from) {
        const d = dayMap.get(s.date);
        if (d) d.minutes += s.minutes;
        const key = s.subjectId ? String(s.subjectId._id) : 'general';
        if (!subjMap.has(key)) subjMap.set(key, { subjectId: s.subjectId ? s.subjectId._id : null, subjectName: s.subjectId ? s.subjectId.name : 'General', minutes: 0 });
        subjMap.get(key).minutes += s.minutes;
      }
    });

    res.json({
      todayMinutes,
      weekMinutes,
      daily,
      bySubject: [...subjMap.values()].sort((a, b) => b.minutes - a.minutes),
    });
  } catch (err) {
    console.error('Study summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
