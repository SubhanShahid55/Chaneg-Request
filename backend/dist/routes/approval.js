import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { validateTransition, TransitionError } from '../services/stateMachine.js';
import { sendTeamNotification } from '../services/email.js';
import { generateConfirmationCode } from '../utils/codes.js';
const router = Router();
/**
 * Helper: look up an approval link by token and return its state.
 */
async function resolveToken(token) {
    let { data: link, error } = await supabaseAdmin
        .from('approval_links')
        .select('*')
        .eq('token', token)
        .single();
    if (error || !link) {
        const { data: request } = await supabaseAdmin
            .from('change_requests')
            .select('id')
            .eq('reference_code', token)
            .single();
        if (request) {
            const result = await supabaseAdmin.from('approval_links').select('*').eq('request_id', request.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
            link = result.data;
            error = result.error;
        }
    }
    if (error || !link) {
        return { state: 'not_found' };
    }
    // Check if already responded
    const { data: existingResponse } = await supabaseAdmin
        .from('approval_responses')
        .select('*')
        .eq('request_id', link.request_id)
        .single();
    if (existingResponse) {
        // Fetch the request for context
        const { data: request } = await supabaseAdmin
            .from('change_requests')
            .select('*')
            .eq('id', link.request_id)
            .single();
        return { state: 'already_responded', link, request, response: existingResponse };
    }
    // Check if expired
    if (new Date(link.expires_at) < new Date()) {
        return { state: 'expired', link };
    }
    // Fetch the request and client
    const { data: request } = await supabaseAdmin
        .from('change_requests')
        .select('*')
        .eq('id', link.request_id)
        .single();
    if (!request) {
        return { state: 'not_found' };
    }
    const { data: client } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', request.client_id)
        .single();
    return { state: 'valid', link, request, client };
}
/**
 * GET /approval/:token
 * Returns the request summary for the client to review.
 * Records a viewed_by_client event on first view.
 */
router.get('/:token', async (req, res) => {
    const token = req.params.token;
    const resolved = await resolveToken(token);
    if (resolved.state === 'not_found') {
        res.status(404).json({ state: 'not_found', error: 'Invalid approval link' });
        return;
    }
    if (resolved.state === 'expired') {
        res.json({ state: 'expired' });
        return;
    }
    if (resolved.state === 'already_responded') {
        res.json({
            state: 'already_responded',
            response: resolved.response,
            request: resolved.request
                ? {
                    reference_code: resolved.request.reference_code,
                    title: resolved.request.title,
                    status: resolved.request.status,
                }
                : null,
        });
        return;
    }
    // state === 'valid'
    const { link, request, client } = resolved;
    // Record first view
    if (!link.viewed_at) {
        await supabaseAdmin
            .from('approval_links')
            .update({ viewed_at: new Date().toISOString() })
            .eq('id', link.id);
        await supabaseAdmin.from('activity_events').insert({
            request_id: request.id,
            event_type: 'viewed_by_client',
            event_data: { client_name: client?.contact_name },
            actor_name: client?.contact_name || 'Client',
            created_at: new Date().toISOString(),
        });
    }
    // Fetch deliverables and exclusions
    const { data: deliverables } = await supabaseAdmin
        .from('deliverables')
        .select('*')
        .eq('request_id', request.id);
    const { data: exclusions } = await supabaseAdmin
        .from('exclusions')
        .select('*')
        .eq('request_id', request.id);
    const result = {
        state: 'valid',
        request: {
            reference_code: request.reference_code,
            title: request.title,
            client_quote: request.client_quote,
            priority: request.priority,
            cost: request.cost,
            hours: request.hours,
            hourly_rate: request.hourly_rate,
            target_delivery_date: request.target_delivery_date,
            timeline_days: request.timeline_days,
            client_name: client?.company_name || '',
            contact_name: client?.contact_name || '',
        },
        deliverables: deliverables || [],
        exclusions: exclusions || [],
    };
    res.json(result);
});
/**
 * POST /approval/:token/approve
 * Client approves the request.
 */
router.post('/:token/approve', async (req, res) => {
    const token = req.params.token;
    const resolved = await resolveToken(token);
    if (resolved.state !== 'valid') {
        const statusCode = resolved.state === 'not_found' ? 404 : 409;
        res.status(statusCode).json({
            error: resolved.state === 'not_found'
                ? 'Invalid approval link'
                : resolved.state === 'expired'
                    ? 'This approval link has expired'
                    : 'This request has already been responded to',
        });
        return;
    }
    const { request, client } = resolved;
    try {
        validateTransition(request.status, 'approved');
    }
    catch (err) {
        if (err instanceof TransitionError) {
            res.status(409).json({ error: err.message });
            return;
        }
        throw err;
    }
    const confirmationCode = generateConfirmationCode();
    const now = new Date().toISOString();
    // Update request status
    await supabaseAdmin
        .from('change_requests')
        .update({ status: 'approved', updated_at: now })
        .eq('id', request.id);
    // Write approval response
    await supabaseAdmin.from('approval_responses').insert({
        request_id: request.id,
        decision: 'approved',
        confirmation_code: confirmationCode,
        responded_at: now,
    });
    // Log activity event
    await supabaseAdmin.from('activity_events').insert({
        request_id: request.id,
        event_type: 'approved',
        event_data: {
            confirmation_code: confirmationCode,
            approved_by: client?.contact_name,
        },
        actor_name: client?.contact_name || 'Client',
        created_at: now,
    });
    // Send team notification
    try {
        await sendTeamNotification(`✅ ${request.reference_code} Approved by ${client?.contact_name || 'Client'}`, `
        <h2 style="color: #059669;">Request Approved</h2>
        <p><strong>${request.reference_code}:</strong> ${request.title}</p>
        <p><strong>Client:</strong> ${client?.company_name} (${client?.contact_name})</p>
        <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
        <p><strong>Estimated Cost:</strong> $${request.cost?.toLocaleString() || 'N/A'}</p>
        <p>The request is now ready to be marked as in progress.</p>
      `);
    }
    catch {
        // Don't fail the approval if email fails
        console.error('Failed to send team notification email');
    }
    res.json({
        success: true,
        confirmation_code: confirmationCode,
        message: 'Request approved successfully',
    });
});
/**
 * POST /approval/:token/decline
 * Client declines the request.
 */
router.post('/:token/decline', async (req, res) => {
    const token = req.params.token;
    const { reason } = req.body;
    const resolved = await resolveToken(token);
    if (resolved.state !== 'valid') {
        const statusCode = resolved.state === 'not_found' ? 404 : 409;
        res.status(statusCode).json({
            error: resolved.state === 'not_found'
                ? 'Invalid approval link'
                : resolved.state === 'expired'
                    ? 'This approval link has expired'
                    : 'This request has already been responded to',
        });
        return;
    }
    const { request, client } = resolved;
    try {
        validateTransition(request.status, 'declined');
    }
    catch (err) {
        if (err instanceof TransitionError) {
            res.status(409).json({ error: err.message });
            return;
        }
        throw err;
    }
    const now = new Date().toISOString();
    // Update request status
    await supabaseAdmin
        .from('change_requests')
        .update({ status: 'declined', updated_at: now })
        .eq('id', request.id);
    // Write approval response
    await supabaseAdmin.from('approval_responses').insert({
        request_id: request.id,
        decision: 'declined',
        decline_reason: reason || null,
        responded_at: now,
    });
    // Log activity event
    await supabaseAdmin.from('activity_events').insert({
        request_id: request.id,
        event_type: 'declined',
        event_data: {
            declined_by: client?.contact_name,
            reason: reason || null,
        },
        actor_name: client?.contact_name || 'Client',
        created_at: now,
    });
    // Send team notification
    try {
        await sendTeamNotification(`❌ ${request.reference_code} Declined by ${client?.contact_name || 'Client'}`, `
        <h2 style="color: #dc2626;">Request Declined</h2>
        <p><strong>${request.reference_code}:</strong> ${request.title}</p>
        <p><strong>Client:</strong> ${client?.company_name} (${client?.contact_name})</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '<p><em>No reason provided.</em></p>'}
      `);
    }
    catch {
        console.error('Failed to send team notification email');
    }
    res.json({
        success: true,
        message: 'Request declined',
    });
});
export default router;
//# sourceMappingURL=approval.js.map