const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');

mongoose.connect('mongodb://localhost:27017/vibe')
    .then(async () => {
        // console.log('✅ Connected to MongoDB\n');
        
        // Get first user
        const user = await User.findOne();
        if (!user) {
            // console.log('❌ No users found. Please create a user first.');
            process.exit(1);
        }
        
        // console.log(`👤 Using user: ${user.name}\n`);
        
        // Sample video URLs (free stock videos)
        const sampleVideos = [
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                caption: 'Big Buck Bunny 🐰 #animation #cute',
                coverImage: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                caption: 'Elephants Dream 🐘 #surreal #art',
                coverImage: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                caption: 'For Bigger Blazes 🔥 #action #epic',
                coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                caption: 'For Bigger Escapes 🚗 #adventure #travel',
                coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                caption: 'For Bigger Fun 🎉 #party #celebration',
                coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                caption: 'For Bigger Joyrides 🎢 #fun #excitement',
                coverImage: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                caption: 'For Bigger Meltdowns 🍦 #sweet #delicious',
                coverImage: 'https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
                caption: 'Sintel 🐉 #fantasy #dragon',
                coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
                caption: 'Subaru Adventure 🚙 #offroad #nature',
                coverImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400'
            },
            {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                caption: 'Tears of Steel 🤖 #scifi #future',
                coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400'
            }
        ];
        
        // Check existing reels
        const existingReels = await Post.find({ type: 'reel' });
        // console.log(`📊 Current reels in DB: ${existingReels.length}\n`);
        
        // Create new reels
        const newReels = sampleVideos.map(video => ({
            user: user._id,
            type: 'reel',
            uri: video.uri,
            caption: video.caption,
            coverImage: video.coverImage,
            likes: [],
            comments: [],
            shares: 0
        }));
        
        // Delete old reels and insert new ones
        await Post.deleteMany({ type: 'reel' });
        // console.log('🗑️  Deleted old reels\n');
        
        const created = await Post.insertMany(newReels);
        // console.log(`✅ Created ${created.length} new reels!\n`);
        
        // console.log('📝 Reels created:');
        created.forEach((reel, i) => {
            // console.log(`${i + 1}. ${reel.caption}`);
        });
        
        // console.log('\n✨ Done! Refresh your app to see the new reels.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
