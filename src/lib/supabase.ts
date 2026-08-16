import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getInitialUrl = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('swe_supabase_url');
    if (stored) return stored.trim();
  }
  return (import.meta.env.VITE_SUPABASE_URL || '').trim();
};

const getInitialKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('swe_supabase_key');
    if (stored) return stored.trim();
  }
  return (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
};

let currentUrl = getInitialUrl();
let currentKey = getInitialKey();

export let isSupabaseConfigured: boolean = Boolean(
  currentUrl &&
  currentKey &&
  currentUrl.startsWith('https://') &&
  !currentUrl.includes('placeholder') &&
  !currentKey.includes('placeholder') &&
  currentUrl !== 'https://your-project.supabase.co' &&
  currentKey !== 'your-publishable-or-anon-key'
);

export let supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? currentUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? currentKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

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


