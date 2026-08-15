const multer = require('multer');
const path = require('path');

// Store files in memory buffer instead of local disk
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB per file
    },
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedFileTypes.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG, and WEBP are allowed.'));
        }
    }
});

module.exports = upload;
