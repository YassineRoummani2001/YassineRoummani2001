const express = require('express');
const router = express.Router();
const MarketItem = require('../models/MarketItem');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');

// @desc    Get all marketplace items (with filters)
// @route   GET /api/marketplace
router.get('/', protect, async (req, res) => {
    try {
        const { category, status, search, userId, location } = req.query;
        // console.log('🔍 Marketplace GET query:', req.query);
        
        let query = {};
        
        // Filter by category
        if (category && category !== 'all') {
            query.category = category;
        }
        
        // Filter by status (default: available)
        if (status && status !== 'all') {
            query.status = status;
        } else if (!status) {
            query.status = 'available';
        }
        
        // Filter by user (for "My Listings")
        if (userId) {
            query.user = userId;
        }
        
        // Filter by location (city)
        if (location) {
            query['location.city'] = { $regex: location, $options: 'i' };
        }
        
        // Search in title and description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const items = await MarketItem.find(query)
            .populate('user', 'name avatar handle')
            .sort({ createdAt: -1 });
        
        res.json(items);
    } catch (err) {
        console.error('Error fetching marketplace items:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get marketplace statistics for current user
// @route   GET /api/marketplace/stats
router.get('/stats', protect, async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch all items belonging to the user for aggregation
        const userItems = await MarketItem.find({ user: userId });

        // 1. Core Listing Status Counts
        const activeListings = userItems.filter(i => i.status === 'available').length;
        const soldCount = userItems.filter(i => i.status === 'sold').length;
        const totalListings = userItems.length;

        // 2. Financial Metrics
        const inventoryValue = userItems
            .filter(i => i.status === 'available')
            .reduce((sum, item) => sum + (item.price || 0), 0);

        // 3. User Engagement Metrics
        const totalViews = userItems.reduce((sum, item) => sum + (item.views || 0), 0);
        const totalSaves = userItems.reduce((sum, item) => sum + (item.savedBy?.length || 0), 0);
        
        // Aggregate daily views for time-series charts (Engagement Trend)
        const dailyViewsMap = {};
        userItems.forEach(item => {
            if (item.dailyViews) {
                item.dailyViews.forEach(dv => {
                    dailyViewsMap[dv.date] = (dailyViewsMap[dv.date] || 0) + dv.count;
                });
            }
        });

        // 4. Communication Metrics (Chats to answer)
        const userChats = await Chat.find({ participants: userId })
            .populate('participants', 'name avatar handle')
            .sort({ updatedAt: -1 });

        const chatIds = userChats.map(c => c._id);
        
        const unreadCount = await Message.countDocuments({
            chatId: { $in: chatIds },
            sender: { $ne: userId },
            readBy: { $ne: userId }
        });

        // Get top 5 recent chats for the inbox preview
        const recentChats = userChats.slice(0, 5).map(chat => {
             const otherParticipant = chat.participants.find(p => p._id.toString() !== userId.toString());
             return {
                 _id: chat._id,
                 participant: otherParticipant,
                 lastMessage: chat.lastMessage,
                 updatedAt: chat.updatedAt,
                 isUnread: false 
             };
        });

        // 5. Intelligent Derived Metrics
        const conversionRate = totalViews > 0 ? (soldCount / totalViews) * 100 : 0;
        const sellerRating = 4.9; // Baseline rating
        
        // Calculate profile strength (0-100)
        let profileStrengthScore = 60; // Base score
        if (req.user.avatar) profileStrengthScore += 10;
        if (req.user.bio) profileStrengthScore += 10;
        if (activeListings >= 3) profileStrengthScore += 10;
        if (soldCount >= 1) profileStrengthScore += 10;

        res.json({
            activeListings,
            soldCount,
            totalListings,
            totalViews,
            totalSaves,
            inventoryValue,
            dailyViewsMap,
            chatsToAnswer: unreadCount,
            recentChats,
            sellerRating,
            profileStrength: profileStrengthScore,
            conversionRate: conversionRate.toFixed(1),
            newFollowers: req.user.followers?.length || 0, 
            listingsToRenew: 0,
            deleteAndRelist: 0
        });
    } catch (err) {
        console.error('Error fetching marketplace stats:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get single marketplace item
// @route   GET /api/marketplace/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const item = await MarketItem.findById(req.params.id)
            .populate('user', 'name avatar handle phone email');
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Increment view count
        item.views += 1;
        
        // Track time-series views
        const today = new Date().toISOString().split('T')[0];
        const dailyViewIdx = item.dailyViews.findIndex(v => v.date === today);
        if (dailyViewIdx >= 0) {
            item.dailyViews[dailyViewIdx].count += 1;
        } else {
            item.dailyViews.push({ date: today, count: 1 });
        }
        
        await item.save();
        
        res.json(item);
    } catch (err) {
        console.error('Error fetching item:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create marketplace item
// @route   POST /api/marketplace
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, price, currency, category, condition, images, location } = req.body;
        
        if (!title || !description || !price) {
            return res.status(400).json({ message: 'Please provide title, description, and price' });
        }
        
        const item = new MarketItem({
            user: req.user._id,
            title,
            description,
            price,
            currency: currency || 'د.م',
            category: category || 'Other',
            condition: condition || 'Good',
            images: images || [],
            location: location || {}
        });
        
        const savedItem = await item.save();
        const populatedItem = await MarketItem.findById(savedItem._id)
            .populate('user', 'name avatar handle');
        
        // console.log(`✅ New marketplace item created: ${title} by ${req.user.name}`);
        res.status(201).json(populatedItem);
    } catch (err) {
        console.error('Error creating marketplace item:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update marketplace item
// @route   PUT /api/marketplace/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const item = await MarketItem.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Check if user owns the item
        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this item' });
        }
        
        const { title, description, price, currency, category, condition, images, location, status } = req.body;
        
        if (title) item.title = title;
        if (description) item.description = description;
        if (price) item.price = price;
        if (currency) item.currency = currency;
        if (category) item.category = category;
        if (condition) item.condition = condition;
        if (images) item.images = images;
        if (location) item.location = location;
        if (status) item.status = status;
        
        const updatedItem = await item.save();
        const populatedItem = await MarketItem.findById(updatedItem._id)
            .populate('user', 'name avatar handle');
        
        res.json(populatedItem);
    } catch (err) {
        console.error('Error updating marketplace item:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Delete marketplace item
// @route   DELETE /api/marketplace/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const item = await MarketItem.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Check if user owns the item
        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this item' });
        }
        
        await MarketItem.findByIdAndDelete(req.params.id);
        
        // console.log(`🗑️ Marketplace item deleted: ${item.title}`);
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error('Error deleting marketplace item:', err);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Save/Unsave marketplace item
// @route   POST /api/marketplace/:id/save
router.post('/:id/save', protect, async (req, res) => {
    try {
        const item = await MarketItem.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        const userId = req.user._id;
        const isSaved = item.savedBy.includes(userId);
        
        if (isSaved) {
            // Unsave
            item.savedBy = item.savedBy.filter(id => id.toString() !== userId.toString());
        } else {
            // Save
            item.savedBy.push(userId);
        }
        
        await item.save();
        
        res.json({ 
            saved: !isSaved,
            savedCount: item.savedBy.length
        });
    } catch (err) {
        console.error('Error saving/unsaving item:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
