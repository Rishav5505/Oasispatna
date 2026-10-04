const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // exactly 2
  participantsKey: { type: String, required: true, unique: true }, // sorted ids joined by ':'
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date },
  unread: { type: Map, of: Number, default: {} }, // { <userId>: n }
}, { timestamps: true });

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
