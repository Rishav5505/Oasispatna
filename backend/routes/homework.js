const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const Student = require('../models/Student');
const User = require('../models/User');
const Subject = require('../models/Subject');
const { uploadSingle, fileUrl, removeUpload } = require('../utils/upload');
const { notifyUser, notifyMany } = require('../utils/notify');
const { getAccessibleStudent, isObjectId, isOwnerOrAdmin, sameId } = require('../utils/access');

// Implemented per FEATURES_CONTRACT.md (A9)

// Students a homework is assigned to (class, and batch when set)
const studentQuery = (hw) => {
  const q = { classId: hw.classId };
  if (hw.batchId) q.batchId = hw.batchId;
  return q;
};

// A date-only 'YYYY-MM-DD' due date means end of that IST day
function parseDueDate(v) {
  if (!v) return null;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59+05:30`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function notifyNewHomework(req, hw) {
  try {
    const students = await Student.find(studentQuery(hw)).select('userId parentId');
    const subject = await Subject.findById(hw.subjectId).select('name');
    const due = new Date(hw.dueDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
    const message = `New ${subject ? subject.name + ' ' : ''}homework "${hw.title}" is due on ${due}.`;
    const recipients = new Set();
    students.forEach(s => { if (s.userId) recipients.add(String(s.userId)); if (s.parentId) recipients.add(String(s.parentId)); });
    const parents = await User.find({ role: 'parent', studentId: { $in: students.map(s => s._id) } }).select('_id');
    parents.forEach(p => recipients.add(String(p._id)));
    await notifyMany(req.io, [...recipients].map(r => ({ recipient: r, title: 'New Homework', message, type: 'academic' })));
  } catch (err) {
    console.error('Homework notify error:', err.message);
  }
}

// Validate create/update payload; returns { data } or { error }
function buildHomeworkData(body, { partial = false } = {}) {
  const data = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('title')) {
    if (!body.title || !String(body.title).trim()) return { error: 'title is required' };
    data.title = String(body.title).trim().slice(0, 300);
  }
  if (has('description')) data.description = String(body.description || '').slice(0, 10000);
  if (!partial || has('classId')) {
    if (!isObjectId(String(body.classId || ''))) return { error: 'Valid classId is required' };
    data.classId = body.classId;
  }
  if (!partial || has('subjectId')) {
    if (!isObjectId(String(body.subjectId || ''))) return { error: 'Valid subjectId is required' };
    data.subjectId = body.subjectId;
  }
  if (has('batchId')) {
    if (body.batchId === '' || body.batchId === null || body.batchId === 'null') data.batchId = null;
    else if (!isObjectId(String(body.batchId))) return { error: 'Invalid batchId' };
    else data.batchId = body.batchId;
  }
  if (!partial || has('dueDate')) {
    const d = parseDueDate(body.dueDate);
    if (!d) return { error: 'Valid dueDate is required' };
    data.dueDate = d;
  }
  if (has('maxMarks') && body.maxMarks !== '') {
    const m = Number(body.maxMarks);
    if (!Number.isFinite(m) || m < 0) return { error: 'maxMarks must be a non-negative number' };
    data.maxMarks = m;
  }
  return { data };
}

// ---------- teacher ----------

// POST /homework (multipart optional `attachment`)
router.post('/', auth, roleAuth('teacher', 'admin'), uploadSingle('attachment'), async (req, res) => {
  try {
    const { data, error } = buildHomeworkData(req.body || {});
    if (error) {
      if (req.file) removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: error });
    }
    if (data.batchId === null) delete data.batchId;
    const hw = await Homework.create({
      ...data,
      attachmentUrl: req.file ? fileUrl(req.file) : undefined,
      teacherId: req.user.id,
    });
    await notifyNewHomework(req, hw);
    res.status(201).json(hw);
  } catch (err) {
    console.error('Homework create error:', err);
    if (req.file) removeUpload(fileUrl(req.file));
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /homework/teacher/mine -> homework with {submittedCount, totalStudents}
router.get('/teacher/mine', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' && req.query.all !== '0' ? {} : { teacherId: req.user.id };
    if (req.query.classId && isObjectId(req.query.classId)) query.classId = req.query.classId;
    const list = await Homework.find(query)
      .populate('subjectId', 'name')
      .populate('classId', 'name')
      .populate('batchId', 'name')
      .populate('teacherId', 'name')
      .sort({ dueDate: -1 })
      .limit(500);

    const ids = list.map(h => h._id);
    const counts = await HomeworkSubmission.aggregate([
      { $match: { homeworkId: { $in: ids } } },
      { $group: { _id: '$homeworkId', count: { $sum: 1 }, graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } } } },
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c]));

    // Student totals per (class, batch) combo
    const totalCache = new Map();
    const totalFor = async (hw) => {
      const key = `${hw.classId && hw.classId._id ? hw.classId._id : hw.classId}|${hw.batchId ? (hw.batchId._id || hw.batchId) : ''}`;
      if (!totalCache.has(key)) {
        const q = { classId: hw.classId && hw.classId._id ? hw.classId._id : hw.classId };
        if (hw.batchId) q.batchId = hw.batchId._id || hw.batchId;
        totalCache.set(key, await Student.countDocuments(q));
      }
      return totalCache.get(key);
    };

    const out = [];
    for (const hw of list) {
      const c = countMap.get(String(hw._id));
      out.push({ ...hw.toObject(), submittedCount: c ? c.count : 0, gradedCount: c ? c.graded : 0, totalStudents: await totalFor(hw) });
    }
    res.json(out);
  } catch (err) {
    console.error('Homework mine error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /homework/student/:studentId -> [{...homework, mySubmission}] (student self, parent, teacher, admin)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const student = await getAccessibleStudent(req, res, req.params.studentId);
    if (!student) return;
    if (!student.classId) return res.json([]);

    const list = await Homework.find({
      classId: student.classId,
      $or: [{ batchId: { $exists: false } }, { batchId: null }, ...(student.batchId ? [{ batchId: student.batchId }] : [])],
    })
      .populate('subjectId', 'name')
      .populate('teacherId', 'name')
      .sort({ dueDate: -1 })
      .limit(300);
    const subs = await HomeworkSubmission.find({ studentId: student._id, homeworkId: { $in: list.map(h => h._id) } });
    const subMap = new Map(subs.map(s => [String(s.homeworkId), s]));
    res.json(list.map(h => ({ ...h.toObject(), mySubmission: subMap.get(String(h._id)) || null })));
  } catch (err) {
    console.error('Homework student list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /homework/submissions/:subId/grade {marks, remark, status:'graded'|'returned'}
router.put('/submissions/:subId/grade', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.subId)) return res.status(400).json({ message: 'Invalid submission id' });
    const sub = await HomeworkSubmission.findById(req.params.subId);
    if (!sub) return res.status(404).json({ message: 'Submission not found' });
    const hw = await Homework.findById(sub.homeworkId);
    if (!hw) return res.status(404).json({ message: 'Homework not found' });
    if (!isOwnerOrAdmin(req.user, hw)) return res.status(403).json({ message: 'Access denied' });

    const { remark } = req.body || {};
    const status = req.body.status === 'returned' ? 'returned' : 'graded';
    if (req.body.marks !== undefined && req.body.marks !== '' && req.body.marks !== null) {
      const m = Number(req.body.marks);
      if (!Number.isFinite(m) || m < 0) return res.status(400).json({ message: 'marks must be a non-negative number' });
      if (hw.maxMarks != null && m > hw.maxMarks) return res.status(400).json({ message: `marks cannot exceed ${hw.maxMarks}` });
      sub.marks = m;
    } else if (status === 'graded' && sub.marks == null) {
      return res.status(400).json({ message: 'marks are required to grade' });
    }
    if (remark !== undefined) sub.remark = String(remark || '').slice(0, 2000);
    sub.status = status;
    sub.gradedBy = req.user.id;
    sub.gradedAt = new Date();
    await sub.save();

    const student = await Student.findById(sub.studentId).select('userId');
    if (student && student.userId) {
      await notifyUser(req.io, student.userId, {
        title: status === 'graded' ? 'Homework Graded' : 'Homework Returned',
        message: status === 'graded'
          ? `Your homework "${hw.title}" was graded: ${sub.marks}/${hw.maxMarks}.`
          : `Your homework "${hw.title}" was returned for correction.${sub.remark ? ' Remark: ' + sub.remark : ''}`,
        type: 'academic',
      });
    }
    res.json(sub);
  } catch (err) {
    console.error('Homework grade error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /homework/:id/submissions -> all students of class/batch with their submission or null
router.get('/:id/submissions', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const hw = await Homework.findById(req.params.id).populate('subjectId', 'name');
    if (!hw) return res.status(404).json({ message: 'Homework not found' });
    if (!isOwnerOrAdmin(req.user, hw)) return res.status(403).json({ message: 'Access denied' });

    const students = await Student.find(studentQuery(hw)).select('name userId batchId').sort({ name: 1 });
    const subs = await HomeworkSubmission.find({ homeworkId: hw._id });
    const subMap = new Map(subs.map(s => [String(s.studentId), s]));
    res.json(students.map(s => ({
      student: { _id: s._id, name: s.name, userId: s.userId, batchId: s.batchId },
      submission: subMap.get(String(s._id)) || null,
    })));
  } catch (err) {
    console.error('Homework submissions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /homework/:id/submit (student; multipart `file` and/or `text`)
router.post('/:id/submit', auth, roleAuth('student'), uploadSingle('file'), async (req, res) => {
  const newFile = req.file ? fileUrl(req.file) : null;
  const fail = (code, message) => { if (newFile) removeUpload(newFile); return res.status(code).json({ message }); };
  try {
    if (!isObjectId(req.params.id)) return fail(400, 'Invalid id');
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return fail(404, 'Student profile not found');
    const hw = await Homework.findById(req.params.id);
    if (!hw) return fail(404, 'Homework not found');
    if (!sameId(hw.classId, student.classId) || (hw.batchId && !sameId(hw.batchId, student.batchId))) {
      return fail(403, 'This homework is not assigned to you');
    }
    const text = req.body && req.body.text ? String(req.body.text).trim().slice(0, 20000) : '';
    if (!newFile && !text) return fail(400, 'Attach a file or write an answer');

    const now = new Date();
    const status = hw.dueDate && now > new Date(hw.dueDate) ? 'late' : 'submitted';
    let sub = await HomeworkSubmission.findOne({ homeworkId: hw._id, studentId: student._id });
    if (sub && sub.status === 'graded') return fail(409, 'This homework has already been graded');

    if (sub) {
      if (newFile) {
        if (sub.fileUrl) removeUpload(sub.fileUrl);
        sub.fileUrl = newFile;
      }
      if (text || newFile) sub.text = text || sub.text;
      sub.submittedAt = now;
      sub.status = status;
      await sub.save();
    } else {
      try {
        sub = await HomeworkSubmission.create({ homeworkId: hw._id, studentId: student._id, fileUrl: newFile || undefined, text, submittedAt: now, status });
      } catch (err) {
        if (err && err.code === 11000) return fail(409, 'Submission already in progress, please retry');
        throw err;
      }
    }

    if (hw.teacherId) {
      await notifyUser(req.io, hw.teacherId, {
        title: 'Homework Submitted',
        message: `${student.name} submitted "${hw.title}"${status === 'late' ? ' (late)' : ''}.`,
        type: 'academic',
      });
    }
    res.json(sub);
  } catch (err) {
    console.error('Homework submit error:', err);
    if (newFile) removeUpload(newFile);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /homework/:id (owner | admin; multipart optional `attachment`)
router.put('/:id', auth, roleAuth('teacher', 'admin'), uploadSingle('attachment'), async (req, res) => {
  const newFile = req.file ? fileUrl(req.file) : null;
  try {
    if (!isObjectId(req.params.id)) { if (newFile) removeUpload(newFile); return res.status(400).json({ message: 'Invalid id' }); }
    const hw = await Homework.findById(req.params.id);
    if (!hw) { if (newFile) removeUpload(newFile); return res.status(404).json({ message: 'Homework not found' }); }
    if (!isOwnerOrAdmin(req.user, hw)) { if (newFile) removeUpload(newFile); return res.status(403).json({ message: 'Access denied' }); }

    const { data, error } = buildHomeworkData(req.body || {}, { partial: true });
    if (error) { if (newFile) removeUpload(newFile); return res.status(400).json({ message: error }); }
    if (data.batchId === null) { hw.batchId = undefined; delete data.batchId; }
    hw.set(data);
    const removeAttachment = req.body && (req.body.removeAttachment === 'true' || req.body.removeAttachment === true);
    if (newFile || removeAttachment) {
      if (hw.attachmentUrl) removeUpload(hw.attachmentUrl);
      hw.attachmentUrl = newFile || undefined;
    }
    await hw.save();
    res.json(hw);
  } catch (err) {
    console.error('Homework update error:', err);
    if (newFile) removeUpload(newFile);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /homework/:id (owner | admin) — also removes submissions and their files
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const hw = await Homework.findById(req.params.id);
    if (!hw) return res.status(404).json({ message: 'Homework not found' });
    if (!isOwnerOrAdmin(req.user, hw)) return res.status(403).json({ message: 'Access denied' });

    const subs = await HomeworkSubmission.find({ homeworkId: hw._id }).select('fileUrl');
    subs.forEach(s => s.fileUrl && removeUpload(s.fileUrl));
    await HomeworkSubmission.deleteMany({ homeworkId: hw._id });
    if (hw.attachmentUrl) removeUpload(hw.attachmentUrl);
    await Homework.deleteOne({ _id: hw._id });
    res.json({ message: 'Homework deleted', submissionsDeleted: subs.length });
  } catch (err) {
    console.error('Homework delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
