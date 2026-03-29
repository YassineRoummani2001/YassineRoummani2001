const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
const MarketItem = require('../models/MarketItem');
require('dotenv').config({ path: '../.env' });

const properCase = (str) => {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

const seedDatabase = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibe';
        await mongoose.connect(uri);
        // console.log(`✅ Connected to MongoDB at ${uri}`);

        // Clear existing data
        // console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Post.deleteMany({});
        await Story.deleteMany({});
        await MarketItem.deleteMany({});

        // Create Users
        // console.log('👤 Creating users...');
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
        // console.log('📸 Creating posts...');
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
        // console.log('📖 Creating stories...');
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

        // Create Marketplace Items
        // console.log('🛍️ Creating marketplace items...');
        const marketItems = await MarketItem.create([
            {
                user: users[2]._id, // Mike
                title: 'iPhone 13 Pro Max - 256GB',
                description: 'Perfect condition, battery health 92%. Comes with box and original cable. Unlocked for all carriers.',
                price: 8500,
                currency: 'MAD',
                category: 'Electronics',
                condition: 'Like New',
                location: {
                    city: 'Casablanca',
                    address: 'Maarif'
                },
                images: [
                    'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800&q=80',
                    'https://images.unsplash.com/photo-1632661674209-54311894a4dc?w=800&q=80'
                ],
                status: 'available',
                views: 45
            },
            {
                user: users[1]._id, // Sarah
                title: 'Vintage Denim Jacket',
                description: 'Authentic vintage oversized denim jacket. Size M but fits L too. Great for layering.',
                price: 350,
                currency: 'MAD',
                category: 'Clothing',
                condition: 'Good',
                location: {
                    city: 'Marrakech',
                    address: 'Gueliz'
                },
                images: [
                    'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&q=80',
                    'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80'
                ],
                status: 'available',
                views: 120
            },
            {
                user: users[0]._id, // Alex
                title: 'Professional Camera Tripod',
                description: 'Manfrotto lightweight aluminum tripod. Stable and durable, perfect for landscape photography.',
                price: 1200,
                currency: 'MAD',
                category: 'Electronics',
                condition: 'New',
                location: {
                    city: 'Rabat',
                    address: 'Agdal'
                },
                images: [
                    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'
                ],
                status: 'available',
                views: 8
            },
            {
                user: users[2]._id, // Mike
                title: 'PlayStation 5 Digital Edition',
                description: 'Brand new, never opened. Won in a contest but I already have one.',
                price: 4500,
                currency: 'MAD',
                category: 'Electronics',
                condition: 'New',
                location: {
                    city: 'Casablanca',
                    address: 'Ain Diab'
                },
                images: [
                    'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80'
                ],
                status: 'available',
                views: 200
            },
            {
                user: users[0]._id, // Alex
                title: 'Mountain Bike - Trek Marlin 5',
                description: 'Used for one summer, detailed recently. Shimano gears, hydraulic disc brakes.',
                price: 3800,
                currency: 'MAD',
                category: 'Sports',
                condition: 'Good',
                location: {
                    city: 'Tangier',
                    address: 'City Center'
                },
                images: [
                    'https://images.unsplash.com/photo-1576435728678-be95d39e8f70?w=800&q=80'
                ],
                status: 'reserved',
                views: 65
            },
            {
                user: users[1]._id, // Sarah
                title: 'Modern Coffee Table',
                description: 'Minimalist glass coffee table with oak legs. Slight scratch on the glass, barely visible.',
                price: 800,
                currency: 'MAD',
                category: 'Home',
                condition: 'Fair',
                location: {
                    city: 'Casablanca',
                    address: 'California'
                },
                images: [
                    'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&q=80'
                ],
                status: 'available',
                views: 30
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

        // console.log('✅ Database seeded successfully!');
        // console.log(`- Created ${users.length} users`);
        // console.log(`- Created ${posts.length} posts`);
        // console.log(`- Created ${stories.length} stories`);
        // console.log(`- Created ${marketItems.length} market items`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedDatabase();
