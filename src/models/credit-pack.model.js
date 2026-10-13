const mongoose = require('mongoose');

/**
 * A purchasable credit pack. `productId` must match the consumable product id configured in
 * App Store Connect, Google Play Console and RevenueCat. Prices are NOT stored here; the app
 * reads localized prices from the store.
 */
const creditPackSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true },
    credits: { type: Number, required: true, min: 1 },
    bonusCredits: { type: Number, default: 0, min: 0 },
    label: { type: String, default: '' },
    badge: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditPack', creditPackSchema);
