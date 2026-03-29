const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb://localhost:27017/vibe';

async function findAdminAndReset() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        // Search for admin by name, handle or email
        const admin = await User.findOne({ 
            $or: [
                { handle: /admin/i },
                { email: /admin/i },
                { name: /admin/i }
            ]
        });

        if (admin) {
            console.log(`\n👑 Admin found:`);
            console.log(`- Name: ${admin.name}`);
            console.log(`- Email: ${admin.email}`);
            console.log(`- Handle: @${admin.handle}`);
            
            // Reset password to 'admin123'
            admin.password = 'admin123';
            await admin.save();
            console.log('\n✅ Password reset to: admin123');
        } else {
            console.log('\n❌ Admin user not found. Creating a new admin account...');
            const newAdmin = new User({
                name: 'System Admin',
                email: 'admin@vibe.com',
                handle: 'admin',
                password: 'admin123'
            });
            await newAdmin.save();
            console.log('✅ New Admin Created:');
            console.log('- Email: admin@vibe.com');
            console.log('- Password: admin123');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

findAdminAndReset();
