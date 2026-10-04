const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String },
  course: { type: String },
  batchTiming: { type: String },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'admitted', 'not_interested'],
    default: 'new'
  },
  notes: [{
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  followUpDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
