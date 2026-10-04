const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const sendEmail = require('../utils/sendEmail');
const sendAbsenceEmail = require('../utils/sendAbsenceEmail');
const sendSMS = require('../utils/sendSMS');
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../utils/jwtSecret');
const { notifyUser } = require('../utils/notify');
const { getAccessibleStudent, getParentUsers } = require('../utils/access');

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

// Absence alert: email (student + parents), in-app + socket notification and SMS/WhatsApp to parents
async function sendAbsentAlerts(req, studentId, subjectId, date, title) {
  try {
    const student = await Student.findById(studentId).populate('userId', 'name email phone');
    if (!student) return;
    const subject = await require('../models/Subject').findById(subjectId);
    const subjectName = subject ? subject.name : 'Class';
    const dateText = new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const message = `Dear Parent, your child ${student.name} was absent in ${subjectName} on ${dateText}.`;

    const parents = await getParentUsers(student);

    const recipientEmails = [];
    if (student.userId && student.userId.email) recipientEmails.push(student.userId.email);
    parents.forEach(p => { if (p.email && !recipientEmails.includes(p.email)) recipientEmails.push(p.email); });

    if (recipientEmails.length > 0) {
      await sendAbsenceEmail(recipientEmails, { studentName: student.name, subjectName, date });
    }

    for (const p of parents) {
      await notifyUser(req.io, p._id, { title, message, type: 'academic' });
      if (p.phone) sendSMS(p.phone, `Oasis JEE Classes: ${student.name} was marked absent in ${subjectName} on ${dateText}.`);
    }
  } catch (err) {
    console.error('Absent alert error:', err.message);
  }
}

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
        await sendAbsentAlerts(req, s.studentId, subjectId, date, 'Attendance Alert');
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
      await sendAbsentAlerts(req, studentId, subjectId, date, 'Daily Attendance Alert');
    }

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for student (student/parent/teacher/admin)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    // admin/teacher, the student, or a linked parent (parent link looked up from DB)
    const student = await getAccessibleStudent(req, res, req.params.studentId);
    if (!student) return;

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
router.get('/class/:classId/subject/:subjectId/date/:date', auth, roleAuth('teacher', 'admin'), async (req, res) => {
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
      JWT_SECRET,
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
      decoded = jwt.verify(qrToken, JWT_SECRET);
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
    if (decoded.classId && String(student.classId) !== String(decoded.classId)) {
      return res.status(403).json({ message: 'This QR code is for a different class' });
    }

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