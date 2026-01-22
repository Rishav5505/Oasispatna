const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const OnlineTest = require('../models/OnlineTest');
const TestResult = require('../models/TestResult');

// Get all tests for a student
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const tests = await OnlineTest.find({ status: 'active' })
            .populate('subjectId', 'name')
            .sort({ createdAt: -1 });

        const results = await TestResult.find({ studentId: req.params.studentId });

        const testsWithStatus = tests.map(t => {
            const result = results.find(r => r.testId.toString() === t._id.toString());
            return {
                ...t._doc,
                attempted: !!result,
                score: result ? result.score : null
            };
        });

        res.json(testsWithStatus);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit a test
router.post('/submit', auth, async (req, res) => {
    try {
        const { studentId, testId, answers } = req.body;

        const test = await OnlineTest.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        let score = 0;
        const processedAnswers = test.questions.map((q, index) => {
            const studentAnswer = answers.find(a => a.questionId.toString() === q._id.toString()) || {};
            const isCorrect = studentAnswer.selectedOption === q.correctOption;
            if (isCorrect) score += q.marks || 1;
            return {
                questionId: q._id,
                selectedOption: studentAnswer.selectedOption,
                isCorrect
            };
        });

        const result = new TestResult({
            testId,
            studentId,
            answers: processedAnswers,
            score,
            totalMarks: test.totalMarks
        });

        await result.save();
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get test result with rank
router.get('/result/:testId/:studentId', auth, async (req, res) => {
    try {
        const results = await TestResult.find({ testId: req.params.testId }).sort({ score: -1, submittedAt: 1 });
        const studentResult = results.find(r => r.studentId.toString() === req.params.studentId);

        if (!studentResult) return res.status(404).json({ message: 'Result not found' });

        const rank = results.findIndex(r => r.studentId.toString() === req.params.studentId) + 1;

        res.json({
            ...studentResult._doc,
            rank,
            totalStudents: results.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new test (Teacher only)
router.post('/', auth, async (req, res) => {
    try {
        const testData = {
            ...req.body,
            teacherId: req.user.id
        };
        const newTest = new OnlineTest(testData);
        await newTest.save();

        // Notify students of this test
        const Student = require('../models/Student');
        const Notification = require('../models/Notification');
        const students = await Student.find({ classId: req.body.classId });

        const notifications = students.map(student => ({
            recipient: student.userId,
            title: 'New Online Test Added',
            message: `A new test "${req.body.title}" for ${req.body.subjectId} has been added.`,
            type: 'academic'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);

            if (req.io) {
                students.forEach(student => {
                    req.io.to(student.userId.toString()).emit('notification', {
                        title: 'New Online Test',
                        message: `A new test "${req.body.title}" is available.`
                    });
                });
            }
        }

        res.json(newTest);
    } catch (err) {
        console.error('Test Creation Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all tests for a specific teacher
router.get('/teacher/:userId', auth, async (req, res) => {
    try {
        const tests = await OnlineTest.find({ teacherId: req.params.userId })
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all tests (Admin view)
router.get('/all', auth, async (req, res) => {
    try {
        const tests = await OnlineTest.find()
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get results for a specific test
router.get('/:testId/results', auth, async (req, res) => {
    try {
        const results = await TestResult.find({ testId: req.params.testId })
            .populate('studentId', 'name')
            .sort({ score: -1, submittedAt: 1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `test-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Upload Question Paper
router.post('/upload', auth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.json({ url: `/uploads/${req.file.filename}` });
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
