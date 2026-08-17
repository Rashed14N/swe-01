import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project Supabase Credentials
export const DEFAULT_SUPABASE_URL = 'https://aasktchpxsxxanfkkrxx.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_usAyLlXmFO0s77Y9VIOlMQ_UCwuz0Q1';

const getInitialUrl = (): string => {
  const envUrl = (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  )?.trim();
  return envUrl || DEFAULT_SUPABASE_URL;
};

const getInitialKey = (): string => {
  const envKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY
  )?.trim();
  return envKey || DEFAULT_SUPABASE_KEY;
};

let currentUrl = getInitialUrl();
let currentKey = getInitialKey();

console.log('[Supabase] Initialized with URL:', currentUrl);

export let supabase: SupabaseClient = createClient(
  currentUrl,
  currentKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function getSupabase(): SupabaseClient {
  return supabase;
}

export function checkIsSupabaseConfigured(): boolean {
  return Boolean(
    currentUrl &&
    currentKey &&
    currentUrl.startsWith('https://') &&
    !currentUrl.includes('placeholder') &&
    !currentKey.includes('placeholder')
  );
}

export const isSupabaseConfigured = checkIsSupabaseConfigured();

export function reconfigureSupabaseClient(url: string, key: string): { success: boolean; message: string } {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  if (
    cleanUrl &&
    cleanKey &&
    cleanUrl.startsWith('https://') &&
    !cleanUrl.includes('placeholder') &&
    !cleanKey.includes('placeholder')
  ) {
    try {
      currentUrl = cleanUrl;
      currentKey = cleanKey;
      supabase = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      console.log('[Supabase] Reconfigured with URL:', currentUrl);
      return { success: true, message: 'Supabase client updated successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to initialize' };
    }
  }

  return { success: false, message: 'Invalid URL or Key provided' };
}
