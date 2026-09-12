import { Router, Request, Response } from 'express';
import { supabaseAdmin, presentProfile } from '../supabase.js';
import { calculateProjectRollup } from '../services/projectRollup.js';
import { uploadAttachment, getAttachmentSignedUrl } from '../services/attachments.js';

const router = Router();

// Middleware to ensure req.clientId exists (via requireClientAuth)
router.use((req, res, next) => {
  if (!req.clientId) {
    res.status(401).json({ error: 'Client authentication required.' });
    return;
  }
  next();
});

router.get('/project', async (req: Request, res: Response): Promise<void> => {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, description, scope_summary, agreed_budget, timeline_days')
    .eq('client_id', req.clientId)
    .single();

  if (error || !project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const [{ data: original }, { data: requests }] = await Promise.all([
    supabaseAdmin.from('project_deliverables').select('*').eq('project_id', project.id).order('id'),
    supabaseAdmin.from('change_requests').select('*').eq('project_id', project.id).eq('status', 'approved').order('created_at', { ascending: true }),
  ]);

  const approvedChanges = await Promise.all((requests || []).map(async (request) => {
    const { data: deliverables } = await supabaseAdmin.from('deliverables').select('*').eq('request_id', request.id);
    return { ...request, deliverables: deliverables || [] };
  }));

  res.json({
    project,
    rollup: calculateProjectRollup(original || [], approvedChanges, project.agreed_budget, project.timeline_days),
  });
});

router.get('/requests', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('change_requests')
    .select('id, reference_code, title, status, hours, hourly_rate, timeline_days, created_at, updated_at')
    .eq('client_id', req.clientId)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to fetch requests.' });
    return;
  }
  res.json({ requests: data || [] });
});

router.get('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  const { data: request, error } = await supabaseAdmin
    .from('change_requests')
    .select(`
      *,
      deliverables (*),
      exclusions (*),
      request_attachments (*)
    `)
    .eq('id', req.params.id)
    .eq('client_id', req.clientId)
    .single();

  if (error || !request) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }

  // Generate signed URLs for attachments
  if (request.request_attachments && request.request_attachments.length > 0) {
    request.request_attachments = await Promise.all(
      request.request_attachments.map(async (attachment: any) => {
        const signedUrl = await getAttachmentSignedUrl(attachment.file_path);
        return { ...attachment, signed_url: signedUrl };
      })
    );
  }

  res.json({ request });
});

router.post('/requests', async (req: Request, res: Response): Promise<void> => {
  const { title, client_quote, attachment } = req.body;
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'Title is required.' });
    return;
  }

  // Get user profile for logging
  const { data: clientUser } = await supabaseAdmin.from('client_users').select('name').eq('id', req.userId).single();

  // Reference code helper
  const { data: nextCode } = await supabaseAdmin.rpc('next_change_request_code');
  const code = nextCode || Math.floor(Math.random() * 10000);

  // Default project
  const { data: project } = await supabaseAdmin.from('projects').select('id').eq('client_id', req.clientId).single();

  const { data: request, error } = await supabaseAdmin.from('change_requests').insert({
    client_id: req.clientId,
    project_id: project?.id || null,
    title,
    client_quote: client_quote || null,
    source_channel: 'portal',
    priority: 'standard',
    status: 'draft',
    reference_code: `CR-${code}`,
  }).select().single();

  if (error || !request) {
    res.status(500).json({ error: 'Failed to create request.' });
    return;
  }

  if (attachment && typeof attachment.dataUrl === 'string' && typeof attachment.name === 'string') {
    try {
      await uploadAttachment(request.id, req.userId!, attachment.dataUrl, attachment.name);
    } catch (cause) {
      console.error('Attachment upload failed:', cause);
      // We don't fail the request creation, but we might want to log the error or return a warning
    }
  }

  // Log activity event
  await supabaseAdmin.from('activity_events').insert({
    request_id: request.id,
    event_type: 'request_created',
    actor_name: clientUser?.name || 'Client',
    event_data: { source: 'portal' },
  });

  res.status(201).json({ request });
});

router.post('/requests/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const { data: request, error } = await supabaseAdmin
    .from('change_requests')
    .select('id, status, reference_code, title, hourly_rate, clients(company_name, contact_name)')
    .eq('id', req.params.id)
    .eq('client_id', req.clientId)
    .single();

  if (error || !request) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }

  if (request.status !== 'awaiting_approval') {
    res.status(400).json({ error: 'Request is not awaiting approval.' });
    return;
  }

  const client = Array.isArray(request.clients) ? request.clients[0] : request.clients;
  const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const now = new Date().toISOString();

  await supabaseAdmin.from('change_requests').update({ status: 'approved', updated_at: now }).eq('id', request.id);

  await supabaseAdmin.from('approval_responses').insert({
    request_id: request.id,
    decision: 'approved',
    confirmation_code: confirmationCode,
    responded_at: now,
  });

  await supabaseAdmin.from('activity_events').insert({
    request_id: request.id,
    event_type: 'approved',
    event_data: {
      confirmation_code: confirmationCode,
      approved_by: client?.contact_name || 'Client',
      source: 'portal',
    },
    actor_name: client?.contact_name || 'Client',
    created_at: now,
  });

  res.json({ success: true, confirmation_code: confirmationCode });
});

router.post('/requests/:id/decline', async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body;
  const { data: request, error } = await supabaseAdmin
    .from('change_requests')
    .select('id, status, reference_code, title, clients(company_name, contact_name)')
    .eq('id', req.params.id)
    .eq('client_id', req.clientId)
    .single();

  if (error || !request) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }

  if (request.status !== 'awaiting_approval') {
    res.status(400).json({ error: 'Request is not awaiting approval.' });
    return;
  }

  const client = Array.isArray(request.clients) ? request.clients[0] : request.clients;
  const now = new Date().toISOString();

  await supabaseAdmin.from('change_requests').update({ status: 'declined', updated_at: now }).eq('id', request.id);

  await supabaseAdmin.from('approval_responses').insert({
    request_id: request.id,
    decision: 'declined',
    decline_reason: reason || null,
    responded_at: now,
  });

  await supabaseAdmin.from('activity_events').insert({
    request_id: request.id,
    event_type: 'declined',
    event_data: {
      decline_reason: reason || null,
      declined_by: client?.contact_name || 'Client',
      source: 'portal',
    },
    actor_name: client?.contact_name || 'Client',
    created_at: now,
  });

  res.json({ success: true });
});

export default router;
