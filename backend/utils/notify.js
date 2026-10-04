const Notification = require('../models/Notification');
const { sendPush } = require('./push');

// Fire-and-forget web push mirror of a notification (never throws, never awaited)
function pushFor(n) {
  try {
    sendPush(n.recipient, { title: n.title, body: n.message, url: n.url || '/dashboard' }).catch(() => {});
  } catch (e) { /* ignore */ }
}

/**
 * Create a DB notification for a user and push it over socket.io to their room (and as web push).
 * Never throws (notifications must not break the main request).
 */
async function notifyUser(io, recipient, { title, message, type = 'general', url }) {
  try {
    if (!recipient) return null;
    const recipientId = recipient._id || recipient;
    const notification = await Notification.create({ recipient: recipientId, title, message, type });
    if (io) io.to(String(recipientId)).emit('notification', notification);
    pushFor({ recipient: recipientId, title, message, url });
    return notification;
  } catch (err) {
    console.error('notifyUser error:', err.message);
    return null;
  }
}

/**
 * Bulk version: docs = [{ recipient, title, message, type }]
 */
async function notifyMany(io, docs) {
  try {
    const clean = (docs || []).filter(d => d && d.recipient).map(d => ({ ...d, recipient: d.recipient._id || d.recipient }));
    if (clean.length === 0) return [];
    const saved = await Notification.insertMany(clean.map(({ url, ...rest }) => rest));
    if (io) saved.forEach(n => io.to(String(n.recipient)).emit('notification', n));
    clean.forEach(pushFor);
    return saved;
  } catch (err) {
    console.error('notifyMany error:', err.message);
    return [];
  }
}

module.exports = { notifyUser, notifyMany };
