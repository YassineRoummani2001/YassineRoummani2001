const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Post = require('../models/Post');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all chats for user
router.get('/', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const blockedUsers = currentUser.blockedUsers || [];

        const chats = await Chat.find({ 
            participants: { 
                $all: [req.user._id],
                $nin: blockedUsers
            } 
        })
            .populate('participants', 'name handle avatar')
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create or get chat with user
router.post('/', protect, async (req, res) => {
    const { userId } = req.body;
    try {
        // Find existing chat with these two participants
        // This query assumes 1-on-1 chats mostly, but works for checking if a chat exists
        // Strictly 1-on-1 check:
        // chats where participants array has exactly these 2 elements
        let chat = await Chat.findOne({
            participants: { $all: [req.user._id, userId], $size: 2 }
        });

        if (!chat) {
            chat = await Chat.create({
                participants: [req.user._id, userId]
            });
        }
        
        const fullChat = await Chat.findById(chat._id).populate('participants', 'name handle avatar');
        res.json(fullChat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get messages for a chat (Paginated)
router.get('/:chatId/messages', protect, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const before = req.query.before;

        const query = { chatId: req.params.chatId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'name handle avatar')
            .populate({
                path: 'postId',
                select: 'uri videoUri user',
                populate: { path: 'user', select: 'name username avatar' }
            })
            .populate({
                path: 'marketitemId',
                populate: { path: 'user', select: 'name username avatar' }
            })
            .populate({
                path: 'replyTo',
                select: 'content type sender',
                populate: { path: 'sender', select: 'name' }
            })
            .sort({ createdAt: -1 }) // Newest first
            .limit(limit);

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const mult = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = mult.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = mult({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        // Accept images, videos, audio
        if (file.mimetype.startsWith('image/') || 
            file.mimetype.startsWith('video/') || 
            file.mimetype.startsWith('audio/') ||
            // Fallback for some audio types that might not have audio/ prefix on some systems
            file.originalname.match(/\.(mp3|wav|m4a|aac|ogg)$/i)
           ) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Send message (support text and file upload)
router.post('/:chatId/messages', protect, upload.single('file'), async (req, res) => {
    // req.body will contain text fields
    // req.file will contain the file if uploaded
    let { content, type, duration } = req.body;
    
    try {
        if (req.file) {
            // If file uploaded, content is the filename (or relative path)
            // The frontend helper 'getCorrectUrl' handles adding the base URL
            content = req.file.filename;
            
            // Auto-detect type if not provided
            if (!type) {
                if (req.file.mimetype.startsWith('image/')) type = 'image';
                else if (req.file.mimetype.startsWith('video/')) type = 'video';
                else if (req.file.mimetype.startsWith('audio/')) type = 'audio';
            }
        }

        const chat = await Chat.findById(req.params.chatId);
        let expireAt = null;
        if (chat && chat.disappearingMessages && chat.disappearingMessages > 0) {
             expireAt = new Date(Date.now() + chat.disappearingMessages);
        }

        const message = await Message.create({
            chatId: req.params.chatId,
            sender: req.user._id,
            content,
            type: type || 'text',
            duration: duration,
            postId: req.body.postId,
            marketitemId: req.body.marketitemId,
            replyTo: req.body.replyTo,
            expireAt: expireAt
        });

        await Chat.findByIdAndUpdate(req.params.chatId, {
            lastMessage: type === 'text' ? content : `Sent a ${type}`,
            lastMessageSender: req.user._id,
            updatedAt: Date.now()
        });

        const fullMessage = await Message.findById(message._id)
            .populate('sender', 'name handle avatar')
            .populate('marketitemId')
            .populate({
                path: 'replyTo',
                select: 'content type sender',
                populate: { path: 'sender', select: 'name' }
            });
        res.json(fullMessage);
    } catch (err) {
        console.error("Message Send Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Get unread messages count
router.get('/unread/count', protect, async (req, res) => {
    try {
        // Get all chats where user is a participant
        const chats = await Chat.find({ participants: req.user._id });
        const chatIds = chats.map(chat => chat._id);
        
        // Count messages in these chats that user hasn't read
        const unreadCount = await Message.countDocuments({
            chatId: { $in: chatIds },
            sender: { $ne: req.user._id }, // Not sent by current user
            readBy: { $ne: req.user._id }  // Not read by current user
        });
        
        res.json({ count: unreadCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark chat messages as read
router.put('/:chatId/read', protect, async (req, res) => {
    try {
        // Mark all messages in this chat as read by current user
        await Message.updateMany(
            { 
                chatId: req.params.chatId,
                sender: { $ne: req.user._id }, // Not sent by current user
                readBy: { $ne: req.user._id }  // Not already read
            },
            { 
                $addToSet: { readBy: req.user._id } 
            }
        );
        
        res.json({ message: 'Messages marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete all messages in a chat (Clear chat)
router.delete('/:chatId/messages', protect, async (req, res) => {
    try {
        // Delete all messages for this chat
        // Note: In a real app, you might want to "hide" them for one user instead of deleting for everyone
        // For now, we'll implement hard delete for everyone as requested
        await Message.deleteMany({ chatId: req.params.chatId });
        
        // Update chat last message
        await Chat.findByIdAndUpdate(req.params.chatId, {
            lastMessage: '',
            updatedAt: Date.now()
        });

        res.json({ message: 'All messages deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mute/Unmute chat
router.post('/:chatId/mute', protect, async (req, res) => {
    const { muted } = req.body;
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        // Initialize mutedBy array if it doesn't exist
        // Note: You might need to add this field to your Chat model first if not strict
        if (!chat.mutedBy) chat.mutedBy = [];
        
        if (muted) {
            // Add user to mutedBy if not already there
            if (!chat.mutedBy.includes(req.user._id)) {
                chat.mutedBy.push(req.user._id);
            }
        } else {
            // Remove user from mutedBy
            chat.mutedBy = chat.mutedBy.filter(id => id.toString() !== req.user._id.toString());
        }
        
        await chat.save();
        res.json({ message: muted ? 'Chat muted' : 'Chat unmuted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update chat theme
router.put('/:chatId/theme', protect, async (req, res) => {
    const { theme } = req.body;
    try {
        const chat = await Chat.findByIdAndUpdate(
            req.params.chatId,
            { theme },
            { new: true }
        );
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update chat nickname
router.put('/:chatId/nickname', protect, async (req, res) => {
    const { userId, nickname } = req.body;
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (!chat.nicknames) {
            chat.nicknames = new Map();
        }

        if (nickname) {
            chat.nicknames.set(userId, nickname);
        } else {
            chat.nicknames.delete(userId);
        }

        await chat.save();
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update disappearing messages setting
router.put('/:chatId/disappearing', protect, async (req, res) => {
    const { duration } = req.body; // duration in ms
    try {
        const chat = await Chat.findByIdAndUpdate(
            req.params.chatId,
            { disappearingMessages: duration },
            { new: true }
        );
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a specific message
router.delete('/:chatId/messages/:messageId', protect, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Verify ownership
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to delete this message' });
        }

        await Message.deleteOne({ _id: req.params.messageId });

        // Update chat last message
        const lastMessage = await Message.findOne({ chatId: req.params.chatId }).sort({ createdAt: -1 });
        await Chat.findByIdAndUpdate(req.params.chatId, {
            lastMessage: lastMessage ? lastMessage.content : '',
            lastMessageSender: lastMessage ? lastMessage.sender : null,
            updatedAt: lastMessage ? lastMessage.createdAt : Date.now()
        });

        res.json({ message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Edit a message
router.put('/:chatId/messages/:messageId', protect, async (req, res) => {
    const { content } = req.body;
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Verify ownership
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to edit this message' });
        }

        // Only allow editing text messages for now
        if (message.type !== 'text') {
             return res.status(400).json({ message: 'Only text messages can be edited' });
        }

        message.content = content;
        // message.isEdited = true; 
        await message.save();

        res.json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// React to a message
router.post('/:chatId/messages/:messageId/react', protect, async (req, res) => {
    const { emoji } = req.body;
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (!message.reactions) message.reactions = new Map();
        
        // Remove user from ALL reaction lists (Enforce single reaction per user)
        let removedFrom = null;
        for (const [key, users] of message.reactions.entries()) {
            const index = users.indexOf(req.user._id);
            if (index > -1) {
                users.splice(index, 1);
                if (users.length === 0) {
                    message.reactions.delete(key);
                } else {
                    message.reactions.set(key, users);
                }
                removedFrom = key;
            }
        }

        // If the user didn't just remove the SAME emoji, add the new one
        // (Toggle behavior: click same -> remove. click different -> switch)
        if (removedFrom !== emoji) {
            const userReactions = message.reactions.get(emoji) || [];
            userReactions.push(req.user._id);
            message.reactions.set(emoji, userReactions);
        }

        await message.save();
        res.json(message.reactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get shared media for a chat
router.get('/:chatId/media', protect, async (req, res) => {
    try {
        const mediaMessages = await Message.find({
            chatId: req.params.chatId,
            type: { $in: ['image', 'video', 'post', 'reel'] } // Added 'post' just in case
        })
        .populate('sender', 'name handle avatar')
        .populate('postId', 'uri videoUri thumbnail') // Populate post details if it's a reel/post
        .sort({ createdAt: -1 }); // Newest first
        
        res.json(mediaMessages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

