import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { calculateProjectRollup } from '../services/projectRollup.js';
import { normalizeDeliverables } from '../services/estimate.js';

const router = Router();

async function projectDetail(id: string) {
  const { data: project, error } = await supabaseAdmin.from('projects').select('*, clients(id, company_name, contact_name, contact_email)').eq('id', id).single();
  if (error || !project) return null;
  const [{ data: original }, { data: requests }] = await Promise.all([
    supabaseAdmin.from('project_deliverables').select('*').eq('project_id', id).order('id'),
    supabaseAdmin.from('change_requests').select('*').eq('project_id', id).eq('status', 'approved').order('created_at', { ascending: true }),
  ]);
  const approvedChanges = await Promise.all((requests || []).map(async (request) => {
    const { data: deliverables } = await supabaseAdmin.from('deliverables').select('*').eq('request_id', request.id);
    return { ...request, deliverables: deliverables || [] };
  }));
  return { ...project, original_deliverables: original || [], approved_change_requests: approvedChanges, rollup: calculateProjectRollup(original || [], approvedChanges, project.agreed_budget, project.timeline_days) };
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin.from('projects').select('*, clients(company_name)').order('name');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ projects: data || [] });
});

router.get('/client/:clientId', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin.from('projects').select('id, client_id, name, description, scope_summary, agreed_budget, timeline_days').eq('client_id', req.params.clientId).order('name');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ projects: data || [] });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const project = await projectDetail(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found.' }); return; }
  res.json(project);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!body.client_id || !name) {
    res.status(400).json({ error: 'A client and project name are required.' });
    return;
  }

  const scopeSummary = typeof body.scope_summary === 'string' ? body.scope_summary.trim() : '';
  if (!scopeSummary) {
    res.status(400).json({ error: 'Scope summary is required to establish project baseline.' });
    return;
  }

  const budget = typeof body.agreed_budget === 'number' && Number.isFinite(body.agreed_budget)
    ? body.agreed_budget
    : (typeof body.agreed_budget === 'string' && body.agreed_budget.trim() ? Number(body.agreed_budget) : NaN);
  if (!Number.isFinite(budget) || budget <= 0) {
    res.status(400).json({ error: 'An agreed budget greater than 0 is required.' });
    return;
  }

  const timelineDays = typeof body.timeline_days === 'number' && Number.isFinite(body.timeline_days)
    ? body.timeline_days
    : (typeof body.timeline_days === 'string' && body.timeline_days.trim() ? Number(body.timeline_days) : NaN);
  if (!Number.isFinite(timelineDays) || timelineDays <= 0) {
    res.status(400).json({ error: 'A timeline in days greater than 0 is required.' });
    return;
  }

  let deliverables;
  try {
    deliverables = normalizeDeliverables(body.deliverables);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid deliverables.' });
    return;
  }

  if (!deliverables || deliverables.length === 0) {
    res.status(400).json({ error: 'At least one original deliverable is required to establish project baseline.' });
    return;
  }

  const { data: project, error } = await supabaseAdmin.from('projects').insert({
    client_id: body.client_id,
    name,
    description: body.description || null,
    scope_summary: scopeSummary,
    agreed_budget: budget,
    timeline_days: Math.round(timelineDays),
  }).select().single();

  if (error || !project) {
    res.status(500).json({ error: error?.message || 'Unable to create project.' });
    return;
  }

  const { error: deliverableError } = await supabaseAdmin.from('project_deliverables').insert(
    deliverables.map((item) => ({ ...item, project_id: project.id }))
  );

  if (deliverableError) {
    await supabaseAdmin.from('projects').delete().eq('id', project.id);
    res.status(500).json({ error: deliverableError.message });
    return;
  }

  res.status(201).json(await projectDetail(project.id));
});

export default router;