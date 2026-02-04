const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Notification = require('../models/Notification');
const Student = require('../models/Student');

// Get all exams
router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find().populate('classId').populate('subjects');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get exams for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ classId: req.params.classId }).populate('subjects');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create exam (admin/teacher only)
router.post('/', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json(exam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update exam
router.put('/:id', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(exam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete exam
router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Publish Results
router.post('/:id/publish', auth, roleAuth('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('classId');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    exam.isPublished = true;
    await exam.save();

    // Notify all students in the class
    const students = await Student.find({ classId: exam.classId });
    const notifications = students.map(student => ({
      recipient: student.userId,
      title: 'Result Published! 🎉',
      message: `Your results for ${exam.name} have been published. Check your report card now!`,
      type: 'academic'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);

      // Emit socket events if possible
      if (req.io) {
        students.forEach(student => {
          req.io.to(student.userId.toString()).emit('notification', {
            title: 'Result Published! 🎉',
            message: `Your results for ${exam.name} have been published.`,
            type: 'academic'
          });
        });
      }
    }

    res.json({ message: 'Results published and notifications sent!', exam });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ message: 'Server error publishing results' });
  }
});

// Unpublish Results
router.post('/:id/unpublish', auth, roleAuth('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    exam.isPublished = false;
    await exam.save();
    res.json({ message: 'Results unpublished', exam });
  } catch (err) {
    res.status(500).json({ message: 'Server error unpublishing results' });
  }
});

module.exports = router;