const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,          // e.g., 'smtp.gmail.com'
  port: process.env.EMAIL_PORT,          // e.g., 587
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,        // your email
    pass: process.env.EMAIL_PASSWORD     // your email password or app password
  }
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('Email server connection error:', error);
  } else {
    console.log('Email server connection established successfully');
  }
}).catch((error) => {
  console.error('Email server verification failed:', error);
});

module.exports = transporter;