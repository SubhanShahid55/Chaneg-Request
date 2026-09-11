import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { validateTransition, TransitionError } from '../services/stateMachine.js';
import { sendApprovalEmail } from '../services/email.js';
import { generateApprovalToken } from '../utils/tokens.js';
import { buildCsv } from '../utils/csv.js';
import { config } from '../config.js';
import { getCached, invalidateCache, invalidateCachePattern, setCached } from '../services/cache.js';
import { calculateEstimate, normalizeDeliverables } from '../services/estimate.js';
import type { RequestStatus, CreateRequestBody, UpdateEstimateBody } from '../types.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getActorName(userId?: string): Promise<string> {
  if (!userId) return 'ChangeFlow';
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();
  return data?.name ?? 'System';
}

async function logActivity(
  requestId: string,
  eventType: string,
  eventData: Record<string, unknown>,
  actorName: string,
): Promise<void> {
  await supabaseAdmin.from('activity_events').insert({
    request_id: requestId,
    event_type: eventType,
    event_data: eventData,
    actor_name: actorName,
    created_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// GET /recent — Top 5 most recently updated
// ---------------------------------------------------------------------------

router.get('/recent', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('change_requests')
    .select('*, clients(company_name, contact_name)')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ data });
});

// ---------------------------------------------------------------------------
// GET /export — CSV download
// ---------------------------------------------------------------------------

router.get('/export', async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;

  let query = supabaseAdmin
    .from('change_requests')
    .select('reference_code, title, status, priority, hourly_rate, source_channel, created_at, clients(company_name, contact_name), deliverables(hours)');

  if (status === 'needs_review') {
    query = query.in('status', ['draft', 'pending', 'reviewing']);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`reference_code.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = (data ?? []).map((r: any) => {
    const hours = (r.deliverables || []).reduce((acc: number, d: any) => acc + Number(d.hours || 0), 0);
    const cost = hours * (Number(r.hourly_rate) || 0);
    return {
      reference_code: r.reference_code,
      title: r.title,
      company_name: r.clients?.company_name ?? '',
      contact_name: r.clients?.contact_name ?? '',
      status: r.status,
      priority: r.priority,
      hours,
      cost,
      source_channel: r.source_channel,
      created_at: r.created_at,
    };
  });

  const columns = [
    'reference_code',
    'title',
    'company_name',
    'contact_name',
    'status',
    'priority',
    'hours',
    'cost',
    'source_channel',
    'created_at',
  ];
  const csv = buildCsv(rows, columns);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="change-requests-export.csv"');
  res.send(csv);
});

// ---------------------------------------------------------------------------
// GET / — Paginated list with filters
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const cacheKey = `requests:list:${status || 'all'}:${q || ''}:${page}:${limit}`;
  const cached = await getCached<{ data: unknown[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  let query = supabaseAdmin
    .from('change_requests')
    .select('*, clients(company_name, contact_name, contact_email), deliverables(hours)', { count: 'exact' });

  if (status === 'needs_review') {
    query = query.in('status', ['draft', 'pending', 'reviewing']);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`reference_code.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const response = { data: data ?? [], total: count ?? 0, page, limit };
  await setCached(cacheKey, response, 15);
  res.json(response);
});

// ---------------------------------------------------------------------------
// GET /:id — Full request detail
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const { data: request, error } = await supabaseAdmin
    .from('change_requests')
    .select('*')
    .or(`id.eq.${id},reference_code.eq.${id}`)
    .single();

  if (error || !request) {
    res.status(404).json({ error: `Change request "${id}" was not found. Verify the reference code and try again.` });
    return;
  }

  // Parallel fetches using the authoritative UUID (request.id)
  const [deliverables, exclusions, notes, approvalLink, approvalResponse, client, project, activityEvents] =
    await Promise.all([
      supabaseAdmin.from('deliverables').select('*').eq('request_id', request.id),
      supabaseAdmin.from('exclusions').select('*').eq('request_id', request.id),
      supabaseAdmin
        .from('notes')
        .select('*, profiles(name, avatar_url)')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('approval_links')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('approval_responses')
        .select('*')
        .eq('request_id', request.id)
        .maybeSingle(),
      supabaseAdmin.from('clients').select('*').eq('id', request.client_id).single(),
      request.project_id
        ? supabaseAdmin.from('projects').select('*').eq('id', request.project_id).single()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from('activity_events')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: true }),
    ]);

  res.json({
    ...request,
    client: client.data,
    project: project.data,
    deliverables: deliverables.data ?? [],
    exclusions: exclusions.data ?? [],
    notes: notes.data ?? [],
    approval_link: approvalLink.data,
    approval_response: approvalResponse.data,
    activity_events: activityEvents.data ?? [],
  });
});

