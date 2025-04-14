// In a new file like image.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../controllers/image.controller');
const { authenticate, isTutor } = require('../middleware/auth.middleware');


// Configure multer for memory storage
const storage = multer.memoryStorage();

// const upload = multer({ 
//   storage,
//   limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for both images and videos (can adjust as needed)
//   fileFilter: (req, file, cb) => {
//     // Accept only image or video files
//     console.log(file)
//     if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image and video files are allowed'), false); // Reject non-image/video files
//     }
//   }
// });

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for all file types (can adjust as needed)
  fileFilter: (req, file, cb) => {
    console.log(file);
    cb(null, true); // Allow all files
  }
});

// POST route for uploading image
router.post('/upload', [upload.single('file')], imageController.uploadImage);

// POST route for uploading image/video to Cloudinary
router.post('/upload-cloudinary', [upload.single('file')], imageController.uploadImageCloudinary);
// router.post('/upload-cloudinary', [authenticate, isTutor, upload.single('file')], imageController.uploadImageCloudinary);

module.exports = router;
