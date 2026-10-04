const mongoose = require('mongoose');

const chapterProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
}, { timestamps: true });

chapterProgressSchema.index({ studentId: 1, chapterId: 1 }, { unique: true });

module.exports = mongoose.model('ChapterProgress', chapterProgressSchema);
