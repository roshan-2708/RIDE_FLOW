const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    getFareEstimates,
    bookRide,
    getMyRides,
    getSingleRide
} = require('../controllers/ride.controller');

// All ride endpoints require authentication
router.use(protect);

router.post('/estimate', getFareEstimates);
router.post('/book', bookRide);
router.get('/my-rides', getMyRides);
router.get('/:id', getSingleRide);

module.exports = router;
