const express = require('express');
const Notice = require('../models/Notice');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const User = require('../models/User');
const Notification = require('../models/Notification');
const router = express.Router();

const sendEmail = require('../utils/sendEmail');

// Create notice (admin)
router.post('/', auth, roleAuth('admin'), async (req, res) => {
  const { title, content, targetRoles, sendEmail: broadcastEmail } = req.body;
  try {
    const notice = new Notice({
      title,
      content,
      createdBy: req.user.id,
      targetRoles,
    });
    await notice.save();

    console.log('Publishing notice for roles:', targetRoles);

    // Broadcast notification to target users
    if (targetRoles && targetRoles.length > 0) {
      const users = await User.find({ role: { $in: targetRoles } });
      console.log(`Found ${users.length} users for target roles: ${targetRoles}`);

      const notifications = users.map(user => ({
        recipient: user._id,
        title: `New Notice: ${title}`,
        message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        type: 'general',
        read: false
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`Successfully sent ${notifications.length} notifications.`);
      }

      // Send Emails if requested
      if (broadcastEmail) {
        console.log('Initiating bulk email broadcast...');
        const emailPromises = users
          .filter(u => u.email)
          .map(u => sendEmail(u.email, `Oasis: ${title}`, content).catch(e => console.error(`Failed to send email to ${u.email}:`, e.message)));

        // We trigger it but don't strictly block the response on all emails finishing
        // although for small groups it's fine.
        Promise.all(emailPromises);
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
    console.log(`Fetching notices for role: ${role}`);
    // Use $in to be safe if targetRoles is an array
    const notices = await Notice.find({ targetRoles: { $in: [role] } }).sort({ createdAt: -1 });
    console.log(`Found ${notices.length} notices for role ${role}`);
    res.json(notices);
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all notices (admin)
router.get('/all', auth, roleAuth('admin'), async (req, res) => {
  try {
    const notices = await Notice.find().populate('createdBy');
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;