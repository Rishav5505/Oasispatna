const crypto = require('crypto');
require('dotenv').config();

// Single source of truth for the JWT signing secret.
// Never fall back to a guessable literal: if JWT_SECRET is missing we generate a
// random per-process secret (all tokens become invalid on restart) and warn loudly.
let secret = process.env.JWT_SECRET;

if (!secret || !secret.trim()) {
  secret = crypto.randomBytes(48).toString('hex');
  console.warn('\n' + '!'.repeat(72));
  console.warn('!!  WARNING: JWT_SECRET is not set in the environment (.env).');
  console.warn('!!  Using a random per-process secret. All login sessions will be');
  console.warn('!!  invalidated whenever the server restarts. Set JWT_SECRET to fix.');
  console.warn('!'.repeat(72) + '\n');
}

module.exports = secret;
