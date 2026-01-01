const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Create or Update Note
router.post('/', protect, async (req, res) => {
    try {
        const { content, music } = req.body;
        
        // Validation length
        if (content && content.length > 60) {
            return res.status(400).json({ message: "Note too long (max 60 chars)" });
        }

        // Check if user already has a note, update it, otherwise create
        let note = await Note.findOne({ user: req.user._id });

        if (note) {
            note.content = content;
            note.music = music;
            note.createdAt = Date.now(); // Reset expiry
            await note.save();
        } else {
            note = await Note.create({
                user: req.user._id,
                content,
                music
            });
        }
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Notes (Friends + Self)
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const following = user.following || []; // Ensure array
        
        const notes = await Note.find({
            user: { $in: [...following, req.user._id] }
        }).populate('user', 'name avatar username');
        
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
