const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const QuestionBankItem = require('../models/QuestionBankItem');
const OnlineTest = require('../models/OnlineTest');
const { isObjectId, isOwnerOrAdmin } = require('../utils/access');

// Implemented per FEATURES_CONTRACT.md (A1)

const MAX_BULK = 200;
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toObjId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Validate + normalise a question payload. `defaults` supplies shared fields (bulk).
 * Returns { item } or { error }.
 */
function normalizeItem(raw, defaults = {}, { partial = false } = {}) {
  const src = { ...defaults, ...(raw || {}) };
  const out = {};
  const has = (k) => src[k] !== undefined;

  if (!partial || has('type')) out.type = src.type === 'numerical' ? 'numerical' : 'mcq';
  const type = out.type || src.type || 'mcq';

  if (!partial || has('questionText') || has('question')) {
    const text = typeof src.questionText === 'string' ? src.questionText : (typeof src.question === 'string' ? src.question : '');
    if (!text.trim()) return { error: 'questionText is required' };
    out.questionText = text.trim().slice(0, 10000);
  }

  if (type === 'mcq') {
    if (!partial || has('options')) {
      const options = Array.isArray(src.options) ? src.options.map(o => String(o ?? '').trim()) : [];
      if (options.length !== 4 || options.some(o => !o)) return { error: 'MCQ questions need exactly 4 non-empty options' };
      out.options = options;
    }
    if (!partial || has('correctOption')) {
      const c = Number(src.correctOption);
      if (!Number.isInteger(c) || c < 0 || c > 3) return { error: 'correctOption must be 0-3' };
      out.correctOption = c;
    }
    if (out.type === 'mcq') out.correctAnswer = undefined;
  } else {
    if (!partial || has('correctAnswer')) {
      const v = Number(src.correctAnswer);
      if (src.correctAnswer === '' || src.correctAnswer === null || !Number.isFinite(v)) return { error: 'correctAnswer (number) is required for numerical questions' };
      out.correctAnswer = v;
    }
    if (out.type === 'numerical') { out.options = []; out.correctOption = undefined; }
  }

  if (!partial || has('subjectId')) {
    if (!isObjectId(String(src.subjectId || ''))) return { error: 'Valid subjectId is required' };
    out.subjectId = src.subjectId;
  }
  if (has('classId')) {
    if (src.classId === '' || src.classId === null) out.classId = null;
    else if (!isObjectId(String(src.classId))) return { error: 'Invalid classId' };
    else out.classId = src.classId;
  }
  if (has('solution')) out.solution = String(src.solution ?? '').slice(0, 20000);
  if (has('chapter')) out.chapter = String(src.chapter ?? '').trim().slice(0, 200);
  if (has('difficulty')) {
    if (!['easy', 'medium', 'hard'].includes(src.difficulty)) return { error: "difficulty must be 'easy', 'medium' or 'hard'" };
    out.difficulty = src.difficulty;
  }
  if (has('tags')) out.tags = (Array.isArray(src.tags) ? src.tags : String(src.tags).split(',')).map(t => String(t).trim()).filter(Boolean).slice(0, 20);
  if (has('marks') && src.marks !== '') {
    const m = Number(src.marks);
    if (!Number.isFinite(m) || m < 0) return { error: 'marks must be a non-negative number' };
    out.marks = m;
  }
  if (has('negativeMarks') && src.negativeMarks !== '') {
    const n = Math.abs(Number(src.negativeMarks));
    if (!Number.isFinite(n)) return { error: 'negativeMarks must be a number' };
    out.negativeMarks = n;
  }
  if (has('source')) {
    if (!['manual', 'ai', 'pyq'].includes(src.source)) return { error: "source must be 'manual', 'ai' or 'pyq'" };
    out.source = src.source;
  }
  if (has('year')) {
    if (src.year === '' || src.year === null) out.year = undefined;
    else {
      const y = Number(src.year);
      if (!Number.isInteger(y) || y < 1950 || y > 2100) return { error: 'Invalid year' };
      out.year = y;
    }
  }
  return { item: out };
}

