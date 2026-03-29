const mongoose = require('mongoose');
const User = require('../models/User');
const MarketItem = require('../models/MarketItem');
require('dotenv').config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibe';

const categories = ['Electronics', 'Vehicles', 'Clothing', 'Home', 'Sports', 'Other'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const statuses = ['available', 'available', 'available', 'available', 'sold', 'reserved'];
const cities = [
    { city: 'Casablanca', lat: 33.5731, lng: -7.5898 },
    { city: 'Rabat', lat: 34.0209, lng: -6.8416 },
    { city: 'Marrakech', lat: 31.6295, lng: -7.9811 },
    { city: 'Tangier', lat: 35.7595, lng: -5.8340 },
    { city: 'Fes', lat: 34.0331, lng: -5.0003 },
    { city: 'Agadir', lat: 30.4278, lng: -9.5981 }
];

const electronicItems = [
    'iPhone 13 Pro Max - Excellent condition',
    'MacBook Pro M1 2020 256GB',
    'PlayStation 5 with 2 controllers',
    'Samsung Galaxy S22 Ultra',
    'AirPods Pro 2nd Gen',
    'Nintendo Switch OLED',
    'Dell XPS 15 Laptop',
    'LG 55" OLED 4K Smart TV',
    'Sony WH-1000XM4 Headphones',
    'Canon EOS R5 Camera'
];

const vehicleItems = [
    'Volkswagen Golf 7 - 2018',
    'Dacia Duster 2021',
    'Renault Clio 4',
    'Yamaha TMAX 560',
    'BMW 3 Series 2019',
    'Peugeot 208 Like New',
    'Toyota Yaris Hybrid',
    'Honda SH 150i',
    'Mountain Bike BTWIN',
    'Electric Scooter Xiaomi Pro 2'
];

const clothingItems = [
    'Vintage Leather Jacket',
    'Nike Air Force 1 Size 42',
    'Zara Winter Coat M',
    'Adidas Tracksuit',
    'Levis 501 Original Jeans',
    'Gucci Sneakers (Authentic)',
    'The North Face Puffer',
    'Ralph Lauren Polo Shirt',
    'Summer Dress Floral',
    'Nike Dunk Low Panda'
];

const homeItems = [
    'L-Shaped Sofa IKEA',
    'Wooden Dining Table with 6 Chairs',
    'Smart Washing Machine Samsung',
    'Double Bed Frame with Mattress',
    'Nespresso Coffee Machine',
    'Vintage Persian Rug',
    'Bookshelf Minimalist Design',
    'Office Desk Chair',
    'Set of 4 Bar Stools',
    'LG Double Door Refrigerator'
];

const sportItems = [
    'Dumbbell Set 20kg',
    'Yoga Mat Premium',
    'Tennis Racket Wilson',
    'Surfboard 6ft',
    'Boxing Gloves Everlast',
    'Treadmill Folding',
    'Football Boots Nike',
    'Camping Tent 4 Persons',
    'Home Gym Bench',
    'Resistance Bands Set'
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomProduct(userIds) {
    const categoryName = getRandomItem(categories);
    let title = '';
    
    switch (categoryName) {
        case 'Electronics': title = getRandomItem(electronicItems); break;
        case 'Vehicles': title = getRandomItem(vehicleItems); break;
        case 'Clothing': title = getRandomItem(clothingItems); break;
        case 'Home': title = getRandomItem(homeItems); break;
        case 'Sports': title = getRandomItem(sportItems); break;
        default: title = `Awesome Item ${Math.floor(Math.random() * 1000)}`; break;
    }

    const cityObj = getRandomItem(cities);
    const userId = getRandomItem(userIds);
    
    return {
        user: userId,
        title: title,
        description: `This is an amazing ${title}. Really great item for you. Works perfectly and ready to be used. Contact me for more info.`,
        price: Math.floor(Math.random() * 9000) + 100, // Price between 100 and 9100
        currency: 'د.م',
        category: categoryName,
        condition: getRandomItem(conditions),
        images: [
            `https://picsum.photos/seed/${Math.random()}/500/500`,
            `https://picsum.photos/seed/${Math.random()}/500/500`
        ],
        location: {
            city: cityObj.city,
            address: `Center, ${cityObj.city}`,
            coordinates: {
                latitude: cityObj.lat + (Math.random() * 0.05 - 0.025),
                longitude: cityObj.lng + (Math.random() * 0.05 - 0.025)
            }
        },
        status: getRandomItem(statuses),
        views: Math.floor(Math.random() * 500)
    };
}

async function seedMarketplace() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Fetch user IDs to assign products to
        const users = await User.find({}, '_id').limit(100);
        if (users.length === 0) {
            console.error('❌ No users found in database. Please run seedBulkData.js first.');
            process.exit(1);
        }
        
        const userIds = users.map(u => u._id);
        
        console.log('⏳ Creating 200 marketplace products...');
        const products = [];
        for (let i = 0; i < 200; i++) {
            products.push(generateRandomProduct(userIds));
        }

        const insertedProducts = await MarketItem.insertMany(products);
        console.log(`✅ Successfully created ${insertedProducts.length} marketplace items.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during marketplace seeding:', error);
        process.exit(1);
    }
}

seedMarketplace();
