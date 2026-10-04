const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  minutes: { type: Number, required: true, min: 1, max: 180 },
  startedAt: { type: Date },
  endedAt: { type: Date, default: Date.now },
  date: { type: String }, // 'YYYY-MM-DD' (IST) of endedAt
  mode: { type: String, enum: ['pomodoro', 'free'], default: 'free' },
  xpEarned: { type: Number, default: 0 },
}, { timestamps: true });

studySessionSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
