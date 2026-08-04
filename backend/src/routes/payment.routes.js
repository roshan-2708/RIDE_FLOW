const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    createOrder,
    verifyPayment,
    getPaymentHistory,
    getPaymentStatus
} = require('../controllers/payment.controller');

// All payment routes require authentication
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/status/:rideId', getPaymentStatus);

module.exports = router;