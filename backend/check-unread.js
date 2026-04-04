const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./models/User');
    const Notification = require('./models/Notification');
    
    const user = await User.findOne({ name: /yassine/i }) || await User.findOne({ handle: /yass/i });
    if (!user) {
        console.log("No user"); process.exit();
    }
    
    console.log("User ID:", user._id);
    const countRead = await Notification.countDocuments({ recipient: user._id, isRead: true });
    const countUnread = await Notification.countDocuments({ recipient: user._id, isRead: false });
    
    console.log("Read:", countRead);
    console.log("Unread:", countUnread);
    
    // Simulate updating them to unread so I can see if it works
    await Notification.updateMany({ recipient: user._id }, { $set: { isRead: false } });
    console.log("Fixed to all unread !");
    
    process.exit();
}).catch(console.error);
