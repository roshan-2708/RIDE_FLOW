const prisma = require('../config/db');
const { getDistanceAndDuration } = require('../services/map.services');
const { calculateFare, getAllVehicleEstimates } = require('../utils/fare.utils');

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
        });

        return res.status(201).json({
            success: true,
            message: 'Ride booked! Looking for drivers...',
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
                driver: {
                    include: { driverProfile: true }
                }
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

// get available (pending) rides for drivers
const getAvailableRides = async (req, res) => {
    try {
        const rides = await prisma.ride.findMany({
            where: {
                status: 'REQUESTED',
                driverId: null
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
            },
            orderBy: { requestedAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            rides
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

module.exports = {
    getFareEstimates,
    bookRide,
    getMyRides,
    getSingleRide,
    getAvailableRides
};