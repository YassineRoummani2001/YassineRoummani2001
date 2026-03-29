const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
require('dotenv').config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibe';

const sampleVideos = [
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4'
];

async function seedData() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        const hashedPassword = await bcrypt.hash('password123', 10);

        console.log('⏳ Creating 1000 users... This might take a few seconds.');
        const users = [];
        for (let i = 0; i < 1000; i++) {
            users.push({
                name: `Test User ${i + 1}`,
                handle: `testuser${i + 1}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                email: `testuser${i + 1}_${Date.now()}@test.com`,
                password: hashedPassword,
                bio: 'This is a generated test account for Vibe. 🚀',
                avatar: `https://i.pravatar.cc/150?u=${i}_${Date.now()}`
            });
        }
        
        // We do insertMany for performance
        const insertedUsers = await User.insertMany(users);
        console.log(`✅ Successfully created ${insertedUsers.length} users.`);

        const userIds = insertedUsers.map(u => u._id);

        console.log('⏳ Creating 100 image posts...');
        const posts = [];
        for (let i = 0; i < 100; i++) {
            const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
            posts.push({
                user: randomUserId,
                type: 'image',
                uri: `https://picsum.photos/seed/${i}_${Date.now()}/800/1000`,
                caption: `Test Post ${i + 1} 📸✨ #photography #vibe`,
                likes: [],
                comments: [],
                views: Math.floor(Math.random() * 500)
            });
        }
        
        const insertedPosts = await Post.insertMany(posts);
        console.log(`✅ Successfully created ${insertedPosts.length} posts.`);

        console.log('⏳ Creating 100 video reels...');
        const reels = [];
        for (let i = 0; i < 100; i++) {
            const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
            const randomVideo = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
            reels.push({
                user: randomUserId,
                type: 'reel',
                uri: randomVideo,
                videoUri: randomVideo, // For backward compatibility
                caption: `Sample Video Reel ${i + 1} 🎥🔥 #reel #video`,
                music: 'Original Audio - Testing',
                likes: [],
                comments: [],
                views: Math.floor(Math.random() * 1000)
            });
        }

        const insertedReels = await Post.insertMany(reels);
        console.log(`✅ Successfully created ${insertedReels.length} reels.`);

        console.log('🚀 Bulk seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

seedData();
