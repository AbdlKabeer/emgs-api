const Lesson = require('../models/lesson.model');
const Module = require('../models/module.model');
const Course = require('../models/course.model');
const Progress = require('../models/progress.model');
const { 
  successResponse, 
  badRequestResponse, 
  internalServerErrorResponse 
} = require('../utils/custom_response/responses');

// Get lessons for a course
exports.getLessonsForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user ? req.user.id : null;  // Handle both authenticated and unauthenticated users
    
    const lessons = await Lesson.find({ 
      courseId,
      isPublished: true 
    }).sort({ order: 1 });
    
    // If user is authenticated, add completion status
    if (userId) {
      const progress = await Progress.findOne({ userId, courseId });
      
      if (progress) {
        const lessonsWithProgress = lessons.map(lesson => {
          const lessonObj = lesson.toObject();
          lessonObj.isCompleted = progress.completedLessons.includes(lesson._id);
          return lessonObj;
        });
        
        return successResponse(lessonsWithProgress, res);
      }
    }
    
    return successResponse(lessons, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get single lesson
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    const userId = req.user ? req.user.id : null;
    
    if (!lesson) {
      return badRequestResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }
    
    // Add completion status if user is authenticated
    if (userId) {
      const progress = await Progress.findOne({ 
        userId, 
        courseId: lesson.courseId 
      });
      
      if (progress) {
        const lessonObj = lesson.toObject();
        lessonObj.isCompleted = progress.completedLessons.includes(lesson._id);
        
        // Update last accessed lesson
        progress.lastAccessedLesson = lesson._id;
        await progress.save();
        
        return successResponse(lessonObj, res);
      }
    }
    
    return successResponse(lesson, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Create new lesson (admin only)
exports.createLesson = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      moduleId, 
      videoUrl, 
      audioUrl, 
      duration, 
      order, 
      resources, 
      isPublished ,
      html_content
    } = req.body;

    // ✅ Check if module exists
    const module = await Module.findById(moduleId).populate('courseId'); // assuming Module has courseId
    if (!module) {
      return badRequestResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    // ✅ Build lesson with proper content structure
    const lesson = new Lesson({
      title,
      description,
      moduleId,
      order,
      duration,
      content: {
        video: {
          url: videoUrl,
          duration: null,       // You can calculate this from video metadata if needed
          thumbnail: null       // Optional, can be generated later
        },
        audio: {
          url: audioUrl,
          duration: null        // Optional
        },
        materials: resources || [],
        html_content: html_content || ''
      },
      isPublished: isPublished || false
    });

    await lesson.save();

    // ✅ Optionally associate lesson to course (via module.courseId)
    if (module.courseId) {
      await Course.findByIdAndUpdate(
        module.courseId,
        { $push: { lessons: lesson._id } }
      );
    }

    return successResponse(lesson, res, 201,'Lesson created successfully',);

  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


// Update lesson (admin only)
exports.updateLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, duration, order, resources, isPublished } = req.body;
    
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        videoUrl,
        duration,
        order,
        resources,
        isPublished
      },
      { new: true }
    );
    
    if (!lesson) {
      return badRequestResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({ lesson }, res, 200,
      'Lesson updated successfully'
    );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Delete lesson (admin only)
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
      return badRequestResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }
    
    // Remove lesson from course
    await Course.findByIdAndUpdate(
      lesson.courseId,
      { $pull: { lessons: lesson._id } }
    );
    
    await Lesson.findByIdAndDelete(req.params.id);
    
    return successResponse(null, res,204,'Lesson deleted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};