// Test if upload-reel endpoint is registered
const express = require('express');
const app = express();

// Load routes
const postsRouter = require('./routes/posts');

// Check if upload-reel route exists
// console.log('\n🔍 Checking routes...\n');

// Get all routes
function getRoutes(stack, basePath = '') {
    const routes = [];
    
    stack.forEach((middleware) => {
        if (middleware.route) {
            // Route middleware
            const methods = Object.keys(middleware.route.methods);
            routes.push({
                path: basePath + middleware.route.path,
                methods: methods.join(', ').toUpperCase()
            });
        } else if (middleware.name === 'router') {
            // Router middleware
            const routerRoutes = getRoutes(middleware.handle.stack, basePath);
            routes.push(...routerRoutes);
        }
    });
    
    return routes;
}

// This won't work perfectly without mounting, but let's try
// console.log('Posts router loaded:', !!postsRouter);
// console.log('\n✅ If you see this, the routes file loads without errors.\n');
// console.log('📋 To verify the endpoint works:');
// console.log('   1. Restart backend: npm run dev');
// console.log('   2. Check logs for "Server running"');
// console.log('   3. Try uploading a reel\n');
