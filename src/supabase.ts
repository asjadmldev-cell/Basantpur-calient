import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
// A production build never silently falls back to per-device storage.
export const cloudConfigurationError = (!url || !key) && import.meta.env.PROD
  ? 'Cloud connection is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel, then redeploy.'
  : Boolean(url) !== Boolean(key) ? 'Set both Supabase environment variables, then restart the app.'
  : key && !key.startsWith('sb_publishable_') ? 'Use a Supabase publishable key, never a secret or service-role key.' : '';
export const supabase = url && key && !cloudConfigurationError
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
