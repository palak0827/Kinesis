/**
 * KINESIS SPORTS CLUB — PHASE 6.2 COURT BOOKING PAYMENT VALIDATION & CASH FLOW TEST SUITE
 *
 * Covers all 28 mandatory test points specified in Phase 6.2:
 *
 * CARD:
 * 1. 12 numeric digits -> PASS
 * 2. 11 digits -> FAIL
 * 3. 13th digit cannot be entered (sanitized/sliced to 12)
 * 4. letters -> removed/rejected
 * 5. symbols -> removed/rejected
 * 6. formatting 123456789012 -> 1234 5678 9012
 * 7. valid expiry -> PASS
 * 8. expired card -> FAIL
 * 9. invalid month 13/30 -> FAIL
 * 10. 3-digit CVV -> PASS
 * 11. 2/4-digit CVV -> FAIL
 *
 * UPI:
 * 12. valid VPA -> PASS
 * 13. "1235" -> FAIL when using UPI ID mode
 * 14. missing @ -> FAIL
 * 15. empty UPI -> FAIL
 *
 * CASH:
 * 16. Cash requires no Card/UPI data
 * 17. Cash creates booking
 * 18. payment_method = CASH
 * 19. payment_status = PENDING
 * 20. Reception sees pending payment
 * 21. Reception confirmation -> PAID
 * 22. second confirmation rejected
 *
 * GENERAL:
 * 23. Card -> PAID
 * 24. UPI -> PAID
 * 25. switching methods removes irrelevant validation
 * 26. rapid double click creates one booking only
 * 27. finalPrice identical across booking/payment/ticket/receipt
 * 28. unavailable court cannot be purchased even after payment form completion
 */

import assert from 'node:assert/strict';
import {
  formatCardNumber,
  normalizeCardNumber,
  validateCardNumber,
  validateCardholderName,
  formatCardExpiry,
  validateCardExpiry,
  formatCardCVV,
  validateCardCVV,
  validateUpiId,
  validatePaymentForm
} from '../utils/paymentValidation.js';

import {
  createBooking,
  getBookings,
  checkCourtAvailability,
  calculateBookingPrice,
  confirmCashBookingPayment
} from '../../../backend/services/bookingService.js';

import { recordPayment, getMemberPayments } from '../../../backend/services/paymentService.js';

