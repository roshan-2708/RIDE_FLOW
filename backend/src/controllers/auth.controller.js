const prisma = require('../config/db');
const { generateOTP, getOTPExpiry } = require('../utils/otp.utils');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt.utils');
const { sendOTPEmail } = require('../services/email.services');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            role
        } = req.body;

        if (!name || !email || !phone || !role) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, phone, role) are required'
            });
        }

        const existUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });

        if (existUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email or phone already exists'
            });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                role: role || 'RIDER',
                status: 'ACTIVE',
            }
        });

        const otp = generateOTP();
        const expireOTP = getOTPExpiry();

        await prisma.otpCode.create({
            data: {
                userId: user.id,
                code: otp,
                type: 'EMAIL',
                purpose: 'REGISTER',
                expireAt: expireOTP
            }
        });

        await sendOTPEmail(email, name, otp, 'REGISTER');

        res.status(201).json({
            success: true,
            message: `OTP sent to ${email}. Please verify your account.`,
            userId: user.id
        });

    } catch (error) {
        console.error("Register controller error : ", error.message);
        res.status(500).json({
            success: false,
            message: 'Internal Server Issue',
            error: error.message
        });
    }
};

exports.sendLoginOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await prisma.otpCode.updateMany({
            where: { userId: user.id, purpose: 'LOGIN', isUsed: false },
            data: { isUsed: true }
        });

        const otp = generateOTP();
        const expireOTP = getOTPExpiry();

        await prisma.otpCode.create({
            data: {
                userId: user.id,
                code: otp,
                type: 'EMAIL',
                purpose: 'LOGIN',
                expireAt: expireOTP
            }
        });

        await sendOTPEmail(email, user.name, otp, 'LOGIN');

        res.json({
            success: true,
            message: `OTP sent to ${email}`,
            userId: user.id
        });

    } catch (error) {
        console.error("Login controller error : ", error.message);
        res.status(500).json({
            success: false,
            message: 'Internal Server Issue',
            error: error.message
        });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: 'userId and otp are required'
            });
        }

        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                userId,
                code: otp,
                isUsed: false,
                expireAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Mark OTP as used
        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { isUsed: true }
        });

        // Mark email as verified & retrieve user details
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isEmailVerified: true },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                profilePhoto: true,
                isEmailVerified: true
            }
        });

        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);

        res.json({
            success: true,
            message: 'Login successful! 🎉',
            user,
            tokens: {
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error("Verify controller error : ", error.message);
        res.status(500).json({
            success: false,
            message: 'Internal Server Issue',
            error: error.message
        });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                profilePhoto: true,
                isEmailVerified: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile',
            error: error.message
        });
    }
};