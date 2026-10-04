const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  dueDate: { type: Date, required: true },
  attachmentUrl: { type: String },
  maxMarks: { type: Number, default: 10 },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

homeworkSchema.index({ classId: 1, dueDate: -1 });

module.exports = mongoose.model('Homework', homeworkSchema);
