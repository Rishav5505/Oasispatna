const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    imageUrl: { type: String },
    status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open' },
    replies: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doubt', doubtSchema);
