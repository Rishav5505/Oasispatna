const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
    watchedDuration: { type: Number, default: 0 }, // in seconds
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
