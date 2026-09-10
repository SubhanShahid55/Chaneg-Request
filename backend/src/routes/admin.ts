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

  const origin = req.headers.origin || (typeof req.headers.referer === 'string' ? new URL(req.headers.referer).origin : null);
  const appBaseUrl = origin && (config.corsOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1'))
    ? origin
    : config.appUrl;

  const invitationData = { name, role, job_title: jobTitle };
  const useBrandedEmail = Boolean(config.resendApiKey && config.resendApiKey !== 're_your_placeholder_key');
  let invitation;
  let emailSent = false;
  let rateLimited = false;

  try {
    if (useBrandedEmail) {
      invitation = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { data: invitationData, redirectTo: `${appBaseUrl}/accept-invite` },
      });
    } else {
      invitation = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: invitationData,
        redirectTo: `${appBaseUrl}/accept-invite`,
      });
      // Detect built-in Supabase SMTP rate limit
      const inviteErr = invitation.error;
      if (
        inviteErr &&
        (inviteErr.message.toLowerCase().includes('rate limit') ||
         inviteErr.status === 429 ||
         (inviteErr as { code?: string }).code === 'over_email_send_rate_limit')
      ) {
        console.warn('Supabase email rate limit encountered; falling back to generateLink without SMTP.');
        rateLimited = true;
        invitation = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { data: invitationData, redirectTo: `${appBaseUrl}/accept-invite` },
        });
      }
    }
  } catch (cause) {
    console.error('Admin invitation provider error:', cause);
    res.status(502).json({ error: 'The invitation service is unavailable. Check the Supabase Auth email configuration.' });
    return;
  }

  let created = invitation.data;
  const createError = invitation.error;
  if (createError || !created?.user) {
    const providerMessage = createError?.message || 'Unknown invitation error';
    const normalizedMessage = providerMessage.toLowerCase();
    console.error('Admin invitation rejected:', providerMessage);
    if (
      normalizedMessage.includes('already') ||
      normalizedMessage.includes('registered') ||
      (createError as { code?: string })?.code === 'email_exists'
    ) {
      res.status(409).json({ error: 'A user with this email already exists. Use a different email address.' });
      return;
    }
    if (normalizedMessage.includes('redirect') || normalizedMessage.includes('url')) {
      res.status(400).json({ error: `Supabase rejected the invitation redirect URL (${appBaseUrl}/accept-invite). Add this URL to Supabase Auth redirect URLs.` });
      return;
    }
    // Fallback if rate limit caught here
    if (
      normalizedMessage.includes('rate limit') ||
      normalizedMessage.includes('over_email_send_rate_limit') ||
      createError?.status === 429
    ) {
      try {
        const fallback = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { data: invitationData, redirectTo: `${appBaseUrl}/accept-invite` },
        });
        if (fallback.data?.user) {
          invitation = fallback;
          created = fallback.data;
          rateLimited = true;
        } else {
          res.status(429).json({ error: 'Email rate limit exceeded. Please try again later or configure a custom SMTP provider.' });
          return;
        }
      } catch {
        res.status(429).json({ error: 'Email rate limit exceeded. Please try again later or configure a custom SMTP provider.' });
        return;
      }
    } else {
      res.status(400).json({ error: `Unable to send the invitation: ${providerMessage}` });
      return;
    }
  }

  const profilePayload = {
    id: created.user.id,
    email,
    name,
    role,
    is_active: true,
    avatar_url: null,
    job_title: jobTitle,
  };
  let { data: profile, error: profileError } = await supabaseAdmin.from('profiles').upsert(profilePayload).select().single();

  // Keep invitations compatible with deployments that have not applied the job title migration yet.
  if (profileError?.message.toLowerCase().includes('job_title') && profileError.message.toLowerCase().includes('column')) {
    const { job_title: _jobTitle, ...legacyProfilePayload } = profilePayload;
    ({ data: profile, error: profileError } = await supabaseAdmin.from('profiles').upsert(legacyProfilePayload).select().single());
  }

  if (profileError || !profile) {
    console.error('Profile creation failed after invitation:', profileError?.message || 'No profile returned');
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    res.status(500).json({ error: 'User registration could not be completed. Apply the latest Supabase migrations and try again.' });
    return;
  }

  const invitationLink = (created as { properties?: { action_link?: string } })?.properties?.action_link;
  if (useBrandedEmail && invitationLink) {
    try {
      await sendInvitationEmail(email, name, jobTitle, invitationLink);
      emailSent = true;
    } catch (emailError) {
      console.error('Invitation email delivery failed:', emailError);
      emailSent = false;
    }
  } else if (!rateLimited && !useBrandedEmail) {
    emailSent = true;
  }

  res.status(201).json({
    user: await presentProfile(profile),
    invitation_link: invitationLink,
    email_sent: emailSent,
    rate_limited: rateLimited,
  });
});

router.post('/users/:id/resend-invite', async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !authUser.user?.email) { res.status(404).json({ error: 'User not found.' }); return; }
  if (authUser.user.email_confirmed_at) { res.status(400).json({ error: 'This user has already accepted their invitation.' }); return; }

  const origin = req.headers.origin || (typeof req.headers.referer === 'string' ? new URL(req.headers.referer).origin : null);
  const appBaseUrl = origin && (config.corsOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1'))
    ? origin
    : config.appUrl;

  const profile = await supabaseAdmin.from('profiles').select('name, job_title').eq('id', userId).single();
  const invitation = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: authUser.user.email,
    options: { data: authUser.user.user_metadata, redirectTo: `${appBaseUrl}/accept-invite` },
  });
  const link = (invitation.data as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (invitation.error || !link) {
    res.status(502).json({ error: 'The invitation could not be regenerated.' });
    return;
  }

  let emailSent = false;
  if (config.resendApiKey && config.resendApiKey !== 're_your_placeholder_key') {
    try {
      await sendInvitationEmail(authUser.user.email, profile.data?.name || authUser.user.email, profile.data?.job_title || null, link);
      emailSent = true;
    } catch (cause) {
      console.error('Resend email delivery failed:', cause);
    }
  }

  res.json({
    success: true,
    email_sent: emailSent,
    invitation_link: link,
    message: emailSent
      ? `Invitation resent to ${authUser.user.email}.`
      : `Invitation link generated for ${authUser.user.email}.`,
  });
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