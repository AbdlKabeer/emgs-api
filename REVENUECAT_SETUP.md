# RevenueCat / store setup for credits

What the person doing the store setup must hand over, and where each value goes.

## 1. App Store Connect (iOS)
- Paid Apps Agreement + banking + tax signed; enrol in the **Apple Small Business Program** (15%).
- Create 4 **consumable** in-app purchases, product IDs exactly: `credits_100`, `credits_500`, `credits_1000`, `credits_5000`
  (reference names/prices are free to choose; pack contents live in the backend `CreditPack` collection).
- Create an **App Store Connect API key (In-App Purchase key)** and give: the `.p8` file, Key ID, Issuer ID (RevenueCat needs these to verify purchases).
- Create a sandbox tester account.

## 2. Google Play Console (Android)
- Merchant account set up; same 4 products as **managed (consumable) in-app products** with the same IDs.
- Create a **service account** with Play Console API access (Finance + Orders permissions) and give the **JSON key** (RevenueCat uploads it).
- Add license testers.

## 3. RevenueCat dashboard (one project, two apps)
- Add the iOS app (bundle id `com.travelnlearn.emgs`) and the Android app (package `com.travelnlearn.emgs`).
- Import the 4 products on each app. Consumables need no entitlement.
- Provide these values:

| Value | Where it goes |
|---|---|
| iOS **public SDK key** (`appl_...`) | mobile build env `EXPO_PUBLIC_REVENUECAT_IOS_KEY` |
| Android **public SDK key** (`goog_...`) | mobile build env `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |
| **Secret API key** (v1, `sk_...`) | backend env `REVENUECAT_SECRET_API_KEY` (used by `/credits/purchase/claim`) |
| A long random string you choose | set as the webhook **Authorization header value** in RevenueCat, and as backend env `REVENUECAT_WEBHOOK_SECRET` |

- Webhook URL: `https://<backend-host>/api/v2/credits/webhook/revenuecat` (events: all, environment: both sandbox and production).

## 4. Backend / app env summary
Backend: `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY`. Do NOT set `ENABLE_MOCK_PURCHASES` in production (it is also ignored when `NODE_ENV=production`).
Mobile (EAS secrets): `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.

## 5. After deploy
- `node src/scripts/seedRoles...` is NOT needed again, but run `node src/scripts/seedRolesPermissions.js` **only on a database where wiping roles is acceptable**, or add the `credits.read` / `credits.manage` permissions by hand (it deletes and recreates all roles).
- `node src/scripts/seedCreditPacks.js` to create the packs.
- Optional pre-launch cleanup: `node src/scripts/resetPaymentData.js` (dry run) then `--confirm`.
- Rebuild the native app (EAS build); the RevenueCat SDK is a native module, so an OTA update is not enough.
