const axios = require('axios');

async function testFetch() {
    try {
        const res = await axios.get('http://localhost:5000/api/posts/reels');
        console.log('Status:', res.status);
        if (res.data.length > 0) {
            console.log('First Reel:', JSON.stringify(res.data[0], null, 2));
        } else {
            console.log('No reels found');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testFetch();
