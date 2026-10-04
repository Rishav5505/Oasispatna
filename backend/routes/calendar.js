const express = require('express');
const router = express.Router();

const CalendarEvent = require('../models/CalendarEvent');
const Exam = require('../models/Exam');
const OnlineTest = require('../models/OnlineTest');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { getOwnStudent, isObjectId } = require('../utils/access');
const { istDayRange } = require('../utils/time');

const TYPES = ['holiday', 'exam', 'event', 'ptm', 'other'];
const TEACHER_TYPES = ['exam', 'event'];
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(v) {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(`${v}T00:00:00+05:30`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Which classes the caller may see. Returns { all: true } for admin/staff,
 * otherwise { classIds: [...] } (may be empty: then only global events).
 */
async function visibleScope(user) {
  if (user.role === 'admin' || user.role === 'staff') return { all: true, classIds: [] };
  if (user.role === 'teacher') {
    const t = await Teacher.findOne({ userId: user.id }).select('classes');
    return { all: false, classIds: t ? t.classes.map(String) : [] };
  }
  if (user.role === 'student' || user.role === 'parent') {
    const s = await getOwnStudent(user);
    return { all: false, classIds: s && s.classId ? [String(s.classId)] : [], student: s };
  }
  return { all: false, classIds: [] };
}

const eventOut = (e) => ({ ...(e.toObject ? e.toObject() : e), source: 'event' });

async function collect(user, from, to, { classId } = {}) {
  const scope = await visibleScope(user);
  let classIds = scope.classIds;
  if (classId && isObjectId(String(classId))) {
    if (!scope.all && !classIds.includes(String(classId))) classIds = [];
    else classIds = [String(classId)];
  }
  const restrictClasses = !scope.all || !!classId;

  // Calendar events overlapping [from, to]
  const overlap = {
    startDate: { $lte: to },
    $or: [{ endDate: { $gte: from } }, { endDate: null, startDate: { $gte: from } }],
  };
  const evFilter = { $and: [overlap] };
  if (restrictClasses) {
    evFilter.$and.push({ $or: [{ classIds: { $size: 0 } }, { classIds: { $exists: false } }, { classIds: { $in: classIds } }] });
  }
  const events = await CalendarEvent.find(evFilter).populate('classIds', 'name').populate('createdBy', 'name role').sort({ startDate: 1 });

  // Read-only: exams and online tests
  const classFilter = restrictClasses ? { classId: { $in: classIds } } : {};
  const skipClassItems = restrictClasses && classIds.length === 0;
  const [exams, tests] = skipClassItems ? [[], []] : await Promise.all([
    Exam.find({ ...classFilter, date: { $gte: from, $lte: to } }).populate('classId', 'name').select('name type classId date isPublished'),
    OnlineTest.find({
      ...classFilter,
      startTime: { $gte: from, $lte: to },
      ...(user.role === 'student' || user.role === 'parent' ? { status: { $ne: 'draft' } } : {}),
      ...(scope.student && scope.student.batchId
        ? { $or: [{ batchId: null }, { batchId: { $exists: false } }, { batchId: scope.student.batchId }] }
        : {}),
    }).populate('classId', 'name').select('title classId startTime endTime duration status'),
  ]);

  const items = [
    ...events.map(eventOut),
    ...exams.map(x => ({
      _id: x._id,
      title: x.name,
      description: `${x.type ? x.type[0].toUpperCase() + x.type.slice(1) : ''} exam`.trim(),
      type: 'exam',
      startDate: x.date,
      endDate: x.date,
      allDay: true,
      classIds: x.classId ? [x.classId] : [],
      source: 'exam',
      readOnly: true,
    })),
    ...tests.map(t => ({
      _id: t._id,
      title: t.title,
      description: 'Online test',
      type: 'exam',
      startDate: t.startTime,
      endDate: t.endTime || new Date(new Date(t.startTime).getTime() + (t.duration || 0) * 60000),
      allDay: false,
      classIds: t.classId ? [t.classId] : [],
      source: 'test',
      readOnly: true,
    })),
  ];
  items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return items;
}

// GET /calendar?from=&to=&classId=
router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const from = parseDate(req.query.from) || new Date(now.getTime() - 31 * DAY_MS);
    let to = parseDate(req.query.to) || new Date(now.getTime() + 92 * DAY_MS);
    if (req.query.to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) to = new Date(to.getTime() + DAY_MS - 1); // inclusive day
    if (to < from) return res.status(400).json({ message: '`to` must be after `from`' });
    if (to - from > 400 * DAY_MS) return res.status(400).json({ message: 'Range too large (max ~13 months)' });
    res.json(await collect(req.user, from, to, { classId: req.query.classId }));
  } catch (err) {
    console.error('Error fetching calendar:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /calendar/upcoming?limit=5&type=holiday
router.get('/upcoming', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
    const from = istDayRange().start;
    const to = new Date(from.getTime() + 366 * DAY_MS);
    let items = await collect(req.user, from, to);
    if (req.query.type && TYPES.includes(req.query.type)) items = items.filter(i => i.type === req.query.type);
    res.json(items.slice(0, limit));
  } catch (err) {
    console.error('Error fetching upcoming events:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate + apply body to an event doc. Returns an error string or null.
async function applyBody(req, ev, isNew) {
  const b = req.body || {};
  const isTeacher = req.user.role === 'teacher';
  if (isNew || b.title !== undefined) {
    const title = String(b.title || '').trim();
    if (!title) return 'title is required';
    ev.title = title.slice(0, 200);
  }
  if (b.description !== undefined) ev.description = String(b.description || '').slice(0, 2000);
  if (isNew || b.type !== undefined) {
    const type = b.type || 'event';
    if (!TYPES.includes(type)) return 'Invalid type';
    if (isTeacher && !TEACHER_TYPES.includes(type)) return 'Teachers can only create exam or event entries';
    ev.type = type;
  }
  if (isNew || b.startDate !== undefined) {
    const s = parseDate(b.startDate);
    if (!s) return 'Valid startDate is required';
    ev.startDate = s;
  }
  if (b.endDate !== undefined) {
    if (b.endDate === null || b.endDate === '') ev.endDate = undefined;
    else {
      const e = parseDate(b.endDate);
      if (!e) return 'Invalid endDate';
      ev.endDate = e;
    }
  }
  if (ev.endDate && ev.endDate < ev.startDate) return 'endDate must be after startDate';
  if (b.allDay !== undefined) ev.allDay = b.allDay === true || b.allDay === 'true';
  if (b.color !== undefined) ev.color = b.color ? String(b.color).slice(0, 30) : undefined;
  if (isNew || b.classIds !== undefined) {
    const raw = Array.isArray(b.classIds) ? b.classIds : (b.classIds ? [b.classIds] : []);
    if (raw.some(id => !isObjectId(String(id)))) return 'Invalid classIds';
    const ids = [...new Set(raw.map(String))];
    if (ids.length && (await Class.countDocuments({ _id: { $in: ids } })) !== ids.length) return 'Class not found';
    if (isTeacher) {
      const t = await Teacher.findOne({ userId: req.user.id }).select('classes');
      const mine = t ? t.classes.map(String) : [];
      if (ids.length === 0) return 'Teachers must choose at least one of their classes';
      if (ids.some(id => !mine.includes(id))) return 'You can only add events for your own classes';
    }
    ev.classIds = ids;
  }
  return null;
}

router.post('/', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const ev = new CalendarEvent({ createdBy: req.user.id });
    const error = await applyBody(req, ev, true);
    if (error) return res.status(error.startsWith('You can only') || error.startsWith('Teachers can only') ? 403 : 400).json({ message: error });
    await ev.save();
    const populated = await CalendarEvent.findById(ev._id).populate('classIds', 'name').populate('createdBy', 'name role');
    res.status(201).json(eventOut(populated));
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

async function loadEditable(req, res) {
  if (!isObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid event id' });
    return null;
  }
  const ev = await CalendarEvent.findById(req.params.id);
  if (!ev) {
    res.status(404).json({ message: 'Event not found' });
    return null;
  }
  if (req.user.role !== 'admin' && String(ev.createdBy) !== String(req.user.id)) {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }
  return ev;
}

router.put('/:id', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const ev = await loadEditable(req, res);
    if (!ev) return;
    const error = await applyBody(req, ev, false);
    if (error) return res.status(error.startsWith('You can only') || error.startsWith('Teachers can only') ? 403 : 400).json({ message: error });
    await ev.save();
    const populated = await CalendarEvent.findById(ev._id).populate('classIds', 'name').populate('createdBy', 'name role');
    res.json(eventOut(populated));
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const ev = await loadEditable(req, res);
    if (!ev) return;
    await ev.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
