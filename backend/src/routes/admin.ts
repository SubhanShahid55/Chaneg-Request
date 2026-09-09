import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../supabase.js';
import { config } from '../config.js';
import { sendInvitationEmail } from '../services/email.js';

const router = Router();
const allowedImageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').order('name', { ascending: true });
  if (error) {
    res.status(500).json({ error: 'Unable to load users.' });
    return;
  }
  res.json({ users: data || [] });
});

router.post('/users', async (req: Request, res: Response): Promise<void> => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = req.body?.role === 'admin' ? 'admin' : 'standard';
  const jobTitle = typeof req.body?.job_title === 'string' ? req.body.job_title.trim().slice(0, 100) : null;
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'Enter a full name and a valid email address.' });
    return;
  }

  const invitationData = { name, role, job_title: jobTitle };
  const useBrandedEmail = config.resendApiKey !== 're_your_placeholder_key';
  const invitation = useBrandedEmail
    ? await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email, options: { data: invitationData, redirectTo: `${config.appUrl}/login` } })
    : await supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: invitationData, redirectTo: `${config.appUrl}/login` });
  const created = invitation.data;
  const createError = invitation.error;
  if (createError || !created.user) {
    const duplicate = createError?.message.toLowerCase().includes('already');
    res.status(duplicate ? 409 : 400).json({ error: duplicate ? 'A user with this email already exists.' : 'Unable to register this user.' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: created.user.id,
    email,
    name,
    role,
    is_active: true,
    avatar_url: null,
    job_title: jobTitle,
  }).select().single();
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    res.status(500).json({ error: 'User registration could not be completed.' });
    return;
  }
  const invitationLink = useBrandedEmail
    ? (created as { properties?: { action_link?: string } }).properties?.action_link
    : undefined;
  if (invitationLink) {
    try {
      await sendInvitationEmail(email, name, jobTitle, invitationLink);
    } catch (emailError) {
      await supabaseAdmin.from('profiles').delete().eq('id', created.user.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      console.error('Invitation email failed:', emailError);
      res.status(502).json({ error: 'The invitation was not sent. Check the email service configuration and try again.' });
      return;
    }
  }
  res.status(201).json({ user: profile });
});

router.patch('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const updates: Record<string, unknown> = {};
  if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
  if (req.body?.role === 'admin' || req.body?.role === 'standard') updates.role = req.body.role;
  if (typeof req.body?.is_active === 'boolean') updates.is_active = req.body.is_active;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid user changes were supplied.' });
    return;
  }
  const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', req.params.id).select().single();
  if (error) {
    res.status(400).json({ error: 'Unable to update this user.' });
    return;
  }
  res.json({ user: data });
});

router.post('/users/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    res.status(400).json({ error: 'Use a JPG, PNG, or WebP image.' });
    return;
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: 'Profile pictures must be 5 MB or smaller.' });
    return;
  }
  const extension = allowedImageTypes.get(contentType);
  if (!extension) {
    res.status(400).json({ error: 'Unsupported image format.' });
    return;
  }
  const path = `${req.params.id}/${crypto.randomUUID()}.${extension}`;
  const { data: current } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', req.params.id).single();
  const { error: uploadError } = await supabaseAdmin.storage.from('profile-pictures').upload(path, buffer, { contentType, upsert: false });
  if (uploadError) {
    res.status(400).json({ error: 'The profile picture could not be uploaded.' });
    return;
  }
  const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: path }).eq('id', req.params.id).select().single();
  if (error) {
    await supabaseAdmin.storage.from('profile-pictures').remove([path]);
    res.status(500).json({ error: 'The profile picture could not be saved.' });
    return;
  }
  if (current?.avatar_url) await supabaseAdmin.storage.from('profile-pictures').remove([current.avatar_url]);
  res.json({ user: data });
});

router.delete('/users/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  const { data: current } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', req.params.id).single();
  if (current?.avatar_url) await supabaseAdmin.storage.from('profile-pictures').remove([current.avatar_url]);
  const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: null }).eq('id', req.params.id).select().single();
  if (error) {
    res.status(400).json({ error: 'The profile picture could not be removed.' });
    return;
  }
  res.json({ user: data });
});

export default router;