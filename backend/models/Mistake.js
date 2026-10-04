const mongoose = require('mongoose');

const mistakeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  source: { type: String, enum: ['test', 'dpp'], required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineTest' },
  dppId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPractice' },
  questionKey: { type: String, required: true }, // dedupe key (bank item id or test question id)
  questionRef: {
    questionId: { type: mongoose.Schema.Types.ObjectId },
    bankItemId: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String, enum: ['mcq', 'numerical'], default: 'mcq' },
    questionText: { type: String },
    options: [{ type: String }],
    correctOption: { type: Number },
    correctAnswer: { type: Number },
    solution: { type: String },
    marks: { type: Number },
  },
  yourAnswer: { type: mongoose.Schema.Types.Mixed },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  chapter: { type: String, default: '' },
  status: { type: String, enum: ['open', 'mastered'], default: 'open' },
  attempts: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
}, { timestamps: true });

mistakeSchema.index({ studentId: 1, questionKey: 1 }, { unique: true });

module.exports = mongoose.model('Mistake', mistakeSchema);