// GET /question-bank?subjectId=&classId=&chapter=&difficulty=&type=&q=&page=1&limit=20
router.get('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { subjectId, classId, chapter, difficulty, type, q, source } = req.query;
    const filter = {};
    if (subjectId) { if (!isObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subjectId' }); filter.subjectId = subjectId; }
    if (classId) { if (!isObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' }); filter.classId = classId; }
    if (chapter) filter.chapter = chapter;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (q && String(q).trim()) filter.questionText = { $regex: escapeRegex(String(q).trim().slice(0, 200)), $options: 'i' };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [items, total] = await Promise.all([
      QuestionBankItem.find(filter)
        .populate('subjectId', 'name')
        .populate('classId', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      QuestionBankItem.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('Question bank list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /question-bank/chapters?subjectId=&classId= -> [{chapter, count}]
router.get('/chapters', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { subjectId, classId } = req.query;
    const match = {};
    if (subjectId) { if (!isObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subjectId' }); match.subjectId = toObjId(subjectId); }
    if (classId) { if (!isObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' }); match.classId = toObjId(classId); }
    const rows = await QuestionBankItem.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$chapter', ''] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(rows.map(r => ({ chapter: r._id, count: r.count })));
  } catch (err) {
    console.error('Question bank chapters error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /question-bank (single)
router.post('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { item, error } = normalizeItem(req.body);
    if (error) return res.status(400).json({ message: error });
    const doc = await QuestionBankItem.create({ ...item, createdBy: req.user.id });
    res.status(201).json(doc);
  } catch (err) {
    console.error('Question bank create error:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /question-bank/bulk {items:[...]} (+ optional shared fields: subjectId, classId, chapter, difficulty, source, ...)
router.post('/bulk', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : null;
    if (!items || items.length === 0) return res.status(400).json({ message: 'items array is required' });
    if (items.length > MAX_BULK) return res.status(400).json({ message: `At most ${MAX_BULK} items per request` });

    const shared = {};
    ['subjectId', 'classId', 'chapter', 'difficulty', 'source', 'tags', 'marks', 'negativeMarks', 'year'].forEach(k => {
      if (req.body[k] !== undefined) shared[k] = req.body[k];
    });

    const docs = [];
    const errors = [];
    items.forEach((raw, i) => {
      const { item, error } = normalizeItem(raw, shared);
      if (error) errors.push({ index: i, message: error });
      else docs.push({ ...item, createdBy: req.user.id });
    });
    if (docs.length === 0) return res.status(400).json({ message: errors[0] ? `Item ${errors[0].index + 1}: ${errors[0].message}` : 'No valid items', errors });

    const saved = await QuestionBankItem.insertMany(docs, { ordered: false });
    res.status(201).json({ saved: saved.length, skipped: errors.length, errors });
  } catch (err) {
    console.error('Question bank bulk error:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /question-bank/build-test -> creates a draft OnlineTest from bank items
router.post('/build-test', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { title, classId, subjectId, batchId, description, random } = req.body;
    const duration = Number(req.body.duration);
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'title is required' });
    if (!isObjectId(String(classId || '')) || !isObjectId(String(subjectId || ''))) return res.status(400).json({ message: 'Valid classId and subjectId are required' });
    if (batchId && !isObjectId(String(batchId))) return res.status(400).json({ message: 'Invalid batchId' });
    if (!Number.isFinite(duration) || duration <= 0) return res.status(400).json({ message: 'duration (minutes) is required' });

    let bankItems = [];
    if (Array.isArray(req.body.questionIds) && req.body.questionIds.length) {
      const ids = req.body.questionIds.map(String);
      if (ids.some(id => !isObjectId(id))) return res.status(400).json({ message: 'Invalid question id in questionIds' });
      if (ids.length > 300) return res.status(400).json({ message: 'Too many questions (max 300)' });
      const found = await QuestionBankItem.find({ _id: { $in: ids } });
      const byId = new Map(found.map(d => [String(d._id), d]));
      bankItems = ids.map(id => byId.get(id)).filter(Boolean);
    } else if (random && typeof random === 'object') {
      const count = parseInt(random.count, 10);
      if (!Number.isInteger(count) || count < 1 || count > 300) return res.status(400).json({ message: 'random.count must be 1-300' });
      const match = {
        subjectId: toObjId(subjectId),
        $or: [{ classId: toObjId(classId) }, { classId: null }, { classId: { $exists: false } }],
      };
      if (random.chapter) match.chapter = String(random.chapter);
      if (random.difficulty) match.difficulty = String(random.difficulty);
      bankItems = await QuestionBankItem.aggregate([{ $match: match }, { $sample: { size: count } }]);
    } else {
      return res.status(400).json({ message: 'Provide questionIds or random:{count}' });
    }

    if (bankItems.length === 0) return res.status(400).json({ message: 'No matching questions found in the question bank' });

    const questions = bankItems.map(b => ({
      questionText: b.questionText,
      type: b.type || 'mcq',
      options: b.type === 'numerical' ? [] : (b.options || []),
      correctOption: b.type === 'numerical' ? undefined : b.correctOption,
      correctAnswer: b.type === 'numerical' ? b.correctAnswer : undefined,
      marks: b.marks != null ? b.marks : 4,
      negativeMarks: b.negativeMarks != null ? b.negativeMarks : 0,
      solution: b.solution || '',
      chapter: b.chapter || '',
      bankItemId: b._id,
    }));
    const totalMarks = questions.reduce((a, q) => a + (Number(q.marks) || 0), 0);

    const test = await OnlineTest.create({
      title: String(title).trim().slice(0, 300),
      description: description ? String(description).slice(0, 5000) : undefined,
      subjectId,
      classId,
      batchId: batchId || undefined,
      duration,
      questions,
      totalMarks,
      negativeMarks: 0, // per-question negativeMarks from the bank apply
      status: 'draft',
      teacherId: req.user.id,
    });
    res.status(201).json({ test });
  } catch (err) {
    console.error('Build test error:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /question-bank/:id (creator | admin)
router.put('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const doc = await QuestionBankItem.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Question not found' });
    if (!isOwnerOrAdmin(req.user, doc, 'createdBy')) return res.status(403).json({ message: 'Access denied' });

    const body = { ...req.body };
    // When changing type, require the matching answer fields
    if (body.type && body.type !== doc.type) {
      if (body.type === 'mcq' && body.options === undefined) body.options = doc.options;
      if (body.type === 'mcq' && body.correctOption === undefined) body.correctOption = doc.correctOption;
      if (body.type === 'numerical' && body.correctAnswer === undefined) {
        return res.status(400).json({ message: 'correctAnswer is required when changing to a numerical question' });
      }
    } else if (!body.type) {
      body.type = doc.type;
    }
    const { item, error } = normalizeItem(body, {}, { partial: true });
    if (error) return res.status(400).json({ message: error });
    delete item.createdBy;
    doc.set(item);
    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error('Question bank update error:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /question-bank/:id (creator | admin)
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const doc = await QuestionBankItem.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Question not found' });
    if (!isOwnerOrAdmin(req.user, doc, 'createdBy')) return res.status(403).json({ message: 'Access denied' });
    await QuestionBankItem.deleteOne({ _id: doc._id });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
