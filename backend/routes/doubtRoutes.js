const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Doubt = require('../models/Doubt');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { uploadSingle, fileUrl } = require('../utils/upload');
const { notifyUser } = require('../utils/notify');
const { getAccessibleStudent, resolveStudent, isObjectId } = require('../utils/access');

// Get doubts for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;

        const doubts = await Doubt.find({ studentId: student._id })
            .populate('subjectId', 'name')
            .sort({ createdAt: -1 });
        res.json(doubts);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Post a new doubt (student derives identity from token)
router.post('/', auth, uploadSingle('image'), async (req, res) => {
    try {
        const { title, description, subjectId } = req.body;

        let student;
        if (req.user.role === 'student') {
            student = await Student.findOne({ userId: req.user.id });
            if (!student) return res.status(404).json({ message: 'Student profile not found' });
        } else if (req.user.role === 'admin') {
            student = await resolveStudent(req.body.studentId);
            if (!student) return res.status(404).json({ message: 'Student not found' });
        } else {
            return res.status(403).json({ message: 'Only students can post doubts' });
        }

        if (!title || !description || !subjectId) {
            return res.status(400).json({ message: 'Title, description and subject are required' });
        }
        if (!isObjectId(String(subjectId))) return res.status(400).json({ message: 'Invalid subject' });

        const newDoubt = new Doubt({
            title: String(title).slice(0, 300),
            description: String(description).slice(0, 5000),
            studentId: student._id,
            subjectId,
            imageUrl: req.file ? fileUrl(req.file) : null
        });
        await newDoubt.save();
        res.json(newDoubt);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reply to a doubt (Teacher/Admin)
router.post('/:doubtId/reply', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !String(message).trim()) return res.status(400).json({ message: 'Reply message is required' });
        if (!isObjectId(req.params.doubtId)) return res.status(400).json({ message: 'Invalid doubt id' });

        const doubt = await Doubt.findById(req.params.doubtId);
        if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

        doubt.replies.push({
            userId: req.user.id,
            message: String(message).slice(0, 5000),
            createdAt: new Date()
        });
        doubt.status = 'resolved';
        await doubt.save();

        // Notify the student's USER account (Doubt.studentId is a Student _id)
        const student = await Student.findById(doubt.studentId).select('userId');
        if (student && student.userId) {
            await notifyUser(req.io, student.userId, {
                title: 'Doubt Resolved',
                message: `Your doubt "${doubt.title}" has been replied to.`,
                type: 'academic'
            });
        }

        res.json(doubt);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all doubts (Teacher/Admin view)
router.get('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
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
