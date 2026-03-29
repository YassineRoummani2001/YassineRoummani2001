const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    handle: String,
    email: String
}));

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const users = await User.find({}, '_id name handle email');
        console.log('--- USERS LIST ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('Total Count:', users.length);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
