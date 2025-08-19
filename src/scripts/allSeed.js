const mongoose = require('mongoose');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Module = require('../models/module.model');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'|| 'mongodb://localhost:27017/your-database', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};


// Sample course data - 2 courses per tutor
const coursesData = [
  // Course Set 1 - JavaScript & Node.js
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
    title: "Node.js Backend Development",
    description: "Build powerful backend applications with Node.js and Express",
    category: "Backend Development",
    courseType: "tutor",
    isFree: false,
    price: 149.99,
    thumbnail: "https://example.com/nodejs-thumbnail.jpg",
    modules: [
      {
        title: "Node.js Fundamentals",
        description: "Understanding Node.js and its core concepts",
        lessons: [
          {
            title: "Introduction to Node.js",
            description: "What is Node.js and why use it?",
            duration: 25,
            content: {
              video: {
                url: "https://example.com/videos/nodejs-intro.mp4",
                duration: 1500,
                thumbnail: "https://example.com/thumbnails/nodejs-intro.jpg"
              },
              textContent: "Node.js is a JavaScript runtime built on Chrome's V8..."
            }
          }
        ]
      }
    ]
  },
  // Course Set 2 - React & React Native
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
    title: "React Native Mobile Development",
    description: "Build cross-platform mobile apps with React Native",
    category: "Mobile Development",
    courseType: "tutor",
    isFree: true,
    price: 0,
    thumbnail: "https://example.com/react-native-thumbnail.jpg",
    modules: [
      {
        title: "Getting Started with React Native",
        description: "Setting up and understanding React Native",
        lessons: [
          {
            title: "React Native Overview",
            description: "Introduction to React Native framework",
            duration: 28,
            content: {
              video: {
                url: "https://example.com/videos/rn-overview.mp4",
                duration: 1680,
                thumbnail: "https://example.com/thumbnails/rn-overview.jpg"
              },
              materials: [
                {
                  type: "link",
                  title: "React Native Documentation",
                  url: "https://reactnative.dev/docs/getting-started",
                  description: "Official React Native documentation"
                }
              ]
            }
          }
        ]
      }
    ]
  },
  // Course Set 3 - Python & Django
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
    title: "Django Web Framework",
    description: "Build robust web applications with Django Python framework",
    category: "Web Development",
    courseType: "tutor",
    isFree: false,
    price: 129.99,
    thumbnail: "https://example.com/django-thumbnail.jpg",
    modules: [
      {
        title: "Django Basics",
        description: "Introduction to Django framework",
        lessons: [
          {
            title: "Setting up Django",
            description: "Installing and configuring Django",
            duration: 30,
            content: {
              video: {
                url: "https://example.com/videos/django-setup.mp4",
                duration: 1800,
                thumbnail: "https://example.com/thumbnails/django-setup.jpg"
              },
              materials: [
                {
                  type: "pdf",
                  title: "Django Installation Guide",
                  url: "https://example.com/materials/django-install.pdf",
                  description: "Complete Django installation guide"
                }
              ]
            }
          }
        ]
      }
    ]
  },
  // Course Set 4 - Digital Marketing & SEO
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
    title: "SEO Mastery Course",
    description: "Master Search Engine Optimization to rank higher on Google",
    category: "Marketing",
    courseType: "tutor",
    isFree: true,
    price: 0,
    thumbnail: "https://example.com/seo-thumbnail.jpg",
    modules: [
      {
        title: "SEO Fundamentals",
        description: "Understanding search engine optimization basics",
        lessons: [
          {
            title: "How Search Engines Work",
            description: "Understanding Google's algorithm and ranking factors",
            duration: 35,
            content: {
              video: {
                url: "https://example.com/videos/seo-basics.mp4",
                duration: 2100,
                thumbnail: "https://example.com/thumbnails/seo-basics.jpg"
              },
              textContent: "Search engines use complex algorithms to determine..."
            }
          }
        ]
      }
    ]
  },
  // Course Set 5 - Photography & Video Editing
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
  },
  {
    title: "Video Editing with Adobe Premiere Pro",
    description: "Professional video editing techniques using Adobe Premiere Pro",
    category: "Arts & Design",
    courseType: "tutor",
    isFree: false,
    price: 89.99,
    thumbnail: "https://example.com/video-editing-thumbnail.jpg",
    modules: [
      {
        title: "Premiere Pro Interface",
        description: "Getting familiar with Adobe Premiere Pro",
        lessons: [
          {
            title: "Interface Overview",
            description: "Understanding the Premiere Pro workspace",
            duration: 30,
            content: {
              video: {
                url: "https://example.com/videos/premiere-interface.mp4",
                duration: 1800,
                thumbnail: "https://example.com/thumbnails/premiere-interface.jpg"
              },
              materials: [
                {
                  type: "pdf",
                  title: "Keyboard Shortcuts Guide",
                  url: "https://example.com/materials/premiere-shortcuts.pdf",
                  description: "Essential keyboard shortcuts for faster editing"
                }
              ]
            }
          }
        ]
      }
    ]
  }
];

