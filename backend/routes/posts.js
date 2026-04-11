const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User'); // Import User model to verify user exists
const Report = require('../models/Report'); // Import Report model
const { protect } = require('../middleware/auth');
const sendPushNotification = require('../utils/sendPushNotification');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const postsRaw = await Post.find()
            .populate('user', 'name handle avatar')
            .populate('comments.user', 'name handle avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Attach latest likers manually to avoid breaking likes count
        const posts = await Promise.all(postsRaw.map(async (p) => {
            const latestLikers = await User.find({ _id: { $in: p.likes.slice(-3) } })
                .select('name avatar handle');
            return { ...p, latestLikers: latestLikers.reverse() };
        }));

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get all reels
// @route   GET /api/posts/reels
// @access  Private
router.get('/reels', protect, async (req, res) => {
    try {
        const reelsRaw = await Post.find({ type: { $in: ['reel', 'video'] } })
            .populate('user', 'name handle avatar')
            .populate('comments.user', 'name handle avatar')
            .sort({ createdAt: -1 })
            .lean();

        const reels = await Promise.all(reelsRaw.map(async (r) => {
             const latestLikers = await User.find({ _id: { $in: r.likes.slice(-3) } })
                .select('name avatar handle');
            return { ...r, latestLikers: latestLikers.reverse() };
        }));

        res.json(reels);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get all unique hashtags
// @route   GET /api/posts/all-hashtags
// @access  Private
router.get('/all-hashtags', protect, async (req, res) => {
    try {
        const posts = await Post.find({ caption: { $regex: /#/ } });
        const hashtagCounts = {};

        posts.forEach(post => {
            const matches = post.caption.match(/#[\w]+/g);
            if (matches) {
                matches.forEach(tag => {
                    const normalized = tag.toLowerCase();
                    hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1;
                });
            }
        });

        const allTags = Object.keys(hashtagCounts)
            .map(tag => ({ tag, count: hashtagCounts[tag] }))
            .sort((a, b) => b.count - a.count);

        res.json(allTags);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('user', 'name handle avatar')
            .populate('comments.user', 'name handle avatar');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { uri, caption, type } = req.body;

        if (!uri) {
            return res.status(400).json({ message: 'Image/Video URI is required' });
        }

        // Validate type if provided
        const validTypes = ['image', 'video', 'reel'];
        const postType = type && validTypes.includes(type) ? type : 'image';

        const post = await Post.create({
            user: req.user._id,
            uri,
            caption,
            type: postType,
            isMuted: !!req.body.isMuted
        });
        
        // Populate user details for the response so frontend can display immediately
        const populatedPost = await Post.findById(post._id)
            .populate('user', 'name handle avatar');
        
        res.status(201).json(populatedPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Upload a new reel with video file
// @route   POST /api/posts/upload-reel
// @access  Private
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/reels';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'reel-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: (req, file, cb) => {
        // console.log('📂 File Filter checking:', file.originalname, '(' + file.mimetype + ')');
        const allowedExts = /\.(mp4|mov|avi|mkv|wmv|flv|webm|qt)$/i;
        const isVideoMime = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream'; // Handle generic types
        const isVideoExt = allowedExts.test(path.extname(file.originalname).toLowerCase());
        
        if (isVideoMime || isVideoExt) {
            cb(null, true);
        } else {
            console.error('❌ File Filter rejected:', file.originalname, file.mimetype);
            cb(new Error('Only video files are allowed!'));
        }
    }
});

router.post('/upload-reel', protect, (req, res, next) => {
    upload.single('video')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ message: `Multer error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(400).json({ message: err.message });
        }
        // Everything went fine.
        next();
    });
}, async (req, res) => {
    // console.log('📤 Upload reel request received');
    // console.log('User:', req.user?._id);
    // console.log('File:', req.file ? 'Present' : 'Missing');
    // console.log('Body:', req.body);
    
    try {
        if (!req.file) {
            console.error('❌ No file uploaded');
            return res.status(400).json({ message: 'Video file is required' });
        }

        // console.log('✅ File received:', req.file.filename);
        
        const { caption, music, isMuted } = req.body;
        const videoPath = `/uploads/reels/${req.file.filename}`;

        // console.log('Creating post with:', { videoPath, caption, music });

        const post = await Post.create({
            user: req.user._id,
            type: 'reel',
            uri: videoPath,
            videoUri: videoPath,
            caption: caption || '',
            music: music || '',
            likes: [],
            comments: [],
            views: 0,
            shares: 0,
            isMuted: isMuted === 'true' || isMuted === true
        });

        // console.log('✅ Post created:', post._id);

        // Populate user details
        const populatedPost = await Post.findById(post._id)
            .populate('user', 'name handle avatar');

        // console.log('✅ Sending response');
        res.status(201).json(populatedPost);
    } catch (err) {
        console.error('❌ Upload reel error:', err);
        console.error('Error stack:', err.stack);
        res.status(400).json({ message: err.message });
    }
});

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check user
        if (post.user.toString() !== req.user._id.toString()) {
             return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();
        res.json({ message: 'Post removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check user
        if (post.user.toString() !== req.user._id.toString()) {
             return res.status(401).json({ message: 'User not authorized' });
        }

        post.caption = req.body.caption !== undefined ? req.body.caption : post.caption;
        await post.save();

        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const Notification = require('../models/Notification');

// ... (other codes)

// @desc    Toggle Like on a post
// @route   PUT /api/posts/:id/like
// @access  Private
router.put('/:id/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = req.user._id;
        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
            
            // Create Notification if not liking own post
            if (post.user.toString() !== userId.toString()) {
                // Check if notification already exists to avoid duplicates
                const existingNotification = await Notification.findOne({
                    recipient: post.user,
                    sender: userId,
                    type: 'like',
                    post: post._id
                });
                
                if (!existingNotification) {
                    await Notification.create({
                        recipient: post.user,
                        sender: userId,
                        type: 'like',
                        post: post._id,
                        text: 'liked your post.',
                        isRead: false
                    });

                    // Send Push Notification
                    try {
                        const recipientUser = await User.findById(post.user);
                        if (recipientUser && recipientUser.expoPushToken) {
                            const senderName = req.user.name;
                            sendPushNotification(
                                recipientUser.expoPushToken, 
                                `${senderName} liked your post.`,
                                { postId: post._id, type: 'post' }
                            );
                        }
                    } catch (pushErr) {
                        console.error('Push notification error:', pushErr);
                    }
                }
            }
        }

        await post.save();
        res.json(post.likes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Increment share count on a post
// @route   PUT /api/posts/:id/share
// @access  Private
router.put('/:id/share', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Increment shares count (or views as fallback)
        post.shares = (post.shares || 0) + 1;
        post.views = (post.views || 0) + 1;

        await post.save();
        res.json({ shares: post.shares, views: post.views });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Public
router.get('/:id/comments', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('comments.user', 'name handle avatar');
            
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post.comments || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Add a comment
// @route   POST /api/posts/:id/comment
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = {
            user: req.user._id,
            text,
            createdAt: new Date()
        };

        post.comments.push(comment);
        await post.save();
        
        // Create Notification if not commenting on own post
        if (post.user.toString() !== req.user._id.toString()) {
             await Notification.create({
                recipient: post.user,
                sender: req.user._id,
                type: 'comment',
                post: post._id,
                text: `commented: "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
                isRead: false
            });

            // Send Push Notification
            try {
                const recipientUser = await User.findById(post.user);
                if (recipientUser && recipientUser.expoPushToken) {
                    const senderName = req.user.name;
                    sendPushNotification(
                        recipientUser.expoPushToken,
                        `${senderName} commented: ${text.length > 20 ? text.substring(0, 20) + '...' : text}`,
                        { postId: post._id, type: post.type || 'post' }
                    );
                }
            } catch (pushErr) {
                console.error('Push notification error:', pushErr);
            }
        }
        
        // Populate and return updated comments
        const populatedPost = await Post.findById(req.params.id)
            .populate('comments.user', 'name handle avatar');

        res.json(populatedPost.comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Report a post
// @route   POST /api/posts/:id/report
// @access  Private
router.post('/:id/report', protect, async (req, res) => {
    try {
        const { reason } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const report = await Report.create({
            reporter: req.user._id,
            target: post._id,
            targetModel: 'Post',
            reason: reason || 'Inappropriate content'
        });

        res.status(201).json({ message: 'Report submitted', reportId: report._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Increment view count
// @route   PUT /api/posts/:id/view
// @access  Public
router.put('/:id/view', async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id, 
            { $inc: { views: 1 } },
            { new: true }
        );
        res.json({ views: post.views });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get users who liked a post
// @route   GET /api/posts/:id/likers
// @access  Public
router.get('/:id/likers', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('likes', 'name avatar handle');
            
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post.likes || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Toggle Like on a comment
// @route   PUT /api/posts/:postId/comments/:commentId/like
// @access  Private
router.put('/:postId/comments/:commentId/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const userId = req.user._id;
        if (!comment.likes) comment.likes = [];
        
        const isLiked = comment.likes.includes(userId);

        if (isLiked) {
            comment.likes.pull(userId);
        } else {
            comment.likes.push(userId);
            
            // Notification for comment like
            if (comment.user.toString() !== userId.toString()) {
                await Notification.create({
                    recipient: comment.user,
                    sender: userId,
                    type: 'like',
                    post: post._id,
                    text: 'liked your comment.',
                    isRead: false
                });
            }
        }

        await post.save();
        res.json(comment.likes);
    } catch (err) {
        console.error('Comment like error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
