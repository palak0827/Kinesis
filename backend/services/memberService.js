import { supabase, shouldUseSupabase, localStore } from './supabaseClient.js';

/**
 * Fetch all membership plans
 */
export async function getMembershipPlans() {
  if (shouldUseSupabase()) {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .order('id', { ascending: true });
    if (!error && data) return data;
  }
  return [...localStore.plans];
}

/**
 * Get all members with optional search query and status filter
 */
export async function getMembers(search = '', filterStatus = 'all') {
  let membersList = [];

  if (shouldUseSupabase()) {
    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          membership_plans (
            id,
            name,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .order('id', { ascending: false });

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getMembers error, falling back to local store:', err);
    }
  }

  // Local fallback
  membersList = localStore.members.map((m) => {
    const plan = localStore.plans.find((p) => p.id === Number(m.plan_id)) || null;
    return {
      ...m,
      membership_plans: plan
    };
  });

  if (filterStatus && filterStatus !== 'all') {
    membersList = membersList.filter((m) => m.status === filterStatus);
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    membersList = membersList.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q)
    );
  }

  return membersList.sort((a, b) => b.id - a.id);
}

/**
 * Get single member by ID
 */
export async function getMemberById(id) {
  const numId = Number(id);

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          membership_plans (
            id,
            name,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .eq('id', numId)
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getMemberById error:', err);
    }
  }

  const member = localStore.members.find((m) => m.id === numId);
  if (!member) return null;

  const plan = localStore.plans.find((p) => p.id === Number(member.plan_id)) || null;
  return {
    ...member,
    membership_plans: plan
  };
}

/**
 * Create a new member
 */
export async function createMember(memberData) {
  const planId = Number(memberData.plan_id) || 1;
  const startDate = memberData.start_date || new Date().toISOString().split('T')[0];
  
  // Expiry defaults to 1 year ahead
  let expiryDate = memberData.expiry_date;
  if (!expiryDate) {
    const exp = new Date(startDate);
    exp.setFullYear(exp.getFullYear() + 1);
    expiryDate = exp.toISOString().split('T')[0];
  }

  const newRecord = {
    name: memberData.name.trim(),
    email: memberData.email.trim(),
    phone: memberData.phone?.trim() || '',
    plan_id: planId,
    start_date: startDate,
    expiry_date: expiryDate,
    status: memberData.status || 'active',
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([newRecord])
        .select(`
          *,
          membership_plans (
            id,
            name,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase createMember error, using local:', err);
    }
  }

  const maxId = localStore.members.reduce((max, m) => Math.max(max, m.id), 0);
  const created = {
    id: maxId + 1,
    ...newRecord
  };
  localStore.members.unshift(created);
  localStore.saveMembers();

  const plan = localStore.plans.find((p) => p.id === planId) || null;
  return { ...created, membership_plans: plan };
}

/**
 * Update member details
 */
export async function updateMember(id, memberData) {
  const numId = Number(id);

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({
          ...memberData,
          plan_id: memberData.plan_id ? Number(memberData.plan_id) : undefined
        })
        .eq('id', numId)
        .select(`
          *,
          membership_plans (
            id,
            name,
            court_discount,
            shop_discount,
            bar_discount,
            daily_booking_limit
          )
        `)
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase updateMember error, using local:', err);
    }
  }

  const index = localStore.members.findIndex((m) => m.id === numId);
  if (index === -1) throw new Error('Member not found');

  localStore.members[index] = {
    ...localStore.members[index],
    ...memberData,
    plan_id: memberData.plan_id ? Number(memberData.plan_id) : localStore.members[index].plan_id
  };
  localStore.saveMembers();

  const plan = localStore.plans.find((p) => p.id === localStore.members[index].plan_id) || null;
  return { ...localStore.members[index], membership_plans: plan };
}

/**
 * Delete a member
 */
export async function deleteMember(id) {
  const numId = Number(id);

  if (shouldUseSupabase()) {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', numId);
      if (!error) return true;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase deleteMember error, using local:', err);
    }
  }

  const initialLen = localStore.members.length;
  localStore.members = localStore.members.filter((m) => m.id !== numId);
  // Also clean up any bookings for this member
  localStore.bookings = localStore.bookings.filter((b) => b.member_id !== numId);
  localStore.saveMembers();
  localStore.saveBookings();

  return localStore.members.length < initialLen;
}
