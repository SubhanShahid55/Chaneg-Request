import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { getCached, setCached } from '../services/cache.js';

const router = Router();

/**
 * GET /stats/summary
 * The four headline counts: needs_review, waiting, in_progress, completed.
 */
router.get('/summary', async (_req: Request, res: Response): Promise<void> => {
  const cached = await getCached<typeof summaryShape>('stats:summary');
  if (cached) { res.json(cached); return; }
  const { data, error } = await supabaseAdmin
    .from('change_requests')
    .select('status');

  if (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
    return;
  }

  const counts: typeof summaryShape = {
    needs_review: 0,
    waiting: 0,
    in_progress: 0,
    completed: 0,
  };

  for (const row of data || []) {
    switch (row.status) {
      case 'draft':
      case 'pending':
        counts.needs_review++;
        break;
      case 'awaiting_approval':
        counts.waiting++;
        break;
      case 'in_progress':
        counts.in_progress++;
        break;
      case 'completed':
        counts.completed++;
        break;
    }
  }

  await setCached('stats:summary', counts, 15);
  res.json(counts);
});

const summaryShape = {
  needs_review: 0,
  waiting: 0,
  in_progress: 0,
  completed: 0,
};

/**
 * GET /stats/weekly-velocity
 * Approved vs pending counts per week for the trailing 8 weeks.
 */
router.get('/weekly-velocity', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin.rpc('weekly_velocity');

  if (error) {
    // Fallback: compute from raw data if the RPC doesn't exist
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const { data: requests, error: fetchError } = await supabaseAdmin
      .from('change_requests')
      .select('status, created_at')
      .gte('created_at', eightWeeksAgo.toISOString());

    if (fetchError) {
      res.status(500).json({ error: 'Failed to fetch velocity data' });
      return;
    }

    // Group by ISO week
    const weeks: Record<string, { week: string; approved: number; pending: number }> = {};

    for (const r of requests || []) {
      const d = new Date(r.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);

      if (!weeks[weekKey]) {
        weeks[weekKey] = { week: weekKey, approved: 0, pending: 0 };
      }

      if (['approved', 'in_progress', 'completed'].includes(r.status)) {
        weeks[weekKey].approved++;
      } else if (['pending', 'draft', 'awaiting_approval'].includes(r.status)) {
        weeks[weekKey].pending++;
      }
    }

    const sorted = Object.values(weeks)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);

    res.json({ weeks: sorted });
    return;
  }

  res.json({ weeks: data });
});

/**
 * GET /stats/weekly-intake
 * 8-week trailing broken out by draft, pending, and approved.
 */
router.get('/weekly-intake', async (_req: Request, res: Response): Promise<void> => {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: requests, error } = await supabaseAdmin
    .from('change_requests')
    .select('status, created_at')
    .gte('created_at', eightWeeksAgo.toISOString());

  if (error) {
    res.status(500).json({ error: 'Failed to fetch intake data' });
    return;
  }

  const weeks: Record<string, { week: string; draft: number; pending: number; approved: number }> = {};

  for (const r of requests || []) {
    const d = new Date(r.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);

    if (!weeks[weekKey]) {
      weeks[weekKey] = { week: weekKey, draft: 0, pending: 0, approved: 0 };
    }

    if (r.status === 'draft') weeks[weekKey].draft++;
    else if (['pending', 'awaiting_approval'].includes(r.status)) weeks[weekKey].pending++;
    else if (['approved', 'in_progress', 'completed'].includes(r.status)) weeks[weekKey].approved++;
  }

  const sorted = Object.values(weeks)
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8);

  res.json({ weeks: sorted });
});

/**
 * GET /stats/status-breakdown
 * Count per status for the donut chart.
 */
router.get('/status-breakdown', async (_req: Request, res: Response): Promise<void> => {
  const cached = await getCached<{ breakdown: Record<string, number> }>('stats:status-breakdown');
  if (cached) { res.json(cached); return; }
  const { data, error } = await supabaseAdmin
    .from('change_requests')
    .select('status');

  if (error) {
    res.status(500).json({ error: 'Failed to fetch status breakdown' });
    return;
  }

  const breakdown: Record<string, number> = {};

  for (const row of data || []) {
    breakdown[row.status] = (breakdown[row.status] || 0) + 1;
  }

  const response = { breakdown };
  await setCached('stats:status-breakdown', response, 15);
  res.json(response);
});

export default router;
