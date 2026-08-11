const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
    getStats,
    getPendingApplications,
    getAllDrivers,
    getSingleApplication,
    approveApplication,
    rejectApplication,
    suspendDriver,
    getAllUser,
    getAllRides,
    getFareRates,
    updateFareRates
} = require('../controllers/admin.controller');

// All admin routes require authentication and ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// Platform Analytics & Stats
router.get('/stats', getStats);

// Drivers Management & Approval Pipeline
router.get('/drivers/pending', getPendingApplications);
router.get('/drivers', getAllDrivers);
router.get('/drivers/:id', getSingleApplication);
router.put('/drivers/:driverId/approve', approveApplication);
router.put('/drivers/:driverId/reject', rejectApplication);
router.put('/drivers/:driverId/suspend', suspendDriver);

// Users Management
router.get('/users', getAllUser);

// Rides Management
router.get('/rides', getAllRides);

// Fare Rates & Pricing Configuration
router.get('/fares', getFareRates);
router.put('/fares', updateFareRates);

module.exports = router;

