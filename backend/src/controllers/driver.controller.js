const prisma = require('../config/db');
const { calculateFare } = require('../utils/fare.utils');

// accepted ride
const acceptedRide = async (req, res) => {
    try {
        const driverId = req.user.userId;
        const { rideId } = req.params;

        // ATOMIC TRANSACTION — only 1 driver can win!
        const result = await prisma.$transaction(async (tx) => {

            // Step 1: Lock the ride row and check status
            const ride = await tx.ride.findUnique({
                where: { id: rideId }
            });

            if (!ride) throw new Error('RIDE_NOT_FOUND');
            if (ride.status !== 'REQUESTED') throw new Error('RIDE_ALREADY_TAKEN');
            if (ride.driverId) throw new Error('RIDE_ALREADY_TAKEN');

            // Step 2: Check driver has no active ride
            const activeRide = await tx.ride.findFirst({
                where: {
                    driverId,
                    status: { in: ['ACCEPTED', 'STARTED'] }
                }
            });
            if (activeRide) throw new Error('DRIVER_BUSY');

            // Step 3: Atomically update ride + driver status
            const updatedRide = await tx.ride.update({
                where: {
                    id: rideId,
                    status: 'REQUESTED' // ← double check inside transaction
                },
                data: {
                    driverId,
                    status: 'ACCEPTED',
                    acceptedAt: new Date()
                }
            });

            // update driver status
            await tx.driverProfile.updateMany({
                where: { userId: driverId },
                data: { availability: 'ON_RIDE' }
            });

            return updatedRide;
        });

        return res.status(200).json({
            success: true,
            message: 'Ride accepted!',
            ride: result
        });

    } catch (error) {
        if (error.message === 'RIDE_ALREADY_TAKEN') {
            return res.status(409).json({
                success: false,
                message: 'Sorry! Another driver accepted this ride first. Try another ride.'
            });
        }
        if (error.message === 'DRIVER_BUSY') {
            return res.status(400).json({
                success: false,
                message: 'You already have an active ride!'
            });
        }
        console.error('Accept ride error:', error);
        return res.status(500).json({ success: false, message: 'Failed to accept ride' });
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

// get driver profile
const getDriverProfile = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;
        const profile = await prisma.driverProfile.findUnique({
            where: { userId: driverId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, profilePhoto: true }
                }
            }
        });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }
        return res.status(200).json({ success: true, profile });
    } catch (error) {
        console.log("Error in get driver profile:", error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch driver profile', error: error.message });
    }
};

// update driver availability
const updateAvailability = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;
        const { availability, lat, lng } = req.body;

        const profile = await prisma.driverProfile.findUnique({
            where: { userId: driverId }
        });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        if (availability === 'ONLINE' && profile.status !== 'APPROVED') {
            return res.status(403).json({
                success: false,
                message: `Cannot go online. Your profile status is ${profile.status}.`
            });
        }

        const dataToUpdate = {};
        if (availability) dataToUpdate.availability = availability;
        if (typeof lat === 'number') dataToUpdate.currentLat = lat;
        if (typeof lng === 'number') dataToUpdate.currentLng = lng;

        const updated = await prisma.driverProfile.update({
            where: { userId: driverId },
            data: dataToUpdate
        }); 

        return res.status(200).json({
            success: true,
            message: `Availability updated to ${updated.availability}`,
            profile: updated
        });
    } catch (error) {
        console.log("Error in update availability:", error.message);
        return res.status(500).json({ success: false, message: 'Failed to update availability', error: error.message });
    }
};

// Driver Onboarding / Application submission
const submitOnboarding = async (req, res) => {

    try {
        const userId = req.userId || req.user?.userId;
        const {
            licenseNumber,
            vehicleType,
            vehiclePlate,
            vehicleLicensePlate,
            vehicleModel,
            vehicleColor
        } = req.body;

        const plate = (vehiclePlate || vehicleLicensePlate || '').trim().toUpperCase();
        const licNum = (licenseNumber || '').trim().toUpperCase();

        // Check required fields
        if (!licNum || !vehicleType || !plate || !vehicleModel || !vehicleColor) {
            return res.status(400).json({
                success: false,
                message: 'All fields (licenseNumber, vehicleType, vehiclePlate, vehicleModel, vehicleColor) are required'
            });
        }

        // Validate vehicleType against Enum
        const validVehicleTypes = ['AUTO', 'BIKE', 'SEDAN', 'SUV', 'LUXURY'];
        const normalizedVehicleType = vehicleType.toUpperCase();
        if (!validVehicleTypes.includes(normalizedVehicleType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid vehicle type. Must be one of: ${validVehicleTypes.join(', ')}`
            });
        }

        // Retrieve file paths from multer or body
        const licensePhoto = req.files?.licensePhoto?.[0]
            ? `/uploads/documents/${req.files.licensePhoto[0].filename}`
            : req.body.licensePhoto;

        const rcPhoto = (req.files?.rcPhoto?.[0] || req.files?.rc?.[0])
            ? `/uploads/documents/${(req.files.rcPhoto?.[0] || req.files.rc?.[0]).filename}`
            : (req.body.rcPhoto || req.body.rc);

        const vehiclePhoto = req.files?.vehiclePhoto?.[0]
            ? `/uploads/documents/${req.files.vehiclePhoto[0].filename}`
            : req.body.vehiclePhoto;

        if (!licensePhoto || !rcPhoto || !vehiclePhoto) {
            return res.status(400).json({
                success: false,
                message: 'All document photos (licensePhoto, rcPhoto, vehiclePhoto) are required'
            });
        }

        // Check unique licenseNumber or vehiclePlate used by another user
        const existingPlate = await prisma.driverProfile.findFirst({
            where: {
                vehiclePlate: plate,
                NOT: { userId }
            }
        });
        if (existingPlate) {
            return res.status(409).json({
                success: false,
                message: 'This vehicle license plate is already registered by another driver.'
            });
        }

        const existingLicense = await prisma.driverProfile.findFirst({
            where: {
                licenseNumber: licNum,
                NOT: { userId }
            }
        });
        if (existingLicense) {
            return res.status(409).json({
                success: false,
                message: 'This driver license number is already registered by another driver.'
            });
        }

        // Upsert driver profile
        const profile = await prisma.driverProfile.upsert({
            where: { userId },
            create: {
                userId,
                licenseNumber: licNum,
                licensePhoto,
                vehicleType: normalizedVehicleType,
                vehiclePlate: plate,
                vehicleModel,
                vehicleColor,
                vehiclePhoto,
                rcPhoto,
                status: 'PENDING',
                availability: 'OFFLINE'
            },
            update: {
                licenseNumber: licNum,
                licensePhoto,
                vehicleType: normalizedVehicleType,
                vehiclePlate: plate,
                vehicleModel,
                vehicleColor,
                vehiclePhoto,
                rcPhoto,
                status: 'PENDING',
                availability: 'OFFLINE'
            }
        });

        // Ensure user role is DRIVER
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'DRIVER' }
        });

        return res.status(200).json({
            success: true,
            message: 'Driver onboarding submitted successfully! Your application is under admin review.',
            profile
        });

    } catch (error) {
        console.error('Error in submitOnboarding controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while submitting onboarding',
            error: error.message
        });
    }
};

module.exports = {
    acceptRide: acceptedRide,
    acceptedRide,
    startRide,
    completeRide,
    getEarnings,
    getDriverProfile,
    updateAvailability,
    submitOnboarding
};


