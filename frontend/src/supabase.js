// Re-export Supabase client and status helper from backend services
export {
  supabase,
  isSupabaseConfigured,
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
  localStore
} from '@backend/services/supabaseClient.js';
