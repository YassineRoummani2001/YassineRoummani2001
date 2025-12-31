const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

async function createSampleReels() {
    try {
        // Get a user to assign to the reels
        let user = await User.findOne();
        
        if (!user) {
            console.log('No users found. Creating a sample user...');
            user = await User.create({
                name: 'Demo User',
                email: 'demo@vibe.com',
                password: 'password123',
                avatar: 'https://i.pravatar.cc/150?img=1'
            });
        }

        console.log('Using user:', user.name);

        // Delete existing reels
        await Post.deleteMany({ type: { $in: ['reel', 'video'] } });
        console.log('Deleted existing reels');

        // Sample reels with publicly accessible video URLs
        const sampleReels = [
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                caption: '🐰 Big Buck Bunny - Amazing animation!',
                music: 'Original Sound',
                likes: [],
                comments: [],
                views: 1234,
                shares: 56
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                caption: '🐘 Elephants Dream - A surreal journey',
                music: 'Dreamy Vibes',
                likes: [],
                comments: [],
                views: 2345,
                shares: 78
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                caption: '🔥 For Bigger Blazes - Epic moments',
                music: 'Fire Beat',
                likes: [],
                comments: [],
                views: 3456,
                shares: 92
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                caption: '✈️ For Bigger Escapes - Travel the world',
                music: 'Adventure Time',
                likes: [],
                comments: [],
                views: 4567,
                shares: 103
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                caption: '🎉 For Bigger Fun - Party vibes!',
                music: 'Party Mix',
                likes: [],
                comments: [],
                views: 5678,
                shares: 115
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                caption: '🚗 For Bigger Joyrides - Speed and thrill',
                music: 'Racing Beat',
                likes: [],
                comments: [],
                views: 6789,
                shares: 127
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                caption: '🍫 For Bigger Meltdowns - Sweet moments',
                music: 'Chill Vibes',
                likes: [],
                comments: [],
                views: 7890,
                shares: 139
            },
            {
                user: user._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
                videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
                caption: '🐉 Sintel - A dragon tale',
                music: 'Epic Orchestra',
                likes: [],
                comments: [],
                views: 8901,
                shares: 151
            }
        ];

        // Create the reels
        const createdReels = await Post.insertMany(sampleReels);
        
        console.log(`\n✅ Created ${createdReels.length} sample reels!`);
        console.log('\nSample reels:');
        createdReels.forEach((reel, i) => {
            console.log(`${i + 1}. ${reel.caption}`);
            console.log(`   Video: ${reel.videoUri}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error creating sample reels:', error);
        process.exit(1);
    }
}

createSampleReels();
