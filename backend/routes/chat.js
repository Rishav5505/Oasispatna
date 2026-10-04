const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const auth = require('../middleware/auth');
const { isObjectId, sameId } = require('../utils/access');
const { uploadSingle, fileUrl, removeUpload } = require('../utils/upload');
const { notifyUser } = require('../utils/notify');
const { rateLimit } = require('../utils/rateLimit');

const sendLimiter = rateLimit({ name: 'chat-send', windowMs: 60 * 1000, max: 30, keyFn: (req) => (req.user ? req.user.id : req.ip), message: 'You are sending messages too fast' });

const keyOf = (a, b) => [String(a), String(b)].sort().join(':');
const otherOf = (conv, me) => conv.participants.find(p => String(p._id || p) !== String(me));

// ---------- Relationship helpers ----------

// Children (Student docs) of a parent user
async function childrenOf(parentUserId) {
  const parent = await User.findById(parentUserId).select('studentId');
  const or = [{ parentId: parentUserId }];
  if (parent && parent.studentId) or.push({ _id: parent.studentId });
  return Student.find({ $or: or }).select('name classId batchId parentId userId');
}

// Teacher profiles teaching a student's class or batch
function teachersForStudents(students) {
  const classIds = students.map(s => s.classId).filter(Boolean);
  const batchIds = students.map(s => s.batchId).filter(Boolean);
  if (!classIds.length && !batchIds.length) return Promise.resolve([]);
  return Teacher.find({ $or: [{ classes: { $in: classIds } }, { batches: { $in: batchIds } }] })
    .populate('userId', 'name role profilePhoto')
    .populate('subjects', 'name');
}

// Students taught by a teacher user (by class or batch)
async function studentsOfTeacher(teacherUserId) {
  const t = await Teacher.findOne({ userId: teacherUserId }).select('classes batches');
  if (!t || (!t.classes.length && !t.batches.length)) return [];
  return Student.find({ $or: [{ classId: { $in: t.classes } }, { batchId: { $in: t.batches } }] }).select('name classId batchId parentId');
}

// Parent users of a set of students -> Map(parentUserId -> { user, children: [names], studentId })
async function parentsOfStudents(students) {
  const ids = students.map(s => s._id);
  const explicit = students.map(s => s.parentId).filter(Boolean);
  const parents = await User.find({ role: 'parent', $or: [{ studentId: { $in: ids } }, { _id: { $in: explicit } }] }).select('name role profilePhoto studentId');
  const out = new Map();
  for (const p of parents) {
    const kids = students.filter(s => sameId(s.parentId, p._id) || sameId(p.studentId, s._id));
    out.set(String(p._id), { user: p, children: kids.map(k => k.name), studentId: kids[0] ? kids[0]._id : undefined });
  }
  return out;
}

const subjectText = (t) => {
  const names = (t.subjects || []).map(s => s && s.name).filter(Boolean);
  return names.length ? `${names.join(', ')} teacher` : 'Teacher';
};

/**
 * Allowed chat partners for the caller: [{ userId, name, role, subtitle, profilePhoto, studentId? }]
 */
