const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { successResponse, errorResponse, badRequestResponse } = require('../utils/custom_response/responses');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Temporary directory for chunk storage
const CHUNKS_DIR = path.join(__dirname, '../../temp/chunks');
const UPLOAD_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// File validation constants
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
// Add allowed audio types
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];

// Ensure chunks directory exists
const ensureChunksDirExists = async () => {
  try {
    await mkdir(CHUNKS_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

// Initialize chunked upload
exports.initChunkedUpload = async (req, res) => {
  try {
    const { filename, filesize, mimetype, totalChunks } = req.body;

    if (!filename || !filesize || !mimetype || !totalChunks) {
      return badRequestResponse(
        'Missing required fields: filename, filesize, mimetype, totalChunks',
        'BAD_REQUEST',
        400,
        res
      );
    }

    // Validate file type
    const allowedTypes = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES];
    if (!allowedTypes.includes(mimetype)) {
      return badRequestResponse(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        'BAD_REQUEST',
        400,
        res
      );
    }

    // Validate file size
    if (filesize > MAX_FILE_SIZE) {
      return badRequestResponse(
        `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
        'BAD_REQUEST',
        400,
        res
      );
    }

    // Generate unique upload ID
    const uploadId = uuidv4();
    
    // Create upload session metadata
    const uploadSession = {
      uploadId,
      filename,
      filesize,
      mimetype,
      totalChunks: parseInt(totalChunks),
      receivedChunks: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + UPLOAD_TIMEOUT
    };

    // Ensure chunks directory exists
    await ensureChunksDirExists();

    // Store session metadata (in production, use Redis or database)
    const sessionPath = path.join(CHUNKS_DIR, `${uploadId}.json`);
    await writeFile(sessionPath, JSON.stringify(uploadSession));

    return successResponse(
      {
        uploadId,
        message: 'Upload session initialized',
        expiresIn: UPLOAD_TIMEOUT / 1000 // seconds
      },
      res,
      200,
      'Chunked upload initialized successfully'
    );
  } catch (error) {
    console.error('Error initializing chunked upload:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Upload individual chunk
exports.uploadChunk = async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;

    if (!uploadId || chunkIndex === undefined) {
      return badRequestResponse(
        'Missing required fields: uploadId, chunkIndex',
        'BAD_REQUEST',
        400,
        res
      );
    }

    if (!req.file) {
      return badRequestResponse('No chunk uploaded', 'BAD_REQUEST', 400, res);
    }

    // Load session metadata
    const sessionPath = path.join(CHUNKS_DIR, `${uploadId}.json`);
    
    let uploadSession;
    try {
      const sessionData = await fs.promises.readFile(sessionPath, 'utf8');
      uploadSession = JSON.parse(sessionData);
    } catch (error) {
      return badRequestResponse('Invalid or expired upload session', 'BAD_REQUEST', 400, res);
    }

    // Check if session expired
    if (Date.now() > uploadSession.expiresAt) {
      await cleanup(uploadId);
      return badRequestResponse('Upload session expired', 'BAD_REQUEST', 400, res);
    }

    // Validate chunk index
    const chunkNum = parseInt(chunkIndex);
    if (chunkNum < 0 || chunkNum >= uploadSession.totalChunks) {
      return badRequestResponse('Invalid chunk index', 'BAD_REQUEST', 400, res);
    }

    // Check if chunk already received
    if (uploadSession.receivedChunks.includes(chunkNum)) {
      return successResponse(
        {
          uploadId,
          chunkIndex: chunkNum,
          status: 'already_received',
          progress: (uploadSession.receivedChunks.length / uploadSession.totalChunks * 100).toFixed(2)
        },
        res,
        200,
        'Chunk already received'
      );
    }

    // Save chunk to disk
    const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_chunk_${chunkNum}`);
    await writeFile(chunkPath, req.file.buffer);

    // Update session metadata
    uploadSession.receivedChunks.push(chunkNum);
    uploadSession.receivedChunks.sort((a, b) => a - b);
    await writeFile(sessionPath, JSON.stringify(uploadSession));

    const progress = (uploadSession.receivedChunks.length / uploadSession.totalChunks * 100).toFixed(2);
    const isComplete = uploadSession.receivedChunks.length === uploadSession.totalChunks;

    return successResponse(
      {
        uploadId,
        chunkIndex: chunkNum,
        receivedChunks: uploadSession.receivedChunks.length,
        totalChunks: uploadSession.totalChunks,
        progress: parseFloat(progress),
        isComplete
      },
      res,
      200,
      isComplete ? 'All chunks received' : 'Chunk uploaded successfully'
    );
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Complete upload and merge chunks
exports.completeChunkedUpload = async (req, res) => {
  let mergedFilePath = null;
  
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return badRequestResponse('Missing uploadId', 'BAD_REQUEST', 400, res);
    }

    // Load session metadata
    const sessionPath = path.join(CHUNKS_DIR, `${uploadId}.json`);
    
    let uploadSession;
    try {
      const sessionData = await fs.promises.readFile(sessionPath, 'utf8');
      uploadSession = JSON.parse(sessionData);
    } catch (error) {
      return badRequestResponse('Invalid upload session', 'BAD_REQUEST', 400, res);
    }

    // Verify all chunks received
    if (uploadSession.receivedChunks.length !== uploadSession.totalChunks) {
      return badRequestResponse(
        `Missing chunks. Received ${uploadSession.receivedChunks.length}/${uploadSession.totalChunks}`,
        'BAD_REQUEST',
        400,
        res
      );
    }

    // Merge chunks
    mergedFilePath = path.join(CHUNKS_DIR, `${uploadId}_merged`);
    
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_chunk_${i}`);
      const chunkData = await fs.promises.readFile(chunkPath);
      
      if (i === 0) {
        await writeFile(mergedFilePath, chunkData);
      } else {
        await appendFile(mergedFilePath, chunkData);
      }
      
      // Delete chunk after merging
      await unlink(chunkPath);
    }

    // Upload merged file to Cloudinary
    const uploadOptions = {
      folder: uploadSession.mimetype.startsWith('video/') ? 'course-content' : 'course-thumbnails',
      resource_type: uploadSession.mimetype.startsWith('video/') ? 'video' : 'image',
      public_id: `${Date.now()}_${path.parse(uploadSession.filename).name}`,
      chunk_size: 6000000
    };

    // Add detailed logging to completeChunkedUpload
    console.log('Starting completeChunkedUpload for uploadId:', uploadId);
    console.log('Upload session metadata:', uploadSession);

    // Log chunk merging progress
    console.log(`Merging ${uploadSession.totalChunks} chunks for uploadId: ${uploadId}`);

    // Log Cloudinary upload options
    console.log('Cloudinary upload options:', uploadOptions);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      fs.createReadStream(mergedFilePath).pipe(uploadStream);
    });

    // Log Cloudinary upload result
    console.log('Cloudinary upload result:', uploadResult);

    // Cleanup
    await cleanup(uploadId);

    return successResponse(
      {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        size: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        resource_type: uploadResult.resource_type
      },
      res,
      200,
      'File uploaded successfully'
    );
  } catch (error) {
    console.error('Error completing chunked upload:', error);
    
    // Cleanup on error
    if (req.body.uploadId) {
      await cleanup(req.body.uploadId);
    }
    
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get upload status
exports.getUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;

    if (!uploadId) {
      return badRequestResponse('Missing uploadId', 'BAD_REQUEST', 400, res);
    }

    // Load session metadata
    const sessionPath = path.join(CHUNKS_DIR, `${uploadId}.json`);
    
    try {
      const sessionData = await fs.promises.readFile(sessionPath, 'utf8');
      const uploadSession = JSON.parse(sessionData);

      const progress = (uploadSession.receivedChunks.length / uploadSession.totalChunks * 100).toFixed(2);
      const isComplete = uploadSession.receivedChunks.length === uploadSession.totalChunks;
      const isExpired = Date.now() > uploadSession.expiresAt;

      return successResponse(
        {
          uploadId,
          filename: uploadSession.filename,
          receivedChunks: uploadSession.receivedChunks.length,
          totalChunks: uploadSession.totalChunks,
          progress: parseFloat(progress),
          isComplete,
          isExpired,
          missingChunks: Array.from(
            { length: uploadSession.totalChunks }, 
            (_, i) => i
          ).filter(i => !uploadSession.receivedChunks.includes(i))
        },
        res,
        200,
        'Upload status retrieved'
      );
    } catch (error) {
      return badRequestResponse('Upload session not found', 'BAD_REQUEST', 400, res);
    }
  } catch (error) {
    console.error('Error getting upload status:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Cancel upload
exports.cancelUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;

    if (!uploadId) {
      return badRequestResponse('Missing uploadId', 'BAD_REQUEST', 400, res);
    }

    await cleanup(uploadId);

    return successResponse(
      { uploadId },
      res,
      200,
      'Upload cancelled and cleaned up'
    );
  } catch (error) {
    console.error('Error cancelling upload:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Cleanup helper function
async function cleanup(uploadId) {
  try {
    const sessionPath = path.join(CHUNKS_DIR, `${uploadId}.json`);
    const mergedFilePath = path.join(CHUNKS_DIR, `${uploadId}_merged`);

    // Delete session metadata
    try {
      await unlink(sessionPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Delete merged file
    try {
      await unlink(mergedFilePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Delete all chunks
    const files = await fs.promises.readdir(CHUNKS_DIR);
    const chunkFiles = files.filter(f => f.startsWith(`${uploadId}_chunk_`));
    
    for (const file of chunkFiles) {
      try {
        await unlink(path.join(CHUNKS_DIR, file));
      } catch (error) {
        // Ignore errors
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Periodic cleanup of expired sessions (call this via cron or scheduler)
exports.cleanupExpiredSessions = async () => {
  try {
    const files = await fs.promises.readdir(CHUNKS_DIR);
    const sessionFiles = files.filter(f => f.endsWith('.json'));

    for (const sessionFile of sessionFiles) {
      try {
        const sessionPath = path.join(CHUNKS_DIR, sessionFile);
        const sessionData = await fs.promises.readFile(sessionPath, 'utf8');
        const session = JSON.parse(sessionData);

        if (Date.now() > session.expiresAt) {
          const uploadId = session.uploadId;
          await cleanup(uploadId);
          console.log(`Cleaned up expired session: ${uploadId}`);
        }
      } catch (error) {
        console.error(`Error processing session file ${sessionFile}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during periodic cleanup:', error);
  }
};
