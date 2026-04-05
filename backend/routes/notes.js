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
        })
        .populate('user', 'name avatar username')
        .populate('likes.user', 'name avatar username');
        
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle Like Note
router.post('/:id/like', protect, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });

        const likeIndex = note.likes.findIndex(l => l.user.toString() === req.user._id.toString());
        if (likeIndex > -1) {
            note.likes.splice(likeIndex, 1);
        } else {
            note.likes.push({ user: req.user._id });
        }

        const savedNote = await note.save();
        const populatedNote = await Note.findById(savedNote._id)
            .populate('user', 'name avatar username')
            .populate('likes.user', 'name avatar username');

        res.json(populatedNote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
