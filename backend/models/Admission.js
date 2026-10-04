const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  applicationNo: { type: String, required: true, unique: true },
  studentName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  fatherName: { type: String, trim: true },
  motherName: { type: String, trim: true },
  parentPhone: { type: String, trim: true },
  parentEmail: { type: String, lowercase: true, trim: true },
  address: { type: String, trim: true },
  schoolName: { type: String, trim: true },
  classApplying: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  courseInterest: { type: String, trim: true },
  previousMarksPct: { type: Number },
  documents: [{
    _id: false,
    kind: { type: String, enum: ['photo', 'marksheet', 'id_proof', 'other'], default: 'other' },
    url: { type: String, required: true },
  }],
  status: { type: String, enum: ['submitted', 'under_review', 'approved', 'rejected'], default: 'submitted' },
  reviewNote: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  createdStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
}, { timestamps: true });

admissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Admission', admissionSchema);
