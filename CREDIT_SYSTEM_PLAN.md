# Credit System: Implementation Plan

Goal: replace all card/Paystack payments with an in-app **credit balance** funded by consumable IAP
(App Store + Google Play). Every purchase of a course, service, one-on-one subscription and recurring
service renewal is paid with credits. Same behaviour on iOS and Android. Fixes App Store rejection 3.1.1.

Decisions already made:
- Credits are the only way to pay, on both platforms.
- Rate (NGN per credit), commission and **who bears the store fee** are configurable by an admin at runtime.
- App is pre-launch, so existing payments, transactions and wallet balances can be wiped.
- Tutors still enter prices in NGN and see the credit equivalent; students pay in credits.
- Recommended: RevenueCat for purchase validation; our own ledger is the source of truth for balances.

---

## 1. Concepts

| Term | Meaning |
|---|---|
| **Credit** | Integer unit of spending. Not cash-convertible. Never withdrawable. |
| **Credit pack** | A consumable store product (e.g. `credits_500`) that grants N credits. Priced in the store consoles. |
| **Base price** | The NGN price a tutor/admin sets on a course/service (`course.price`, `service.price`, ...). Unchanged. |
| **Credit price** | What the student pays: derived from base price + config. Snapshotted at purchase time. |
| **Tutor payout** | NGN credited to the tutor's existing `Wallet`, derived from base price + config. Withdrawals unchanged. |

### Pricing formulas (single source of truth: `services/credit-pricing.service.js`)

```
cfg = AppConfig.credits  { nairaPerCredit, platformCommissionPct, storeFeePct, feeBearer }

markup        = feeBearer == "student" ? 1 / (1 - storeFeePct) : 1
creditPrice   = ceil(basePrice * markup / nairaPerCredit)               // student pays this

tutorShare    = basePrice * (1 - platformCommissionPct
                                - (feeBearer == "tutor" ? storeFeePct : 0))
platformShare = (credits spent * nairaPerCredit) - tutorShare           // informational, stored on ledger row
```

- `feeBearer = "platform"`: no markup, tutor gets `basePrice * (1 - commission)`, platform eats the store fee.
- Rounding is always **ceil on credits**, **round to 2dp on NGN**.
- Every spend row stores a `pricing` snapshot (rate, commission, fee mode, base price, credit price, tutor share),
  so config changes never rewrite history.
- Admin config endpoint returns a **margin warning** if
  `(cheapest pack price per credit) * (1 - storeFeePct) < nairaPerCredit` (i.e. you lose money on every credit).

---

## 2. Backend (`/backend/src`)

### 2.1 Models

**`models/credit-account.model.js`**
```
userId (unique), balance (Number, integer, default 0), lifetimePurchased, lifetimeSpent,
negativeSince (Date, set when a refund pushes the balance < 0; blocks spending)
```

**`models/credit-transaction.model.js`** (append-only ledger)
```
userId, type: purchase | spend | refund | clawback | adjustment | bonus | renewal
amount (signed int), balanceAfter,
status: completed | failed
idempotencyKey (unique)           // e.g. "rc:<storeTransactionId>", "spend:<paymentId>"
store: { platform, productId, storeTransactionId (unique sparse), eventId }
ref:   { itemType, itemId, paymentId, subscriptionId }
pricing: { basePrice, creditPrice, nairaPerCredit, commissionPct, storeFeePct, feeBearer, tutorShare }
note, createdBy (admin id for adjustments)
```

**`models/credit-pack.model.js`**
```
productId (matches App Store/Play/RevenueCat product id), credits, bonusCredits, label, badge,
sortOrder, isActive
```
Prices are *not* stored; the app reads localized prices from the store via RevenueCat.

**`models/app-config.model.js`** add:
```
credits: {
  nairaPerCredit (default 10), platformCommissionPct (default 0.20), storeFeePct (default 0.15),
  feeBearer: "student" | "tutor" | "platform" (default "student"),
  showFiatToStudents: Boolean (default false),    // iOS review safety, see §6
  renewalGraceDays: Number (default 3),
  lowBalanceThreshold: Number
}
```

**Existing models**
- `payment.model.js`: add `credits` (Number), `paymentMethod: 'credits'`, `pricing` snapshot.
  Keep `itemType`/`itemId`; `Payment` stays the order record, the ledger is the money record.
- `subscription.model.js`: replace `plan.amount (NGN)` with `plan.credits`; drop Paystack
  authorization fields; add `graceUntil`.
- `transaction.model.js`: unchanged (tutor NGN wallet). Credits live only in the new ledger.

### 2.2 Services

