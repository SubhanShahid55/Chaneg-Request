import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
const router = Router();
router.post('/', async (req, res) => {
    if (req.userRole !== 'admin') {
        res.status(403).json({ error: 'Only administrators can add clients.' });
        return;
    }
    const companyName = typeof req.body?.company_name === 'string' ? req.body.company_name.trim() : '';
    const contactName = typeof req.body?.contact_name === 'string' ? req.body.contact_name.trim() : '';
    const contactEmail = typeof req.body?.contact_email === 'string' ? req.body.contact_email.trim().toLowerCase() : '';
    if (!companyName || !contactName || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
        res.status(400).json({ error: 'Enter a company name, contact name, and valid contact email.' });
        return;
    }
    const { data: existing } = await supabaseAdmin
        .from('clients')
        .select('id')
        .ilike('company_name', companyName)
        .maybeSingle();
    if (existing) {
        res.status(409).json({ error: 'A client with this company name already exists.' });
        return;
    }
    const { data, error } = await supabaseAdmin.from('clients').insert({
        company_name: companyName,
        contact_name: contactName,
        contact_email: contactEmail,
    }).select('id, company_name, contact_name, contact_email, avatar_url').single();
    if (error) {
        res.status(500).json({ error: 'Unable to add this client.' });
        return;
    }
    res.status(201).json({ client: data });
});
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