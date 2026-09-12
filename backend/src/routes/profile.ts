import { Router, Request, Response } from 'express';
import { supabaseAdmin, presentProfile } from '../supabase.js';
import { removeAvatar, uploadAvatar } from '../services/avatar.js';

const router = Router();

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

/**
 * POST /profile/avatar
 * Upload user avatar.
 */
router.post('/avatar', async (req: Request, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const { data: current } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('id', req.userId)
      .single();
    const uploaded = await uploadAvatar(req.userId, typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '');
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        avatar_url: uploaded.path,
        avatar_path: uploaded.path,
        avatar_mime_type: uploaded.contentType,
        avatar_size_bytes: uploaded.size,
        avatar_updated_at: new Date().toISOString(),
      })
      .eq('id', req.userId)
      .select()
      .single();

    if (error) {
      await removeAvatar(uploaded.path);
      res.status(500).json({ error: 'The profile picture could not be saved.' });
      return;
    }
    await removeAvatar(current?.avatar_url);
    res.json({ profile: await presentProfile(data) });
  } catch (cause) {
    res.status(400).json({ error: cause instanceof Error ? cause.message : 'The profile picture could not be uploaded.' });
  }
});

/**
 * DELETE /profile/avatar
 * Remove user avatar.
 */
router.delete('/avatar', async (req: Request, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { data: current } = await supabaseAdmin
    .from('profiles')
    .select('avatar_url')
    .eq('id', req.userId)
    .single();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', req.userId)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: 'The profile picture could not be removed.' });
    return;
  }
  await removeAvatar(current?.avatar_url);
  res.json({ profile: await presentProfile(data) });
});

export default router;

