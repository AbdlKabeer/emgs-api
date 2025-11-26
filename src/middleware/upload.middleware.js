const multer = require('multer');
const path = require('path');

// Use memory storage for better control - we'll handle cleanup in controllers
// For very large files, consider switching to disk storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Accept image files only for profile pictures
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

// Configure multer with limits and better error handling
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit (matches controller limits)
    files: 10 // Maximum 10 files at once
  }
});

module.exports = upload;