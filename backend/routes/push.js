const express = require('express');
const router = express.Router();

const PushSubscription = require('../models/PushSubscription');
const auth = require('../middleware/auth');
const { getPublicKey, isEnabled, sendPush } = require('../utils/push');
const { rateLimit } = require('../utils/rateLimit');

const testLimiter = rateLimit({ name: 'push-test', windowMs: 60 * 1000, max: 5, keyFn: (req) => (req.user ? req.user.id : req.ip) });

// Public VAPID key for the browser's pushManager.subscribe()
router.get('/public-key', (req, res) => {
  const publicKey = getPublicKey();
  if (!publicKey) return res.status(503).json({ message: 'Push notifications are not available' });
  res.json({ publicKey });
});

// { subscription: { endpoint, keys: { p256dh, auth } } }
router.post('/subscribe', auth, async (req, res) => {
  try {
    const sub = (req.body && (req.body.subscription || req.body)) || {};
    const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint.trim() : '';
    const keys = sub.keys || {};
    if (!/^https:\/\//i.test(endpoint) || endpoint.length > 2000 || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
      return res.status(400).json({ message: 'Invalid push subscription' });
    }
    const doc = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { userId: req.user.id, keys: { p256dh: keys.p256dh, auth: keys.auth }, userAgent: String(req.get('user-agent') || '').slice(0, 300) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'Subscribed', id: doc._id });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// { endpoint }
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const endpoint = req.body && typeof req.body.endpoint === 'string' ? req.body.endpoint.trim() : '';
    if (!endpoint) return res.status(400).json({ message: 'endpoint is required' });
    const r = await PushSubscription.deleteOne({ endpoint, userId: req.user.id });
    res.json({ message: 'Unsubscribed', removed: r.deletedCount || 0 });
  } catch (err) {
    console.error('Error removing push subscription:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a test push to every device of the caller
router.post('/test', auth, testLimiter, async (req, res) => {
  try {
    if (!isEnabled()) return res.status(503).json({ message: 'Push notifications are not configured on the server' });
    const count = await PushSubscription.countDocuments({ userId: req.user.id });
    if (!count) return res.status(404).json({ message: 'No push subscription found for this account. Enable notifications first.' });
    const result = await sendPush(req.user.id, { title: 'Oasis JEE Classes', body: 'Push notifications are working!', url: '/dashboard' });
    res.json({ message: result.sent ? 'Test notification sent' : 'Could not deliver the test notification', ...result });
  } catch (err) {
    console.error('Error sending test push:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
