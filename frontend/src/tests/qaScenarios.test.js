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
  getPathFromRoute,
  getPortalNameForRoute
} from '../utils/routeSecurity.js';
import {
  normalizeStaffRole,
  getStoredSession,
  createStaffSession,
  createMemberSession,
  clearSession
} from '../services/sessionService.js';

// In-memory mock localStorage and sessionStorage for deterministic Node test execution
const mockStorage = {
  local: {},
  session: {}
};

global.localStorage = {
  getItem: (k) => mockStorage.local[k] ?? null,
  setItem: (k, v) => { mockStorage.local[k] = String(v); },
  removeItem: (k) => { delete mockStorage.local[k]; },
  clear: () => { mockStorage.local = {}; }
};

global.sessionStorage = {
  getItem: (k) => mockStorage.session[k] ?? null,
  setItem: (k, v) => { mockStorage.session[k] = String(v); },
  removeItem: (k) => { delete mockStorage.session[k]; },
  clear: () => { mockStorage.session = {}; }
};

let passedCount = 0;
let failedCount = 0;

async function runScenario(code, description, testFn) {
  try {
    await testFn();
    console.log(`[PASS] Scenario ${code}: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] Scenario ${code}: ${description}`);
    console.error(err);
    failedCount++;
  }
}

// Mock Application Simulation
class MockKinesisApp {
  constructor() {
    this.user = null;
    this.role = null;
    this.currentPath = '/';
    this.renderedComponent = 'Landing';
    this.history = ['/'];
  }

  // Simulate Application Start / Refresh
  async restoreSession(mockDbStaffList = []) {
    const session = getStoredSession();
    if (!session) {
      this.user = null;
      this.role = null;
      return;
    }

    if (session.type === 'member') {
      this.user = { id: session.memberId, role: 'member' };
      this.role = 'MEMBER';
      return;
    }

    if (session.type === 'staff') {
      if (session.email === 'admin@kinesis.club') {
        this.user = { id: 'admin', role: 'admin', email: 'admin@kinesis.club' };
        this.role = 'ADMIN';
        return;
      }

      const staff = mockDbStaffList.find(s => String(s.id) === String(session.staffId));
      if (!staff) {
        clearSession();
        this.user = null;
        this.role = null;
        return;
      }

      const isActive = staff.employment_status === 'ACTIVE';
      if (!isActive) {
        clearSession();
        this.user = null;
        this.role = null;
        global.sessionStorage.setItem('kinesis_auth_message', 'Access Denied: Account deactivated.');
        return;
      }

      const currentRole = normalizeStaffRole(staff.role);
      if (!currentRole) {
        clearSession();
        this.user = null;
        this.role = null;
        return;
      }

      this.user = { id: staff.id, name: staff.name, email: staff.email, role: currentRole.toLowerCase() };
      this.role = currentRole;
      createStaffSession({ staffId: staff.id, role: currentRole, email: staff.email });
    }
  }

  // Simulate Navigation & Route Guard
  navigate(path, replace = false) {
    if (replace) {
      this.history[this.history.length - 1] = path;
    } else {
      this.history.push(path);
    }
    this.currentPath = path;
    this.render();
  }

  // Back button
  goBack() {
    if (this.history.length > 1) {
      this.history.pop();
      this.currentPath = this.history[this.history.length - 1];
      this.render();
    }
  }

