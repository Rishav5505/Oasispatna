const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineTest', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId },
        selectedOption: { type: Number },
        isCorrect: { type: Boolean }
    }],
    score: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestResult', testResultSchema);
