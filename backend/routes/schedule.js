const express = require('express');
const Schedule = require('../models/Schedule');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { getAccessibleStudent, isObjectId } = require('../utils/access');

const router = express.Router();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Parse 'HH:mm' or legacy 'hh:mm AM/PM' into minutes since midnight (null if unparseable)
const toMinutes = (t) => {
    if (!t) return null;
    const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2]);
    if (m[3]) {
        const pm = m[3].toLowerCase() === 'pm';
        if (h === 12) h = pm ? 12 : 0;
        else if (pm) h += 12;
    }
    return h * 60 + min;
};

const sortSlots = (a, b) => (DAYS.indexOf(a.day) - DAYS.indexOf(b.day)) || ((toMinutes(a.startTime) || 0) - (toMinutes(b.startTime) || 0));

// Shape: { _id, day, startTime, endTime, subject:{_id,name}, teacher:{_id,name}, batchId, batch?, room }
// subjectId/teacherId (populated) are kept for backward compatibility with older UI code.
const shape = (s) => {
    const o = s.toObject ? s.toObject() : s;
    const batch = o.batchId && o.batchId._id ? { _id: o.batchId._id, name: o.batchId.name } : null;
    return {
        _id: o._id,
        day: o.day,
        startTime: o.startTime,
        endTime: o.endTime,
        subject: o.subjectId && o.subjectId._id ? { _id: o.subjectId._id, name: o.subjectId.name } : null,
        teacher: o.teacherId && o.teacherId._id ? { _id: o.teacherId._id, name: o.teacherId.name } : null,
        batchId: batch ? batch._id : o.batchId,
        batch,
        batchName: batch ? batch.name : undefined,
        room: o.room,
        subjectId: o.subjectId,
        teacherId: o.teacherId,
    };
};

const findSlots = (query) => Schedule.find(query)
    .populate('subjectId', 'name')
    .populate('teacherId', 'name')
    .populate('batchId', 'name');

// Validate a slot payload; returns error message or null
async function validateSlot(body, { strict = true } = {}) {
    const { batchId, day, startTime, endTime, subjectId, teacherId } = body;
    if (!batchId || !day || !startTime || !endTime || !subjectId) {
        return 'batchId, day, startTime, endTime and subjectId are required';
    }
    if (!DAYS.includes(day)) return 'Invalid day';
    if (strict ? (!HHMM.test(startTime) || !HHMM.test(endTime)) : (toMinutes(startTime) === null || toMinutes(endTime) === null)) return "Times must be in 'HH:mm' (24h) format";
    if (toMinutes(endTime) <= toMinutes(startTime)) return 'endTime must be after startTime';
    if (!isObjectId(String(batchId)) || !isObjectId(String(subjectId)) || (teacherId && !isObjectId(String(teacherId)))) {
        return 'Invalid batch, subject or teacher id';
    }
    if (!(await Batch.exists({ _id: batchId }))) return 'Batch not found';
    if (!(await Subject.exists({ _id: subjectId }))) return 'Subject not found';
    if (teacherId) {
        const t = await User.findById(teacherId).select('role');
        if (!t || t.role !== 'teacher') return 'Teacher not found';
    }
    return null;
}

// Find an overlapping slot for the same batch or same teacher on the same day
async function findConflict({ batchId, day, startTime, endTime, teacherId }, excludeId) {
    const or = [{ batchId }];
    if (teacherId) or.push({ teacherId });
    const query = { day, $or: or };
    if (excludeId) query._id = { $ne: excludeId };
    const sameDay = await Schedule.find(query).populate('batchId', 'name');
    const s = toMinutes(startTime);
    const e = toMinutes(endTime);
    return sameDay.find(slot => {
        const ss = toMinutes(slot.startTime);
        const se = toMinutes(slot.endTime);
        if (ss === null || se === null) return false;
        return s < se && ss < e;
    });
}

