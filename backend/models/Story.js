const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
    uri: { type: String }, // Optional for 'text' type
    content: { type: String }, // Content for 'text' type
    color: { type: String }, // Background color for 'text' type
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => Date.now() + 24*60*60*1000 } // 24 hours from now
}, { timestamps: true });

// TTL Index to automatically delete stories after they expire
// The expireAfterSeconds option triggers the delete based on the value of the field relative to the index creation time? 
// Actually, standard usage for TTL is create index on a Date field.
// If I use expiresAt, I can set expireAfterSeconds: 0 to delete exactly at that time.
// storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Disabled for archive feature

module.exports = mongoose.model('Story', storySchema);
