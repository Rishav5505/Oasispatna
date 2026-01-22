const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Institute Location (Patna placeholder - user can update in .env)
const INSTITUTE_LAT = parseFloat(process.env.INSTITUTE_LAT) || 25.6039;
const INSTITUTE_LON = parseFloat(process.env.INSTITUTE_LON) || 85.1221;
const MAX_DISTANCE_METERS = parseInt(process.env.MAX_ATTENDANCE_DISTANCE) || 200; // 200 meters

// Helper for Distance Calculation (Haversine Formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

// Bulk mark attendance (teacher only)
router.post('/bulk', auth, roleAuth('teacher'), async (req, res) => {
  const { students, date, subjectId } = req.body;
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const promises = students.map(async (s) => {
      const attendance = await Attendance.findOneAndUpdate(
        { studentId: s.studentId, date: startOfDay, subjectId },
        { status: s.status, markedBy: req.user.id },
        { upsert: true, new: true }
      );

      if (s.status === 'absent') {
        const student = await Student.findById(s.studentId).populate('parentId');
        if (student && student.parentId) {
          const parentId = student.parentId._id || student.parentId;
          const subject = await require('../models/Subject').findById(subjectId);
          const message = `Dear Parent, your child ${student.name} was absent in ${subject ? subject.name : 'Class'} on ${date}.`;

          const notification = new Notification({
            recipient: parentId,
            title: 'Attendance Alert',
            message: message,
            type: 'academic'
          });
          await notification.save();
        }
      }
      return attendance;
    });

    await Promise.all(promises);
    res.json({ message: 'Bulk attendance updated' });
  } catch (err) {
    console.error('Bulk attendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark attendance (teacher only)
router.post('/', auth, roleAuth('teacher'), async (req, res) => {
  const { studentId, date, status, subjectId } = req.body;
  try {
    // Normalize date to start of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date: startOfDay, subjectId },
      { status, markedBy: req.user.id },
      { upsert: true, new: true }
    );

    if (status === 'absent') {
      const student = await Student.findById(studentId).populate('parentId');
      if (student.parentId) {
        const parentId = student.parentId._id || student.parentId;
        const subject = await require('../models/Subject').findById(subjectId);
        const message = `Dear Parent, your child ${student.name} was absent in ${subject ? subject.name : 'Class'} on ${date}.`;

        // Existing Email/SMS
        const parentUser = await User.findById(parentId);
        if (parentUser) {
          sendEmail(parentUser.email, 'Attendance Notification', message);
          // sendSMS(parentUser.phone, message);
        }

        // New In-App Notification
        const notification = new Notification({
          recipient: parentId,
          title: 'Daily Attendance Alert',
          message: message,
          type: 'academic'
        });
        await notification.save();
      }
    }

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for student (student/parent/teacher/admin)
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
    // Teacher and admin can view

    const attendance = await Attendance.find({ studentId: student._id })
      .populate('subjectId', 'name')
      .sort({ date: -1 }); // Sort by new implementation
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all attendance (admin)
router.get('/', auth, roleAuth('admin'), async (req, res) => {
  try {
    const attendance = await Attendance.find().populate('studentId').populate('markedBy');
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for a class, subject, and date
router.get('/class/:classId/subject/:subjectId/date/:date', auth, async (req, res) => {
  const { classId, subjectId, date } = req.params;
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const students = await Student.find({ classId });
    const studentIds = students.map(s => s._id);

    const attendance = await Attendance.find({
      studentId: { $in: studentIds },
      subjectId,
      date: startOfDay
    });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 1. Generate QR Code (Teacher)
router.post('/qr/generate', auth, roleAuth('teacher'), async (req, res) => {
  const { classId, subjectId } = req.body;
  try {
    if (!classId || !subjectId) return res.status(400).json({ message: 'Class and Subject are required' });

    // Generate a token that expires in 5 minutes
    const qrToken = jwt.sign(
      { classId, subjectId, teacherId: req.user.id, type: 'attendance_qr' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({ qrToken, expiresIn: '5m' });
  } catch (err) {
    res.status(500).json({ message: 'Error generating QR session' });
  }
});

// 2. Mark Attendance via QR Scan (Student)
router.post('/qr/mark', auth, roleAuth('student'), async (req, res) => {
  const { qrToken, lat, lon } = req.body;
  try {
    if (!qrToken || !lat || !lon) return res.status(400).json({ message: 'Invalid scan data or location' });

    // 1. Verify Token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'QR Code expired or invalid. Scan again.' });
    }

    if (decoded.type !== 'attendance_qr') return res.status(400).json({ message: 'Invalid QR type' });

    // 2. Geofencing check
    const distance = getDistance(lat, lon, INSTITUTE_LAT, INSTITUTE_LON);
    if (distance > MAX_DISTANCE_METERS) {
      return res.status(403).json({
        message: `Out of range! You are ${Math.round(distance)}m away. Move closer to the institute.`,
        distance: Math.round(distance)
      });
    }

    // 3. Find Student Record
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    // 4. Mark Attendance
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { studentId: student._id, date: startOfDay, subjectId: decoded.subjectId },
      { status: 'present', markedBy: decoded.teacherId },
      { upsert: true, new: true }
    );

    res.json({ message: 'Attendance marked successfully!', attendance });
  } catch (err) {
    console.error('QR Attendance Error:', err);
    res.status(500).json({ message: 'Server error marking attendance' });
  }
});

module.exports = router;