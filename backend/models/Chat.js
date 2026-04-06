const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: String
  },
  lastMessageSender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  theme: {
    type: String,
    default: '#ffffff'
  },
  nicknames: {
    type: Map,
    of: String,
    default: {}
  },
  disappearingMessages: {
    type: Number, // Duration in milliseconds. 0 = off
    default: 0
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String
  },
  groupAvatar: {
    type: String
  },
  groupCoverImage: {
    type: String
  },
  groupDescription: {
    type: String,
    default: ''
  },
  isMarketplace: {
    type: Boolean,
    default: false
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  favoritedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pinnedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', chatSchema);
