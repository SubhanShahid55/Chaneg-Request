import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { validateTransition, TransitionError } from '../services/stateMachine.js';
import { sendApprovalEmail } from '../services/email.js';
import { generateApprovalToken } from '../utils/tokens.js';
import { buildCsv } from '../utils/csv.js';
import { config } from '../config.js';
import { getCached, invalidateCache, setCached } from '../services/cache.js';
import type { RequestStatus, CreateRequestBody, UpdateEstimateBody } from '../types.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getActorName(userId: string): Promise<string> {
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

  if (error) { res.status(500).json({ error: error.message }); return; }
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
    .select('reference_code, title, status, priority, hours, cost, source_channel, created_at, clients(company_name, contact_name)');

  if (status === 'needs_review') {
    query = query.in('status', ['draft', 'pending']);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`reference_code.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const rows = (data ?? []).map((r: any) => ({
    reference_code: r.reference_code,
    title: r.title,
    company_name: r.clients?.company_name ?? '',
    contact_name: r.clients?.contact_name ?? '',
    status: r.status,
    priority: r.priority,
    hours: r.hours,
    cost: r.cost,
    source_channel: r.source_channel,
    created_at: r.created_at,
  }));

  const columns = ['reference_code', 'title', 'company_name', 'contact_name', 'status', 'priority', 'hours', 'cost', 'source_channel', 'created_at'];
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
  if (cached) { res.json(cached); return; }

  let query = supabaseAdmin
    .from('change_requests')
    .select('*, clients(company_name, contact_name, contact_email)', { count: 'exact' });

  if (status === 'needs_review') {
    query = query.in('status', ['draft', 'pending']);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`reference_code.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) { res.status(500).json({ error: error.message }); return; }
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

  if (error || !request) { res.status(404).json({ error: 'Request not found' }); return; }

  // Parallel fetches
  const [deliverables, exclusions, notes, approvalLink, approvalResponse, client, project] =
    await Promise.all([
      supabaseAdmin.from('deliverables').select('*').eq('request_id', id),
      supabaseAdmin.from('exclusions').select('*').eq('request_id', id),
      supabaseAdmin.from('notes').select('*, profiles(name, avatar_url)').eq('request_id', id).order('created_at', { ascending: false }),
      supabaseAdmin.from('approval_links').select('*').eq('request_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('approval_responses').select('*').eq('request_id', id).maybeSingle(),
      supabaseAdmin.from('clients').select('*').eq('id', request.client_id).single(),
      request.project_id
        ? supabaseAdmin.from('projects').select('*').eq('id', request.project_id).single()
        : Promise.resolve({ data: null }),
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
  });
});

// ---------------------------------------------------------------------------
// POST / — Create a new request
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const body = req.body as CreateRequestBody;

  if (!body.client_id || !body.title) {
    res.status(400).json({ error: 'client_id and title are required' });
    return;
  }

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
      status: 'draft',
      created_by: userId,
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

  // Insert deliverables
  if (body.deliverables?.length) {
    await supabaseAdmin.from('deliverables').insert(
      body.deliverables.map((d) => ({
        request_id: created.id,
        description: d.description,
        hours: d.hours,
        category: d.category,
      }))
    );
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
    .eq('id', id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  await invalidateCache('stats:summary', 'stats:status-breakdown');
  res.json(data);
});

// ---------------------------------------------------------------------------
// PATCH /:id/estimate — Update estimate + deliverables + exclusions
// ---------------------------------------------------------------------------

router.patch('/:id/estimate', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId!;
  const body = req.body as UpdateEstimateBody;

  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('change_requests')
    .update({
      hourly_rate: body.hourly_rate,
      hours: body.hours,
      cost: body.cost,
      target_delivery_date: body.target_delivery_date,
      timeline_days: body.timeline_days,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    res.status(500).json({ error: updateError?.message ?? 'Failed to update estimate' });
    return;
  }

  await invalidateCache('stats:summary', 'stats:status-breakdown');

  // Replace deliverables
  await supabaseAdmin.from('deliverables').delete().eq('request_id', id);
  if (body.deliverables?.length) {
    await supabaseAdmin.from('deliverables').insert(
      body.deliverables.map((d) => ({
        request_id: id,
        description: d.description,
        hours: d.hours,
        category: d.category,
      }))
    );
  }

  // Replace exclusions
  await supabaseAdmin.from('exclusions').delete().eq('request_id', id);
  if (body.exclusions?.length) {
    await supabaseAdmin.from('exclusions').insert(
      body.exclusions.map((e) => ({
        request_id: id,
        description: e,
      }))
    );
  }

  const actorName = await getActorName(userId);
  await logActivity(id, 'estimate_updated', {
    hourly_rate: body.hourly_rate,
    hours: body.hours,
    cost: body.cost,
  }, actorName);

  res.json(updated);
});

