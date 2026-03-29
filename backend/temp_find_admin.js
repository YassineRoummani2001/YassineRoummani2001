const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb://localhost:27017/vibe';

async function listUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        const users = await User.find({}, 'name email handle');
        console.log('\n👥 Current Users:');
        users.forEach(u => {
            console.log(`- ${u.name} (Email: ${u.email}, Handle: @${u.handle})`);
        });

        const admin = users.find(u => u.handle.toLowerCase().includes('admin') || u.name.toLowerCase().includes('admin') || u.email.toLowerCase().includes('admin'));
        if (admin) {
            console.log(`\n👑 Potential admin found: ${admin.name} (${admin.email})`);
        } else {
            console.log('\n❌ No admin-like user found.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

listUsers();
