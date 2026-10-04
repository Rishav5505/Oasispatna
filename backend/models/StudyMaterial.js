const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }, // optional: limits visibility to a class
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // optional: limits visibility to a batch
  category: { type: String, enum: ['notes', 'formula', 'pyq', 'other'], default: 'notes' },
  fileUrl: { type: String, required: true }, // Web path, e.g. /uploads/<file>
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
