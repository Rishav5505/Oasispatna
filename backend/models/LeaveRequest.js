const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // requester
  role: { type: String, required: true }, // requester's role: student | parent | teacher
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // for student/parent requests
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  reason: { type: String, required: true },
  type: { type: String, enum: ['sick', 'personal', 'other'], default: 'other' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String, default: '' },
  reviewedAt: { type: Date },
}, { timestamps: true });

leaveRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
