// In a new file like image.controller.js
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { successResponse, errorResponse, badRequestResponse } = require('../utils/custom_response/responses');
const sharp = require('sharp');
const { Readable } = require('stream');

// File validation constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Upload timeout (5 minutes for large files)
const UPLOAD_TIMEOUT = 5 * 60 * 1000;

// Helper function to get file validation config
const getFileValidationConfig = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return {
      maxSize: MAX_IMAGE_SIZE,
      allowedTypes: ALLOWED_IMAGE_TYPES
    };
  } else if (mimetype.startsWith('video/')) {
    return {
      maxSize: MAX_VIDEO_SIZE,
      allowedTypes: ALLOWED_VIDEO_TYPES
    };
  } else if (mimetype.startsWith('audio/')) {
    return {
      maxSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_AUDIO_TYPES
    };
  } else {
    return {
      maxSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_DOCUMENT_TYPES
    };
  }
};

// Helper function to validate file
const validateFile = (file, allowedTypes, maxSize) => {
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
  }

  return { valid: true };
};

// Helper function to compress image
const compressImage = async (buffer, mimetype) => {
  let sharpInstance = null;
  try {
    sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    // Resize if image is too large
    let processedImage = sharpInstance;
    if (metadata.width > 1920) {
      processedImage = processedImage.resize(1920, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Compress based on format
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      return await processedImage.jpeg({ quality: 80, progressive: true }).toBuffer();
    } else if (mimetype === 'image/png') {
      return await processedImage.png({ compressionLevel: 9 }).toBuffer();
    } else if (mimetype === 'image/webp') {
      return await processedImage.webp({ quality: 80 }).toBuffer();
    }

    return buffer; // Return original if no compression applied
  } catch (error) {
    console.error('Error compressing image:', error);
    return buffer; // Return original on error
  } finally {
    // Cleanup sharp instance
    if (sharpInstance) {
      sharpInstance.destroy();
    }
  }
};

// Helper function to create upload stream with timeout
const uploadWithTimeout = (uploadPromise, timeout = UPLOAD_TIMEOUT) => {
  return Promise.race([
    uploadPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout exceeded')), timeout)
    )
  ]);
};

// Helper function to upload to Cloudinary via stream
const uploadToCloudinaryStream = (buffer, uploadOptions) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    // Handle stream errors
    uploadStream.on('error', (error) => {
      reject(error);
    });
    
    uploadStream.end(buffer);
  });
};

// Helper function to get Cloudinary upload options
const getCloudinaryUploadOptions = (file) => {
  const uploadOptions = {
    folder: file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') 
      ? 'course-content' 
      : 'course-thumbnails',
    quality: 'auto:good',
    fetch_format: 'auto'
  };

  if (file.mimetype.startsWith('video/')) {
    uploadOptions.resource_type = 'video';
    uploadOptions.chunk_size = 6000000;
    // Enable adaptive streaming for better delivery
    uploadOptions.eager = [
      { streaming_profile: 'hd', format: 'm3u8' }
    ];
    uploadOptions.eager_async = true;
  } else if (file.mimetype.startsWith('image/')) {
    uploadOptions.resource_type = 'image';
    // Add responsive breakpoints for CDN optimization
    uploadOptions.responsive_breakpoints = [
      {
        create_derived: true,
        bytes_step: 20000,
        min_width: 200,
        max_width: 1920,
        max_images: 5
      }
    ];
    uploadOptions.transformation = [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ];
  } else if (file.mimetype.startsWith('audio/')) {
    uploadOptions.resource_type = 'video';
  } else {
    uploadOptions.resource_type = 'raw';
    const fileExtension = file.originalname.split('.').pop();
    if (fileExtension) {
      uploadOptions.public_id = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
    }
  }

  return uploadOptions;
};


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return badRequestResponse('No file uploaded', 'BAD_REQUEST', 400, res);
    }

    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `thumbnails/${uuidv4()}.${fileExtension}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'  // Make the file publicly accessible
    };

    const command = new PutObjectCommand(params);
    const uploadResult = await s3.send(command);

    return successResponse({ 
      url: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${fileName}`,
      key: fileName
    }, res, 200, 'Image uploaded successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
  
