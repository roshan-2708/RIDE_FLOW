// pricing of each vehicle

const FARE_CONFIG = {
    BIKE: {
        baseFare: 20,
        perKm: 8,
        perMin: 1,
        minFare: 30,
    },
    AUTO: {
        baseFare: 30,
        perKm: 12,
        perMin: 1.5,
        minFare: 50,
    },
    SEDAN: {
        baseFare: 50,
        perKm: 15,
        perMin: 2,
        minFare: 80,
    },
    SUV: {
        baseFare: 70,
        perKm: 20,
        perMin: 2.5,
        minFare: 120,
    },
    LUXURY: {
        baseFare: 100,
        perKm: 30,
        perMin: 4,
        minFare: 200,
    },
}

// calculate fare based on distance + time
const calculateFare = (distance, duration, vehicleType, surgeFactor = 1.0) => {
    const config = FARE_CONFIG[vehicleType];
    if (!config) throw new Error(`Invalid vehicle type : ${vehicleType}`);

    const distanceFare = distance * config.perKm;
    const timeFare = duration * config.perMin;
    const rawfare = config.baseFare + distanceFare + timeFare;
    const finalFare = Math.max(rawfare * surgeFactor, config.minFare);

    return {
        estimatedFare: finalFare,
        breakdown: {
            baseFare: config.baseFare,
            distanceFare: Math.ceil(distanceFare),
            timeFare: Math.ceil(timeFare),
            surgeFactor,
            total: Math.ceil(finalFare),
        }
    }
};

// get estimate for all vehicle type at once
const getAllVehicleEstimates = (distance, duration, surgeFactor = 1.0) => {
    const estimates = {};
    Object.keys(FARE_CONFIG).forEach(vehicleType => {
        estimates[vehicleType] = calculateFare(distance, duration, vehicleType, surgeFactor);
    });
    return estimates;
}

module.exports = {
    calculateFare,
    getAllVehicleEstimates
};


