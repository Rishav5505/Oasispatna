const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notifications for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create Notification (Internal/Admin)
router.post('/', auth, async (req, res) => {
    try {
        const { recipient, title, message, type } = req.body;
        const notification = new Notification({
            recipient, title, message, type
        });
        await notification.save();

        if (req.io) {
            req.io.to(recipient).emit('notification', notification);
        }

        res.status(201).json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark a notification as read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (err) {
        console.error('Error updating notification:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Error updating notifications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
