const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express'); 
const swaggerSpec = require('./config/swagger'); 

require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const courseRoutes = require('./routes/course.routes');
const lessonRoutes = require('./routes/lesson.routes');
const serviceRoutes = require('./routes/service.routes');
const crmRoutes = require('./routes/crm.routes');
const adminRoutes = require('./routes/admin.routes');
const progressRoutes = require('./routes/progress.routes');
const notificationRoutes = require('./routes/notification.routes');
const quizRoutes = require('./routes/quiz.routes');
const faqRoutes = require('./routes/faq.routes');
const paymentRoutes = require('./routes/payment.routes');
const imageRoutes = require('./routes/image.routes');
const tutorRoutes = require('./routes/tutor.routes'); 
const newTutorRoutes = require('./routes/new-flow/tutor.routes'); 
const supportRoutes = require('./routes/support.routes'); 
const walletRoutes = require('./routes/wallet.routes'); 
const waitlistRoutes = require('./routes/waitlist.routes');
const chatRoutes = require('./routes/new-flow/chat.routes');
const chatSocket = require('./socket/chatSocket');

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded.userId; // Adjust based on your JWT payload structure
    socket.user = decoded;
    
    console.log(`Socket authenticated for user: ${socket.userId}`);
    next();
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Apply middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize chat socket after DB connection
    chatSocket(io);
    console.log('Chat socket initialized');
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (Socket ID: ${socket.id})`);
  
  // Store user's socket ID for potential future use
  socket.join(`user_${socket.userId}`);
  
  // Handle socket disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.userId}, Reason: ${reason}`);
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    socketConnections: io.engine.clientsCount
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/faqs', faqRoutes);
app.use('/api/v1/file', imageRoutes);
app.use('/api/v1/tutors', tutorRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);

// V2 Routes
app.use('/api/v2/tutors', newTutorRoutes);
app.use('/api/v2/chat', chatRoutes); // Changed from 'chats' to 'chat' for consistency

// Swagger documentation (uncomment when ready)
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value'
    });
  }

  // Default error response
  res.status(err.status || 500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io enabled`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
});

// Export server for testing
module.exports = { app, server, io };