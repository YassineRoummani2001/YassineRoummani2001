const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Get notifications for current user
router.get('/', protect, async (req, res) => {
    try {
        console.log(`[NOTIFICATIONS] Fetching for user ${req.user._id} (${req.user.name})`);
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'name handle avatar')
            .populate('post', 'image type uri thumbnail')
            .sort({ createdAt: -1 });
        console.log(`[NOTIFICATIONS] Found ${notifications.length} notifications`);
        res.json(notifications);
    } catch (err) {
        console.error(`[NOTIFICATIONS] Error:`, err.message);
        res.status(500).json({ message: err.message });
    }
});

// ⚠️ IMPORTANT: Specific routes MUST come before parameterized routes /:id
// Otherwise Express matches "unread-count" as an :id value

// Get unread count
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ 
            recipient: req.user._id, 
            isRead: false 
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark ALL notifications as read
router.put('/mark-all-read', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark a single notification as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        if (notification.recipient.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        notification.isRead = true;
        await notification.save();
        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
