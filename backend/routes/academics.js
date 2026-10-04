const express = require('express');
const Class = require('../models/Class');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Marks = require('../models/Marks');
const Exam = require('../models/Exam');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { isObjectId } = require('../utils/access');

const router = express.Router();

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameTaken = (Model, name, extra = {}, excludeId) => {
  const q = { name: new RegExp(`^${escapeRegex(String(name).trim())}$`, 'i'), ...extra };
  if (excludeId) q._id = { $ne: excludeId };
  return Model.exists(q);
};

const classFilter = (req) => {
  const { classId } = req.query;
  if (classId === undefined || classId === '') return {};
  if (!isObjectId(String(classId))) return null;
  return { classId };
};

// Validate an optional classId reference; returns error message or null
async function checkClass(classId) {
  if (!isObjectId(String(classId))) return 'Invalid classId';
  if (!(await Class.exists({ _id: classId }))) return 'Class not found';
  return null;
}

// ---------- Classes ----------

router.get('/classes', auth, async (req, res) => {
  try {
    const classes = await Class.find().sort({ name: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/classes', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
    if (await nameTaken(Class, name)) return res.status(400).json({ message: 'A class with this name already exists' });
    const cls = await Class.create({ name: String(name).trim(), description });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/classes/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const { name, description } = req.body;
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      if (await nameTaken(Class, name, {}, cls._id)) return res.status(400).json({ message: 'A class with this name already exists' });
      cls.name = String(name).trim();
    }
    if (description !== undefined) cls.description = description;
    await cls.save();
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/classes/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const [students, batches, subjects, exams] = await Promise.all([
      Student.countDocuments({ classId: cls._id }),
      Batch.countDocuments({ classId: cls._id }),
      Subject.countDocuments({ classId: cls._id }),
      Exam.countDocuments({ classId: cls._id })
    ]);
    if (students || batches || subjects || exams) {
      const parts = [];
      if (students) parts.push(`${students} student(s)`);
      if (batches) parts.push(`${batches} batch(es)`);
      if (subjects) parts.push(`${subjects} subject(s)`);
      if (exams) parts.push(`${exams} exam(s)`);
      return res.status(400).json({ message: `Cannot delete: class is in use by ${parts.join(', ')}` });
    }

    await Class.deleteOne({ _id: cls._id });
    await Teacher.updateMany({ classes: cls._id }, { $pull: { classes: cls._id } });
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Batches ----------

router.get('/batches', auth, async (req, res) => {
  try {
    const filter = classFilter(req);
    if (!filter) return res.status(400).json({ message: 'Invalid classId' });
    const batches = await Batch.find(filter).populate('classId', 'name').sort({ name: 1 }).lean();
    // Keep classId as an id; expose the class name separately
    res.json(batches.map(b => ({
      ...b,
      classId: b.classId ? b.classId._id : b.classId,
      className: b.classId ? b.classId.name : null
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/batches', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { name, classId, schedule } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
    if (!classId) return res.status(400).json({ message: 'classId is required' });
    const classErr = await checkClass(classId);
    if (classErr) return res.status(400).json({ message: classErr });
    if (await nameTaken(Batch, name, { classId })) return res.status(400).json({ message: 'A batch with this name already exists in this class' });

    const batch = await Batch.create({ name: String(name).trim(), classId, schedule });
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/batches/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const { name, classId, schedule } = req.body;
    if (classId !== undefined && classId !== null && classId !== '') {
      const classErr = await checkClass(classId);
      if (classErr) return res.status(400).json({ message: classErr });
      batch.classId = classId;
    }
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      batch.name = String(name).trim();
    }
    if (await nameTaken(Batch, batch.name, { classId: batch.classId || null }, batch._id)) {
      return res.status(400).json({ message: 'A batch with this name already exists in this class' });
    }
    if (schedule !== undefined) batch.schedule = schedule;
    await batch.save();
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/batches/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const [students, slots] = await Promise.all([
      Student.countDocuments({ batchId: batch._id }),
      Schedule.countDocuments({ batchId: batch._id })
    ]);
    if (students || slots) {
      const parts = [];
      if (students) parts.push(`${students} student(s)`);
      if (slots) parts.push(`${slots} timetable slot(s)`);
      return res.status(400).json({ message: `Cannot delete: batch is in use by ${parts.join(', ')}` });
    }

    await Batch.deleteOne({ _id: batch._id });
    await Teacher.updateMany({ batches: batch._id }, { $pull: { batches: batch._id } });
    res.json({ message: 'Batch deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Subjects ----------

router.get('/subjects', auth, async (req, res) => {
  try {
    const filter = classFilter(req);
    if (!filter) return res.status(400).json({ message: 'Invalid classId' });
    const subjects = await Subject.find(filter)
      .populate('classId', 'name')
      .populate('teacherId', 'name')
      .sort({ name: 1 })
      .lean();
    // Keep classId/teacherId as ids; expose names separately
    res.json(subjects.map(s => ({
      ...s,
      classId: s.classId ? s.classId._id : s.classId,
      className: s.classId ? s.classId.name : null,
      teacherId: s.teacherId ? s.teacherId._id : s.teacherId,
      teacherName: s.teacherId ? s.teacherId.name : null
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

async function checkTeacher(teacherId) {
  if (!isObjectId(String(teacherId))) return 'Invalid teacherId';
  const t = await User.findById(teacherId).select('role');
  if (!t || t.role !== 'teacher') return 'Teacher not found';
  return null;
}

router.post('/subjects', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { name, classId, teacherId } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
    if (!classId) return res.status(400).json({ message: 'classId is required' });
    const classErr = await checkClass(classId);
    if (classErr) return res.status(400).json({ message: classErr });
    if (teacherId) {
      const tErr = await checkTeacher(teacherId);
      if (tErr) return res.status(400).json({ message: tErr });
    }
    if (await nameTaken(Subject, name, { classId })) return res.status(400).json({ message: 'A subject with this name already exists in this class' });

    const subject = await Subject.create({ name: String(name).trim(), classId, teacherId: teacherId || undefined });
    if (teacherId) await Teacher.updateOne({ userId: teacherId }, { $addToSet: { subjects: subject._id } });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/subjects/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const { name, classId, teacherId } = req.body;
    if (classId !== undefined && classId !== null && classId !== '') {
      const classErr = await checkClass(classId);
      if (classErr) return res.status(400).json({ message: classErr });
      subject.classId = classId;
    }
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      subject.name = String(name).trim();
    }
    if (await nameTaken(Subject, subject.name, { classId: subject.classId || null }, subject._id)) {
      return res.status(400).json({ message: 'A subject with this name already exists in this class' });
    }
    if (teacherId !== undefined) {
      if (teacherId === null || teacherId === '') {
        subject.teacherId = undefined;
      } else {
        const tErr = await checkTeacher(teacherId);
        if (tErr) return res.status(400).json({ message: tErr });
        subject.teacherId = teacherId;
        await Teacher.updateOne({ userId: teacherId }, { $addToSet: { subjects: subject._id } });
      }
    }
    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/subjects/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const [students, slots, marks] = await Promise.all([
      Student.countDocuments({ subjects: subject._id }),
      Schedule.countDocuments({ subjectId: subject._id }),
      Marks.countDocuments({ subjectId: subject._id })
    ]);
    if (students || slots || marks) {
      const parts = [];
      if (students) parts.push(`${students} student(s)`);
      if (slots) parts.push(`${slots} timetable slot(s)`);
      if (marks) parts.push(`${marks} marks record(s)`);
      return res.status(400).json({ message: `Cannot delete: subject is in use by ${parts.join(', ')}` });
    }

    await Subject.deleteOne({ _id: subject._id });
    await Teacher.updateMany({ subjects: subject._id }, { $pull: { subjects: subject._id } });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
