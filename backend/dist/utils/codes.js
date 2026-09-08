import crypto from 'node:crypto';
/**
 * Generate a confirmation code like CF-9712.
 */
export function generateConfirmationCode() {
    const num = crypto.randomInt(1000, 9999);
    return `CF-${num}`;
}
//# sourceMappingURL=codes.js.map