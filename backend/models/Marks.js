const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  marks: { type: Number, required: true },
  maxMarks: { type: Number, default: 100 },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  remarks: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Marks', marksSchema);