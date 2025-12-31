const mongoose = require('mongoose');
const Post = require('./models/Post');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/vibe', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const validVideoUrls = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

async function fixReelUrls() {
    try {
        console.log('🔧 Fixing reel URLs...');
        
        // Get all reels
        const reels = await Post.find({ type: { $in: ['reel', 'video'] } });
        console.log(`📹 Found ${reels.length} reels`);
        
        // Update each reel with a valid URL
        for (let i = 0; i < reels.length; i++) {
            const reel = reels[i];
            const newUrl = validVideoUrls[i % validVideoUrls.length];
            
            reel.uri = newUrl;
            reel.videoUri = newUrl;
            await reel.save();
            
            console.log(`✅ Updated reel ${i + 1}: ${newUrl.substring(0, 50)}...`);
        }
        
        console.log('✅ All reels updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixReelUrls();
