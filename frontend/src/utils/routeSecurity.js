/**
 * Kinesis Sports Club - Route Security & Authorization Matrix
 * 
 * Centralized route definitions, role mappings, and authorization guards.
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  RESTAURANT_MANAGER: 'RESTAURANT_MANAGER',
  BAR_MANAGER: 'BAR_MANAGER',
  SHOP_MANAGER: 'SHOP_MANAGER',
  COURT_MANAGER: 'COURT_MANAGER',
  STAFF_MANAGER: 'STAFF_MANAGER',
  RECEPTION: 'RECEPTION'
};

export const PUBLIC_ROUTES = [
  'landing',
  'login',
  'register',
  'forgot-password',
  'reset-password'
];

export const MEMBER_ROUTES = [
  'home',
  'book',
  'bookings',
  'membership',
  'shop',
  'cafe-orders',
  'purchase-history',
  'profile'
];

export const RESTAURANT_ROUTES = [
  'restaurant-dashboard'
];

export const BAR_ROUTES = [
  'bar-dashboard'
];

export const SHOP_ROUTES = [
  'shop-dashboard'
];

export const COURT_ROUTES = [
  'court-dashboard'
];

export const STAFF_ROUTES = [
  'staff-dashboard',
  'staff-inventory',
  'staff-tables'
];

export const RECEPTION_ROUTES = [
  'reception-dashboard'
];

export const ADMIN_ROUTES = [
  'admin-dashboard',
  'admin-analytics',
  'admin-operations',
  'admin-members',
  'admin-courts',
  'admin-inventory',
  'admin-tables',
  'admin-kitchen',
  'admin-offers'
];

/**
 * Route -> Authorized Roles mapping.
 * Admin has superuser access to all operational staff portals.
 */
export const ROUTE_PERMISSIONS = {
  // Member routes
  'home': [ROLES.MEMBER],
  'book': [ROLES.MEMBER],
  'bookings': [ROLES.MEMBER],
  'membership': [ROLES.MEMBER],
  'shop': [ROLES.MEMBER],
  'cafe-orders': [ROLES.MEMBER],
  'purchase-history': [ROLES.MEMBER],
  'profile': [ROLES.MEMBER],

  // Admin routes
  'admin-dashboard': [ROLES.ADMIN],
  'admin-analytics': [ROLES.ADMIN],
  'admin-operations': [ROLES.ADMIN],
  'admin-members': [ROLES.ADMIN],
  'admin-courts': [ROLES.ADMIN],
  'admin-inventory': [ROLES.ADMIN],
  'admin-tables': [ROLES.ADMIN],
  'admin-kitchen': [ROLES.ADMIN],
  'admin-offers': [ROLES.ADMIN],

  // Operational portals (Role + Admin)
  'restaurant-dashboard': [ROLES.RESTAURANT_MANAGER, ROLES.ADMIN],
  'bar-dashboard': [ROLES.BAR_MANAGER, ROLES.ADMIN],
  'shop-dashboard': [ROLES.SHOP_MANAGER, ROLES.ADMIN],
  'court-dashboard': [ROLES.COURT_MANAGER, ROLES.ADMIN],
  'staff-dashboard': [ROLES.STAFF_MANAGER, ROLES.ADMIN],
  'staff-inventory': [ROLES.STAFF_MANAGER, ROLES.ADMIN],
  'staff-tables': [ROLES.STAFF_MANAGER, ROLES.ADMIN],
  'reception-dashboard': [ROLES.RECEPTION, ROLES.ADMIN]
};

/**
 * Check if a route is a public route
 */
export function isPublicRoute(route) {
  return PUBLIC_ROUTES.includes(route);
}

/**
 * Check if a route is private/protected
 */
export function isProtectedRoute(route) {
  return !PUBLIC_ROUTES.includes(route);
}

/**
 * Check if a route is a staff-oriented route
 */
export function isStaffRoute(route) {
  return (
    ADMIN_ROUTES.includes(route) ||
    RESTAURANT_ROUTES.includes(route) ||
    BAR_ROUTES.includes(route) ||
    SHOP_ROUTES.includes(route) ||
    COURT_ROUTES.includes(route) ||
    STAFF_ROUTES.includes(route) ||
    RECEPTION_ROUTES.includes(route)
  );
}

/**
 * Check whether a specific role is authorized to access a route
 */
export function isRouteAuthorized(role, route) {
  if (isPublicRoute(route)) return true;
  if (!role || !route) return false;

  const normalizedRole = String(role).toUpperCase();
  const allowedRoles = ROUTE_PERMISSIONS[route];

  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(normalizedRole);
}

/**
 * Get the default authorized landing route for any role
 */
export function getDefaultRouteForRole(role) {
  const r = (role || '').toUpperCase();
  if (r === ROLES.ADMIN) return 'admin-dashboard';
  if (r === ROLES.RESTAURANT_MANAGER) return 'restaurant-dashboard';
  if (r === ROLES.BAR_MANAGER) return 'bar-dashboard';
  if (r === ROLES.SHOP_MANAGER) return 'shop-dashboard';
  if (r === ROLES.COURT_MANAGER) return 'court-dashboard';
  if (r === ROLES.STAFF_MANAGER) return 'staff-dashboard';
  if (r === ROLES.RECEPTION) return 'reception-dashboard';
  if (r === ROLES.MEMBER) return 'home';
  return 'landing';
}

