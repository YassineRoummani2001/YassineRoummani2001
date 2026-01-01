const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxlength: 60 },
  music: {
    track: String,
    artist: String,
    cover: String,
    previewUrl: String
  },
  createdAt: { type: Date, default: Date.now, expires: '24h' } // Auto delete after 24h
});

module.exports = mongoose.model('Note', noteSchema);