const conflictMessage = (c, body) => {
    const who = String(c.batchId?._id || c.batchId) === String(body.batchId) ? 'this batch' : 'this teacher';
    return `Time slot overlaps with an existing class for ${who} (${c.day} ${c.startTime}-${c.endTime}${c.batchId?.name ? ', ' + c.batchId.name : ''})`;
};

// Get schedule for a student (via their batch) - student self, linked parent, teacher, admin
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;

        if (!student.batchId) return res.json([]);

        const schedule = await findSlots({ batchId: student.batchId });
        res.json(schedule.map(shape).sort(sortSlots));
    } catch (err) {
        console.error('Schedule Fetch Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Teacher's own timetable
router.get('/teacher/me', auth, roleAuth('teacher'), async (req, res) => {
    try {
        const schedule = await findSlots({ teacherId: req.user.id });
        res.json(schedule.map(shape).sort(sortSlots));
    } catch (err) {
        console.error('Teacher Schedule Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Timetable of a batch (any logged-in user)
router.get('/batch/:batchId', auth, async (req, res) => {
    try {
        if (!isObjectId(req.params.batchId)) return res.status(400).json({ message: 'Invalid batch id' });
        const schedule = await findSlots({ batchId: req.params.batchId });
        res.json(schedule.map(shape).sort(sortSlots));
    } catch (err) {
        console.error('Batch Schedule Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a slot (Admin)
router.post('/', auth, roleAuth('admin'), async (req, res) => {
    try {
        const body = {
            batchId: req.body.batchId,
            day: req.body.day,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            subjectId: req.body.subjectId,
            teacherId: req.body.teacherId || undefined,
            room: req.body.room || undefined,
        };
        const error = await validateSlot(body);
        if (error) return res.status(400).json({ message: error });

        const conflict = await findConflict(body);
        if (conflict) return res.status(409).json({ message: conflictMessage(conflict, body) });

        const slot = await Schedule.create(body);
        const populated = await findSlots({ _id: slot._id });
        res.status(201).json(shape(populated[0]));
    } catch (err) {
        console.error('Schedule Create Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a slot (Admin)
router.put('/:id', auth, roleAuth('admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid schedule id' });
        const slot = await Schedule.findById(req.params.id);
        if (!slot) return res.status(404).json({ message: 'Schedule slot not found' });

        const body = {
            batchId: req.body.batchId !== undefined ? req.body.batchId : slot.batchId,
            day: req.body.day !== undefined ? req.body.day : slot.day,
            startTime: req.body.startTime !== undefined ? req.body.startTime : slot.startTime,
            endTime: req.body.endTime !== undefined ? req.body.endTime : slot.endTime,
            subjectId: req.body.subjectId !== undefined ? req.body.subjectId : slot.subjectId,
            teacherId: req.body.teacherId !== undefined ? (req.body.teacherId || undefined) : slot.teacherId,
            room: req.body.room !== undefined ? (req.body.room || undefined) : slot.room,
        };
        // Legacy 'hh:mm AM' times are tolerated only if not being changed
        const error = await validateSlot(body, { strict: req.body.startTime !== undefined || req.body.endTime !== undefined });
        if (error) return res.status(400).json({ message: error });

        const conflict = await findConflict(body, slot._id);
        if (conflict) return res.status(409).json({ message: conflictMessage(conflict, body) });

        slot.set(body);
        if (!body.teacherId) slot.teacherId = undefined;
        if (!body.room) slot.room = undefined;
        await slot.save();
        const populated = await findSlots({ _id: slot._id });
        res.json(shape(populated[0]));
    } catch (err) {
        console.error('Schedule Update Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a slot (Admin)
router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid schedule id' });
        const slot = await Schedule.findByIdAndDelete(req.params.id);
        if (!slot) return res.status(404).json({ message: 'Schedule slot not found' });
        res.json({ message: 'Schedule slot deleted' });
    } catch (err) {
        console.error('Schedule Delete Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
