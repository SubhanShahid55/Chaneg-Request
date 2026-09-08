import { createAdminClient, createContextClient } from '@supabase/server/core';
// Ensure env variables are loaded
import './config.js';
// Admin client — bypasses RLS, used by Express route handlers for system actions
export const supabaseAdmin = createAdminClient();
// Per-request client — uses the user's access token, respects RLS
export function createUserClient(accessToken) {
    return createContextClient({
        auth: { token: accessToken },
    });
}
//# sourceMappingURL=supabase.js.map