const mongoose = require('mongoose');

const chapterCoverageSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  coveredOn: { type: Date, default: Date.now },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chapterCoverageSchema.index({ batchId: 1, chapterId: 1 }, { unique: true });

module.exports = mongoose.model('ChapterCoverage', chapterCoverageSchema);
