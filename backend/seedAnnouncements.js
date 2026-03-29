const mongoose = require('mongoose');
require('dotenv').config();

const Announcement = require('./models/Announcement');

const seedAnnouncements = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        // console.log('✅ Connected to MongoDB');

        // Clear existing announcements
        await Announcement.deleteMany({});
        // console.log('🗑️ Cleared existing announcements');

        const samples = [
            {
                title: 'Welcome to Vibe Marketplace!',
                content: 'Start selling your items to millions of users. Follow our guidelines to ensure a safe trading environment.',
                type: 'info',
                target: 'all'
            },
            {
                title: 'Seller Tips: Stand out',
                content: 'Items with clear photos and detailed descriptions sell 3x faster than average listings.',
                type: 'tip',
                target: 'sellers'
            },
            {
                title: 'New Safety Features',
                content: 'We have implemented new verification steps to protect our community. Check them out in your settings.',
                type: 'update',
                target: 'all'
            },
            {
                title: 'Prohibited Items Update',
                content: 'Please review our updated list of prohibited items to ensure your listings comply with our policies.',
                type: 'warning',
                target: 'sellers'
            }
        ];

        await Announcement.insertMany(samples);
        // console.log('✅ Seeded sample announcements');

        await mongoose.disconnect();
        // console.log('👋 Disconnected');
    } catch (err) {
        console.error('❌ Error seeding announcements:', err);
    }
};

seedAnnouncements();
