const prisma = require('../config/db');

// Get platform stats
exports.getStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalRiders,
            totalDrivers,
            pendingDrivers,
            approvedDrivers,
            totalRide,
            activeRides,
            completedRides,
            cancelledRides,
            totalCollection
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'RIDER' } }),
            prisma.user.count({ where: { role: 'DRIVER' } }),
            prisma.driverProfile.count({ where: { status: 'PENDING' } }),
            prisma.driverProfile.count({ where: { status: 'APPROVED' } }),
            prisma.ride.count(),
            prisma.ride.count({ where: { status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'STARTED'] } } }),
            prisma.ride.count({ where: { status: 'COMPLETED' } }),
            prisma.ride.count({ where: { status: 'CANCELED' } }),
            prisma.payment.aggregate({
                where: { status: { in: ['SUCCESSFUL', 'COMPLETED'] } },
                _sum: { amount: true }
            })
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalRiders,
                totalDrivers,
                pendingDrivers,
                approvedDrivers,
                totalRide,
                activeRides,
                completedRides,
                cancelledRides,
                totalCollection: totalCollection._sum.amount ?? 0
            }
        });

    } catch (error) {
        console.log("Error in get stats controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Get all pending driver applications
exports.getPendingApplications = async (req, res) => {
    try {
        const pendingDrivers = await prisma.driverProfile.findMany({
            where: { status: 'PENDING' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profilePhoto: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return res.status(200).json({
            success: true,
            message: 'Pending driver applications fetched successfully',
            data: pendingDrivers,
            count: pendingDrivers.length
        });

    } catch (error) {
        console.log("Error in get pending applications controller", error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Get all drivers with optional status filter
exports.getAllDrivers = async (req, res) => {
    try {
        const { status } = req.query;

        const where = status ? { status } : {};

        const drivers = await prisma.driverProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profilePhoto: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            message: 'All drivers fetched successfully',
            data: drivers,
            count: drivers.length
        });

    } catch (error) {
        console.log('Error in get all drivers controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Get a single driver application by userId or driverProfile id
exports.getSingleApplication = async (req, res) => {
    try {
        const { id } = req.params;

        const driver = await prisma.driverProfile.findFirst({
            where: {
                OR: [
                    { id: id },
                    { userId: id }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profilePhoto: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Single driver application fetched successfully',
            data: driver
        });

    } catch (error) {
        console.log('Error in get single application controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Approve driver application
exports.approveApplication = async (req, res) => {
    try {
        const { driverId } = req.params;

        const profile = await prisma.driverProfile.findFirst({
            where: {
                OR: [
                    { id: driverId },
                    { userId: driverId }
                ]
            }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const updatedProfile = await prisma.driverProfile.update({
            where: { id: profile.id },
            data: {
                status: 'APPROVED',
                availability: 'ONLINE',
                user: {
                    update: {
                        role: 'DRIVER'
                    }
                }
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, role: true }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Driver application approved successfully',
            data: updatedProfile
        });

    } catch (error) {
        console.log('Error in approve application controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Reject driver application
exports.rejectApplication = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { reason } = req.body;

        const profile = await prisma.driverProfile.findFirst({
            where: {
                OR: [
                    { id: driverId },
                    { userId: driverId }
                ]
            }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const updatedProfile = await prisma.driverProfile.update({
            where: { id: profile.id },
            data: {
                status: 'REJECTED',
                availability: 'OFFLINE'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Driver application rejected successfully',
            data: { ...updatedProfile, rejectReason: reason || 'Document not valid' }
        });

    } catch (error) {
        console.log('Error in reject application controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Suspend driver
exports.suspendDriver = async (req, res) => {
    try {
        const { driverId } = req.params;

        const profile = await prisma.driverProfile.findFirst({
            where: {
                OR: [
                    { id: driverId },
                    { userId: driverId }
                ]
            }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const updatedProfile = await prisma.driverProfile.update({
            where: { id: profile.id },
            data: {
                status: 'SUSPENDED',
                availability: 'OFFLINE'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Driver suspended successfully',
            data: updatedProfile
        });

    } catch (error) {
        console.log('Error in suspend driver controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Get all users
exports.getAllUser = async (req, res) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = role ? { role } : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    driverProfile: true,
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        return res.status(200).json({
            success: true,
            message: 'All users fetched successfully',
            data: users,
            count: total
        });
    } catch (error) {
        console.log('Error in get all users controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

// Get all rides
exports.getAllRides = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = status ? { status } : {};

        const [rides, total] = await Promise.all([
            prisma.ride.findMany({
                where,
                include: {
                    rider: {
                        select: { id: true, name: true, phone: true, email: true }
                    },
                    driver: {
                        select: { id: true, name: true, phone: true, email: true }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: { requestedAt: "desc" }
            }),
            prisma.ride.count({ where }),
        ]);

        return res.status(200).json({
            success: true,
            message: 'All rides fetched successfully',
            data: rides,
            count: total
        });
    } catch (error) {
        console.log('Error in get all rides controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue',
        });
    }
};

const { getFareConfig, updateFareConfig, calculateFare } = require('../utils/fare.utils');

// Get Fare Configurations
exports.getFareRates = async (req, res) => {
    try {
        const fares = getFareConfig();
        return res.status(200).json({
            success: true,
            message: 'Fare rates fetched successfully',
            data: fares
        });
    } catch (error) {
        console.log('Error in get fare rates controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue'
        });
    }
};

// Update Fare Configurations
exports.updateFareRates = async (req, res) => {
    try {
        const { rates } = req.body;
        if (!rates || typeof rates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid rates payload'
            });
        }

        const updated = updateFareConfig(rates);
        return res.status(200).json({
            success: true,
            message: 'Fare rates updated successfully',
            data: updated
        });
    } catch (error) {
        console.log('Error in update fare rates controller', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server issue'
        });
    }
};