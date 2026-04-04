const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./models/User');
    const Post = require('./models/Post');
    const Notification = require('./models/Notification');
    
    // get random user with most notifications
    const sorted = await Notification.aggregate([
        { $group: { _id: '$recipient', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
    ]);
    
    if (sorted.length === 0) {
        console.log("No notifications found across the entire DB.");
        process.exit();
    }
    
    const maxUserId = sorted[0]._id;
    console.log("Max user ID string:", maxUserId.toString());
    const user = await User.findById(maxUserId);
    console.log("User Name:", user ? user.name : "null");
    console.log("Count:", sorted[0].count);
    
    // Simulate what the route does
    try {
        const notifications = await Notification.find({ recipient: maxUserId })
            .populate('sender', 'name handle avatar')
            .populate('post', 'image type uri thumbnail')
            .sort({ createdAt: -1 });
        console.log("Successfully fetched and populated", notifications.length, "notifications.");
    } catch (err) {
        console.error("ERROR POPULATING:", err);
    }
    process.exit();
}).catch(console.error);
