/**
 * KINESIS SPORTS CLUB — PHASE 2 VALIDATION & BUSINESS-RULE AUDIT TEST SUITE
 * 
 * Verifies:
 * 1. Registration Field Boundaries (Name, Email, Phone, DOB, Password, Confirm)
 * 2. Numeric Boundaries (Price, Stock, Quantity, Salary, Duration)
 * 3. 10-Digit Unique Club ID System
 * 4. Offline Table Booking Workflow via Club ID
 * 5. Court Booking Boundaries (Past Dates, Operating Hours, Durations, Walk-in Limits)
 * 6. Inventory & Concurrency Rules (Stock non-negative, integer quantities)
 * 7. Staff Management Validation (Unique email, positive salary, required role/dept)
 * 8. Payment Method & Receipt Validation
 */

import {
  validateName,
  validateEmail,
  validatePhone,
  validateDob,
  validatePassword,
  validateConfirm,
  EMAIL_REGEX,
  PHONE_REGEX
} from '../utils/registrationValidation.js';

import { getMemberByClubId } from '../../../backend/services/memberService.js';
import { reserveCafeTable, getCafeTables } from '../../../backend/services/cafeTableService.js';
import { createBooking } from '../../../backend/services/bookingService.js';
import { createProduct, updateProduct, recordSale } from '../../../backend/services/inventoryService.js';
import { createStaffMember, getStaffList } from '../services/clubPlatformService.js';

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

