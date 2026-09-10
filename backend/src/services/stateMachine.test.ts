import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidTransition,
  validateTransition,
  TransitionError,
} from './stateMachine.js';
import type { RequestStatus } from '../types.js';

describe('State Machine Transitions', () => {
  const allStatuses: RequestStatus[] = [
    'draft',
    'pending',
    'reviewing',
    'awaiting_approval',
    'approved',
    'in_progress',
    'completed',
    'declined',
  ];

  describe('Valid transitions', () => {
    const validPairs: Array<[RequestStatus, RequestStatus]> = [
      ['draft', 'reviewing'],
      ['pending', 'reviewing'],
      ['reviewing', 'awaiting_approval'],
      ['reviewing', 'pending'],
      ['awaiting_approval', 'approved'],
      ['awaiting_approval', 'declined'],
      ['approved', 'in_progress'],
      ['in_progress', 'completed'],
    ];

    for (const [from, to] of validPairs) {
      it(`allows transition from "${from}" to "${to}"`, () => {
        assert.strictEqual(isValidTransition(from, to), true);
        assert.doesNotThrow(() => validateTransition(from, to));
      });
    }
  });

  describe('Invalid transitions', () => {
    const validPairsSet = new Set([
      'draft->reviewing',
      'pending->reviewing',
      'reviewing->awaiting_approval',
      'reviewing->pending',
      'awaiting_approval->approved',
      'awaiting_approval->declined',
      'approved->in_progress',
      'in_progress->completed',
    ]);

    for (const from of allStatuses) {
      for (const to of allStatuses) {
        if (!validPairsSet.has(`${from}->${to}`)) {
          it(`rejects invalid transition from "${from}" to "${to}"`, () => {
            assert.strictEqual(isValidTransition(from, to), false);
            assert.throws(
              () => validateTransition(from, to),
              (err: unknown) => {
                assert.ok(err instanceof TransitionError);
                assert.strictEqual(err.statusCode, 409);
                assert.ok(err.message.includes(`Cannot transition from "${from}" to "${to}"`));
                return true;
              }
            );
          });
        }
      }
    }
  });

  describe('Terminal states', () => {
    it('completed is a terminal state with no outgoing transitions', () => {
      for (const target of allStatuses) {
        assert.strictEqual(isValidTransition('completed', target), false);
        assert.throws(
          () => validateTransition('completed', target),
          /terminal state/
        );
      }
    });

    it('rejects the old direct draft-to-client-approval transition', () => {
      assert.strictEqual(isValidTransition('draft', 'awaiting_approval'), false);
      assert.throws(() => validateTransition('draft', 'awaiting_approval'), TransitionError);
    });

    it('declined is a terminal state with no outgoing transitions', () => {
      for (const target of allStatuses) {
        assert.strictEqual(isValidTransition('declined', target), false);
        assert.throws(
          () => validateTransition('declined', target),
          /terminal state/
        );
      }
    });
  });
});

