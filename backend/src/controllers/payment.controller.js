const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/db');
const { CalculateSettlementSplit } = require('../utils/settlement.utils');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// Helper: Record Driver Earning & Platform Settlement
const recordDriverSettlement = async (ride, amount, platformFee) => {
    if (!ride.driverId) return;

    try {
        const split = CalculateSettlementSplit(amount);
        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: ride.driverId }
        });

        if (driverProfile) {
            const existingEarning = await prisma.earning.findUnique({
                where: { rideId: ride.id }
            });

            if (!existingEarning) {
                await prisma.earning.create({
                    data: {
                        driverId: driverProfile.id,
                        rideId: ride.id,
                        amount: split.driverEarning,
                        isPaid: true,
                        paidAt: new Date()
                    }
                });

                await prisma.driverProfile.update({
                    where: { id: driverProfile.id },
                    data: {
                        totalEarnings: { increment: split.driverEarning }
                    }
                });
            } else if (!existingEarning.isPaid) {
                await prisma.earning.update({
                    where: { id: existingEarning.id },
                    data: {
                        amount: split.driverEarning,
                        isPaid: true,
                        paidAt: new Date()
                    }
                });

                await prisma.driverProfile.update({
                    where: { id: driverProfile.id },
                    data: {
                        totalEarnings: { increment: split.driverEarning }
                    }
                });
            }
        }
    } catch (err) {
        console.error('Settlement error:', err);
    }
};

// ==========================================
// 1. CASH / COD PAYMENT
// ==========================================

// Rider requests to pay cash -> Status becomes CASH_PENDING
const requestCashPayment = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.userId;

        if (!rideId) {
            return res.status(400).json({ success: false, message: 'rideId is required' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

        if (ride.riderId !== userId) {
            return res.status(403).json({ success: false, message: 'Only the passenger can request cash payment' });
        }

        if (ride.paymentStatus === 'PAID') {
            return res.status(400).json({ success: false, message: 'Ride is already paid' });
        }

        const amount = ride.actualFare || ride.estimatedFare;

        // Upsert pending COD payment record
        const existingPayment = await prisma.payment.findFirst({
            where: { rideId }
        });

        if (existingPayment) {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    method: 'COD',
                    status: 'PENDING',
                    amount
                }
            });
        } else {
            await prisma.payment.create({
                data: {
                    rideId,
                    riderId: ride.riderId,
                    amount,
                    method: 'COD',
                    status: 'PENDING',
                    transactionId: `CASH_PENDING_${Date.now()}_${rideId.slice(0, 8)}`
                }
            });
        }

        // Update ride payment status to CASH_PENDING
        await prisma.ride.update({
            where: { id: rideId },
            data: { paymentStatus: 'CASH_PENDING' }
        });

        return res.status(200).json({
            success: true,
            message: 'Cash payment marked. Waiting for driver to confirm receipt.',
            paymentStatus: 'CASH_PENDING'
        });
    } catch (error) {
        console.error('Request cash payment error:', error);
        return res.status(500).json({ success: false, message: 'Failed to request cash payment' });
    }
};

// Driver confirms receiving cash -> Status becomes PAID
const confirmCashPayment = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.userId;

        if (!rideId) {
            return res.status(400).json({ success: false, message: 'rideId is required' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

        // Only the assigned driver can confirm cash receipt
        if (ride.driverId !== userId) {
            return res.status(403).json({ success: false, message: 'Only the assigned driver can confirm cash receipt' });
        }

        if (ride.paymentStatus === 'PAID') {
            return res.status(400).json({ success: false, message: 'Ride is already paid' });
        }

        const amount = ride.actualFare || ride.estimatedFare;
        const split = CalculateSettlementSplit(amount);

        const existingPayment = await prisma.payment.findFirst({
            where: { rideId }
        });

        let payment;
        if (existingPayment) {
            payment = await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    method: 'COD',
                    status: 'COMPLETED',
                    platformFee: split.platformFee,
                    paidAt: new Date(),
                    transactionId: `CASH_${Date.now()}_${rideId.slice(0, 8)}`
                }
            });
        } else {
            payment = await prisma.payment.create({
                data: {
                    rideId,
                    riderId: ride.riderId,
                    amount,
                    platformFee: split.platformFee,
                    method: 'COD',
                    status: 'COMPLETED',
                    transactionId: `CASH_${Date.now()}_${rideId.slice(0, 8)}`,
                    paidAt: new Date()
                }
            });
        }

        // Update ride payment status to PAID
        await prisma.ride.update({
            where: { id: rideId },
            data: { paymentStatus: 'PAID' }
        });

        // Record Driver Earning
        await recordDriverSettlement(ride, amount, split.platformFee);

        return res.status(200).json({
            success: true,
            message: 'Cash payment confirmed successfully! 💵',
            payment,
            paymentStatus: 'PAID'
        });
    } catch (error) {
        console.error('Confirm cash payment error:', error);
        return res.status(500).json({ success: false, message: 'Failed to confirm cash payment' });
    }
};

