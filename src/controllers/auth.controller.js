const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const User = require('../models/user.model');
const { URLSearchParams } = require('url');
const { successResponse, badRequestResponse, internalServerErrorResponse } = require('../utils/custom_response/responses');



// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


// Helper function to generate a unique referral code
function generateReferralCode() {
  // Generate a random 8-character alphanumeric code
  return Math.random().toString(36).substring(2, 6).toUpperCase() + 
         Math.random().toString(36).substring(2, 6).toUpperCase();
}


// Register new user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone , userType, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return badRequestResponse('User already exists with this email', 'BAD_REQUEST', 400, res);
    }


    
    // Create new user
    const user = new User({
      fullName,
      email,
      password,
      phone,
      role:userType,
      referralCode: generateReferralCode(), 
    });


    // Handle referral if provided
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); 

    await user.save();

    // Send verification email with code
    try{
      await emailService.sendVerificationCodeEmail(user.email, user.fullName, verificationCode);
    }
    catch (error) {
      console.error('Error sending verification email:', error);
    }

    return successResponse({userId: user._id , code: verificationCode }, res, 201,  'User registered successfully. Please check your email to verify your account.');
  } catch (error) {
    console.error(error); // Log the error for debugging
    return internalServerErrorResponse(error.message, res);
  }
};



// Verify email with code
exports.verifyEmail = async (req, res) => {
  try {
    const { userId, verificationCode } = req.body; 

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Check if verification code is correct and not expired
    if (
      user.verificationCode !== verificationCode || 
      !user.verificationCodeExpiry || 
      user.verificationCodeExpiry < new Date()
    ) {
      return badRequestResponse('Invalid or expired verification code', 'INVALID_CODE', 400, res);
    }

    // Mark user as verified and clear verification code
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;

    await user.save();

    return successResponse({ message: 'Email verified successfully' }, res);
  } catch (error) {
    return badRequestResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



/**
 * Register a new tutor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.registerTutor = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      // qualifications,
      // specializations,
      // teachingLanguages,
      // bio
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Create new tutor user
    const newTutor = new User({
      fullName,
      email,
      password,
      phone,
      role: 'tutor',
      // qualifications,
      // specializations,
      // teachingLanguages,
      // bio,
      // tutorApplicationStatus: 'pending',
      // tutorApplicationDate: new Date()
    });

    // Generate verification code
    const verificationCode = crypto.randomBytes(32).toString('hex');
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setHours(verificationCodeExpiry.getHours() + 24);

    newTutor.verificationCode = verificationCode;
    newTutor.verificationCodeExpiry = verificationCodeExpiry;

    await newTutor.save();

    // Send verification email
    await sendVerificationEmail(newTutor.email, verificationCode);


    return successResponse(
      { userId: newTutor._id }, res, 201, 'Tutor registered successfully. Please verify your email.');
  } catch (error) {
    console.error('Error registering tutor:', error);
    return internalServerErrorResponse(error.message, res);
  }
};


// Resend verification code
exports.resendVerificationCode = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    await user.save();

    // Send new verification email
    await emailService.sendVerificationCodeEmail(user.email, user.fullName, verificationCode);

    return successResponse({ message: 'New verification code sent' }, res);
  } catch (error) {
    return badRequestResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// Verify email
exports.verifyEmailToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Update user
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({ message: 'Email verified successfully' }, res);
  } catch (error) {
    return badRequestResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);
    console.log("Password provided:", password);
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }


    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    console.log("Password match result:", isMatch);
    if (!isMatch) {
      return badRequestResponse('Invalid credentials', 'BAD_REQUEST', 400, res);
    }


    // Check if user is verified
    if (!user.isVerified) {
      return badRequestResponse('Please verify your email first', 'UNAUTHORIZED', 401, res);
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return successResponse({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    user.passwordVerificationCode = verificationCode;
    user.passwordVerificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); 

    await user.save();

    // Send verification email with code
    try{
      await emailService.sendVerificationCodeEmail(user.email, user.fullName, verificationCode);
    }
    catch (error) {
      console.error('Error sending verification email:', error);
    }

    return successResponse(
      {
        code: verificationCode,
        userID: user._id
      },
      res,
      200,
      `Password reset email sent` 
    );
  } catch (error) {
    return internalServerErrorResponse(error.message,res, 500);
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { code, password,userId} = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Check if verification code is correct and not expired
    if (
      user.passwordVerificationCode !== code || 
      !user.passwordVerificationCodeExpiry || 
      user.passwordVerificationCodeExpiry < new Date()
    ) {
      return badRequestResponse('Invalid or expired verification code', 'INVALID_CODE', 400, res);
    }

    // Update password
    user.password = password;
    await user.save();

    return successResponse({ message: 'Password reset successfully' }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Google login route (GET request)
exports.googleLogin = (req, res) => {
  const { redirect_url } = req.query;
  if (!redirect_url) {
    return badRequestResponse('redirect_url param is required', 'BAD_REQUEST', 400, res);
  }

  // Prepare the state parameter (used to send additional data like redirect URL)
  const state = JSON.stringify({ frontend_redirect_url: redirect_url });

  // Prepare Google OAuth 2.0 URL
  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/auth';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state: encodeURIComponent(state),
  });

  // Redirect user to Google OAuth 2.0 authorization URL
  res.redirect(`${googleAuthUrl}?${params.toString()}`);
};

// Google callback route (GET request)
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return badRequestResponse('Missing required parameters', 'BAD_REQUEST', 400, res);
    }

    // Decode the state parameter to get the frontend redirect URL
    const { frontend_redirect_url } = JSON.parse(decodeURIComponent(state));

    // Step 1: Exchange authorization code for access token
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenData = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await axios.post(tokenUrl, tokenData);
    const { access_token } = tokenResponse.data;

    // Step 2: Fetch user info from Google API using access token
    const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userInfoResponse.data;

    // Step 3: Check if user exists in the database
    let user = await User.findOne({ email: userInfo.email });

    if (user) {
      // User already exists, generate JWT tokens
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

      // Redirect user to frontend with auth tokens
      return res.redirect(`${frontend_redirect_url}?authToken=${accessToken}&refreshToken=${refreshToken}`);
    } else {
      // User doesn't exist, create a new user
      user = new User({
        email: userInfo.email,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        isGoogle: true,
      });

      await user.save();

      // Generate JWT tokens
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

      // Redirect user to frontend with auth tokens
      return res.redirect(`${frontend_redirect_url}?authToken=${accessToken}&refreshToken=${refreshToken}`);
    }
  } catch (error) {
    console.error(error);
    return internalServerErrorResponse('Something went wrong', res);
  }
};
