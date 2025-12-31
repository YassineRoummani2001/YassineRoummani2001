const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');

mongoose.connect('mongodb://localhost:27017/vibe')
    .then(async () => {
        console.log('Connected to MongoDB\n');
        
        // Get all posts
        const allPosts = await Post.find().populate('user');
        console.log('Total posts in DB:', allPosts.length);
        
        // Filter reels
        const reels = allPosts.filter(p => p.type === 'reel' || p.type === 'video');
        console.log('Reels/Videos:', reels.length);
        
        if (reels.length === 0) {
            console.log('\n❌ NO REELS FOUND!');
            console.log('\nCreating sample reels...');
            
            // Get first user
            const user = await User.findOne();
            if (!user) {
                console.log('❌ No users found. Please create a user first.');
                process.exit(1);
            }
            
            // Create sample reels
            const sampleReels = [
                {
                    user: user._id,
                    type: 'reel',
                    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    caption: 'Sample Reel 1 🎬',
                    likes: [],
                    comments: []
                },
                {
                    user: user._id,
                    type: 'reel',
                    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                    caption: 'Sample Reel 2 🎥',
                    likes: [],
                    comments: []
                },
                {
                    user: user._id,
                    type: 'reel',
                    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                    caption: 'Sample Reel 3 🔥',
                    likes: [],
                    comments: []
                }
            ];
            
            await Post.insertMany(sampleReels);
            console.log('✅ Created 3 sample reels!');
        } else {
            console.log('\n✅ Reels exist:');
            reels.forEach((r, i) => {
                console.log(`\n${i + 1}. ${r.caption || 'No caption'}`);
                console.log(`   Type: ${r.type}`);
                console.log(`   URI: ${r.uri ? r.uri.substring(0, 50) + '...' : 'MISSING'}`);
                console.log(`   User: ${r.user?.name || 'No user'}`);
            });
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
