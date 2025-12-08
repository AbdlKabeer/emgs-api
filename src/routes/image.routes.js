// In a new file like image.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../controllers/image.controller');
const { authenticate, isTutor } = require('../middleware/auth.middleware');


// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit for all file types
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    console.log(file);
    cb(null, true); // Allow all files
  }
});

// POST route for uploading image
router.post('/upload', [upload.single('file')], imageController.uploadImage);

// POST route for uploading image/video to Cloudinary
router.post('/upload-cloudinary', [upload.single('file')], imageController.uploadImageCloudinary);

router.post('/upload-cloudinary-multiple', [upload.array('files', 10)], imageController.uploadMultipleImagesCloudinary);

// router.post('/upload-cloudinary', [authenticate, isTutor, upload.single('file')], imageController.uploadImageCloudinary);

module.exports = router;
