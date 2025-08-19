const mongoose = require('mongoose');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Module = require('../models/module.model');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Sample course data
const coursesData = [
  {
    title: "JavaScript Fundamentals",
    description: "Learn the basics of JavaScript programming from scratch",
    category: "Programming",
    courseType: "tutor",
    isFree: true,
    price: 0,
    thumbnail: "https://example.com/js-thumbnail.jpg",
    modules: [
      {
        title: "Introduction to JavaScript",
        description: "Getting started with JavaScript basics",
        lessons: [
          {
            title: "What is JavaScript?",
            description: "Understanding JavaScript and its role in web development",
            duration: 15,
            content: {
              video: {
                url: "https://example.com/videos/js-intro.mp4",
                duration: 900,
                thumbnail: "https://example.com/thumbnails/js-intro.jpg"
              },
              textContent: "JavaScript is a high-level programming language..."
            }
          },
          {
            title: "Setting up Development Environment",
            description: "Installing and configuring your JavaScript development environment",
            duration: 20,
            content: {
              video: {
                url: "https://example.com/videos/js-setup.mp4",
                duration: 1200,
                thumbnail: "https://example.com/thumbnails/js-setup.jpg"
              },
              materials: [
                {
                  type: "pdf",
                  title: "Setup Guide",
                  url: "https://example.com/materials/setup-guide.pdf",
                  description: "Step by step setup instructions"
                }
              ]
            }
          }
        ]
      },
      {
        title: "Variables and Data Types",
        description: "Understanding JavaScript variables and data types",
        lessons: [
          {
            title: "Variables Declaration",
            description: "Learning about var, let, and const",
            duration: 25,
            content: {
              video: {
                url: "https://example.com/videos/variables.mp4",
                duration: 1500,
                thumbnail: "https://example.com/thumbnails/variables.jpg"
              },
              textContent: "Variables are containers for storing data values..."
            }
          }
        ]
      }
    ]
  },
  {
    title: "React Development Masterclass",
    description: "Master React.js from beginner to advanced level",
    category: "Web Development",
    courseType: "tutor",
    isFree: false,
    price: 99.99,
    thumbnail: "https://example.com/react-thumbnail.jpg",
    modules: [
      {
        title: "React Basics",
        description: "Introduction to React concepts",
        lessons: [
          {
            title: "Introduction to React",
            description: "Understanding React and its ecosystem",
            duration: 30,
            content: {
              video: {
                url: "https://example.com/videos/react-intro.mp4",
                duration: 1800,
                thumbnail: "https://example.com/thumbnails/react-intro.jpg"
              },
              audio: {
                url: "https://example.com/audio/react-intro.mp3",
                duration: 1800
              }
            }
          },
          {
            title: "Components and JSX",
            description: "Building your first React components",
            duration: 35,
            content: {
              video: {
                url: "https://example.com/videos/components.mp4",
                duration: 2100,
                thumbnail: "https://example.com/thumbnails/components.jpg"
              }
            }
          }
        ]
      }
    ]
  },
  {
    title: "Python for Data Science",
    description: "Learn Python programming for data analysis and machine learning",
    category: "Data Science",
    courseType: "tutor",
    isFree: true,
    price: 0,
    thumbnail: "https://example.com/python-thumbnail.jpg",
    modules: [
      {
        title: "Python Fundamentals",
        description: "Basic Python programming concepts",
        lessons: [
          {
            title: "Python Syntax and Variables",
            description: "Learning Python syntax and variable declaration",
            duration: 28,
            content: {
              video: {
                url: "https://example.com/videos/python-syntax.mp4",
                duration: 1680,
                thumbnail: "https://example.com/thumbnails/python-syntax.jpg"
              },
              materials: [
                {
                  type: "link",
                  title: "Python Documentation",
                  url: "https://docs.python.org/3/",
                  description: "Official Python documentation"
                }
              ]
            }
          }
        ]
      },
      {
        title: "Data Analysis with Pandas",
        description: "Using Pandas for data manipulation",
        lessons: [
          {
            title: "Introduction to Pandas",
            description: "Getting started with Pandas library",
            duration: 40,
            content: {
              video: {
                url: "https://example.com/videos/pandas-intro.mp4",
                duration: 2400,
                thumbnail: "https://example.com/thumbnails/pandas-intro.jpg"
              },
              textContent: "Pandas is a powerful data analysis library..."
            }
          }
        ]
      }
    ]
  },
  {
    title: "Digital Marketing Essentials",
    description: "Complete guide to digital marketing strategies",
    category: "Marketing",
    courseType: "tutor",
    isFree: false,
    price: 79.99,
    thumbnail: "https://example.com/marketing-thumbnail.jpg",
    modules: [
      {
        title: "Marketing Fundamentals",
        description: "Basic concepts of digital marketing",
        lessons: [
          {
            title: "What is Digital Marketing?",
            description: "Understanding the digital marketing landscape",
            duration: 22,
            content: {
              video: {
                url: "https://example.com/videos/digital-marketing.mp4",
                duration: 1320,
                thumbnail: "https://example.com/thumbnails/digital-marketing.jpg"
              },
              materials: [
                {
                  type: "pdf",
                  title: "Marketing Strategy Template",
                  url: "https://example.com/materials/marketing-template.pdf",
                  description: "Template for creating marketing strategies"
                }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    title: "Photography Basics",
    description: "Learn the fundamentals of photography and camera techniques",
    category: "Arts & Design",
    courseType: "tutor",
    isFree: true,
    price: 0,
    thumbnail: "https://example.com/photography-thumbnail.jpg",
    modules: [
      {
        title: "Camera Fundamentals",
        description: "Understanding your camera and basic settings",
        lessons: [
          {
            title: "Camera Types and Features",
            description: "Different types of cameras and their features",
            duration: 25,
            content: {
              video: {
                url: "https://example.com/videos/camera-types.mp4",
                duration: 1500,
                thumbnail: "https://example.com/thumbnails/camera-types.jpg"
              },
              materials: [
                {
                  type: "image",
                  title: "Camera Comparison Chart",
                  url: "https://example.com/images/camera-chart.jpg",
                  description: "Visual comparison of different camera types"
                }
              ]
            }
          }
        ]
      },
      {
        title: "Composition Techniques",
        description: "Learn the rules of composition in photography",
        lessons: [
          {
            title: "Rule of Thirds",
            description: "Understanding and applying the rule of thirds",
            duration: 18,
            content: {
              video: {
                url: "https://example.com/videos/rule-of-thirds.mp4",
                duration: 1080,
                thumbnail: "https://example.com/thumbnails/rule-of-thirds.jpg"
              },
              textContent: "The rule of thirds is a fundamental composition technique..."
            }
          }
        ]
      }
    ]
  }
];

// Function to get random tutor
const getRandomTutor = async () => {
  const tutors = await User.find({ role: 'tutor' }).limit(10);
  if (tutors.length === 0) {
    throw new Error('No tutors found in database. Please create tutor users first.');
  }
  return tutors[Math.floor(Math.random() * tutors.length)];
};

// Main seeding function
const seedCourses = async () => {
  try {
    console.log('Starting course seeding...');
    
    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('Clearing existing courses, modules, and lessons...');
    await Promise.all([
      Course.deleteMany({}),
      Module.deleteMany({}),
      Lesson.deleteMany({})
    ]);

    let totalCreated = 0;

    for (const courseData of coursesData) {
      try {
        // Get random tutor
        const tutor = await getRandomTutor();

        // Create course
        const course = new Course({
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          courseType: courseData.courseType,
          isFree: courseData.isFree,
          price: courseData.price,
          thumbnail: courseData.thumbnail,
          createdBy: tutor._id,
          tutorId: tutor._id,
          isPublished: true,
          enrolledUsers: [],
          ratings: []
        });

        await course.save();
        console.log(`✓ Course created: ${course.title}`);

        // Create modules and lessons
        for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
          const moduleData = courseData.modules[moduleIndex];

          const module = new Module({
            title: moduleData.title,
            description: moduleData.description,
            courseId: course._id,
            order: moduleIndex + 1,
            isPublished: true
          });

          await module.save();
          console.log(`  ✓ Module created: ${module.title}`);

          // Create lessons for this module
          for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
            const lessonData = moduleData.lessons[lessonIndex];

            const lesson = new Lesson({
              title: lessonData.title,
              description: lessonData.description,
              moduleId: module._id,
              order: lessonIndex + 1,
              duration: lessonData.duration,
              content: lessonData.content,
              isPublished: true
            });

            await lesson.save();
            console.log(`    ✓ Lesson created: ${lesson.title}`);
          }
        }

        totalCreated++;
      } catch (courseError) {
        console.error(`Error creating course "${courseData.title}":`, courseError.message);
      }
    }

    console.log(`\n🎉 Seeding completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Courses created: ${totalCreated}`);
    
    // Get final counts
    const [courseCount, moduleCount, lessonCount] = await Promise.all([
      Course.countDocuments(),
      Module.countDocuments(),
      Lesson.countDocuments()
    ]);
    
    console.log(`   - Total modules: ${moduleCount}`);
    console.log(`   - Total lessons: ${lessonCount}`);

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Alternative function to seed without clearing existing data
const seedCoursesAdditive = async () => {
  try {
    console.log('Starting additive course seeding (keeping existing data)...');
    
    let totalCreated = 0;

    for (const courseData of coursesData) {
      try {
        // Check if course already exists
        const existingCourse = await Course.findOne({ title: courseData.title });
        if (existingCourse) {
          console.log(`⚠ Course "${courseData.title}" already exists, skipping...`);
          continue;
        }

        // Get random tutor
        const tutor = await getRandomTutor();

        // Create course
        const course = new Course({
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          courseType: courseData.courseType,
          isFree: courseData.isFree,
          price: courseData.price,
          thumbnail: courseData.thumbnail,
          createdBy: tutor._id,
          tutorId: tutor._id,
          isPublished: true,
          enrolledUsers: [],
          ratings: []
        });

        await course.save();
        console.log(`✓ Course created: ${course.title}`);

        // Create modules and lessons
        for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
          const moduleData = courseData.modules[moduleIndex];

          const module = new Module({
            title: moduleData.title,
            description: moduleData.description,
            courseId: course._id,
            order: moduleIndex + 1,
            isPublished: true
          });

          await module.save();
          console.log(`  ✓ Module created: ${module.title}`);

          // Create lessons for this module
          for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
            const lessonData = moduleData.lessons[lessonIndex];

            const lesson = new Lesson({
              title: lessonData.title,
              description: lessonData.description,
              moduleId: module._id,
              order: lessonIndex + 1,
              duration: lessonData.duration,
              content: lessonData.content,
              isPublished: true
            });

            await lesson.save();
            console.log(`    ✓ Lesson created: ${lesson.title}`);
          }
        }

        totalCreated++;
      } catch (courseError) {
        console.error(`Error creating course "${courseData.title}":`, courseError.message);
      }
    }

    console.log(`\n🎉 Additive seeding completed!`);
    console.log(`📊 New courses created: ${totalCreated}`);

  } catch (error) {
    console.error('Additive seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeding
const runSeed = async () => {
  await connectDB();
  
  // Choose one of the following:
  // 1. Clear existing and create new (destructive)
  await seedCourses();
  
  // 2. Add to existing without clearing (safe)
  // await seedCoursesAdditive();
};

// Execute if run directly
if (require.main === module) {
  runSeed().catch(console.error);
}

module.exports = { seedCourses, seedCoursesAdditive, runSeed };