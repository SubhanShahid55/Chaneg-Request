import { verifyCredentials } from '@supabase/server/core';
/**
 * Auth middleware — validates the Supabase access token from the
 * Authorization header and attaches userId / userEmail to the request.
 */
export async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || null;
    const apikey = req.headers.apikey || null;
    const credentials = { token, apikey };
    const { data: auth, error } = await verifyCredentials(credentials, { auth: 'user' });
    if (error) {
        res.status(error.status || 401).json({ error: error.message });
        return;
    }
    // userClaims contains the decoded JWT payload
    req.userId = auth?.userClaims?.sub;
    req.userEmail = auth?.userClaims?.email;
    next();
}
//# sourceMappingURL=auth.js.map