  // Render & Guard Logic
  render() {
    const route = getRouteFromPath(this.currentPath);

    // Unauthenticated
    if (!this.user) {
      if (isProtectedRoute(route)) {
        global.sessionStorage.setItem('kinesis_redirect_after_login', this.currentPath);
        if (!global.sessionStorage.getItem('kinesis_auth_message')) {
          global.sessionStorage.setItem('kinesis_auth_message', 'Login Required');
        }
        this.currentPath = '/login';
        this.renderedComponent = 'Login';
        return;
      }
      this.renderedComponent = route === 'login' ? 'Login' : route === 'register' ? 'Register' : 'Landing';
      return;
    }

    // Authenticated visiting login/register
    if (route === 'login' || route === 'register') {
      const defRoute = getDefaultRouteForRole(this.role);
      this.currentPath = getPathFromRoute(defRoute);
      this.renderedComponent = defRoute;
      return;
    }

    // Authenticated on Landing
    if (route === 'landing') {
      this.renderedComponent = 'Landing';
      return;
    }

    // Role Authorization check
    if (!isRouteAuthorized(this.role, route)) {
      this.renderedComponent = 'AccessDenied';
      return;
    }

    this.renderedComponent = route;
  }

  // Logout
  logout() {
    clearSession();
    this.user = null;
    this.role = null;
    this.navigate('/login', true);
  }
}