/**
 * Human-readable portal title for access-denied and notifications
 */
export function getPortalNameForRoute(route) {
  if (ADMIN_ROUTES.includes(route)) return 'Executive Administration';
  if (RESTAURANT_ROUTES.includes(route)) return 'Restaurant Operations';
  if (BAR_ROUTES.includes(route)) return 'Bar Operations';
  if (SHOP_ROUTES.includes(route)) return 'Gear Shop Operations';
  if (COURT_ROUTES.includes(route)) return 'Court Management';
  if (STAFF_ROUTES.includes(route)) return 'Staff / HR Operations';
  if (RECEPTION_ROUTES.includes(route)) return 'Reception Desk';
  if (MEMBER_ROUTES.includes(route)) return 'Member Portal';
  return 'Protected Portal';
}

/**
 * Convert URL pathname to canonical route name
 */
export function getRouteFromPath(pathname) {
  const p = (pathname || '').toLowerCase().replace(/\/$/, '');
  if (p === '' || p === '/') return 'landing';
  if (p === '/login') return 'login';
  if (p === '/register') return 'register';
  if (p === '/forgot-password') return 'forgot-password';
  if (p === '/reset-password') return 'reset-password';

  // Member Routes
  if (p === '/member' || p === '/home') return 'home';
  if (p === '/book') return 'book';
  if (p === '/bookings') return 'bookings';
  if (p === '/membership') return 'membership';
  if (p === '/shop') return 'shop';
  if (p === '/cafe-orders' || p === '/member/cafe-orders') return 'cafe-orders';
  if (p === '/purchase-history' || p === '/purchases') return 'purchase-history';
  if (p === '/profile') return 'profile';

  // Dedicated Portals
  if (p === '/restaurant' || p === '/restaurant-dashboard') return 'restaurant-dashboard';
  if (p === '/bar' || p === '/bar-dashboard') return 'bar-dashboard';
  if (p === '/shop-manager' || p === '/shop-dashboard') return 'shop-dashboard';
  if (p === '/court-manager' || p === '/court-dashboard') return 'court-dashboard';
  if (p === '/reception' || p === '/reception-dashboard') return 'reception-dashboard';
  
  // Staff Routes
  if (p === '/staff' || p === '/staff-dashboard' || p === '/staff/dashboard') return 'staff-dashboard';
  if (p === '/staff/inventory' || p === '/staff-inventory') return 'staff-inventory';
  if (p === '/staff/tables' || p === '/staff-tables') return 'staff-tables';

  // Admin Routes
  if (p === '/admin' || p === '/admin-dashboard') return 'admin-dashboard';
  if (p === '/admin/analytics' || p === '/admin-analytics') return 'admin-analytics';
  if (p === '/admin/courts' || p === '/admin-courts') return 'admin-courts';
  if (p === '/admin/inventory' || p === '/admin-inventory') return 'admin-inventory';
  if (p === '/admin/operations' || p === '/admin-operations') return 'admin-operations';
  if (p === '/admin/tables' || p === '/admin-tables') return 'admin-tables';
  if (p === '/admin/kitchen' || p === '/admin-kitchen') return 'admin-kitchen';
  if (p === '/admin/members' || p === '/admin-members') return 'admin-members';
  if (p === '/admin/offers' || p === '/admin-offers') return 'admin-offers';

  return 'landing';
}

/**
 * Convert canonical route name to canonical URL pathname
 */
export function getPathFromRoute(r) {
  if (r === 'landing') return '/';
  if (r === 'login') return '/login';
  if (r === 'register') return '/register';
  if (r === 'forgot-password') return '/forgot-password';
  if (r === 'reset-password') return '/reset-password';
  if (r === 'home') return '/member';
  if (r === 'book') return '/book';
  if (r === 'bookings') return '/bookings';
  if (r === 'membership') return '/membership';
  if (r === 'shop') return '/shop';
  if (r === 'cafe-orders') return '/cafe-orders';
  if (r === 'purchase-history') return '/purchase-history';
  if (r === 'profile') return '/profile';

  if (r === 'restaurant-dashboard') return '/restaurant';
  if (r === 'bar-dashboard') return '/bar';
  if (r === 'shop-dashboard') return '/shop-manager';
  if (r === 'court-dashboard') return '/court-manager';
  if (r === 'reception-dashboard') return '/reception';
  if (r === 'staff-dashboard') return '/staff';
  if (r === 'staff-inventory') return '/staff/inventory';
  if (r === 'staff-tables') return '/staff/tables';

  if (r === 'admin-dashboard') return '/admin';
  if (r === 'admin-analytics') return '/admin/analytics';
  if (r === 'admin-operations') return '/admin/operations';
  if (r === 'admin-courts') return '/admin/courts';
  if (r === 'admin-inventory') return '/admin/inventory';
  if (r === 'admin-tables') return '/admin/tables';
  if (r === 'admin-kitchen') return '/admin/kitchen';
  if (r === 'admin-members') return '/admin/members';
  if (r === 'admin-offers') return '/admin/offers';

  return `/${r}`;
}
