const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer directly to Cloudinary
 * @param {Buffer} fileBuffer - 
 * @param {String} folder - 
 * @returns {Promise<Object>} 
 */
const uploadToCloudinary = (fileBuffer, folder = 'rideflow/documents') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto', 
                format: 'webp',       
                quality: 'auto:good'  
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(error);
                }
                resolve(result);
            }
        );

        // Stream the file buffer into Cloudinary
        uploadStream.end(fileBuffer);
    });
};

module.exports = {
    cloudinary,
    uploadToCloudinary
};
