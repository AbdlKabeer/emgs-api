/**
 * Fulfilment of paid items (course enrolment, service session, one-on-one subscription).
 * Extracted from payment.controller's handleBusinessLogic so credit spending and any other
 * payment path share one implementation. No req/res here: functions throw on failure.
 */
const Course = require('../models/course.model');
const Service = require('../models/service.model');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const Notification = require('../models/notification.model');
const emailService = require('./email.service');
const { sendWebhook } = require('./webhook.service');
const ledger = require('./credit-ledger.service');
const { getCreditConfig } = require('./credit-pricing.service');

const DAY = 24 * 60 * 60 * 1000;

class FulfilmentError extends Error {
  constructor(message, code = 'BAD_REQUEST', status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Pay a tutor/provider in NGN from the stored tutor share (their existing earnings wallet).
async function creditTutorEarnings({ tutorId, tutorShare, platformFee = 0, description, paymentId, courseId, source = 'credits' }) {
  if (!tutorId || !(tutorShare > 0)) return null;
  let wallet = await Wallet.findOne({ userId: tutorId });
  if (!wallet) wallet = new Wallet({ userId: tutorId });
  wallet.balance += tutorShare;
  wallet.earned += tutorShare;
  await wallet.save();
  await Transaction.create({
    userId: tutorId, walletId: wallet._id, amount: tutorShare, type: 'earnings', status: 'completed',
    metadata: { courseId, paymentId, source }, description,
  });
  if (platformFee > 0) {
    await Transaction.create({
      userId: tutorId, walletId: wallet._id, amount: platformFee, type: 'platform_fee', status: 'completed',
      metadata: { courseId, paymentId, source }, description: `Platform fee: ${description}`,
    });
  }
  return wallet;
}

// Reward the referrer with credits on the referred user's first purchase that is large enough to
// earn at least one whole credit. A smaller purchase leaves the referral open for the next one,
// instead of using it up without paying anything.
async function rewardReferrer(user, creditsSpent) {
  if (!user.referredBy || user.referralPointDisbursed) return;
  const cfg = await getCreditConfig();
  const reward = Math.floor(creditsSpent * cfg.referralRewardPct);
  if (reward < 1) return;
  const referrer = await User.findById(user.referredBy).select('_id');
  if (!referrer) return;

  // Idempotent per referee, so concurrent first purchases can only pay once.
  const result = await ledger.credit({
    userId: referrer._id, amount: reward, type: 'referral', idempotencyKey: `referral:${user._id}`,
    note: `Referral reward: ${user.fullName || 'a friend'} made their first purchase`,
  });
  if (result.applied) {
    await Notification.create({
      userId: referrer._id, title: 'Referral reward',
      message: `You earned ${reward} credits because ${user.fullName || 'someone you referred'} made a purchase.`,
      type: 'course',
    });
  }
  await User.updateOne({ _id: user._id }, { $set: { referralPointDisbursed: true } });
  await User.updateOne({ _id: referrer._id }, { $addToSet: { referrals: user._id } });
}


// Credits purchases and card (web) purchases both carry a pricing snapshot; card payments have
// credits === 0, so payouts key off the snapshot and referral rewards off the credit-equivalent price.
const payoutSource = (payment) => (payment.paymentMethod === 'credits' ? 'credits' : 'card');
const referralBasis = (payment) => (payment.credits > 0 ? payment.credits : Number(payment.pricing?.creditPrice) || 0);
const priceLabel = (payment) => (payment.credits > 0 ? `${payment.credits} credits` : `₦${Number(payment.amount).toLocaleString()}`);

async function fulfilCourse(payment) {
  const userId = payment.userId;
  const course = await Course.findById(payment.itemId);
  if (!course) throw new FulfilmentError('Course not found', 'NOT_FOUND', 404);
  const user = await User.findById(userId);
  if (!user) throw new FulfilmentError('User not found', 'NOT_FOUND', 404);
  if (user.enrolledCourses.some((id) => id.toString() === course._id.toString())) {
    throw new FulfilmentError('You are already enrolled in this course', 'ALREADY_ENROLLED', 409);
  }

  await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: course._id } });
  await Course.findByIdAndUpdate(course._id, { $addToSet: { enrolledUsers: userId } });
  await Notification.create({
    userId, title: 'Course Enrollment', message: `You have successfully enrolled in ${course.title}`,
    type: 'course', relatedItemId: course._id,
  });

  {
    const pricing = payment.pricing || {};
    if (course.courseType !== 'emgs') {
      await creditTutorEarnings({
        tutorId: course.createdBy, tutorShare: pricing.tutorShare,
        platformFee: pricing.basePrice ? pricing.basePrice - pricing.tutorShare : 0,
        description: `Earnings from ${course.title}`, paymentId: payment._id, courseId: course._id,
        source: payoutSource(payment),
      });
    }
    if (referralBasis(payment) > 0) await rewardReferrer(user, referralBasis(payment));
  }

  emailService.sendPurchaseSuccessEmail(user.email, user.fullName, course.title, priceLabel(payment), payment._id)
    .catch((e) => console.error('Error sending course purchase email:', e));
  sendWebhook('course_payment_success', {
    user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone },
    course: { id: course._id, title: course.title, price: course.price },
    payment: { id: payment._id, credits: payment.credits, method: payment.paymentMethod },
  }).catch((e) => console.error('Error sending GHL webhook for course:', e));
  return { itemName: course.title };
}

