const mongoose = require('mongoose');
const MarketItem = require('./models/MarketItem');
require('dotenv').config();

// Sample marketplace items
const sampleItems = [
    {
        user: '69467762e41f3f8845c73dba', // Replace with a real user ID from your database
        title: 'MacBook Pro M1 2021',
        description: 'MacBook Pro 13" with M1 chip, 8GB RAM, 256GB SSD. Excellent condition, barely used. Comes with original charger and box.',
        price: 8500,
        currency: 'د.م',
        category: 'Electronics',
        condition: 'Like New',
        images: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
        ],
        location: {
            city: 'Salé',
            address: 'Hay Salam',
            coordinates: {
                latitude: 34.0531,
                longitude: -6.7985
            }
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'Lenovo ThinkPad X1 Carbon',
        description: 'Professional laptop, Intel i7, 16GB RAM, 512GB SSD. Perfect for work and programming.',
        price: 6000,
        currency: 'د.م',
        category: 'Electronics',
        condition: 'Good',
        images: [
            'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500',
        ],
        location: {
            city: 'Rabat',
            address: 'Agdal'
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'Nike Winter Jacket',
        description: 'Brand new Nike jacket, size L, perfect for winter. Never worn, still has tags.',
        price: 600,
        currency: 'د.م',
        category: 'Clothing',
        condition: 'New',
        images: [
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
        ],
        location: {
            city: 'Agdal',
            address: 'Agdal Ryad'
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'iPhone 16 Pro Max 256GB',
        description: 'Latest iPhone 16 Pro Max, Titanium Blue, 256GB. Like new condition, used for 2 months only. Includes all accessories and original box.',
        price: 14500,
        currency: 'د.م',
        category: 'Electronics',
        condition: 'Like New',
        images: [
            'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=500',
        ],
        location: {
            city: 'Hassan',
            address: 'Hassan Center'
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'Toyota Corolla 2020',
        description: 'Toyota Corolla 2020, automatic, 45,000 km, excellent condition. Full service history.',
        price: 180000,
        currency: 'د.م',
        category: 'Vehicles',
        condition: 'Good',
        images: [
            'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500',
        ],
        location: {
            city: 'Témara',
            address: 'Massira'
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'Wireless Charger Hoco 15W',
        description: 'Fast wireless charger, compatible with iPhone and Samsung. Brand new in box.',
        price: 150,
        currency: 'د.م',
        category: 'Electronics',
        condition: 'New',
        images: [
            'https://images.unsplash.com/photo-1591290619762-d2c9f7a2e5a6?w=500',
        ],
        location: {
            city: 'Hay Riad',
            address: 'Hay Riad'
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'Gaming Chair RGB',
        description: 'Professional gaming chair with RGB lighting, adjustable height and armrests. Very comfortable.',
        price: 1200,
        currency: 'د.م',
        category: 'Home',
        condition: 'Good',
        images: [
            'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=500',
        ],
        location: {
            city: 'Salé',
            address: 'Tabriquet'
        },
        status: 'available'
    },
    {
        user: '69467762e41f3f8845c73dba',
        title: 'PlayStation 5 + 2 Controllers',
        description: 'PS5 Disc Edition with 2 DualSense controllers and 3 games (FIFA 24, Spider-Man, God of War).',
        price: 5500,
        currency: 'د.م',
        category: 'Electronics',
        condition: 'Like New',
        images: [
            'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500',
        ],
        location: {
            city: 'Rabat',
            address: 'Ocean'
        },
        status: 'available'
    }
];

async function seedMarketplace() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing items (optional)
        await MarketItem.deleteMany({});
        console.log('🗑️  Cleared existing marketplace items');

        // Insert sample items
        const inserted = await MarketItem.insertMany(sampleItems);
        console.log(`✅ Inserted ${inserted.length} marketplace items`);

        console.log('\n📦 Sample items added:');
        inserted.forEach((item, index) => {
            console.log(`${index + 1}. ${item.title} - ${item.price} ${item.currency}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding marketplace:', error);
        process.exit(1);
    }
}

seedMarketplace();
