const express = require('express');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const sendDemoEmail = require('../utils/sendDemoEmail');

const router = express.Router();

// Submit enquiry
router.post('/', async (req, res) => {
  const { name, email, phone, message, course, batchTiming } = req.body;
  try {
    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    const lead = new Lead({
      name,
      email,
      phone,
      message,
      course,
      batchTiming
    });
    await lead.save();

    // Send confirmation email
    try {
      await sendDemoEmail(email, name, course || 'JEE Coaching');
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
      // We don't return error to user if email fails, as lead is already saved
    }

    // Emit socket event for real-time update in Admin Dashboard
    if (req.io) {
      req.io.emit('new-lead', lead);
    }

    console.log('New lead submitted:', { name, email, course, batchTiming });
    res.json({ message: 'Thank you! Your demo class is booked. We will contact you soon.', success: true });
  } catch (err) {
    console.error('Error submitting lead:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Get all leads (Admin only)
router.get('/', auth, roleAuth('admin'), async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
