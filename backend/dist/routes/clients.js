import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
const router = Router();
/**
 * GET /clients
 * Search clients by company name for autocomplete.
 * Query param: ?q=acme
 */
router.get('/', async (req, res) => {
    const q = req.query.q || '';
    let query = supabaseAdmin
        .from('clients')
        .select('id, company_name, contact_name, contact_email, avatar_url')
        .order('company_name');
    if (q) {
        query = query.ilike('company_name', `%${q}%`);
    }
    query = query.limit(20);
    const { data, error } = await query;
    if (error) {
        res.status(500).json({ error: 'Failed to fetch clients' });
        return;
    }
    res.json({ clients: data });
});
/**
 * GET /clients/:id/projects
 * List projects for a given client.
 */
router.get('/:id/projects', async (req, res) => {
    const clientId = req.params.id;
    const { data, error } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name');
    if (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
        return;
    }
    res.json({ projects: data });
});
export default router;
//# sourceMappingURL=clients.js.map