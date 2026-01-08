const crypto = require('crypto');
const Otp = require('../models/Otp');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function createAndSaveOtp(identifier) {
  const otp = generateOtp();
  const codeHash = hashOtp(otp);

  const query = {};
  if (typeof identifier === 'string' && identifier.includes('@')) {
    query.email = identifier.toLowerCase();
  } else {
    query.userId = identifier;
  }

  // Clear previous OTPs for this identifier
  await Otp.deleteMany(query);

  await Otp.create({ ...query, codeHash });
  return otp;
}

async function verifyOtp(identifier, otpCandidate) {
  const codeHash = hashOtp(otpCandidate);

  const query = { codeHash };
  if (typeof identifier === 'string' && identifier.includes('@')) {
    query.email = identifier.toLowerCase();
  } else {
    query.userId = identifier;
  }

  const record = await Otp.findOne(query);
  if (!record) return false;

  // Delete after verification
  await Otp.deleteMany(query);
  return true;
}

module.exports = { createAndSaveOtp, verifyOtp };
