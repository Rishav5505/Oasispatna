const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Doubt = require('../models/Doubt');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Get doubts for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const doubts = await Doubt.find({ studentId: req.params.studentId })
            .populate('subjectId', 'name')
            .sort({ createdAt: -1 });
        res.json(doubts);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Post a new doubt
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { title, description, studentId, subjectId } = req.body;
        const newDoubt = new Doubt({
            title,
            description,
            studentId,
            subjectId,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null
        });
        await newDoubt.save();
        res.json(newDoubt);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reply to a doubt (Teacher/Admin)
router.post('/:doubtId/reply', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const doubt = await Doubt.findById(req.params.doubtId);
        if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

        doubt.replies.push({
            userId: req.user.id,
            message,
            createdAt: new Date()
        });
        doubt.status = 'resolved';
        await doubt.save();

        // Create Notification for the student
        const Notification = require('../models/Notification');
        const notification = new Notification({
            recipient: doubt.studentId,
            title: 'Doubt Resolved',
            message: `Your doubt "${doubt.title}" has been replied to.`,
            type: 'academic'
        });
        await notification.save();

        // Send real-time notification
        if (req.io) {
            req.io.to(doubt.studentId.toString()).emit('notification', notification);
        }

        res.json(doubt);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

const Teacher = require('../models/Teacher');

// Get all doubts (Teacher/Admin view)
router.get('/', auth, async (req, res) => {
    try {
        let query = {};

        // If user is a teacher, only show doubts for their assigned subjects
        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ userId: req.user.id });
            if (teacher && teacher.subjects && teacher.subjects.length > 0) {
                query.subjectId = { $in: teacher.subjects };
            }
        }

        const doubts = await Doubt.find(query)
            .populate('studentId', 'name')
            .populate('subjectId', 'name')
            .sort({ createdAt: -1 });
        res.json(doubts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
