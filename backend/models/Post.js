const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['image', 'video', 'reel'], default: 'image' },
    uri: { type: String, required: true },
    videoUri: { type: String }, // For reels/videos - backward compatibility
    caption: { type: String, default: '' },
    music: { type: String }, // Music/audio track name for reels
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    isMuted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
