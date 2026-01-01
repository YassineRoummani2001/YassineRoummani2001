const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification'); // Import Notification
const sendPushNotification = require('../utils/sendPushNotification'); // Import Push Util
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
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
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
                token: generateToken(updatedUser._id),
                followers: updatedUser.followers || [],
                following: updatedUser.following || [],
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

            console.log(`✅ Story added for user ${user.name} to Story collection`);

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
        
        console.log('📖 User:', user.name);

        const stories = await Story.find({ user: user._id }).sort({ createdAt: -1 });

        console.log('📚 Total stories:', stories.length);
        stories.forEach((story, i) => {
            console.log(`  Story ${i + 1}:`, {
                type: story.type,
                createdAt: story.createdAt,
                age: Math.round((Date.now() - new Date(story.createdAt)) / (1000 * 60 * 60)) + 'h'
            });
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

// @desc    Follow/Unfollow a user (Handles Requests)
// @route   PUT /api/auth/follow/:userId
// @access  Private
router.put('/follow/:userId', protect, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.userId);
        const currentUser = await User.findById(req.user._id);

        if (!userToFollow) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.params.userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        // Initialize arrays manually if they are undefined (crucial for older docs)
        if (!currentUser.following) currentUser.following = [];
        if (!currentUser.sentRequests) currentUser.sentRequests = [];
        if (!userToFollow.followers) userToFollow.followers = [];
        if (!userToFollow.followerRequests) userToFollow.followerRequests = [];

        // Helper to check existence safely
        const followingList = currentUser.following;
        const isFollowing = followingList.some(id => id.toString() === req.params.userId);
        
        const sentRequests = currentUser.sentRequests;
        const isRequested = sentRequests.some(id => id.toString() === req.params.userId);

        let responseData = {};

        if (isFollowing) {
            // Unfollow
            if (currentUser.following) {
                currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.userId);
            }
            if (userToFollow.followers) {
                userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user._id.toString());
            }
            responseData = { status: 'unfollowed', isFollowing: false };
        } else if (isRequested) {
            // Cancel Request
            if (currentUser.sentRequests) {
                currentUser.sentRequests = currentUser.sentRequests.filter(id => id.toString() !== req.params.userId);
            }
            if (userToFollow.followerRequests) {
                userToFollow.followerRequests = userToFollow.followerRequests.filter(id => id.toString() !== req.user._id.toString());
            }
            responseData = { status: 'cancelled', isFollowing: false, isRequested: false };
        } else {
            // Check privacy
            if (userToFollow.isPrivate) {
                // Send Request
                 // Ensure arrays exist
                 if (!currentUser.sentRequests) currentUser.sentRequests = [];
                 if (!userToFollow.followerRequests) userToFollow.followerRequests = [];

                 if (!currentUser.sentRequests.some(id => id.toString() === req.params.userId)) {
                    currentUser.sentRequests.push(req.params.userId);
                    userToFollow.followerRequests.push(req.user._id);
                    
                    // Create Notification for Request
                    await Notification.create({
                        recipient: userToFollow._id,
                        sender: req.user._id,
                        type: 'follow_request', 
                        text: 'sent you a follow request.',
                        isRead: false
                    });
                     // Send Push Notification
                    if (userToFollow.expoPushToken) {
                        sendPushNotification(
                            userToFollow.expoPushToken, 
                            `${req.user.name} sent you a follow request.`,
                            { type: 'request', userId: req.user._id }
                        );
                    }
                 }
                 responseData = { status: 'requested', isFollowing: false, isRequested: true };
            } else {
                // Public Follow
                // Ensure arrays exist
                if (!currentUser.following) currentUser.following = [];
                if (!userToFollow.followers) userToFollow.followers = [];

                currentUser.following.push(req.params.userId);
                userToFollow.followers.push(req.user._id);

                // Create Notification
                await Notification.create({
                    recipient: userToFollow._id,
                    sender: req.user._id,
                    type: 'follow',
                    text: 'started following you.',
                    isRead: false
                });

                // Send Push Notification
                if (userToFollow.expoPushToken) {
                    sendPushNotification(
                        userToFollow.expoPushToken, 
                        `${req.user.name} started following you.`,
                        { type: 'user', userId: req.user._id }
                    );
                }
                responseData = { status: 'followed', isFollowing: true };
            }
        }

        // Explicitly mark modified to ensure persistence of array changes
        currentUser.markModified('following');
        currentUser.markModified('sentRequests');
        userToFollow.markModified('followers');
        userToFollow.markModified('followerRequests');

        try {
            await Promise.all([currentUser.save(), userToFollow.save()]);
            res.json(responseData);
        } catch (saveError) {
            console.error('Save Error:', saveError);
            return res.status(500).json({ message: 'Database save failed', error: saveError.message });
        }
    } catch (error) {
        console.error('Follow Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get follow requests
// @route   GET /api/auth/requests
// @access  Private
router.get('/requests', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('followerRequests', 'name handle avatar bio');
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json(user.followerRequests || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Confirm follow request
// @route   PUT /api/auth/confirm-request/:userId
// @access  Private
router.put('/confirm-request/:userId', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const requestSender = await User.findById(req.params.userId);

        if (!currentUser || !requestSender) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!currentUser.followerRequests) currentUser.followerRequests = [];
        if (!currentUser.followers) currentUser.followers = [];
        if (!requestSender.sentRequests) requestSender.sentRequests = [];
        if (!requestSender.following) requestSender.following = [];

        // Check if request exists
        if (!currentUser.followerRequests.includes(req.params.userId)) {
             return res.status(400).json({ message: 'No request found from this user' });
        }

        // 1. Move from requests to followers/following (Use filter/spread instead of pull/push for safety)
        currentUser.followerRequests = currentUser.followerRequests.filter(id => id.toString() !== req.params.userId);
        if (!currentUser.followers.includes(req.params.userId)) {
             currentUser.followers.push(req.params.userId);
        }
        
        requestSender.sentRequests = requestSender.sentRequests.filter(id => id.toString() !== req.user._id.toString());
        if (!requestSender.following.includes(req.user._id)) {
             requestSender.following.push(req.user._id);
        }

        // 2. Notify Sender their request was accepted
        await Notification.create({
            recipient: requestSender._id,
            sender: req.user._id,
            type: 'request_accepted',
            text: 'accepted your follow request.',
            isRead: false
        });
        
         if (requestSender.expoPushToken) {
            sendPushNotification(
                requestSender.expoPushToken, 
                `${req.user.name} accepted your follow request.`,
                { type: 'user', userId: req.user._id }
            );
        }

        currentUser.markModified('followerRequests');
        currentUser.markModified('followers');
        requestSender.markModified('sentRequests');
        requestSender.markModified('following');

        await Promise.all([currentUser.save(), requestSender.save()]);

        res.json({ message: 'Request confirmed', userId: req.params.userId });

    } catch (error) {
        console.error("Confirm request error:", error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete/Ignore follow request
// @route   PUT /api/auth/delete-request/:userId
// @access  Private
router.put('/delete-request/:userId', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const requestSender = await User.findById(req.params.userId);

        if (!currentUser) return res.status(404).json({ message: 'User not found' });

        if (!currentUser.followerRequests) currentUser.followerRequests = [];
        currentUser.followerRequests = currentUser.followerRequests.filter(id => id.toString() !== req.params.userId);
        
        if (requestSender) {
             if (!requestSender.sentRequests) requestSender.sentRequests = [];
             requestSender.sentRequests = requestSender.sentRequests.filter(id => id.toString() !== req.user._id.toString());
             requestSender.markModified('sentRequests');
             await requestSender.save();
        }
        
        currentUser.markModified('followerRequests');
        await currentUser.save();
        res.json({ message: 'Request removed', userId: req.params.userId });

    } catch (error) {
        console.error("Delete request error:", error);
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

// @desc    Get user's followers
// @route   GET /api/auth/followers/:userId
// @access  Public
router.get('/followers/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('followers', 'name handle avatar bio isOnline lastSeen');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.followers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's following
// @route   GET /api/auth/following/:userId
// @access  Public
router.get('/following/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('following', 'name handle avatar bio isOnline lastSeen');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.following);
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
        const user = await User.findById(req.params.userId)
            .select('-password'); // Exclude password

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch active stories from the separate Story collection
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stories = await Story.find({
            user: user._id,
            createdAt: { $gt: twentyFourHoursAgo }
        }).sort({ createdAt: 1 });

        res.json({
            _id: user._id,
            name: user.name,
            handle: user.handle,
            avatar: user.avatar,
            coverImage: user.coverImage,
            bio: user.bio,
            pronouns: user.pronouns,
            gender: user.gender,
            links: user.links,
            stories: stories || [], // Return fetched stories
            followersCount: user.followers?.length || 0,
            followingCount: user.following?.length || 0,
            followers: user.followers || [],
            following: user.following || [],
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
            .select('-password')
            .limit(50)
            .sort({ createdAt: -1 });

        const usersWithStats = users.map(user => ({
            _id: user._id,
            name: user.name,
            handle: user.handle,
            avatar: user.avatar,
            bio: user.bio,
            followersCount: user.followers?.length || 0,
            followingCount: user.following?.length || 0,
        }));

        res.json(usersWithStats);
    } catch (error) {
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

        console.log(`Starting account deletion for ${user.email} (${userId})...`);

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

        console.log(`User ${userId} and all associated data deleted.`);

        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