// ---------------------------------------------------------------------------
// POST / — Create a new request
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  const body = req.body as CreateRequestBody;

  if (!body.client_id || !body.title) {
    res.status(400).json({ error: 'A client and request title are required to create a change request.' });
    return;
  }

  if (typeof body.hourly_rate !== 'number' || !Number.isFinite(body.hourly_rate) || body.hourly_rate < 0) {
    res.status(400).json({ error: 'A valid hourly rate is required.' });
    return;
  }

  let deliverables;
  try {
    deliverables = normalizeDeliverables(body.deliverables);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid deliverables.' });
    return;
  }
  const estimate = calculateEstimate(deliverables, body.hourly_rate);

  // Generate reference code
  const { data: maxRow } = await supabaseAdmin
    .from('change_requests')
    .select('reference_code')
    .order('reference_code', { ascending: false })
    .limit(1)
    .single();

  const lastNum = maxRow?.reference_code
    ? parseInt(maxRow.reference_code.replace('CR-', ''), 10)
    : 1041;
  const referenceCode = `CR-${lastNum + 1}`;

  const now = new Date().toISOString();

  const { data: created, error } = await supabaseAdmin
    .from('change_requests')
    .insert({
      reference_code: referenceCode,
      client_id: body.client_id,
      project_id: body.project_id || null,
      title: body.title,
      client_quote: body.client_quote || null,
      source_channel: body.source_channel || null,
      priority: body.priority || 'standard',
      hourly_rate: body.hourly_rate || null,
      target_delivery_date: body.target_delivery_date || null,
      timeline_days: body.timeline_days || null,
      status: 'draft',
      created_by: userId || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !created) {
    res.status(500).json({ error: error?.message ?? 'Failed to create request' });
    return;
  }

  await invalidateCache('stats:summary', 'stats:status-breakdown');
  await invalidateCachePattern('requests:list:*');

  const { error: deliverableError } = await supabaseAdmin.from('deliverables').insert(
    deliverables.map((d) => ({ request_id: created.id, ...d }))
  );
  if (deliverableError) {
    await supabaseAdmin.from('change_requests').delete().eq('id', created.id);
    res.status(500).json({ error: deliverableError.message });
    return;
  }

  // Insert exclusions
  if (body.exclusions?.length) {
    await supabaseAdmin.from('exclusions').insert(
      body.exclusions.map((e) => ({
        request_id: created.id,
        description: e,
      }))
    );
  }

  // Log activity
  const actorName = await getActorName(userId);
  await logActivity(created.id, 'created', { title: body.title }, actorName);

  res.status(201).json(created);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update basic fields
// ---------------------------------------------------------------------------

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { title, client_quote, source_channel, priority } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (client_quote !== undefined) updates.client_quote = client_quote;
  if (source_channel !== undefined) updates.source_channel = source_channel;
  if (priority !== undefined) updates.priority = priority;

  const { data, error } = await supabaseAdmin
    .from('change_requests')
    .update(updates)
    .or(`id.eq.${id},reference_code.eq.${id}`)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await invalidateCache('stats:summary', 'stats:status-breakdown');
  await invalidateCachePattern('requests:list:*');
  res.json(data);
});

// ---------------------------------------------------------------------------
// PATCH /:id/estimate — Update estimate + deliverables + exclusions
// ---------------------------------------------------------------------------

