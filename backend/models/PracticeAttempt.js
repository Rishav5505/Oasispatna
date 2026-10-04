const mongoose = require('mongoose');

const practiceAttemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  dppId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPractice', required: true },
  date: { type: String }, // 'YYYY-MM-DD' (IST) of the DPP
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    selectedOption: { type: Number },
    numericAnswer: { type: Number },
    isCorrect: { type: Boolean },
  }],
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  timeTaken: { type: Number }, // seconds
}, { timestamps: true });

practiceAttemptSchema.index({ studentId: 1, dppId: 1 }, { unique: true });

module.exports = mongoose.model('PracticeAttempt', practiceAttemptSchema);
