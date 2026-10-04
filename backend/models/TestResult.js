const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineTest', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId },
        selectedOption: { type: Number },
        numericAnswer: { type: Number }, // for numerical questions
        isCorrect: { type: Boolean }
    }],
    score: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    sectionScores: [{
        name: { type: String },
        score: { type: Number },
        max: { type: Number },
        correct: { type: Number },
        wrong: { type: Number }
    }],
    percentile: { type: Number }, // snapshot at submission time (recomputed live on reads)
    xpEarned: { type: Number, default: 0 },
    timeTaken: { type: Number }, // seconds (optional, sent by client)
    submittedAt: { type: Date, default: Date.now }
});

testResultSchema.index({ testId: 1, studentId: 1 });

module.exports = mongoose.model('TestResult', testResultSchema);
