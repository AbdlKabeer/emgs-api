// In a new file like image.controller.js
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { successResponse, errorResponse, badRequestResponse } = require('../utils/custom_response/responses');
const sharp = require('sharp');

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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
  try {
    const sharpInstance = sharp(buffer);
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
  }
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
  try {
    if (!req.file) {
      return badRequestResponse('No file uploaded', 'BAD_REQUEST', 400, res);
    }

    // Validate file based on type
    let validation;
    let maxSize = MAX_FILE_SIZE;
    let allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

    if (req.file.mimetype.startsWith('image/')) {
      maxSize = MAX_IMAGE_SIZE;
      allowedTypes = ALLOWED_IMAGE_TYPES;
    } else if (req.file.mimetype.startsWith('video/')) {
      maxSize = MAX_VIDEO_SIZE;
      allowedTypes = ALLOWED_VIDEO_TYPES;
    }

    validation = validateFile(req.file, allowedTypes, maxSize);
    if (!validation.valid) {
      return badRequestResponse(validation.error, 'BAD_REQUEST', 400, res);
    }

    // Set up the upload options
    const uploadOptions = {
      folder: req.file.mimetype.startsWith('video/') ? 'course-content' : 'course-thumbnails',
      quality: 'auto:good', // Automatic quality optimization
      fetch_format: 'auto' // Automatic format optimization
    };

    // Determine the appropriate resource type
    if (req.file.mimetype.startsWith('video/')) {
      uploadOptions.resource_type = 'video';
      uploadOptions.chunk_size = 6000000; // 6MB chunks for large videos
    } else if (req.file.mimetype.startsWith('image/')) {
      uploadOptions.resource_type = 'image';
      uploadOptions.transformation = [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    } else if (req.file.mimetype.startsWith('audio/')) {
      uploadOptions.resource_type = 'video';
    } else {
      uploadOptions.resource_type = 'raw';
      const fileExtension = req.file.originalname.split('.').pop();
      if (fileExtension) {
        uploadOptions.public_id = `${Date.now()}.${fileExtension}`;
      }
    }

    // Compress image before upload if it's an image
    let fileBuffer = req.file.buffer;
    if (req.file.mimetype.startsWith('image/')) {
      fileBuffer = await compressImage(req.file.buffer, req.file.mimetype);
    }

    // Use stream for large files (more memory efficient)
    let uploadResponse;
    if (req.file.size > 5 * 1024 * 1024) { // 5MB threshold
      uploadResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });
    } else {
      // For smaller files, use base64
      const fileStr = Buffer.from(fileBuffer).toString('base64');
      const uploadStr = `data:${req.file.mimetype};base64,${fileStr}`;
      uploadResponse = await cloudinary.uploader.upload(uploadStr, uploadOptions);
    }

    return successResponse({
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      format: uploadResponse.format,
      size: uploadResponse.bytes,
      width: uploadResponse.width,
      height: uploadResponse.height
    }, res, 200, 'File uploaded successfully');
  } catch (error) {
    console.error('Error during file upload to Cloudinary:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

exports.uploadMultipleImagesCloudinary = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return badRequestResponse('No files uploaded', 'BAD_REQUEST', 400, res);
    }

    // Limit concurrent uploads to prevent memory issues
    const MAX_CONCURRENT_UPLOADS = 3;
    const uploadResults = [];
    const errors = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = files.slice(i, i + MAX_CONCURRENT_UPLOADS);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          try {
            // Validate file
            let maxSize = MAX_FILE_SIZE;
            let allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

            if (file.mimetype.startsWith('image/')) {
              maxSize = MAX_IMAGE_SIZE;
              allowedTypes = ALLOWED_IMAGE_TYPES;
            } else if (file.mimetype.startsWith('video/')) {
              maxSize = MAX_VIDEO_SIZE;
              allowedTypes = ALLOWED_VIDEO_TYPES;
            }

            const validation = validateFile(file, allowedTypes, maxSize);
            if (!validation.valid) {
              throw new Error(`${file.originalname}: ${validation.error}`);
            }

            // Set appropriate resource type based on mimetype
            let resourceType = 'raw';
            if (file.mimetype.startsWith('video/')) {
              resourceType = 'video';
            } else if (file.mimetype.startsWith('image/')) {
              resourceType = 'image';
            } else if (file.mimetype.startsWith('audio/')) {
              resourceType = 'video';
            }

            const uploadOptions = {
              folder: file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') 
                ? 'course-content' 
                : 'course-thumbnails',
              resource_type: resourceType,
              quality: 'auto:good',
              fetch_format: 'auto'
            };

            if (resourceType === 'raw') {
              const fileExtension = file.originalname.split('.').pop();
              if (fileExtension) {
                uploadOptions.public_id = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
              }
            }

            // Compress images before upload
            let fileBuffer = file.buffer;
            if (file.mimetype.startsWith('image/')) {
              fileBuffer = await compressImage(file.buffer, file.mimetype);
            }

            // Use streaming for large files
            let result;
            if (file.size > 5 * 1024 * 1024) {
              result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                  uploadOptions,
                  (error, uploadResult) => {
                    if (error) reject(error);
                    else resolve(uploadResult);
                  }
                );
                uploadStream.end(fileBuffer);
              });
            } else {
              const fileStr = Buffer.from(fileBuffer).toString('base64');
              const uploadStr = `data:${file.mimetype};base64,${fileStr}`;
              result = await cloudinary.uploader.upload(uploadStr, uploadOptions);
            }

            return {
              originalName: file.originalname,
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              size: result.bytes,
              width: result.width,
              height: result.height
            };
          } catch (error) {
            throw new Error(`${file.originalname}: ${error.message}`);
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
  }
};