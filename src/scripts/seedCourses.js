const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config(); // if you're using a .env file

const User = require('../models/user.model');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Module = require('../models/module.model');

console.log("======================================")
console.log(process.env.MONGODB_URI)
async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" || 'mongodb://localhost:27017/your-db-name', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to DB');

    const userId = new mongoose.Types.ObjectId(); // Replace with an actual user ID from your DB if needed

    for (let i = 1; i <= 10; i++) {
      const course = await Course.create({
        title: `EMGS Course ${i}`,
        description: `Description for EMGS Course ${i}`,
        category: 'Education',
        isFree: i % 2 === 0,
        price: i % 2 === 0 ? 0 : 49.99,
        thumbnail: '',
        goals: ['Understand basics', 'Apply knowledge'],
        notes: ['Bring notebook', 'Ask questions'],
        createdBy: userId,
        courseType: 'emgs',
        status: 'published',
        isPublished: true
      });

      console.log(`Created course: ${course.title}`);

      const lesson = await Lesson.create({
        title: `Lesson 1 of ${course.title}`,
        description: 'This is the first lesson.',
        courseId: course._id,
        order: 1,
        duration: 30,
        isPublished: true
      });

      console.log(`  Added lesson: ${lesson.title}`);

      await Module.create({
        title: `Module 1 of ${lesson.title}`,
        description: 'This is the first module.',
        lessonId: lesson._id,
        order: 1,
        content: {
          video: {
            url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration: 300,
            thumbnail: 'https://res.cloudinary.com/dvvxy5xc2/image/upload/v1743859606/course-thumbnails/txkevbrkpr4j4jfindof.jpg'
          },
          textContent: 'This is the module content.'
        },
        isPublished: true
      });

      console.log(`    Added module to lesson: ${lesson.title}`);
    }

    console.log('Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
