const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Lead = require('../models/Lead');
const { istDayRange, lastNMonthsIST, TZ } = require('../utils/time');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// Get Academic Insights
router.get('/insights', auth, roleAuth('admin', 'teacher'), async (req, res) => {
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

// Admin dashboard overview
router.get('/overview', auth, roleAuth('admin'), async (req, res) => {
    try {
        const [students, teachers, parents, classes] = await Promise.all([
            Student.countDocuments(),
            User.countDocuments({ role: 'teacher' }),
            User.countDocuments({ role: 'parent' }),
            Class.countDocuments()
        ]);

        // Today's attendance (IST day). A student counts as present if marked present in any subject today.
        const { start, end, dateStr } = istDayRange();
        const todayAgg = await Attendance.aggregate([
            { $match: { date: { $gte: start, $lt: end } } },
            { $group: { _id: '$studentId', anyPresent: { $max: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
            { $group: { _id: null, present: { $sum: '$anyPresent' }, marked: { $sum: 1 } } }
        ]);
        const present = todayAgg.length ? todayAgg[0].present : 0;
        const marked = todayAgg.length ? todayAgg[0].marked : 0;
        const absent = marked - present;
        const notMarked = Math.max(0, students - marked);

        // Last 6 months (IST)
        const months = lastNMonthsIST(6);
        const since = months[0].start;

        const enrolAgg = await Student.aggregate([
            { $project: { d: { $ifNull: ['$admissionDate', '$createdAt'] } } },
            { $match: { d: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$d', timezone: TZ } }, count: { $sum: 1 } } }
        ]);
        const enrolMap = new Map(enrolAgg.map(e => [e._id, e.count]));

        const revAgg = await Fee.aggregate([
            { $match: { status: 'Paid' } },
            { $project: { amount: 1, d: { $ifNull: ['$date', '$createdAt'] } } },
            { $match: { d: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$d', timezone: TZ } }, amount: { $sum: '$amount' } } }
        ]);
        const revMap = new Map(revAgg.map(r => [r._id, r.amount]));

        // Fee totals: collected = all Paid fees; pending = sum of each student's outstanding balance
        const paidByStudent = await Fee.aggregate([
            { $match: { status: 'Paid' } },
            { $group: { _id: '$studentId', total: { $sum: '$amount' } } }
        ]);
        const collected = paidByStudent.reduce((a, p) => a + (p.total || 0), 0);
        const paidMap = new Map(paidByStudent.map(p => [String(p._id), p.total]));
        const feeStudents = await Student.find({ totalFee: { $gt: 0 } }).select('totalFee');
        const pending = feeStudents.reduce((a, s) => a + Math.max(0, (s.totalFee || 0) - (paidMap.get(String(s._id)) || 0)), 0);

        const [pendingPayments, newLeads] = await Promise.all([
            Fee.countDocuments({ status: 'Pending' }),
            Lead.countDocuments({ $or: [{ status: 'new' }, { status: { $exists: false } }] })
        ]);

        res.json({
            totals: { students, teachers, parents, classes },
            today: { present, absent, notMarked, date: dateStr },
            enrolmentTrend: months.map(m => ({ month: m.label, count: enrolMap.get(m.key) || 0 })),
            revenueTrend: months.map(m => ({ month: m.label, amount: revMap.get(m.key) || 0 })),
            feeTotals: { collected, pending },
            pendingPayments,
            newLeads
        });
    } catch (err) {
        console.error('Analytics Overview Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
