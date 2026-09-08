import { Resend } from 'resend';
import { config } from '../config.js';
const resend = new Resend(config.resendApiKey);
/**
 * Send the approval link email to the client contact.
 */
export async function sendApprovalEmail(clientEmail, clientName, requestTitle, referenceCode, approvalUrl) {
    await resend.emails.send({
        from: config.fromEmail,
        to: clientEmail,
        subject: `Action Required: Approve change request ${referenceCode}`,
        html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0b1c30;">Change Request Ready for Your Approval</h2>
        <p>Hi ${clientName},</p>
        <p>A change request has been prepared for your review:</p>
        <div style="background: #f8f9ff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600; color: #0b1c30;">${referenceCode}: ${requestTitle}</p>
        </div>
        <p>Please review the details and approve or decline using the link below:</p>
        <a href="${approvalUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Review &amp; Approve
        </a>
        <p style="color: #777587; font-size: 14px; margin-top: 24px;">
          This link expires in 14 days. If you have questions, reply to this email or contact your project lead directly.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Momentum Studio · Sent via ChangeFlow</p>
      </div>
    `,
    });
}
/**
 * Notify the Momentum Studio team when a client approves or declines.
 */
export async function sendTeamNotification(subject, body) {
    await resend.emails.send({
        from: config.fromEmail,
        to: config.teamEmail,
        subject,
        html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${body}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">ChangeFlow Notification</p>
      </div>
    `,
    });
}
//# sourceMappingURL=email.js.map