const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files correctly

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB "vibe" database connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
// Import Models
require('./models/User');
require('./models/Post');
require('./models/Story');
require('./models/Notification');
require('./models/Chat');
require('./models/Message');
require('./models/MarketItem');
require('./models/Announcement');
require('./models/Report');
require('./models/Note');


// Routes definitions
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notes', require('./routes/notes'));


app.get('/', (req, res) => {
    res.send('Vibe API is running...');
});

const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server with increased header size
const server = http.createServer({
    maxHeaderSize: 16384 // 16KB (default is 8KB)
}, app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Store online users
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // User joins with their ID
    socket.on('user:online', (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log(`✅ User ${userId} is online`);
        
        // Broadcast to all clients that this user is online
        io.emit('user:status', { userId, isOnline: true });
    });

    // User joins a chat room
    socket.on('chat:join', (chatId) => {
        socket.join(chatId);
        console.log(`📨 Socket ${socket.id} joined chat ${chatId}`);
    });

    // User sends a message
    socket.on('message:send', (data) => {
        const { chatId, message } = data;
        // Broadcast to all users in this chat room
        io.to(chatId).emit('message:new', message);
        console.log(`💬 Message sent to chat ${chatId}`);
    });

    // User is typing
    socket.on('typing:start', (data) => {
        const { chatId, userName } = data;
        socket.to(chatId).emit('typing:user', { userName, isTyping: true });
    });

    socket.on('typing:stop', (data) => {
        const { chatId } = data;
        socket.to(chatId).emit('typing:user', { isTyping: false });
    });

    // User reacts to a message
    socket.on('message:react', (data) => {
        const { chatId, messageId, emoji, userId } = data;
        socket.to(chatId).emit('message:react', { messageId, emoji, userId });
    });

    // User disconnects
    socket.on('disconnect', () => {
        // Find and remove user from online users
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                io.emit('user:status', { userId, isOnline: false });
                console.log(`❌ User ${userId} went offline`);
                break;
            }
        }
        console.log('🔌 User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO ready for real-time messaging`);
});

// Real-time messaging enabled
