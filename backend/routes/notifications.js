const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { notifyUser } = require('../utils/notify');

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

// Create Notification (staff only — students/parents must not be able to message arbitrary users)
router.post('/', auth, roleAuth('admin', 'teacher', 'staff'), async (req, res) => {
    try {
        const { recipient, title, message, type } = req.body;
        if (!recipient || !title || !message) return res.status(400).json({ message: 'recipient, title and message are required' });
        const notification = await notifyUser(req.io, recipient, { title, message, type });
        if (!notification) return res.status(400).json({ message: 'Could not create notification' });
        res.status(201).json(notification);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
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
