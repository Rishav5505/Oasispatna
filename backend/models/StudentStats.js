const mongoose = require('mongoose');

const studentStatsSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  xp: { type: Number, default: 0 },
  weeklyXp: { type: Number, default: 0 },
  weekKey: { type: String, default: '' }, // IST Monday 'YYYY-MM-DD' of the week weeklyXp belongs to
  level: { type: Number, default: 1 },
  // DPP streak (IST days)
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  lastDppDate: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('StudentStats', studentStatsSchema);
