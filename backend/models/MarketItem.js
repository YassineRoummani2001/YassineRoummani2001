const mongoose = require('mongoose');

const marketItemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'د.م'
    },
    category: {
        type: String,
        enum: ['Electronics', 'Vehicles', 'Clothing', 'Home', 'Sports', 'Other'],
        default: 'Other'
    },
    condition: {
        type: String,
        enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
        default: 'Good'
    },
    images: [{
        type: String
    }],
    location: {
        city: String,
        address: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    status: {
        type: String,
        enum: ['available', 'sold', 'reserved'],
        default: 'available'
    },
    views: {
        type: Number,
        default: 0
    },
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

marketItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MarketItem', marketItemSchema);
