// Re-export Supabase client and status helper from backend services
export {
  supabase,
  isSupabaseConfigured,
  localStore
} from '@backend/services/supabaseClient.js';
