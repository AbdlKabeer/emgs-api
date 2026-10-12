// Read-only inspection script. Lists every course in the database so placeholder/test
// content (e.g. "tests", "Testing") can be identified before anyone deletes anything by hand.
// This script makes NO writes or deletes.
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// The local resolver sometimes mangles the SRV lookup mongodb+srv:// needs;
// fall back to public resolvers that handle it correctly.
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const Course = require('../models/course.model');
require('../models/user.model');
require('../models/courseCategory.model');

const PLACEHOLDER_PATTERN = /\btest(ing)?\b|lorem ipsum|decsription|placeholder|^untitled$|^sample\b/i;

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to DB\n');

    const courses = await Course.find({})
      .populate('createdBy', 'fullName email role')
      .select('title description status isPublished courseType price isFree createdBy createdAt')
      .sort({ createdAt: 1 })
      .lean();

    console.log(`Total courses: ${courses.length}\n`);

    const flagged = [];

    courses.forEach((c, i) => {
      const looksLikePlaceholder =
        PLACEHOLDER_PATTERN.test(c.title || '') || PLACEHOLDER_PATTERN.test(c.description || '');

      if (looksLikePlaceholder) flagged.push(c);

      console.log(
        `${looksLikePlaceholder ? '⚠️ ' : '   '}[${i + 1}] ${c._id}\n` +
        `      title:       ${c.title}\n` +
        `      description: ${c.description || '(none)'}\n` +
        `      status:      ${c.status} | published: ${c.isPublished} | type: ${c.courseType}\n` +
        `      price:       ${c.isFree ? 'Free' : c.price}\n` +
        `      createdBy:   ${c.createdBy ? `${c.createdBy.fullName} <${c.createdBy.email}> (${c.createdBy.role})` : '(missing user)'}\n` +
        `      createdAt:   ${c.createdAt}\n`
      );
    });

    console.log('----------------------------------------');
    console.log(`Flagged as likely placeholder/test content: ${flagged.length}`);
    flagged.forEach((c) => console.log(`  - ${c._id}  "${c.title}"`));
    console.log('----------------------------------------');
    console.log('Nothing was modified or deleted. Review the flagged list above before deleting anything.');

    process.exit(0);
  } catch (error) {
    console.error('Error inspecting database:', error);
    process.exit(1);
  }
}

inspect();
