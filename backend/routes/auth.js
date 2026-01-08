const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Student = require('../models/Student');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const auth = require('../middleware/auth');
const { createAndSaveOtp, verifyOtp } = require('../utils/otp');
const sendOtp = require('../utils/sendOtp');
const multer = require('multer');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Register
router.post('/register', upload.single('profilePhoto'), async (req, res) => {
  const { name, email, phone, address, password, role } = req.body;
  try {
    // Security: Block admin and teacher roles from public signup
    if (role === 'admin' || role === 'teacher') {
      return res.status(403).json({ message: 'You are not allowed to register for this role' });
    }

    // Allow only student and parent roles
    if (role !== 'student' && role !== 'parent') {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email: email.toLowerCase(), phone, address, password: hashedPassword, role, profilePhoto: req.file ? `/uploads/${req.file.filename}` : undefined });
    await user.save();
    console.log('User registered:', email.toLowerCase(), role);

    // If role is student, create a corresponding Student record
    if (role === 'student') {
      const student = new Student({
        userId: user._id,
        name: user.name,
        fatherName: req.body.fatherName,
        motherName: req.body.motherName,
        dob: req.body.dob,
        admissionDate: new Date(),
      });
      await student.save();
      console.log('Student record created for user:', user._id);
    }
    console.log('User registered:', email.toLowerCase(), role);

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.log('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found for email:', email.toLowerCase());
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Login attempt for', email.toLowerCase(), 'password match:', isMatch);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    if (user.role === 'parent' && user.studentId) {
      payload.user.studentId = user.studentId;
    }

    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: user.id });
      if (teacher) {
        payload.user.batchIds = teacher.batches;
        payload.user.subjectIds = teacher.subjects;
        payload.user.classIds = teacher.classes;
      }
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    res.json({ token, role: user.role, mustChangePassword: user.mustChangePassword, id: user.id });
  } catch (err) {
    console.log('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    sendEmail(email, 'Password Reset', `Click here to reset: ${resetUrl}`);

    res.json({ message: 'Reset email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid token' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send OTP (to email or phone)
router.post('/send-otp', async (req, res) => {
  const { email, phone } = req.body;
  try {
    let user;
    if (email) user = await User.findOne({ email });
    if (!user && phone) user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = await createAndSaveOtp(user._id);

    if (email) {
      await sendOtp(user.email, otp);
    }
    if (phone) {
      sendSMS(user.phone, `Your OTP is: ${otp}. It expires in 5 minutes.`);
    }

    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, phone, otp } = req.body;
  try {
    let user;
    if (email) user = await User.findOne({ email });
    if (!user && phone) user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await verifyOtp(user._id, otp);
    if (!ok) return res.status(400).json({ message: 'Invalid or expired OTP' });

    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password (for first login or general)
router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If mustChangePassword, skip current password check
    if (!user.mustChangePassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/me', auth, upload.single('profilePhoto'), async (req, res) => {
  try {
    console.log('Updating user profile for userId:', req.user.id);
    console.log('User data received:', req.body);
    console.log('File received:', req.file);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, email, address } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    // Handle email update with uniqueness check
    if (email) {
      const emailLower = email.toLowerCase();
      if (emailLower !== user.email) {
        const existingUser = await User.findOne({ email: emailLower });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already exists' });
        }
        user.email = emailLower;
      }
    }

    if (req.file) {
      user.profilePhoto = `/uploads/${req.file.filename}`;
      console.log('Profile photo saved:', user.profilePhoto);
    }

    await user.save();
    console.log('User updated successfully:', user._id);
    res.json({ message: 'Profile updated', user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error('Error updating user profile:', err);

    // Handle specific MongoDB errors
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;