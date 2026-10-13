/**
 * Seeds demo users/content into the THROWAWAY test database so the mobile app can be driven
 * by hand or by an automation run. Refuses to run against anything but a local/docker Mongo.
 * Login emails: demo-student@example.test, demo-tutor@example.test (password below).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Course = require('../src/models/course.model');
const CourseCategory = require('../src/models/courseCategory.model');
const Module = require('../src/models/module.model');
const Service = require('../src/models/service.model');

const URI = process.env.MONGODB_URI || '';
if (!/(127\.0\.0\.1|localhost|emgs-test-mongo)/.test(URI)) { console.error('Refusing: not a local database'); process.exit(2); }
const PASSWORD = 'DemoPass#2026';

(async () => {
  await mongoose.connect(URI);
  const upsertUser = async (email, fields) => {
    let u = await User.findOne({ email });
    if (!u) u = new User({ email, password: PASSWORD, ...fields });
    Object.assign(u, fields);
    await u.save();
    return u;
  };
  const tutor = await upsertUser('demo-tutor@example.test', {
    fullName: 'Demo Tutor', role: 'tutor', roles: ['tutor'], status: 'active', isVerified: true,
    referralCode: 'DEMOTUT1', servicePrice: 3000,
  });
  const student = await upsertUser('demo-student@example.test', {
    fullName: 'Demo Student', role: 'user', roles: ['user'], status: 'active', isVerified: true, referralCode: 'DEMOSTU1',
  });
  let category = await CourseCategory.findOne({ name: 'Demo' });
  if (!category) category = await CourseCategory.create({ name: 'Demo' });
  const mk = async (title, price, isFree = false) => {
    let c = await Course.findOne({ title });
    if (!c) c = await Course.create({
      title, description: `${title} (demo)`, category: category._id, createdBy: tutor._id, courseType: 'tutor',
      price, isFree, isPublished: true, status: 'published', goals: ['Learn the basics', 'Practice with examples'],
    });
    return c;
  };
  await mk('Demo: IELTS Writing Masterclass', 5000);
  await mk('Demo: Nursing Basics', 2000);
  await mk('Demo: Free Orientation', 0, true);
  if (!(await Service.findOne({ name: 'Demo: Visa Booking' }))) {
    await Service.create({
      name: 'Demo: Visa Booking', description: 'Book your visa appointment', category: 'Visa Booking',
      whatsappContact: '2348000000000', price: 4000, sessionEnabled: true, sessionPrice: 4000, user: tutor._id,
      features: ['Document review', 'Appointment booking'],
    });
  }
  console.log('Seeded demo data. student:', student.email, 'tutor:', tutor.email);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
