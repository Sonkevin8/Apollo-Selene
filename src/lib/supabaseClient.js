import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const SUPABASE_AUTH_STORAGE_KEY = 'apollo-selene-auth';
export const EVENTS_TABLE = 'events';
export const EVENT_GUESTS_TABLE = 'event_guests';
export const EVENT_ATTENDANCE_TABLE = 'event_attendance';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const getAuthConfig = () => {
  if (typeof window === 'undefined') {
    return {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
    };
  }

  return {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  };
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: getAuthConfig(),
    })
  : null;
