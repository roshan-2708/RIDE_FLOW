const { Server } = require('socket.io');

// store connected users
const connectedUsers = new Map();

// store driver location
const driverLocations = new Map();

const initializeSocket = (ioOrServer) => {
    let io;
    if (ioOrServer instanceof Server || (ioOrServer && typeof ioOrServer.on === 'function')) {
        io = ioOrServer;
    } else {
        io = new Server(ioOrServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
    }

    io.on('connection', (socket) => {
        console.log(`socket is connected ${socket.id}`);

        // user join with their id
        socket.on('user:join', (userId) => {
            connectedUsers.set(userId, socket.id);
            socket.userId = userId;
            console.log(`user joined : ${userId} -> ${socket.id}`);
        });

        // driver update gps location
        socket.on('driver:update-location', (data) => {
            const { driverId, lat, lng } = data;

            // save driver location
            driverLocations.set(driverId, { lat, lng, lastUpdate: new Date() });

            // broadcast to all riders watching this driver
            socket.broadcast.emit('driver:location:update', {
                driverId, lat, lng
            });
        });

        // driver accept ride -> notify rider
        socket.on('ride:driver-accepted', (data) => {
            const { riderId, rideId, driverInfo } = data;
            const rideSocketId = connectedUsers.get(riderId);

            if (rideSocketId) {
                io.to(rideSocketId).emit('ride:accepted', {
                    message: `Driver accepted your ride!`,
                    rideId,
                    driverInfo
                });
            }
            io.to(`ride_${rideId}`).emit('ride:status-changed', {
                status: 'ACCEPTED',
                rideId,
                driverInfo
            });
        });

        // driver arrived at pickup point
        socket.on('ride:driver-arrived-at-pickup', (data) => {
            const rideId = typeof data === 'string' ? data : data?.rideId;
            const riderId = data?.riderId;
            if (riderId) {
                const riderSocketId = connectedUsers.get(riderId);
                if (riderSocketId) {
                    io.to(riderSocketId).emit('ride:driver-arrived', {
                        message: 'Your driver has arrived at the pickup location!',
                        rideId
                    });
                }
            }
            io.to(`ride_${rideId}`).emit('ride:status-changed', {
                status: 'ARRIVING',
                message: 'Driver arrived at pickup location',
                rideId
            });
        });

        // driver start ride -> notify rider
        socket.on('ride:driver-started', (data) => {
            const { riderId, rideId } = data || {};
            const actualRideId = rideId || data;
            if (riderId) {
                const riderSocketId = connectedUsers.get(riderId);
                if (riderSocketId) {
                    io.to(riderSocketId).emit('ride:started', {
                        message: 'Your ride has started',
                        rideId: actualRideId
                    });
                }
            }
            io.to(`ride_${actualRideId}`).emit('ride:status-changed', {
                status: 'STARTED',
                message: 'Ride started and in progress',
                rideId: actualRideId
            });
        });

        // driver completed ride -> notify rider
        socket.on('ride:driver-completed', (data) => {
            const { riderId, rideId } = data || {};
            const actualRideId = rideId || data;
            if (riderId) {
                const riderSocketId = connectedUsers.get(riderId);
                if (riderSocketId) {
                    io.to(riderSocketId).emit('ride:completed', {
                        message: 'Your ride has completed',
                        rideId: actualRideId
                    });
                }
            }
            io.to(`ride_${actualRideId}`).emit('ride:status-changed', {
                status: 'COMPLETED',
                message: 'Ride completed successfully',
                rideId: actualRideId
            });
        });

        // disconnect
        socket.on('disconnect', () => {
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                driverLocations.delete(socket.userId);
                console.log(`user disconnected ${socket.userId}`);
            }
        });

        // real time ride room join & leave
        socket.on('ride:join-room', (rideId) => {
            socket.join(`ride_${rideId}`);
            console.log(`Joined room : ${rideId}`);
        });

        socket.on('ride:join', (rideId) => {
            socket.join(`ride_${rideId}`);
            console.log(`Joined room (ride:join) : ${rideId}`);
        });

        socket.on('ride:leave-room', (rideId) => {
            socket.leave(`ride_${rideId}`);
            console.log(`Left room : ${rideId}`);
        });

        socket.on('ride:cancel', (data) => {
            const { rideId, reason } = typeof data === 'object' ? data : { rideId: data };
            io.to(`ride_${rideId}`).emit('ride:status-changed', {
                status: 'CANCELED',
                message: `Ride cancelled : ${reason || 'Cancelled by user'}`,
                rideId
            });
        });


        // user send message
        socket.on('chat:send-message', (data) => {
            const { rideId, message, senderId, sendId, senderName, senderRole } = data;
            const actualSenderId = senderId || sendId;
            // broadcast to everyone in room
            io.to(`ride_${rideId}`).emit('chat:new-message', {
                senderId: actualSenderId,
                senderName,
                senderRole,
                message,
                timestamp: new Date().toISOString()
            });
        });
    });
    return io;
};

// get a driver's current location
const getDriverLocation = (driverId) => driverLocations.get(driverId);

module.exports = initializeSocket;
module.exports.initializeSocket = initializeSocket;
module.exports.getDriverLocation = getDriverLocation;


