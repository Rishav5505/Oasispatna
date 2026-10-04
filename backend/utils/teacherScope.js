// Which classes does a teacher teach? Union of Teacher.classes, classes of Teacher.batches,
// subjects assigned to the teacher (Subject.teacherId / Teacher.subjects) and their schedule batches.
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const Schedule = require('../models/Schedule');

async function getTeacherClassIds(userId) {
  const ids = new Set();
  if (!userId) return [];
  const teacher = await Teacher.findOne({ userId }).select('classes batches subjects');
  const batchIds = new Set();
  const subjectIds = [];
  if (teacher) {
    (teacher.classes || []).forEach(c => c && ids.add(String(c)));
    (teacher.batches || []).forEach(b => b && batchIds.add(String(b)));
    (teacher.subjects || []).forEach(s => s && subjectIds.push(s));
  }
  const subjects = await Subject.find({ $or: [{ teacherId: userId }, { _id: { $in: subjectIds } }] }).select('classId');
  subjects.forEach(s => s.classId && ids.add(String(s.classId)));
  const sched = await Schedule.find({ teacherId: userId }).select('batchId');
  sched.forEach(s => s.batchId && batchIds.add(String(s.batchId)));
  if (batchIds.size) {
    const batches = await Batch.find({ _id: { $in: [...batchIds] } }).select('classId');
    batches.forEach(b => b.classId && ids.add(String(b.classId)));
  }
  return [...ids];
}

// Teacher User ids teaching a class (for notifications / reviewers)
async function getClassTeacherUserIds(classId) {
  if (!classId) return [];
  const ids = new Set();
  const [teachers, subjects, batches] = await Promise.all([
    Teacher.find({ classes: classId }).select('userId'),
    Subject.find({ classId, teacherId: { $ne: null } }).select('teacherId'),
    Batch.find({ classId }).select('_id'),
  ]);
  teachers.forEach(t => t.userId && ids.add(String(t.userId)));
  subjects.forEach(s => s.teacherId && ids.add(String(s.teacherId)));
  if (batches.length) {
    const bIds = batches.map(b => b._id);
    const [tb, sched] = await Promise.all([
      Teacher.find({ batches: { $in: bIds } }).select('userId'),
      Schedule.find({ batchId: { $in: bIds }, teacherId: { $ne: null } }).select('teacherId'),
    ]);
    tb.forEach(t => t.userId && ids.add(String(t.userId)));
    sched.forEach(s => s.teacherId && ids.add(String(s.teacherId)));
  }
  return [...ids];
}

module.exports = { getTeacherClassIds, getClassTeacherUserIds };
