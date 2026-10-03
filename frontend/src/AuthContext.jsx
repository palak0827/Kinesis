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
  useEffect(() => {
    async function restoreSession() {
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
        if (member) {
          setUser({
            id: member.id,
            email: member.email,
            name: member.name,
            role: member.role || 'member'
          });
          setRole(member.role === 'admin' ? 'ADMIN' : 'MEMBER');
          setMemberProfile(member);
        } else {
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
        }
        setLoading(false);
        return;
      }

      // 2. STAFF SESSION (Re-verify role & active status from database)
      if (session.type === 'staff') {
        try {
          if (session.email === ADMIN_CREDENTIALS.email || session.role === 'ADMIN') {
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

          // Check live staff roster to ensure role hasn't changed or been deactivated
          const staffList = await getStaffList();
          const staff = staffList.find(s => String(s.id) === String(session.staffId) || s.email.toLowerCase() === (session.email || '').toLowerCase());

          if (staff && staff.employment_status === 'ACTIVE') {
            const currentRole = normalizeStaffRole(staff.role);
            if (currentRole) {
              setUser({
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: currentRole.toLowerCase(),
                department: staff.department
              });
              setRole(currentRole);
              setMemberProfile(null);
              setLoading(false);
              return;
            }
          }

          // Inactive or unassigned role -> clear session
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
        } catch {
          // Fallback to cached session if network error
          setUser({
            id: session.staffId,
            email: session.email,
            name: session.name,
            role: (session.role || '').toLowerCase(),
            department: session.department
          });
          setRole(session.role);
          setMemberProfile(null);
        }
      }

      setLoading(false);
    }

    restoreSession();
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

    const normalizedEmail = (email || '').trim().toLowerCase();
    const isWalkIn = user_type === 'WALK_IN' || !plan_id;

    // Check email uniqueness
    const { data: existing, error: checkError } = await supabase
      .from('members')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError) {
      console.error('Email uniqueness check error:', checkError);
      throw new Error('Something went wrong. Please try again.');
    }

    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const startDate = new Date().toISOString().split('T')[0];
    const exp = new Date();
    if (isWalkIn) {
      exp.setFullYear(exp.getFullYear() + 10);
    } else {
      exp.setMonth(exp.getMonth() + Number(durationMonths || 12));
    }
    const expiryDate = exp.toISOString().split('T')[0];

    const newRecord = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
