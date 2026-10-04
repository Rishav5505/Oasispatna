const mongoose = require('mongoose');

const questionBankItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['mcq', 'numerical'], default: 'mcq' },
  questionText: { type: String, required: true },
  options: [{ type: String }], // 4 options for MCQ
  correctOption: { type: Number }, // 0-3 (MCQ)
  correctAnswer: { type: Number }, // numerical
  solution: { type: String, default: '' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  chapter: { type: String, default: '', trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags: [{ type: String }],
  marks: { type: Number, default: 4 },
  negativeMarks: { type: Number, default: 1 },
  source: { type: String, enum: ['manual', 'ai', 'pyq'], default: 'manual' },
  year: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

questionBankItemSchema.index({ subjectId: 1, classId: 1, chapter: 1 });

module.exports = mongoose.model('QuestionBankItem', questionBankItemSchema);
