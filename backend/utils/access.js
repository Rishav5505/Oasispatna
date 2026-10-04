const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');

const isObjectId = (id) => typeof id === 'string' ? /^[0-9a-fA-F]{24}$/.test(id) : mongoose.Types.ObjectId.isValid(id);
const sameId = (a, b) => a != null && b != null && String(a._id || a) === String(b._id || b);

/**
 * Resolve a Student document from either a Student _id or a User _id.
 * Tries Student _id first, then userId (existing callers use both forms).
 */
async function resolveStudent(id) {
  if (!id || !isObjectId(String(id))) return null;
  let student = await Student.findById(id);
  if (!student) student = await Student.findOne({ userId: id });
  return student;
}

/**
 * Same as resolveStudent but tries userId first (for routes whose param is a User _id).
 */
async function resolveStudentByUserFirst(id) {
  if (!id || !isObjectId(String(id))) return null;
  let student = await Student.findOne({ userId: id });
  if (!student) student = await Student.findById(id);
  return student;
}

/**
 * Can the authenticated user (req.user) see this student's data?
 * admin/teacher: yes. student: only self. parent: only a linked child
 * (Student.parentId or the parent's User.studentId, both read from DB).
 */
async function canAccessStudent(reqUser, student) {
  if (!reqUser || !student) return false;
  if (reqUser.role === 'admin' || reqUser.role === 'teacher') return true;
  if (reqUser.role === 'student') return sameId(student.userId, reqUser.id);
  if (reqUser.role === 'parent') {
    if (sameId(student.parentId, reqUser.id)) return true;
    const parent = await User.findById(reqUser.id).select('studentId role');
    return !!(parent && parent.role === 'parent' && sameId(parent.studentId, student._id));
  }
  return false;
}

/**
 * Resolve + authorize in one step. Sends 400/404/403 itself and returns null on failure.
 * opts.userFirst: param is primarily a User _id.
 */
async function getAccessibleStudent(req, res, id, opts = {}) {
  if (!id || !isObjectId(String(id))) {
    res.status(400).json({ message: 'Invalid student id' });
    return null;
  }
  const student = opts.userFirst ? await resolveStudentByUserFirst(id) : await resolveStudent(id);
  if (!student) {
    res.status(404).json({ message: 'Student not found' });
    return null;
  }
  if (!(await canAccessStudent(req.user, student))) {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }
  return student;
}

/**
 * The Student record "belonging" to the caller: the student themself, or a parent's linked child.
 */
async function getOwnStudent(reqUser) {
  if (!reqUser) return null;
  if (reqUser.role === 'student') return Student.findOne({ userId: reqUser.id });
  if (reqUser.role === 'parent') {
    const parent = await User.findById(reqUser.id).select('studentId');
    if (parent && parent.studentId) {
      const s = await Student.findById(parent.studentId);
      if (s) return s;
    }
    return Student.findOne({ parentId: reqUser.id });
  }
  return null;
}

/**
 * All parent User docs linked to a student (via Student.parentId or User.studentId).
 */
async function getParentUsers(student) {
  if (!student) return [];
  const or = [{ role: 'parent', studentId: student._id }];
  if (student.parentId) or.push({ _id: student.parentId._id || student.parentId });
  return User.find({ $or: or }).select('name email phone role studentId');
}

/**
 * Mongo filter limiting class-scoped content to a student's class (and batch when the item has one).
 * Items with no classId / batchId stay visible to everyone.
 */
function classScopeFilter(student, { batch = true } = {}) {
  const noClass = [{ classId: { $exists: false } }, { classId: null }];
  const classCond = student && student.classId ? { $or: [...noClass, { classId: student.classId }] } : { $or: noClass };
  if (!batch) return classCond;
  const noBatch = [{ batchId: { $exists: false } }, { batchId: null }];
  const batchCond = student && student.batchId ? { $or: [...noBatch, { batchId: student.batchId }] } : { $or: noBatch };
  return { $and: [classCond, batchCond] };
}

/**
 * Is reqUser the owner (by field) of a doc, or an admin?
 */
const isOwnerOrAdmin = (reqUser, doc, field = 'teacherId') =>
  !!reqUser && (reqUser.role === 'admin' || sameId(doc && doc[field], reqUser.id));

module.exports = {
  isObjectId,
  sameId,
  resolveStudent,
  resolveStudentByUserFirst,
  canAccessStudent,
  getAccessibleStudent,
  getOwnStudent,
  getParentUsers,
  classScopeFilter,
  isOwnerOrAdmin,
};
