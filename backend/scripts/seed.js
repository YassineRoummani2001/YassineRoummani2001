const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
require('dotenv').config({ path: '../.env' });

const properCase = (str) => {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

const seedDatabase = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibe';
        await mongoose.connect(uri);
        console.log(`✅ Connected to MongoDB at ${uri}`);

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Post.deleteMany({});
        await Story.deleteMany({});

        // Create Users
        console.log('👤 Creating users...');
        const users = await User.create([
            {
                name: 'Alex Johnson',
                handle: 'alexj',
                email: 'alex@example.com',
                password: 'password123',
                bio: 'Photography enthusiast 📸 | Traveler ✈️',
                avatar: 'https://i.pravatar.cc/150?u=alex',
                coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
            },
            {
                name: 'Sarah Smith',
                handle: 'sarah_style',
                email: 'sarah@example.com',
                password: 'password123',
                bio: 'Fashion & Lifestyle ✨',
                avatar: 'https://i.pravatar.cc/150?u=sarah',
                coverImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
            },
            {
                name: 'Mike Brown',
                handle: 'mike_codes',
                email: 'mike@example.com',
                password: 'password123',
                bio: 'Building cool things 💻',
                avatar: 'https://i.pravatar.cc/150?u=mike',
                coverImage: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800&q=80',
            }
        ]);

        // Create Posts
        console.log('📸 Creating posts...');
        const posts = await Post.create([
            {
                user: users[0]._id, // Alex
                type: 'image',
                uri: 'https://images.unsplash.com/photo-1501854140884-074cf2b2c3bd?w=800&q=80',
                caption: 'Amazing view from the top! 🏔️ #hiking #nature',
                likes: [users[1]._id, users[2]._id],
                views: 120
            },
            {
                user: users[1]._id, // Sarah
                type: 'image',
                uri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
                caption: 'New collection outcome! 👗 #fashion #style',
                likes: [users[0]._id],
                views: 85
            },
            {
                user: users[0]._id, // Alex
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                caption: 'Funny Bunny 🐰 #animation',
                likes: [users[1]._id, users[2]._id],
                views: 300
            },
            {
                user: users[1]._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 
                caption: 'Dreamy elephants 🐘',
                likes: [],
                views: 50
            },
            {
                user: users[2]._id,
                type: 'reel',
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                caption: 'Action packed 🎬',
                likes: [users[0]._id],
                views: 1200
            },
            {
                 user: users[0]._id,
                 type: 'reel',
                 uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                 caption: 'Meltdown 😅',
                 likes: [],
                 views: 20
            }
        ]);

        // Create Stories
        console.log('📖 Creating stories...');
        const stories = await Story.create([
            {
                user: users[0]._id, // Alex
                type: 'image',
                uri: 'https://images.unsplash.com/photo-1526779218005-0638cf4235ce?w=800&q=80', // Sunset
                viewers: [users[1]._id]
            },
            {
                user: users[1]._id, // Sarah
                type: 'image',
                uri: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', // Fashion outfit
                viewers: [users[0]._id, users[2]._id]
            },
            {
                user: users[1]._id, // Sarah (2nd story)
                type: 'video',
                uri: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
                viewers: []
            }
        ]);

        // IMPORTANT: Also push to User.stories embedded array for the App API to see them
        for (const story of stories) {
            await User.findByIdAndUpdate(story.user, {
                $push: { 
                    stories: {
                        image: story.uri,
                        createdAt: story.createdAt
                    } 
                }
            });
        }

        // Update User Followers/Following (Relationships)
        // Alex follows Sarah, Sarah follows Alex
        await User.findByIdAndUpdate(users[0]._id, { 
            $push: { following: users[1]._id },
            // update stats virtual? No, virtuals are calculated.
        });
        
        await User.findByIdAndUpdate(users[1]._id, { 
            $push: { followers: users[0]._id, following: users[0]._id }
        });

         await User.findByIdAndUpdate(users[0]._id, { 
            $push: { followers: users[1]._id }
        });

        console.log('✅ Database seeded successfully!');
        console.log(`- Created ${users.length} users`);
        console.log(`- Created ${posts.length} posts`);
        console.log(`- Created ${stories.length} stories`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedDatabase();
