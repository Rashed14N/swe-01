import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabasePublishableKey !== 'your-publishable-or-anon-key'
);

/**
 * Shared Supabase Client instance.
 * Gracefully creates a client when configured, or a dummy client to prevent runtime crashes during initial setup.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabasePublishableKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
