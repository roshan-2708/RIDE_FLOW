const express = require('express');
const { register, sendLoginOtp, verifyOtp, getMe } = require('../controllers/auth.controller');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/send-otp', sendLoginOtp);
router.post('/verify-otp', verifyOtp);
router.get('/profile', protect, getMe);

module.exports = router;