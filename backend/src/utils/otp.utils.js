const crypto = require('crypto');


const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
};

module.exports = { generateOTP, getOTPExpiry };