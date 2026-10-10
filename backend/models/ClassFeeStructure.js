const mongoose = require('mongoose');

// Standard fee + installment schedule for a class; copied into each student's FeePlan when applied.
const classFeeStructureSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, unique: true },
  totalFee: { type: Number, required: true, min: 0 },
  gstPercent: { type: Number, default: 0, min: 0, max: 100 },
  installments: [{
    label: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
  }],
  note: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ClassFeeStructure', classFeeStructureSchema);
