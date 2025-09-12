const User = require('../models/user.model');
const { successResponse, badRequestResponse, internalServerErrorResponse } = require('../utils/custom_response/responses');


// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};



// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    // Find user by ID and exclude sensitive information
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate({
        path: 'enrolledCourses',
        select: 'title progress'
      })
      .populate({
        path: 'completedLessons',
        select: 'title courseId'
      });

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        notificationsEnabled: user.notificationsEnabled,
        preferredLanguage: user.preferredLanguage,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
        referralCode:user.referralCode,
        bio: user.bio,
        isAppliedForOneOnOne:user.isAppliedForOneOnOne,
        isOneOnOne:user.isOneOnOne,
        enrolledCourses: user.enrolledCourses,
        completedLessons: user.completedLessons,
        completedCoursesCount: user.completedLessons.length
      }
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { fullName, phone, preferredLanguage, notificationsEnabled , bio } = req.body;
    
    // Find user and update
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { 
        fullName, 
        phone,
        preferredLanguage,
        bio,
        notificationsEnabled
      }, 
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        isAppliedForOneOnOne:user.isAppliedForOneOnOne,
        preferredLanguage: user.preferredLanguage,
        notificationsEnabled: user.notificationsEnabled
      }
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Update user profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const { profile_image } = req.body;

    // Update user with new profile picture path
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { profilePicture: profile_image }, 
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({
      user: {
        id: user._id,
        profilePicture: user.profilePicture
      }
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Delete user profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { profilePicture: null }, 
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse(null, res,204,'Profile picture deleted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Update account language preference
exports.updateLanguagePreference = async (req, res) => {
  try {
    const { language } = req.body;
    
    // List of supported languages
    const supportedLanguages = ['English', 'German', 'Spanish', 'French', 'Dutch'];
    
    // Validate language
    if (!supportedLanguages.includes(language)) {
      return badRequestResponse('Unsupported language', 'BAD_REQUEST', 400, res);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { preferredLanguage: language }, 
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({
        id: user._id,
        preferredLanguage: user.preferredLanguage
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Toggle notifications
exports.toggleNotifications = async (req, res) => {
  try {
    const { enableNotifications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { notificationsEnabled: enableNotifications }, 
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({
        id: user._id,
        notificationsEnabled: user.notificationsEnabled
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};



// Delete user by email
exports.deleteUserByEmail = async (req, res) => {
  try {
    const { email } = req.body;  
    
    const user = await User.findOneAndDelete({ email });

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    return successResponse(null, res, 204, 'User deleted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


// Helper function to generate a unique referral code
function generateReferralCode() {
  // Generate a random 8-character alphanumeric code
  return Math.random().toString(36).substring(2, 6).toUpperCase() + 
         Math.random().toString(36).substring(2, 6).toUpperCase();
}


// New endpoint to get user's referrals
exports.getUserReferrals = async (req, res) => {
  try {
    const userId = req.user.id; 
    
    const user = await User.findById(userId)
      .populate('referrals', 'fullName email profilePicture isVerified createdAt');
    
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    if(!user.referralCode){
      user.referralCode = generateReferralCode();
      await user.save();
    }
    
    const referralData = {
      referralCode: user.referralCode,
      referralPoints: user.referralPoints,
      referrals: user.referrals,
      totalReferrals: user.referrals.length
    };
    
    return successResponse(referralData, res, 200, 'Referral information retrieved successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};



// Forgot password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id; 

    // Find user
    const user = await User.findById(userId);

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
exports.chagePasswordConfirm = async (req, res) => {
  try {
    const { code, password} = req.body;

    const userId = req.user.id; 

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

    return successResponse({ }, res, 200,"Password changed successfully");
  } catch (error) {
    return internalServerErrorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Tutor applies for one-on-one tutoring
exports.applyForOneOnOne = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    if (user.role !== 'tutor') {
      return badRequestResponse('Only tutors can apply for one-on-one sessions', 'FORBIDDEN', 403, res);
    }

    if (user.isAppliedForOneOnOne) {
      return badRequestResponse('You have already applied for one-on-one tutoring', 'CONFLICT', 409, res);
    }

    user.isAppliedForOneOnOne = true;

    await user.save();

    return successResponse(
      {
        isAppliedForOneOnOne: user.isAppliedForOneOnOne
      },
      res,
      200,
      'Application for one-on-one tutoring submitted successfully'
    );
  } catch (error) {
    console.error(error);
    return successResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};
