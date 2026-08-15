const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    submitRating,
    getRideRatingStatus,
    getMyRating,
    submitAppRating,
    getMyAppRating,
    getAppRatingStats
} = require('../controllers/rating.controller');


// Overall App rating summary (can be viewed on landing page / app info)
router.get('/app/stats', getAppRatingStats);

// ─── AUTHENTICATED ROUTES ─────────────────────────
router.use(protect);

// 1. Post-Ride Ratings (Rider & Driver)
router.post('/ride/:rideId', submitRating);
router.get('/ride/:rideId', getRideRatingStatus);
router.get('/my-ratings', getMyRating);

// 2. Overall App Ratings (Rider & Driver)
router.post('/app', submitAppRating);
router.get('/app/me', getMyAppRating);

module.exports = router;
