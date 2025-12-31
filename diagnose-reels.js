#!/usr/bin/env node

console.log('🔍 Vibe Reels Diagnostic Tool\n');
console.log('=' .repeat(50));

// Check 1: Platform Detection
console.log('\n📱 PLATFORM CHECK:');
console.log('If you see this in a terminal, you\'re running Node.js');
console.log('If you see this in a browser console, you\'re on WEB ❌');
console.log('If you see this in Expo Go or simulator, you\'re on MOBILE ✅\n');

// Check 2: Environment
console.log('🌍 ENVIRONMENT:');
console.log('API Base URL should be: http://localhost:5000');
console.log('Check your Config.ts file\n');

// Check 3: Video URLs
console.log('🎥 TEST VIDEO URLS:');
const testUrls = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
];

console.log('Try opening these URLs in your browser:');
testUrls.forEach((url, i) => {
    console.log(`${i + 1}. ${url}`);
});

console.log('\n✅ If videos play in browser = URLs are valid');
console.log('❌ If videos don\'t play = Network issue\n');

// Check 4: Common Issues
console.log('🐛 COMMON ISSUES:\n');
console.log('1. Testing on Expo Web?');
console.log('   → Videos DON\'T work on web!');
console.log('   → Test on mobile device or simulator\n');

console.log('2. Backend not running?');
console.log('   → Run: cd backend && npm run dev');
console.log('   → Check: http://localhost:5000/api/posts/reels\n');

console.log('3. No reels in database?');
console.log('   → Run: cd backend && node create-sample-reels.js\n');

console.log('4. Wrong API URL?');
console.log('   → Check constants/Config.ts');
console.log('   → Should be: http://localhost:5000\n');

// Check 5: Next Steps
console.log('📋 NEXT STEPS:\n');
console.log('1. Open browser console (F12)');
console.log('2. Look for these logs:');
console.log('   - "🎬 ReelItem State:"');
console.log('   - "✅ Video loaded successfully:"');
console.log('   - "❌ Video Error:"\n');

console.log('3. Check the state values:');
console.log('   - active: should be true for visible reel');
console.log('   - isLoaded: should become true when video loads');
console.log('   - shouldPlay: should be true to play\n');

console.log('4. If testing on WEB:');
console.log('   → STOP! Test on mobile instead!');
console.log('   → Run: npm start');
console.log('   → Scan QR code with Expo Go app\n');

console.log('=' .repeat(50));
console.log('\n💡 TIP: 99% of issues = testing on web. Use mobile! 📱\n');
