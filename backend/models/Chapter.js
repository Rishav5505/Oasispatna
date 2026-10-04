const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  name: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

chapterSchema.index({ classId: 1, subjectId: 1, order: 1 });

module.exports = mongoose.model('Chapter', chapterSchema);
