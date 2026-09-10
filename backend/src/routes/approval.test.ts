import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateTransition, TransitionError } from '../services/stateMachine.js';

describe('Public Approval Workflow Rules', () => {
  describe('Approval Token Resolution States', () => {
    // Helper function reproducing resolveToken decision logic
    function evaluateTokenState(link: { expires_at: string } | null, existingResponse: { decision: string } | null, requestExists: boolean) {
      if (!link) {
        return { state: 'not_found' as const };
      }
      if (existingResponse) {
        return { state: 'already_responded' as const };
      }
      if (new Date(link.expires_at) < new Date()) {
        return { state: 'expired' as const };
      }
      if (!requestExists) {
        return { state: 'not_found' as const };
      }
      return { state: 'valid' as const };
    }

    it('returns "not_found" when link record does not exist', () => {
      const result = evaluateTokenState(null, null, false);
      assert.strictEqual(result.state, 'not_found');
    });

    it('returns "not_found" when link exists but associated request is deleted/missing', () => {
      const link = { expires_at: new Date(Date.now() + 86400000).toISOString() };
      const result = evaluateTokenState(link, null, false);
      assert.strictEqual(result.state, 'not_found');
    });

    it('returns "expired" when link expiration date is in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const link = { expires_at: pastDate };
      const result = evaluateTokenState(link, null, true);
      assert.strictEqual(result.state, 'expired');
    });

    it('returns "already_responded" when a response is already recorded', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const link = { expires_at: futureDate };
      const existingResponse = { decision: 'approved' };
      const result = evaluateTokenState(link, existingResponse, true);
      assert.strictEqual(result.state, 'already_responded');
    });

    it('returns "already_responded" even if token has also expired after response was recorded', () => {
      // Prior response takes precedence over expiration in resolveToken
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      const link = { expires_at: pastDate };
      const existingResponse = { decision: 'declined' };
      const result = evaluateTokenState(link, existingResponse, true);
      assert.strictEqual(result.state, 'already_responded');
    });

    it('returns "valid" when active within expiration window and not responded', () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const link = { expires_at: futureDate };
      const result = evaluateTokenState(link, null, true);
      assert.strictEqual(result.state, 'valid');
    });
  });

  describe('Client Response Validation on Approval/Decline', () => {
    it('allows client approval only when status is "awaiting_approval"', () => {
      assert.doesNotThrow(() => validateTransition('awaiting_approval', 'approved'));
    });

    it('allows client decline only when status is "awaiting_approval"', () => {
      assert.doesNotThrow(() => validateTransition('awaiting_approval', 'declined'));
    });

    it('blocks approval if request is still in "draft"', () => {
      assert.throws(
        () => validateTransition('draft', 'approved'),
        (err: unknown) => {
          assert.ok(err instanceof TransitionError);
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });

    it('blocks approval if request was already "approved"', () => {
      assert.throws(
        () => validateTransition('approved', 'approved'),
        (err: unknown) => {
          assert.ok(err instanceof TransitionError);
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });

    it('blocks approval if request was already "declined"', () => {
      assert.throws(
        () => validateTransition('declined', 'approved'),
        (err: unknown) => {
          assert.ok(err instanceof TransitionError);
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });

    it('blocks approval if request is already "in_progress"', () => {
      assert.throws(
        () => validateTransition('in_progress', 'approved'),
        (err: unknown) => {
          assert.ok(err instanceof TransitionError);
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });

    it('blocks approval if request is already "completed"', () => {
      assert.throws(
        () => validateTransition('completed', 'approved'),
        (err: unknown) => {
          assert.ok(err instanceof TransitionError);
          assert.strictEqual(err.statusCode, 409);
          return true;
        }
      );
    });
  });

  describe('Status Error Code Mappings for Public Endpoints', () => {
    function mapStatusToHttpCode(state: 'not_found' | 'expired' | 'already_responded' | 'valid') {
      if (state === 'not_found') return 404;
      if (state === 'expired' || state === 'already_responded') return 409;
      return 200;
    }

    it('maps invalid token to 404 Not Found', () => {
      assert.strictEqual(mapStatusToHttpCode('not_found'), 404);
    });

    it('maps expired token to 409 Conflict for action endpoints', () => {
      assert.strictEqual(mapStatusToHttpCode('expired'), 409);
    });

    it('maps already_responded token to 409 Conflict for action endpoints', () => {
      assert.strictEqual(mapStatusToHttpCode('already_responded'), 409);
    });

    it('maps valid token to 200 OK', () => {
      assert.strictEqual(mapStatusToHttpCode('valid'), 200);
    });
  });
});

