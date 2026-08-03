const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
    acceptedRide,
    startRide,
    completeRide,
    getEarnings
} = require('../controllers/driver.controller');

// All driver endpoints require authentication and DRIVER role
router.use(protect);
router.use(authorize('DRIVER'));

router.put('/accept/:rideId', acceptedRide);
router.put('/start/:rideId', startRide);
router.put('/complete/:rideId', completeRide);
router.get('/earnings', getEarnings);

module.exports = router;
