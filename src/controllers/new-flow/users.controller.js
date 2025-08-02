const Course = require('../../models/course.model');
const Lesson = require('../../models/lesson.model');
const Quiz = require('../../models/quiz.model');
const Bookmark = require('../../models/bookmark.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../../utils/custom_response/responses');



exports.getAllCourses = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            sort: { createdAt: -1 },
            populate: ['user', 'category']
        };
        const courses = await Course.paginate({}, options);
        return paginationResponse(res, courses, 'courses');
    } catch (error) {
            return errorResponse(res, error.message, 500);
    }
    
};

exports.getCoursesByPrice = async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;
        const options = {
            sort: { createdAt: -1 },
            populate: ['user', 'category']
            };
        const courses = await Course.find({
                price: { $gte: minPrice, $lte: maxPrice }
                }).populate(options);
        return successResponse(res, courses, 'courses');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

exports.getCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const course = await Course.findById(id).populate('user', 'name').populate('category',
            'name').populate('lessons').populate('quizzes').populate('bookmarks');
        if (!course) {
                return badRequestResponse(res, 'Course not found', 404);
        }
        return successResponse(res, course, 200);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

exports.getCourseModules = async (req, res) => {
    try {
        const id = req.params.id;
        const course = await Course.findById(id).populate('lessons').populate('quizzes');
        if (!course) {
            return badRequestResponse(res, 'Course not found', 404);
        }
        return successResponse(res, course, 200);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

exports.getLessonQuizzes = async (req, res) => {
    try {
        const id = req.params.id;
        const lesson = await Lesson.findById(id).populate('quizzes');
        if (!lesson) {
            return badRequestResponse(res, 'Lesson not found', 404);
        }
        return successResponse(res, lesson, 200);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

exports.getUserBookmarks = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id).populate('bookmarks');
        if (!user) {
            return badRequestResponse(res, 'User not found', 404);
            }
            return successResponse(res, user.bookmarks, 200);
            } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

exports.bookmarkCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id);
        if (!user) {
            return badRequestResponse(res, 'User not found', 404);
        }
        const course = await Course.findById(req.body.courseId);
        if (!course) {
            return badRequestResponse(res, 'Course not found', 404);
        }
        user.bookmarks.push(course);
        await user.save();
        return successResponse(res, user.bookmarks, 200);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

exports.reviewCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id);
        if (!user) {
            return badRequestResponse(res, 'User not found', 404);
        }
        const course = await Course.findById(req.body.courseId);
        if (!course) {
            return badRequestResponse(res, 'Course not found', 404);
        }
        const review = await Review.findOne({ user: user._id, course: course._id });
        if (review) {
            return badRequestResponse(res, 'You have already reviewed this course', 400);
        }
        const newReview = new Review({
            user: user._id,
            course: course._id,
            rating: req.body.rating,
            review: req.body.review
            });
        await newReview.save();
        return successResponse(res, newReview, 200);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};


exports.getAllCourseReviews = async (req, res) => {
    try {
        const page = req.query.page;
        const limit = req.query.limit;
        const course = await Course.findById(req.params.id);
        if (!course) {
            return badRequestResponse(res, 'Course not found', 404);
            }
            const reviews = await Review.paginate({ course: course._id }, { page, limit });

        return successResponse(res, reviews, 200);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};






