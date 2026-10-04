const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  label: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['due', 'paid', 'overdue'], default: 'due' },
  paidAmount: { type: Number, default: 0 }, // amount allocated so far (partial payments)
  paidFeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee' },
  paidOn: { type: Date },
});

const feePlanSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  totalFee: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  installments: [installmentSchema],
  gstPercent: { type: Number, default: 0, min: 0, max: 100 },
  allocatedFeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fee' }], // fees already allocated (idempotency)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FeePlan', feePlanSchema);
