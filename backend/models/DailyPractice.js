const mongoose = require('mongoose');

// One DPP per class per IST day. Questions are snapshots of bank items (answers kept server-side).
const dailyPracticeSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD' (IST)
  questions: [{
    bankItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBankItem' },
    type: { type: String, enum: ['mcq', 'numerical'], default: 'mcq' },
    questionText: { type: String },
    options: [{ type: String }],
    correctOption: { type: Number },
    correctAnswer: { type: Number },
    solution: { type: String },
    marks: { type: Number, default: 4 },
    negativeMarks: { type: Number, default: 1 },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    chapter: { type: String },
  }],
}, { timestamps: true });

dailyPracticeSchema.index({ classId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPractice', dailyPracticeSchema);