async function runAllScenarios() {
  console.log('===============================================================');
  console.log('  KINESIS SPORTS CLUB - QA BREAK-THE-SYSTEM TEST SUITE (A - X) ');
  console.log('===============================================================\n');

  // A. Not logged in -> /admin
  await runScenario('A', 'Not logged in -> /admin redirects to login, blocks Admin portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/admin');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
    assert.equal(global.sessionStorage.getItem('kinesis_redirect_after_login'), '/admin');
  });

  // B. Not logged in -> /shop-manager
  await runScenario('B', 'Not logged in -> /shop-manager redirects to login, blocks Shop portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/shop-manager');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
    assert.equal(global.sessionStorage.getItem('kinesis_redirect_after_login'), '/shop-manager');
  });

  // C. Not logged in -> /restaurant
  await runScenario('C', 'Not logged in -> /restaurant redirects to login, blocks Restaurant portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/restaurant');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // D. Not logged in -> /bar
  await runScenario('D', 'Not logged in -> /bar redirects to login, blocks Bar portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/bar');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // E. Not logged in -> /court-manager
  await runScenario('E', 'Not logged in -> /court-manager redirects to login, blocks Court portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/court-manager');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // F. Not logged in -> /staff
  await runScenario('F', 'Not logged in -> /staff redirects to login, blocks Staff portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/staff');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // G. Not logged in -> /reception
  await runScenario('G', 'Not logged in -> /reception redirects to login, blocks Reception portal', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.navigate('/reception');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // H. Member -> /admin
  await runScenario('H', 'Member -> /admin results in Access Denied (NEVER Admin portal)', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 10, role: 'member' };
    app.role = 'MEMBER';
    app.navigate('/admin');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'admin-dashboard');
  });

  // I. Member -> /shop-manager
  await runScenario('I', 'Member -> /shop-manager results in Access Denied', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 10, role: 'member' };
    app.role = 'MEMBER';
    app.navigate('/shop-manager');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'shop-dashboard');
  });

  // J. Shop Manager -> /admin
  await runScenario('J', 'Shop Manager -> /admin results in Access Denied (NEVER Admin portal)', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 3, role: 'shop_manager' };
    app.role = 'SHOP_MANAGER';
    app.navigate('/admin');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'admin-dashboard');
  });

  // K. Shop Manager -> /bar
  await runScenario('K', 'Shop Manager -> /bar results in Access Denied (NEVER Bar portal)', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 3, role: 'shop_manager' };
    app.role = 'SHOP_MANAGER';
    app.navigate('/bar');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'bar-dashboard');
  });

  // L. Bar Manager -> /shop-manager
  await runScenario('L', 'Bar Manager -> /shop-manager results in Access Denied', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 2, role: 'bar_manager' };
    app.role = 'BAR_MANAGER';
    app.navigate('/shop-manager');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'shop-dashboard');
  });

  // M. Reception -> /admin
  await runScenario('M', 'Reception -> /admin results in Access Denied', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 5, role: 'reception' };
    app.role = 'RECEPTION';
    app.navigate('/admin');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'admin-dashboard');
  });

  // N. Court Manager -> /admin
  await runScenario('N', 'Court Manager -> /admin results in Access Denied', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 4, role: 'court_manager' };
    app.role = 'COURT_MANAGER';
    app.navigate('/admin');
    assert.equal(app.renderedComponent, 'AccessDenied');
    assert.notEqual(app.renderedComponent, 'admin-dashboard');
  });

  // O. Logout -> press browser Back
  await runScenario('O', 'Logout -> press browser Back blocks protected route and redirects to login', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 'admin', role: 'admin' };
    app.role = 'ADMIN';

    // User starts at /login, then enters /admin, then navigates to /admin/inventory
    app.history = ['/login'];
    app.navigate('/admin');
    app.navigate('/admin/inventory');
    assert.equal(app.renderedComponent, 'admin-inventory');

    // User logs out (navigates to /login)
    app.logout();
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');

    // User presses browser Back to return to /admin/inventory
    app.goBack();
    // Protected route /admin/inventory requires authentication: guard redirects to /login and renders Login!
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
    assert.notEqual(app.renderedComponent, 'admin-inventory');
    assert.notEqual(app.renderedComponent, 'admin-dashboard');
  });

  // P. Logout -> refresh
  await runScenario('P', 'Logout -> refresh on protected route redirects to login', async () => {
    global.localStorage.clear();
    const app = new MockKinesisApp();
    app.currentPath = '/admin';
    await app.restoreSession([]);
    app.render();
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // Q. Login -> refresh
  await runScenario('Q', 'Login -> refresh maintains session and remains on same authorized route', async () => {
    createStaffSession({ staffId: 3, role: 'SHOP_MANAGER', email: 'shop@kinesis.club' });
    const app = new MockKinesisApp();
    app.currentPath = '/shop-manager';

    const mockDbStaff = [
      { id: 3, email: 'shop@kinesis.club', role: 'Shop Manager', employment_status: 'ACTIVE' }
    ];

    await app.restoreSession(mockDbStaff);
    assert.equal(app.role, 'SHOP_MANAGER');
    app.render();
    assert.equal(app.currentPath, '/shop-manager');
    assert.equal(app.renderedComponent, 'shop-dashboard');
  });

  // R. Login -> navigate -> refresh
  await runScenario('R', 'Login -> navigate -> refresh preserves new authorized location', async () => {
    createStaffSession({ staffId: 'admin', role: 'ADMIN', email: 'admin@kinesis.club' });
    const app = new MockKinesisApp();
    app.user = { id: 'admin', role: 'admin' };
    app.role = 'ADMIN';

    // Navigate to another authorized route
    app.navigate('/shop-manager');
    assert.equal(app.renderedComponent, 'shop-dashboard');

    // Refresh
    await app.restoreSession([]);
    app.render();
    assert.equal(app.currentPath, '/shop-manager');
    assert.equal(app.renderedComponent, 'shop-dashboard');
  });

  // S. Staff role changed -> refresh -> verify old portal access is removed
  await runScenario('S', 'Staff role changed from SHOP_MANAGER to BAR_MANAGER -> refresh denies old portal, allows new', async () => {
    // Initially session has SHOP_MANAGER
    createStaffSession({ staffId: 3, role: 'SHOP_MANAGER', email: 'shop@kinesis.club' });
    const app = new MockKinesisApp();
    app.currentPath = '/shop-manager';

    // In database, Admin has updated this employee's role to Bar Manager
    const liveDbStaff = [
      { id: 3, email: 'shop@kinesis.club', role: 'Bar Manager', employment_status: 'ACTIVE' }
    ];

    // Refresh occurs
    await app.restoreSession(liveDbStaff);

    // Validated role from DB is now BAR_MANAGER
    assert.equal(app.role, 'BAR_MANAGER');

    // Stale localStorage role was updated to BAR_MANAGER
    const updatedSession = getStoredSession();
    assert.equal(updatedSession.role, 'BAR_MANAGER');

    // On /shop-manager, BAR_MANAGER is now DENIED
    app.render();
    assert.equal(app.renderedComponent, 'AccessDenied');

    // But on /bar, BAR_MANAGER is ALLOWED
    app.navigate('/bar');
    assert.equal(app.renderedComponent, 'bar-dashboard');
  });

  // T. Staff account deactivated -> refresh -> verify access is removed
  await runScenario('T', 'Staff account deactivated in DB -> refresh invalidates session and redirects to login', async () => {
    createStaffSession({ staffId: 3, role: 'SHOP_MANAGER', email: 'shop@kinesis.club' });
    const app = new MockKinesisApp();
    app.currentPath = '/shop-manager';

    // In database, Admin has deactivated this employee
    const liveDbStaff = [
      { id: 3, email: 'shop@kinesis.club', role: 'Shop Manager', employment_status: 'INACTIVE' }
    ];

    // Refresh occurs
    await app.restoreSession(liveDbStaff);

    // User is null and session is destroyed
    assert.equal(app.user, null);
    assert.equal(getStoredSession(), null);

    // Render on /shop-manager redirects to login with deactivation notice
    app.render();
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
    assert.equal(global.sessionStorage.getItem('kinesis_auth_message'), 'Access Denied: Account deactivated.');
  });

  // U. Corrupted/missing session -> verify login is required
  await runScenario('U', 'Corrupted or malformed session -> session cleared and login required', async () => {
    global.localStorage.setItem('kinesis_session', 'INVALID_JSON_CORRUPTED');
    const app = new MockKinesisApp();
    app.currentPath = '/admin';

    await app.restoreSession([]);
    assert.equal(app.user, null);
    app.render();
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // V. Multiple rapid navigation attempts
  await runScenario('V', 'Multiple rapid navigation attempts maintain correct route state and protection', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 3, role: 'shop_manager' };
    app.role = 'SHOP_MANAGER';

    // Rapid navigation sequence
    app.navigate('/shop-manager');
    assert.equal(app.renderedComponent, 'shop-dashboard');
    app.navigate('/admin');
    assert.equal(app.renderedComponent, 'AccessDenied');
    app.navigate('/bar');
    assert.equal(app.renderedComponent, 'AccessDenied');
    app.navigate('/shop-manager');
    assert.equal(app.renderedComponent, 'shop-dashboard');
  });

  // W. Direct URL entry after logout
  await runScenario('W', 'Direct URL entry to /reception after logout redirects to login', async () => {
    const app = new MockKinesisApp();
    app.user = { id: 5, role: 'reception' };
    app.role = 'RECEPTION';
    app.navigate('/reception');
    assert.equal(app.renderedComponent, 'reception-dashboard');

    app.logout();
    assert.equal(app.renderedComponent, 'Login');

    // Attempt direct URL entry
    app.navigate('/reception');
    assert.equal(app.currentPath, '/login');
    assert.equal(app.renderedComponent, 'Login');
  });

  // X. Open protected route in a new browser tab
  await runScenario('X', 'Open protected route in a new tab: validates session from DB, renders if authorized', async () => {
    // New tab initializes with session already present in storage
    createStaffSession({ staffId: 4, role: 'COURT_MANAGER', email: 'court@kinesis.club' });

    const tab = new MockKinesisApp();
    tab.currentPath = '/court-manager';

    const liveDb = [
      { id: 4, email: 'court@kinesis.club', role: 'Court Manager', employment_status: 'ACTIVE' }
    ];

    await tab.restoreSession(liveDb);
    tab.render();

    assert.equal(tab.role, 'COURT_MANAGER');
    assert.equal(tab.currentPath, '/court-manager');
    assert.equal(tab.renderedComponent, 'court-dashboard');
  });

  console.log(`\n===============================================================`);
  console.log(`  QA SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: 24 SCENARIOS) `);
  console.log(`===============================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllScenarios();