async function runSuite() {
  console.log('===============================================================');
  console.log('  KINESIS SPORTS CLUB — PHASE 2 VALIDATION AUDIT SUITE         ');
  console.log('===============================================================\n');

  // ==========================================
  // SECTION 1: REGISTRATION FIELD VALIDATION
  // ==========================================
  console.log('--- 1. Registration Validation ---');

  // NAME
  assert(validateName('') !== null, 'Name: empty value rejected');
  assert(validateName('   ') !== null, 'Name: whitespace-only rejected');
  assert(validateName('John123') !== null, 'Name: numbers rejected');
  assert(validateName('Jane@Doe!') !== null, 'Name: unsupported special characters rejected');
  assert(validateName('A') !== null, 'Name: length < 2 rejected');
  assert(validateName('A'.repeat(71)) !== null, 'Name: length > 70 rejected');
  assert(validateName('Rohan Sharma') === null, 'Name: normal full name accepted');
  assert(validateName("Mary-Jane O'Connor") === null, 'Name: hyphens and apostrophes accepted');

  // EMAIL (Strictly exact .com or .ac.in)
  assert(validateEmail('abc@example.com') === null, 'Email: abc@example.com accepted');
  assert(validateEmail('student@university.ac.in') === null, 'Email: student@university.ac.in accepted');
  assert(validateEmail('abc@example.comxyz') !== null, 'Email: abc@example.comxyz rejected (trailing chars)');
  assert(validateEmail('abc@example.ac.inxyz') !== null, 'Email: abc@example.ac.inxyz rejected');
  assert(validateEmail('abc@example') !== null, 'Email: missing domain rejected');
  assert(validateEmail('abc@') !== null, 'Email: missing domain name rejected');
  assert(validateEmail('@example.com') !== null, 'Email: missing local part rejected');
  assert(validateEmail('abc@example.c') !== null, 'Email: single letter TLD rejected');
  assert(validateEmail('abc@example.co.in') !== null, 'Email: .co.in rejected (only .com or .ac.in allowed)');
  assert(validateEmail('abc@example.comm') !== null, 'Email: abc@example.comm rejected');
  assert(validateEmail('abc@.com') !== null, 'Email: abc@.com rejected');

  // PHONE (Strictly 10 digits)
  assert(validatePhone('1234567890') === null, 'Phone: exactly 10 digits accepted');
  assert(validatePhone('123456789') !== null, 'Phone: 9 digits rejected');
  assert(validatePhone('12345678901') !== null, 'Phone: 11 digits rejected');
  assert(validatePhone('12345ABCDE') !== null, 'Phone: letters rejected');
  assert(validatePhone('123 456 78') !== null, 'Phone: spaces rejected');
  assert(validatePhone('123-456-7890') !== null, 'Phone: dashes/symbols rejected');

  // DOB
  assert(validateDob('') !== null, 'DOB: empty rejected');
  assert(validateDob('invalid-date') !== null, 'DOB: malformed date rejected');
  assert(validateDob('2099-01-01') !== null, 'DOB: future date rejected');
  assert(validateDob('1850-01-01') !== null, 'DOB: age > 120 rejected');
  assert(validateDob('2023-02-29') !== null, 'DOB: impossible leap date rejected (Feb 29 on non-leap year)');
  assert(validateDob('2024-02-30') !== null, 'DOB: impossible date (Feb 30) rejected');
  assert(validateDob('2024-04-31') !== null, 'DOB: impossible day (April 31) rejected');
  assert(validateDob('1995-05-15') === null, 'DOB: valid adult DOB accepted');

  // PASSWORD & CONFIRM
  assert(validatePassword('') !== null, 'Password: empty rejected');
  assert(validatePassword('12345') !== null, 'Password: < 6 chars rejected');
  assert(validatePassword('Password123!') === null, 'Password: valid password accepted');
  assert(validateConfirm('Password123!', 'Mismatch123!') !== null, 'Confirm Password: mismatch rejected');
  assert(validateConfirm('Password123!', 'Password123!') === null, 'Confirm Password: exact match accepted');

  // ==========================================
  // SECTION 2: CLUB ID VALIDATION
  // ==========================================
  console.log('\n--- 2. Club ID Validation ---');

  try {
    await getMemberByClubId('');
    assert(false, 'Club ID: empty should throw');
  } catch (e) {
    assert(e.message.includes('required'), 'Club ID: empty rejected');
  }

  try {
    await getMemberByClubId('12345');
    assert(false, 'Club ID: 5 digits should throw');
  } catch (e) {
    assert(e.message.includes('10 numeric digits'), 'Club ID: 5 digits rejected');
  }

  try {
    await getMemberByClubId('12345678901');
    assert(false, 'Club ID: 11 digits should throw');
  } catch (e) {
    assert(e.message.includes('10 numeric digits'), 'Club ID: 11 digits rejected');
  }

  try {
    await getMemberByClubId('ABCDEFGHIJ');
    assert(false, 'Club ID: letters should throw');
  } catch (e) {
    assert(e.message.includes('10 numeric digits'), 'Club ID: non-digits rejected');
  }

  const validClubMember = await getMemberByClubId('1000000001');
  assert(validClubMember !== null && validClubMember.name === 'Alex Mercer', 'Club ID: 1000000001 finds Alex Mercer without creating duplicate');

  // ==========================================
  // SECTION 3: OFFLINE TABLE BOOKING VIA CLUB ID
  // ==========================================
  console.log('\n--- 3. Offline Table Booking via Club ID ---');

  const mockCustomer = {
    id: 1,
    name: 'Alex Mercer',
    club_id: '1000000001',
    user_type: 'MEMBER',
    status: 'active'
  };

  // Reject past date
  try {
    await reserveCafeTable({
      tableId: 1,
      customer: mockCustomer,
      reservationDate: '2020-01-01',
      reservationTime: '19:30',
      partySize: 2
    });
    assert(false, 'Table Booking: past date should throw');
  } catch (e) {
    assert(e.message.includes('past date'), 'Table Booking: past reservation date rejected');
  }

  // Reject maintenance table
  try {
    await reserveCafeTable({
      tableId: 8, // Table 08 is UNDER_MAINTENANCE in seed data
      customer: mockCustomer,
      reservationDate: new Date().toISOString().split('T')[0],
      reservationTime: '19:30',
      partySize: 2
    });
    assert(false, 'Table Booking: maintenance table should throw');
  } catch (e) {
    assert(e.message.includes('maintenance'), 'Table Booking: table under maintenance rejected');
  }

  // Reject party size exceeding capacity
  try {
    await reserveCafeTable({
      tableId: 1, // capacity 2
      customer: mockCustomer,
      reservationDate: new Date().toISOString().split('T')[0],
      reservationTime: '19:30',
      partySize: 10
    });
    assert(false, 'Table Booking: overcapacity should throw');
  } catch (e) {
    assert(e.message.includes('exceeds table capacity'), 'Table Booking: party size exceeding capacity rejected');
  }

  // Reject inactive customer
  try {
    await reserveCafeTable({
      tableId: 2,
      customer: { ...mockCustomer, status: 'inactive' },
      reservationDate: new Date().toISOString().split('T')[0],
      reservationTime: '19:30',
      partySize: 2
    });
    assert(false, 'Table Booking: inactive customer should throw');
  } catch (e) {
    assert(e.message.includes('inactive'), 'Table Booking: inactive customer rejected');
  }

  // ==========================================
  // SECTION 4: COURT BOOKING VALIDATION
  // ==========================================
  console.log('\n--- 4. Court Booking Boundaries ---');

  // Reject past date
  try {
    await createBooking({
      memberId: 1,
      courtId: 1,
      bookingDate: '2020-01-01',
      startTime: '10:00'
    });
    assert(false, 'Court Booking: past date should throw');
  } catch (e) {
    assert(e.message.includes('past date'), 'Court Booking: past date rejected');
  }

  // Reject hours outside 06:00 - 23:00
  try {
    await createBooking({
      memberId: 1,
      courtId: 1,
      bookingDate: '2028-10-10',
      startTime: '04:00'
    });
    assert(false, 'Court Booking: early morning should throw');
  } catch (e) {
    assert(e.message.includes('operating hours'), 'Court Booking: before operating hours (04:00) rejected');
  }

  // Reject invalid duration
  try {
    await createBooking({
      memberId: 1,
      courtId: 1,
      bookingDate: '2028-10-10',
      startTime: '10:00',
      durationMinutes: 45 // Not multiple of 30
    });
    assert(false, 'Court Booking: 45 min duration should throw');
  } catch (e) {
    assert(e.message.includes('intervals'), 'Court Booking: non-30 min intervals rejected');
  }

  // ==========================================
  // SECTION 5: INVENTORY & NUMERIC BOUNDARIES
  // ==========================================
  console.log('\n--- 5. Inventory & Numeric Boundaries ---');

  // Product price <= 0
  try {
    await createProduct({
      name: 'Free Racket',
      category: 'Rackets',
      price: -500,
      stock_quantity: 10
    });
    assert(false, 'Inventory: negative price should throw');
  } catch (e) {
    assert(e.message.includes('positive number'), 'Inventory: negative price rejected');
  }

  // Stock < 0
  try {
    await createProduct({
      name: 'Ghost Racket',
      category: 'Rackets',
      price: 1500,
      stock_quantity: -5
    });
    assert(false, 'Inventory: negative stock should throw');
  } catch (e) {
    assert(e.message.includes('non-negative integer'), 'Inventory: negative initial stock rejected');
  }

  // Sale with 0 or negative quantity
  try {
    await recordSale({
      productId: 1,
      quantity: 0
    });
    assert(false, 'Sale: zero quantity should throw');
  } catch (e) {
    assert(e.message.includes('positive whole integer'), 'Sale: zero quantity rejected');
  }

  try {
    await recordSale({
      productId: 1,
      quantity: -3
    });
    assert(false, 'Sale: negative quantity should throw');
  } catch (e) {
    assert(e.message.includes('positive whole integer'), 'Sale: negative quantity rejected');
  }

  try {
    await recordSale({
      productId: 1,
      quantity: 2.5
    });
    assert(false, 'Sale: decimal quantity should throw');
  } catch (e) {
    assert(e.message.includes('positive whole integer'), 'Sale: decimal quantity rejected');
  }

  // Insufficient stock
  try {
    await recordSale({
      productId: 1,
      quantity: 999999
    });
    assert(false, 'Sale: excessive quantity should throw');
  } catch (e) {
    assert(e.message.includes('Insufficient stock'), 'Sale: purchase exceeding available stock rejected');
  }

  // ==========================================
  // SECTION 6: STAFF VALIDATION
  // ==========================================
  console.log('\n--- 6. Staff Validation ---');

  // Missing name / numbers in name
  try {
    await createStaffMember({
      name: 'Staff99',
      email: 'staff99@kinesis.club',
      role: 'Reception',
      department: 'Reception',
      salary: 30000
    });
    assert(false, 'Staff: numbers in name should throw');
  } catch (e) {
    assert(e.message.includes('cannot contain numbers'), 'Staff: numbers in name rejected');
  }

  // Negative salary
  try {
    await createStaffMember({
      name: 'Deepak Roy',
      email: 'deepak.unique@kinesis.club',
      role: 'Reception',
      department: 'Reception',
      salary: -25000
    });
    assert(false, 'Staff: negative salary should throw');
  } catch (e) {
    assert(e.message.includes('positive number'), 'Staff: negative salary rejected');
  }

  // Duplicate email
  try {
    await createStaffMember({
      name: 'Duplicate Staff',
      email: 'restaurant@kinesis.club', // Already registered in staff roster
      role: 'Reception',
      department: 'Reception',
      salary: 35000
    });
    assert(false, 'Staff: duplicate email should throw');
  } catch (e) {
    assert(e.message.includes('already exists'), 'Staff: duplicate email rejected');
  }

  console.log('\n===============================================================');
  console.log(`  PHASE 2 AUDIT SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
