const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // 'YYYY-MM'
  baseAmount: { type: Number, default: 0, min: 0 },
  bonus: { type: Number, default: 0, min: 0 },
  deductions: { type: Number, default: 0, min: 0 },
  netAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidOn: { type: Date },
  mode: { type: String },
  note: { type: String },
}, { timestamps: true });

salaryRecordSchema.index({ teacherId: 1, month: 1 }, { unique: true });

salaryRecordSchema.pre('save', function (next) {
  this.netAmount = Math.max(0, (this.baseAmount || 0) + (this.bonus || 0) - (this.deductions || 0));
  next();
});

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
