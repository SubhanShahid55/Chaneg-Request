import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
// Admin client — bypasses RLS, used by Express route handlers
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
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
//# sourceMappingURL=supabase.js.map