const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  monthlySalary: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);