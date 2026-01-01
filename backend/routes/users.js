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

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create teacher (admin only)
router.post('/teachers', auth, roleAuth('admin'), async (req, res) => {
  const { name, email, phone, subjects, batches, classes, password } = req.body;
  try {
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
    sendEmail(email, 'Teacher Account Created', credentialMsg);
    sendSMS(phone, credentialMsg);

    res.json({ message: 'Teacher created successfully', password: tempPassword });
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
      .populate('userId', 'email')
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

// Get student details by userId
router.get('/students/:userId', auth, async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.params.userId })
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
    console.log('Updating student for userId:', req.params.userId);
    console.log('Student data received:', req.body);

    let student = await Student.findOne({ userId: req.params.userId });

    // If student doesn't exist, create one
    if (!student) {
      console.log('Creating new student record...');
      student = new Student({
        userId: req.params.userId,
        name: req.body.name || '',
        fatherName: req.body.fatherName || '',
        motherName: req.body.motherName || '',
        dob: req.body.dob || null,
        admissionDate: req.body.admissionDate || new Date(),
        classId: null,
        batchId: null,
        subjects: []
      });
      await student.save();
      console.log('New student created:', student._id);
    } else {
      console.log('Updating existing student:', student._id);
      // Update existing student
      // Use logic that allows empty strings to be saved if sent
      if (req.body.name !== undefined) student.name = req.body.name;
      if (req.body.fatherName !== undefined) student.fatherName = req.body.fatherName;
      if (req.body.motherName !== undefined) student.motherName = req.body.motherName;
      if (req.body.dob !== undefined) student.dob = req.body.dob;
      if (req.body.admissionDate !== undefined) student.admissionDate = req.body.admissionDate;
      if (req.body.classId !== undefined) student.classId = req.body.classId;
      if (req.body.batchId !== undefined) student.batchId = req.body.batchId;

      await student.save();
      console.log('Student updated successfully:', student);
    }

    const updatedStudent = await Student.findOne({ userId: req.params.userId })
      .populate('classId')
      .populate('batchId')
      .populate('subjects')
      .populate('parentId', 'name email');
    console.log('Final student data:', updatedStudent);
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