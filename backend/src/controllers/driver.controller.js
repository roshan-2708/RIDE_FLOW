const prisma = require('../config/db');
const { calculateFare } = require('../utils/fare.utils');

// accepted ride
const acceptedRide = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;
        const { rideId } = req.params;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: 'rideId parameter is required',
            });
        }

        // check ride exists and is available
        const ride = await prisma.ride.findUnique({
            where: { id: rideId }
        });

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'No ride found',
            });
        }

        if (ride.status !== 'REQUESTED') {
            return res.status(400).json({
                success: false,
                message: "Ride is not in 'REQUESTED' state",
            });
        }

        // check driver has no active ride
        const activeRide = await prisma.ride.findFirst({
            where: {
                driverId,
                status: {
                    in: ['ACCEPTED', 'STARTED'],
                }
            }
        });

        if (activeRide) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active ride'
            });
        }

        // update ride
        const updateRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                driverId,
                status: 'ACCEPTED',
                acceptedAt: new Date()
            }
        });

        // set driver is unavailable (ON_RIDE)
        await prisma.driverProfile.updateMany({
            where: { userId: driverId },
            data: { availability: 'ON_RIDE' }
        });

        return res.status(200).json({
            success: true,
            message: 'Ride accepted successfully',
            ride: updateRide
        });

    } catch (error) {
        console.log("Error in accept ride controller:", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// start ride
const startRide = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;
        const { rideId } = req.params;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: 'rideId parameter is required',
            });
        }

        const ride = await prisma.ride.findUnique({
            where: { id: rideId }
        });

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'No ride found for this ID',
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden - you are not assigned to this ride',
            });
        }

        if (ride.status !== 'ACCEPTED') {
            return res.status(400).json({
                success: false,
                message: 'Ride is not in ACCEPTED state',
            });
        }

        const updateRide = await prisma.ride.update({
            where: { id: rideId },
            data: { status: 'STARTED', startedAt: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: 'Ride started successfully',
            ride: updateRide,
        });
    } catch (error) {
        console.log("Error in start ride controller:", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// completed ride
const completeRide = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;
        const { rideId } = req.params;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: 'rideId parameter is required',
            });
        }

        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
        if (ride.driverId !== driverId) return res.status(403).json({ success: false, message: 'Not your ride' });
        if (ride.status !== 'STARTED') return res.status(400).json({ success: false, message: 'Ride has not started yet' });

        // Calculate final fare
        const fareData = calculateFare(ride.distance || 0, ride.duration || 0, ride.vehicleType, ride.surgeFactor || 1.0);

        // Complete ride in database
        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                actualFare: fareData.estimatedFare
            }
        });

        // Add earnings to driver profile
        await prisma.driverProfile.updateMany({
            where: { userId: driverId },
            data: {
                availability: 'ONLINE',
                totalEarnings: { increment: fareData.estimatedFare },
                totalRides: { increment: 1 }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Ride completed! 🎉',
            ride: updatedRide,
            earnings: fareData.estimatedFare
        });
    } catch (error) {
        console.log("Error in complete ride controller:", error.message);
        return res.status(500).json({ success: false, message: 'Failed to complete ride', error: error.message });
    }
};

// driver earnings
const getEarnings = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;

        const profile = await prisma.driverProfile.findUnique({
            where: { userId: driverId }
        });

        const recentRides = await prisma.ride.findMany({
            where: { driverId, status: 'COMPLETED' },
            orderBy: { completedAt: 'desc' },
            take: 10
        });

        const completedStats = await prisma.ride.aggregate({
            where: { driverId, status: 'COMPLETED' },
            _sum: { actualFare: true, estimatedFare: true },
            _count: { id: true }
        });

        const calculatedEarnings = completedStats._sum.actualFare ?? completedStats._sum.estimatedFare ?? 0;
        const totalEarnings = Math.max(profile?.totalEarnings || 0, calculatedEarnings);
        const totalRides = Math.max(profile?.totalRides || 0, completedStats._count.id || 0);

        return res.status(200).json({
            success: true,
            totalEarnings,
            totalRides,
            recentRides
        });
    } catch (error) {
        console.log("Error in get earnings controller:", error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch earnings', error: error.message });
    }
};

module.exports = { acceptedRide, startRide, completeRide, getEarnings };