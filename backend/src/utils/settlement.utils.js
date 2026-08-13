const PLATFORM_COMMISSION_PERCENT = 15; // 15% platform commission, 85% driver share

/**
 * Calculate fare breakdown between Driver and Platform
 * @param {number} totalAmount 
 * @param {number} commissionPercent 
 */
const CalculateSettlementSplit = (totalAmount, commissionPercent = PLATFORM_COMMISSION_PERCENT) => {
    const amount = Number(totalAmount) || 0;
    const platform = Math.round((amount * (commissionPercent / 100)) * 100) / 100;
    const driver = Math.round((amount - platform) * 100) / 100;

    return {
        totalAmount: amount,
        platformFee: platform,
        driverEarning: driver
    };
};

module.exports = { CalculateSettlementSplit, PLATFORM_COMMISSION_PERCENT };
