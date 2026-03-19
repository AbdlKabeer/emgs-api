const CourseCategory = require('../models/courseCategory.model');
const Course = require('../models/course.model');
const { successResponse, errorResponse, paginationResponse } = require('../utils/custom_response/responses');

// Get all categories (public)
exports.getAllCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    // Filter by active status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Search by name
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    
    const total = await CourseCategory.countDocuments(filter);
    const categories = await CourseCategory.find(filter)
      .sort({ order: 1, name: 1 })
      .skip(skip)
      .limit(limit);
    
    return paginationResponse(categories, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get single category by ID or slug
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a valid ObjectId or slug
    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id } 
      : { slug: id };
    
    const category = await CourseCategory.findOne(query);
    
    if (!category) {
      return errorResponse('Category not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({ category }, 'Category fetched successfully', res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Create new category (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, isActive, order } = req.body;
    
    // Check if category already exists
    const existingCategory = await CourseCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return errorResponse('Category with this name already exists', 'BAD_REQUEST', 400, res);
    }
    
    const category = new CourseCategory({
      name,
      description,
      icon,
      isActive,
      order
    });
    
    await category.save();
    
    return successResponse({ category }, 'Category created successfully', res, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse('Category with this name or slug already exists', 'BAD_REQUEST', 400, res);
    }
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update category (admin only)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive, order } = req.body;
    
    const category = await CourseCategory.findById(id);
    
    if (!category) {
      return errorResponse('Category not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if new name already exists (excluding current category)
    if (name && name !== category.name) {
      const existingCategory = await CourseCategory.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingCategory) {
        return errorResponse('Category with this name already exists', 'BAD_REQUEST', 400, res);
      }
    }
    
    // Update fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = order;
    
    await category.save();
    
    return successResponse({ category }, 'Category updated successfully', res);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse('Category with this name or slug already exists', 'BAD_REQUEST', 400, res);
    }
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Delete category (admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await CourseCategory.findById(id);
    
    if (!category) {
      return errorResponse('Category not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if category has courses
    const coursesWithCategory = await Course.countDocuments({ category: id });
    
    if (coursesWithCategory > 0) {
      return errorResponse(
        `Cannot delete category. ${coursesWithCategory} course(s) are using this category. Please reassign or delete those courses first.`,
        'BAD_REQUEST',
        400,
        res
      );
    }
    
    await CourseCategory.findByIdAndDelete(id);
    
    return successResponse(null, 'Category deleted successfully', res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get category statistics (admin only)
exports.getCategoryStats = async (req, res) => {
  try {
    const categories = await CourseCategory.find().sort({ order: 1, name: 1 });
    
    // Get course count for each category
    const statsPromises = categories.map(async (category) => {
      const courseCount = await Course.countDocuments({ category: category._id });
      const publishedCount = await Course.countDocuments({ 
        category: category._id, 
        status: 'published' 
      });
      
      return {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        isActive: category.isActive,
        totalCourses: courseCount,
        publishedCourses: publishedCount,
        draftCourses: courseCount - publishedCount
      };
    });
    
    const stats = await Promise.all(statsPromises);
    
    return successResponse({ stats }, 'Category statistics fetched successfully', res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update course count for a category (internal use)
exports.updateCategoryCoursCount = async (categoryId) => {
  try {
    const count = await Course.countDocuments({ category: categoryId });
    await CourseCategory.findByIdAndUpdate(categoryId, { courseCount: count });
  } catch (error) {
    console.error('Error updating category course count:', error);
  }
};
