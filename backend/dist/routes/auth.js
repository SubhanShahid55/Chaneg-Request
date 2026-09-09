import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
const router = Router();
/** POST /auth/login - sign in with Supabase Auth credentials. */
router.post('/login', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
        res.status(400).json({ error: 'Enter your email address and password.' });
        return;
    }
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
        res.status(401).json({ error: 'The email or password is incorrect.' });
        return;
    }
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
    if (profileError || !profile) {
        res.status(403).json({ error: 'Your account profile is not available.' });
        return;
    }
    if (!profile.is_active) {
        res.status(403).json({ error: 'Your account is inactive. Contact an administrator.' });
        return;
    }
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, profile });
});
/**
 * POST /auth/session
 * Validate a Supabase access token and return the matching profile.
 */
router.post('/session', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ error: 'Missing access token' });
        return;
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
    }
    // Fetch or create the profile row
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist yet — create one
        const { data: newProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            role: 'standard',
            is_active: true,
            avatar_url: null,
        })
            .select()
            .single();
        if (createError) {
            res.status(500).json({ error: 'Failed to create profile' });
            return;
        }
        res.json({ profile: newProfile });
        return;
    }
    if (profileError) {
        res.status(500).json({ error: 'Failed to fetch profile' });
        return;
    }
    res.json({ profile });
});
/**
 * PATCH /profile
 * Update the signed-in user's profile.
 */
router.patch('/', async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    const { name, avatar_url } = req.body;
    const updates = {};
    if (name !== undefined)
        updates.name = name;
    if (avatar_url !== undefined)
        updates.avatar_url = avatar_url;
    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
    }
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: 'Failed to update profile' });
        return;
    }
    res.json({ profile: data });
});
export default router;
//# sourceMappingURL=auth.js.map