const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Lesson = require('../models/lesson.model'); // Adjust the path if needed

const VIDEO_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4';
const THUMBNAIL_URL = 'https://plus.unsplash.com/premium_photo-1683865776032-07bf70b0add1';

// async function updateLessonVideos() {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect('mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' || 'mongodb://localhost:27017/your-db-name', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     console.log('✅ Connected to MongoDB');

//     // Update all lessons with new video URL and thumbnail
//     const result = await Lesson.updateMany(
//       {},
//       {
//         $set: {
//           'content.video.url': VIDEO_URL,
//           'content.video.thumbnail': THUMBNAIL_URL
//         }
//       }
//     );

//     console.log(`✅ Updated ${result.modifiedCount} lesson(s) with new video URL and thumbnail.`);
//   } catch (error) {
//     console.error('❌ Error updating lesson videos:', error);
//   } finally {
//     await mongoose.disconnect();
//     console.log('🔌 Disconnected from MongoDB');
//   }
// }

// updateLessonVideos();

