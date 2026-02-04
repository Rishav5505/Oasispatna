const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Unit Test 1
  type: { type: String, enum: ['unit', 'monthly', 'final'], required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  date: { type: Date, required: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);