router.patch('/:id/estimate', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId;
  const body = req.body as UpdateEstimateBody;

  if (body.hourly_rate !== undefined && (typeof body.hourly_rate !== 'number' || body.hourly_rate < 0 || isNaN(body.hourly_rate))) {
    res.status(400).json({ error: 'Hourly rate must be a valid non-negative number.' });
    return;
  }

  let deliverables;
  try {
    deliverables = normalizeDeliverables(body.deliverables);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid deliverables.' });
    return;
  }
  const estimate = calculateEstimate(deliverables, body.hourly_rate);

  // Find request by id or reference code
  const { data: targetReq } = await supabaseAdmin
    .from('change_requests')
    .select('id, reference_code')
    .or(`id.eq.${id},reference_code.eq.${id}`)
    .single();

  const targetId = targetReq?.id || id;
  const refCode = targetReq?.reference_code || id;
  const now = new Date().toISOString();

  // Replace deliverables
  const { error: deleteDeliverablesError } = await supabaseAdmin.from('deliverables').delete().eq('request_id', targetId);
  if (deleteDeliverablesError) {
    res.status(500).json({ error: deleteDeliverablesError.message });
    return;
  }
  const { error: insertDeliverablesError } = await supabaseAdmin.from('deliverables').insert(
    deliverables.map((d) => ({ request_id: targetId, ...d }))
  );
  if (insertDeliverablesError) {
    res.status(500).json({ error: insertDeliverablesError.message });
    return;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('change_requests')
    .update({ hourly_rate: body.hourly_rate, target_delivery_date: body.target_delivery_date, timeline_days: body.timeline_days, updated_at: now })
    .eq('id', targetId)
    .select()
    .single();
  if (updateError || !updated) {
    res.status(500).json({ error: updateError?.message ?? `Failed to update estimate for ${refCode}. Verify the input fields and try again.` });
    return;
  }

  await invalidateCache('stats:summary', 'stats:status-breakdown');
  await invalidateCachePattern('requests:list:*');

  // Replace exclusions
  await supabaseAdmin.from('exclusions').delete().eq('request_id', targetId);
  if (body.exclusions?.length) {
    await supabaseAdmin.from('exclusions').insert(
      body.exclusions.map((e) => ({
        request_id: targetId,
        description: e,
      }))
    );
  }

  const actorName = await getActorName(userId);
  await logActivity(
    targetId,
    'estimate_updated',
    {
      hourly_rate: body.hourly_rate,
      hours: estimate.hours,
      cost: estimate.cost,
    },
    actorName
  );

  res.json(updated);
});

// ---------------------------------------------------------------------------
// POST /:id/send-for-approval — submit for internal developer approval
// ---------------------------------------------------------------------------

