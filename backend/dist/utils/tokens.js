import crypto from 'node:crypto';
/**
 * Generate a cryptographically random approval token.
 * Format: tok_{prefix}_{random}  e.g. tok_acme_89f2a
 * The prefix is a lowercase slug derived from the client company name.
 */
export function generateApprovalToken(clientName) {
    const prefix = clientName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8);
    const random = crypto.randomBytes(4).toString('hex').slice(0, 5);
    return `tok_${prefix}_${random}`;
}
//# sourceMappingURL=tokens.js.map