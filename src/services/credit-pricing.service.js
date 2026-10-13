const AppConfig = require('../models/app-config.model');

const DEFAULTS = {
  nairaPerCredit: 10,
  platformCommissionPct: 0.2,
  storeFeePct: 0.15,
  feeBearer: 'student',
  showFiatToStudents: true,
  renewalGraceDays: 3,
  lowBalanceThreshold: 50,
  referralRewardPct: 0.1,
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

async function getCreditConfig() {
  let doc = await AppConfig.findOne({ key: 'global' }).lean();
  if (!doc) doc = (await AppConfig.create({ key: 'global' })).toObject();
  return { ...DEFAULTS, ...(doc.credits || {}) };
}

/**
 * Pure pricing function. Single source of truth for credit price and tutor share.
 *   student bears fee -> credit price is marked up by 1/(1-storeFee)
 *   tutor bears fee   -> tutor share is reduced by storeFee
 *   platform bears it -> neither changes (platform eats the fee)
 */
function quote(basePrice, cfg) {
  const base = Number(basePrice) || 0;
  if (base <= 0) {
    return { basePrice: 0, creditPrice: 0, tutorShare: 0, platformShare: 0, nairaPerCredit: cfg.nairaPerCredit,
      commissionPct: cfg.platformCommissionPct, storeFeePct: cfg.storeFeePct, feeBearer: cfg.feeBearer };
  }
  const markup = cfg.feeBearer === 'student' ? 1 / (1 - cfg.storeFeePct) : 1;
  const creditPrice = Math.max(1, Math.ceil((base * markup) / cfg.nairaPerCredit - 1e-9));
  const tutorPct = 1 - cfg.platformCommissionPct - (cfg.feeBearer === 'tutor' ? cfg.storeFeePct : 0);
  const tutorShare = round2(base * Math.max(0, tutorPct));
  const platformShare = round2(creditPrice * cfg.nairaPerCredit - tutorShare);
  return {
    basePrice: base,
    creditPrice,
    tutorShare,
    platformShare,
    nairaPerCredit: cfg.nairaPerCredit,
    commissionPct: cfg.platformCommissionPct,
    storeFeePct: cfg.storeFeePct,
    feeBearer: cfg.feeBearer,
  };
}

/**
 * Warn when the platform loses money on credits. `packPricePerCredit` is the NGN store price of
 * the cheapest pack divided by its total credits (including bonus).
 */
function marginWarning(packPricePerCredit, cfg) {
  const netPerCredit = packPricePerCredit * (1 - cfg.storeFeePct);
  if (netPerCredit < cfg.nairaPerCredit) {
    return `Net revenue per credit after store fees (${round2(netPerCredit)} NGN) is below nairaPerCredit (${cfg.nairaPerCredit}).`;
  }
  return null;
}

module.exports = { getCreditConfig, quote, marginWarning, DEFAULTS, round2 };
