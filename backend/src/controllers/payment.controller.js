const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/db');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// create payment order
const createOrder = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.userId;

        if (!rideId) {
            return res.status(400).json({ success: false, message: 'rideId is required' });
        }

        // Get ride
        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
        if (ride.riderId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });
        if (ride.status !== 'COMPLETED') return res.status(400).json({ success: false, message: 'Ride not completed yet' });

        // Check if already paid
        const existingPayment = await prisma.payment.findFirst({
            where: { rideId, status: 'COMPLETED' }
        });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: 'Ride already paid!' });
        }

        const amount = ride.actualFare || ride.estimatedFare;

        // Create Razorpay order (amount in paise: ₹1 = 100 paise)
        const order = await razorpay.orders.create({
            amount: Math.ceil(amount * 100),
            currency: 'INR',
            receipt: `ride_${rideId.slice(0, 20)}`,
            notes: { rideId, riderId: userId }
        });

        // Save order to DB
        await prisma.payment.create({
            data: {
                rideId,
                riderId: userId,
                amount,
                method: 'RAZORPAY',
                status: 'PENDING',
                razorpayOrderId: order.id
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Order created!',
            order: {
                id: order.id,
                amount: order.amount,      // in paise
                amountINR: amount,         // in rupees
                currency: order.currency,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID
            }
        });

    } catch (error) {
        console.error('Create order error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

// verify payment
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rideId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !rideId) {
            return res.status(400).json({ success: false, message: 'All payment fields required' });
        }

        // Verify signature — VERY IMPORTANT security check!
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed! Signature mismatch.'
            });
        }

        // Update payment in DB
        await prisma.payment.updateMany({
            where: { razorpayOrderId: razorpay_order_id },
            data: {
                status: 'COMPLETED',
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paidAt: new Date()
            }
        });

        // Mark ride as PAID
        await prisma.ride.update({
            where: { id: rideId },
            data: { paymentStatus: 'PAID' }
        });

        return res.status(200).json({
            success: true,
            message: 'Payment successful! Ride is fully paid.',
            paymentId: razorpay_payment_id
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        return res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

// get payment history
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const payments = await prisma.payment.findMany({
            where: {
                ride: { riderId: userId }
            },
            include: {
                ride: {
                    select: {
                        pickupAddress: true,
                        dropoffAddress: true,
                        vehicleType: true,
                        distance: true,
                        completedAt: true,
                        actualFare: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ success: true, count: payments.length, payments });

    } catch (error) {
        console.error('Payment history error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
    }
};


// payment status
const getPaymentStatus = async (req, res) => {
    try {
        const { rideId } = req.params;

        const payment = await prisma.payment.findFirst({
            where: { rideId },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            isPaid: payment?.status === 'COMPLETED',
            payment: payment || null
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to get payment status' });
    }
};

module.exports = { createOrder, verifyPayment, getPaymentHistory, getPaymentStatus };