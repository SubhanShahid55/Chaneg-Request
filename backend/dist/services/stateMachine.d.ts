import type { RequestStatus } from '../types.js';
/**
 * Returns true if the transition from `current` to `target` is allowed.
 */
export declare function isValidTransition(current: RequestStatus, target: RequestStatus): boolean;
/**
 * Throws a descriptive error if the transition is not allowed.
 */
export declare function validateTransition(current: RequestStatus, target: RequestStatus): void;
export declare class TransitionError extends Error {
    readonly statusCode = 409;
    constructor(message: string);
}
//# sourceMappingURL=stateMachine.d.ts.map