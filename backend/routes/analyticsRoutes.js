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
const TestResult = require('../models/TestResult');
const { isObjectId } = require('../utils/access');
const { getTeacherClassIds } = require('../utils/teacherScope');

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

// Weak students alert (FEATURES_CONTRACT A10)
// GET /analytics/at-risk?classId=&batchId= (teacher -> only their classes; admin -> all)
router.get('/at-risk', auth, roleAuth('admin', 'teacher'), async (req, res) => {
    try {
        const { classId, batchId } = req.query;
        if (classId && !isObjectId(String(classId))) return res.status(400).json({ message: 'Invalid classId' });
        if (batchId && !isObjectId(String(batchId))) return res.status(400).json({ message: 'Invalid batchId' });

        const filter = {};
        if (req.user.role === 'teacher') {
            const allowed = await getTeacherClassIds(req.user.id);
            if (classId && !allowed.includes(String(classId))) return res.status(403).json({ message: 'Access denied: class not assigned to you' });
            filter.classId = classId ? classId : { $in: allowed };
        } else if (classId) {
            filter.classId = classId;
        }
        if (batchId) filter.batchId = batchId;

        const students = await Student.find(filter).select('name userId classId').populate('classId', 'name');
        if (!students.length) return res.json([]);
        const ids = students.map(s => s._id);

        // Attendance over the last 30 days (records are per subject per day)
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const attAgg = await Attendance.aggregate([
            { $match: { studentId: { $in: ids }, date: { $gte: since } } },
            { $group: { _id: '$studentId', total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } }
        ]);
        const attMap = new Map(attAgg.map(a => [String(a._id), a]));

        // Test performance: online test results + offline exam marks, newest first
        const [results, marks] = await Promise.all([
            TestResult.find({ studentId: { $in: ids } }).select('studentId score totalMarks submittedAt').sort({ submittedAt: -1 }),
            Marks.find({ studentId: { $in: ids } }).select('studentId marks maxMarks createdAt').sort({ createdAt: -1 })
        ]);
        const scoreMap = new Map();
        const push = (sid, pctVal, at) => {
            if (!Number.isFinite(pctVal)) return;
            const k = String(sid);
            if (!scoreMap.has(k)) scoreMap.set(k, []);
            scoreMap.get(k).push({ pct: pctVal, at: new Date(at || 0) });
        };
        results.forEach(r => r.totalMarks > 0 && push(r.studentId, (Math.max(0, r.score) / r.totalMarks) * 100, r.submittedAt));
        marks.forEach(m => (m.maxMarks || 100) > 0 && push(m.studentId, (m.marks / (m.maxMarks || 100)) * 100, m.createdAt));

        const avg = (arr) => arr.reduce((a, x) => a + x, 0) / arr.length;
        const round1 = (n) => Math.round(n * 10) / 10;

        const out = [];
        students.forEach(s => {
            const k = String(s._id);
            const att = attMap.get(k);
            const attendancePct = att && att.total > 0 ? round1((att.present / att.total) * 100) : null;

            const scores = (scoreMap.get(k) || []).sort((a, b) => b.at - a.at).slice(0, 5).map(x => x.pct);
            const avgTestPct = scores.length ? round1(avg(scores)) : null;

            // Trend: newer half vs older half of the last 5 scores
            let trend = 'flat';
            let trendDelta = 0;
            if (scores.length >= 2) {
                const half = Math.floor(scores.length / 2);
                const recent = avg(scores.slice(0, half));
                const older = avg(scores.slice(scores.length - half));
                trendDelta = recent - older;
                if (trendDelta > 5) trend = 'up';
                else if (trendDelta < -5) trend = 'down';
            }

            const reasons = [];
            let high = false;
            let medium = false;
            if (attendancePct !== null) {
                if (attendancePct < 65) { high = true; reasons.push(`Low attendance (${attendancePct}% in last 30 days)`); }
                else if (attendancePct < 75) { medium = true; reasons.push(`Attendance below 75% (${attendancePct}%)`); }
            }
            if (avgTestPct !== null) {
                if (avgTestPct < 40) { high = true; reasons.push(`Low test average (${avgTestPct}% over last ${scores.length} tests)`); }
                else if (avgTestPct < 55) { medium = true; reasons.push(`Test average below 55% (${avgTestPct}%)`); }
            }
            if (trend === 'down') {
                const drop = round1(-trendDelta);
                if (drop > 15) high = true; else medium = true;
                reasons.push(`Scores dropping (${drop} points)`);
            }
            if (!high && !medium) return;

            out.push({
                studentId: s._id,
                userId: s.userId,
                name: s.name,
                className: s.classId ? s.classId.name : '',
                attendancePct,
                avgTestPct,
                trend,
                reasons,
                riskLevel: high ? 'high' : 'medium'
            });
        });

        out.sort((a, b) => (a.riskLevel === b.riskLevel ? 0 : a.riskLevel === 'high' ? -1 : 1)
            || ((a.avgTestPct ?? 100) - (b.avgTestPct ?? 100)));
        res.json(out);
    } catch (err) {
        console.error('At-risk analytics error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
