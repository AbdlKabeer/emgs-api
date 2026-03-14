// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Authenticate user
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Token is invalid' });
    }
    
    // Add user to request
    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
      assignedRole: user.assignedRole // Include assignedRole for RBAC
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid' });
  }
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.roles && !req.user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Access denied, admin only' });
  }
  next();
};

// Check if user is tutor
exports.isTutor = (req, res, next) => {
  if (req.user.role !== 'tutor' && req.user.roles && !req.user.roles.includes('tutor')) { 
    return res.status(403).json({ message: 'Access denied, tutor only' });
  }
  next();
};