exports.uploadImageCloudinary = async (req, res) => {
  let fileBuffer = null;
  let compressedBuffer = null;
  
  try {
    if (!req.file) {
      return badRequestResponse('No file uploaded', 'BAD_REQUEST', 400, res);
    }

    // Get validation config based on file type
    const validationConfig = getFileValidationConfig(req.file.mimetype);
    const validation = validateFile(req.file, validationConfig.allowedTypes, validationConfig.maxSize);
    
    if (!validation.valid) {
      return badRequestResponse(validation.error, 'BAD_REQUEST', 400, res);
    }

    // Get upload options
    const uploadOptions = getCloudinaryUploadOptions(req.file);

    // Compress image before upload if it's an image
    fileBuffer = req.file.buffer;
    if (req.file.mimetype.startsWith('image/')) {
      compressedBuffer = await compressImage(fileBuffer, req.file.mimetype);
      fileBuffer = compressedBuffer;
    }

    // Use stream for all uploads (more memory efficient)
    const uploadPromise = uploadToCloudinaryStream(fileBuffer, uploadOptions);
    const uploadResponse = await uploadWithTimeout(uploadPromise);

    // Prepare response with CDN-optimized URLs
    const response = {
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      format: uploadResponse.format,
      size: uploadResponse.bytes,
      width: uploadResponse.width,
      height: uploadResponse.height
    };

    // Add responsive breakpoints for images
    if (uploadResponse.responsive_breakpoints && uploadResponse.responsive_breakpoints.length > 0) {
      response.responsive_breakpoints = uploadResponse.responsive_breakpoints[0].breakpoints;
    }

    // Add streaming URL for videos
    if (uploadResponse.eager && uploadResponse.eager.length > 0) {
      response.streaming_url = uploadResponse.eager[0].secure_url;
    }

    return successResponse(response, res, 200, 'File uploaded successfully');
  } catch (error) {
    console.error('Error during file upload to Cloudinary:', error);
    
    // Handle specific error types
    if (error.message === 'Upload timeout exceeded') {
      return errorResponse('Upload timeout - file too large or slow connection', 'UPLOAD_TIMEOUT', 408, res);
    }
    
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  } finally {
    // Cleanup buffers to prevent memory leaks
    fileBuffer = null;
    compressedBuffer = null;
    if (req.file && req.file.buffer) {
      req.file.buffer = null;
    }
  }
};

exports.uploadMultipleImagesCloudinary = async (req, res) => {
  const uploadResults = [];
  const errors = [];
  const bufferCleanup = [];
  
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return badRequestResponse('No files uploaded', 'BAD_REQUEST', 400, res);
    }

    // Use environment variable or default to 3
    const MAX_CONCURRENT_UPLOADS = parseInt(process.env.MAX_CONCURRENT_UPLOADS) || 3;

    // Process files in batches
    for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = files.slice(i, i + MAX_CONCURRENT_UPLOADS);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          let fileBuffer = null;
          let compressedBuffer = null;
          
          try {
            // Get validation config based on file type
            const validationConfig = getFileValidationConfig(file.mimetype);
            const validation = validateFile(file, validationConfig.allowedTypes, validationConfig.maxSize);
            
            if (!validation.valid) {
              throw new Error(validation.error);
            }

            // Get upload options
            const uploadOptions = getCloudinaryUploadOptions(file);

            // Compress images before upload
            fileBuffer = file.buffer;
            if (file.mimetype.startsWith('image/')) {
              compressedBuffer = await compressImage(fileBuffer, file.mimetype);
              fileBuffer = compressedBuffer;
            }

            // Use streaming for all uploads with timeout
            const uploadPromise = uploadToCloudinaryStream(fileBuffer, uploadOptions);
            const result = await uploadWithTimeout(uploadPromise);

            // Prepare response
            const response = {
              originalName: file.originalname,
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              size: result.bytes,
              width: result.width,
              height: result.height
            };

            // Add responsive breakpoints for images
            if (result.responsive_breakpoints && result.responsive_breakpoints.length > 0) {
              response.responsive_breakpoints = result.responsive_breakpoints[0].breakpoints;
            }

            // Add streaming URL for videos
            if (result.eager && result.eager.length > 0) {
              response.streaming_url = result.eager[0].secure_url;
            }

            return response;
          } catch (error) {
            throw new Error(`${file.originalname}: ${error.message}`);
          } finally {
            // Cleanup buffers for this file
            fileBuffer = null;
            compressedBuffer = null;
            if (file.buffer) {
              bufferCleanup.push(file);
            }
          }
        })
      );

      // Separate successful uploads from errors
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          uploadResults.push(result.value);
        } else {
          errors.push({
            file: batch[index].originalname,
            error: result.reason.message
          });
        }
      });

      // Clear buffers after each batch to free memory
      bufferCleanup.forEach(file => {
        if (file.buffer) {
          file.buffer = null;
        }
      });
      bufferCleanup.length = 0;
    }

    // Return results with both successes and failures
    const response = {
      success: uploadResults.length,
      failed: errors.length,
      files: uploadResults
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return successResponse(
      response, 
      res, 
      errors.length > 0 && uploadResults.length === 0 ? 400 : 200,
      errors.length > 0 
        ? `${uploadResults.length} files uploaded successfully, ${errors.length} failed`
        : 'All files uploaded successfully'
    );
  } catch (error) {
    console.error('Error during multiple file upload:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  } finally {
    // Final cleanup of all remaining buffers
    bufferCleanup.forEach(file => {
      if (file.buffer) {
        file.buffer = null;
      }
    });
    
    if (req.files) {
      req.files.forEach(file => {
        if (file.buffer) {
          file.buffer = null;
        }
      });
    }
  }
};