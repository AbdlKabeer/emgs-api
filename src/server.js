// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const socketIo = require('socket.io');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const swaggerUi = require('swagger-ui-express'); 
// const swaggerSpec = require('./config/swagger'); 

// require('dotenv').config();

// // Import routes
// const authRoutes = require('./routes/auth.routes');
// const chatSocket = require('./socket/chatSocket');
// const accountRoutes = require('./routes/account.routes');
// const courseRoutes = require('./routes/course.routes');
// const lessonRoutes = require('./routes/lesson.routes');
// const serviceRoutes = require('./routes/service.routes');
// const crmRoutes = require('./routes/crm.routes');
// const adminRoutes = require('./routes/admin.routes');
// const progressRoutes = require('./routes/progress.routes');
// const notificationRoutes = require('./routes/notification.routes');
// const quizRoutes = require('./routes/quiz.routes');
// const faqRoutes = require('./routes/faq.routes');
// const paymentRoutes = require('./routes/payment.routes');
// const imageRoutes = require('./routes/image.routes');
// const tutorRoutes = require('./routes/tutor.routes'); 
// const newTutorRoutes = require('./routes/new-flow/tutor.routes'); 
// const supportRoutes = require('./routes/support.routes'); 
// const walletRoutes = require('./routes/wallet.routes'); 
// const waitlistRoutes = require('./routes/waitlist.routes'); // Import waitlist routes
// const chatRoutes = require('./routes/new-flow/chat.routes');
// const studentRoutes = require('./routes/new-flow/user.routes');
// // const chatSocket = require('./socket/chatSocket');

// // Initialize express app
// const app = express();

// // Apply middleware
// app.use(cors());
// app.use(helmet());
// app.use(morgan('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// // Routes
// app.use('/api/v2/auth', authRoutes);
// app.use('/api/v2/account', accountRoutes);
// app.use('/api/v2/courses', courseRoutes);
// app.use('/api/v2/lessons', lessonRoutes);
// app.use('/api/v2/services', serviceRoutes);
// app.use('/api/v2/crm', crmRoutes);
// app.use('/api/v2/admin', adminRoutes);
// app.use('/api/v2/progress', progressRoutes);
// app.use('/api/v2/notifications', notificationRoutes);
// app.use('/api/v2/quizzes', quizRoutes);
// app.use('/api/v2/payment', paymentRoutes);
// app.use('/api/v2/faqs', faqRoutes);
// app.use('/api/v2/file', imageRoutes);
// app.use('/api/v1/tutors', tutorRoutes);
// app.use('/api/v2/support', supportRoutes);
// app.use('/api/v2/wallet', walletRoutes);
// app.use('/api/v2/waitlist', waitlistRoutes); // Add waitlist routes


// app.use('/api/v2/student', studentRoutes);
// app.use('/api/v2/tutors', newTutorRoutes); // Add waitlist routes
// app.use('/api/v2/chat', chatRoutes); 
// // app.use('/api/v1/waitlist', ); // Add waitlist routes
// // app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); 

// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

// // app.use('/api/payments', paymentRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send({ message: 'Something went wrong!', error: err.message });
// });

// // Start server
// const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http'); // ✅ Needed for attaching Socket.IO
const { Server } = require('socket.io');
const dotenv = require('dotenv');
dotenv.config();

// Routes & Sockets
const chatSocket = require('./socket/chatSocket');
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
const studentRoutes = require('./routes/new-flow/user.routes');
// const swaggerUi = require('swagger-ui-express');
// const swaggerSpec = require('./config/swagger');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/account', accountRoutes);
app.use('/api/v2/courses', courseRoutes);
app.use('/api/v2/lessons', lessonRoutes);
app.use('/api/v2/services', serviceRoutes);
app.use('/api/v2/crm', crmRoutes);
app.use('/api/v2/admin', adminRoutes);
app.use('/api/v2/progress', progressRoutes);
app.use('/api/v2/notifications', notificationRoutes);
app.use('/api/v2/quizzes', quizRoutes);
app.use('/api/v2/payment', paymentRoutes);
app.use('/api/v2/faqs', faqRoutes);
app.use('/api/v2/file', imageRoutes);
app.use('/api/v1/tutors', tutorRoutes);
app.use('/api/v2/support', supportRoutes);
app.use('/api/v2/wallet', walletRoutes);
app.use('/api/v2/waitlist', waitlistRoutes);
app.use('/api/v2/student', studentRoutes);
app.use('/api/v2/tutors', newTutorRoutes);
app.use('/api/v2/chat', chatRoutes);
// app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Swagger disabled

// 404 Fallback
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).send({ message: 'Something went wrong!', error: err.message });
});

// Create HTTP Server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Change this to your frontend origin in production
    methods: ['GET', 'POST']
  }
});

// // Optional: Middleware for Socket Authentication
// // You can verify JWT here if you want secure socket connections
// io.use((socket, next) => {
//   const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  
//   if (!token) {
//     return next(new Error('Authentication error'));
//   }

//   try {
//     const decoded = require('./utils/auth').verifyToken(token); // Your own token decoder
//     socket.userId = decoded.id; // Attach user ID to socket
//     next();
//   } catch (error) {
//     return next(new Error('Invalid token'));
//   }
// });

// Pass the Socket.IO instance to your chat logic
chatSocket(io);

// Start Server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
