const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => { /* console.log('✅ MongoDB connected') */ })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function testReels() {
    try {
        const reels = await Post.find({ type: { $in: ['reel', 'video'] } })
            .populate('user', 'name handle avatar')
            .limit(3);

        // console.log(`\n📹 Found ${reels.length} reels in database\n`);

        reels.forEach((reel, i) => {
            // console.log(`Reel ${i + 1}:`);
            // console.log('  ID:', reel._id);
            // console.log('  Type:', reel.type);
            // console.log('  URI:', reel.uri);
            // console.log('  VideoURI:', reel.videoUri);
            // console.log('  Caption:', reel.caption);
            // console.log('  User:', reel.user?.name || 'N/A');
            // console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testReels();
