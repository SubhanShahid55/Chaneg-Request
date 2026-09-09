import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
// Admin client — bypasses RLS, used by Express route handlers
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
export const supabasePublic = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });
// Per-request client — uses the user's access token, respects RLS
export function createUserClient(accessToken) {
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
    });
}
export async function presentProfile(profile) {
    if (!profile.avatar_url || profile.avatar_url.startsWith('http'))
        return profile;
    const { data } = await supabaseAdmin.storage.from('profile-pictures').createSignedUrl(profile.avatar_url, 3600);
    return { ...profile, avatar_url: data?.signedUrl || null };
}
//# sourceMappingURL=supabase.js.map