- `services/credit-pricing.service.js`: `quote(basePrice, cfg)` returns `{creditPrice, tutorShare, ...}`. Pure function, unit-tested.
- `services/credit-ledger.service.js`:
  - `grantPurchase(userId, pack, storeTxn)`: idempotent on `idempotencyKey`. Creates the account if missing.
  - `spend(userId, credits, ref, pricing)`: atomic
    `CreditAccount.findOneAndUpdate({userId, balance: {$gte: credits}, negativeSince: null}, {$inc: {balance: -credits}})`.
    No match means `INSUFFICIENT_CREDITS` (return `required`, `balance`, `shortfall`). Writes the ledger row with `balanceAfter`.
  - `refund(userId, credits, ref)`: used when fulfilment fails after a spend (compensating entry).
  - `clawback(userId, credits, storeTxn)`: store refund. Balance may go negative; set `negativeSince`.
  - `adjust(userId, delta, adminId, note)`.
- `services/revenuecat.service.js`: verify webhook auth header; optional REST lookup for the `claim` fallback.

### 2.3 Refactor the fulfilment code (do this first, it is the riskiest change)

`handleBusinessLogic()` in `controllers/payment.controller.js` (lines ~214-388) mixes payment
verification with fulfilment for `course`, `service` and `oneOnOne`. Extract the fulfilment parts into
`services/fulfilment.service.js`:

```
fulfilCoursePurchase(payment), fulfilServicePurchase(payment), fulfilOneOnOnePurchase(payment)
```

They take a completed `Payment` and do enrolment, notification, email, GHL webhook and tutor earnings,
with no `res` object. Credit spend then calls the same functions. Paystack/Flutterwave/Stripe handlers are removed
(§2.8), so there is a single path.

Also in the extraction:
- Replace the hard-coded 80/20 in `wallet.controller.js:updateEarningsFromPurchase` with the snapshot
  `tutorShare` from the payment's pricing.
- **Existing bug to fix:** the referral reward (`payment.controller.js` ~line 232) credits `{ userId }`,
  the *buyer*, not the referrer. Fix while here (see open question 2 on whether rewards become credits).

### 2.4 Endpoints

New router `routes/credit.routes.js` mounted at `/api/v2/credits` (all `authenticate` unless noted):

| Method | Path | Purpose |
|---|---|---|
| GET | `/config` | packs (active, ordered), `nairaPerCredit`, `feeBearer`, `showFiatToStudents`, low-balance threshold |
| GET | `/balance` | `{balance}` |
| GET | `/transactions?page&limit&type` | paginated ledger |
| GET | `/quote?itemType&itemId` | `{creditPrice, balance, shortfall, basePrice?}` (authoritative; client never computes) |
| POST | `/purchase/claim` | `{storeTransactionId}`: fallback that asks RevenueCat if the purchase exists and grants it (idempotent) |
| POST | `/webhook/revenuecat` | **no auth middleware**; checks `Authorization` header against `REVENUECAT_WEBHOOK_SECRET` |

Replace `/payment/initiate` + `/payment/verify` with:

| Method | Path | Purpose |
|---|---|---|
| POST | `/payment/pay-with-credits` | `{itemType, itemId, expectedCredits}`: recompute the price; if it differs from `expectedCredits` return `PRICE_CHANGED` (409) so the app can re-confirm; else create `Payment`, `spend`, fulfil. On fulfilment failure, `refund` and mark the payment failed. Idempotency key `spend:<paymentId>`. |

Admin (existing RBAC middleware; add `credits.manage` and `credits.view` permissions to
`seedRolesPermissions.js`) under `/api/v2/admin/credits`:
`GET/PUT /config`, `GET/POST/PUT/DELETE /packs`, `GET /users/:id` (account + ledger),
`POST /users/:id/adjust`, `GET /stats` (credits sold, spent, outstanding liability, platform share).

### 2.5 Webhook handling (RevenueCat)

