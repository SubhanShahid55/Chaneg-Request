import { Resend } from 'resend';
import { config } from '../config.js';

const resend = new Resend(config.resendApiKey);

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

/**
 * Send the approval link email to the client contact.
 */
export async function sendApprovalEmail(
  clientEmail: string,
  clientName: string,
  requestTitle: string,
  referenceCode: string,
  approvalUrl: string
): Promise<void> {
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
export async function sendTeamNotification(
  subject: string,
  body: string
): Promise<void> {
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

export async function sendInvitationEmail(
  recipientEmail: string,
  recipientName: string,
  jobTitle: string | null,
  invitationUrl: string,
): Promise<void> {
  const safeName = escapeHtml(recipientName);
  const safeTitle = jobTitle ? escapeHtml(jobTitle) : '';
  await resend.emails.send({
    from: config.fromEmail,
    to: recipientEmail,
    subject: 'You have been invited to ChangeFlow',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#18322b"><div style="padding:28px 0;border-bottom:1px solid #dbe7e1"><strong style="font-size:24px;color:#176b57">ChangeFlow</strong></div><div style="padding:32px 0"><p style="font-size:16px">Hello ${safeName},</p><h1 style="font-size:28px;margin:12px 0">Your ChangeFlow workspace is ready</h1><p style="line-height:1.6;color:#5d7069">You have been invited${safeTitle ? ` as ${safeTitle}` : ''} to collaborate on change requests and client work.</p><a href="${invitationUrl}" style="display:inline-block;margin:20px 0;padding:13px 20px;border-radius:8px;background:#176b57;color:#fff;text-decoration:none;font-weight:bold">Accept invitation</a><p style="font-size:13px;color:#6b8178">This secure invitation link is for you only. If you were not expecting this email, you can ignore it.</p></div><div style="border-top:1px solid #dbe7e1;padding:18px 0;color:#6b8178;font-size:12px">ChangeFlow account invitation</div></div>`,
  });
}
