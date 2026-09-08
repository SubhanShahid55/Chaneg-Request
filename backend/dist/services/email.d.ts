/**
 * Send the approval link email to the client contact.
 */
export declare function sendApprovalEmail(clientEmail: string, clientName: string, requestTitle: string, referenceCode: string, approvalUrl: string): Promise<void>;
/**
 * Notify the Momentum Studio team when a client approves or declines.
 */
export declare function sendTeamNotification(subject: string, body: string): Promise<void>;
//# sourceMappingURL=email.d.ts.map