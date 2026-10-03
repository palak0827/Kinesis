import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import {
  ADMIN_CREDENTIALS,
  getStoredSession,
  createMemberSession,
  createAdminSession,
  clearSession,
  getCurrentMember
} from './services/sessionService.js';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'MEMBER' or 'ADMIN'
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

      if (session.type === 'admin') {
        setUser({
          id: 'admin',
          email: ADMIN_CREDENTIALS.email,
          name: 'Club Administrator',
          role: 'admin'
        });
        setRole('ADMIN');
        setMemberProfile(null);
        setLoading(false);
        return;
      }

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
          // Member no longer exists in database
          clearSession();
          setUser(null);
          setRole(null);
          setMemberProfile(null);
        }
      }

      setLoading(false);
    }

    restoreSession();
  }, []);

  /**
   * Prototype Login using PostgreSQL members table or centralized admin credentials
   */
  const login = async (email, password, isAdminMode = false) => {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Check centralized Admin credentials
    const matchesAdmin =
      normalizedEmail === ADMIN_CREDENTIALS.email.toLowerCase() &&
      password === ADMIN_CREDENTIALS.password;

    if (isAdminMode || matchesAdmin) {
      if (matchesAdmin) {
        createAdminSession();
        const adminUser = {
          id: 'admin',
          email: ADMIN_CREDENTIALS.email,
          name: 'Club Administrator',
          role: 'admin'
        };
        setUser(adminUser);
        setRole('ADMIN');
        setMemberProfile(null);
        return { type: 'admin', user: adminUser };
      }
      if (isAdminMode) {
        throw new Error('Account not found or credentials are incorrect.');
      }
    }

    if (!supabase) {
      throw new Error('Database connection is not available.');
    }

    // 2. Query member directly from Supabase members table (Single member query)
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
      console.error('Supabase member login error:', error);
      throw new Error('Something went wrong. Please try again.');
    }

    if (!member || member.password !== password) {
      throw new Error('Account not found or credentials are incorrect.');
    }

    // Check if member has admin role in members table
    if (member.role === 'admin') {
      createAdminSession();
      const adminUser = {
        id: member.id,
        email: member.email,
        name: member.name,
        role: 'admin'
      };
      setUser(adminUser);
      setRole('ADMIN');
      setMemberProfile(member);
      return { type: 'admin', user: adminUser };
    }

    // Regular member login
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
    return { type: 'member', member };
  };

  /**
   * Prototype Registration inserting directly into PostgreSQL members table
   */
  const register = async ({ name, email, phone, plan_id, password }) => {
    if (!supabase) {
      throw new Error('Database connection is not available.');
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

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
    exp.setFullYear(exp.getFullYear() + 1);
    const expiryDate = exp.toISOString().split('T')[0];

    const newRecord = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      plan_id: Number(plan_id),
      password: password,
      status: 'active',
      role: 'member',
      start_date: startDate,
      expiry_date: expiryDate,
      created_at: new Date().toISOString()
    };

    const { data: createdMember, error: insertError } = await supabase
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

    if (insertError) {
      console.error('Member insert error:', insertError);
      throw new Error('Something went wrong. Please try again.');
    }

    // Automatically create member session & update state
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

  /**
   * Prototype Logout: clears local session and resets state
   */
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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
