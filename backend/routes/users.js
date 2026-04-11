const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Get all/suggested users
// @route   GET /api/users/all
// @access  Private
router.get('/all', protect, async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .limit(20)
            .sort({ followers: -1 }); // Sort by most followers as simple "suggestions" algorithm
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Search users
// @route   GET /api/users/search/:query
// @access  Private
router.get('/search/:query', protect, async (req, res) => {
    try {
        const users = await User.find({
            $or: [
                { name: { $regex: req.params.query, $options: 'i' } },
                { handle: { $regex: req.params.query, $options: 'i' } }
            ]
        })
            .select('-password')
            .limit(20);

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('followers', 'name handle avatar')
            .populate('following', 'name handle avatar');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// NOTE: Follow / Unfollow logic is handled by the consolidated route:
//   PUT  /api/auth/follow/:userId        — follow / unfollow / cancel request
//   PUT  /api/auth/confirm-request/:id   — accept request
//   PUT  /api/auth/delete-request/:id    — reject request
//   GET  /api/auth/follow-status/:id     — get current status
// Do NOT add a follow route here to avoid conflicting logic.

module.exports = router;
