import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';

describe('HTTP API Security & Route Integration Tests', () => {
  let server: Server;
  let baseUrl: string;

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
});

