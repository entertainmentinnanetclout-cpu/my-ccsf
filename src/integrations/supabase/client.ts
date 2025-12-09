import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a placeholder client if env vars are missing (for initial load)
const createSupabaseClient = (): SupabaseClient => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not yet available. Please refresh the page.');
    // Return a minimal client that won't crash the app
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false }
    });
  }
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const supabase = createSupabaseClient();
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
