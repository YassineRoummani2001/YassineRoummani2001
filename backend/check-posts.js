const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');

mongoose.connect('mongodb://localhost:27017/vibe')
    .then(async () => {
        console.log('Connected to MongoDB\n');
        
        const posts = await Post.find().populate('user');
        console.log('Total posts:', posts.length);
        
        const reels = posts.filter(p => p.type === 'reel' || p.type === 'video');
        console.log('Reels/Videos:', reels.length);
        console.log('\n' + '='.repeat(70) + '\n');
        
        if (reels.length === 0) {
            console.log('No reels found in database!');
            console.log('\nAll posts:');
            posts.forEach((p, i) => {
                console.log(`${i + 1}. Type: ${p.type}, User: ${p.user?.name || 'Unknown'}`);
            });
        } else {
            reels.forEach((reel, i) => {
                console.log(`REEL ${i + 1}:`);
                console.log(`  Type: ${reel.type}`);
                console.log(`  User: ${reel.user?.name || 'Unknown'}`);
                console.log(`  Caption: ${reel.caption || 'No caption'}`);
                console.log(`  URI exists: ${!!reel.uri}`);
                console.log(`  Likes: ${reel.likes?.length || 0}`);
                console.log(`  Comments: ${reel.comments?.length || 0}`);
                console.log('');
            });
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
