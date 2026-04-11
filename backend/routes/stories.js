const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Story = require('../models/Story');
const { protect } = require('../middleware/auth');

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

// @desc    Get stories from followed users (Feed)
// @route   GET /api/stories
router.get('/', protect, async (req, res) => {
    try {
        // console.log('📖 Fetching stories for user:', req.user._id);
        
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch active stories from followed users
        const stories = await Story.find({
            user: { $in: req.user.following },
            createdAt: { $gt: twentyFourHoursAgo }
        })
        .populate('user', 'name handle avatar isLive') // Populate user details
        .sort({ createdAt: 1 }); // Chronological order

        // Group stories by user
        const usersMap = new Map();

        for (const story of stories) {
            if (!story.user) continue; // Skip if user not found (deleted?)

            const userId = story.user._id.toString();
            
            if (!usersMap.has(userId)) {
                usersMap.set(userId, {
                    _id: story.user._id,
                    name: story.user.name,
                    handle: story.user.handle,
                    avatar: story.user.avatar,
                    isLive: story.user.isLive,
                    stories: []
                });
            }
            
            // Add story to user's list (remove user object from story to avoid circular/redundant data if needed, but keeping it is fine)
            // We clone the story object or just push it. 
            // The frontend expects the story object.
            usersMap.get(userId).stories.push(story);
        }

        const activeStoriesUsers = Array.from(usersMap.values());

        // console.log(`✅ Returning ${activeStoriesUsers.length} users with active stories`);
        res.json(activeStoriesUsers);
    } catch (err) {
        console.error('❌ Error fetching stories:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create a new story
// @route   POST /api/stories
router.post('/', protect, async (req, res) => {
    try {
        const { userId, type, uri, content, color } = req.body;
        
        // console.log('📝 Creating story for user:', userId);

        const story = new Story({
            user: userId,
            type,
            uri,
            content,
            color
            // expiresAt is automatically set to 24h from now by Schema default
        });

        await story.save();
        
        // NO LONGER adding to User's embedded stories array
        
        res.status(201).json(story);
    } catch (err) {
        console.error('❌ Error creating story:', err);
        res.status(400).json({ message: err.message });
    }
});

// @desc    Mark story as viewed
// @route   POST /api/stories/view
router.post('/view', protect, async (req, res) => {
    const { storyUserId, storyId } = req.body;
    try {
        const story = await Story.findByIdAndUpdate(
            storyId, 
            { $addToSet: { viewers: req.user._id } },
            { new: true } // Return updated doc
        );
        res.status(200).json({ success: true, views: story ? story.viewers.length : 0 });
    } catch (err) {
        console.error('Error marking story view:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get viewers of a specific story (My Story)
// @route   GET /api/stories/my-story/:storyId/viewers
router.get('/my-story/:storyId/viewers', protect, async (req, res) => {
    try {
        const story = await Story.findOne({ _id: req.params.storyId, user: req.user._id })
            .populate('viewers', 'name handle avatar');
            
        if (!story) return res.status(404).json({ message: 'Story not found' });

        res.json(story.viewers || []);
    } catch (err) {
        console.error('Error fetching story viewers:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get likers of a specific story (My Story)
// @route   GET /api/stories/my-story/:storyId/likers
router.get('/my-story/:storyId/likers', protect, async (req, res) => {
    try {
        const story = await Story.findOne({ _id: req.params.storyId, user: req.user._id })
            .populate('likes', 'name handle avatar');

        if (!story) return res.status(404).json({ message: 'Story not found' });

        res.json(story.likes || []);
    } catch (err) {
        console.error('Error fetching story likers:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Delete story
// @route   DELETE /api/stories/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const storyId = req.params.id;
        
        const story = await Story.findById(storyId);
        
        if (!story) {
            return res.status(404).json({ message: 'Story not found' });
        }

        if (story.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Story.deleteOne({ _id: storyId });

        res.status(200).json({ success: true, message: 'Story deleted' });
    } catch (err) {
        console.error('Error deleting story:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Toggle like on story
// @route   POST /api/stories/like
router.post('/like', protect, async (req, res) => {
    try {
        const { storyId } = req.body;
        const userId = req.user._id;

        const story = await Story.findById(storyId);
        
        if (!story) {
            return res.status(404).json({ message: 'Story not found' });
        }
        
        let shouldLike = true;
        
        if (story.likes.includes(userId)) {
            shouldLike = false;
            // Unlike
            await Story.findByIdAndUpdate(storyId, { $pull: { likes: userId } });
        } else {
            // Like
            await Story.findByIdAndUpdate(storyId, { $addToSet: { likes: userId } });
        }

        res.status(200).json({ success: true, liked: shouldLike });
    } catch (err) {
        console.error('Error toggling story like:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
