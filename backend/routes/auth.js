const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const sendSMS = require('../utils/sendSMS');
const auth = require('../middleware/auth');
const {
  createAndSaveOtp,
  verifyOtp,
  markSignupEmailVerified,
  isSignupEmailVerified,
  consumeSignupVerification,
} = require('../utils/otp');
const sendOtp = require('../utils/sendOtp');
const { uploadSingle, fileUrl } = require('../utils/upload');
const { rateLimit, cooldown } = require('../utils/rateLimit');
const { istDateString, addDays } = require('../utils/time');
const JWT_SECRET = require('../utils/jwtSecret');

const router = express.Router();

const TOKEN_TTL = '1d';
const OTP_COOLDOWN_MS = 60 * 1000;

// Per-IP limits on OTP-sending endpoints (in addition to per-email 60s cooldown)
const otpSendLimiter = rateLimit({ name: 'otp-send', windowMs: 15 * 60 * 1000, max: 10, message: 'Too many OTP requests. Please try again later.' });
const otpVerifyLimiter = rateLimit({ name: 'otp-verify', windowMs: 15 * 60 * 1000, max: 30, message: 'Too many attempts. Please try again later.' });
const loginLimiter = rateLimit({ name: 'login', windowMs: 15 * 60 * 1000, max: 30, message: 'Too many login attempts. Please try again later.' });

const normEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

// Returns true (and sends 429) if this email asked for an OTP in the last 60s
const emailOnCooldown = (res, email) => {
  const wait = cooldown(`otp:${email}`, OTP_COOLDOWN_MS);
  if (wait > 0) {
    res.status(429).json({ message: `Please wait ${wait} seconds before requesting another OTP` });
    return true;
  }
  return false;
};

// Register
router.post('/register', uploadSingle('profilePhoto'), async (req, res) => {
  const { name, phone, address, password, role } = req.body;
  const email = normEmail(req.body.email);
  try {
    // Security: Block admin and teacher roles from public signup
    if (role === 'admin' || role === 'teacher') {
      return res.status(403).json({ message: 'You are not allowed to register for this role' });
    }

    // Allow only student and parent roles
    if (role !== 'student' && role !== 'parent') {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, phone and password are required' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Email must have passed /verify-signup-otp within the last 30 minutes
    if (!(await isSignupEmailVerified(email))) {
      return res.status(400).json({ message: 'Please verify your email with the OTP before registering' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, phone, address, password: hashedPassword, role, profilePhoto: fileUrl(req.file) });
    await user.save();

    // If role is student, create a corresponding Student record
    if (role === 'student') {
      const student = new Student({
        userId: user._id,
        name: user.name,
        fatherName: req.body.fatherName,
        motherName: req.body.motherName,
        dob: req.body.dob || undefined,
        admissionDate: new Date(),
      });
      await student.save();
    }
    await consumeSignupVerification(email);
    console.log('User registered:', email, role);

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

    res.json({ token });
  } catch (err) {
    console.log('Registration error:', err);
    if (err.code === 11000) return res.status(400).json({ message: 'User already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  const email = normEmail(req.body.email);
  try {
    if (!email || !password) return res.status(400).json({ message: 'Invalid credentials' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
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
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

    res.json({ token, role: user.role, mustChangePassword: user.mustChangePassword, id: user.id, profilePhoto: user.profilePhoto });
  } catch (err) {
    console.log('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Send OTP (always 200 to avoid revealing which emails exist)
router.post('/forgot-password', otpSendLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  const genericResponse = { message: 'If an account exists, an OTP has been sent' };
  try {
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (emailOnCooldown(res, email)) return;

    const user = await User.findOne({ email });
    if (!user) return res.json(genericResponse);

    try {
      const otp = await createAndSaveOtp(user._id);
      await sendOtp(user.email, otp);
    } catch (e) {
      if (e.status === 429) return res.status(429).json({ message: e.message });
      throw e;
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot Password Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password with OTP
router.post('/reset-password', otpVerifyLimiter, async (req, res) => {
  const { otp, newPassword } = req.body;
  const email = normEmail(req.body.email);
  try {
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const isVerified = await verifyOtp(user._id, otp);
    if (!isVerified) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send OTP (to email or phone)
router.post('/send-otp', otpSendLimiter, async (req, res) => {
  const { phone } = req.body;
  const email = normEmail(req.body.email);
  try {
    let user;
    if (email) user = await User.findOne({ email });
    if (!user && phone) user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (emailOnCooldown(res, user.email)) return;

    let otp;
    try {
      otp = await createAndSaveOtp(user._id);
    } catch (e) {
      if (e.status === 429) return res.status(429).json({ message: e.message });
      throw e;
    }

    if (email) {
      await sendOtp(user.email, otp);
    }
    if (phone) {
      sendSMS(user.phone, `Your Oasis OTP is: ${otp}. It expires in 5 minutes.`);
    }

    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send OTP for Signup (email verification before register)
router.post('/send-signup-otp', otpSendLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'A valid email is required' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    if (emailOnCooldown(res, email)) return;

    let otp;
    try {
      otp = await createAndSaveOtp(email);
    } catch (e) {
      if (e.status === 429) return res.status(429).json({ message: e.message });
      throw e;
    }
    await sendOtp(email, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Signup OTP error:', err);
    res.status(500).json({ message: err.message || 'Error sending OTP' });
  }
});

// Verify OTP for Signup
router.post('/verify-signup-otp', otpVerifyLimiter, async (req, res) => {
  const { otp } = req.body;
  const email = normEmail(req.body.email);
  try {
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });
    const ok = await verifyOtp(email, otp);
    if (!ok) return res.status(400).json({ message: 'Invalid or expired OTP' });

    await markSignupEmailVerified(email);
    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  const { phone, otp } = req.body;
  const email = normEmail(req.body.email);
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
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If mustChangePassword, skip current password check
    if (!user.mustChangePassword) {
      const isMatch = await bcrypt.compare(currentPassword || '', user.password);
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

// Get current user profile (+ updates the daily activity streak, IST calendar days)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetToken -resetTokenExpiry');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = istDateString();
    const prev = user.streak || {};
    let streak = {
      current: prev.current || 0,
      best: prev.best || 0,
      lastActiveDate: prev.lastActiveDate || null,
    };

    if (streak.lastActiveDate !== today) {
      streak.current = streak.lastActiveDate === addDays(today, -1) ? streak.current + 1 : 1;
      streak.best = Math.max(streak.best, streak.current);
      streak.lastActiveDate = today;
      await User.updateOne({ _id: user._id }, { $set: { streak } });
    }

    const obj = user.toObject();
    obj.streak = streak;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/me', auth, uploadSingle('profilePhoto'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, email, address } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    // Handle email update with uniqueness check
    if (email) {
      const emailLower = normEmail(email);
      if (emailLower !== user.email) {
        const existingUser = await User.findOne({ email: emailLower });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already exists' });
        }
        user.email = emailLower;
      }
    }

    if (req.file) {
      user.profilePhoto = fileUrl(req.file);
    }

    await user.save();
    const out = user.toObject();
    delete out.password;
    delete out.resetToken;
    delete out.resetTokenExpiry;
    res.json({ message: 'Profile updated', user: out });
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
