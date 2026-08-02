const express = require('express');
const { register, sendLoginOtp, verifyOtp, getMe, refreshToken, logout } = require('../controllers/auth.controller');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/send-otp', sendLoginOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh-token', refreshToken);
router.get('/profile', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;