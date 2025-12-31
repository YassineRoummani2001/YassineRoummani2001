const fetch = require('node-fetch');

async function testReels() {
    try {
        const response = await fetch('http://localhost:5000/api/posts/reels');
        const data = await response.json();
        
        console.log('\n✅ Reels API Response:');
        console.log('Total reels:', data.length);
        
        if (data.length > 0) {
            console.log('\n📹 First reel:');
            console.log('- ID:', data[0]._id);
            console.log('- Type:', data[0].type);
            console.log('- URI:', data[0].uri);
            console.log('- User:', data[0].user?.name);
            console.log('- Caption:', data[0].caption?.substring(0, 50));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testReels();
