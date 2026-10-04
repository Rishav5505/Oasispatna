const crypto = require('crypto');
const Otp = require('../models/Otp');
const SignupVerification = require('../models/SignupVerification');

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const SIGNUP_VERIFICATION_TTL_MS = 30 * 60 * 1000;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString(); // 6-digit, CSPRNG
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function buildQuery(identifier) {
  if (typeof identifier === 'string' && identifier.includes('@')) return { email: identifier.trim().toLowerCase() };
  return { userId: identifier };
}

/**
 * Create and store a new OTP. Throws an Error with .status = 429 if one was issued
 * for this identifier less than 60 seconds ago.
 */
async function createAndSaveOtp(identifier) {
  const query = buildQuery(identifier);

  const existing = await Otp.findOne(query).sort({ createdAt: -1 });
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt.getTime())) / 1000);
    const err = new Error(`Please wait ${wait} seconds before requesting another OTP`);
    err.status = 429;
    throw err;
  }

  const otp = generateOtp();
  await Otp.deleteMany(query); // clear previous OTPs for this identifier
  await Otp.create({ ...query, codeHash: hashOtp(otp) });
  return otp;
}

/**
 * Verify an OTP. After MAX_ATTEMPTS wrong guesses the OTP is invalidated.
 */
async function verifyOtp(identifier, otpCandidate) {
  if (!otpCandidate) return false;
  const query = buildQuery(identifier);
  const record = await Otp.findOne(query).sort({ createdAt: -1 });
  if (!record) return false;

  // Defensive expiry check (TTL monitor only runs periodically)
  if (Date.now() - record.createdAt.getTime() > OTP_TTL_MS || (record.attempts || 0) >= MAX_ATTEMPTS) {
    await Otp.deleteMany(query);
    return false;
  }

  const a = Buffer.from(hashOtp(String(otpCandidate).trim()), 'hex');
  const b = Buffer.from(record.codeHash, 'hex');
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    const attempts = (record.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) await Otp.deleteMany(query);
    else await Otp.updateOne({ _id: record._id }, { $set: { attempts } });
    return false;
  }

  await Otp.deleteMany(query); // single-use
  return true;
}

async function markSignupEmailVerified(email) {
  const e = String(email).trim().toLowerCase();
  await SignupVerification.deleteMany({ email: e });
  await SignupVerification.create({ email: e, verifiedAt: new Date() });
}

async function isSignupEmailVerified(email) {
  if (!email) return false;
  const rec = await SignupVerification.findOne({ email: String(email).trim().toLowerCase() }).sort({ verifiedAt: -1 });
  return !!(rec && Date.now() - rec.verifiedAt.getTime() <= SIGNUP_VERIFICATION_TTL_MS);
}

async function consumeSignupVerification(email) {
  await SignupVerification.deleteMany({ email: String(email).trim().toLowerCase() });
}

module.exports = {
  createAndSaveOtp,
  verifyOtp,
  markSignupEmailVerified,
  isSignupEmailVerified,
  consumeSignupVerification,
  MAX_ATTEMPTS,
};
