import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getMemberById } from '@backend/services/memberService.js';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'MEMBER' or 'ADMIN'
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session) => {
    if (!session) {
      setUser(null);
      setRole(null);
      setMemberProfile(null);
      setLoading(false);
      return;
    }

    const authUser = session.user;
    setUser(authUser);

    // Simple role check: if email ends with @kinesis.admin, it's admin
    if (authUser.email?.endsWith('@kinesis.admin.com')) {
      setRole('ADMIN');
      setLoading(false);
    } else {
      setRole('MEMBER');
      // In a real app we'd query by authUser.id mapped to members table.
      // For this hackathon, we assume member profile is fetched by some logic
      // Since member doesn't have auth_id in schema yet, we can map by email.
      try {
        const { data, error } = await supabase.from('members').select('*').eq('email', authUser.email).single();
        if (data) {
          setMemberProfile(data);
        }
      } catch (err) {
        console.error("Error fetching member profile", err);
      }
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (name, email, phone, password) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;

    // Create corresponding member in the database
    const start = new Date();
    const expiry = new Date();
    expiry.setFullYear(start.getFullYear() + 1);
    
    const { error: dbError } = await supabase.from('members').insert([{
      name,
      email,
      phone: phone || null,
      plan_id: 1, // Defaulting to Gold or standard plan for hackathon simplicity
      start_date: start.toISOString().split('T')[0],
      expiry_date: expiry.toISOString().split('T')[0],
      status: 'active'
    }]);
    if (dbError) throw dbError;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, role, memberProfile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
