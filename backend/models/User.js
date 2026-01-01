const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    handle: { type: String, required: true, unique: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true, // Automatically convert to lowercase
        trim: true, // Remove whitespace
        index: true // Ensure index is created
    },
    password: { type: String, required: true }, // Hashed before saving
    bio: { type: String, default: '' },
    pronouns: { type: String, default: '' },
    gender: { type: String, default: '' },
    links: [{ title: String, url: String }],
    phone: { type: String, default: '' },
    avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
    coverImage: { type: String, default: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fit=crop&q=80' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followerRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pending requests stored on receiver
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pending requests stored on sender (for UI "Requested")
    isPrivate: { type: Boolean, default: true }, // Default private as requested feature implies this behavior
    stories: [{
        type: { type: String, default: 'image' }, // 'image', 'video', 'text'
        uri: { type: String }, // media url or base64
        content: { type: String }, // text caption or text story content
        color: { type: String }, // background color for text stories
        views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now }
    }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    expoPushToken: { type: String, default: '' },
}, { timestamps: true });

// Hash password before saving
const bcrypt = require('bcryptjs');

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for stats to match frontend expectation easily
userSchema.virtual('stats').get(function() {
    return {
        posts: 0, // Placeholder, normally count posts
        followers: this.followers.length,
        following: this.following.length,
        likes: 0 // Placeholder
    };
});

module.exports = mongoose.model('User', userSchema);
