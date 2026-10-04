const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const { getAccessibleStudent, isObjectId } = require('../utils/access');

const safeUser = (u) => {
  if (!u) return u;
  const o = u.toObject ? u.toObject() : { ...u };
  delete o.password;
  delete o.resetToken;
  delete o.resetTokenExpiry;
  return o;
};

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, roleAuth('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('studentId', 'name classId batchId');

    const teachers = await Teacher.find()
      .populate('subjects', 'name')
      .populate('batches', 'name')
      .populate('classes', 'name');

    // Merge teacher data into users
    const combined = users.map(u => {
      const userObj = u.toObject();
      if (u.role === 'teacher') {
        const profile = teachers.find(t => t.userId.toString() === u._id.toString());
        if (profile) {
          userObj.teacherProfile = profile;
          // Flatten for easier frontend access if needed
          userObj.subjects = profile.subjects.map(s => s.name).join(', ');
          userObj.classes = profile.classes.map(c => c.name).join(', ');
          userObj.batches = profile.batches.map(b => b.name).join(', ');
          userObj.teacherId = profile._id;
        }
      }
      return userObj;
    });

    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', auth, roleAuth('admin'), async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ message: 'name, email, phone, password and role are required' });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, phone, password: hashedPassword, role });
    await user.save();

    if (role === 'student') {
      const student = new Student({ userId: user._id, name, classId: req.body.classId, batchId: req.body.batchId });
      await student.save();
    } else if (role === 'teacher') {
      const teacher = new Teacher({ userId: user._id, subjects: req.body.subjects, batches: req.body.batches });
      await teacher.save();
    }

    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
// (admin) - only whitelisted fields (name, email, phone, role); password is hashed
router.put('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, phone, role, password } = req.body;
    if (name !== undefined && name !== '') user.name = name;
    if (phone !== undefined && phone !== '') user.phone = phone;
    if (role !== undefined) {
      if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      user.role = role;
    }
    if (email !== undefined && email !== '') {
      const emailLower = String(email).trim().toLowerCase();
      if (emailLower !== user.email) {
        const exists = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
        if (exists) return res.status(400).json({ message: 'Email already exists' });
        user.email = emailLower;
      }
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(String(password), salt);
    }

    await user.save();
    res.json(safeUser(user));
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.code === 11000) return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
// Cascades Student/Teacher profile docs and unlinks parents
router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    if (req.params.id === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Student profile(s): unlink parents, then remove
    const students = await Student.find({ userId: user._id }).select('_id');
    if (students.length > 0) {
      const ids = students.map(s => s._id);
      await User.updateMany({ studentId: { $in: ids } }, { $unset: { studentId: 1 } });
      await Student.deleteMany({ _id: { $in: ids } });
    }

    // Teacher profile
    await Teacher.deleteMany({ userId: user._id });

    // Parent: unlink from any children
    await Student.updateMany({ parentId: user._id }, { $unset: { parentId: 1 } });

    await User.findByIdAndDelete(user._id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create teacher (admin only)
router.post('/teachers', auth, roleAuth('admin'), async (req, res) => {
  const { name, phone, subjects, batches, classes, password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  try {
    if (!name || !email || !phone) return res.status(400).json({ message: 'Name, email and phone are required' });
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Use provided password or generate temporary one
    const tempPassword = password || crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'teacher',
      mustChangePassword: !password // Only force change if auto-generated
    });
    await user.save();

    // Resolve Subject IDs
    let subjectIds = [];
    if (subjects) {
      const subjectNames = subjects.split(',').map(s => s.trim());
      for (const sName of subjectNames) {
        let subject = await Subject.findOne({ name: sName });
        if (!subject) {
          subject = new Subject({ name: sName });
          await subject.save();
        }
        subjectIds.push(subject._id);
      }
    }

    // Resolve Batch IDs
    let batchIds = [];
    if (batches) {
      const batchNames = batches.split(',').map(b => b.trim());
      for (const bName of batchNames) {
        let batch = await Batch.findOne({ name: bName });
        if (!batch) {
          batch = new Batch({ name: bName });
          await batch.save();
        }
        batchIds.push(batch._id);
      }
    }

    // Resolve Class IDs
    let classIds = [];
    if (classes) {
      const classNames = classes.split(',').map(c => c.trim());
      for (const cName of classNames) {
        let cls = await Class.findOne({ name: cName });
        if (!cls) {
          cls = new Class({ name: cName });
          await cls.save();
        }
        classIds.push(cls._id);
      }
    }

    const teacher = new Teacher({
      userId: user._id,
      subjects: subjectIds,
      batches: batchIds,
      classes: classIds
    });
    await teacher.save();

    // Send email/SMS with credentials
    const credentialMsg = `Your account has been created. Email: ${email}, Password: ${tempPassword}.`;
    try {
      await sendEmail(email, 'Teacher Account Created', credentialMsg);
    } catch (emailErr) {
      console.error('Failed to send teacher credential email:', emailErr);
      // Continue anyway as the account is created
    }
    sendSMS(phone, credentialMsg);

    res.json({ message: 'Teacher created successfully' });
  } catch (err) {
    console.error('Error creating teacher:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update teacher assignments (admin only)
router.put('/teachers/:id', auth, roleAuth('admin'), async (req, res) => {
  const { subjects, batches, classes } = req.body;
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // Helper to resolve IDs - accepts array of IDs or names
    const resolveIds = async (items, Model) => {
      if (!items || (Array.isArray(items) && items.length === 0)) return [];
      const arr = Array.isArray(items) ? items : items.split(',').map(i => i.trim());
      const ids = [];
      for (const item of arr) {
        // Check if item is a valid MongoDB ObjectId
        if (item.match(/^[0-9a-fA-F]{24}$/)) {
          ids.push(item); // Already an ID
        } else {
          // It's a name, find or create
          let doc = await Model.findOne({ name: item });
          if (!doc) {
            doc = new Model({ name: item });
            await doc.save();
          }
          ids.push(doc._id);
        }
      }
      return ids;
    };

    if (subjects !== undefined) {
      teacher.subjects = await resolveIds(subjects, Subject);
    }

    if (batches !== undefined) {
      teacher.batches = await resolveIds(batches, Batch);
    }

    if (classes !== undefined) {
      teacher.classes = await resolveIds(classes, Class);
    }

    await teacher.save();
    res.json({ message: 'Teacher assignments updated', teacher });
  } catch (err) {
    console.error('Error updating teacher assignments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get students for authenticated parent
router.get('/parent/students', auth, async (req, res) => {
  try {
    // Only allow parent role to access this endpoint
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent role required.' });
    }

    // Fetch the current user from DB to get the most up-to-date studentId
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Parent user not found' });

    // For parents, get their linked student using studentId from DB
    if (!user.studentId) {
      return res.status(200).json([]); // Return empty array if not linked yet, instead of error
    }

    const student = await Student.findById(user.studentId)
      .populate('userId', 'name email profilePhoto')
      .populate('classId', 'name')
      .populate('batchId', 'name');

    if (!student) {
      return res.status(404).json({ message: 'Linked student record not found' });
    }

    res.json([student]); // Return as array for consistency with frontend
  } catch (err) {
    console.error('Error fetching parent students:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all batches
router.get('/batches', async (req, res) => {
  try {
    const batches = await Batch.find();
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students (admin only) - for dropdowns etc
router.get('/students/all', auth, roleAuth('admin'), async (req, res) => {
  try {
    console.log('Fetching all students for admin dropdown...');
    const students = await Student.find()
      .populate('userId', 'email profilePhoto')
      .populate('classId', 'name')
      .populate('batchId', 'name')
      .populate('parentId', 'name email')
      .select('name fatherName totalFee classId batchId userId parentId');
    console.log(`Found ${students.length} students`);
    res.json(students);
  } catch (err) {
    console.error('Error in /students/all:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create student (admin): User(role student, mustChangePassword) + Student; emails credentials
router.post('/students', auth, roleAuth('admin'), async (req, res) => {
  const { name, phone, password, classId, batchId, fatherName, motherName, totalFee } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  try {
    if (!name || !email || !phone || !classId) {
      return res.status(400).json({ message: 'Name, email, phone and class are required' });
    }
    if (!isObjectId(String(classId)) || (batchId && !isObjectId(String(batchId)))) {
      return res.status(400).json({ message: 'Invalid class or batch id' });
    }
    const cls = await Class.findById(classId);
    if (!cls) return res.status(400).json({ message: 'Class not found' });
    if (batchId && !(await Batch.findById(batchId))) return res.status(400).json({ message: 'Batch not found' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const tempPassword = password || crypto.randomBytes(6).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(tempPassword), salt);

    const createdUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'student',
      mustChangePassword: true,
    });

    let student;
    try {
      student = await Student.create({
        userId: createdUser._id,
        name,
        fatherName,
        motherName,
        classId,
        batchId: batchId || undefined,
        totalFee: Number(totalFee) || 0,
        admissionDate: new Date(),
      });
    } catch (e) {
      await User.deleteOne({ _id: createdUser._id }); // roll back the half-created account
      throw e;
    }

    const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login';
    const msg = 'Welcome to Oasis JEE Classes, ' + name + '!\n\n' +
      'Your student account has been created.\n' +
      'Login: ' + loginUrl + '\n' +
      'Email: ' + email + '\n' +
      'Temporary password: ' + tempPassword + '\n\n' +
      'You will be asked to change your password on first login.';
    sendEmail(email, 'Your Oasis Student Account', msg).catch(e => console.error('Failed to send student credential email:', e.message));

    const populated = await Student.findById(student._id).populate('classId', 'name').populate('batchId', 'name');
    res.status(201).json({ user: safeUser(createdUser), student: populated });
  } catch (err) {
    console.error('Error creating student:', err);
    if (err.code === 11000) return res.status(400).json({ message: 'User already exists' });
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student details by userId
router.get('/students/:userId', auth, async (req, res) => {
  try {
    const found = await getAccessibleStudent(req, res, req.params.userId, { userFirst: true });
    if (!found) return;
    const student = await Student.findById(found._id)
      .populate('userId', 'name email profilePhoto')
      .populate('classId')
      .populate('batchId')
      .populate('subjects')
      .populate('parentId', 'name email');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student details by userId
router.put('/students/:userId', auth, async (req, res) => {
  try {
    const { role, id: callerId } = req.user;
    if (!isObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid user id' });
    // Only admin or the student themself may edit
    if (role !== 'admin' && !(role === 'student' && String(callerId) === String(req.params.userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const isAdmin = role === 'admin';

    let student = await Student.findOne({ userId: req.params.userId });
    if (!student && isAdmin) student = await Student.findById(req.params.userId);

    // If student doesn't exist, create one
    if (!student) {
      const owner = await User.findById(req.params.userId).select('role name');
      if (!owner || owner.role !== 'student') return res.status(404).json({ message: 'Student not found' });
      student = new Student({
        userId: req.params.userId,
        name: req.body.name || owner.name || 'Student',
        fatherName: req.body.fatherName || '',
        motherName: req.body.motherName || '',
        dob: req.body.dob || null,
        admissionDate: req.body.admissionDate || new Date(),
        classId: req.body.classId || null,
        batchId: req.body.batchId || null,
        subjects: []
      });
      await student.save();
    } else {
      // Update existing student
      // Use logic that allows empty strings to be saved if sent
      if (req.body.name !== undefined) student.name = req.body.name;
      if (req.body.fatherName !== undefined) student.fatherName = req.body.fatherName;
      if (req.body.motherName !== undefined) student.motherName = req.body.motherName;
      if (req.body.dob !== undefined) student.dob = req.body.dob;
      if (req.body.admissionDate !== undefined) student.admissionDate = req.body.admissionDate;
      // Students may pick their class/batch only while unset (onboarding); admin can always change
      if (req.body.classId !== undefined && (isAdmin || !student.classId)) student.classId = req.body.classId || null;
      if (req.body.batchId !== undefined && (isAdmin || !student.batchId)) student.batchId = req.body.batchId || null;
      if (isAdmin && req.body.totalFee !== undefined) student.totalFee = Number(req.body.totalFee) || 0;

      await student.save();
    }

    const updatedStudent = await Student.findById(student._id)
      .populate('userId', 'name email profilePhoto')
      .populate('classId')
      .populate('batchId')
      .populate('subjects')
      .populate('parentId', 'name email');
    res.json(updatedStudent);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student total fee (admin only)
router.put('/students/:userId/fee', auth, roleAuth('admin'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.params.userId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.totalFee = req.body.totalFee;
    await student.save();
    res.json(student);
  } catch (err) {
    console.error('Error updating student fee:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Link parent with student (admin only)
router.post('/link-parent', auth, roleAuth('admin'), async (req, res) => {
  const { parentId, studentId } = req.body;
  try {
    console.log('Linking Parent:', parentId, 'to Student:', studentId);

    // 1. Verify parent exists and has parent role
    const parent = await User.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(400).json({ message: 'Invalid parent user or incorrect role' });
    }

    // 2. Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student document not found' });
    }

    // 3. Update parent user with studentId
    parent.studentId = studentId;
    await parent.save();

    // 4. Update student with parentId
    student.parentId = parentId;
    await student.save();

    console.log('Successfully linked Parent and Student');

    // 5. Create Notification for the parent
    const newNotification = new Notification({
      recipient: parentId,
      title: 'Academic Profile Linked',
      message: `Profile of ${student.name} has been successfully linked to your portal. You can now track attendance and performance details.`,
      type: 'linking'
    });
    await newNotification.save();

    res.json({
      message: 'Connection established successfully',
      parent: { name: parent.name, email: parent.email },
      student: { name: student.name }
    });
  } catch (err) {
    console.error('Error linking parent:', err);
    res.status(500).json({ message: 'Internal server error while linking' });
  }
});

module.exports = router;