async function contactsFor(me) {
  const out = new Map();
  const add = (u, subtitle, studentId) => {
    if (!u || sameId(u._id, me.id) || out.has(String(u._id))) return;
    out.set(String(u._id), { userId: u._id, name: u.name, role: u.role, subtitle, profilePhoto: u.profilePhoto, studentId });
  };

  if (me.role === 'admin') {
    const users = await User.find({ _id: { $ne: me.id }, role: { $in: ['teacher', 'parent', 'staff', 'student', 'admin'] } })
      .select('name role profilePhoto studentId').sort({ role: 1, name: 1 }).limit(2000);
    const teachers = await Teacher.find({ userId: { $in: users.filter(u => u.role === 'teacher').map(u => u._id) } }).populate('subjects', 'name');
    const tMap = new Map(teachers.map(t => [String(t.userId), t]));
    const kidIds = users.filter(u => u.role === 'parent' && u.studentId).map(u => u.studentId);
    const kids = await Student.find({ $or: [{ _id: { $in: kidIds } }, { parentId: { $in: users.filter(u => u.role === 'parent').map(u => u._id) } }] }).select('name parentId');
    for (const u of users) {
      let subtitle = { admin: 'Administrator', staff: 'Front office', student: 'Student' }[u.role] || '';
      if (u.role === 'teacher') subtitle = tMap.has(String(u._id)) ? subjectText(tMap.get(String(u._id))) : 'Teacher';
      if (u.role === 'parent') {
        const k = kids.find(s => sameId(s._id, u.studentId) || sameId(s.parentId, u._id));
        subtitle = k ? `Parent of ${k.name}` : 'Parent';
      }
      add(u, subtitle);
    }
    return [...out.values()];
  }

  if (me.role === 'parent') {
    const kids = await childrenOf(me.id);
    const teachers = await teachersForStudents(kids);
    for (const t of teachers) if (t.userId) add(t.userId, subjectText(t), kids[0] && kids[0]._id);
  } else if (me.role === 'teacher') {
    const students = await studentsOfTeacher(me.id);
    const parents = await parentsOfStudents(students);
    for (const { user, children, studentId } of parents.values()) add(user, `Parent of ${children.join(', ')}`, studentId);
  }
  // Everyone can reach the administrators
  const admins = await User.find({ role: 'admin' }).select('name role profilePhoto');
  admins.forEach(a => add(a, 'Administrator'));
  return [...out.values()].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role.localeCompare(b.role)));
}

// Can `me` start a conversation with `other` (User doc)? Returns { ok, studentId? }
async function canTalk(me, other) {
  if (!other || sameId(other._id, me.id)) return { ok: false };
  if (me.role === 'admin' || other.role === 'admin') return { ok: true };
  if (me.role === 'parent' && other.role === 'teacher') {
    const kids = await childrenOf(me.id);
    const teachers = await teachersForStudents(kids);
    const t = teachers.find(x => x.userId && sameId(x.userId._id, other._id));
    if (!t) return { ok: false };
    const cls = new Set(t.classes.map(String));
    const bat = new Set(t.batches.map(String));
    const kid = kids.find(k => cls.has(String(k.classId)) || bat.has(String(k.batchId))) || kids[0];
    return { ok: true, studentId: kid && kid._id };
  }
  if (me.role === 'teacher' && other.role === 'parent') {
    const students = await studentsOfTeacher(me.id);
    const parents = await parentsOfStudents(students);
    const p = parents.get(String(other._id));
    return p ? { ok: true, studentId: p.studentId } : { ok: false };
  }
  return { ok: false };
}

// ---------- Shapes ----------

const unreadFor = (conv, me) => {
  const u = conv.unread;
  if (!u) return 0;
  return (u.get ? u.get(String(me)) : u[String(me)]) || 0;
};

function convOut(conv, me) {
  const other = otherOf(conv, me);
  return {
    _id: conv._id,
    other: other && other._id
      ? { userId: other._id, name: other.name, role: other.role, profilePhoto: other.profilePhoto }
      : { userId: other || null, name: 'Unknown user', role: null },
    studentId: conv.studentId,
    lastMessage: conv.lastMessage || '',
    lastMessageAt: conv.lastMessageAt || null,
    unread: unreadFor(conv, me),
  };
}

async function loadConv(req, res) {
  if (!isObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid conversation id' });
    return null;
  }
  const conv = await Conversation.findById(req.params.id);
  if (!conv) {
    res.status(404).json({ message: 'Conversation not found' });
    return null;
  }
  if (!conv.participants.some(p => sameId(p, req.user.id))) {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }
  return conv;
}

// ---------- Routes ----------

