const express = require('express');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const sendDemoEmail = require('../utils/sendDemoEmail');
const { rateLimit } = require('../utils/rateLimit');
const { isObjectId } = require('../utils/access');

const router = express.Router();

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'admitted', 'not_interested'];
const leadLimiter = rateLimit({ name: 'lead', windowMs: 60 * 60 * 1000, max: 10, message: 'Too many enquiries from this network. Please try again later.' });

// Submit enquiry
router.post('/', leadLimiter, async (req, res) => {
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
    const leads = await Lead.find().populate('notes.by', 'name').sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update lead status / add note / set follow-up (Admin only)
router.patch('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid lead id' });
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const { status, note, followUpDate } = req.body;

    if (status !== undefined) {
      if (!LEAD_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      lead.status = status;
    }

    if (note !== undefined && note !== null && String(note).trim()) {
      lead.notes.push({ text: String(note).trim().slice(0, 2000), at: new Date(), by: req.user.id });
    }

    if (followUpDate !== undefined) {
      if (followUpDate === null || followUpDate === '') {
        lead.followUpDate = undefined;
      } else {
        const d = new Date(followUpDate);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid followUpDate' });
        lead.followUpDate = d;
      }
    }

    await lead.save();
    const updated = await Lead.findById(lead._id).populate('notes.by', 'name');
    res.json(updated);
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete lead (Admin only)
router.delete('/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid lead id' });
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
