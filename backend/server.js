const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const prisma = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/', async (req, res) => {
    const userCount = await prisma.user.count();
    res.json({
        message: 'RideFlow API is running!',
        database: 'PostgreSQL Connected',
        totalUsers: userCount
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: PostgreSQL connected `);
});