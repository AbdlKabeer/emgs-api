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

    // Credit system settings (admin-configurable)
    credits: {
      nairaPerCredit: { type: Number, default: 10 },
      platformCommissionPct: { type: Number, default: 0.2 },
      storeFeePct: { type: Number, default: 0.15 },
      feeBearer: { type: String, enum: ['student', 'tutor', 'platform'], default: 'student' },
      showFiatToStudents: { type: Boolean, default: true },
      renewalGraceDays: { type: Number, default: 3 },
      lowBalanceThreshold: { type: Number, default: 50 },
      referralRewardPct: { type: Number, default: 0.1 },
    },
  },
  { timestamps: true }
);

const AppConfig = mongoose.model('AppConfig', appConfigSchema);
module.exports = AppConfig;
