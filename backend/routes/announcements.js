const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect } = require('../middleware/auth');

// @desc    Get all active announcements
// @route   GET /api/announcements
router.get('/', async (req, res) => {
    try {
        const { target } = req.query;
        let query = { active: true };
        
        if (target) {
            query.target = { $in: [target, 'all'] };
        }
        
        const announcements = await Announcement.find(query).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create an announcement (Admin only - simplified for now with protect)
// @route   POST /api/announcements
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, type, target } = req.body;
        
        const announcement = new Announcement({
            title,
            content,
            type,
            target
        });
        
        const savedAnnouncement = await announcement.save();
        res.status(201).json(savedAnnouncement);
    } catch (err) {
        console.error('Error creating announcement:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
