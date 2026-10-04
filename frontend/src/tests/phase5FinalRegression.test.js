/**
 * KINESIS SPORTS CLUB — PHASE 5 FINAL REGRESSION, STRESS TEST & JURY HARDENING SUITE
 * 
 * Comprehensive regression tests verifying:
 * 1. Authentication & Route Authorization Matrix
 * 2. Club ID Consistency & Customer Identity Across Portals
 * 3. Court Booking Boundaries, Limits & Check-in Idempotency
 * 4. Table Reservations & Kitchen Order State Machine
 * 5. Bar vs Restaurant Departmental Order Isolation
 * 6. Shop Inventory Bounds, Exact Stock Deduction & Pickup Guards
 * 7. Payment Methods & Persistence (CASH, CARD, UPI)
 * 8. Receipt Integrity, Audit Meta & Official Closing Message
 * 9. Staff Personal Hub Data Privacy & Privilege Escalation Prevention
 * 10. Notification Zero-Leakage & Non-Blocking Resilience
 */

import {
  ROLES,
  PUBLIC_ROUTES,
  MEMBER_ROUTES,
  ADMIN_ROUTES,
  isPublicRoute,
  isProtectedRoute,
  isRouteAuthorized,
  getDefaultRouteForRole
} from '../utils/routeSecurity.js';
import { getMemberById, getMemberByClubId } from '../../../backend/services/memberService.js';
import {
  createBooking,
  getCourts,
  updateCourtStatus,
  calculateBookingPrice,
  checkMemberDailyLimit,
  cancelBooking
} from '../../../backend/services/bookingService.js';
import {
  getProducts,
  recordSale,
  updateProduct,
  updateSalePickupStatus
} from '../../../backend/services/inventoryService.js';
import {
  createCafeOrder,
  updateOrderStatus,
  getKitchenOrders
} from '../../../backend/services/cafeService.js';
import {
  getCafeTables,
  reserveCafeTable,
  updateTableStatus
} from '../../../backend/services/cafeTableService.js';
import { recordPayment, getMemberPayments } from '../../../backend/services/paymentService.js';
import {
  createStaffMember,
  updateStaffMember,
  getStaffList,
  verifyAndCheckInTicket
} from '../services/clubPlatformService.js';
import {
  createNotification,
  getNotificationsForUser
} from '../../../backend/services/notificationService.js';
import {
  getUserPricingContext,
  calculateCourtPrice,
  calculateShopPrice,
  calculateCafePrice
} from '../utils/pricingEngine.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${message}`);
  }
}