router.post('/:id/send-for-approval', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId;

  try {
    const { data: request, error: reqError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .or(`id.eq.${id},reference_code.eq.${id}`)
      .single();

    if (reqError || !request) {
      res.status(404).json({ error: `Change request "${id}" was not found.` });
      return;
    }

    validateTransition(request.status as RequestStatus, 'reviewing');

    if (!request.hourly_rate || !request.hours || !request.target_delivery_date) {
      res.status(400).json({
        error: `Estimate for ${request.reference_code} is incomplete. Hourly rate, estimated hours, and target delivery date are all required before sending for approval.`,
      });
      return;
    }

    const now = new Date().toISOString();

    await supabaseAdmin
      .from('change_requests')
      .update({ status: 'reviewing', updated_at: now })
      .eq('id', request.id);

    await invalidateCache('stats:summary', 'stats:status-breakdown');
    await invalidateCachePattern('requests:list:*');

    const actorName = await getActorName(userId);
    await logActivity(
      request.id,
      'submitted_for_review',
      { from: request.status, to: 'reviewing' },
      actorName
    );

    res.json({ success: true, status: 'reviewing' });
  } catch (err) {
    if (err instanceof TransitionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /:id/approve-review — approve internally and send to the client
// ---------------------------------------------------------------------------

router.post('/:id/approve-review', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId;

  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Only admin users can approve requests for client approval.' });
    return;
  }

  try {
    const { data: request, error: reqError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .or(`id.eq.${id},reference_code.eq.${id}`)
      .single();

    if (reqError || !request) {
      res.status(404).json({ error: `Change request "${id}" was not found.` });
      return;
    }

    validateTransition(request.status as RequestStatus, 'awaiting_approval');

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', request.client_id)
      .single();

    if (!client) {
      res.status(404).json({ error: `Client for ${request.reference_code} was not found.` });
      return;
    }

    const token = generateApprovalToken(client.company_name);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { error: linkError } = await supabaseAdmin.from('approval_links').insert({
      request_id: request.id,
      token,
      expires_at: expiresAt,
      created_at: now,
    });

    if (linkError) {
      res.status(500).json({ error: linkError.message });
      return;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('change_requests')
      .update({ status: 'awaiting_approval', updated_at: now })
      .eq('id', request.id)
      .select()
      .single();

    if (updateError || !updated) {
      res.status(500).json({ error: updateError?.message ?? 'Failed to approve internal review.' });
      return;
    }

    await invalidateCache('stats:summary', 'stats:status-breakdown');
    await invalidateCachePattern('requests:list:*');

    const actorName = await getActorName(userId);
    await logActivity(request.id, 'review_approved', { from: 'reviewing', to: 'awaiting_approval' }, actorName);

    const approvalUrl = `${config.appUrl}/approval/${token}`;
    try {
      await sendApprovalEmail(client.contact_email, client.contact_name, request.title, request.reference_code, approvalUrl);
    } catch {
      console.error('Failed to send approval email');
    }

    res.json({ ...updated, token, approval_url: approvalUrl });
  } catch (err) {
    if (err instanceof TransitionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /:id/request-review-changes — send internal review back for changes
// ---------------------------------------------------------------------------

router.post('/:id/request-review-changes', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Only admin users can request review changes.' });
    return;
  }
  if (!reason) {
    res.status(400).json({ error: 'A reason is required when sending a request back for changes.' });
    return;
  }

  try {
    const { data: request, error: reqError } = await supabaseAdmin
      .from('change_requests')
      .select('id, reference_code, status')
      .or(`id.eq.${id},reference_code.eq.${id}`)
      .single();

    if (reqError || !request) {
      res.status(404).json({ error: `Change request "${id}" was not found.` });
      return;
    }

    validateTransition(request.status as RequestStatus, 'pending');
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('change_requests')
      .update({ status: 'pending', updated_at: now })
      .eq('id', request.id);

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    const { error: noteError } = await supabaseAdmin.from('notes').insert({
      request_id: request.id,
      author_id: userId || null,
      content: `Review changes requested: ${reason}`,
      created_at: now,
    });

    if (noteError) {
      res.status(500).json({ error: noteError.message });
      return;
    }

    await invalidateCache('stats:summary', 'stats:status-breakdown');
    await invalidateCachePattern('requests:list:*');

    const actorName = await getActorName(userId);
    await logActivity(request.id, 'review_changes_requested', { reason, from: 'reviewing', to: 'pending' }, actorName);

    res.json({ success: true, status: 'pending' });
  } catch (err) {
    if (err instanceof TransitionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /:id/advance — approved→in_progress or in_progress→completed
// ---------------------------------------------------------------------------

router.post('/:id/advance', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId;

  try {
    const { data: request, error: reqError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .or(`id.eq.${id},reference_code.eq.${id}`)
      .single();

    if (reqError || !request) {
      res.status(404).json({ error: `Change request "${id}" was not found.` });
      return;
    }

    let targetStatus: RequestStatus;
    let eventType: string;

    if (request.status === 'approved') {
      targetStatus = 'in_progress';
      eventType = 'marked_in_progress';
    } else if (request.status === 'in_progress') {
      targetStatus = 'completed';
      eventType = 'marked_complete';
    } else {
      res.status(409).json({
        error: `Cannot advance ${request.reference_code} from status "${request.status}". Only approved requests can be marked in progress, and only in-progress requests can be completed.`,
      });
      return;
    }

    validateTransition(request.status as RequestStatus, targetStatus);

    const now = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from('change_requests')
      .update({ status: targetStatus, updated_at: now })
      .eq('id', request.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await invalidateCache('stats:summary', 'stats:status-breakdown');
    await invalidateCachePattern('requests:list:*');

    const actorName = await getActorName(userId);
    await logActivity(request.id, eventType, { from: request.status, to: targetStatus }, actorName);

    res.json(updated);
  } catch (err) {
    if (err instanceof TransitionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /:id/notes — Add internal note
// ---------------------------------------------------------------------------

router.post('/:id/notes', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId;
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: 'Note content cannot be blank. Enter a message before posting.' });
    return;
  }

  const { data: request } = await supabaseAdmin
    .from('change_requests')
    .select('id, reference_code')
    .or(`id.eq.${id},reference_code.eq.${id}`)
    .single();

  const targetId = request?.id || id;

  const { data: note, error } = await supabaseAdmin
    .from('notes')
    .insert({
      request_id: targetId,
      author_id: userId || null,
      content: content.trim(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const actorName = await getActorName(userId);
  await logActivity(targetId, 'note_added', { preview: content.trim().slice(0, 100) }, actorName);

  res.status(201).json(note);
});

// ---------------------------------------------------------------------------
// GET /:id/activity — Activity timeline
// ---------------------------------------------------------------------------

router.get('/:id/activity', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const { data: request } = await supabaseAdmin
    .from('change_requests')
    .select('id')
    .or(`id.eq.${id},reference_code.eq.${id}`)
    .single();

  const targetId = request?.id || id;

  const { data: events, error } = await supabaseAdmin
    .from('activity_events')
    .select('*')
    .eq('request_id', targetId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ events: events ?? [] });
});

export default router;
