const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 }, // wrong guesses so far
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // expires after 5 minutes
});

module.exports = mongoose.model('Otp', OtpSchema);
