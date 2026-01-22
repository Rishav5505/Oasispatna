const express = require('express');
const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject');

const router = express.Router();

// Get all subjects
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ name: 1 });
        res.json(subjects);
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get featured faculty for homepage
router.get('/faculty', async (req, res) => {
    try {
        const teachers = await Teacher.find()
            .populate('userId', 'name email profilePhoto')
            .populate('subjects', 'name')
            .populate('classes', 'name')
            .limit(6); // Show top 6 faculty members

        const facultyData = teachers.map(teacher => ({
            id: teacher._id,
            name: teacher.userId?.name || 'Faculty Member',
            photo: teacher.userId?.profilePhoto || null,
            subjects: teacher.subjects?.map(s => s.name).join(', ') || 'N/A',
            classes: teacher.classes?.map(c => c.name).join(', ') || 'N/A',
        }));

        res.json(facultyData);
    } catch (err) {
        console.error('Error fetching faculty:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all batches for homepage
router.get('/batches', async (req, res) => {
    try {
        const batches = await Batch.find()
            .populate('classId', 'name')
            .select('name schedule classId');

        res.json(batches);
    } catch (err) {
        console.error('Error fetching batches:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get courses information (static for now, can be made dynamic later)
router.get('/courses', async (req, res) => {
    try {
        const classes = await Class.find().select('name');

        const courses = [
            {
                id: 1,
                name: 'JEE Main',
                description: 'Comprehensive preparation for JEE Main with extensive practice and test series',
                duration: '1-2 Years',
                features: ['Daily Practice Problems', 'Weekly Tests', 'Doubt Clearing Sessions', 'Study Material'],
                classes: classes.filter(c => c.name.includes('11') || c.name.includes('12')).map(c => c.name),
            },
            {
                id: 2,
                name: 'JEE Advanced',
                description: 'Advanced level coaching for IIT admission with expert faculty and proven methods',
                duration: '1-2 Years',
                features: ['Advanced Problem Solving', 'IIT Alumni Mentorship', 'Mock Tests', 'Conceptual Clarity'],
                classes: classes.filter(c => c.name.includes('12')).map(c => c.name),
            },
            {
                id: 3,
                name: 'Foundation (9th-10th)',
                description: 'Build strong fundamentals for competitive exams from early stages',
                duration: '2 Years',
                features: ['Conceptual Foundation', 'School Syllabus Coverage', 'Early Prep Advantage', 'Interactive Learning'],
                classes: classes.filter(c => c.name.includes('9') || c.name.includes('10')).map(c => c.name),
            },
        ];

        res.json(courses);
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get testimonials (static for now)
router.get('/testimonials', async (req, res) => {
    try {
        const testimonials = [
            {
                id: 1,
                parentName: 'Mrs. Sunita Sharma',
                studentName: 'Rahul Sharma',
                achievement: 'JEE Advanced AIR 247, IIT Delhi',
                quote: 'Oasis provided the perfect environment for my son to excel. The faculty is exceptional and the ERP system helped me track his progress daily.',
                rating: 5,
            },
            {
                id: 2,
                parentName: 'Mr. Rajesh Kumar',
                studentName: 'Priya Kumar',
                achievement: 'JEE Main AIR 589, NIT Patna',
                quote: 'The personalized attention and regular parent-teacher meetings made all the difference. Highly recommend Oasis for serious JEE aspirants.',
                rating: 5,
            },
            {
                id: 3,
                parentName: 'Mrs. Anjali Singh',
                studentName: 'Amit Singh',
                achievement: 'JEE Advanced AIR 412, IIT Bombay',
                quote: 'Excellent coaching with great infrastructure. The online parent dashboard is a game-changer for tracking attendance and performance.',
                rating: 5,
            },
        ];

        res.json(testimonials);
    } catch (err) {
        console.error('Error fetching testimonials:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
