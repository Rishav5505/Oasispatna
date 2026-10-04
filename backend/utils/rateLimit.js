// Tiny in-memory fixed-window rate limiter (single process; no external deps).
const buckets = new Map();

function hit(key, windowMs, max) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return { allowed: b.count <= max, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

// Periodically drop expired buckets
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60 * 1000).unref();

// Uses req.ip (honours Express 'trust proxy' if set via TRUST_PROXY); never trusts raw X-Forwarded-For
const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

/**
 * Express middleware factory.
 * @param {object} opts { name, windowMs, max, message, keyFn(req) }
 */
function rateLimit({ name = 'default', windowMs = 60 * 1000, max = 30, message = 'Too many requests. Please try again later.', keyFn } = {}) {
  return (req, res, next) => {
    const key = `${name}:${keyFn ? keyFn(req) : clientIp(req)}`;
    const { allowed, retryAfter } = hit(key, windowMs, max);
    if (!allowed) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message });
    }
    next();
  };
}

/**
 * One-shot cooldown check, e.g. "one OTP per email per 60s".
 * Returns 0 when allowed (and starts the cooldown), otherwise seconds remaining.
 */
function cooldown(key, ms) {
  const { allowed, retryAfter } = hit(`cooldown:${key}`, ms, 1);
  return allowed ? 0 : retryAfter;
}

module.exports = { rateLimit, cooldown, clientIp };
