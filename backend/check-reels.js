const mongoose = require('mongoose');
const Post = require('./models/Post');

mongoose.connect('mongodb://localhost:27017/vibe', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkReels() {
    try {
        const reels = await Post.find({ type: { $in: ['reel', 'video'] } }).limit(3);
        
        // console.log('\n📹 Current reels in database:');
        reels.forEach((reel, i) => {
            // console.log(`\nReel ${i + 1}:`);
            // console.log('  ID:', reel._id);
            // console.log('  URI:', reel.uri);
            // console.log('  VideoURI:', reel.videoUri);
            // console.log('  Type:', reel.type);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkReels();
