const prisma = require('../config/db');


const submitRating = async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId;
        const { rideId } = req.params;
        const { rating, comment, tags } = req.body;

        // Rating is required (1 to 5), comment and tags are optional
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating is required and must be an integer between 1 and 5',
            });
        }

        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                driver: { select: { id: true } },
                rider: { select: { id: true } },
            }
        });

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found'
            });
        }

        if (ride.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'You can only rate completed rides'
            });
        }

        const isRider = ride.riderId === userId;
        const isDriver = ride.driverId === userId;

        if (!isRider && !isDriver) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to rate this ride',
            });
        }

        const existingRating = await prisma.rating.findUnique({
            where: {
                rideId_fromUserId: {
                    rideId,
                    fromUserId: userId,
                }
            },
        });

        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'You have already rated this ride',
            });
        }

        const toUserId = isRider ? ride.driverId : ride.riderId;

        if (!toUserId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to identify recipient user for this ride',
            });
        }

        const sanitizedTags = Array.isArray(tags) ? tags : [];

        const result = await prisma.$transaction(async (tx) => {
            // Create rating record
            const newRating = await tx.rating.create({
                data: {
                    rideId,
                    fromUserId: userId,
                    toUserId,
                    rating: Math.round(rating),
                    comment: comment ? comment.trim() : null,
                    tags: sanitizedTags
                },
                include: {
                    fromUser: {
                        select: {
                            id: true,
                            name: true,
                            profilePhoto: true,
                        }
                    }
                }
            });

            // If rating was given to a driver, recalculate driverProfile rating
            if (isRider) {
                const driverRating = await tx.rating.aggregate({
                    where: { toUserId },
                    _avg: { rating: true },
                    _count: { id: true }
                });

                const averageRating = driverRating._avg.rating || 5.0;
                await tx.driverProfile.updateMany({
                    where: { userId: toUserId },
                    data: {
                        rating: Number(averageRating.toFixed(2))
                    }
                });
            }

            return newRating;
        });

        // Real-time Socket Event
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${toUserId}`).emit('NEW_RATING_RECEIVED', {
                rideId,
                rating: result.rating,
                comment: result.comment,
                from: result.fromUser.name
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Thank you for your feedback! Rating submitted successfully.',
            data: result
        });

    } catch (error) {
        console.error('Error in submit rating controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// get rating of a specific ride
const getRideRatingStatus = async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId;
        const { rideId } = req.params;

        const ratings = await prisma.rating.findMany({
            where: { rideId },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        profilePhoto: true,
                        role: true
                    }
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        profilePhoto: true,
                        role: true
                    }
                }
            }
        });

        const myRating = ratings.find((r) => r.fromUserId === userId) || null;
        const partnerRating = ratings.find((r) => r.fromUserId !== userId) || null;

        return res.status(200).json({
            success: true,
            hasRated: !!myRating,
            myRating,
            partnerRating: partnerRating ? {
                rating: partnerRating.rating,
                comment: partnerRating.comment,
                tags: partnerRating.tags,
                createdAt: partnerRating.createdAt
            } : null
        });

    } catch (error) {
        console.error('Error fetching ride rating status:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// get user ratings summary
const getMyRating = async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

        const [ratings, aggregate] = await Promise.all([
            prisma.rating.findMany({
                where: {
                    toUserId: userId,
                },
                include: {
                    fromUser: {
                        select: {
                            name: true,
                            profilePhoto: true
                        }
                    },
                    ride: {
                        select: {
                            id: true,
                            pickupAddress: true,
                            dropoffAddress: true,
                            completedAt: true,
                            requestedAt: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.rating.aggregate({
                where: { toUserId: userId },
                _avg: { rating: true },
                _count: { rating: true },
            })
        ]);

        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratings.forEach(r => {
            if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
        });

        return res.status(200).json({
            success: true,
            averageRating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(2)) : 5.0,
            totalRatings: aggregate._count.rating || 0,
            breakdown,
            page,
            recentRatings: ratings
        });

    } catch (error) {
        console.error('Error in getMyRating controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};



const submitAppRating = async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId;
        const userRole = req.userRole || req.user?.role || 'RIDER';
        const { rating, feedback, category, platform, appVersion } = req.body;

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating is required and must be between 1 and 5'
            });
        }

        const appRating = await prisma.appRating.upsert({
            where: { userId },
            create: {
                userId,
                role: userRole,
                rating: Math.round(rating),
                feedback: feedback ? feedback.trim() : null,
                category: category || 'GENERAL',
                platform: platform || 'WEB',
                appVersion: appVersion || '1.0.0'
            },
            update: {
                role: userRole,
                rating: Math.round(rating),
                feedback: feedback ? feedback.trim() : null,
                category: category || 'GENERAL',
                platform: platform || 'WEB',
                appVersion: appVersion || '1.0.0'
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Thank you for rating RideFlow!',
            data: appRating
        });
    } catch (error) {
        console.error('Error submitting app rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit app rating',
            error: error.message
        });
    }
};

const getMyAppRating = async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId;
        const myAppRating = await prisma.appRating.findUnique({
            where: { userId }
        });

        return res.status(200).json({
            success: true,
            hasRated: !!myAppRating,
            appRating: myAppRating
        });
    } catch (error) {
        console.error('Error fetching my app rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch app review',
            error: error.message
        });
    }
};

const getAppRatingStats = async (req, res) => {
    try {
        const [aggregate, ratingsList] = await Promise.all([
            prisma.appRating.aggregate({
                _avg: { rating: true },
                _count: { rating: true }
            }),
            prisma.appRating.findMany({
                where: { feedback: { not: null } },
                include: {
                    user: { select: { name: true, profilePhoto: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        ]);

        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        const allRatings = await prisma.appRating.findMany({ select: { rating: true } });
        allRatings.forEach(r => {
            if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
        });

        return res.status(200).json({
            success: true,
            averageRating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(2)) : 5.0,
            totalReviews: aggregate._count.rating || 0,
            breakdown,
            recentReviews: ratingsList
        });
    } catch (error) {
        console.error('Error fetching app rating stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch app rating statistics',
            error: error.message
        });
    }
};

module.exports = {
    // Post-ride
    submitRating,
    getRideRatingStatus,
    getMyRating,
    // Overall app
    submitAppRating,
    getMyAppRating,
    getAppRatingStats
};