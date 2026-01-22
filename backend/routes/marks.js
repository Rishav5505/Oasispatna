const express = require('express');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Upload marks (teacher only)
router.post('/', auth, roleAuth('teacher'), async (req, res) => {
  const { studentId, subjectId, marks, examId, remarks } = req.body;
  try {
    const mark = new Marks({
      studentId,
      subjectId,
      marks,
      examId,
      remarks,
      markedBy: req.user.id,
    });
    await mark.save();
    res.json(mark);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get marks for student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    let student = await Student.findById(req.params.studentId);
    if (!student) {
      student = await Student.findOne({ userId: req.params.studentId });
    }
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (req.user.role === 'student' && req.user.id !== student.userId.toString()) return res.status(403).json({ message: 'Access denied' });
    if (req.user.role === 'parent') {
      // Parents can only access their linked student's data via token
      if (!req.user.studentId || req.user.studentId !== student._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Can only view own child\'s data.' });
      }
    }

    const marks = await Marks.find({ studentId: student._id }).populate('subjectId', 'name').populate('examId', 'name type');
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get marks by class, subject, exam (teacher/admin)
router.get('/class/:classId/subject/:subjectId/exam/:examId', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  const { classId, subjectId, examId } = req.params;
  try {
    // 1. Get all students in this class
    const students = await Student.find({ classId });
    const studentIds = students.map(s => s._id);

    // 2. Get marks for these students for specific subject/exam
    const marks = await Marks.find({
      studentId: { $in: studentIds },
      subjectId,
      examId
    }).populate('studentId', 'name');

    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all marks (admin)
router.get('/', auth, roleAuth('admin'), async (req, res) => {
  try {
    const marks = await Marks.find().populate('studentId').populate('markedBy');
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;