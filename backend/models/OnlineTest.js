const mongoose = require('mongoose');

const onlineTestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    questionPaperUrl: { type: String }, // Optional: URL to uploaded PDF/Image
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    questions: [{
        questionText: { type: String }, // Not required if using question paper
        options: [{ type: String }],
        correctOption: { type: Number, required: true }, // Index 0-3
        marks: { type: Number, default: 1 }
    }],
    duration: { type: Number, required: true }, // in minutes
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number },
    startTime: { type: Date },
    endTime: { type: Date },
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OnlineTest', onlineTestSchema);
