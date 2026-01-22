const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// Get Academic Insights
router.get('/insights', auth, async (req, res) => {
    try {
        // 1. Subject Performance (Avg Marks per Subject)
        const subjectStats = await Marks.aggregate([
            {
                $group: {
                    _id: "$subjectId",
                    avgScore: { $avg: "$marks" },
                    totalExams: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "subjects",
                    localField: "_id",
                    foreignField: "_id",
                    as: "subject"
                }
            },
            { $unwind: "$subject" },
            {
                $project: {
                    subjectName: "$subject.name",
                    avgScore: { $round: ["$avgScore", 1] },
                    totalExams: 1
                }
            },
            { $sort: { avgScore: 1 } } // Lowest first (to highlight weak areas)
        ]);

        // 2. Toppers (Students with highest avg marks across all exams)
        const toppers = await Marks.aggregate([
            {
                $group: {
                    _id: "$studentId",
                    avgTotal: { $avg: "$marks" }
                }
            },
            { $sort: { avgTotal: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: "students",
                    localField: "_id",
                    foreignField: "_id",
                    as: "student"
                }
            },
            { $unwind: "$student" },
            {
                $lookup: {
                    from: "classes",
                    localField: "student.classId",
                    foreignField: "_id",
                    as: "class"
                }
            },
            { $unwind: { path: "$class", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: "$student.name",
                    className: "$class.name",
                    avgTotal: { $round: ["$avgTotal", 2] }
                }
            }
        ]);

        // 3. At Risk Students (Avg < 40%)
        const weakStudents = await Marks.aggregate([
            {
                $group: {
                    _id: "$studentId",
                    avgTotal: { $avg: "$marks" }
                }
            },
            { $match: { avgTotal: { $lt: 40 } } },
            { $sort: { avgTotal: 1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "students",
                    localField: "_id",
                    foreignField: "_id",
                    as: "student"
                }
            },
            { $unwind: "$student" },
            {
                $lookup: {
                    from: "classes",
                    localField: "student.classId",
                    foreignField: "_id",
                    as: "class"
                }
            },
            { $unwind: { path: "$class", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: "$student.name",
                    className: "$class.name",
                    avgTotal: { $round: ["$avgTotal", 2] }
                }
            }
        ]);

        res.json({
            subjectPerformance: subjectStats,
            toppers,
            atRisk: weakStudents
        });

    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
