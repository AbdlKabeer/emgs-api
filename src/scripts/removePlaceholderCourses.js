// Deletes placeholder/test courses (identified by the same heuristic as inspectCourses.js)
// and everything that hangs off them: modules, lessons, quizzes, quiz attempts, certificates,
// assignments, bookmarks, progress records, conversations, and FAQs tied to those courses.
// Does NOT touch Users, Payments, Transactions, or any course that doesn't match the pattern.
// Writes a full JSON backup of everything it's about to delete before deleting it.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const Course = require('../models/course.model');
const Module = require('../models/module.model');
const Lesson = require('../models/lesson.model');
const Quiz = require('../models/quiz.model');
const QuizAttempt = require('../models/quizAttempt.model');
const Certificate = require('../models/certificate.model');
const Assignment = require('../models/assignment.model');
const Bookmark = require('../models/bookmark.model');
const Progress = require('../models/progress.model');
const Conversation = require('../models/conversation.model');
const Faq = require('../models/faq.model');

const PLACEHOLDER_PATTERN = /\btest(ing)?\b|lorem ipsum|decsription|placeholder|^untitled$|^sample\b/i;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to DB\n');

  const courses = await Course.find({}).lean();
  const flaggedCourses = courses.filter(
    (c) => PLACEHOLDER_PATTERN.test(c.title || '') || PLACEHOLDER_PATTERN.test(c.description || '')
  );
  const courseIds = flaggedCourses.map((c) => c._id);

  if (courseIds.length === 0) {
    console.log('No placeholder courses matched. Nothing to do.');
    process.exit(0);
  }

  const modules = await Module.find({ courseId: { $in: courseIds } }).lean();
  const moduleIds = modules.map((m) => m._id);

  const lessons = await Lesson.find({ moduleId: { $in: moduleIds } }).lean();
  const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } }).lean();
  const quizIds = quizzes.map((q) => q._id);

  const quizAttempts = await QuizAttempt.find({ quizId: { $in: quizIds } }).lean();
  const certificates = await Certificate.find({ courseId: { $in: courseIds } }).lean();
  const assignments = await Assignment.find({ courseId: { $in: courseIds } }).lean();
  const bookmarks = await Bookmark.find({ courseId: { $in: courseIds } }).lean();
  const progress = await Progress.find({ courseId: { $in: courseIds } }).lean();
  const conversations = await Conversation.find({ courseId: { $in: courseIds } }).lean();
  const faqs = await Faq.find({ courseId: { $in: courseIds } }).lean();

  const backup = {
    generatedAt: new Date().toISOString(),
    courses: flaggedCourses,
    modules,
    lessons,
    quizzes,
    quizAttempts,
    certificates,
    assignments,
    bookmarks,
    progress,
    conversations,
    faqs,
  };

  const backupDir = path.join(__dirname, '../../backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `placeholder-courses-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`Backup written to: ${backupPath}\n`);
  console.log('About to delete:');
  console.log(`  Courses:       ${courseIds.length}`);
  console.log(`  Modules:       ${moduleIds.length}`);
  console.log(`  Lessons:       ${lessons.length}`);
  console.log(`  Quizzes:       ${quizzes.length}`);
  console.log(`  QuizAttempts:  ${quizAttempts.length}`);
  console.log(`  Certificates:  ${certificates.length}`);
  console.log(`  Assignments:   ${assignments.length}`);
  console.log(`  Bookmarks:     ${bookmarks.length}`);
  console.log(`  Progress:      ${progress.length}`);
  console.log(`  Conversations: ${conversations.length}`);
  console.log(`  FAQs:          ${faqs.length}`);
  console.log('');

  const results = {};
  results.quizAttempts = await QuizAttempt.deleteMany({ quizId: { $in: quizIds } });
  results.quizzes = await Quiz.deleteMany({ moduleId: { $in: moduleIds } });
  results.lessons = await Lesson.deleteMany({ moduleId: { $in: moduleIds } });
  results.modules = await Module.deleteMany({ courseId: { $in: courseIds } });
  results.certificates = await Certificate.deleteMany({ courseId: { $in: courseIds } });
  results.assignments = await Assignment.deleteMany({ courseId: { $in: courseIds } });
  results.bookmarks = await Bookmark.deleteMany({ courseId: { $in: courseIds } });
  results.progress = await Progress.deleteMany({ courseId: { $in: courseIds } });
  results.conversations = await Conversation.deleteMany({ courseId: { $in: courseIds } });
  results.faqs = await Faq.deleteMany({ courseId: { $in: courseIds } });
  results.courses = await Course.deleteMany({ _id: { $in: courseIds } });

  console.log('Deleted:');
  Object.entries(results).forEach(([key, res]) => {
    console.log(`  ${key}: ${res.deletedCount}`);
  });

  console.log('\nUsers, Payments, Transactions, and non-matching courses were left untouched.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error removing placeholder courses:', err);
  process.exit(1);
});