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
                name: 'GROUND ZERO',
                description: 'For students going to class 7. Aimed at scoring high in school exams and selection in NTSE/Junior Science Olympiads.',
                duration: '1 Year',
                features: ['School Examination Excellence', 'NTSE Selection focus', 'Junior Science Olympiad', 'Maths Olympiad Prep'],
                classes: ['7th'],
            },
            {
                id: 2,
                name: 'NURTURE',
                description: 'For students going to class 8. Focused on school excellence and selection in competitive exams like NTSE and Junior Science Olympiads.',
                duration: '1 Year',
                features: ['School Examination Excellence', 'NTSE Selection focus', 'Junior Science Olympiad', 'Maths Olympiad Prep'],
                classes: ['8th'],
            },
            {
                id: 3,
                name: 'SHAKSHAM',
                description: 'For students going to class 9. Provides a solid foundation for grabbing top ranks in JEE, NEET & Olympiads in the future.',
                duration: '1 Year',
                features: ['Higher Science Olympiad', 'NTSE Selection focus', 'Solid JEE/NEET Foundation', 'Maths Olympiad Prep'],
                classes: ['9th'],
            },
            {
                id: 4,
                name: 'DAKSH',
                description: 'For students going to class 10. Comprehensive preparation for board exams and building a solid foundation for top ranks in JEE, NEET & Olympiads.',
                duration: '1 Year',
                features: ['Board Exam Excellence', 'Science & Maths Olympiads', 'JEE/NEET Foundation Building', 'Top Rank Strategy'],
                classes: ['10th'],
            },
            {
                id: 5,
                name: 'ABHYAAS',
                description: 'For students going to class 11. Aimed at achieving top ranks in JEE Mains & Advanced and building a solid foundation for future success.',
                duration: '1 Year',
                features: ['JEE Main & Advanced Focus', 'Top Rank Strategy', 'In-depth Physics/Chem/Maths', 'Solid Foundation for Future'],
                classes: ['11th'],
            },
            {
                id: 6,
                name: 'TARGET',
                description: 'For students going to class 12. Final stretch coaching aimed at achieving top ranks in JEE Main & Advanced and securing premier college seats.',
                duration: '1 Year',
                features: ['JEE Main & Advanced Mastery', 'Top Rank Strategy', 'Board Exam Excellence', 'Intensive Revision & Tests'],
                classes: ['12th'],
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
