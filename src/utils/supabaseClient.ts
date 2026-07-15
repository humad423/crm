import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that it looks like a proper HTTP/HTTPS URL. 
// During Next.js static page generation at build time, environment variables might not be defined or might contain placeholders.
const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

if (!isValidUrl || !rawKey) {
  console.warn('Supabase credentials are not configured or are invalid. Using placeholders for build compilation.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
