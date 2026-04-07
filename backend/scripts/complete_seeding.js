const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
const MarketItem = require('../models/MarketItem');
require('dotenv').config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibe';

const categories = ['Electronics', 'Vehicles', 'Clothing', 'Home', 'Sports', 'Other'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Tangier', 'Agadir', 'Fes', 'Oujda', 'Meknes', 'Kenitra', 'Sale'];

const productData = [
  { title: 'iPhone 15 Pro', desc: 'Space Black, 128GB, Like New condition.' },
  { title: 'MacBook Air M2', desc: 'Midnight color, 8GB RAM, 256GB SSD. Perfect for students.' },
  { title: 'Nike Air Max 270', desc: 'Brand new, size 42. Very comfortable for running.' },
  { title: 'Samsung S23 Ultra', desc: 'Best camera in a smartphone. 256GB storage.' },
  { title: 'Sony WH-1000XM5', desc: 'Industry leading noise canceling headphones.' },
  { title: 'Gaming PC Desktop', desc: 'RTX 3070, Ryzen 7, 16GB RAM. Runs all AAA games.' },
  { title: 'Leather Sofa', desc: '3-seater brown leather sofa. Good condition.' },
  { title: 'Mountain Bike', desc: 'Aluminium frame, 21 speeds. Great for trails.' },
  { title: 'Coffee Machine', desc: 'Nespresso Pixie, works perfectly. Includes some pods.' },
  { title: 'Electric Guitar', desc: 'Fender Stratocaster style. Beautiful sound.' },
];

async function seedCompleteData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create 10 Users
    console.log('⏳ Creating 10 users...');
    const users = [];
    for (let i = 0; i < 10; i++) {
      users.push({
        name: `User ${i + 1}`,
        handle: `user_${i + 1}_${Math.floor(Math.random() * 1000)}`,
        email: `user${i + 1}@vibe.com`,
        password: hashedPassword,
        bio: `Vibe user ${i + 1}. Living the dream! ✨`,
        avatar: `https://i.pravatar.cc/150?u=user${i + 1}`
      });
    }
    const insertedUsers = await User.insertMany(users);
    const userIds = insertedUsers.map(u => u._id);
    console.log(`✅ Created ${insertedUsers.length} users.`);

    // 2. Create 20 Posts
    console.log('⏳ Creating 20 posts...');
    const posts = [];
    for (let i = 0; i < 20; i++) {
      const uId = userIds[Math.floor(Math.random() * userIds.length)];
      posts.push({
        user: uId,
        type: 'image',
        uri: `https://picsum.photos/seed/post${i}/800/1000`,
        caption: `Awesome vibe today! #${['vibes', 'coding', 'reactnative', 'ios', 'android'][i % 5]} 🚀`,
        likes: [],
        comments: []
      });
    }
    const insertedPosts = await Post.insertMany(posts);
    console.log(`✅ Created ${insertedPosts.length} posts.`);

    // 3. Create 10 Stories
    console.log('⏳ Creating 10 stories...');
    const stories = [];
    for (let i = 0; i < 10; i++) {
        const uId = userIds[Math.floor(Math.random() * userIds.length)];
        stories.push({
          user: uId,
          type: 'image',
          uri: `https://picsum.photos/seed/story${i}/1080/1920`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
    }
    const insertedStories = await Story.insertMany(stories);
    console.log(`✅ Created ${insertedStories.length} stories.`);

    // 4. Create 100 Products (MarketItems)
    console.log('⏳ Creating 100 products...');
    const marketItems = [];
    for (let i = 0; i < 100; i++) {
      const uId = userIds[Math.floor(Math.random() * userIds.length)];
      const baseProduct = productData[i % productData.length];
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      marketItems.push({
        user: uId,
        title: `${baseProduct.title} - ${i + 1}`,
        description: `${baseProduct.desc} Location: ${city}. Contact for more info.`,
        price: Math.floor(Math.random() * 5000) + 100,
        currency: 'د.م',
        category: categories[Math.floor(Math.random() * categories.length)],
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        images: [`https://picsum.photos/seed/product${i}/600/600`],
        location: {
          city: city,
          address: `${Math.floor(Math.random() * 100)} Street ${city}`
        },
        status: 'available',
        views: Math.floor(Math.random() * 200)
      });
    }
    const insertedItems = await MarketItem.insertMany(marketItems);
    console.log(`✅ Created ${insertedItems.length} products.`);

    console.log('\n🚀 COMPREHENSIVE SEEDING COMPLETED!');
    console.log('-----------------------------------');
    console.log(`Users:    ${insertedUsers.length}`);
    console.log(`Posts:    ${insertedPosts.length}`);
    console.log(`Stories:  ${insertedStories.length}`);
    console.log(`Products: ${insertedItems.length}`);
    console.log('-----------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during comprehensive seeding:', error);
    process.exit(1);
  }
}

seedCompleteData();
