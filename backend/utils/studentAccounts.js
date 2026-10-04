// Shared student/parent account creation used by POST /users/students, POST /users/students/bulk
// and POST /admissions/:id/approve.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Batch = require('../models/Batch');
const sendEmail = require('./sendEmail');
const { isObjectId } = require('./access');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const loginUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login';
const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

async function hash(pw) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(pw), salt);
}

/**
 * Create User(role student, mustChangePassword) + Student. Validates class/batch and email uniqueness.
 * Throws HttpError(400) on validation problems. Emails credentials unless sendEmails === false.
 * @returns {Promise<{user, student, tempPassword}>}
 */
async function createStudentAccount(data, { sendEmails = true, cls: knownClass } = {}) {
  const { name, phone, password, classId, batchId, fatherName, motherName, totalFee, dob } = data;
  const email = normEmail(data.email);
  if (!name || !email || !phone || !classId) throw new HttpError(400, 'Name, email, phone and class are required');
  if (!isObjectId(String(classId)) || (batchId && !isObjectId(String(batchId)))) {
    throw new HttpError(400, 'Invalid class or batch id');
  }
  const cls = knownClass || await Class.findById(classId);
  if (!cls) throw new HttpError(400, 'Class not found');
  if (batchId && !(await Batch.findById(batchId))) throw new HttpError(400, 'Batch not found');

  const existing = await User.findOne({ email });
  if (existing) throw new HttpError(400, 'User already exists');

  const tempPassword = password || crypto.randomBytes(6).toString('hex');
  let user;
  try {
    user = await User.create({
      name,
      email,
      phone,
      password: await hash(tempPassword),
      role: 'student',
      mustChangePassword: true,
    });
  } catch (e) {
    if (e.code === 11000) throw new HttpError(400, 'User already exists');
    throw e;
  }

  let student;
  try {
    student = await Student.create({
      userId: user._id,
      name,
      fatherName,
      motherName,
      dob: dob || undefined,
      classId,
      batchId: batchId || undefined,
      totalFee: Number(totalFee) || 0,
      admissionDate: new Date(),
    });
  } catch (e) {
    await User.deleteOne({ _id: user._id }); // roll back the half-created account
    throw e;
  }

  if (sendEmails) {
    const msg = 'Welcome to Oasis JEE Classes, ' + name + '!\n\n' +
      'Your student account has been created.\n' +
      'Login: ' + loginUrl() + '\n' +
      'Email: ' + email + '\n' +
      'Temporary password: ' + tempPassword + '\n\n' +
      'You will be asked to change your password on first login.';
    sendEmail(email, 'Your Oasis Student Account', msg).catch(e => console.error('Failed to send student credential email:', e.message));
  }

  return { user, student, tempPassword };
}

/**
 * Create (or reuse an existing parent-role user with that email) and link it to the student.
 * Returns null if the email belongs to a non-parent account.
 * @returns {Promise<{parent, created:boolean, tempPassword?}|null>}
 */
async function createOrLinkParent({ name, email, phone, student, sendEmails = true }) {
  const parentEmail = normEmail(email);
  if (!parentEmail || !student) return null;
  let parent = await User.findOne({ email: parentEmail });
  let created = false;
  let tempPassword;
  if (parent && parent.role !== 'parent') return null;
  if (!parent) {
    tempPassword = crypto.randomBytes(6).toString('hex');
    parent = await User.create({
      name: name || `Parent of ${student.name}`,
      email: parentEmail,
      phone: phone || 'N/A',
      password: await hash(tempPassword),
      role: 'parent',
      mustChangePassword: true,
      studentId: student._id,
    });
    created = true;
  } else if (!parent.studentId) {
    parent.studentId = student._id;
    await parent.save();
  }
  await Student.updateOne({ _id: student._id }, { $set: { parentId: parent._id } });

  if (sendEmails) {
    const msg = created
      ? `Dear ${parent.name},\n\nA parent account has been created for you to track ${student.name}'s progress at Oasis JEE Classes.\n` +
        `Login: ${loginUrl()}\nEmail: ${parentEmail}\nTemporary password: ${tempPassword}\n\nYou will be asked to change your password on first login.`
      : `Dear ${parent.name},\n\n${student.name}'s profile has been linked to your Oasis parent account.\nLogin: ${loginUrl()}`;
    sendEmail(parentEmail, created ? 'Your Oasis Parent Account' : 'Student Linked to Your Account', msg)
      .catch(e => console.error('Failed to send parent credential email:', e.message));
  }
  return { parent, created, tempPassword };
}

module.exports = { HttpError, createStudentAccount, createOrLinkParent, normEmail };
