import { Router, Request, Response } from 'express';
import { supabaseAdmin, presentProfile } from '../supabase.js';
import { config } from '../config.js';
import { sendInvitationEmail } from '../services/email.js';
import { removeAvatar, uploadAvatar } from '../services/avatar.js';

const router = Router();

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  const [{ data: profiles, error }, { data: authUsers, error: authError }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').order('name', { ascending: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error || authError) {
    res.status(500).json({ error: 'Unable to load users.' });
    return;
  }
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const users = await Promise.all((authUsers?.users || []).map(async (authUser) => {
    const profile = profileById.get(authUser.id) || { id: authUser.id, name: authUser.user_metadata?.name || '', role: 'standard', is_active: true, avatar_url: null, email: authUser.email || '' };
    return {
      ...(await presentProfile(profile)),
      email: profile.email || authUser.email || '',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || null,
      email_confirmed_at: authUser.email_confirmed_at || null,
      invite_status: profile.is_active ? (authUser.email_confirmed_at ? 'active' : 'invited') : 'inactive',
    };
  }));
  res.json({ users });
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
  const useBrandedEmail = Boolean(config.resendApiKey && config.resendApiKey !== 're_your_placeholder_key');
  let invitation;
  try {
    invitation = useBrandedEmail
      ? await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email, options: { data: invitationData, redirectTo: `${config.appUrl}/accept-invite` } })
      : await supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: invitationData, redirectTo: `${config.appUrl}/accept-invite` });
  } catch (cause) {
    console.error('Admin invitation provider error:', cause);
    res.status(502).json({ error: 'The invitation service is unavailable. Check the Supabase Auth email configuration.' });
    return;
  }
  const created = invitation.data;
  const createError = invitation.error;
  if (createError || !created.user) {
    const providerMessage = createError?.message || 'Unknown invitation error';
    const normalizedMessage = providerMessage.toLowerCase();
    console.error('Admin invitation rejected:', providerMessage);
    if (normalizedMessage.includes('already') || normalizedMessage.includes('registered')) {
      res.status(409).json({ error: 'A user with this email already exists. Use a different email address.' });
      return;
    }
    if (normalizedMessage.includes('redirect') || normalizedMessage.includes('url')) {
      res.status(400).json({ error: `Supabase rejected the invitation redirect URL (${config.appUrl}/accept-invite). Add this URL to Supabase Auth redirect URLs.` });
      return;
    }
    res.status(400).json({ error: `Unable to send the invitation: ${providerMessage}` });
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
  res.status(201).json({ user: await presentProfile(profile) });
});

router.post('/users/:id/resend-invite', async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !authUser.user?.email) { res.status(404).json({ error: 'User not found.' }); return; }
  if (authUser.user.email_confirmed_at) { res.status(400).json({ error: 'This user has already accepted their invitation.' }); return; }
  if (!config.resendApiKey || config.resendApiKey === 're_your_placeholder_key') {
    res.status(503).json({ error: 'Configure RESEND_API_KEY to resend an invitation to an existing user.' });
    return;
  }
  const profile = await supabaseAdmin.from('profiles').select('name, job_title').eq('id', userId).single();
  const invitation = await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email: authUser.user.email, options: { data: authUser.user.user_metadata, redirectTo: `${config.appUrl}/accept-invite` } });
  const link = (invitation.data as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (invitation.error || !link) { res.status(502).json({ error: 'The invitation could not be regenerated.' }); return; }
  try {
    await sendInvitationEmail(authUser.user.email, profile.data?.name || authUser.user.email, profile.data?.job_title || null, link);
  } catch {
    res.status(502).json({ error: 'The invitation email could not be sent.' });
    return;
  }
  res.json({ success: true });
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
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { data: current } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', userId).single();
  let uploaded: Awaited<ReturnType<typeof uploadAvatar>>;
  try { uploaded = await uploadAvatar(userId, typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : ''); } catch (cause) { res.status(400).json({ error: cause instanceof Error ? cause.message : 'The profile picture could not be uploaded.' }); return; }
  const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: uploaded.path, avatar_path: uploaded.path, avatar_mime_type: uploaded.contentType, avatar_size_bytes: uploaded.size, avatar_updated_at: new Date().toISOString() }).eq('id', userId).select().single();
  if (error) {
    await removeAvatar(uploaded.path);
    res.status(500).json({ error: 'The profile picture could not be saved.' });
    return;
  }
  await removeAvatar(current?.avatar_url);
  res.json({ user: await presentProfile(data) });
});

router.delete('/users/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  const { data: current } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', req.params.id).single();
  await removeAvatar(current?.avatar_url);
  const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: null }).eq('id', req.params.id).select().single();
  if (error) {
    res.status(400).json({ error: 'The profile picture could not be removed.' });
    return;
  }
  res.json({ user: await presentProfile(data) });
});

export default router;