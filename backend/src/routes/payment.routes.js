const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    requestCashPayment,
    confirmCashPayment,
    processCashPayment,
    initiateUpiPayment,
    verifyUpiPayment,
    createOrder,
    verifyPayment,
    getPaymentHistory,
    getPaymentStatus
} = require('../controllers/payment.controller');

// All payment routes require authentication
router.use(protect);

// 1. Cash payment (Request by Rider, Confirm by Driver)
router.post('/cash', processCashPayment);
router.post('/cash/request', requestCashPayment);
router.post('/cash/confirm', confirmCashPayment);

// 2. UPI payment
router.post('/upi/initiate', initiateUpiPayment);
router.post('/upi/verify', verifyUpiPayment);

// 3. Razorpay payment
router.post('/razorpay/create-order', createOrder);
router.post('/create-order', createOrder);
router.post('/razorpay/verify', verifyPayment);
router.post('/verify', verifyPayment);

// 4. Status & History
router.get('/status/:rideId', getPaymentStatus);
router.get('/history', getPaymentHistory);

module.exports = router;
