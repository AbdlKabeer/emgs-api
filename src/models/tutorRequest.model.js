const mongoose = require('mongoose');

const tutorRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  bio: { type: String },
  preferredLanguage: { type: String },
  proficiency: { type: String },
  certificateType: { type: String },
  certificate: { type: String },
  introduction: { type: String },
  otherCertificateType: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionMessage: { type: String, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const TutorRequest = mongoose.model('TutorRequest', tutorRequestSchema);
module.exports = TutorRequest;
