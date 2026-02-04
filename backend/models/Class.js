const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., 10th, 11th
  description: { type: String },
  overallResultsPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);