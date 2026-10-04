// Web push (VAPID) helper. sendPush never throws.
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com or https URL).
// If the keys are missing, a key pair is generated once per process (subscriptions made against it
// stop working after a restart), and a warning explains how to persist them.
let webpush = null;
try {
  webpush = require('web-push');
} catch (e) {
  console.warn('[push] web-push module not installed; push notifications disabled.');
}

let publicKey = null;
let configured = false;

function init() {
  if (!webpush || configured) return;
  let pub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  let priv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || '').trim() || `mailto:${process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com'}`;
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    pub = keys.publicKey;
    priv = keys.privateKey;
    console.warn(
      '[push] WARNING: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set. A temporary key pair was generated for this process,\n' +
      '[push] so browser push subscriptions will break on every restart. To fix, generate a permanent pair with\n' +
      '[push]   npx web-push generate-vapid-keys\n' +
      '[push] and add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT=mailto:<admin email> to backend/.env.'
    );
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    publicKey = pub;
    configured = true;
  } catch (e) {
    console.error('[push] Invalid VAPID configuration; push disabled:', e.message);
  }
}

init();

const getPublicKey = () => publicKey;
const isEnabled = () => configured;

/**
 * Send a push to every subscription of a user. Fire-and-forget; removes expired (404/410) subscriptions.
 * @returns {Promise<{sent:number, failed:number}>}
 */
async function sendPush(userId, { title, body, url } = {}) {
  const result = { sent: 0, failed: 0 };
  try {
    if (!configured || !userId) return result;
    const PushSubscription = require('../models/PushSubscription');
    const subs = await PushSubscription.find({ userId: userId._id || userId }).lean();
    if (!subs.length) return result;
    const payload = JSON.stringify({
      title: String(title || 'Oasis JEE Classes').slice(0, 120),
      body: String(body || '').slice(0, 400),
      url: url || '/dashboard',
      icon: '/pwa-192x192.png',
    });
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24 });
        result.sent += 1;
      } catch (err) {
        result.failed += 1;
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await PushSubscription.deleteOne({ _id: s._id }).catch(() => {});
        } else {
          console.error('[push] send failed:', err && (err.statusCode || err.message));
        }
      }
    }));
  } catch (err) {
    console.error('[push] sendPush error:', err.message);
  }
  return result;
}

module.exports = { sendPush, getPublicKey, isEnabled };