// Main seeding function - 2 courses per tutor
const seedCourses = async () => {
  try {
    console.log('Starting course seeding...');
    
    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('Clearing existing courses, modules, and lessons...');
    // await Promise.all([
    //   Course.deleteMany({}),
    //   Module.deleteMany({}),
    //   Lesson.deleteMany({})
    // ]);

    // Get all tutors
    const tutors = await User.find({ role: 'tutor',tutorType: 'emgs' });
    if (tutors.length === 0) {
      throw new Error('No tutors found in database. Please create tutor users first.');
    }

    console.log(`Found ${tutors.length} tutors`);
    let totalCreated = 0;
    let courseIndex = 0;

    // Assign 2 courses to each tutor
    for (const tutor of tutors) {
      console.log(`\n📚 Creating courses for tutor: ${tutor.fullName} (${tutor.email})`);
      
      // Assign 2 courses to this tutor
      for (let i = 0; i < 2; i++) {
        if (courseIndex >= coursesData.length) {
          // If we run out of course templates, cycle back to the beginning
          courseIndex = 0;
        }

        const courseData = coursesData[courseIndex];
        
        try {
          // Create course
          const course = new Course({
            title: `${courseData.title} - ${tutor.fullName}`,
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
          console.log(`  ✓ Course created: ${course.title}`);

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
            console.log(`    ✓ Module created: ${module.title}`);

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
              console.log(`      ✓ Lesson created: ${lesson.title}`);
            }
          }

          totalCreated++;
          courseIndex++;
        } catch (courseError) {
          console.error(`Error creating course "${courseData.title}" for tutor ${tutor.fullName}:`, courseError.message);
        }
      }
    }

    console.log(`\n🎉 Seeding completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Tutors: ${tutors.length}`);
    console.log(`   - Courses created: ${totalCreated}`);
    console.log(`   - Average courses per tutor: ${(totalCreated / tutors.length).toFixed(1)}`);
    
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

// // Alternative function to seed without clearing existing data
// const seedCoursesAdditive = async () => {
//   try {
//     console.log('Starting additive course seeding (keeping existing data)...');
    
//     // Get all tutors
//     const tutors = await User.find({ role: 'tutor' });
//     if (tutors.length === 0) {
//       throw new Error('No tutors found in database. Please create tutor users first.');
//     }

//     console.log(`Found ${tutors.length} tutors`);
//     let totalCreated = 0;
//     let courseIndex = 0;

//     // Assign 2 courses to each tutor
//     for (const tutor of tutors) {
//       console.log(`\n📚 Creating courses for tutor: ${tutor.fullName} (${tutor.email})`);
      
//       // Check how many courses this tutor already has
//       const existingCourses = await Course.countDocuments({ tutorId: tutor._id });
//       console.log(`  Current courses for ${tutor.fullName}: ${existingCourses}`);
      
//       // Create courses to reach 2 total (skip if already has 2 or more)
//       const coursesToCreate = Math.max(0, 2 - existingCourses);
      
//       if (coursesToCreate === 0) {
//         console.log(`  ⚠ ${tutor.fullName} already has ${existingCourses} courses, skipping...`);
//         continue;
//       }

//       // Assign courses to this tutor
//       for (let i = 0; i < coursesToCreate; i++) {
//         if (courseIndex >= coursesData.length) {
//           // If we run out of course templates, cycle back to the beginning
//           courseIndex = 0;
//         }

//         const courseData = coursesData[courseIndex];
        
//         try {
//           // Check if this specific course already exists for this tutor
//           const existingCourse = await Course.findOne({ 
//             title: `${courseData.title} - ${tutor.fullName}`,
//             tutorId: tutor._id 
//           });
          
//           if (existingCourse) {
//             console.log(`  ⚠ Course "${courseData.title}" already exists for ${tutor.fullName}, skipping...`);
//             courseIndex++;
//             continue;
//           }

//           // Create course
//           const course = new Course({
//             title: `${courseData.title} - ${tutor.fullName}`,
//             description: courseData.description,
//             category: courseData.category,
//             courseType: courseData.courseType,
//             isFree: courseData.isFree,
//             price: courseData.price,
//             thumbnail: courseData.thumbnail,
//             createdBy: tutor._id,
//             tutorId: tutor._id,
//             isPublished: true,
//             enrolledUsers: [],
//             ratings: []
//           });

//           await course.save();
//           console.log(`  ✓ Course created: ${course.title}`);

//           // Create modules and lessons
//           for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
//             const moduleData = courseData.modules[moduleIndex];

//             const module = new Module({
//               title: moduleData.title,
//               description: moduleData.description,
//               courseId: course._id,
//               order: moduleIndex + 1,
//               isPublished: true
//             });

//             await module.save();
//             console.log(`    ✓ Module created: ${module.title}`);

//             // Create lessons for this module
//             for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
//               const lessonData = moduleData.lessons[lessonIndex];

//               const lesson = new Lesson({
//                 title: lessonData.title,
//                 description: lessonData.description,
//                 moduleId: module._id,
//                 order: lessonIndex + 1,
//                 duration: lessonData.duration,
//                 content: lessonData.content,
//                 isPublished: true
//               });

//               await lesson.save();
//               console.log(`      ✓ Lesson created: ${lesson.title}`);
//             }
//           }

//           totalCreated++;
//           courseIndex++;
//         } catch (courseError) {
//           console.error(`Error creating course "${courseData.title}" for tutor ${tutor.fullName}:`, courseError.message);
//           courseIndex++;
//         }
//       }
//     }

//     console.log(`\n🎉 Additive seeding completed!`);
//     console.log(`📊 Summary:`);
//     console.log(`   - Tutors processed: ${tutors.length}`);
//     console.log(`   - New courses created: ${totalCreated}`);

//     // Get final counts
//     const finalCourseCount = await Course.countDocuments();
//     console.log(`   - Total courses in database: ${finalCourseCount}`);

//   } catch (error) {
//     console.error('Additive seeding failed:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('Database connection closed');
//   }
// }; role: 'tutor' }).limit(10);
//   if (tutors.length === 0) {
//     throw new Error('No tutors found in database. Please create tutor users first.');
//   }
//   return tutors[Math.floor(Math.random() * tutors.length)];
// };

// // Main seeding function
// const seedCourses = async () => {
//   try {
//     console.log('Starting course seeding...');
    
//     // Clear existing data (optional - remove if you want to keep existing data)
//     console.log('Clearing existing courses, modules, and lessons...');
//     await Promise.all([
//       Course.deleteMany({}),
//       Module.deleteMany({}),
//       Lesson.deleteMany({})
//     ]);

//     let totalCreated = 0;

//     for (const courseData of coursesData) {
//       try {
//         // Get random tutor
//         const tutor = await getRandomTutor();

//         // Create course
//         const course = new Course({
//           title: courseData.title,
//           description: courseData.description,
//           category: courseData.category,
//           courseType: courseData.courseType,
//           isFree: courseData.isFree,
//           price: courseData.price,
//           thumbnail: courseData.thumbnail,
//           createdBy: tutor._id,
//           tutorId: tutor._id,
//           isPublished: true,
//           enrolledUsers: [],
//           ratings: []
//         });

//         await course.save();
//         console.log(`✓ Course created: ${course.title}`);

//         // Create modules and lessons
//         for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
//           const moduleData = courseData.modules[moduleIndex];

//           const module = new Module({
//             title: moduleData.title,
//             description: moduleData.description,
//             courseId: course._id,
//             order: moduleIndex + 1,
//             isPublished: true
//           });

//           await module.save();
//           console.log(`  ✓ Module created: ${module.title}`);

//           // Create lessons for this module
//           for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
//             const lessonData = moduleData.lessons[lessonIndex];

//             const lesson = new Lesson({
//               title: lessonData.title,
//               description: lessonData.description,
//               moduleId: module._id,
//               order: lessonIndex + 1,
//               duration: lessonData.duration,
//               content: lessonData.content,
//               isPublished: true
//             });

//             await lesson.save();
//             console.log(`    ✓ Lesson created: ${lesson.title}`);
//           }
//         }

//         totalCreated++;
//       } catch (courseError) {
//         console.error(`Error creating course "${courseData.title}":`, courseError.message);
//       }
//     }

//     console.log(`\n🎉 Seeding completed successfully!`);
//     console.log(`📊 Summary:`);
//     console.log(`   - Courses created: ${totalCreated}`);
    
//     // Get final counts
//     const [courseCount, moduleCount, lessonCount] = await Promise.all([
//       Course.countDocuments(),
//       Module.countDocuments(),
//       Lesson.countDocuments()
//     ]);
    
//     console.log(`   - Total modules: ${moduleCount}`);
//     console.log(`   - Total lessons: ${lessonCount}`);

//   } catch (error) {
//     console.error('Seeding failed:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('Database connection closed');
//   }
// };

// // Alternative function to seed without clearing existing data
// const seedCoursesAdditive = async () => {
//   try {
//     console.log('Starting additive course seeding (keeping existing data)...');
    
//     let totalCreated = 0;

//     for (const courseData of coursesData) {
//       try {
//         // Check if course already exists
//         const existingCourse = await Course.findOne({ title: courseData.title });
//         if (existingCourse) {
//           console.log(`⚠ Course "${courseData.title}" already exists, skipping...`);
//           continue;
//         }

//         // Get random tutor
//         const tutor = await getRandomTutor();

//         // Create course
//         const course = new Course({
//           title: courseData.title,
//           description: courseData.description,
//           category: courseData.category,
//           courseType: courseData.courseType,
//           isFree: courseData.isFree,
//           price: courseData.price,
//           thumbnail: courseData.thumbnail,
//           createdBy: tutor._id,
//           tutorId: tutor._id,
//           isPublished: true,
//           enrolledUsers: [],
//           ratings: []
//         });

//         await course.save();
//         console.log(`✓ Course created: ${course.title}`);

//         // Create modules and lessons
//         for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
//           const moduleData = courseData.modules[moduleIndex];

//           const module = new Module({
//             title: moduleData.title,
//             description: moduleData.description,
//             courseId: course._id,
//             order: moduleIndex + 1,
//             isPublished: true
//           });

//           await module.save();
//           console.log(`  ✓ Module created: ${module.title}`);

//           // Create lessons for this module
//           for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
//             const lessonData = moduleData.lessons[lessonIndex];

//             const lesson = new Lesson({
//               title: lessonData.title,
//               description: lessonData.description,
//               moduleId: module._id,
//               order: lessonIndex + 1,
//               duration: lessonData.duration,
//               content: lessonData.content,
//               isPublished: true
//             });

//             await lesson.save();
//             console.log(`    ✓ Lesson created: ${lesson.title}`);
//           }
//         }

//         totalCreated++;
//       } catch (courseError) {
//         console.error(`Error creating course "${courseData.title}":`, courseError.message);
//       }
//     }

//     console.log(`\n🎉 Additive seeding completed!`);
//     console.log(`📊 New courses created: ${totalCreated}`);

//   } catch (error) {
//     console.error('Additive seeding failed:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('Database connection closed');
//   }
// };

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

module.exports = { seedCourses, runSeed };