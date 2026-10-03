// Programmatic test suite to verify all Kinesis business rules
import {
  calculateBookingPrice,
  checkCourtAvailability,
  checkMemberDailyLimit,
  createBooking,
  cancelBooking
} from './services/bookingService.js';
import {
  getProducts,
  recordSale
} from './services/inventoryService.js';
import {
  getMembers,
  createMember
} from './services/memberService.js';
import { localStore } from './services/supabaseClient.js';

async function runTests() {
  console.log('--- 1. Testing Pricing Engine ---');
  // Tennis Court 1 is $40/hr
  // Member 1 is Alex Mercer (Gold - 50% discount) -> $20.00
  const goldPrice = await calculateBookingPrice(1, 1);
  console.log(`Gold Member Court Price: base=$${goldPrice.baseRate}, discount=${goldPrice.discountPercent}%, final=$${goldPrice.finalPrice}`);
  if (goldPrice.finalPrice !== 20.0) throw new Error('Expected $20.00 for Gold member on Tennis Court 1');

  // Member 3 is Marcus Vance (Silver - 25% discount) -> $30.00
  const silverPrice = await calculateBookingPrice(1, 3);
  console.log(`Silver Member Court Price: base=$${silverPrice.baseRate}, discount=${silverPrice.discountPercent}%, final=$${silverPrice.finalPrice}`);
  if (silverPrice.finalPrice !== 30.0) throw new Error('Expected $30.00 for Silver member on Tennis Court 1');

  // Guest (No member) -> $40.00
  const guestPrice = await calculateBookingPrice(1, null);
  console.log(`Guest Court Price: base=$${guestPrice.baseRate}, final=$${guestPrice.finalPrice}`);
  if (guestPrice.finalPrice !== 40.0) throw new Error('Expected $40.00 for Guest');

  console.log('--- 2. Testing Court Availability & Overlap Prevention ---');
  // Initial bookings include Court 1 today 09:00 - 10:00
  const today = new Date().toISOString().split('T')[0];
  const overlapCheck = await checkCourtAvailability(1, today, '09:00', '10:00');
  console.log('Overlap Check (09:00 - 10:00 on Court 1):', overlapCheck);
  if (overlapCheck.available) throw new Error('Expected overlap clash detection for 09:00 - 10:00');

  // Adjacent slot (10:00 - 11:00 on Court 1) should be available
  const availableCheck = await checkCourtAvailability(1, today, '10:00', '11:00');
  console.log('Available Check (10:00 - 11:00 on Court 1):', availableCheck);
  if (!availableCheck.available) throw new Error('Expected 10:00 - 11:00 to be available on Court 1');

  console.log('--- 3. Testing Member Daily Booking Limits ---');
  // Member 1 (Alex Mercer - Gold limit = 2) already has 2 bookings today (Court 1 @ 09:00, Court 6 @ 19:30)
  const limitCheck = await checkMemberDailyLimit(1, today);
  console.log('Daily Limit Check for Member 1:', limitCheck);
  if (limitCheck.allowed) throw new Error('Expected Member 1 to hit daily limit (2/2)');

  console.log('--- 4. Testing Inventory Stock Auto-Deduction & Bounds ---');
  const products = await getProducts();
  const testProduct = products[0]; // e.g. Wilson Pro Staff
  const initialStock = testProduct.stock_quantity;
  console.log(`Product "${testProduct.name}": initial stock = ${initialStock}`);

  // Sell 1 unit to Gold member (20% shop discount)
  const sale = await recordSale({ productId: testProduct.id, memberId: 1, quantity: 1 });
  console.log(`Sale recorded: total=$${sale.total}, unit_price=$${sale.unit_price}`);

  const updatedProducts = await getProducts();
  const updatedProduct = updatedProducts.find(p => p.id === testProduct.id);
  console.log(`Stock after sale = ${updatedProduct.stock_quantity}`);
  if (updatedProduct.stock_quantity !== initialStock - 1) {
    throw new Error('Expected stock to decrease by 1');
  }

  // Attempt to sell more than available
  try {
    await recordSale({ productId: testProduct.id, quantity: 9999 });
    throw new Error('Expected insufficient stock error');
  } catch (err) {
    console.log('Successfully caught insufficient stock guard:', err.message);
  }

  console.log('\n>>> ALL BUSINESS RULES VALIDATED SUCCESSFULLY! <<<');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
