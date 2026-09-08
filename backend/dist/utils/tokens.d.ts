/**
 * Generate a cryptographically random approval token.
 * Format: tok_{prefix}_{random}  e.g. tok_acme_89f2a
 * The prefix is a lowercase slug derived from the client company name.
 */
export declare function generateApprovalToken(clientName: string): string;
//# sourceMappingURL=tokens.d.ts.map