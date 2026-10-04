import assert from 'node:assert/strict';
import {
  ROLES,
  PUBLIC_ROUTES,
  MEMBER_ROUTES,
  RESTAURANT_ROUTES,
  BAR_ROUTES,
  SHOP_ROUTES,
  COURT_ROUTES,
  STAFF_ROUTES,
  RECEPTION_ROUTES,
  ADMIN_ROUTES,
  isPublicRoute,
  isProtectedRoute,
  isRouteAuthorized,
  getDefaultRouteForRole,
  getRouteFromPath,
  getPathFromRoute
} from '../utils/routeSecurity.js';
import { normalizeStaffRole } from '../services/sessionService.js';

console.log('--- Starting Kinesis Route Security & Authorization Matrix Tests ---\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. PUBLIC ROUTES
test('Public routes are correctly identified as public and NOT protected', () => {
  assert.equal(isPublicRoute('landing'), true);
  assert.equal(isPublicRoute('login'), true);
  assert.equal(isPublicRoute('register'), true);
  assert.equal(isPublicRoute('forgot-password'), true);
  assert.equal(isPublicRoute('reset-password'), true);

  assert.equal(isProtectedRoute('landing'), false);
  assert.equal(isProtectedRoute('login'), false);
});

// 2. PROTECTED ROUTES IDENTIFICATION
test('Protected routes are identified correctly', () => {
  const allProtected = [
    'admin-dashboard', 'shop-dashboard', 'restaurant-dashboard',
    'bar-dashboard', 'court-dashboard', 'staff-dashboard',
    'reception-dashboard', 'home', 'book', 'bookings', 'membership'
  ];
  for (const r of allProtected) {
    assert.equal(isProtectedRoute(r), true, `Expected ${r} to be protected`);
    assert.equal(isPublicRoute(r), false, `Expected ${r} to not be public`);
  }
});

// 3. PATH MAPPING
test('getRouteFromPath correctly maps URL paths to canonical routes', () => {
  assert.equal(getRouteFromPath('/admin'), 'admin-dashboard');
  assert.equal(getRouteFromPath('/shop-manager'), 'shop-dashboard');
  assert.equal(getRouteFromPath('/restaurant'), 'restaurant-dashboard');
  assert.equal(getRouteFromPath('/bar'), 'bar-dashboard');
  assert.equal(getRouteFromPath('/court-manager'), 'court-dashboard');
  assert.equal(getRouteFromPath('/staff'), 'staff-dashboard');
  assert.equal(getRouteFromPath('/reception'), 'reception-dashboard');
  assert.equal(getRouteFromPath('/member'), 'home');
  assert.equal(getRouteFromPath('/book'), 'book');
  assert.equal(getRouteFromPath('/bookings'), 'bookings');
  assert.equal(getRouteFromPath('/'), 'landing');
  assert.equal(getRouteFromPath('/login'), 'login');
  assert.equal(getRouteFromPath('/register'), 'register');
});

// 4. SCENARIO A-G: UNAUTHENTICATED USERS
test('Scenario A-G: Unauthenticated users (null role) cannot access ANY protected route', () => {
  const routes = [
    'admin-dashboard', 'shop-dashboard', 'restaurant-dashboard',
    'bar-dashboard', 'court-dashboard', 'staff-dashboard',
    'reception-dashboard', 'home', 'book'
  ];
  for (const r of routes) {
    assert.equal(isRouteAuthorized(null, r), false, `Null role must be denied on ${r}`);
    assert.equal(isRouteAuthorized(undefined, r), false, `Undefined role must be denied on ${r}`);
    assert.equal(isRouteAuthorized('', r), false, `Empty role must be denied on ${r}`);
  }
});

// 5. SCENARIO H-I: MEMBER ACCESS CHECKS
test('Scenario H-I: Member is denied access to Admin and Staff Department Portals', () => {
  assert.equal(isRouteAuthorized('MEMBER', 'admin-dashboard'), false);
  assert.equal(isRouteAuthorized('MEMBER', 'shop-dashboard'), false);
  assert.equal(isRouteAuthorized('MEMBER', 'restaurant-dashboard'), false);
  assert.equal(isRouteAuthorized('MEMBER', 'bar-dashboard'), false);
  assert.equal(isRouteAuthorized('MEMBER', 'court-dashboard'), false);
  assert.equal(isRouteAuthorized('MEMBER', 'staff-dashboard'), false);
  assert.equal(isRouteAuthorized('MEMBER', 'reception-dashboard'), false);

  // But MEMBER is authorized for member routes
  assert.equal(isRouteAuthorized('MEMBER', 'home'), true);
  assert.equal(isRouteAuthorized('MEMBER', 'book'), true);
  assert.equal(isRouteAuthorized('MEMBER', 'bookings'), true);
  assert.equal(isRouteAuthorized('MEMBER', 'membership'), true);
  assert.equal(isRouteAuthorized('MEMBER', 'shop'), true);
});

// 6. SCENARIO J-K: SHOP MANAGER ACCESS CHECKS
test('Scenario J-K: Shop Manager is denied Admin, Bar, Restaurant, Court, Staff, Reception portals', () => {
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'admin-dashboard'), false);
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'bar-dashboard'), false);
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'restaurant-dashboard'), false);
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'court-dashboard'), false);
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'staff-dashboard'), false);
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'reception-dashboard'), false);
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'home'), false);

  // Shop Manager IS authorized for shop-dashboard
  assert.equal(isRouteAuthorized('SHOP_MANAGER', 'shop-dashboard'), true);
});

