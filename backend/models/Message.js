const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'reel', 'system'],
    default: 'text'
  },
  duration: {
    type: Number, // Duration in seconds for voice messages
    required: false
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  marketitemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketItem'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: {
    type: Map,
    of: [mongoose.Schema.Types.ObjectId],
    default: {}
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  noteRepliedTo: {
    type: Object, // Stores content and potentially music info
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expireAt: {
    type: Date,
    default: null,
    index: { expires: 0 } // This creates a TTL index that removes documents when expireAt is reached
  }
});

// Index for fetching messages in a chat efficiently
messageSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
