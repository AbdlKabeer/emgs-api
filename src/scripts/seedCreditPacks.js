/**
 * Seed (upsert) credit packs. productId must match the consumable product ids created in
 * App Store Connect, Google Play Console and RevenueCat.
 *   node src/scripts/seedCreditPacks.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const CreditPack = require('../models/credit-pack.model');

const PACKS = [
  { productId: 'credits_100',  credits: 100,  bonusCredits: 0, label: 'Starter',   badge: '', sortOrder: 1 },
  { productId: 'credits_500',  credits: 500,  bonusCredits: 0, label: 'Popular',   badge: '', sortOrder: 2 },
  { productId: 'credits_1000', credits: 1000, bonusCredits: 0, label: 'Value',     badge: '', sortOrder: 3 },
  { productId: 'credits_5000', credits: 5000, bonusCredits: 0, label: 'Best deal', badge: '', sortOrder: 4 },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const p of PACKS) {
    await CreditPack.updateOne({ productId: p.productId }, { $set: p }, { upsert: true });
    console.log(`upserted ${p.productId}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
