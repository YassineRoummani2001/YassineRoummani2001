const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const sendPushNotification = require('../utils/sendPushNotification');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');



const { isValidEmail, isValidPassword, isValidName } = require('../utils/validators');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // 1. Validate input fields
        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: 'All fields are required',
                field: !name ? 'name' : !email ? 'email' : 'password'
            });
        }

        // 2. Validate name format
        if (!isValidName(name)) {
            return res.status(400).json({ 
                message: 'Name must be between 2 and 50 characters',
                field: 'name'
            });
        }

        // 3. Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                message: 'Please enter a valid email address',
                field: 'email'
            });
        }

        // 4. Validate password strength
        if (!isValidPassword(password)) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long',
                field: 'password'
            });
        }

        // 5. Check if user already exists (case-insensitive)
        const normalizedEmail = email.toLowerCase().trim();
        const userExists = await User.findOne({ email: normalizedEmail });

        if (userExists) {
            return res.status(409).json({ 
                message: 'This email is already in use',
                field: 'email',
                code: 'EMAIL_EXISTS'
            });
        }

        // 6. Generate a unique handle from name
        const baseHandle = '@' + name.toLowerCase().replace(/\s+/g, '');
        let handle = baseHandle + Math.floor(Math.random() * 1000);
        
        // Ensure handle is unique
        let handleExists = await User.findOne({ handle });
        while (handleExists) {
            handle = baseHandle + Math.floor(Math.random() * 10000);
            handleExists = await User.findOne({ handle });
        }

        // 7. Create user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            handle
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                handle: user.handle,
                coverImage: user.coverImage,
                bio: user.bio,
                pronouns: user.pronouns,
                gender: user.gender,
                links: user.links,
                phone: user.phone,
                stories: [], // New user has no stories
                following: user.following || [],
                saved: user.savedPosts || [],
                blockedUsers: user.blockedUsers || [],
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle MongoDB duplicate key error (E11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({ 
                message: field === 'email' 
                    ? 'This email is already in use' 
                    : 'This handle is already taken',
                field: field,
                code: 'DUPLICATE_KEY'
            });
        }
        
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            // Fetch active stories
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const stories = await Story.find({
                user: user._id,
                createdAt: { $gt: twentyFourHoursAgo }
            }).sort({ createdAt: 1 });

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar, // Ensure UI gets avatar
                handle: user.handle,
                coverImage: user.coverImage,
                bio: user.bio,
                pronouns: user.pronouns,
                gender: user.gender,
                links: user.links,
                phone: user.phone,
                stories: stories || [],
                following: user.following || [],
                saved: user.savedPosts || [],
                blockedUsers: user.blockedUsers || [],
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc    Get current user profile (for refreshUser)
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Fetch active stories
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stories = await Story.find({
            user: user._id,
            createdAt: { $gt: twentyFourHoursAgo }
        }).sort({ createdAt: 1 }).lean();

        res.json({
            ...user,
            stories: stories || [],
            followers: user.followers || [],
            following: user.following || [],
            sentRequests: user.sentRequests || [],
            followerRequests: user.followerRequests || [],
            saved: user.savedPosts || [],
            blockedUsers: user.blockedUsers || [],
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.bio = req.body.bio || user.bio;
            user.pronouns = req.body.pronouns || user.pronouns;
            user.gender = req.body.gender || user.gender;
            user.links = req.body.links || user.links;
            user.phone = req.body.phone || user.phone;
            user.coverImage = req.body.coverImage || user.coverImage;
            user.avatar = req.body.avatar || user.avatar;
            if (req.body.isPrivate !== undefined) {
                user.isPrivate = req.body.isPrivate;
            }
            
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                handle: updatedUser.handle,
                bio: updatedUser.bio,
                pronouns: updatedUser.pronouns,
                gender: updatedUser.gender,
                links: updatedUser.links,
                phone: updatedUser.phone,
                coverImage: updatedUser.coverImage,
                isPrivate: updatedUser.isPrivate,
                token: generateToken(updatedUser._id),
                followers: updatedUser.followers || [],
                following: updatedUser.following || [],
                saved: updatedUser.savedPosts || [],
                blockedUsers: updatedUser.blockedUsers || [],
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// @desc    Update user push token
// @route   POST /api/auth/push-token
// @access  Private
router.post('/push-token', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.expoPushToken = req.body.token;
            // platform is also sent in body if needed: req.body.platform
            await user.save();
            res.json({ message: 'Push token updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const Story = require('../models/Story');

// @desc    Add a story
// @route   POST /api/auth/stories
// @access  Private
router.post('/stories', protect, async (req, res) => {
    const { image, uri, type = 'image', content, color } = req.body;
    
    const mediaUri = uri || image;

    // Validation
    if (type === 'text') {
        if (!content) return res.status(400).json({ message: 'Content is required for text story' });
    } else {
        if (!mediaUri) return res.status(400).json({ message: 'Image/Video URI is required' });
    }

    try {
        const user = await User.findById(req.user._id);

        if (user) {
            // 1. Create Story in Story Collection
            const storyDoc = new Story({
                user: user._id,
                type,
                uri: mediaUri,
                content,
                color,
            });
            await storyDoc.save();

            // console.log(`✅ Story added for user ${user.name} to Story collection`);

            // 2. Fetch and return updated active stories list to maintain frontend compatibility
            // which expects the updated list of stories
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const stories = await Story.find({
                user: user._id,
                createdAt: { $gt: twentyFourHoursAgo }
            }).sort({ createdAt: 1 });

            res.status(201).json(stories);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error adding story:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user stories by user ID (for debugging)
// @route   GET /api/auth/user/:id/stories
// @access  Public
router.get('/user/:id/stories', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('name handle avatar');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // console.log('📖 User:', user.name);

        const stories = await Story.find({ user: user._id }).sort({ createdAt: -1 });

        // console.log('📚 Total stories:', stories.length);
        stories.forEach((story, i) => {
            /* console.log(`  Story ${i + 1}:`, {
                type: story.type,
                createdAt: story.createdAt,
                age: Math.round((Date.now() - new Date(story.createdAt)) / (1000 * 60 * 60)) + 'h'
            }); */
        });
        
        res.json({
            user: {
                _id: user._id,
                name: user.name,
                handle: user.handle,
                avatar: user.avatar
            },
            stories: stories
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ─── Helper: safe string comparison of ObjectIds ────────────────────────────
const eqId = (a, b) => a?.toString() === b?.toString();

// @desc    Follow / Unfollow / Cancel-Request a user
// @route   PUT /api/auth/follow/:userId
// @access  Private
router.put('/follow/:userId', protect, async (req, res) => {
    const followerId  = req.user._id;
    const followingId = req.params.userId;

    if (eqId(followerId, followingId)) {
        return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    try {
        const targetUser = await User.findById(followingId).lean();
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        // ── Check existing relationship ───────────────────────────────────────
        const existing = await Follow.findOne({ follower: followerId, following: followingId }).lean();

        // ── UNFOLLOW (accepted → delete) ──────────────────────────────────────
        if (existing?.status === 'accepted') {
            await Follow.deleteOne({ _id: existing._id });

            // Atomic counter decrement (never below 0)
            await Promise.all([
                User.updateOne({ _id: followingId }, { $inc: { followersCount: -1 }, $pull: { followers: followerId } }),
                User.updateOne({ _id: followerId  }, { $inc: { followingCount: -1 }, $pull: { following: followingId } }),
            ]);

            return res.json({ status: 'unfollowed' });
        }

        // ── CANCEL REQUEST (pending → delete) ─────────────────────────────────
        if (existing?.status === 'pending') {
            await Follow.deleteOne({ _id: existing._id });

            await Promise.all([
                User.updateOne({ _id: followingId }, { $pull: { followerRequests: followerId } }),
                User.updateOne({ _id: followerId  }, { $pull: { sentRequests: followingId  } }),
            ]);

            return res.json({ status: 'cancelled' });
        }

        // ── NEW FOLLOW REQUEST ────────────────────────────────────────────────
        // If the target is private, typically a request is 'pending'.
        // BUT if the target is ALREADY following us (this is a 'Follow Back'), bypass privacy and auto-accept.
        const isFollowBack = await Follow.exists({ follower: followingId, following: followerId, status: 'accepted' });
        const newStatus = (targetUser.isPrivate && !isFollowBack) ? 'pending' : 'accepted';

        try {
            await Follow.create({ follower: followerId, following: followingId, status: newStatus });
        } catch (dupErr) {
            if (dupErr.code === 11000) {
                // Race condition: another request beat us — treat as already existing
                const race = await Follow.findOne({ follower: followerId, following: followingId }).lean();
                if (race?.status === 'pending')  return res.json({ status: 'pending',  message: 'Request already sent' });
                if (race?.status === 'accepted') return res.json({ status: 'accepted', message: 'Already following' });
            }
            throw dupErr;
        }

        if (newStatus === 'pending') {
            // Add to pending arrays
            await Promise.all([
                User.updateOne({ _id: followingId }, { $addToSet: { followerRequests: followerId } }),
                User.updateOne({ _id: followerId  }, { $addToSet: { sentRequests: followingId  } }),
            ]);

            // Notify target
            await Notification.create({
                recipient: followingId,
                sender:    followerId,
                type:  'follow_request',
                text:  'sent you a follow request.',
                isRead: false,
            });
            if (targetUser.expoPushToken) {
                sendPushNotification(
                    targetUser.expoPushToken,
                    `${req.user.name} sent you a follow request.`,
                    { type: 'request', userId: followerId }
                );
            }
            return res.json({ status: 'pending' });
        }

        // Public follow → accepted immediately
        await Promise.all([
            User.updateOne({ _id: followingId }, { $inc: { followersCount: 1 }, $addToSet: { followers: followerId } }),
            User.updateOne({ _id: followerId  }, { $inc: { followingCount: 1 }, $addToSet: { following: followingId } }),
        ]);

        await Notification.create({
            recipient: followingId,
            sender:    followerId,
            type:  'follow',
            text:  'started following you.',
            isRead: false,
        });
        if (targetUser.expoPushToken) {
            sendPushNotification(
                targetUser.expoPushToken,
                `${req.user.name} started following you.`,
                { type: 'user', userId: followerId }
            );
        }

        return res.json({ status: 'accepted' });

    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get follow requests received
// @route   GET /api/auth/requests
// @access  Private
router.get('/requests', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('followerRequests', 'name handle avatar bio')
            .lean();

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user.followerRequests || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Accept a follow request
// @route   PUT /api/auth/confirm-request/:userId
// @access  Private
router.put('/confirm-request/:userId', protect, async (req, res) => {
    const currentUserId = req.user._id;
    const senderId      = req.params.userId;

    try {
        // Only process if the relationship is truly pending
        const follow = await Follow.findOneAndUpdate(
            { follower: senderId, following: currentUserId, status: 'pending' },
            { $set: { status: 'accepted' } },
            { new: true }
        );

        if (!follow) {
            return res.status(400).json({ message: 'No pending request found from this user' });
        }

        await Promise.all([
            // Target user (currentUser) gains a follower
            User.updateOne(
                { _id: currentUserId },
                { $pull: { followerRequests: senderId }, $addToSet: { followers: senderId }, $inc: { followersCount: 1 } }
            ),
            // Sender's pending request is cleared, their following grows
            User.updateOne(
                { _id: senderId },
                { $pull: { sentRequests: currentUserId }, $addToSet: { following: currentUserId }, $inc: { followingCount: 1 } }
            ),
            // ── MAGIC MUTUAL FOLLOW ──
            // The user requested that confirming a request ALSO auto-follows the sender back.
            // Bypass privacy setting: automatically make currentUserId follow senderId.
            Follow.findOneAndUpdate(
                { follower: currentUserId, following: senderId },
                { $set: { status: 'accepted' } },
                { upsert: true, new: true }
            ),
            User.updateOne(
                { _id: currentUserId },
                { $addToSet: { following: senderId }, $inc: { followingCount: 1 }, $pull: { sentRequests: senderId } }
            ),
            User.updateOne(
                { _id: senderId },
                { $addToSet: { followers: currentUserId }, $inc: { followersCount: 1 }, $pull: { followerRequests: currentUserId } }
            )
        ]);

        // Notify sender
        const [senderUser] = await Promise.all([
            User.findById(senderId).select('expoPushToken').lean(),
            Notification.create({
                recipient: senderId,
                sender:    currentUserId,
                type:  'request_accepted',
                text:  'accepted your follow request.',
                isRead: false,
            }),
        ]);

        if (senderUser?.expoPushToken) {
            sendPushNotification(
                senderUser.expoPushToken,
                `${req.user.name} accepted your follow request.`,
                { type: 'user', userId: currentUserId }
            );
        }

        res.json({ message: 'Request accepted', userId: senderId });

    } catch (error) {
        console.error('Confirm request error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reject / delete a follow request
// @route   PUT /api/auth/delete-request/:userId
// @access  Private
router.put('/delete-request/:userId', protect, async (req, res) => {
    const currentUserId = req.user._id;
    const senderId      = req.params.userId;

    try {
        // Only delete if actually pending
        const deleted = await Follow.findOneAndDelete({
            follower: senderId,
            following: currentUserId,
            status: 'pending',
        });

        if (!deleted) {
            return res.status(400).json({ message: 'No pending request found' });
        }

        // Clean up request arrays atomically
        await Promise.all([
            User.updateOne({ _id: currentUserId }, { $pull: { followerRequests: senderId     } }),
            User.updateOne({ _id: senderId      }, { $pull: { sentRequests:     currentUserId } }),
        ]);

        res.json({ message: 'Request rejected', userId: senderId });

    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get follow status between current user and target
// @route   GET /api/auth/follow-status/:userId
// @access  Private
router.get('/follow-status/:userId', protect, async (req, res) => {
    try {
        const follow = await Follow.findOne({
            follower:  req.user._id,
            following: req.params.userId,
        }).select('status').lean();

        res.json({ status: follow?.status ?? 'none' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Block a user
// @route   PUT /api/auth/block/:userId
// @access  Private
router.put('/block/:userId', protect, async (req, res) => {
    try {
        const userToBlock = await User.findById(req.params.userId);
        const currentUser = await User.findById(req.user._id);

        if (!userToBlock) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.params.userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot block yourself' });
        }

        // Add to blocked list if not already there
        if (!currentUser.blockedUsers.includes(req.params.userId)) {
            currentUser.blockedUsers.push(req.params.userId);
        }

        // Unfollow if following
        if (currentUser.following.includes(req.params.userId)) {
            currentUser.following.pull(req.params.userId);
            userToBlock.followers.pull(req.user._id);
        }

        // Remove from followers if they follow you
        if (currentUser.followers.includes(req.params.userId)) {
            currentUser.followers.pull(req.params.userId);
            userToBlock.following.pull(req.user._id);
        }

        await currentUser.save();
        await userToBlock.save();

        res.json({
            message: `Blocked ${userToBlock.name}`,
            blockedUserId: userToBlock._id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get blocked users
// @route   GET /api/auth/blocked
// @access  Private
router.get('/blocked', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('blockedUsers', 'name handle avatar');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.blockedUsers || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Unblock a user
// @route   PUT /api/auth/unblock/:userId
// @access  Private
router.put('/unblock/:userId', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);

        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userIdToUnblock = req.params.userId;

        if (currentUser.blockedUsers.includes(userIdToUnblock)) {
            currentUser.blockedUsers.pull(userIdToUnblock);
            await currentUser.save();
        }

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's followers (people who follow userId)
// @route   GET /api/auth/followers/:userId
// @access  Public
router.get('/followers/:userId', async (req, res) => {
    try {
        // Query Follow collection: follower → userId
        const follows = await Follow.find({
            following: req.params.userId,
            status: 'accepted',
        })
            .populate('follower', 'name handle avatar bio isOnline lastSeen')
            .lean();

        const followers = follows.map(f => f.follower).filter(Boolean);
        res.json(followers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's following (people userId follows)
// @route   GET /api/auth/following/:userId
// @access  Public
router.get('/following/:userId', async (req, res) => {
    try {
        // Query Follow collection: userId → following
        const follows = await Follow.find({
            follower: req.params.userId,
            status: 'accepted',
        })
            .populate('following', 'name handle avatar bio isOnline lastSeen')
            .lean();

        const following = follows.map(f => f.following).filter(Boolean);
        res.json(following);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's posts
// @route   GET /api/auth/posts/:userId
// @access  Public
router.get('/posts/:userId', async (req, res) => {
    try {
        const Post = require('../models/Post');
        
        const posts = await Post.find({ user: req.params.userId })
            .populate('user', 'name handle avatar')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user profile by ID
// @route   GET /api/auth/user/:userId
// @access  Public
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Parallel: fetch user + story + accurate follow counts from Follow collection
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [user, stories, followersCount, followingCount] = await Promise.all([
            User.findById(userId).select('-password').lean(),
            Story.find({ user: userId, createdAt: { $gt: twentyFourHoursAgo } }).sort({ createdAt: 1 }).lean(),
            Follow.countDocuments({ following: userId, status: 'accepted' }),
            Follow.countDocuments({ follower: userId,  status: 'accepted' }),
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check blocking status relative to requester
        let isBlockedByMe = false;
        let isBlockingMe  = false;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
                const requester = await User.findById(decoded.id).select('blockedUsers').lean();
                if (requester) {
                    isBlockedByMe = requester.blockedUsers?.some(id => id.toString() === userId) ?? false;
                    isBlockingMe  = user.blockedUsers?.some(id => id.toString() === decoded.id) ?? false;
                }
            } catch (_) { /* ignore jwt error */ }
        }

        res.json({
            _id:            user._id,
            name:           user.name,
            handle:         user.handle,
            avatar:         user.avatar,
            coverImage:     user.coverImage,
            bio:            user.bio,
            pronouns:       user.pronouns,
            gender:         user.gender,
            links:          user.links,
            isPrivate:      user.isPrivate,
            stories:        stories || [],
            followersCount,   // accurate: from Follow collection
            followingCount,   // accurate: from Follow collection
            following:      user.following || [],
            saved:          user.savedPosts || [],
            isBlockedByMe,
            isBlockingMe,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all users for discovery
// @route   GET /api/auth/users
// @access  Public
router.get('/users', async (req, res) => {
    try {
        const users = await User.find()
            .select('_id name handle avatar bio')
            .sort({ createdAt: -1 })
            .lean();

        // Get all follower counts in one aggregation query
        const followerCounts = await Follow.aggregate([
            { $match: { status: 'accepted' } },
            { $group: { _id: '$following', count: { $sum: 1 } } },
        ]);
        const countMap = {};
        for (const { _id, count } of followerCounts) {
            countMap[_id.toString()] = count;
        }

        const usersWithStats = users.map(user => ({
            _id:           user._id,
            name:          user.name,
            handle:        user.handle,
            avatar:        user.avatar,
            bio:           user.bio,
            followersCount: countMap[user._id.toString()] || 0,
        }));

        res.json(usersWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Global Search (Users or Hashtags)
// @route   GET /api/auth/search
// @access  Public
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ users: [], posts: [] });

    try {
        const isHashtag = q.startsWith('#');
        const query = q.startsWith('#') ? q : `#${q}`;

        let results = {
            users: [],
            posts: []
        };

        if (isHashtag) {
            // Search for posts with this hashtag (case-insensitive)
            const Post = require('../models/Post');
            results.posts = await Post.find({
                caption: { $regex: q.replace('#', ''), $options: 'i' }
            }).populate('user', 'name handle avatar');
        } else {
            // Search for users
            results.users = await User.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { handle: { $regex: q, $options: 'i' } }
                ]
            }).select('name handle avatar bio followers following').limit(20);
            
            // Also search for posts that might match the word as a hashtag
            const Post = require('../models/Post');
            results.posts = await Post.find({
                caption: { $regex: `#${q}`, $options: 'i' }
            }).populate('user', 'name handle avatar').limit(10);
        }

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's saved posts
// @route   GET /api/auth/saved
// @access  Private
router.get('/saved', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'savedPosts',
                populate: {
                    path: 'user',
                    select: 'name handle avatar'
                }
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.savedPosts || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Save/Unsave a post
// @route   PUT /api/auth/save/:postId
// @access  Private
router.put('/save/:postId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const postId = req.params.postId;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isSaved = user.savedPosts.includes(postId);

        if (isSaved) {
            // Unsave
            user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
        } else {
            // Save
            user.savedPosts.push(postId);
        }

        await user.save();

        res.json({ 
            saved: !isSaved,
            message: isSaved ? 'Post removed from saved' : 'Post saved successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's collections
// @route   GET /api/auth/collections
// @access  Private
router.get('/collections', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'collections.posts',
                populate: {
                    path: 'user',
                    select: 'name handle avatar'
                }
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.collections || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a new collection
// @route   POST /api/auth/collections
// @access  Private
router.post('/collections', protect, async (req, res) => {
    try {
        const { name, image } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if collection name exists
        if (user.collections.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            return res.status(400).json({ message: 'Collection already exists' });
        }

        user.collections.push({ name, image, posts: [] });
        await user.save();

        res.status(201).json(user.collections[user.collections.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add/Remove post from collection
// @route   PUT /api/auth/collections/:collectionId/add/:postId
// @access  Private
router.put('/collections/:collectionId/add/:postId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const collection = user.collections.id(req.params.collectionId);
        if (!collection) return res.status(404).json({ message: 'Collection not found' });

        const postId = req.params.postId;
        const isAdded = collection.posts.includes(postId);

        if (isAdded) {
            collection.posts = collection.posts.filter(id => id.toString() !== postId);
        } else {
            // Also ensure post is in savedPosts
            if (!user.savedPosts.includes(postId)) {
                user.savedPosts.push(postId);
            }
            collection.posts.push(postId);
            
            // Set cover image if not set
            if (!collection.image) {
                const Post = require('../models/Post');
                const post = await Post.findById(postId);
                if (post) collection.image = post.image || post.uri;
            }
        }

        await user.save();
        res.json({ added: !isAdded, collection });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a collection
// @route   DELETE /api/auth/collections/:collectionId
// @access  Private
router.delete('/collections/:collectionId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const collection = user.collections.id(req.params.collectionId);
        if (!collection) return res.status(404).json({ message: 'Collection not found' });

        user.collections.pull(req.params.collectionId);
        await user.save();

        res.json({ message: 'Collection deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Expo Push Token
// @route   POST /api/auth/push-token
// @access  Private
router.post('/push-token', protect, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const user = await User.findById(req.user._id);
        if (user) {
            user.expoPushToken = token;
            await user.save();
            res.json({ message: 'Push token updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
router.delete('/profile', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Import models locally to ensure availability
        const Post = require('../models/Post');
        const Story = require('../models/Story');
        const MarketItem = require('../models/MarketItem');
        const Message = require('../models/Message');
        const Chat = require('../models/Chat');
        // Notification and User are already available globally in this file

        // console.log(`Starting account deletion for ${user.email} (${userId})...`);

        // 1. Delete User Content (Parallel)
        await Promise.all([
            Post.deleteMany({ user: userId }),
            Story.deleteMany({ user: userId }),
            MarketItem.deleteMany({ user: userId }),
            Notification.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
            Message.deleteMany({ sender: userId }),
        ]);

        // 2. Remove user from Chats
        await Chat.updateMany(
            { participants: userId },
            { $pull: { participants: userId } }
        );

        // 3. Clean up relationships in other Users (Expensive but necessary)
        await User.updateMany(
            {},
            { 
                $pull: { 
                    following: userId, 
                    followers: userId, 
                    blockedUsers: userId,
                    followerRequests: userId,
                    sentRequests: userId
                } 
            }
        );

        // 4. Remove User's Interactions (Likes & Comments on other posts)
        await Post.updateMany(
            {},
            { 
                $pull: { 
                    likes: userId,
                    comments: { user: userId }
                } 
            }
        );

        // 5. Finally, Delete the User
        await User.findByIdAndDelete(userId);

        // console.log(`User ${userId} and all associated data deleted.`);

        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Search users and posts
// @route   GET /api/auth/search
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [], posts: [] });

        const Post = require('../models/Post');
        const query = q.startsWith('#') ? q : q; // Keep hashtag if present

        // Parallel Search
        const [users, posts] = await Promise.all([
            User.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { handle: { $regex: query, $options: 'i' } }
                ]
            }).select('name handle avatar followers').limit(10),
            
            Post.find({
                $or: [
                    { caption: { $regex: query, $options: 'i' } },
                    { tags: { $regex: query, $options: 'i' } }
                ]
            }).populate('user', 'name avatar handle').sort({ createdAt: -1 }).limit(20)
        ]);

        res.json({ users, posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
