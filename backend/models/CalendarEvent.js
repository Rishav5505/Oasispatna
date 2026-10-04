const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { type: String, enum: ['holiday', 'exam', 'event', 'ptm', 'other'], default: 'event' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  allDay: { type: Boolean, default: true },
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], // empty = everyone
  color: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

calendarEventSchema.index({ startDate: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
