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
  
      if (req.file.mimetype.startsWith('video/')) {
        uploadOptions.resource_type = 'video';  // Specify resource_type as 'video' for video files
      } else if (req.file.mimetype.startsWith('image/')) {
        uploadOptions.resource_type = 'image';  // Default to 'image' for image files
      } else {
        // return badRequestResponse('Only image and video files are allowed', 'BAD_REQUEST', 400, res);
        uploadOptions.resource_type = 'raw'
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
  
