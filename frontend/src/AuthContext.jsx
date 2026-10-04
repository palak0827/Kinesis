import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import {
  ADMIN_CREDENTIALS,
  RESTAURANT_CREDENTIALS,
  BAR_CREDENTIALS,
  SHOP_CREDENTIALS,
  COURT_CREDENTIALS,
  STAFF_CREDENTIALS,
  RECEPTION_CREDENTIALS,
  getStoredSession,
  createMemberSession,
  createStaffSession,
  clearSession,
  getCurrentMember,
  normalizeStaffRole,
  getRouteForRole
} from './services/sessionService.js';
import { getStaffList } from './services/clubPlatformService.js';

export { normalizeStaffRole, getRouteForRole };

const AuthContext = createContext({});

export const ALL_ROLES = [
  'MEMBER',
  'RESTAURANT_MANAGER',
  'BAR_MANAGER',
  'SHOP_MANAGER',
  'COURT_MANAGER',
  'STAFF_MANAGER',
  'RECEPTION',
  'ADMIN'
];


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore local session on initial load or browser refresh
  const restoreSession = async () => {
    try {
      const session = getStoredSession();

      if (!session) {
        setUser(null);
        setRole(null);
        setMemberProfile(null);
        setLoading(false);
        return;
      }

      // 1. MEMBER SESSION
      if (session.type === 'member' && session.memberId) {
        if (!supabase) {
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
          setLoading(false);
          return;
        }

        const member = await getCurrentMember(supabase);
        // Validate user record exists and account is active
        if (member && (!member.status || member.status.toLowerCase() === 'active')) {
          const validatedRole = member.role === 'admin' ? 'ADMIN' : 'MEMBER';
          setUser({
            id: member.id,
            email: member.email,
            name: member.name,
            role: member.role || 'member'
          });
          setRole(validatedRole);
          setMemberProfile(member);
        } else {
          // Member deleted or inactive/suspended
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
          sessionStorage.setItem('kinesis_auth_message', 'Session expired or member account inactive. Please log in again.');
        }
        setLoading(false);
        return;
      }

      // 2. STAFF SESSION (Re-verify role & active status from database)
      if (session.type === 'staff') {
        // Validate master administrator credentials
        if (session.email && session.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
          setUser({
            id: 'admin',
            email: ADMIN_CREDENTIALS.email,
            name: ADMIN_CREDENTIALS.name,
            role: 'admin',
            department: 'Operations'
          });
          setRole('ADMIN');
          setMemberProfile(null);
          setLoading(false);
          return;
        }

        // Check live staff roster to ensure account exists, is active, and fetch CURRENT role
        const staffList = await getStaffList();
        const staff = staffList.find(s => 
          String(s.id) === String(session.staffId) || 
          (s.email && session.email && s.email.toLowerCase() === session.email.toLowerCase())
        );

        if (!staff) {
          // Staff record deleted/missing
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
          sessionStorage.setItem('kinesis_auth_message', 'Session expired. Staff record not found.');
          setLoading(false);
          return;
        }

        // Check if staff account is active
        const isStatusActive = staff.employment_status === 'ACTIVE' || staff.status === 'active' || staff.is_active === true;
        const isStatusInactive = staff.employment_status === 'INACTIVE' || staff.status === 'inactive' || staff.active === false || staff.is_active === false;

        if (!isStatusActive || isStatusInactive) {
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
          sessionStorage.setItem('kinesis_auth_message', 'Access Denied: Your staff account is deactivated. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // Check CURRENT role from the live database record
        const currentRole = normalizeStaffRole(staff.role);
        if (!currentRole) {
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
          sessionStorage.setItem('kinesis_auth_message', 'Access Not Assigned: Your account has no active role assigned. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // Restore validated authenticated state with CURRENT role
        setUser({
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: currentRole.toLowerCase(),
          department: staff.department
        });
        setRole(currentRole);
        setMemberProfile(null);

        // Keep persisted session in sync with the latest database role
        createStaffSession({
          staffId: staff.id,
          role: currentRole,
          department: staff.department,
          name: staff.name,
          email: staff.email
        });
      } else {
        // Unknown session type
        clearSession();
        setUser(null);
        setRole(null);
        setMemberProfile(null);
      }
    } catch (err) {
      console.error('Error during session restoration:', err);
      clearSession();
      setUser(null);
      setRole(null);
      setMemberProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();

    // Listen for storage changes across browser tabs (e.g. role change or deactivation in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'kinesis_session' || e.key === 'kinesis_staff') {
        restoreSession();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Final Login Architecture:
   * Only TWO login options:
   * 1. mode = 'member' -> Queries members table, redirects to /member
   * 2. mode = 'staff'  -> Single Staff Login for all staff, managers, reception, and admins.
   *                       Reads staff record from DB, checks active status, checks role, redirects to correct portal.
   */
  const login = async (email, password, mode = 'member') => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const isMemberMode = mode === 'member';

    // ==========================================
    // 1. MEMBER LOGIN
    // ==========================================
    if (isMemberMode) {
      if (!supabase) {
        throw new Error('Database connection is not available.');
      }

      const { data: member, error } = await supabase
        .from('members')
        .select(`
          *,
          membership_plans (
            id,
            name,
            monthly_price,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) {
        console.error('Member login error:', error);
        throw new Error('Something went wrong. Please try again.');
      }

      if (!member || member.password !== cleanPass) {
        throw new Error('Account not found or credentials are incorrect.');
      }

      // Check if account has admin role in members table
      if (member.role === 'admin') {
        createStaffSession({
          staffId: member.id,
          role: 'ADMIN',
          department: 'Administration',
          name: member.name,
          email: member.email
        });
        const adminUser = {
          id: member.id,
          email: member.email,
          name: member.name,
          role: 'admin'
        };
        setUser(adminUser);
        setRole('ADMIN');
        setMemberProfile(member);
        return { type: 'staff', role: 'ADMIN', user: adminUser, targetRoute: 'admin-dashboard' };
      }

      createMemberSession(member.id);
      const memberUser = {
        id: member.id,
        email: member.email,
        name: member.name,
        role: 'member'
      };
      setUser(memberUser);
      setRole('MEMBER');
      setMemberProfile(member);
      return { type: 'member', role: 'MEMBER', member, targetRoute: 'home' };
    }

    // ==========================================
    // 2. STAFF LOGIN (ALL EMPLOYEES & MANAGERS)
    // ==========================================
    // Check master Administrator credentials first
    if (normalizedEmail === ADMIN_CREDENTIALS.email.toLowerCase() && cleanPass === ADMIN_CREDENTIALS.password) {
      createStaffSession({
        staffId: 'admin',
        role: 'ADMIN',
        department: 'Operations',
        name: ADMIN_CREDENTIALS.name,
        email: ADMIN_CREDENTIALS.email
      });
      const adminUser = {
        id: 'admin',
        email: ADMIN_CREDENTIALS.email,
        name: ADMIN_CREDENTIALS.name,
        role: 'admin',
        department: 'Operations'
      };
      setUser(adminUser);
      setRole('ADMIN');
      setMemberProfile(null);
      return { type: 'staff', role: 'ADMIN', user: adminUser, targetRoute: 'admin-dashboard' };
    }

    // Query staff member from database / staff roster
    const staffList = await getStaffList();
    const staff = staffList.find(s => s.email.toLowerCase() === normalizedEmail);

    if (!staff) {
      throw new Error('Account not found or credentials are incorrect.');
    }

    // Password verification (checks staff.password or default StaffPassword123!)
    const expectedPassword = staff.password || 'StaffPassword123!';
    // Also accept designated departmental password fallback if configured
    const departmentalDefaults = [
      RESTAURANT_CREDENTIALS, BAR_CREDENTIALS, SHOP_CREDENTIALS,
      COURT_CREDENTIALS, STAFF_CREDENTIALS, RECEPTION_CREDENTIALS
    ];
    const deptMatch = departmentalDefaults.find(d => d.email.toLowerCase() === normalizedEmail);
    const isValidPass = cleanPass === expectedPassword || (deptMatch && cleanPass === deptMatch.password);

    if (!isValidPass) {
      throw new Error('Account not found or credentials are incorrect.');
    }

    // Part 4: Check if account is active
    if (staff.employment_status !== 'ACTIVE') {
      throw new Error('Access Not Assigned: Your account has not been assigned an active role yet. Please contact the administrator.');
    }

    // Part 4: Check if role is assigned
    const assignedRole = normalizeStaffRole(staff.role);
    if (!assignedRole) {
      throw new Error('Access Not Assigned: Your account has not been assigned an active role yet. Please contact the administrator.');
    }

    const targetRoute = getRouteForRole(assignedRole);

    createStaffSession({
      staffId: staff.id,
      role: assignedRole,
      department: staff.department,
      name: staff.name,
      email: staff.email
    });

    const staffUser = {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: assignedRole.toLowerCase(),
      department: staff.department
    };
    setUser(staffUser);
    setRole(assignedRole);
    setMemberProfile(null);

    return { type: 'staff', role: assignedRole, user: staffUser, targetRoute };
  };

  /**
   * Member Registration
   */
  const register = async ({ name, email, phone, plan_id, password, user_type = 'MEMBER', durationMonths = 12 }) => {
    if (!supabase) {
      throw new Error('Database connection is not available.');
    }

    // Server-side validation
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Full name is required.');
    if (/\d/.test(cleanName)) throw new Error('Name cannot contain numbers.');
    if (/[^A-Za-z\s'-]/.test(cleanName)) throw new Error('Name contains unsupported special characters.');
    if (cleanName.length < 2) throw new Error('Name must be at least 2 characters long.');
    if (cleanName.length > 70) throw new Error('Name cannot exceed 70 characters.');

    const normalizedEmail = (email || '').trim().toLowerCase();
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.(com|ac\.in)$/i;
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new Error('Invalid email address. Only valid .com or .ac.in domains are accepted.');
    }

    const cleanPhone = (phone || '').trim();
    const PHONE_REGEX = /^\d{10}$/;
    if (!PHONE_REGEX.test(cleanPhone)) {
      throw new Error('Phone number must contain exactly 10 digits.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const isWalkIn = user_type === 'WALK_IN' || !plan_id;

    // Check email & phone uniqueness
    const [
      { data: existingEmail, error: checkError },
      { data: existingPhone, error: phoneError }
    ] = await Promise.all([
      supabase.from('members').select('id').eq('email', normalizedEmail).maybeSingle(),
      supabase.from('members').select('id').eq('phone', cleanPhone).maybeSingle()
    ]);

    if (checkError || phoneError) {
      console.error('Credential uniqueness check error:', checkError || phoneError);
      throw new Error('Something went wrong. Please try again.');
    }

    if (existingEmail) {
      throw new Error('An account with this email already exists.');
    }

    if (existingPhone) {
      throw new Error('An account with this phone number already exists.');
    }

    const startDate = new Date().toISOString().split('T')[0];
    const exp = new Date();
    if (isWalkIn) {
      exp.setFullYear(exp.getFullYear() + 10);
    } else {
      exp.setMonth(exp.getMonth() + Number(durationMonths || 12));
    }
    const expiryDate = exp.toISOString().split('T')[0];
    const generatedClubId = String(Math.floor(1000000000 + Math.random() * 9000000000));

    const newRecord = {
      club_id: generatedClubId,
      name: cleanName,
      email: normalizedEmail,
      phone: cleanPhone,
      plan_id: isWalkIn ? null : Number(plan_id),
      user_type: isWalkIn ? 'WALK_IN' : 'MEMBER',
      password: password,
      status: 'active',
      role: 'member',
      start_date: startDate,
      expiry_date: expiryDate,
      created_at: new Date().toISOString()
    };

    let createdMember = null;
    let insertError = null;

    try {
      const res = await supabase
        .from('members')
        .insert([newRecord])
        .select(`
          *,
          membership_plans (
            id,
            name,
            monthly_price,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .single();
      createdMember = res.data;
      insertError = res.error;
    } catch (e) {
      insertError = e;
    }

    if (insertError && insertError.message && insertError.message.includes('user_type')) {
      const fallbackRecord = { ...newRecord };
      delete fallbackRecord.user_type;
      const resFallback = await supabase
        .from('members')
        .insert([fallbackRecord])
        .select(`
          *,
          membership_plans (
            id,
            name,
            monthly_price,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .single();
      createdMember = resFallback.data;
      if (createdMember) {
        createdMember.user_type = isWalkIn ? 'WALK_IN' : 'MEMBER';
      }
      insertError = resFallback.error;
    }

    if (insertError || !createdMember) {
      console.error('Member insert error:', insertError);
      throw new Error(insertError?.message || 'Something went wrong. Please try again.');
    }

    createMemberSession(createdMember.id);
    const memberUser = {
      id: createdMember.id,
      email: createdMember.email,
      name: createdMember.name,
      role: 'member'
    };
    setUser(memberUser);
    setRole('MEMBER');
    setMemberProfile(createdMember);
    return createdMember;
  };

  const refreshMemberProfile = async () => {
    if (!user || user.role !== 'member') return;
    try {
      const member = await getCurrentMember(supabase);
      if (member) {
        setMemberProfile(member);
      }
    } catch (e) {
      console.warn('Could not refresh member profile:', e);
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setRole(null);
    setMemberProfile(null);
    try {
      sessionStorage.removeItem('kinesis_redirect_after_login');
      sessionStorage.removeItem('kinesis_auth_message');
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        memberProfile,
        loading,
        login,
        register,
        refreshMemberProfile,
        revalidateSession: restoreSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
