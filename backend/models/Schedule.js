const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
    startTime: { type: String, required: true }, // 'HH:mm' (24h); legacy rows may be "09:00 AM"
    endTime: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    room: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
