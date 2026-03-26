import { createClient } from '@supabase/supabase-js';
import config from './index.js';

// Client for authenticated user operations (respects RLS)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Admin client that bypasses RLS (for server-side operations)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabase;
