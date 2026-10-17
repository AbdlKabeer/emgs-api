const User = require('../models/user.model');

// Codes are generated uppercase, but people type them by hand or paste them with stray spaces
// (including non-breaking and zero-width characters), so match on a cleaned-up form.
const normalizeReferralCode = (code) =>
  typeof code === 'string' ? code.replace(/[\s​-‍﻿]/g, '').toUpperCase() : '';

/**
 * Resolve a referral code typed at sign-up.
 * `provided` is false when the field was empty or only whitespace, so callers can treat it as "no code".
 */
async function resolveReferralCode(rawCode) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return { provided: false, referrer: null };
  const referrer = await User.findOne({ referralCode: code });
  return { provided: true, referrer };
}

module.exports = { normalizeReferralCode, resolveReferralCode };
