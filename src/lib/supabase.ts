import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://qaolvrcclqsmxtlzfvoq.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_usAyLlXmFO0s77Y9VIOlMQ_UCwuz0Q1';

const getInitialUrl = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('swe_supabase_url');
    if (stored && stored.trim().startsWith('https://')) return stored.trim();
  }
  return (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
};

const getInitialKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('swe_supabase_key');
    if (stored && stored.trim().length > 10) return stored.trim();
  }
  return (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY).trim();
};

let currentUrl = getInitialUrl();
let currentKey = getInitialKey();

export let isSupabaseConfigured: boolean = Boolean(
  currentUrl &&
  currentKey &&
  currentUrl.startsWith('https://') &&
  !currentUrl.includes('placeholder') &&
  !currentKey.includes('placeholder') &&
  currentUrl !== 'https://your-project.supabase.co'
);

export let supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? currentUrl : DEFAULT_SUPABASE_URL,
  isSupabaseConfigured ? currentKey : DEFAULT_SUPABASE_KEY,
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
  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem('swe_supabase_url');
    const storedKey = localStorage.getItem('swe_supabase_key');
    if (
      storedUrl &&
      storedKey &&
      storedUrl.startsWith('https://') &&
      !storedUrl.includes('placeholder') &&
      !storedKey.includes('placeholder') &&
      storedUrl !== 'https://your-project.supabase.co'
    ) {
      return true;
    }
  }
  return Boolean(
    currentUrl &&
    currentKey &&
    currentUrl.startsWith('https://') &&
    !currentUrl.includes('placeholder') &&
    !currentKey.includes('placeholder') &&
    currentUrl !== 'https://your-project.supabase.co'
  );
}

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
      isSupabaseConfigured = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('swe_supabase_url', cleanUrl);
        localStorage.setItem('swe_supabase_key', cleanKey);
        window.dispatchEvent(new CustomEvent('supabase-configured', { detail: { configured: true } }));
      }
      supabase = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return { success: true, message: 'Supabase client connected successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to initialize' };
    }
  }

  isSupabaseConfigured = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('swe_supabase_url');
    localStorage.removeItem('swe_supabase_key');
  }
  return { success: false, message: 'Invalid URL or Key provided' };
}

// Auto-sync server-configured Supabase credentials on client startup
if (typeof window !== 'undefined') {
  fetch('/api/supabase/config')
    .then(res => res.json())
    .then(data => {
      if (data?.configured && data?.url && data?.key) {
        reconfigureSupabaseClient(data.url, data.key);
      }
    })
    .catch(() => {});
}
