const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user.model');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Module = require('../models/module.model');

async function addEmgsTutorsWithCourses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
    console.log('Connected to MongoDB');

    const tutorsData = [];

    // Create 5 tutors data first
    for (let i = 1; i <= 5; i++) {
      tutorsData.push({
        fullName: `EMGS Tutor ${i}`,
        email: `emgs.tutor${i}-{${i}}@example.com`,
        password: 'password123',
        phone: `+1000000000${i}`,
        role: 'tutor',
        tutorType: 'emgs',
        isVerified: true,
        bio: `This is the bio of EMGS Tutor ${i}`,
        preferredLanguage: 'English',
        referralPoints: 0,
        referralPointDisbursed: false,
        isEmgsTutor: true,
      });
    }

    // Insert tutors and get saved docs
    const createdTutors = await User.insertMany(tutorsData);
    console.log(`Created ${createdTutors.length} EMGS tutors.`);

    // For each tutor, create 5 courses + lessons + modules
    for (const tutor of createdTutors) {
      console.log(`Creating courses for tutor ${tutor.fullName} (${tutor._id})`);

      for (let c = 1; c <= 5; c++) {
        const course = await Course.create({
          title: `Course ${c} by ${tutor.fullName}`,
          description: `Description for course ${c} by ${tutor.fullName}`,
          category: 'Education',
          isFree: c % 2 === 0,
          price: c % 2 === 0 ? 0 : 49.99,
          thumbnail: '',
          goals: ['Understand basics', 'Apply knowledge'],
          notes: ['Bring notebook', 'Ask questions'],
          createdBy: tutor._id,
          courseType: 'emgs',
          status: 'published',
          isPublished: true,
        });

        console.log(`  Created course: ${course.title}`);

        // Create one lesson for the course
        const lesson = await Lesson.create({
          title: `Lesson 1 of ${course.title}`,
          description: 'This is the first lesson.',
          courseId: course._id,
          order: 1,
          duration: 30,
          isPublished: true,
        });

        console.log(`    Added lesson: ${lesson.title}`);

        // Create one module for the lesson
        await Module.create({
          title: `Module 1 of ${lesson.title}`,
          description: 'This is the first module.',
          lessonId: lesson._id,
          order: 1,
          content: {
            video: {
              url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              duration: 300,
              thumbnail:
                'https://res.cloudinary.com/dvvxy5xc2/image/upload/v1743859606/course-thumbnails/txkevbrkpr4j4jfindof.jpg',
            },
            textContent: 'This is the module content.',
          },
          isPublished: true,
        });

        console.log(`      Added module to lesson: ${lesson.title}`);
      }
    }

    console.log('All tutors with courses, lessons, and modules created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

addEmgsTutorsWithCourses();
