require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('./src/models/faq.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const count = await FAQ.countDocuments();
    const faqs = await FAQ.find().limit(3);
    console.log(`\n=== FAQ RECORDS ===`);
    console.log(`Total count: ${count}`);
    if (count > 0) {
      console.log(`\nFirst few records:`);
      faqs.forEach((faq, i) => {
        console.log(`\n${i+1}. Q: ${faq.question}`);
        console.log(`   A: ${faq.answer}`);
      });
    }
    process.exit(0);
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
    process.exit(1);
  });
