const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const LiveClass = require('../models/LiveClass');
const Attendance = require('../models/Attendance');

// Get today's live classes for a student
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const liveClasses = await LiveClass.find({
            dateTime: {
                $gte: today,
                $lt: tomorrow
            }
        })
            .populate('teacherId', 'name')
            .populate('subjectId', 'name')
            .sort({ dateTime: 1 });
        res.json(liveClasses);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark attendance when joining a live class
router.post('/join', auth, async (req, res) => {
    try {
        const { studentId, liveClassId, subjectId } = req.body;

        // Check if attendance already marked for this class
        const existingAttendance = await Attendance.findOne({
            studentId,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            },
            subjectId
        });

        if (!existingAttendance) {
            const attendance = new Attendance({
                studentId,
                date: new Date(),
                status: 'present',
                markedBy: req.user.id, // Or a system user ID if preferred
                subjectId
            });
            await attendance.save();
        }

        res.json({ message: 'Attendance marked and joined' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all live classes for a teacher
router.get('/teacher/:userId', auth, async (req, res) => {
    try {
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
router.get('/all', auth, async (req, res) => {
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

// Create a live class (Teacher only)
router.post('/', auth, async (req, res) => {
    try {
        const newClassData = {
            ...req.body,
            teacherId: req.user.id
        };
        const newClass = new LiveClass(newClassData);
        await newClass.save();

        // Notify students of this class
        const Student = require('../models/Student');
        const Notification = require('../models/Notification');
        const students = await Student.find({ classId: req.body.classId });

        const notifications = students.map(student => ({
            recipient: student.userId,
            title: 'New Live Class Scheduled',
            message: `A new live class for ${req.body.title} is scheduled at ${new Date(req.body.dateTime).toLocaleString()}.`,
            type: 'academic'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);

            if (req.io) {
                students.forEach(student => {
                    req.io.to(student.userId.toString()).emit('notification', {
                        title: 'New Live Class Scheduled',
                        message: `A new live class for ${req.body.title} is scheduled.`
                    });
                });
            }
        }

        res.json(newClass);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
