const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const prisma = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({
            message: 'RideFlow API is running',
            database: 'postgreSQL connected',
            totalUser: userCount
        });
    } catch (error) {
        res.status(500).json({
            message: 'Database connection failed',
            error: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Database: PostgreSQL connected via Prisma`);
});