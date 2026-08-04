const prisma = require('../config/db');
const { decryptMessage, encryptMessage } = require('../utils/encryption.utils')

// send message
const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.userId;
        const { rideId, message } = req.body;

        if (!rideId || !senderId || !message) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' })
        }

        if (ride.riderId !== senderId && ride.driverId !== senderId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this ride' })
        }


        // encrypt before saving (encryptMessage returns "ivHex:encryptedHex")
        const encrypted = encryptMessage(message.trim());
        const [iv, encryptedContent] = encrypted.split(':');

        const createdMessage = await prisma.message.create({
            data: {
                rideId,
                senderId,
                encryptedContent,
                iv,
            },
            include: {
                sender: { select: { id: true, name: true, role: true } }
            }
        });

        // Return decrypted version to sender
        return res.status(201).json({
            success: true,
            message: {
                ...createdMessage,
                content: message.trim() // show original text to user
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

// get chat history
const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { rideId } = req.params;

        const ride = await prisma.ride.findUnique({
            where: {
                id: rideId
            },
        });

        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        if (ride.riderId !== userId && ride.driverId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this ride' });
        }

        const messages = await prisma.message.findMany({
            where: { rideId },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
            orderBy: { sentAt: 'asc' }
        });

        // Decrypt messages for response
        const decryptedMessages = messages.map(msg => {
            const rawEncrypted = `${msg.iv}:${msg.encryptedContent}`;
            return {
                ...msg,
                content: decryptMessage(rawEncrypted)
            };
        });

        return res.status(200).json({
            success: true,
            count: decryptedMessages.length,
            messages: decryptedMessages
        });

    } catch (error) {
        console.error('get chat history error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get chat history' });
    }
};

module.exports = {
    sendMessage,
    getChatHistory
}