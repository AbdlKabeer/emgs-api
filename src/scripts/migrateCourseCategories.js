/**
 * Migration Script: Convert Course Categories from String to ObjectId
 * 
 * This script:
 * 1. Creates category entries for existing string categories
 * 2. Updates courses to reference the new category ObjectIds
 * 
 * Usage: node src/scripts/migrateCourseCategories.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('../models/course.model');
const CourseCategory = require('../models/courseCategory.model');

dotenv.config();

const migrateCourseCategories = async () => {
  try {
    console.log('🔄 Starting category migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get all unique category strings from existing courses
    const uniqueCategories = await Course.distinct('category');
    console.log(`📊 Found ${uniqueCategories.length} unique categories:`, uniqueCategories);

    // Create category documents for each unique category
    const categoryMap = {};
    
    for (const categoryName of uniqueCategories) {
      // Skip if category is already an ObjectId (already migrated)
      if (mongoose.Types.ObjectId.isValid(categoryName) && String(categoryName).length === 24) {
        console.log(`⏭️  Skipping "${categoryName}" - already an ObjectId`);
        continue;
      }

      // Check if category already exists
      let category = await CourseCategory.findOne({ 
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') } 
      });

      if (!category) {
        // Create new category
        category = new CourseCategory({
          name: categoryName,
          description: `${categoryName} courses`,
          isActive: true
        });
        await category.save();
        console.log(`✅ Created category: ${categoryName}`);
      } else {
        console.log(`ℹ️  Category already exists: ${categoryName}`);
      }

      categoryMap[categoryName] = category._id;
    }

    // Update all courses to use ObjectId references
    let updatedCount = 0;
    const courses = await Course.find();
    
    for (const course of courses) {
      const categoryString = String(course.category);
      
      // Skip if already an ObjectId reference
      if (mongoose.Types.ObjectId.isValid(categoryString) && categoryString.length === 24) {
        continue;
      }

      // Find matching category ObjectId
      const categoryId = categoryMap[categoryString];
      
      if (categoryId) {
        course.category = categoryId;
        await course.save();
        updatedCount++;
        console.log(`✅ Updated course "${course.title}" - category: ${categoryString} -> ObjectId`);
      } else {
        console.log(`⚠️  Warning: No category found for course "${course.title}" with category "${categoryString}"`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   - Categories created/found: ${Object.keys(categoryMap).length}`);
    console.log(`   - Courses updated: ${updatedCount}`);
    console.log(`   - Total courses: ${courses.length}`);
    console.log('\n✅ Migration completed successfully!');

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run migration
migrateCourseCategories();
