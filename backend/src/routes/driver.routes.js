const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const {
    submitOnboarding,
    getDriverProfile,
    updateAvailability,
    acceptedRide,
    startRide,
    completeRide,
    getEarnings
} = require('../controllers/driver.controller');

// All driver endpoints require authentication
router.use(protect);

// Driver onboarding submission (Available to any authenticated user)
router.post(
    '/onboarding',
    upload.fields([
        { name: 'licensePhoto', maxCount: 1 },
        { name: 'rcPhoto', maxCount: 1 },
        { name: 'rc', maxCount: 1 },
        { name: 'vehiclePhoto', maxCount: 1 }
    ]),
    submitOnboarding
);

// Profile and availability
router.get('/profile', getDriverProfile);
router.put('/availability', updateAvailability);

// Operations requiring active DRIVER role
router.put('/accept/:rideId', authorize('DRIVER'), acceptedRide);
router.put('/start/:rideId', authorize('DRIVER'), startRide);
router.put('/complete/:rideId', authorize('DRIVER'), completeRide);
router.get('/earnings', authorize('DRIVER'), getEarnings);

module.exports = router;