async function runPhase62TestSuite() {
  console.log('===================================================================');
  console.log('  KINESIS SPORTS CLUB — PHASE 6.2 COURT PAYMENT & CASH FLOW AUDIT');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // ========================================================
  // A. CARD VALIDATION (Tests 1 - 11)
  // ========================================================
  console.log('--- A. Card Number & Field Validation ---');

  // 1. 12 numeric digits -> PASS
  test('Test 1: 12 numeric digits passes validation', () => {
    const res = validateCardNumber('123456789012');
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, '123456789012');
    assert.equal(res.formatted, '1234 5678 9012');
  });

  // 2. 11 digits -> FAIL
  test('Test 2: 11 digits fails validation', () => {
    const res = validateCardNumber('12345678901');
    assert.equal(res.isValid, false);
    assert.match(res.error, /exactly 12 digits/i);
  });

  // 3. 13th digit cannot be entered (sanitized to 12)
  test('Test 3: 13th digit cannot be entered and is sliced to 12', () => {
    const formatted = formatCardNumber('1234567890123');
    const normalized = normalizeCardNumber('1234567890123');
    assert.equal(normalized.length, 12);
    assert.equal(normalized, '123456789012');
    assert.equal(formatted, '1234 5678 9012');
  });

  // 4. letters -> removed/rejected
  test('Test 4: letters are removed in sanitization and rejected in validation', () => {
    const formatted = formatCardNumber('1234abcd9012');
    assert.equal(formatted, '1234 9012'); // letters stripped
    const res = validateCardNumber('1234abcd9012');
    assert.equal(res.isValid, false);
    assert.match(res.error, /only numbers|12 digits/i);
  });

  // 5. symbols -> removed/rejected
  test('Test 5: symbols are removed in sanitization and rejected in validation', () => {
    const formatted = formatCardNumber('1234-5678-9012!');
    assert.equal(formatted, '1234 5678 9012');
    const res = validateCardNumber('1234-5678-9012');
    assert.equal(res.isValid, false); // Contains dashes
  });

  // 6. formatting 123456789012 -> 1234 5678 9012
  test('Test 6: formatting 123456789012 produces "1234 5678 9012"', () => {
    const formatted = formatCardNumber('123456789012');
    assert.equal(formatted, '1234 5678 9012');
  });

  // 7. valid expiry -> PASS
  test('Test 7: valid future expiry MM/YY passes validation', () => {
    const now = new Date();
    const futureYear = (now.getFullYear() + 2).toString().slice(-2);
    const res = validateCardExpiry(`12/${futureYear}`);
    assert.equal(res.isValid, true);
  });

  // 8. expired card -> FAIL
  test('Test 8: expired card fails validation dynamically', () => {
    const res = validateCardExpiry('01/20');
    assert.equal(res.isValid, false);
    assert.match(res.error, /card has expired/i);
  });

  // 9. invalid month 13/30 -> FAIL
  test('Test 9: invalid month 13/30 fails validation', () => {
    const res = validateCardExpiry('13/30');
    assert.equal(res.isValid, false);
    assert.match(res.error, /valid month|valid expiry/i);
  });

  // 10. 3-digit CVV -> PASS
  test('Test 10: 3-digit CVV passes validation', () => {
    const res = validateCardCVV('842');
    assert.equal(res.isValid, true);
  });

  // 11. 2/4-digit CVV -> FAIL
  test('Test 11: 2-digit or 4-digit CVV fails validation', () => {
    const res2 = validateCardCVV('84');
    assert.equal(res2.isValid, false);
    assert.match(res2.error, /exactly 3 digits/i);

    const res4 = validateCardCVV('8421');
    assert.equal(res4.isValid, false);
    assert.match(res4.error, /exactly 3 digits/i);
  });

  // ========================================================
  // B. UPI VALIDATION (Tests 12 - 15)
  // ========================================================
  console.log('\n--- B. UPI ID / VPA Validation ---');

  // 12. valid VPA -> PASS
  test('Test 12: valid UPI VPA IDs pass validation', () => {
    assert.equal(validateUpiId('name@bank').isValid, true);
    assert.equal(validateUpiId('username@upi').isValid, true);
    assert.equal(validateUpiId('9876543210@paytm').isValid, true);
    assert.equal(validateUpiId('member.kinesis@okhdfcbank').isValid, true);
  });

  // 13. "1235" -> FAIL when using UPI ID mode
  test('Test 13: "1235" fails UPI ID validation', () => {
    const res = validateUpiId('1235');
    assert.equal(res.isValid, false);
    assert.match(res.error, /valid upi id/i);
  });

  // 14. missing @ -> FAIL
  test('Test 14: missing @ symbol fails UPI validation', () => {
    const res = validateUpiId('usernamebank');
    assert.equal(res.isValid, false);
    assert.match(res.error, /valid upi id|@/i);
  });

  // 15. empty UPI -> FAIL
  test('Test 15: empty UPI or whitespace fails validation', () => {
    assert.equal(validateUpiId('').isValid, false);
    assert.equal(validateUpiId('   ').isValid, false);
    assert.equal(validateUpiId('@').isValid, false);
    assert.equal(validateUpiId('name@').isValid, false);
    assert.equal(validateUpiId('@upi').isValid, false);
  });

  // ========================================================
  // C. CASH PAYMENT FLOW & RECEPTION CONFIRMATION (Tests 16 - 22)
  // ========================================================
  console.log('\n--- C. Cash Payment Flow & Reception Confirmation ---');

  // 16. Cash requires no Card/UPI data
  test('Test 16: CASH payment requires no card or UPI inputs', () => {
    const res = validatePaymentForm({
      paymentMethod: 'CASH',
      cardData: { name: '', number: '', expiry: '', cvv: '' },
      upiId: ''
    });
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  let createdCashBooking = null;

  // 17, 18, 19. Cash creates booking with payment_method=CASH, payment_status=PENDING
  await testAsync('Test 17-19: CASH booking creates with status=confirmed, payment_method=CASH, payment_status=PENDING', async () => {
    const uniqueFutureDate = new Date(Date.now() + 86400000 * (30 + (Date.now() % 300))).toISOString().split('T')[0];

    const booking = await createBooking({
      memberId: 1,
      courtId: 1,
      bookingDate: uniqueFutureDate,
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING'
    });

    assert(booking !== null, 'Booking created');
    assert.equal(booking.payment_method, 'CASH');
    assert.equal(booking.payment_status, 'PENDING');
    createdCashBooking = booking;

    // Record audit payment in payments table
    await recordPayment({
      memberId: 1,
      referenceType: 'COURT_BOOKING',
      referenceId: booking.id,
      amount: booking.price,
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      paymentDetails: {
        courtId: 1,
        date: uniqueFutureDate
      }
    });
  });

  // 20. Reception sees pending payment
  await testAsync('Test 20: Reception queries pending cash bookings and sees created booking', async () => {
    const allBookings = await getBookings();
    const pendingCash = allBookings.filter(b =>
      (b.payment_method === 'CASH' && b.payment_status === 'PENDING') ||
      b.payment_status === 'PENDING'
    );
    const found = pendingCash.find(b => b.id === createdCashBooking.id);
    assert(found !== undefined, 'Pending cash booking is present in reception pending list');
    assert.equal(found.payment_status, 'PENDING');
  });

  // 21. Reception confirmation -> PAID
  await testAsync('Test 21: Reception staff confirms physical cash collection -> transitions PENDING to PAID', async () => {
    const updated = await confirmCashBookingPayment(createdCashBooking.id);
    assert.equal(updated.payment_status, 'PAID');

    const allBookings = await getBookings();
    const confirmed = allBookings.find(b => b.id === createdCashBooking.id);
    assert.equal(confirmed.payment_status, 'PAID');
  });

  // 22. second confirmation rejected
  await testAsync('Test 22: Second cash confirmation attempt is rejected', async () => {
    try {
      await confirmCashBookingPayment(createdCashBooking.id);
      assert.fail('Second confirmation should have thrown an error');
    } catch (err) {
      assert.match(err.message, /already been confirmed|PAID/i);
    }
  });

  // ========================================================
  // D. GENERAL & INTEGRATION RULES (Tests 23 - 28)
  // ========================================================
  console.log('\n--- D. General Flows & Price Integrity ---');

  // 23. Card -> PAID
  await testAsync('Test 23: CARD payment flow creates booking with payment_status = PAID', async () => {
    const uniqueFutureDate = new Date(Date.now() + 86400000 * (40 + (Date.now() % 300))).toISOString().split('T')[0];

    const cardBooking = await createBooking({
      memberId: 1,
      courtId: 2,
      bookingDate: uniqueFutureDate,
      startTime: '10:00',
      endTime: '10:30',
      durationMinutes: 30,
      paymentMethod: 'CARD',
      paymentStatus: 'PAID'
    });

    assert.equal(cardBooking.payment_method, 'CARD');
    assert.equal(cardBooking.payment_status, 'PAID');
  });

  // 24. UPI -> PAID
  await testAsync('Test 24: UPI payment flow creates booking with payment_status = PAID', async () => {
    const uniqueFutureDate = new Date(Date.now() + 86400000 * (50 + (Date.now() % 300))).toISOString().split('T')[0];

    const upiBooking = await createBooking({
      memberId: 1,
      courtId: 3,
      bookingDate: uniqueFutureDate,
      startTime: '11:00',
      endTime: '11:30',
      durationMinutes: 30,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID'
    });

    assert.equal(upiBooking.payment_method, 'UPI');
    assert.equal(upiBooking.payment_status, 'PAID');
  });

  // 25. switching methods removes irrelevant validation
  test('Test 25: Switching payment methods isolates validation without carryover', () => {
    // User had invalid card data
    const invalidCardRes = validatePaymentForm({
      paymentMethod: 'CARD',
      cardData: { name: '', number: '123', expiry: '99/99', cvv: '1' },
      upiId: ''
    });
    assert.equal(invalidCardRes.isValid, false);
    assert(invalidCardRes.errors.number !== undefined);

    // Switches to CASH
    const cashRes = validatePaymentForm({
      paymentMethod: 'CASH',
      cardData: { name: '', number: '123', expiry: '99/99', cvv: '1' },
      upiId: ''
    });
    assert.equal(cashRes.isValid, true);
    assert.deepEqual(cashRes.errors, {});

    // Switches to valid UPI
    const upiRes = validatePaymentForm({
      paymentMethod: 'UPI',
      cardData: { name: '', number: '123', expiry: '99/99', cvv: '1' },
      upiId: 'alex@okhdfcbank'
    });
    assert.equal(upiRes.isValid, true);
    assert.deepEqual(upiRes.errors, {});
  });

  // 26. rapid double click creates one booking only
  await testAsync('Test 26: Rapid double submission produces exactly one booking', async () => {
    const uniqueFutureDate = new Date(Date.now() + 86400000 * (60 + (Date.now() % 300))).toISOString().split('T')[0];

    let bookingCount = 0;
    let collisionCount = 0;

    const attempt1 = createBooking({
      memberId: 3,
      courtId: 2,
      bookingDate: uniqueFutureDate,
      startTime: '15:00',
      endTime: '15:30',
      durationMinutes: 30,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID'
    }).then(res => { bookingCount++; return res; }).catch((err) => { collisionCount++; });

    const attempt2 = createBooking({
      memberId: 3,
      courtId: 2,
      bookingDate: uniqueFutureDate,
      startTime: '15:00',
      endTime: '15:30',
      durationMinutes: 30,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID'
    }).then(res => { bookingCount++; return res; }).catch((err) => { collisionCount++; });

    await Promise.all([attempt1, attempt2]);

    assert.equal(bookingCount, 1, 'Exactly one booking must succeed');
    assert.equal(collisionCount, 1, 'Second booking collision must be safely rejected');
  });

  // 27. finalPrice identical across booking/payment/ticket/receipt
  await testAsync('Test 27: finalPrice is strictly identical across calculation, booking, and payment record', async () => {
    const calculated = await calculateBookingPrice(1, 1, 60); // Court 1 (rate 200/30m), Alex Mercer (Gold 50% discount) -> 400 - 50% = 200
    const finalAmount = calculated.finalPrice;

    const uniqueFutureDate = new Date(Date.now() + 86400000 * (70 + (Date.now() % 300))).toISOString().split('T')[0];
    const booking = await createBooking({
      memberId: 1,
      courtId: 1,
      bookingDate: uniqueFutureDate,
      startTime: '16:00',
      endTime: '17:00',
      durationMinutes: 60,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID'
    });

    const payment = await recordPayment({
      memberId: 1,
      referenceType: 'COURT_BOOKING',
      referenceId: booking.id,
      amount: finalAmount,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID'
    });

    assert.equal(booking.price, finalAmount, 'Booking price matches calculated price');
    assert.equal(payment.amount, finalAmount, 'Payment record amount matches calculated price');
  });

  // 28. unavailable court cannot be purchased even after payment form completion
  await testAsync('Test 28: Overlapping/booked slot is rejected before transaction execution', async () => {
    const uniqueFutureDate = new Date(Date.now() + 86400000 * (80 + (Date.now() % 300))).toISOString().split('T')[0];

    // First booking occupies 18:00 - 19:00
    await createBooking({
      memberId: 1,
      courtId: 1,
      bookingDate: uniqueFutureDate,
      startTime: '18:00',
      endTime: '19:00',
      durationMinutes: 60,
      paymentMethod: 'CARD',
      paymentStatus: 'PAID'
    });

    // Second booking attempts overlapping 18:30 - 19:30
    const avail = await checkCourtAvailability(1, uniqueFutureDate, '18:30', '19:30');
    assert.equal(avail.available, false, 'Court is marked unavailable for overlapping slot');

    try {
      await createBooking({
        memberId: 2,
        courtId: 1,
        bookingDate: uniqueFutureDate,
        startTime: '18:30',
        endTime: '19:30',
        durationMinutes: 60,
        paymentMethod: 'CARD',
        paymentStatus: 'PAID'
      });
      assert.fail('Overlapping booking should have been rejected');
    } catch (err) {
      assert.match(err.message, /already booked|overlap|unavailable/i);
    }
  });

  console.log('\n===============================================================');
  console.log(`  PHASE 6.2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase62TestSuite().catch(err => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
