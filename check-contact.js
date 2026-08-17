require('dotenv').config();
const mongoose = require('mongoose');
const AppConfig = require('./src/models/app-config.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const config = await AppConfig.findOne({ key: 'global' });
    console.log(`\n=== CONTACT INFO ===`);
    if (config) {
      console.log(JSON.stringify(config.contactInfo, null, 2));
    } else {
      console.log("No config found. It will be created when the endpoint is first hit.");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
    process.exit(1);
  });