// ---------------------------------------------------------------------------
// POST /:id/send-for-approval
// ---------------------------------------------------------------------------

router.post('/:id/send-for-approval', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId!;

  try {
    const { data: request, error: reqError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) { res.status(404).json({ error: 'Request not found' }); return; }

    validateTransition(request.status as RequestStatus, 'awaiting_approval');

    if (!request.hourly_rate || !request.hours || !request.target_delivery_date) {
      res.status(400).json({
        error: 'Estimate must include hourly_rate, hours, and target_delivery_date before sending for approval.',
      });
      return;
    }

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', request.client_id)
      .single();

    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

    const token = generateApprovalToken(client.company_name);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await supabaseAdmin.from('approval_links').insert({
      request_id: id,
      token,
      expires_at: expiresAt,
      created_at: now,
    });

    await supabaseAdmin
      .from('change_requests')
      .update({ status: 'awaiting_approval', updated_at: now })
      .eq('id', id);

    await invalidateCache('stats:summary', 'stats:status-breakdown');

    const actorName = await getActorName(userId);
    await logActivity(id, 'sent_for_approval', {
      client_name: client.company_name,
      contact_email: client.contact_email,
    }, actorName);

    const approvalUrl = `${config.appUrl}/approval/${token}`;
    try {
      await sendApprovalEmail(
        client.contact_email,
        client.contact_name,
        request.title,
        request.reference_code,
        approvalUrl
      );
    } catch {
      console.error('Failed to send approval email');
    }

    res.json({ token, approval_url: approvalUrl });
  } catch (err) {
    if (err instanceof TransitionError) { res.status(409).json({ error: err.message }); return; }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /:id/advance — approved→in_progress or in_progress→completed
// ---------------------------------------------------------------------------

router.post('/:id/advance', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId!;

  try {
    const { data: request, error: reqError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) { res.status(404).json({ error: 'Request not found' }); return; }

    let targetStatus: RequestStatus;
    let eventType: string;

    if (request.status === 'approved') {
      targetStatus = 'in_progress';
      eventType = 'marked_in_progress';
    } else if (request.status === 'in_progress') {
      targetStatus = 'completed';
      eventType = 'marked_complete';
    } else {
      res.status(409).json({ error: `Cannot advance from status "${request.status}"` });
      return;
    }

    validateTransition(request.status as RequestStatus, targetStatus);

    const now = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from('change_requests')
      .update({ status: targetStatus, updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }

    await invalidateCache('stats:summary', 'stats:status-breakdown');

    const actorName = await getActorName(userId);
    await logActivity(id, eventType, { from: request.status, to: targetStatus }, actorName);

    res.json(updated);
  } catch (err) {
    if (err instanceof TransitionError) { res.status(409).json({ error: err.message }); return; }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /:id/notes — Add internal note
// ---------------------------------------------------------------------------

router.post('/:id/notes', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.userId!;
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: 'Note content is required' });
    return;
  }

  const { data: note, error } = await supabaseAdmin
    .from('notes')
    .insert({
      request_id: id,
      author_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }

  const actorName = await getActorName(userId);
  await logActivity(id, 'note_added', { preview: content.trim().slice(0, 100) }, actorName);

  res.status(201).json(note);
});

// ---------------------------------------------------------------------------
// GET /:id/activity — Activity timeline
// ---------------------------------------------------------------------------

router.get('/:id/activity', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const { data: events, error } = await supabaseAdmin
    .from('activity_events')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ events: events ?? [] });
});

export default router;
