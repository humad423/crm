import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that it looks like a proper HTTP/HTTPS URL.
const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

if (!isValidUrl || !rawKey) {
  console.warn('Supabase credentials are not configured or are invalid. Using placeholders for build compilation.');
}

// Initialize the Supabase client with explicit long-lived session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token' // standard key for long-term storage
  }
});
