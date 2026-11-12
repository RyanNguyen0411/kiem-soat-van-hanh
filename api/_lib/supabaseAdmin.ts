import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readRequiredServerEnv } from './env.js';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';

/**
 * Server-side Supabase Admin client (uses SUPABASE_SERVICE_ROLE_KEY).
 * Targets testing project `ghn-incident-center-dev` (Sydney) via Vercel Env.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = readRequiredServerEnv('SUPABASE_URL');
  const serviceRoleKey = readRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!cachedClient || cachedUrl !== url) {
    cachedClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    cachedUrl = url;
  }

  return cachedClient;
}
