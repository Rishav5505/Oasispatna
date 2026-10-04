const express = require('express');
const Notice = require('../models/Notice');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const User = require('../models/User');
const { notifyMany } = require('../utils/notify');
const { isObjectId } = require('../utils/access');
const router = express.Router();

const sendEmail = require('../utils/sendEmail');

const ROLES = ['admin', 'teacher', 'student', 'parent'];
const cleanRoles = (roles) => (Array.isArray(roles) ? roles : roles ? [roles] : []).filter(r => ROLES.includes(r));

// Create notice (admin)
router.post('/', auth, roleAuth('admin'), async (req, res) => {
  const { title, content, sendEmail: broadcastEmail } = req.body;
  const targetRoles = cleanRoles(req.body.targetRoles);
  try {
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });

    const notice = new Notice({
      title,
      content,
      createdBy: req.user.id,
      targetRoles,
    });
    await notice.save();

    // Broadcast notification (DB + socket) to target users
    if (targetRoles.length > 0) {
      const users = await User.find({ role: { $in: targetRoles } }).select('_id email');

      await notifyMany(req.io, users.map(user => ({
        recipient: user._id,
        title: `New Notice: ${title}`,
        message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        type: 'general',
        read: false
      })));

      // Send Emails if requested (not awaited)
      if (broadcastEmail) {
        Promise.all(users
          .filter(u => u.email)
          .map(u => sendEmail(u.email, `Oasis: ${title}`, content).catch(e => console.error(`Failed to send email to ${u.email}:`, e.message))));
      }
    }

    res.json(notice);
  } catch (err) {
    console.error('Error creating notice:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notices for user role
router.get('/', auth, async (req, res) => {
  try {
    const role = req.user.role;
    const notices = await Notice.find({ targetRoles: { $in: [role] } }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all notices (admin)
router.get('/all', auth, roleAuth('admin'), async (req, res) => {
  try {
    const notices = await Notice.find().populate('createdBy', 'name email role').sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update notice (admin)
router.put('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notice id' });
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    const { title, content, targetRoles } = req.body;
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: 'Title cannot be empty' });
      notice.title = title;
    }
    if (content !== undefined) {
      if (!String(content).trim()) return res.status(400).json({ message: 'Content cannot be empty' });
      notice.content = content;
    }
    if (targetRoles !== undefined) notice.targetRoles = cleanRoles(targetRoles);

    await notice.save();
    res.json(notice);
  } catch (err) {
    console.error('Error updating notice:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notice (admin)
router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notice id' });
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    console.error('Error deleting notice:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
