const axios = require('axios');

// Calculate distance & duration using FREE OSRM (OpenStreetMap Routing)
const getDistanceAndDuration = async (originLat, originLng, destLat, destLng) => {
    try {
        // OSRM - completely free, no API key needed!
        const url = `http://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;

        const response = await axios.get(url, { timeout: 5000 });

        if (response.data.code === 'Ok') {
            const route = response.data.routes[0];
            return {
                distance: parseFloat((route.distance / 1000).toFixed(2)), // meters → km
                duration: Math.ceil(route.duration / 60)                   // seconds → minutes
            };
        }

        throw new Error('OSRM failed');

    } catch (error) {
        console.log('⚠️ OSRM failed, using direct distance calculation...');

        // Fallback: Haversine formula (straight-line distance)
        return calculateHaversineDistance(originLat, originLng, destLat, destLng);
    }
};

// Haversine formula - calculates straight-line distance between 2 GPS points
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = parseFloat((R * c).toFixed(2));

    // Estimate duration: assume 30 km/h average speed in city
    const duration = Math.ceil((distance / 30) * 60);

    return { distance, duration };
};

// Calculate distance in km between two coordinate points
const getDistanceInKm = (lat1, lng1, lat2, lng2) => {
    return calculateHaversineDistance(lat1, lng1, lat2, lng2).distance;
};

module.exports = { 
    getDistanceAndDuration,
    calculateHaversineDistance,
    getDistanceInKm
};