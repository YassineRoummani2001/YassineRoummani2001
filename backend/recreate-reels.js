const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/vibe', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const validVideos = [
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        caption: '🐰 Big Buck Bunny - Amazing animation! #animation #bunny'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        caption: '🐘 Elephants Dream - Surreal journey #dream #art'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: '🔥 For Bigger Blazes #fire #epic'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        caption: '🏃 For Bigger Escapes #adventure #travel'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        caption: '🎉 For Bigger Fun #fun #party'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        caption: '🚗 For Bigger Joyrides #car #speed'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        caption: '💥 For Bigger Meltdowns #action #explosion'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        caption: '🐉 Sintel - Epic fantasy tale #fantasy #dragon'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        caption: '🚙 Subaru Outback Adventure #car #offroad'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        caption: '🤖 Tears of Steel - Sci-fi action #scifi #robot'
    }
];

async function recreateReels() {
    try {
        console.log('🗑️  Deleting old reels...');
        await Post.deleteMany({ type: { $in: ['reel', 'video'] } });
        
        console.log('👤 Finding first user...');
        const user = await User.findOne();
        
        if (!user) {
            console.error('❌ No users found! Please create a user first.');
            process.exit(1);
        }
        
        console.log(`✅ Using user: ${user.name}`);
        console.log('\n📹 Creating new reels...');
        
        for (let i = 0; i < validVideos.length; i++) {
            const video = validVideos[i];
            
            const reel = await Post.create({
                user: user._id,
                type: 'reel',
                uri: video.url,
                videoUri: video.url,
                caption: video.caption,
                likes: [],
                comments: [],
                shares: 0,
                views: Math.floor(Math.random() * 10000) + 1000
            });
            
            console.log(`✅ Created reel ${i + 1}: ${video.caption.substring(0, 30)}...`);
        }
        
        console.log(`\n🎉 Successfully created ${validVideos.length} reels!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

recreateReels();