async function fulfilService(payment) {
  const userId = payment.userId;
  const service = await Service.findById(payment.itemId);
  if (!service) throw new FulfilmentError('Service not found', 'NOT_FOUND', 404);
  const user = await User.findById(userId);
  if (!user) throw new FulfilmentError('User not found', 'NOT_FOUND', 404);

  const sessionValidityDays = service.sessionValidityDays || 30;
  const expiryDate = new Date(Date.now() + sessionValidityDays * DAY);
  const idx = user.serviceSubscriptions.findIndex((s) =>
    s.serviceId.toString() === service._id.toString() && s.isActive && (!s.expiry || new Date(s.expiry) > new Date()));
  if (idx >= 0) {
    Object.assign(user.serviceSubscriptions[idx], {
      isActive: true, expiry: expiryDate, purchasedAt: new Date(), paymentId: payment._id,
    });
  } else {
    user.serviceSubscriptions.push({
      serviceId: service._id, isActive: true, expiry: expiryDate, purchasedAt: new Date(), paymentId: payment._id,
    });
  }
  if (!user.enrolledServices.some((id) => id.toString() === service._id.toString())) {
    user.enrolledServices.push(service._id);
  }
  await user.save();
  await Service.findByIdAndUpdate(service._id, { $addToSet: { enrolledUsers: userId } });
  await Notification.create({
    userId, title: 'Service Session Purchased',
    message: `You have successfully purchased a session for ${service.name}. Valid until ${expiryDate.toLocaleDateString()}. Staff will mark it complete once service is rendered.`,
    type: 'service', relatedItemId: service._id,
  });
  // Provider payout happens when staff completes the session (service-session.controller).
  if (referralBasis(payment) > 0) await rewardReferrer(user, referralBasis(payment));
  emailService.sendPurchaseSuccessEmail(user.email, user.fullName, service.name, priceLabel(payment), payment._id)
    .catch((e) => console.error('Error sending service purchase email:', e));
  return { itemName: service.name, sessionExpiry: expiryDate, sessionValidityDays };
}

async function fulfilOneOnOne(payment) {
  const userId = payment.userId;
  const tutor = await User.findById(payment.itemId);
  if (!tutor || tutor.role !== 'tutor') throw new FulfilmentError('Tutor not found', 'NOT_FOUND', 404);
  const user = await User.findById(userId);
  if (!user) throw new FulfilmentError('User not found', 'NOT_FOUND', 404);

  const expiryDate = new Date(Date.now() + 30 * DAY);
  const idx = user.oneOnOneSubscriptions.findIndex((s) => s.tutorId.toString() === tutor._id.toString());
  if (idx >= 0) {
    user.oneOnOneSubscriptions[idx].isActive = true;
    user.oneOnOneSubscriptions[idx].expiry = expiryDate;
  } else {
    user.oneOnOneSubscriptions.push({ tutorId: tutor._id, isActive: true, expiry: expiryDate });
  }
  await user.save();
  await Notification.create({
    userId, title: 'One-on-One Tutor Subscription',
    message: `You have successfully subscribed to one-on-one tutoring with ${tutor.fullName}`,
    type: 'service', relatedItemId: tutor._id,
  });
  {
    const pricing = payment.pricing || {};
    await creditTutorEarnings({
      tutorId: tutor._id, tutorShare: pricing.tutorShare,
      platformFee: pricing.basePrice ? pricing.basePrice - pricing.tutorShare : 0,
      description: `One-on-one subscription from ${user.fullName}`, paymentId: payment._id,
      source: payoutSource(payment),
    });
    if (referralBasis(payment) > 0) await rewardReferrer(user, referralBasis(payment));
  }
  emailService.sendPurchaseSuccessEmail(user.email, user.fullName, `One-on-One Tutoring with ${tutor.fullName}`, priceLabel(payment), payment._id)
    .catch((e) => console.error('Error sending one-on-one purchase email:', e));
  sendWebhook('one_on_one_payment_success', {
    user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone },
    tutor: { id: tutor._id, fullName: tutor.fullName, email: tutor.email },
    payment: { id: payment._id, credits: payment.credits, method: payment.paymentMethod },
  }).catch((e) => console.error('Error sending GHL webhook for one-on-one:', e));
  return { itemName: `One-on-One with ${tutor.fullName}`, expiry: expiryDate };
}

async function fulfil(payment) {
  switch (payment.itemType) {
    case 'course': return fulfilCourse(payment);
    case 'service': return fulfilService(payment);
    case 'oneOnOne':
    case 'one-on-one': return fulfilOneOnOne(payment);
    default: throw new FulfilmentError('Invalid payment type');
  }
}

module.exports = { fulfil, FulfilmentError, creditTutorEarnings, rewardReferrer };
