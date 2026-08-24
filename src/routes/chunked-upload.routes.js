const express = require('express');
const router = express.Router();
const multer = require('multer');
const chunkedUploadController = require('../controllers/chunked-upload.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Configure multer for chunk storage (memory storage for chunks)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (to safely accommodate 5MB chunks + multipart overhead)
  }
});

// Initialize chunked upload session
router.post('/init', chunkedUploadController.initChunkedUpload);

// Upload individual chunk
router.post('/chunk', upload.single('chunk'), chunkedUploadController.uploadChunk);

// Complete upload and merge chunks
router.post('/complete', chunkedUploadController.completeChunkedUpload);

// Get upload status
router.get('/status/:uploadId', chunkedUploadController.getUploadStatus);

// Cancel upload
router.delete('/cancel/:uploadId', chunkedUploadController.cancelUpload);

module.exports = router;
