const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  kind: { type: String, enum: ['question', 'material', 'note'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
}, { timestamps: true });

bookmarkSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
