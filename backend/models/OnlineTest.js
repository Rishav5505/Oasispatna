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
        type: { type: String, enum: ['mcq', 'numerical'], default: 'mcq' },
        options: [{ type: String }],
        // Index 0-3 for MCQ questions
        correctOption: { type: Number, required: function () { return this.type !== 'numerical'; } },
        // Numeric answer for 'numerical' questions (tolerance ±0.01)
        correctAnswer: { type: Number },
        marks: { type: Number, default: 1 },
        // Optional per-question negative marks (falls back to test-level negativeMarks)
        negativeMarks: { type: Number },
        solution: { type: String },
        chapter: { type: String },
        bankItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBankItem' }
    }],
    // Full mock tests (e.g. JEE Main): sections reference question indexes
    isMock: { type: Boolean, default: false },
    pattern: { type: String, enum: ['custom', 'jee_main'], default: 'custom' },
    sections: [{
        name: { type: String, required: true },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        questionIndexes: [{ type: Number }]
    }],
    duration: { type: Number, required: true }, // in minutes
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number },
    negativeMarks: { type: Number, default: 0 }, // marks deducted per wrong answer
    startTime: { type: Date },
    endTime: { type: Date },
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OnlineTest', onlineTestSchema);