// Dual-purpose handler for backwards compatibility
const processCashPayment = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.userId;

        if (!rideId) {
            return res.status(400).json({ success: false, message: 'rideId is required' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

        if (ride.driverId === userId) {
            return confirmCashPayment(req, res);
        } else if (ride.riderId === userId) {
            return requestCashPayment(req, res);
        } else {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Cash payment error:', error);
        return res.status(500).json({ success: false, message: 'Failed to process cash payment' });
    }
};

// ==========================================
// 2. UPI PAYMENT (QR / Intent & Verification)
// ==========================================
const initiateUpiPayment = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.userId;

        if (!rideId) {
            return res.status(400).json({ success: false, message: 'rideId is required' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
        if (ride.riderId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

        const amount = ride.actualFare || ride.estimatedFare;
        const transactionRef = `UPI_${Date.now()}_${rideId.slice(0, 8)}`;
        const merchantVpa = process.env.UPI_MERCHANT_VPA || 'rideflow@upi';
        const merchantName = encodeURIComponent(process.env.UPI_MERCHANT_NAME || 'RideFlow');

        // Standard NPCI UPI URI string format for QR code & UPI app deep links
        const upiUri = `upi://pay?pa=${merchantVpa}&pn=${merchantName}&am=${amount.toFixed(2)}&cu=INR&tr=${transactionRef}&tn=Ride_${rideId.slice(0, 8)}`;

        // Create pending payment record 
        await prisma.payment.create({
            data: {
                rideId,
                riderId: userId,
                amount,
                method: 'UPI',
                status: 'PENDING',
                transactionId: transactionRef
            }
        });

        return res.status(200).json({
            success: true,
            message: 'UPI payment initiated',
            upiDetails: {
                upiUri,
                amount,
                transactionRef,
                merchantVpa,
                qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`
            }
        });
    } catch (error) {
        console.error('Initiate UPI error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initiate UPI payment' });
    }
};

const verifyUpiPayment = async (req, res) => {
    try {
        const { rideId, transactionRef, utrNumber } = req.body;
        const userId = req.user.userId;

        if (!rideId || !transactionRef) {
            return res.status(400).json({ success: false, message: 'rideId and transactionRef are required' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

        const amount = ride.actualFare || ride.estimatedFare;
        const split = CalculateSettlementSplit(amount);

        // Update payment record to COMPLETED
        await prisma.payment.updateMany({
            where: { rideId, transactionId: transactionRef },
            data: {
                status: 'COMPLETED',
                transactionId: utrNumber ? `${transactionRef}_UTR_${utrNumber}` : transactionRef,
                platformFee: split.platformFee,
                paidAt: new Date()
            }
        });

        // Mark ride as PAID
        await prisma.ride.update({
            where: { id: rideId },
            data: { paymentStatus: 'PAID' }
        });

        // Record Driver Settlement
        await recordDriverSettlement(ride, amount, split.platformFee);

        return res.status(200).json({
            success: true,
            message: 'UPI Payment verified successfully! 📱',
            rideId
        });
    } catch (error) {
        console.error('Verify UPI error:', error);
        return res.status(500).json({ success: false, message: 'Failed to verify UPI payment' });
    }
};

// ==========================================
// 3. RAZORPAY PAYMENT (Cards, NetBanking, Gateway)
// ==========================================
const createOrder = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user.userId;

        if (!rideId) {
            return res.status(400).json({ success: false, message: 'rideId is required' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
        if (ride.riderId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

        const existingPayment = await prisma.payment.findFirst({
            where: { rideId, status: 'COMPLETED' }
        });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: 'Ride is already paid' });
        }

        const amount = ride.actualFare || ride.estimatedFare;

        // Razorpay order (amount in paise)
        const order = await razorpay.orders.create({
            amount: Math.ceil(amount * 100),
            currency: 'INR',
            receipt: `ride_${rideId.slice(0, 20)}`,
            notes: { rideId, riderId: userId }
        });

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
            message: 'Razorpay order created!',
            order: {
                id: order.id,
                amount: order.amount,
                amountINR: amount,
                currency: order.currency,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Create Razorpay order error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rideId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !rideId) {
            return res.status(400).json({ success: false, message: 'All payment verification fields required' });
        }

        // HMAC verification
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed! Signature mismatch.'
            });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        const amount = ride?.actualFare || ride?.estimatedFare || 0;
        const split = CalculateSettlementSplit(amount);

        // Update Payment to COMPLETED
        await prisma.payment.updateMany({
            where: { razorpayOrderId: razorpay_order_id },
            data: {
                status: 'COMPLETED',
                platformFee: split.platformFee,
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

        // Record Driver Settlement
        if (ride) {
            await recordDriverSettlement(ride, amount, split.platformFee);
        }

        return res.status(200).json({
            success: true,
            message: 'Payment verified successfully! 🎉',
            paymentId: razorpay_payment_id
        });
    } catch (error) {
        console.error('Verify Razorpay error:', error);
        return res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

// ==========================================
// 4. PAYMENT STATUS & HISTORY
// ==========================================
const getPaymentStatus = async (req, res) => {
    try {
        const { rideId } = req.params;

        const payment = await prisma.payment.findFirst({
            where: { rideId, status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            isPaid: !!payment,
            payment: payment || null
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to get payment status' });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { riderId: userId },
                    { ride: { driverId: userId } }
                ]
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
        return res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
    }
};

module.exports = {
    requestCashPayment,
    confirmCashPayment,
    processCashPayment,
    initiateUpiPayment,
    verifyUpiPayment,
    createOrder,
    verifyPayment,
    getPaymentStatus,
    getPaymentHistory
};
