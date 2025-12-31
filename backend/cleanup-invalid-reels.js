require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/Post');

async function cleanupInvalidReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected\n');

        // Find all reels
        const reels = await Post.find({ type: { $in: ['reel', 'video'] } });
        console.log(`📹 Found ${reels.length} reels\n`);

        let invalidCount = 0;
        let validCount = 0;

        for (const reel of reels) {
            const uri = reel.videoUri || reel.uri;
            
            // Check if URI is base64 or invalid
            if (uri && (uri.includes('base64') || uri.includes('data:video') || uri.includes('blob:'))) {
                console.log(`❌ Invalid reel: ${reel._id}`);
                console.log(`   URI: ${uri.substring(0, 100)}...`);
                console.log(`   Deleting...\n`);
                
                await Post.deleteOne({ _id: reel._id });
                invalidCount++;
            } else if (uri && (uri.startsWith('/uploads/') || uri.startsWith('http'))) {
                console.log(`✅ Valid reel: ${reel._id}`);
                console.log(`   URI: ${uri}\n`);
                validCount++;
            } else {
                console.log(`⚠️ Unknown reel: ${reel._id}`);
                console.log(`   URI: ${uri}\n`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Valid reels: ${validCount}`);
        console.log(`   Invalid reels deleted: ${invalidCount}`);
        console.log(`   Total remaining: ${validCount}\n`);

        // If no valid reels remain, create sample ones
        if (validCount === 0) {
            console.log('⚠️ No valid reels found. Run create-sample-reels.js to add sample data.\n');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanupInvalidReels();
