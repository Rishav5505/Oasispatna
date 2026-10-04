const mongoose = require('mongoose');

// Records that an email passed /verify-signup-otp. /register requires a record < 30 min old.
const signupVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  verifiedAt: { type: Date, default: Date.now, index: { expires: 1800 } }, // auto-removed after 30 min
});

module.exports = mongoose.model('SignupVerification', signupVerificationSchema);
