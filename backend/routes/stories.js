const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Story = require('../models/Story');
const { protect } = require('../middleware/auth');

// @desc    Get stories from followed users
// @route   GET /api/stories
// @access  Private
// @desc    Get stories from followed users
// @route   GET /api/stories
// @access  Private
// @desc    Get current user's archive (expired stories > 24h)
// @route   GET /api/stories/mine
router.get('/mine', protect, async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stories = await Story.find({ 
            user: req.user._id,
            createdAt: { $lt: twentyFourHoursAgo }
        })
        .sort({ createdAt: -1 });
        res.json(stories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/', protect, async (req, res) => {
    try {
        console.log('📖 Fetching stories for user:', req.user._id);
        
        // Use the User collection (embedded stories) to ensure we get ALL stories 
        // (both legacy ones only in User array AND new ones which are in both)
        const users = await User.find({ 
            "stories.0": { $exists: true },
            _id: { $in: req.user.following }
        })
        .select('name handle avatar stories isLive')
        .sort({ 'stories.createdAt': -1 });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Filter out expired stories and users with no active stories
        const activeStoriesUsers = users.map(user => {
            const activeStories = user.stories.filter(story => 
                new Date(story.createdAt) > twentyFourHoursAgo
            );
            return {
                _id: user._id,
                name: user.name,
                handle: user.handle,
                avatar: user.avatar,
                isLive: user.isLive,
                stories: activeStories
            };
        }).filter(user => user.stories.length > 0);

        console.log(`✅ Returning ${activeStoriesUsers.length} users with active stories`);
        res.json(activeStoriesUsers);
    } catch (err) {
        console.error('❌ Error fetching stories:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/stories - Create a new story
router.post('/', async (req, res) => {
    try {
        const { userId, type, uri } = req.body;
        
        const story = new Story({
            user: userId,
            type,
            uri,
            // expiresAt is automatically set to 24h from now by Schema default
        });

        await story.save();

        // Also add to User's stories array for the feed
        await User.findByIdAndUpdate(userId, {
            $push: { 
                stories: {
                    _id: story._id,
                    type,
                    uri,
                    createdAt: story.createdAt,
                    views: []
                }
            }
        });

        res.status(201).json(story);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Mark story as viewed
// @route   POST /api/stories/view
router.post('/view', protect, async (req, res) => {
    const { storyUserId, storyId } = req.body;
    try {
        await User.updateOne(
            { _id: storyUserId, "stories._id": storyId },
            { $addToSet: { "stories.$.views": req.user._id } }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error marking story view:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get viewers of a specific story (My Story)
// @route   GET /api/stories/my-story/:storyId/viewers
router.get('/my-story/:storyId/viewers', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('stories').populate({
            path: 'stories.views',
            select: 'name handle avatar'
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const story = user.stories.id(req.params.storyId);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        res.json(story.views || []);
    } catch (err) {
        console.error('Error fetching story viewers:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
