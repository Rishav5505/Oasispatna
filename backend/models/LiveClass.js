const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    meetingLink: { type: String, required: true }, // e.g., Zoom/Google Meet link
    dateTime: { type: Date, required: true },
    duration: { type: Number }, // in minutes
    status: { type: String, enum: ['scheduled', 'live', 'completed', 'cancelled'], default: 'scheduled' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LiveClass', liveClassSchema);
