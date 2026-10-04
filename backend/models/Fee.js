const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  mode: { type: String, default: 'online' }, // online, Razorpay, Cash, etc.
  transactionId: { type: String },
  remarks: { type: String },
  type: { type: String }, // e.g., 'Monthly Fee', 'Admission Fee'
  status: { type: String, default: 'Paid' }, // Paid, Pending, Failed, Rejected
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
