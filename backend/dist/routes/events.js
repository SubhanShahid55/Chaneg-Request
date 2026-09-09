import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
const router = Router();
router.get('/recent', async (req, res) => {
    const since = typeof req.query.since === 'string' ? req.query.since : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
        .from('activity_events')
        .select('*')
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ events: data ?? [] });
});
router.get('/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    let lastSeen = new Date().toISOString();
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    send({ type: 'connected', at: lastSeen });
    const timer = setInterval(async () => {
        const { data, error } = await supabaseAdmin
            .from('activity_events')
            .select('*')
            .gt('created_at', lastSeen)
            .order('created_at', { ascending: true })
            .limit(50);
        if (error)
            return;
        for (const event of data ?? []) {
            lastSeen = event.created_at;
            send({ type: 'activity', event });
        }
        res.write(': heartbeat\n\n');
    }, 2000);
    req.on('close', () => clearInterval(timer));
});
export default router;
//# sourceMappingURL=events.js.map