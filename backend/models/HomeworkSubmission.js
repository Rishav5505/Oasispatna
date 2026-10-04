const mongoose = require('mongoose');

const homeworkSubmissionSchema = new mongoose.Schema({
  homeworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  fileUrl: { type: String },
  text: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'late', 'graded', 'returned'], default: 'submitted' },
  marks: { type: Number },
  remark: { type: String },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },
}, { timestamps: true });

homeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('HomeworkSubmission', homeworkSubmissionSchema);
