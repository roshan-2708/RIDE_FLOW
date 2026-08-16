const prisma = require('../config/db');
const { getDistanceAndDuration, calculateHaversineDistance } = require('../services/map.services');
const { calculateFare, getAllVehicleEstimates } = require('../utils/fare.utils');
const { notifyNearbyDrivers, getDriverLocation } = require('../sockets');
const { redisClient } = require('../config/redis');

// get fare estimates
const getFareEstimates = async (req, res) => {
    try {
        const {
            pickUpLat,
            pickUpLng,
            dropLat,
            dropLng,
            vehicleType
        } = req.body;

        if (!pickUpLat || !pickUpLng || !dropLat || !dropLng) {
            return res.status(400).json({
                success: false,
                message: 'Pickup and drop coordinates (pickUpLat, pickUpLng, dropLat, dropLng) are required',
            });
        }

        // calculate distance & duration
        const { distance, duration } = await getDistanceAndDuration(
            parseFloat(pickUpLat), parseFloat(pickUpLng),
            parseFloat(dropLat), parseFloat(dropLng)
        );

        // calculate estimates
        const estimate = vehicleType ? {
            [vehicleType]: calculateFare(distance, duration, vehicleType)
        } : getAllVehicleEstimates(distance, duration);

        return res.status(200).json({
            success: true,
            message: "Fare estimates fetched successfully",
            data: {
                distance,
                duration,
                estimate
            }
        });
    } catch (error) {
        console.log("Error in get fare estimate controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// book a ride
const bookRide = async (req, res) => {
    try {
        const riderId = req.userId || req.user?.userId;

        const {
            pickUpLat,
            pickUpLng,
            dropLat,
            dropLng,
            pickUpAddress,
            dropAddress,
            vehicleType,
        } = req.body;

        if (!pickUpLat || !pickUpLng || !dropLat || !dropLng || !vehicleType) {
            return res.status(400).json({
                success: false,
                message: 'All fields (pickUpLat, pickUpLng, dropLat, dropLng, vehicleType) are required'
            });
        }

        // get distance & duration
        const { distance, duration } = await getDistanceAndDuration(
            parseFloat(pickUpLat), parseFloat(pickUpLng),
            parseFloat(dropLat), parseFloat(dropLng)
        );

        // calculate fare 
        const fareData = calculateFare(distance, duration, vehicleType);

        // create ride in database matching Prisma schema
        const ride = await prisma.ride.create({
            data: {
                riderId,
                vehicleType,
                estimatedFare: fareData.estimatedFare,
                distance,
                duration,
                pickupLat: parseFloat(pickUpLat),
                pickupLng: parseFloat(pickUpLng),
                pickupAddress: pickUpAddress || '',
                dropoffLat: parseFloat(dropLat),
                dropoffLng: parseFloat(dropLng),
                dropoffAddress: dropAddress || '',
                status: 'REQUESTED',
            },
            include: {
                rider: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profilePhoto: true
                    }
                }
            }
        });

        // Dispatch real-time socket notification ONLY to drivers within 5km radius
        const io = req.app.get('io');
        if (io) {
            notifyNearbyDrivers(io, ride, 5);
        }

        return res.status(201).json({
            success: true,
            message: 'Ride booked! Looking for drivers within 5km radius...',
            ride,
            farebreakdown: fareData.breakdown
        });
    } catch (error) {
        console.log("Error in book ride controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// get my rides
const getMyRides = async (req, res) => {
    try {
        const riderId = req.userId || req.user?.userId;

        const rides = await prisma.ride.findMany({
            where: { riderId },
            include: {
                driver: {
                    include: { driverProfile: true }
                }
            },
            orderBy: { requestedAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            rides
        });

    } catch (error) {
        console.log("Error in get my rides controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// get single ride
const getSingleRide = async (req, res) => {
    try {
        const { id } = req.params;

        const ride = await prisma.ride.findUnique({
            where: { id },
            include: {
                rider: {
                    select: { id: true, name: true, phone: true, email: true, profilePhoto: true }
                },
                driver: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        profilePhoto: true,
                        driverProfile: true
                    }
                },
                rating: true,
                payments: true
            }
        });

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found'
            });
        }


        return res.status(200).json({
            success: true,
            ride
        });

    } catch (error) {
        console.log("Error in get single ride controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// get available (pending) rides for drivers within 5km radius
const getAvailableRides = async (req, res) => {
    try {
        const driverId = req.userId || req.user?.userId;

        // 1. Fetch driver profile
        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: driverId }
        });

        // 2. Extract driver coordinates (priority: query params -> socket live cache -> driver profile)
        let lat = req.query.lat ? parseFloat(req.query.lat) : null;
        let lng = req.query.lng ? parseFloat(req.query.lng) : null;

        if (isNaN(lat) || isNaN(lng) || lat === null || lng === null) {
            const socketLoc = getDriverLocation ? getDriverLocation(driverId) : null;
            lat = socketLoc?.lat ?? driverProfile?.currentLat;
            lng = socketLoc?.lng ?? driverProfile?.currentLng;
        }

        // 3. If driver location cannot be determined, inform client to supply GPS
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return res.status(200).json({
                success: true,
                locationRequired: true,
                message: 'GPS location required to discover rides within 5km radius.',
                radiusKm: 5,
                rides: []
            });
        }

        // 4. Query all requested rides that match driver's vehicle type (if applicable)
        const whereClause = {
            status: 'REQUESTED',
            driverId: null
        };

        if (driverProfile?.vehicleType) {
            whereClause.vehicleType = driverProfile.vehicleType;
        }

        const pendingRides = await prisma.ride.findMany({
            where: whereClause,
            include: {
                rider: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profilePhoto: true
                    }
                }
            },
            orderBy: { requestedAt: 'desc' }
        });

        // 5. Filter rides within 5km radius using Haversine formula
        const MAX_RADIUS_KM = 5.0;
        const ridesWithinRadius = [];

        for (const ride of pendingRides) {
            if (typeof ride.pickupLat === 'number' && typeof ride.pickupLng === 'number') {
                const { distance, duration } = calculateHaversineDistance(
                    lat,
                    lng,
                    ride.pickupLat,
                    ride.pickupLng
                );

                if (distance <= MAX_RADIUS_KM) {
                    ridesWithinRadius.push({
                        ...ride,
                        distanceToPickup: distance, // km to pickup
                        etaToPickup: duration       // minutes to pickup
                    });
                }
            }
        }

        // Sort by nearest pickup first
        ridesWithinRadius.sort((a, b) => a.distanceToPickup - b.distanceToPickup);

        return res.status(200).json({
            success: true,
            radiusKm: MAX_RADIUS_KM,
            driverLocation: { lat, lng },
            totalFound: ridesWithinRadius.length,
            rides: ridesWithinRadius
        });

    } catch (error) {
        console.log("Error in get available rides controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// cancel ride
const cancelRide = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const userId = req.userId || req.user?.userId;

        const ride = await prisma.ride.findUnique({
            where: { id }
        });

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found'
            });
        }

        if (ride.riderId !== userId && ride.driverId !== userId) {
            return res.status(403).json({
                success: false,
                message: "you can't cancel this ride "
            });
        }

        if (['COMPLETED', 'CANCELED'].includes(ride.status)) {
            return res.status(403).json({
                success: false,
                message: "ride is already completed or cancelled"
            });
        }

        const updateRide = await prisma.ride.update({
            where: { id },
            data: {
                status: 'CANCELED',
                cancelledAt: new Date(),
                cancelReason: reason || 'Canceled by user'
            }
        });

        return res.status(200).json({
            success: true,
            message: "ride cancel successfully",
            ride: updateRide
        })


    } catch (error) {
        console.error("Error in cancel ride controller : -", error);
        return res.status(500).json({
            success: false,
            message: "Internal server issue",
        });
    }
}

module.exports = {
    getFareEstimates,
    bookRide,
    getMyRides,
    getSingleRide,
    getAvailableRides,
    cancelRide
};
