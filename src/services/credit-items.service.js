const Course = require('../models/course.model');
const Service = require('../models/service.model');
const User = require('../models/user.model');
const { FulfilmentError } = require('./fulfilment.service');

const normaliseType = (t) => (t === 'one-on-one' ? 'oneOnOne' : t);

/**
 * Resolve a purchasable item to its NGN base price. Throws FulfilmentError if it cannot be bought.
 * Returns { itemType, itemId, itemName, basePrice, isFree }.
 */
async function resolveItem(userId, rawType, itemId) {
  const itemType = normaliseType(rawType);

  if (itemType === 'course') {
    const course = await Course.findById(itemId);
    if (!course) throw new FulfilmentError('Course not found', 'NOT_FOUND', 404);
    const user = await User.findById(userId);
    if (user && user.enrolledCourses.some((id) => id.toString() === course._id.toString())) {
      throw new FulfilmentError('You are already enrolled in this course', 'ALREADY_ENROLLED', 409);
    }
    const basePrice = course.isFree ? 0 : Number(course.price) || 0;
    return { itemType, itemId: course._id, itemName: course.title, basePrice, isFree: basePrice <= 0 };
  }

  if (itemType === 'service') {
    const service = await Service.findById(itemId);
    if (!service) throw new FulfilmentError('Service not found', 'NOT_FOUND', 404);
    if (!service.isActive) throw new FulfilmentError('Service is not active', 'NOT_ACTIVE', 400);
    const user = await User.findById(userId);
    const hasActive = (user?.serviceSubscriptions || []).some((s) =>
      s.serviceId && s.serviceId.toString() === service._id.toString() && s.isActive &&
      (!s.expiry || new Date(s.expiry) > new Date()));
    if (hasActive) {
      throw new FulfilmentError('You already have an active session for this service.', 'ACTIVE_SESSION_EXISTS', 400);
    }
    const basePrice = service.sessionEnabled && service.sessionPrice ? service.sessionPrice : service.price;
    if (!basePrice) throw new FulfilmentError('Service price not set', 'PRICE_NOT_SET', 400);
    return { itemType, itemId: service._id, itemName: service.name, basePrice: Number(basePrice), isFree: false };
  }

  if (itemType === 'oneOnOne') {
    const tutor = await User.findById(itemId);
    if (!tutor || tutor.role !== 'tutor') throw new FulfilmentError('Tutor not found', 'NOT_FOUND', 404);
    const basePrice = Number(tutor.servicePrice) || 5000;
    return { itemType, itemId: tutor._id, itemName: `One-on-One with ${tutor.fullName}`, basePrice, isFree: false };
  }

  throw new FulfilmentError('Invalid item type', 'BAD_REQUEST', 400);
}

module.exports = { resolveItem, normaliseType };
