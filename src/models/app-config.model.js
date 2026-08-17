const mongoose = require('mongoose');

/**
 * AppConfig — a singleton document that stores global app settings
 * manageable by admins (e.g. contact phone numbers, support emails).
 */
const appConfigSchema = new mongoose.Schema(
  {
    // Only ever one document; use key = 'global'
    key: { type: String, default: 'global', unique: true },

    contactInfo: {
      phones: [{ label: String, number: String }],
      emails: [{ label: String, address: String }],
      whatsapp: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const AppConfig = mongoose.model('AppConfig', appConfigSchema);
module.exports = AppConfig;
