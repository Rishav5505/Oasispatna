const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const User = require('../models/User');
const { notifyUser, notifyMany } = require('../utils/notify');
const { getAccessibleStudent, getOwnStudent, isObjectId, sameId } = require('../utils/access');
const { getTeacherClassIds, getClassTeacherUserIds } = require('../utils/teacherScope');

// Implemented per FEATURES_CONTRACT.md (A11)

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

// 'YYYY-MM-DD' -> IST midnight; anything else parsed as-is
function parseDate(v) {
  if (!v) return null;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+05:30`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const populateLeave = (q) => q
  .populate('userId', 'name role email phone')
  .populate({ path: 'studentId', select: 'name classId batchId', populate: [{ path: 'classId', select: 'name' }, { path: 'batchId', select: 'name' }] })
  .populate('reviewedBy', 'name role');

// POST /leaves (student | parent for child | teacher)
router.post('/', auth, roleAuth('student', 'parent', 'teacher'), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const type = ['sick', 'personal', 'other'].includes(req.body.type) ? req.body.type : 'other';
    const fromDate = parseDate(req.body.fromDate);
    const toDate = parseDate(req.body.toDate || req.body.fromDate);
    if (!fromDate || !toDate) return res.status(400).json({ message: 'Valid fromDate and toDate are required' });
    if (toDate < fromDate) return res.status(400).json({ message: 'toDate cannot be before fromDate' });
    if ((toDate - fromDate) / 86400000 > 60) return res.status(400).json({ message: 'Leave cannot exceed 60 days' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ message: 'reason is required' });

    let student = null;
    if (req.user.role === 'student') {
      student = await Student.findOne({ userId: req.user.id });
      if (!student) return res.status(404).json({ message: 'Student profile not found' });
    } else if (req.user.role === 'parent') {
      student = req.body.studentId ? await getAccessibleStudent(req, res, req.body.studentId) : await getOwnStudent(req.user);
      if (!student) { if (!res.headersSent) res.status(404).json({ message: 'No linked student found' }); return; }
    }

    const leave = await LeaveRequest.create({
      userId: req.user.id,
      role: req.user.role,
      studentId: student ? student._id : undefined,
      fromDate,
      toDate,
      reason: String(reason).trim().slice(0, 2000),
      type,
    });

    // Let reviewers know
    const range = `${fmt(fromDate)}${+toDate !== +fromDate ? ' - ' + fmt(toDate) : ''}`;
    let reviewers = [];
    if (student) reviewers = await getClassTeacherUserIds(student.classId);
    else reviewers = (await User.find({ role: 'admin' }).select('_id')).map(u => String(u._id));
    const requester = await User.findById(req.user.id).select('name');
    const who = student ? student.name : (requester ? requester.name : 'A teacher');
    await notifyMany(req.io, reviewers.map(r => ({
      recipient: r,
      title: 'New Leave Request',
      message: `${who} requested ${type} leave (${range}).`,
      type: 'general',
    })));

    res.status(201).json(leave);
  } catch (err) {
    console.error('Leave create error:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /leaves/mine
router.get('/mine', auth, async (req, res) => {
  try {
    const or = [{ userId: req.user.id }];
    // Students also see leaves their parent filed for them (and vice versa)
    if (req.user.role === 'student' || req.user.role === 'parent') {
      const s = await getOwnStudent(req.user);
      if (s) or.push({ studentId: s._id });
    }
    const list = await populateLeave(LeaveRequest.find({ $or: or })).sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (err) {
    console.error('Leave mine error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /leaves/pending (teacher -> their students' leaves; admin -> all). ?status=pending|approved|rejected|all
router.get('/pending', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const filter = {};
    if (status !== 'all') {
      if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    if (req.user.role === 'teacher') {
      const classIds = await getTeacherClassIds(req.user.id);
      const students = await Student.find({ classId: { $in: classIds } }).select('_id');
      filter.role = { $in: ['student', 'parent'] };
      filter.studentId = { $in: students.map(s => s._id) };
    } else if (req.query.role) {
      filter.role = req.query.role === 'teacher' ? 'teacher' : { $in: ['student', 'parent'] };
    }
    const list = await populateLeave(LeaveRequest.find(filter)).sort({ createdAt: -1 }).limit(500);
    res.json(list);
  } catch (err) {
    console.error('Leave pending error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /leaves/:id/review {status, reviewNote}
router.put('/:id/review', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const { status, reviewNote } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== 'pending') return res.status(409).json({ message: 'This request has already been reviewed' });

    let student = null;
    if (leave.studentId) student = await Student.findById(leave.studentId).select('name userId classId');
    if (req.user.role === 'teacher') {
      if (leave.role === 'teacher' || !student) return res.status(403).json({ message: 'Only an admin can review this request' });
      const classIds = await getTeacherClassIds(req.user.id);
      if (!classIds.includes(String(student.classId))) return res.status(403).json({ message: 'This student is not in your class' });
    }

    leave.status = status;
    leave.reviewNote = reviewNote ? String(reviewNote).slice(0, 2000) : '';
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    await leave.save();

    const title = status === 'approved' ? 'Leave Approved' : 'Leave Rejected';
    const message = `Your leave request (${fmt(leave.fromDate)}${+leave.toDate !== +leave.fromDate ? ' - ' + fmt(leave.toDate) : ''}) was ${status}.${leave.reviewNote ? ' Note: ' + leave.reviewNote : ''}`;
    await notifyUser(req.io, leave.userId, { title, message, type: 'general' });
    // If a parent filed it, the student hears about it too
    if (student && student.userId && !sameId(student.userId, leave.userId)) {
      await notifyUser(req.io, student.userId, { title, message, type: 'general' });
    }

    res.json(await populateLeave(LeaveRequest.findById(leave._id)));
  } catch (err) {
    console.error('Leave review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /leaves/:id (own, pending only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave || !sameId(leave.userId, req.user.id)) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== 'pending') return res.status(409).json({ message: 'Only pending requests can be withdrawn' });
    await LeaveRequest.deleteOne({ _id: leave._id });
    res.json({ message: 'Leave request withdrawn' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
