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

// Get messages for a chat
router.get('/:chatId/messages', protect, async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .populate('sender', 'name handle avatar')
            .populate('postId', 'uri videoUri')
            .populate('marketitemId')
            .populate({
                path: 'replyTo',
                select: 'content type sender',
                populate: { path: 'sender', select: 'name' }
            })
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send message
router.post('/:chatId/messages', protect, async (req, res) => {
    const { content, type, duration } = req.body;
    try {
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
            lastMessage: content,
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

// React to a message
router.post('/:chatId/messages/:messageId/react', protect, async (req, res) => {
    const { emoji } = req.body;
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (!message.reactions) message.reactions = new Map();
        
        const userReactions = message.reactions.get(emoji) || [];
        const userIndex = userReactions.indexOf(req.user._id);

        if (userIndex > -1) {
            // Remove reaction
            userReactions.splice(userIndex, 1);
            if (userReactions.length === 0) {
                message.reactions.delete(emoji);
            } else {
                message.reactions.set(emoji, userReactions);
            }
        } else {
            // Add reaction
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

