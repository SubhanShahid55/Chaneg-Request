import type { RequestStatus } from '../types.js';

/**
 * Explicit allowed transitions for the change-request state machine.
 * The key is the current status; the value is the list of statuses it can move to.
 */
const TRANSITIONS: Record<string, RequestStatus[]> = {
  draft:              ['awaiting_approval'],
  pending:            ['awaiting_approval'],
  awaiting_approval:  ['approved', 'declined'],
  approved:           ['in_progress'],
  in_progress:        ['completed'],
  // completed and declined are terminal — no outgoing transitions
};

/**
 * Returns true if the transition from `current` to `target` is allowed.
 */
export function isValidTransition(current: RequestStatus, target: RequestStatus): boolean {
  const allowed = TRANSITIONS[current];
  return !!allowed && allowed.includes(target);
}

/**
 * Throws a descriptive error if the transition is not allowed.
 */
export function validateTransition(current: RequestStatus, target: RequestStatus): void {
  if (!isValidTransition(current, target)) {
    throw new TransitionError(
      `Cannot transition from "${current}" to "${target}". ` +
      `Allowed transitions from "${current}": ${TRANSITIONS[current]?.join(', ') || 'none (terminal state)'}.`
    );
  }
}

export class TransitionError extends Error {
  public readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'TransitionError';
  }
}