router.get('/contacts', auth, async (req, res) => {
  try {
    res.json(await contactsFor(req.user));
  } catch (err) {
    console.error('Error fetching chat contacts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const key = `unread.${req.user.id}`;
    const agg = await Conversation.aggregate([
      { $match: { participants: new mongoose.Types.ObjectId(String(req.user.id)), [key]: { $gt: 0 } } },
      { $group: { _id: null, count: { $sum: `$${key}` } } },
    ]);
    res.json({ count: agg.length ? agg[0].count : 0 });
  } catch (err) {
    console.error('Error fetching chat unread count:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'name role profilePhoto')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(200);
    res.json(convs.map(c => convOut(c, req.user.id)));
  } catch (err) {
    console.error('Error listing conversations:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get-or-create a conversation with { userId }
router.post('/conversations', auth, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId || !isObjectId(String(userId))) return res.status(400).json({ message: 'Valid userId is required' });
    if (String(userId) === String(req.user.id)) return res.status(400).json({ message: 'You cannot chat with yourself' });
    const other = await User.findById(userId).select('name role profilePhoto');
    if (!other) return res.status(404).json({ message: 'User not found' });

    const key = keyOf(req.user.id, other._id);
    let conv = await Conversation.findOne({ participantsKey: key });
    if (!conv) {
      const allowed = await canTalk(req.user, other);
      if (!allowed.ok) return res.status(403).json({ message: 'You are not allowed to message this user' });
      try {
        conv = await Conversation.create({ participants: [req.user.id, other._id], participantsKey: key, studentId: allowed.studentId, unread: {} });
      } catch (e) {
        if (e.code !== 11000) throw e;
        conv = await Conversation.findOne({ participantsKey: key }); // created concurrently
      }
    }
    await conv.populate('participants', 'name role profilePhoto');
    res.json(convOut(conv, req.user.id));
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Messages page (chronological). ?before=<messageId|ISO date>&limit=30
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conv = await loadConv(req, res);
    if (!conv) return;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const filter = { conversationId: conv._id };
    if (req.query.before) {
      let before = null;
      if (isObjectId(String(req.query.before))) {
        const m = await Message.findById(req.query.before).select('createdAt');
        if (m) before = m.createdAt;
      } else {
        const d = new Date(req.query.before);
        if (!Number.isNaN(d.getTime())) before = d;
      }
      if (before) filter.createdAt = { $lt: before };
    }
    const msgs = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit);
    res.json(msgs.reverse());
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send { text } (multipart optional `attachment`)
router.post('/conversations/:id/messages', auth, sendLimiter, uploadSingle('attachment'), async (req, res) => {
  const cleanup = () => { if (req.file) removeUpload(fileUrl(req.file)); };
  try {
    const conv = await loadConv(req, res);
    if (!conv) return cleanup();
    const text = typeof (req.body && req.body.text) === 'string' ? req.body.text.trim().slice(0, 4000) : '';
    if (!text && !req.file) return res.status(400).json({ message: 'Message text or attachment is required' });

    const message = await Message.create({
      conversationId: conv._id,
      senderId: req.user.id,
      text,
      attachmentUrl: req.file ? fileUrl(req.file) : undefined,
    });

    const otherId = otherOf(conv, req.user.id);
    const preview = text ? text.slice(0, 200) : 'Attachment';
    await Conversation.updateOne(
      { _id: conv._id },
      { $set: { lastMessage: preview, lastMessageAt: message.createdAt, [`unread.${req.user.id}`]: 0 }, $inc: { [`unread.${otherId}`]: 1 } }
    );

    if (req.io && otherId) req.io.to(String(otherId)).emit('chat:message', { conversationId: conv._id, message });

    const sender = await User.findById(req.user.id).select('name');
    notifyUser(req.io, otherId, {
      title: `New message from ${sender ? sender.name : 'someone'}`,
      message: preview.slice(0, 140),
      type: 'general',
      url: '/dashboard?chat=' + conv._id,
    });

    res.status(201).json(message);
  } catch (err) {
    cleanup();
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/conversations/:id/read', auth, async (req, res) => {
  try {
    const conv = await loadConv(req, res);
    if (!conv) return;
    const now = new Date();
    await Promise.all([
      Conversation.updateOne({ _id: conv._id }, { $set: { [`unread.${req.user.id}`]: 0 } }),
      Message.updateMany({ conversationId: conv._id, senderId: { $ne: req.user.id }, readAt: null }, { $set: { readAt: now } }),
    ]);
    const otherId = otherOf(conv, req.user.id);
    if (req.io && otherId) req.io.to(String(otherId)).emit('chat:read', { conversationId: conv._id, readerId: req.user.id, readAt: now });
    res.json({ conversationId: conv._id, unread: 0, readAt: now });
  } catch (err) {
    console.error('Error marking conversation read:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
