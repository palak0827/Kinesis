/**
 * Centralized Pricing & Membership Engine for Kinesis Sports Club
 * Single source of truth for:
 * - Active vs Expired vs Walk-In pricing contexts
 * - Court booking pricing & limits
 * - Gear Shop discounts
 * - Café & Bar discounts
 * - Membership duration options & savings formula
 */

/**
 * Check if a member currently has active paid membership benefits.
 * Rules:
 * - Not a Walk-In user
 * - Has an assigned membership plan
 * - status === 'active'
 * - Current date <= expiry_date
 */
export function isMembershipActive(member) {
  if (!member) return false;
  
  // Walk-In check
  if (member.user_type === 'WALK_IN' || (!member.plan_id && !member.membership_plans)) {
    return false;
  }

  // Active status check
  if (member.status !== 'active') {
    return false;
  }

  // Expiry date check
  if (member.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(member.expiry_date);
    expiry.setHours(23, 59, 59, 999);
    if (today > expiry) {
      return false;
    }
  }

  return true;
}

/**
 * Returns the number of days remaining until membership expires.
 * Returns negative numbers if already expired.
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Resolves the full pricing and privileges context for any user.
 */
export function getUserPricingContext(member) {
  const isWalkIn = !member || member.user_type === 'WALK_IN' || (!member.plan_id && !member.membership_plans);
  const isActive = isMembershipActive(member);
  const daysRemaining = member?.expiry_date ? getDaysUntilExpiry(member.expiry_date) : null;
  const isExpired = !isWalkIn && (member?.status === 'expired' || (daysRemaining !== null && daysRemaining < 0));
  const isExpiringSoon = isActive && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;

  const plan = member?.membership_plans;
  const planName = isActive ? (plan?.name || 'Standard') : (isWalkIn ? 'Walk-In Guest' : 'Expired Member');

  return {
    isWalkIn,
    isActiveMember: isActive,
    isExpired,
    isExpiringSoon,
    daysRemaining,
    planName,
    courtDiscountPercent: isActive ? Number(plan?.court_discount || 0) : 0,
    shopDiscountPercent: isActive ? Number(plan?.shop_discount || 0) : 0,
    barDiscountPercent: isActive ? Number(plan?.bar_discount || 0) : 0,
    dailyBookingLimit: isActive ? Number(plan?.daily_booking_limit || 2) : 1
  };
}

/**
 * Duration options for Membership purchase / renewal
 * 1 Month: 0% discount
 * 3 Months: 5% discount
 * 6 Months: 10% discount
 * 12 Months: 15% discount
 */
export const MEMBERSHIP_DURATIONS = [
  { id: 'monthly', label: 'Monthly', months: 1, discountPercent: 0, tag: 'Standard' },
  { id: 'quarterly', label: 'Quarterly', months: 3, discountPercent: 5, tag: 'Save 5%' },
  { id: 'half-yearly', label: 'Half-Yearly', months: 6, discountPercent: 10, tag: 'Save 10%' },
  { id: 'annual', label: 'Annual', months: 12, discountPercent: 15, tag: 'Best Value' }
];

/**
 * Calculate membership subscription price based on monthly base and selected duration
 */
export function calculateMembershipPrice(monthlyPrice, durationMonths = 1) {
  const baseMonthly = Number(monthlyPrice) || 0;
  const months = Number(durationMonths) || 1;

  const durationConfig = MEMBERSHIP_DURATIONS.find(d => d.months === months) || {
    discountPercent: months >= 12 ? 15 : months >= 6 ? 10 : months >= 3 ? 5 : 0
  };

  const discountPercent = durationConfig.discountPercent;
  const baseAmount = Number((baseMonthly * months).toFixed(2));
  const durationDiscountAmount = Number(((baseAmount * discountPercent) / 100).toFixed(2));
  const finalPrice = Number(Math.max(0, baseAmount - durationDiscountAmount).toFixed(2));

  // Calendar month expiry calculation
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);

  return {
    monthlyPrice: baseMonthly,
    months,
    discountPercent,
    baseAmount,
    durationDiscountAmount,
    finalPrice,
    startDateStr: startDate.toISOString().split('T')[0],
    expiryDateStr: expiryDate.toISOString().split('T')[0]
  };
}

/**
 * Calculate court price for a given user based on 30-minute slot rate and duration
 * numberOfSlots = durationMinutes / 30
 * Base Price = 30-minute court rate * numberOfSlots
 * Final Price = Base Price - (Base Price * Court Discount %)
 */
export function calculateCourtPrice(courtRate30Min, member, durationMinutes = 30) {
  const ratePer30Min = Number(courtRate30Min) || 0;
  const minutes = Number(durationMinutes) || 30;
  const numberOfSlots = Math.max(1, Math.round(minutes / 30));
  const basePrice = Number((ratePer30Min * numberOfSlots).toFixed(2));

  const ctx = getUserPricingContext(member);
  const discountPercent = ctx.courtDiscountPercent;
  const discountAmount = Number(((basePrice * discountPercent) / 100).toFixed(2));
  const finalPrice = Number(Math.max(0, basePrice - discountAmount).toFixed(2));

  return {
    ratePer30Min,
    durationMinutes: minutes,
    numberOfSlots,
    basePrice,
    discountPercent,
    discountAmount,
    finalPrice,
    planName: ctx.planName,
    isWalkIn: ctx.isWalkIn
  };
}

/**
 * Calculate Gear Shop product price for a given user
 */
export function calculateShopPrice(productPrice, member) {
  const basePrice = Number(productPrice) || 0;
  const ctx = getUserPricingContext(member);
  const discountPercent = ctx.shopDiscountPercent;
  const discountAmount = Number(((basePrice * discountPercent) / 100).toFixed(2));
  const finalPrice = Number(Math.max(0, basePrice - discountAmount).toFixed(2));

  return {
    basePrice,
    discountPercent,
    discountAmount,
    finalPrice,
    planName: ctx.planName,
    isWalkIn: ctx.isWalkIn
  };
}

/**
 * Calculate Café & Bar product price for a given user
 */
export function calculateCafePrice(productPrice, member) {
  const basePrice = Number(productPrice) || 0;
  const ctx = getUserPricingContext(member);
  const discountPercent = ctx.barDiscountPercent;
  const discountAmount = Number(((basePrice * discountPercent) / 100).toFixed(2));
  const finalPrice = Number(Math.max(0, basePrice - discountAmount).toFixed(2));

  return {
    basePrice,
    discountPercent,
    discountAmount,
    finalPrice,
    planName: ctx.planName,
    isWalkIn: ctx.isWalkIn
  };
}
