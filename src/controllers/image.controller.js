// In a new file like image.controller.js
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { successResponse, errorResponse, badRequestResponse } = require('../utils/custom_response/responses');


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
    console.log('Received file:', req.file);  // Log the file object

    if (!req.file) {
      return badRequestResponse('No file uploaded', 'BAD_REQUEST', 400, res);
    }

    // Set up the upload options
    const uploadOptions = {
      folder: req.file.mimetype.startsWith('video/') ? 'course-content' : 'course-thumbnails', // Use different folders for video and image
    };

    // Determine the appropriate resource type
    if (req.file.mimetype.startsWith('video/')) {
      uploadOptions.resource_type = 'video';  // Specify resource_type as 'video' for video files
    } else if (req.file.mimetype.startsWith('image/')) {
      uploadOptions.resource_type = 'image';  // Default to 'image' for image files
    } else if (req.file.mimetype.startsWith('audio/')) {
      uploadOptions.resource_type = 'video';  // Use 'video' resource type for audio as Cloudinary recommends
    } else {
      uploadOptions.resource_type = 'raw';
      
      // For raw files, add the file extension to ensure correct handling
      const fileExtension = req.file.originalname.split('.').pop();
      if (fileExtension) {
        uploadOptions.public_id = `${Date.now()}.${fileExtension}`;  // Add timestamp to ensure uniqueness
      }
    }

    // Convert buffer to base64
    const fileStr = Buffer.from(req.file.buffer).toString('base64');
    const uploadStr = `data:${req.file.mimetype};base64,${fileStr}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(uploadStr, uploadOptions);

    return successResponse({
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
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

    const uploadResults = await Promise.all(files.map(async (file) => {
      // Set appropriate resource type based on mimetype
      let resourceType = 'raw';
      if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      } else if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.mimetype.startsWith('audio/')) {
        resourceType = 'video';  // Use 'video' resource type for audio files
      }

      const uploadOptions = {
        folder: file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') 
          ? 'course-content' 
          : 'course-thumbnails',
        resource_type: resourceType
      };

      // For raw files, add the file extension to ensure correct handling
      if (resourceType === 'raw') {
        const fileExtension = file.originalname.split('.').pop();
        if (fileExtension) {
          uploadOptions.public_id = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
        }
      }

      const fileStr = Buffer.from(file.buffer).toString('base64');
      const uploadStr = `data:${file.mimetype};base64,${fileStr}`;

      const result = await cloudinary.uploader.upload(uploadStr, uploadOptions);

      return {
        originalName: file.originalname,
        url: result.secure_url,
        public_id: result.public_id
      };
    }));

    return successResponse({
      files: uploadResults
    }, res, 200);
  } catch (error) {
    console.error('Error during multiple file upload:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};