const fetch = require('node-fetch');

fetch('http://localhost:5000/api/posts/reels')
    .then(r => r.json())
    .then(data => {
        console.log('='.repeat(60));
        console.log('API REELS RESPONSE');
        console.log('='.repeat(60));
        console.log('\nTotal reels:', data.length);
        
        if (data.length === 0) {
            console.log('\n❌ NO REELS FOUND IN DATABASE!');
        } else {
            data.forEach((reel, i) => {
                console.log(`\n${i + 1}. ${reel.caption || 'No caption'}`);
                console.log(`   Type: ${reel.type}`);
                console.log(`   URI: ${reel.uri ? 'EXISTS ✅' : 'MISSING ❌'}`);
                console.log(`   User: ${reel.user?.name || 'No user'}`);
                console.log(`   ID: ${reel._id}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ API Error:', err.message);
        process.exit(1);
    });
