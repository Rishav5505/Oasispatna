const Notification = require('../models/Notification');

/**
 * Create a DB notification for a user and push it over socket.io to their room.
 * Never throws (notifications must not break the main request).
 */
async function notifyUser(io, recipient, { title, message, type = 'general' }) {
  try {
    if (!recipient) return null;
    const recipientId = recipient._id || recipient;
    const notification = await Notification.create({ recipient: recipientId, title, message, type });
    if (io) io.to(String(recipientId)).emit('notification', notification);
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
    const saved = await Notification.insertMany(clean);
    if (io) saved.forEach(n => io.to(String(n.recipient)).emit('notification', n));
    return saved;
  } catch (err) {
    console.error('notifyMany error:', err.message);
    return [];
  }
}

module.exports = { notifyUser, notifyMany };
