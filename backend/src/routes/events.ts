import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';

const router = Router();

router.get('/recent', async (req: Request, res: Response): Promise<void> => {
  const since = typeof req.query.since === 'string' ? req.query.since : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('activity_events')
    .select('*')
    .select('*, change_requests(reference_code, title)')
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ events: data ?? [] });
  
  const mapped = (data ?? []).map((e: any) => ({
    ...e,
    event_data: {
      ...(e.event_data || {}),
      reference_code: e.change_requests?.reference_code,
      request_title: e.change_requests?.title
    }
  }));
  res.json({ events: mapped });
});

router.get('/stream', async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let lastSeen = new Date().toISOString();
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  send({ type: 'connected', at: lastSeen });

  const timer = setInterval(async () => {
    const { data, error } = await supabaseAdmin
      .from('activity_events')
      .select('*')
      .select('*, change_requests(reference_code, title)')
      .gt('created_at', lastSeen)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) return;
    for (const event of data ?? []) {
      lastSeen = event.created_at;
      send({ type: 'activity', event });
      const mappedEvent = {
        ...event,
        event_data: {
          ...(event.event_data || {}),
          reference_code: event.change_requests?.reference_code,
          request_title: event.change_requests?.title
        }
      };
      send({ type: 'activity', event: mappedEvent });
    }
    res.write(': heartbeat\n\n');
  }, 2000);

  req.on('close', () => clearInterval(timer));
});

export default router;