import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';

const router = Router();

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
        role: 'Team Member',
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
router.patch('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { name, role, avatar_url } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

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
