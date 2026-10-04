const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const LiveClass = require('../models/LiveClass');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { notifyMany } = require('../utils/notify');
const { istDayRange } = require('../utils/time');
const {
    getAccessibleStudent,
    resolveStudent,
    classScopeFilter,
    isOwnerOrAdmin,
    isObjectId,
    sameId,
} = require('../utils/access');

const DEFAULT_DURATION = 60; // minutes
const STATUSES = ['scheduled', 'live', 'completed', 'cancelled'];
const EDITABLE_FIELDS = ['title', 'description', 'classId', 'subjectId', 'meetingLink', 'dateTime', 'duration', 'status'];
const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc; }, {});

const withDuration = (lc) => {
    const o = lc.toObject ? lc.toObject() : { ...lc };
    o.duration = Number(o.duration) > 0 ? Number(o.duration) : DEFAULT_DURATION;
    return o;
};

const fmtIST = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

const studentsOfClass = (classId) => Student.find({ classId }).select('userId');

// Live classes for a student: today + next 7 days (IST), class-scoped
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;

        const { start } = istDayRange();
        const end = new Date(start.getTime() + 8 * 24 * 60 * 60 * 1000);

        const liveClasses = await LiveClass.find({
            $and: [
                { dateTime: { $gte: start, $lt: end } },
                classScopeFilter(student, { batch: false })
            ]
        })
            .populate('teacherId', 'name')
            .populate('subjectId', 'name')
            .sort({ dateTime: 1 });
        res.json(liveClasses.map(withDuration));
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark attendance when joining a live class (student derived from token)
router.post('/join', auth, async (req, res) => {
    try {
        const { liveClassId } = req.body;

        let student;
        if (req.user.role === 'student') {
            student = await Student.findOne({ userId: req.user.id });
        } else if (req.user.role === 'admin' || req.user.role === 'teacher') {
            student = await resolveStudent(req.body.studentId);
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (!isObjectId(String(liveClassId))) return res.status(400).json({ message: 'Invalid live class id' });
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
        if (liveClass.classId && !sameId(liveClass.classId, student.classId)) {
            return res.status(403).json({ message: 'This class is not assigned to you' });
        }
        if (liveClass.status === 'cancelled') return res.status(400).json({ message: 'This class has been cancelled' });

        // One attendance record per student/subject/day (same convention as teacher marking)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
            { studentId: student._id, date: startOfDay, subjectId: liveClass.subjectId },
            { $setOnInsert: { status: 'present', markedBy: liveClass.teacherId } },
            { upsert: true, new: true }
        );

        res.json({ message: 'Attendance marked and joined', meetingLink: liveClass.meetingLink });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all live classes for a teacher (self or admin)
router.get('/teacher/:userId', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (req.user.role === 'teacher' && String(req.user.id) !== String(req.params.userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const liveClasses = await LiveClass.find({ teacherId: req.params.userId })
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ dateTime: -1 });
        res.json(liveClasses);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all live classes (Admin)
router.get('/all', auth, roleAuth('admin'), async (req, res) => {
    try {
        const liveClasses = await LiveClass.find()
            .populate('teacherId', 'name')
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ dateTime: -1 });
        res.json(liveClasses);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a live class (Teacher/Admin)
router.post('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        const data = pick(req.body, EDITABLE_FIELDS);
        if (data.status !== undefined && !STATUSES.includes(data.status)) return res.status(400).json({ message: 'Invalid status' });
        data.teacherId = req.user.id;
        const newClass = new LiveClass(data);
        await newClass.save();

        // Notify students of this class
        const students = await studentsOfClass(newClass.classId);
        await notifyMany(req.io, students.map(student => ({
            recipient: student.userId,
            title: 'New Live Class Scheduled',
            message: `A new live class "${newClass.title}" is scheduled at ${fmtIST(newClass.dateTime)}.`,
            type: 'academic'
        })));

        res.json(newClass);
    } catch (err) {
        console.error(err);
        if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a live class (owner teacher | admin)
router.put('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid live class id' });
        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
        if (!isOwnerOrAdmin(req.user, liveClass)) return res.status(403).json({ message: 'Access denied' });

        const data = pick(req.body, EDITABLE_FIELDS);
        if (data.status !== undefined && !STATUSES.includes(data.status)) return res.status(400).json({ message: 'Invalid status' });
        liveClass.set(data);
        await liveClass.save();
        res.json(liveClass);
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server error' });
    }
});

// Change live class status (owner teacher | admin)
router.patch('/:id/status', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid live class id' });

        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
        if (!isOwnerOrAdmin(req.user, liveClass)) return res.status(403).json({ message: 'Access denied' });

        const previous = liveClass.status;
        liveClass.status = status;
        await liveClass.save();

        if (previous !== status && (status === 'live' || status === 'cancelled')) {
            const students = await studentsOfClass(liveClass.classId);
            await notifyMany(req.io, students.map(s => ({
                recipient: s.userId,
                title: status === 'live' ? 'Live Class Started' : 'Live Class Cancelled',
                message: status === 'live'
                    ? `"${liveClass.title}" is live now. Join from your dashboard.`
                    : `"${liveClass.title}" scheduled at ${fmtIST(liveClass.dateTime)} has been cancelled.`,
                type: 'academic'
            })));
        }

        res.json(liveClass);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a live class (owner teacher | admin)
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid live class id' });
        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
        if (!isOwnerOrAdmin(req.user, liveClass)) return res.status(403).json({ message: 'Access denied' });

        await LiveClass.deleteOne({ _id: liveClass._id });
        res.json({ message: 'Live class deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
