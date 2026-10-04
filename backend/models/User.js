const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String },
  profilePhoto: { type: String }, // URL to photo
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student', 'parent'], required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // For parent role only
  mustChangePassword: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  // Daily activity streak (IST calendar days), updated by GET /auth/me
  streak: {
    current: { type: Number, default: 0 },
    best: { type: Number, default: 0 },
    lastActiveDate: { type: String }, // 'YYYY-MM-DD' (IST)
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // If password already appears to be a bcrypt hash, skip re-hashing
  if (typeof this.password === 'string' && this.password.startsWith('$2')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
