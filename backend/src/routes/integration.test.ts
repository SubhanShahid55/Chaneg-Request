import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';

describe('HTTP API Security & Route Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;
  let stdToken: string;

  before(async () => {
    const { default: app } = await import('../index.js');
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    const { supabaseAdmin } = await import('../supabase.js');
    const { config } = await import('../config.js');
    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false } });

    // Acquire session for standard user
    const linkStd = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: 'subhanshahid.dev@gmail.com' });
    const verifyStd = await authClient.auth.verifyOtp({ token_hash: linkStd.data.properties.hashed_token, type: 'email' });
    const verifyStd = await authClient.auth.verifyOtp({ token_hash: linkStd.data?.properties?.hashed_token || '', type: 'email' });
    stdToken = verifyStd.data.session?.access_token || '';

    // Acquire session for admin user
    const linkAdmin = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: 'admin@imant.com' });
    const verifyAdmin = await authClient.auth.verifyOtp({ token_hash: linkAdmin.data.properties.hashed_token, type: 'email' });
    const verifyAdmin = await authClient.auth.verifyOtp({ token_hash: linkAdmin.data?.properties?.hashed_token || '', type: 'email' });
    adminToken = verifyAdmin.data.session?.access_token || '';
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('Token Enumeration Exploitation Protection (Phase 0)', () => {
    it('rejects reference code lookup on /approval/:token with 404', async () => {
      const res = await fetch(`${baseUrl}/approval/CR-1042`);
      assert.strictEqual(res.status, 404);
      const data = await res.json() as any;
      assert.strictEqual(data.state, 'not_found');
    });

    it('rejects arbitrary non-existent tokens with 404', async () => {
      const res = await fetch(`${baseUrl}/approval/non-existent-token-12345`);
      assert.strictEqual(res.status, 404);
      const data = await res.json() as any;
      assert.strictEqual(data.state, 'not_found');
    });
  });

  describe('Unauthenticated Profile Mutation Protection (Phase 0)', () => {
    it('returns 404 for PATCH /auth (mutations removed from public auth router)', async () => {
      const res = await fetch(`${baseUrl}/auth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker Name' }),
      });
      assert.strictEqual(res.status, 404);
    });

    it('returns 404 for POST /auth/avatar (avatar upload removed from public auth router)', async () => {
      const res = await fetch(`${baseUrl}/auth/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: 'fake' }),
      });
      assert.strictEqual(res.status, 404);
    });

    it('returns 401 when mutating /profile without authentication', async () => {
      const res = await fetch(`${baseUrl}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Legitimate Name' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json() as any;
      assert.match(data.error, /Authorization header/i);
    });

    it('returns 401 when uploading avatar to /profile/avatar without authentication', async () => {
      const res = await fetch(`${baseUrl}/profile/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: 'fake' }),
      });
      assert.strictEqual(res.status, 401);
    });

    it('returns 401 when deleting avatar on /profile/avatar without authentication', async () => {
      const res = await fetch(`${baseUrl}/profile/avatar`, {
        method: 'DELETE',
      });
      assert.strictEqual(res.status, 401);
    });
  });

  describe('Client Portal Isolation & Authentication Boundaries (Phase 0 & 1)', () => {
    it('blocks unauthenticated access to GET /portal/requests with 401', async () => {
      const res = await fetch(`${baseUrl}/portal/requests`);
      assert.strictEqual(res.status, 401);
      const data = await res.json() as any;
      assert.match(data.error, /Authorization header/i);
    });

    it('blocks unauthenticated access to POST /portal/requests with 401', async () => {
      const res = await fetch(`${baseUrl}/portal/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Scope Request' }),
      });
      assert.strictEqual(res.status, 401);
    });

    it('rejects invalid or forged bearer tokens on client portal with 401', async () => {
      const res = await fetch(`${baseUrl}/portal/requests`, {
        headers: { Authorization: 'Bearer forged-token-abc-123' },
      });
      assert.strictEqual(res.status, 401);
    });
  });

  describe('Internal Route Protection Boundaries', () => {
    it('blocks unauthenticated access to GET /requests with 401', async () => {
      const res = await fetch(`${baseUrl}/requests`);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to GET /clients with 401', async () => {
      const res = await fetch(`${baseUrl}/clients`);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to GET /projects with 401', async () => {
      const res = await fetch(`${baseUrl}/projects`);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to GET /stats/summary with 401', async () => {
      const res = await fetch(`${baseUrl}/stats/summary`);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to GET /admin/users with 401', async () => {
      const res = await fetch(`${baseUrl}/admin/users`);
      assert.strictEqual(res.status, 401);
    });
  });

  describe('Public Endpoints Availability', () => {
    it('responds 200 to GET /health', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json() as any;
      assert.strictEqual(data.status, 'ok');
    });

    it('responds 200 to GET /', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.strictEqual(res.status, 200);
      const data = await res.json() as any;
      assert.strictEqual(data.name, 'ChangeFlow API');
    });
  });

  describe('Role Permissions & Access Control', () => {
    it('blocks standard users from POST /requests with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stdToken}` },
        body: JSON.stringify({ client_id: 'some-id', title: 'Developer Request' }),
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json() as any;
      assert.match(data.error, /Only admins can create change requests/i);
    });

    it('allows standard users to access approve-review without 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/requests/nonexistent-id/approve-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stdToken}` },
        body: JSON.stringify({}),
      });
      assert.notStrictEqual(res.status, 403);
      assert.strictEqual(res.status, 404);
    });

    it('allows standard users to access request-review-changes without 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/requests/nonexistent-id/request-review-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stdToken}` },
        body: JSON.stringify({ reason: 'Scope needs adjustments' }),
      });
      assert.notStrictEqual(res.status, 403);
      assert.strictEqual(res.status, 404);
    });

    it('allows standard users to post internal notes without 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/requests/nonexistent-id/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stdToken}` },
        body: JSON.stringify({ content: '' }),
      });
      assert.notStrictEqual(res.status, 403);
      assert.strictEqual(res.status, 400); // blank note content rejected with 400, not 403
    });
  });

  describe('Project Baseline Mandatory Validation', () => {
    it('rejects project creation without scope_summary with 400', async () => {
      const res = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          client_id: 'some-client-id',
          name: 'No Scope Project',
          agreed_budget: 50000,
          timeline_days: 30,
          deliverables: [{ description: 'Feature A', hours: 10 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json() as any;
      assert.match(data.error, /Scope summary is required/i);
    });

    it('rejects project creation with non-positive budget with 400', async () => {
      const res = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          client_id: 'some-client-id',
          name: 'Zero Budget Project',
          scope_summary: 'Full scope outline',
          agreed_budget: 0,
          timeline_days: 30,
          deliverables: [{ description: 'Feature A', hours: 10 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json() as any;
      assert.match(data.error, /agreed budget greater than 0/i);
    });

    it('rejects project creation with non-positive timeline with 400', async () => {
      const res = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          client_id: 'some-client-id',
          name: 'Zero Timeline Project',
          scope_summary: 'Full scope outline',
          agreed_budget: 10000,
          timeline_days: 0,
          deliverables: [{ description: 'Feature A', hours: 10 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json() as any;
      assert.match(data.error, /timeline in days greater than 0/i);
    });

    it('rejects project creation with empty deliverables with 400', async () => {
      const res = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          client_id: 'some-client-id',
          name: 'No Deliverables Project',
          scope_summary: 'Full scope outline',
          agreed_budget: 10000,
          timeline_days: 30,
          deliverables: [],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json() as any;
      assert.match(data.error, /At least one deliverable/i);
    });
  });

  describe('Weekly Velocity Reporting Accuracy', () => {
    it('returns exactly 8 trailing weeks with approved and pending counts', async () => {
      const res = await fetch(`${baseUrl}/stats/weekly-velocity`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json() as any;
      assert.ok(Array.isArray(data.weeks));
      assert.strictEqual(data.weeks.length, 8);
      for (const w of data.weeks) {
        assert.ok(typeof w.week === 'string');
        assert.ok(typeof w.approved === 'number');
        assert.ok(typeof w.pending === 'number');
      }
      const totalPending = data.weeks.reduce((sum: number, w: any) => sum + w.pending, 0);
      assert.ok(totalPending >= 3, 'Draft and pending requests must be counted in velocity pending count');
    });
  });
});

