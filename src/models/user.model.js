const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['user','tutor', 'admin'], default: 'user' },
    tutorType: {
    type: String,
      enum: ['emgs', 'partner'],
      default: 'partner'
    },
    profilePicture: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    bio: { type: String, default: '' },
    preferredLanguage: { 
      type: String, 
      enum: ['English', 'German', 'Spanish', 'French', 'Dutch'], 
      default: 'English' 
    },
    verificationCode: {
      type: String,
      default: null
    },
    verificationCodeExpiry: {
      type: Date,
      default: null
    },
    isOneOnOne :{
      type: Boolean,
      default: false
    },
    servicePrice:{
      type: Number,
      default:0
    },
    // forget password and reset password otp
    passwordVerificationCode: {
      type: String,
      default: null
    },
    passwordVerificationCodeExpiry: {
      type: Date,
      default: null
    },

    notificationsEnabled: { type: Boolean, default: true },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }],
    certificateType: { type: String, default: null },
    certificate: { type: String, default: null },
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
    serviceInquiries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' }],
    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        review: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralPointDisbursed: { type: Boolean, default: false },
    referralPoints: { type: Number, default: 0 },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    averageRating: { type: Number, default: 0 },
    isEmgsTutor: { type: Boolean, default: false },

  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) return 0;
  
  const sum = this.ratings.reduce((total, ratingObj) => total + ratingObj.rating, 0);
  return parseFloat((sum / this.ratings.length).toFixed(1));
};

const User = mongoose.model('User', userSchema);
module.exports = User;