// 7. SCENARIO L: BAR MANAGER ACCESS CHECKS
test('Scenario L: Bar Manager is denied Shop Manager portal and Admin portal', () => {
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'shop-dashboard'), false);
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'admin-dashboard'), false);
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'restaurant-dashboard'), false);
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'court-dashboard'), false);
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'staff-dashboard'), false);
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'reception-dashboard'), false);

  // Bar Manager IS authorized for bar-dashboard
  assert.equal(isRouteAuthorized('BAR_MANAGER', 'bar-dashboard'), true);
});

// 8. SCENARIO M: RECEPTION ACCESS CHECKS
test('Scenario M: Reception is denied Admin portal', () => {
  assert.equal(isRouteAuthorized('RECEPTION', 'admin-dashboard'), false);
  assert.equal(isRouteAuthorized('RECEPTION', 'shop-dashboard'), false);
  assert.equal(isRouteAuthorized('RECEPTION', 'bar-dashboard'), false);
  assert.equal(isRouteAuthorized('RECEPTION', 'restaurant-dashboard'), false);

  // Reception IS authorized for reception-dashboard
  assert.equal(isRouteAuthorized('RECEPTION', 'reception-dashboard'), true);
});

// 9. SCENARIO N: COURT MANAGER ACCESS CHECKS
test('Scenario N: Court Manager is denied Admin portal', () => {
  assert.equal(isRouteAuthorized('COURT_MANAGER', 'admin-dashboard'), false);
  assert.equal(isRouteAuthorized('COURT_MANAGER', 'shop-dashboard'), false);
  assert.equal(isRouteAuthorized('COURT_MANAGER', 'bar-dashboard'), false);
  assert.equal(isRouteAuthorized('COURT_MANAGER', 'restaurant-dashboard'), false);

  // Court Manager IS authorized for court-dashboard
  assert.equal(isRouteAuthorized('COURT_MANAGER', 'court-dashboard'), true);
});

// 10. ADMIN SUPERUSER PRIVILEGE
test('Admin is authorized for all administrative and operational portals', () => {
  assert.equal(isRouteAuthorized('ADMIN', 'admin-dashboard'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'admin-analytics'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'shop-dashboard'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'restaurant-dashboard'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'bar-dashboard'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'court-dashboard'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'staff-dashboard'), true);
  assert.equal(isRouteAuthorized('ADMIN', 'reception-dashboard'), true);
});

// 11. SCENARIO S: ROLE CHANGE HANDLING
test('Scenario S: Role change from SHOP_MANAGER to BAR_MANAGER dynamically updates permissions', () => {
  let userRole = 'SHOP_MANAGER';
  assert.equal(isRouteAuthorized(userRole, 'shop-dashboard'), true);
  assert.equal(isRouteAuthorized(userRole, 'bar-dashboard'), false);

  // Admin updates role in DB to Bar Manager
  const rawDbRole = 'Bar Manager';
  userRole = normalizeStaffRole(rawDbRole);

  assert.equal(userRole, 'BAR_MANAGER');
  // Old portal access is immediately denied
  assert.equal(isRouteAuthorized(userRole, 'shop-dashboard'), false);
  // New portal access is immediately allowed
  assert.equal(isRouteAuthorized(userRole, 'bar-dashboard'), true);
});

// 12. DEFAULT ROUTE FOR ROLES
test('Default portal landing routes for every role', () => {
  assert.equal(getDefaultRouteForRole('ADMIN'), 'admin-dashboard');
  assert.equal(getDefaultRouteForRole('RESTAURANT_MANAGER'), 'restaurant-dashboard');
  assert.equal(getDefaultRouteForRole('BAR_MANAGER'), 'bar-dashboard');
  assert.equal(getDefaultRouteForRole('SHOP_MANAGER'), 'shop-dashboard');
  assert.equal(getDefaultRouteForRole('COURT_MANAGER'), 'court-dashboard');
  assert.equal(getDefaultRouteForRole('STAFF_MANAGER'), 'staff-dashboard');
  assert.equal(getDefaultRouteForRole('RECEPTION'), 'reception-dashboard');
  assert.equal(getDefaultRouteForRole('MEMBER'), 'home');
});

// 13. ROLE NORMALIZATION
test('Staff role normalization parses any valid role variations', () => {
  assert.equal(normalizeStaffRole('Restaurant Manager'), 'RESTAURANT_MANAGER');
  assert.equal(normalizeStaffRole('Bar Manager'), 'BAR_MANAGER');
  assert.equal(normalizeStaffRole('Gear Shop Manager'), 'SHOP_MANAGER');
  assert.equal(normalizeStaffRole('Court Manager'), 'COURT_MANAGER');
  assert.equal(normalizeStaffRole('Staff HR Manager'), 'STAFF_MANAGER');
  assert.equal(normalizeStaffRole('Reception Manager'), 'RECEPTION');
  assert.equal(normalizeStaffRole('Executive Administrator'), 'ADMIN');
  assert.equal(normalizeStaffRole('Unknown Cleaner'), null);
});

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
