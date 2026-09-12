import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabasePublic, presentProfile } from '../supabase.js';
import { removeAvatar, uploadAvatar } from '../services/avatar.js';
import { config } from '../config.js';

const router = Router();
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token : '';
  if (!refreshToken) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return;
  }
  const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return;
  }
  res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  await supabasePublic.auth.resetPasswordForEmail(email, { redirectTo: `${config.appUrl}/reset-password` });
  res.json({ success: true });
});

/** POST /auth/password - finish an invitation by setting the user's password. */
router.post('/password', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
  const jobTitle = typeof req.body?.job_title === 'string' ? req.body.job_title.trim().slice(0, 100) : '';
  if (!token) {
    res.status(401).json({ error: 'Your invitation session is missing or expired.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Your password must be at least 8 characters.' });
    return;
  }
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Your invitation session has expired. Ask an administrator to resend the invitation.' });
    return;
  }
  const metadata = { ...authData.user.user_metadata, ...(name ? { name } : {}), ...(jobTitle ? { job_title: jobTitle } : {}) };
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, { password, user_metadata: metadata });
  if (error || !data.user) {
    console.error('Invitation password update failed:', error?.message || 'No user returned');
    res.status(400).json({ error: error?.message || 'We could not set your password. Please request a new invitation.' });
    return;
  }
  const profileUpdates: Record<string, string> = {};
  if (name) profileUpdates.name = name;
  if (jobTitle) profileUpdates.job_title = jobTitle;
  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', authData.user.id);
    if (profileError && !profileError.message.toLowerCase().includes('job_title')) console.error('Invitation profile update failed:', profileError.message);
  }
  res.json({ success: true });
});

router.post('/update-password', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!token) {
    res.status(401).json({ error: 'Your password reset session is missing or expired.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Your password must be at least 8 characters.' });
    return;
  }
  const { data: sessionUser, error: sessionError } = await supabaseAdmin.auth.getUser(token);
  if (sessionError || !sessionUser.user) {
    res.status(401).json({ error: 'Your password reset session is missing or expired.' });
    return;
  }
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(sessionUser.user.id, { password });
  if (error || !data.user) {
    res.status(400).json({ error: 'We could not update your password. Please request a new reset link.' });
    return;
  }
  res.json({ success: true });
});

/** POST /auth/login - sign in with Supabase Auth credentials. */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
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

  const { data: clientUser } = await supabaseAdmin
    .from('client_users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (clientUser) {
    if (!clientUser.is_active) {
      res.status(403).json({ error: 'Your account is inactive. Contact support.' });
      return;
    }
    const profile = await presentProfile(clientUser);
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, profile: { ...profile, role: 'client' } });
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
  res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, profile: await presentProfile(profile) });
});

/**
 * POST /auth/session
 * Validate a Supabase access token and return the matching profile.
 */
router.post('/session', async (req: Request, res: Response): Promise<void> => {
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

  const { data: clientUser } = await supabaseAdmin
    .from('client_users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (clientUser) {
    if (!clientUser.is_active) {
      res.status(403).json({ error: 'Your account is inactive. Contact support.' });
      return;
    }
    const profile = await presentProfile(clientUser);
    res.json({ profile: { ...profile, role: 'client' } });
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

    res.json({ profile: await presentProfile(newProfile) });
    return;
  }

  if (profileError) {
    res.status(500).json({ error: 'Failed to fetch profile' });
    return;
  }

  res.json({ profile: await presentProfile(profile) });
});

/**
 * PATCH /profile
 * Update the signed-in user's profile.
 */
router.patch('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { name, job_title } = req.body;

  const updates: Record<string, unknown> = {};
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof job_title === 'string') updates.job_title = job_title.trim().slice(0, 100) || null;

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

  res.json({ profile: await presentProfile(data) });
});

router.post('/avatar', async (req: Request, res: Response): Promise<void> => {
  if (!req.userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try {
    const { data: current } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', req.userId).single();
    const uploaded = await uploadAvatar(req.userId, typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '');
    const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: uploaded.path, avatar_path: uploaded.path, avatar_mime_type: uploaded.contentType, avatar_size_bytes: uploaded.size, avatar_updated_at: new Date().toISOString() }).eq('id', req.userId).select().single();
    if (error) { await removeAvatar(uploaded.path); res.status(500).json({ error: 'The profile picture could not be saved.' }); return; }
    await removeAvatar(current?.avatar_url);
    res.json({ profile: await presentProfile(data) });
  } catch (cause) {
    res.status(400).json({ error: cause instanceof Error ? cause.message : 'The profile picture could not be uploaded.' });
  }
});

router.delete('/avatar', async (req: Request, res: Response): Promise<void> => {
  if (!req.userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { data: current } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', req.userId).single();
  const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: null }).eq('id', req.userId).select().single();
  if (error) { res.status(400).json({ error: 'The profile picture could not be removed.' }); return; }
  await removeAvatar(current?.avatar_url);
  res.json({ profile: await presentProfile(data) });
});

export default router;
