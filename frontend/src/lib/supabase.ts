import { createClient, type Session } from '@supabase/supabase-js';

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase browser configuration is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the frontend environment, then restart the dev server.');
    }
    browserClient = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  }
  return browserClient;
}

export async function consumeAuthCallback(): Promise<Session> {
  const callbackParams = new URLSearchParams(window.location.search);
  const callbackError = callbackParams.get('error_code') || callbackParams.get('error');
  if (callbackError === 'otp_expired') {
    throw new Error('This invitation link has expired or was already used. Ask an administrator to resend the invitation.');
  }

  const client = getSupabaseBrowserClient();
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error || !data.session) throw new Error('This authentication link is invalid or expired.');
    return data.session;
  }
  const code = callbackParams.get('code');
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw new Error('This authentication link is invalid or expired.');
    return data.session;
  }
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error('This authentication link is invalid or expired.');
  return data.session;
}