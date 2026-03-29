const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Public
router.get('/:id', async (req, res) => {
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

// @desc    Toggle follow/unfollow a user
// @route   PUT /api/users/:id/follow
// @access  Private
router.put('/:id/follow', protect, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if (!userToFollow) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Can't follow yourself
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const isFollowing = currentUser.following.includes(req.params.id);

        if (isFollowing) {
            // Unfollow
            currentUser.following.pull(req.params.id);
            userToFollow.followers.pull(req.user._id);
        } else {
            // Follow
            currentUser.following.push(req.params.id);
            userToFollow.followers.push(req.user._id);
        }

        await currentUser.save();
        await userToFollow.save();

        res.json({
            following: !isFollowing,
            followersCount: userToFollow.followers.length,
            followingCount: currentUser.following.length
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get all/suggested users
// @route   GET /api/users/all
// @access  Public
router.get('/all', async (req, res) => {
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
// @access  Public
router.get('/search/:query', async (req, res) => {
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

module.exports = router;
