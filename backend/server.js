const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const prisma = require('./src/config/db');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./src/routes/auth.routes');
const rideRoutes = require('./src/routes/ride.routes');
const driverRoutes = require('./src/routes/driver.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const chatRoutes = require('./src/routes/chat.routes');
const adminRoutes = require('./src/routes/admin.routes');
const app = express();
const PORT = process.env.PORT || 5000;


// create http server (need for socket.io)
const server = http.createServer(app);

// setup socket
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST', "PUT", 'DELETE'],
        credentials: true
    }
});

// make it accessible in controller
app.set('io', io);

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);




app.get('/', async (req, res) => {
    const userCount = await prisma.user.count();
    res.json({
        message: 'RideFlow API is running!',
        database: 'PostgreSQL Connected',
        realtime: 'Socket.io Active',
        totalUsers: userCount
    });
});

// socket.io connection handler
const initializeSocket = require('./src/sockets');
initializeSocket(io);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: PostgreSQL connected`);
    console.log('socket is ready')
});