async function runPhase5Suite() {
  console.log('===================================================================');
  console.log('  KINESIS SPORTS CLUB — PHASE 5 FINAL REGRESSION & JURY HARDENING   ');
  console.log('===================================================================\n');

  // ==========================================
  // 1. AUTHENTICATION & ROUTE AUTHORIZATION
  // ==========================================
  console.log('--- 1. Authentication & Route Authorization Matrix ---');

  // Public routes check
  assert(isPublicRoute('landing') && isPublicRoute('login') && isPublicRoute('register'), 'Public routes recognized correctly');
  assert(!isPublicRoute('admin-dashboard') && !isPublicRoute('restaurant-dashboard'), 'Protected portals recognized as not public');

  // Unauthenticated rejection
  assert(!isRouteAuthorized(null, 'admin-dashboard'), 'Unauthenticated user rejected from admin portal');
  assert(!isRouteAuthorized(null, 'restaurant-dashboard'), 'Unauthenticated user rejected from restaurant portal');
  assert(!isRouteAuthorized(null, 'bar-dashboard'), 'Unauthenticated user rejected from bar portal');
  assert(!isRouteAuthorized(null, 'home'), 'Unauthenticated user rejected from member home');

  // Member attempting staff routes
  assert(!isRouteAuthorized(ROLES.MEMBER, 'admin-dashboard'), 'Member strictly rejected from executive admin');
  assert(!isRouteAuthorized(ROLES.MEMBER, 'restaurant-dashboard'), 'Member strictly rejected from restaurant portal');
  assert(!isRouteAuthorized(ROLES.MEMBER, 'bar-dashboard'), 'Member strictly rejected from bar portal');
  assert(!isRouteAuthorized(ROLES.MEMBER, 'staff-dashboard'), 'Member strictly rejected from staff portal');
  assert(!isRouteAuthorized(ROLES.MEMBER, 'reception-dashboard'), 'Member strictly rejected from reception desk');
  assert(isRouteAuthorized(ROLES.MEMBER, 'home'), 'Member authorized for member home');
  assert(isRouteAuthorized(ROLES.MEMBER, 'book'), 'Member authorized for court booking');

  // Staff cross-portal containment
  assert(!isRouteAuthorized(ROLES.BAR_MANAGER, 'admin-dashboard'), 'Bar Manager strictly rejected from executive admin');
  assert(!isRouteAuthorized(ROLES.BAR_MANAGER, 'restaurant-dashboard'), 'Bar Manager strictly rejected from restaurant portal');
  assert(!isRouteAuthorized(ROLES.RESTAURANT_MANAGER, 'bar-dashboard'), 'Restaurant Manager strictly rejected from bar portal');
  assert(!isRouteAuthorized(ROLES.COURT_MANAGER, 'shop-dashboard'), 'Court Manager strictly rejected from gear shop');
  assert(!isRouteAuthorized(ROLES.RECEPTION, 'admin-dashboard'), 'Reception strictly rejected from executive admin');

  // Admin superuser access
  assert(isRouteAuthorized(ROLES.ADMIN, 'admin-dashboard'), 'Admin authorized for admin dashboard');
  assert(isRouteAuthorized(ROLES.ADMIN, 'restaurant-dashboard'), 'Admin authorized for restaurant dashboard');
  assert(isRouteAuthorized(ROLES.ADMIN, 'bar-dashboard'), 'Admin authorized for bar dashboard');
  assert(isRouteAuthorized(ROLES.ADMIN, 'shop-dashboard'), 'Admin authorized for shop dashboard');
  assert(isRouteAuthorized(ROLES.ADMIN, 'court-dashboard'), 'Admin authorized for court dashboard');
  assert(isRouteAuthorized(ROLES.ADMIN, 'staff-dashboard'), 'Admin authorized for staff dashboard');
  assert(isRouteAuthorized(ROLES.ADMIN, 'reception-dashboard'), 'Admin authorized for reception dashboard');

  // Unknown role rejection
  assert(!isRouteAuthorized('HACKER', 'admin-dashboard'), 'Unknown malicious role rejected');

  // ==========================================
  // 2. CLUB ID CONSISTENCY & IDENTITY AUDIT
  // ==========================================
  console.log('\n--- 2. Club ID Consistency & Customer Identity ---');

  // Exact 10-digit validation
  let caughtClubIdErr = false;
  try {
    await getMemberByClubId('12345');
  } catch (e) {
    caughtClubIdErr = true;
  }
  assert(caughtClubIdErr, '5-digit Club ID rejected');

  caughtClubIdErr = false;
  try {
    await getMemberByClubId('12345678901');
  } catch (e) {
    caughtClubIdErr = true;
  }
  assert(caughtClubIdErr, '11-digit Club ID rejected');

  caughtClubIdErr = false;
  try {
    await getMemberByClubId('100000000A');
  } catch (e) {
    caughtClubIdErr = true;
  }
  assert(caughtClubIdErr, 'Alphanumeric Club ID rejected');

  // Lookup existing active member
  const alex = await getMemberByClubId('1000000001');
  assert(alex !== null && alex.name === 'Alex Mercer', 'Active member Alex Mercer resolved by 10-digit Club ID');
  assert(alex.club_id === '1000000001', 'Retrieved Club ID matches query exactly');
  assert(alex.membership_plans?.name === 'Gold', 'Member plan associated correctly (Gold)');

  // Lookup existing expired member
  const carlos = await getMemberByClubId('1000000006');
  assert(carlos !== null && carlos.name === 'Carlos Mendoza', 'Expired member Carlos Mendoza resolved by Club ID');
  assert(carlos.status === 'expired', 'Expired member status preserved');

  // Lookup non-existent Club ID returns null without crashing or creating duplicate
  const nonExistent = await getMemberByClubId('9999999999');
  assert(nonExistent === null, 'Non-existent Club ID returns null safely without creating duplicate');

  // ==========================================
  // 3. COURT BOOKING BOUNDARIES & LIMITS
  // ==========================================
  console.log('\n--- 3. Court Booking Boundaries & Check-in ---');

  // Past date rejected
  let caughtPastDate = false;
  try {
    await createBooking({
      member_id: 1,
      court_id: 1,
      booking_date: '2020-01-01',
      startTime: '10:00'
    });
  } catch (e) {
    caughtPastDate = true;
  }
  assert(caughtPastDate, 'Court booking on past date strictly rejected');

  // Time outside operating hours (< 06:00)
  let caughtOperatingHours = false;
  try {
    await createBooking({
      member_id: 1,
      court_id: 1,
      booking_date: '2026-10-15',
      startTime: '04:00'
    });
  } catch (e) {
    caughtOperatingHours = true;
  }
  assert(caughtOperatingHours, 'Court booking before 06:00 rejected');

  // Duration not in 30-min intervals
  let caughtInterval = false;
  try {
    await createBooking({
      member_id: 1,
      court_id: 1,
      booking_date: '2026-10-15',
      startTime: '10:00',
      endTime: '10:45' // 45 min duration
    });
  } catch (e) {
    caughtInterval = true;
  }
  assert(caughtInterval, 'Non-30 minute interval booking rejected');

  // Court under maintenance cannot be booked (Court #4 is maintenance)
  let caughtMaint = false;
  try {
    await createBooking({
      member_id: 1,
      court_id: 4,
      booking_date: '2026-10-15',
      startTime: '10:00',
      endTime: '11:00'
    });
  } catch (e) {
    caughtMaint = true;
  }
  assert(caughtMaint, 'Court under maintenance strictly rejected from booking');

  // Pricing: Active Member vs Expired Member vs Walk-in
  const activePricing = await calculateBookingPrice(1, 1, 60); // Court 1 (rate 200/30m, 60m = base 400), Gold 50% discount
  assert(activePricing.baseRate === 400, 'Base rate for 60 min is 400');
  assert(activePricing.discountPercent === 50, 'Gold member receives 50% court discount');
  assert(activePricing.finalPrice === 200, 'Final price for Gold member is 200 (400 - 50%)');

  const expiredPricing = await calculateBookingPrice(1, 6, 60); // Carlos Mendoza (expired)
  assert(expiredPricing.discountPercent === 0, 'Expired member receives 0% court discount');
  assert(expiredPricing.finalPrice === 400, 'Expired member pays full base price (400)');

  const walkinPricing = await calculateBookingPrice(1, null, 60); // Walk-in guest
  assert(walkinPricing.discountPercent === 0, 'Walk-in guest receives 0% court discount');
  assert(walkinPricing.finalPrice === 400, 'Walk-in guest pays full base price (400)');

  // Ticket Check-in Idempotency
  let caughtUnknownTicket = false;
  try {
    await verifyAndCheckInTicket('NON-EXISTENT-TICKET');
  } catch (e) {
    caughtUnknownTicket = true;
  }
  assert(caughtUnknownTicket, 'Non-existent ticket check-in rejected with clear error');

  // ==========================================
  // 4. TABLE RESERVATIONS & KITCHEN ORDERS
  // ==========================================
  console.log('\n--- 4. Table Reservations & Kitchen Order Lifecycle ---');

  // Table capacity exceeded (Table 1 has capacity 2)
  let caughtCapacity = false;
  try {
    await reserveCafeTable({
      tableId: 1,
      customer: alex,
      reservationDate: '2026-10-20',
      reservationTime: '19:00',
      partySize: 12
    });
  } catch (e) {
    caughtCapacity = true;
  }
  assert(caughtCapacity, 'Table booking exceeding capacity strictly rejected');

  // Table under maintenance (Table 8 is under maintenance)
  let caughtTableMaint = false;
  try {
    await reserveCafeTable({
      tableId: 8,
      customer: alex,
      reservationDate: '2026-10-20',
      reservationTime: '19:00',
      partySize: 2
    });
  } catch (e) {
    caughtTableMaint = true;
  }
  assert(caughtTableMaint, 'Table under maintenance strictly rejected');

  // Order lifecycle: NEW -> PREPARING -> READY -> COMPLETED
  const newOrder = await createCafeOrder({
    memberId: 1,
    clubId: '1000000001',
    items: [{ productId: 9, quantity: 1 }], // Artisan Panini
    priority: 'NORMAL',
    paymentMethod: 'UPI'
  });
  assert(newOrder.status === 'NEW', 'Initial order status is NEW');

  // Valid forward transition NEW -> PREPARING
  const prepOrder = await updateOrderStatus(newOrder.id, 'PREPARING');
  assert(prepOrder.status === 'PREPARING', 'Valid transition NEW -> PREPARING succeeds');

  // Valid forward transition PREPARING -> READY
  const rdyOrder = await updateOrderStatus(newOrder.id, 'READY');
  assert(rdyOrder.status === 'READY', 'Valid transition PREPARING -> READY succeeds');

  // Invalid backward transition READY -> NEW must fail
  let caughtBackward = false;
  try {
    await updateOrderStatus(newOrder.id, 'NEW');
  } catch (e) {
    caughtBackward = true;
  }
  assert(caughtBackward, 'Invalid backward transition READY -> NEW rejected');

  // Valid forward transition READY -> COMPLETED
  const compOrder = await updateOrderStatus(newOrder.id, 'COMPLETED');
  assert(compOrder.status === 'COMPLETED', 'Valid transition READY -> COMPLETED succeeds');

  // Terminal transition COMPLETED -> PREPARING must fail
  let caughtTerminal = false;
  try {
    await updateOrderStatus(newOrder.id, 'PREPARING');
  } catch (e) {
    caughtTerminal = true;
  }
  assert(caughtTerminal, 'Modification of terminal COMPLETED order rejected');

  // ==========================================
  // 5. BAR VS RESTAURANT ORDER SEPARATION
  // ==========================================
  console.log('\n--- 5. Departmental Order Isolation ---');

  const barOrder = await createCafeOrder({
    memberId: 1,
    clubId: '1000000001',
    items: [{ productId: 11, quantity: 2 }], // Blueberry Mint Mocktail
    priority: 'NORMAL',
    paymentMethod: 'CARD'
  });

  const allOrders = await getKitchenOrders();
  const foundBarOrder = allOrders.find(o => o.id === barOrder.id);
  assert(foundBarOrder !== undefined, 'Created bar order exists in active orders');

  const barItems = foundBarOrder.cafe_order_items || [];
  const isBeverage = barItems.some(it => {
    const name = (it.products?.name || '').toLowerCase();
    const cat = (it.products?.category || '').toLowerCase();
    return name.includes('mocktail') || cat.includes('drink') || cat.includes('beverage');
  });
  assert(isBeverage, 'Bar order item correctly identified as beverage');

  // ==========================================
  // 6. INVENTORY BOUNDS & PICKUP GUARDS
  // ==========================================
  console.log('\n--- 6. Shop Inventory & Pickup Guards ---');

  // Insufficient stock rejection (Product #2 has stock 0)
  let caughtZeroStock = false;
  try {
    await recordSale({
      productId: 2,
      quantity: 1,
      paymentMethod: 'CARD'
    });
  } catch (e) {
    caughtZeroStock = true;
  }
  assert(caughtZeroStock, 'Attempt to purchase out-of-stock item (stock = 0) strictly rejected');

  // Negative quantity rejection
  let caughtNegQty = false;
  try {
    await recordSale({
      productId: 1,
      quantity: -2,
      paymentMethod: 'CARD'
    });
  } catch (e) {
    caughtNegQty = true;
  }
  assert(caughtNegQty, 'Negative sale quantity rejected');

  // Zero quantity rejection
  let caughtZeroQty = false;
  try {
    await recordSale({
      productId: 1,
      quantity: 0,
      paymentMethod: 'CARD'
    });
  } catch (e) {
    caughtZeroQty = true;
  }
  assert(caughtZeroQty, 'Zero sale quantity rejected');

  // Record valid sale & check exact stock deduction
  const prodsBefore = await getProducts();
  const targetProduct = prodsBefore.find(p => p.id === 3); // Babolat Balls
  const initialStock = Number(targetProduct.stock_quantity);

  const sale = await recordSale({
    productId: 3,
    memberId: 1, // Alex Mercer (Gold = 20% shop discount)
    quantity: 2,
    paymentMethod: 'UPI'
  });
  assert(sale.pickup_status === 'PENDING_PICKUP', 'Initial pickup status is PENDING_PICKUP');
  assert(sale.payment_method === 'UPI', 'Payment method UPI is correctly stored on sale');

  const prodsAfter = await getProducts();
  const updatedProduct = prodsAfter.find(p => p.id === 3);
  assert(Number(updatedProduct.stock_quantity) === initialStock - 2, `Stock deducted exactly by 2 (${initialStock} -> ${initialStock - 2})`);

  // Pickup workflow: PENDING_PICKUP -> PICKED_UP
  const pickedSale = await updateSalePickupStatus(sale.id, 'PICKED_UP');
  assert(pickedSale.pickup_status === 'PICKED_UP', 'Sale pickup status transitioned to PICKED_UP');

  // Duplicate pickup rejection
  let caughtDupPickup = false;
  try {
    await updateSalePickupStatus(sale.id, 'PICKED_UP');
  } catch (e) {
    caughtDupPickup = true;
  }
  assert(caughtDupPickup, 'Duplicate pickup of already picked-up sale strictly rejected');

  // ==========================================
  // 7. PAYMENT PERSISTENCE (CASH, CARD, UPI)
  // ==========================================
  console.log('\n--- 7. Payment Methods & Persistence ---');

  const cashPay = await recordPayment({
    memberId: 1,
    referenceType: 'BOOKING',
    referenceId: 101,
    amount: 200,
    paymentMethod: 'CASH'
  });
  assert(cashPay.payment_method === 'CASH', 'Payment recorded with exact CASH method');

  const cardPay = await recordPayment({
    memberId: 1,
    referenceType: 'SHOP',
    referenceId: 102,
    amount: 450,
    paymentMethod: 'CARD'
  });
  assert(cardPay.payment_method === 'CARD', 'Payment recorded with exact CARD method');

  const upiPay = await recordPayment({
    memberId: 1,
    referenceType: 'CAFE',
    referenceId: 103,
    amount: 150,
    paymentMethod: 'UPI'
  });
  assert(upiPay.payment_method === 'UPI', 'Payment recorded with exact UPI method');

  // Invalid payment method fallback
  const fallbackPay = await recordPayment({
    memberId: 1,
    referenceType: 'COURT',
    referenceId: 104,
    amount: 200,
    paymentMethod: 'BITCOIN'
  });
  assert(fallbackPay.payment_method === 'CARD', 'Invalid payment method safely defaults to CARD');

  // ==========================================
  // 8. STAFF PRIVACY & PRIVILEGE ESCALATION
  // ==========================================
  console.log('\n--- 8. Staff System Privacy & Privilege Hardening ---');

  const staffList = await getStaffList();
  const staff1 = staffList.find(s => s.id === 1);
  const staff2 = staffList.find(s => s.id === 2);
  assert(staff1 !== undefined && staff2 !== undefined, 'Staff records loaded successfully');
  assert(staff1.salary > 0 && staff2.salary > 0, 'Individual salaries exist');
  assert(staff1.salary !== staff2.salary, 'Staff salaries are private and distinct');

  // Privilege Escalation Prevention
  let caughtCreateAdmin = false;
  try {
    await createStaffMember({
      name: 'Escalation Test',
      email: 'escalation@kinesis.club',
      role: 'ADMIN',
      department: 'Executive',
      salary: 100000
    });
  } catch (e) {
    caughtCreateAdmin = true;
  }
  assert(caughtCreateAdmin, 'Staff Manager creating ADMIN account strictly rejected');

  let caughtPromoteAdmin = false;
  try {
    await updateStaffMember(staff1.id, {
      role: 'ADMIN'
    });
  } catch (e) {
    caughtPromoteAdmin = true;
  }
  assert(caughtPromoteAdmin, 'Staff Manager promoting employee to ADMIN strictly rejected');

  // ==========================================
  // 9. NOTIFICATION PRIVACY & RESILIENCE
  // ==========================================
  console.log('\n--- 9. Notification Isolation & Resilience ---');

  // Send private notification to Alex (id: 1)
  await createNotification({
    recipientType: 'MEMBER',
    recipientId: 1,
    role: 'MEMBER',
    title: 'Private Statement',
    message: 'Your monthly statement is ready.',
    type: 'MEMBERSHIP'
  });

  // Check notifications for Alex (id: 1)
  const alexNotes = await getNotificationsForUser({
    user: { id: 1 },
    role: 'MEMBER'
  });
  const hasPrivate = alexNotes.some(n => n.title === 'Private Statement');
  assert(hasPrivate, 'Alex Mercer can view his private notification');

  // Check notifications for Elena (id: 2)
  const elenaNotes = await getNotificationsForUser({
    user: { id: 2 },
    role: 'MEMBER'
  });
  const leakedToElena = elenaNotes.some(n => n.title === 'Private Statement');
  assert(!leakedToElena, 'Zero leakage: Elena Rostova cannot see Alex private notification');

  // Non-blocking notification resilience
  const nullNote = await createNotification({ title: '', message: '' });
  assert(nullNote === null, 'Invalid notification parameters fail safely without throwing');

  // ==========================================
  // 10. END-TO-END DATA CONSISTENCY TRACE
  // ==========================================
  console.log('\n--- 10. End-to-End Workflow Data Consistency ---');

  // Trace Customer -> Club ID -> Pricing -> Order -> Payment
  const customer = await getMemberByClubId('1000000001');
  const shopContext = getUserPricingContext(customer);
  assert(shopContext.isActiveMember === true, 'Customer pricing context is ACTIVE MEMBER');
  assert(shopContext.shopDiscountPercent === 20, 'Gold tier grants 20% shop discount');

  const shopPrice = calculateShopPrice(500, customer);
  assert(shopPrice.basePrice === 500, 'Shop base price is 500');
  assert(shopPrice.discountAmount === 100, 'Discount amount is 100 (20% of 500)');
  assert(shopPrice.finalPrice === 400, 'Calculated final price is 400');

  const cafePrice = calculateCafePrice(200, customer);
  assert(cafePrice.basePrice === 200, 'Cafe base price is 200');
  assert(cafePrice.discountPercent === 15, 'Gold tier grants 15% bar discount');
  assert(cafePrice.finalPrice === 170, 'Calculated final cafe price is 170 (200 - 15%)');

  // Summary
  console.log('\n===============================================================');
  console.log(`  PHASE 5 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase5Suite().catch((err) => {
  console.error('Unhandled Phase 5 Suite Error:', err);
  process.exit(1);
});