- Authenticate by header. Respond 200 quickly; process idempotently by `event.id` and `transaction_id`.
- Map `app_user_id` to our `userId` (the app calls `Purchases.logIn(userId)` on login).
- `NON_RENEWING_PURCHASE` (consumables) → look up the pack by `product_id` → `grantPurchase(credits + bonusCredits)`.
- Refund / cancellation event for a consumable → `clawback`.
- Unknown product or user → log, store in a `failed_events` collection, return 200 (so RevenueCat doesn't retry forever); alert.
- *Verify exact event type names against current RevenueCat docs when implementing.*
- The client also polls `/balance` for ~15 s after a purchase and, if still unchanged, calls `/purchase/claim`.
  The webhook can lag, and this prevents "I paid and got nothing".

### 2.6 Recurring services

Rework `subscription.controller.js` (`createSubscription`, `processRecurringPayment`) and keep
`utils/subscription.scheduler.js` (daily 02:00):

- Create: spend `service.credits` credits immediately, set `nextBillingDate`.
- Daily job: for due subscriptions, `spend(...)` with key `renewal:<subscriptionId>:<cycleDate>`.
  - Success: advance `nextBillingDate`.
  - Insufficient: set `graceUntil = now + renewalGraceDays`, send a "top up to keep access" notification
    (also at T-1 day before renewal if the balance is short). Retry daily during grace.
  - Grace expired: `status = 'lapsed'`, revoke access.
- Remove all Paystack code from this controller.

### 2.7 Session-based services and one-on-one

- Credits are spent at purchase (same as today's payment moment).
- Provider payout stays tied to `completeServiceSession` (staff marks complete), now paying out NGN from the
  stored `tutorShare`.
- Cancellation/expiry without service rendered → `refund` credits (new admin action in
  `service-session.controller.js`). *Needs a quick read of that controller to wire up.*

### 2.8 Remove old payment paths

- Delete (or guard behind `PAYMENTS_LEGACY_ENABLED=false`) the Paystack/Flutterwave/Stripe webhooks,
  `initiateCardPayment`, `validatePayment*`, `processAbandonedPayments`, and `abandoned-checkout.scheduler.js`
  (the scheduler is registered in `server.js` lines ~190-199).
- Keep `/payment/history` but return credit-spend orders.

### 2.9 Data reset script: `scripts/resetPaymentData.js`

- `--dry-run` by default; requires `--confirm`; writes a JSON backup to `backend/backups/` first.
- Clears: `payments`, `transactions`, `withdrawals`, subscriptions, resets `Wallet` balances to 0.
- Does **not** touch enrolments unless `--revoke-enrolments` is passed (open question 4).
- Reuses what `scripts/clearAllTransactions.js` already does; read it before writing.

---

## 3. Mobile (`/mobile`, Expo 54 / expo-router / react-query / zustand)

### 3.1 SDK

- `npx expo install react-native-purchases`. Needs a **dev build / EAS build** (the project already has `ios/` and
  `android/`), so Expo Go won't work for purchases.
- `lib/purchases.ts`: `Purchases.configure({apiKey})` with platform-specific public SDK keys from env.
  Call `Purchases.logIn(user.id)` in `context/auth-context.tsx` after login and `Purchases.logOut()` on logout.
- Never grant credits client-side. The client only starts the purchase and waits for the server balance.

### 3.2 API layer

- `lib/api-services/credits.ts`: `useCreditConfig`, `useCreditBalance`, `useCreditTransactions`,
  `useCreditQuote`, `usePayWithCredits`, `useClaimPurchase` (react-query, matching `payment.ts` style).
- Delete/replace `useInitiatePayment` / `verifyPayment` in `lib/api-services/payment.ts`; remove `components/courses/payment` (Paystack webview).

### 3.3 Screens and components

| File | Change |
|---|---|
| `app/account/credits/index.tsx` (new) | Balance card, pack grid (store-localized price + credits + bonus badge), history link |
| `app/account/credits/history.tsx` (new) | Ledger list (purchase / spend / refund) with item names |
| `components/credits/CreditBalancePill.tsx` (new) | Balance in header of home and account tabs; tapping opens the credits screen |
| `components/credits/CreditPrice.tsx` (new) | Renders "250 credits" everywhere a price is shown (replaces ₦ formatting for students) |
| `components/credits/PurchaseConfirmSheet.tsx` (new) | "Cost 250 · Balance 600 · After 350"; confirm button; handles `PRICE_CHANGED` |
| `components/credits/InsufficientCreditsSheet.tsx` (new) | "You need 250, you have 120" with the smallest pack that covers the shortfall highlighted, then buy then auto-continue |
| `app/course/[id]/enroll/index.tsx` | Replace the Paystack flow with confirm sheet and `pay-with-credits` |
| Service / one-on-one / subscription screens (`app/account/service-sessions.tsx`, `one-on-one-sessions.tsx`, service detail screens) | Same sheet-based flow |
| Tutor course create/edit (`app/tutor-course`, `components/courses`) | Keep the NGN price input; show live "Students pay ≈ N credits" beneath it using `/credits/config` + the shared formula (server `/quote` is authoritative on save) |
| `app/account/wallet/*` | Tutor-only NGN earnings and withdrawals; relabel "Earnings"; no credit-to-cash entry points |
| i18n (`lib/i18n/locales/en|es|fr.json`) | Add credit strings in all three |

`showFiatToStudents` (config): when `true`, student screens also show the naira equivalent beside the credits.
Ships `false` for the App Store submission (see §6).

### 3.4 Purchase flow (client)

```
Credits screen → tap pack → Purchases.purchasePackage(pkg)
  → success: show "Adding credits…", poll GET /credits/balance (1s interval, 15s)
        → balance increased: toast + resume pending purchase (if started from InsufficientCreditsSheet)
        → no change after 15s: POST /credits/purchase/claim {storeTransactionId}
  → userCancelled: no-op
  → error: toast, nothing charged
```
Handle unfinished transactions on app start (RevenueCat does this; just re-fetch the balance on foreground).

---

## 4. Store and RevenueCat setup (do in parallel, it has lead time)

1. App Store Connect: Paid Apps Agreement, banking and tax signed; **Apple Small Business Program** enrolment (15%).
2. Google Play Console: merchant account; confirm the reduced service-fee tier (15% on first $1M).
3. Create **identical consumable product IDs** on both stores, e.g. `credits_100`, `credits_500`, `credits_1000`, `credits_5000`.
   Set prices per storefront (NGN supported on both).
4. RevenueCat: project, iOS and Android apps, import products, "default" offering with one package per pack
   (no entitlements needed for consumables), webhook to `/api/v2/credits/webhook/revenuecat` with a shared secret.
5. Seed `CreditPack` rows via a script (`scripts/seedCreditPacks.js`) matching the product IDs.
6. Sandbox: App Store sandbox tester and Play license testers.

Pack sizing suggestion (adjust to your rate): bigger packs give a better per-credit price (e.g. +5% / +10% bonus
credits) so students top up less often, and fewer small purchases means a lower fixed share lost to store fees.

---

## 5. Build order

| Phase | Work | Output |
|---|---|---|
| 0 | Store/RevenueCat setup (§4), runs in parallel with all phases | Sandbox purchase works end-to-end |
| 1 | Models, config, pricing service (+ unit tests), ledger service (+ concurrency/idempotency tests) | Testable core |
| 2 | Extract fulfilment service; `/credits/*` endpoints; RevenueCat webhook; `pay-with-credits` | Backend complete for courses |
| 3 | Services, one-on-one, recurring renewals and grace job, refund on cancellation | Backend complete for all item types |
| 4 | Admin endpoints and permissions; margin warning; stats | Admin can tune rate/fee bearer |
| 5 | Mobile: SDK, credits screen, balance pill, confirm and insufficient sheets, enroll flow | Student path works |
| 6 | Mobile: service/one-on-one/subscription screens, tutor price preview, i18n | Feature-complete |
| 7 | Remove legacy payment code; reset script (dry run, then run on staging) | Clean slate |
| 8 | TestFlight and Play internal testing; review notes; submit | Resubmission |

Rough size: backend ~1-1.5 weeks, mobile ~1-1.5 weeks, store setup and QA in parallel.

---

## 6. App Review checklist (3.1.1)

- No Paystack/Stripe/card UI, no "pay on our website" text, no external payment links anywhere in the iOS build.
- Credits only purchasable through IAP; credits never convertible to cash; no gifting or transfer between users.
- Student screens show credits only (`showFiatToStudents=false`). Naira appears for tutors (creating prices, earnings)
  and withdrawals; that is a payout of earnings, not a purchase.
- Review notes: explain the credit model, give a demo student with credits and a demo tutor, describe that tutor
  earnings are paid out to bank accounts.
- Credits must not expire (Apple dislikes expiring consumable credits). Don't add expiry.
- Privacy/data: update the App Privacy answers (purchase history).

## 7. Risks

- **Store refunds after tutor payout**: a student refunds a pack after spending; the tutor has already been paid in NGN.
  Mitigation: a hold period on new tutor earnings (e.g. `pendingBalance` released after 7 days). Not in v1 scope
  unless you want it (open question 3).
- **Margin**: easy to misconfigure rate vs pack prices; covered by the margin warning in the admin config endpoint.
- **Webhook delays/failures**: covered by claim fallback, idempotency, and a failed-events table with alerting.
- **Negative balances** from clawbacks: spending is blocked until topped up; surfaced in the admin user view.
- **Concurrency**: all balance changes go through one conditional atomic update; add a test that fires 20 parallel
  spends against a balance that only covers 3.

## 8. Open questions

1. Defaults for `nairaPerCredit`, `platformCommissionPct`, `storeFeePct`, `feeBearer`? (Suggested: 10, 20%, 15%, `student`.)
2. Referral rewards (currently 10% in NGN): convert to credits for the referrer? (Recommended, and it avoids cash promos.)
3. Hold period on tutor earnings to protect against store refunds: yes/no, and how long?
4. When wiping data, keep or revoke existing course/service enrolments?
5. Confirm pack sizes and bonus tiers.
6. RevenueCat plan: OK to depend on it? (Recommended.)
