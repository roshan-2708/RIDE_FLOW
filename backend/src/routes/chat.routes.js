const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    sendMessage,
    getChatHistory
} = require('../controllers/chat.controller');

// All chat routes require authentication
router.use(protect);

router.post('/send', sendMessage);
router.get('/history/:rideId', getChatHistory);

module.exports = router;
