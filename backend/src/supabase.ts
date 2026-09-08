import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { createAdminClient, createContextClient } from '@supabase/server/core';
import { SupabaseClient } from '@supabase/supabase-js';

// Admin client — bypasses RLS, used by Express route handlers
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
// Ensure env variables are loaded
import './config.js';

// Admin client — bypasses RLS, used by Express route handlers for system actions
export const supabaseAdmin: SupabaseClient = createAdminClient();

// Per-request client — uses the user's access token, respects RLS
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  return createContextClient({
    auth: { token: accessToken },
  });
}
