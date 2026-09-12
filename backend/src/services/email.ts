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
  const safeName = escapeHtml(clientName);
  const safeTitle = escapeHtml(requestTitle);
  const safeRef = escapeHtml(referenceCode);

  await resend.emails.send({
    from: config.fromEmail,
    to: clientEmail,
    subject: `IMANT: Proposal ready for ${safeRef} (${safeTitle})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0b1c30;">
        <div style="padding: 24px 0; border-bottom: 2px solid #e2e8f0; text-align: left;">
          <img src="https://imant.com/logo.png" alt="IMANT" style="height: 32px;" />
        </div>
        <div style="padding: 32px 0;">
          <p style="font-size: 16px;">Hi ${safeName},</p>
          <p style="font-size: 16px; line-height: 1.6;">Our team has reviewed your request for <strong>${safeTitle}</strong> and prepared a detailed proposal.</p>
          <p style="font-size: 16px; line-height: 1.6;">This proposal outlines the specific deliverables, the impact on your project's timeline, and the estimated cost to complete this change.</p>
          
          <div style="background: #f8f9ff; border-left: 4px solid #4f46e5; border-radius: 4px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-weight: 600; color: #0b1c30;">${safeRef}</p>
            <p style="margin: 4px 0 0 0; color: #464555;">${safeTitle}</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">Please review the proposal at your earliest convenience. You can approve or decline the change directly through the link below.</p>
          
          <a href="${approvalUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; font-size: 16px;">
            Review Proposal
          </a>
          
          <p style="color: #777587; font-size: 13px; margin-top: 32px; line-height: 1.5;">
            This secure link is valid for 14 days. If you have any questions or need adjustments before approving, simply reply to this email or reach out to your IMANT project lead.
          </p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding: 24px 0; text-align: left;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} IMANT. Sent via ChangeFlow.</p>
        </div>
      </div>
    `,
  });
}

/**
 * Notify the IMANT team when a client approves or declines.
 */
export async function sendTeamNotification(
  subject: string,
  body: string
): Promise<void> {
  await resend.emails.send({
    from: config.fromEmail,
    to: config.teamEmail,
    subject: `[ChangeFlow] ${subject}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0b1c30;">
        <div style="padding: 32px 0;">
          ${body}
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">ChangeFlow Automated Notification</p>
        </div>
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
    subject: 'Welcome to IMANT ChangeFlow',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0b1c30;">
        <div style="padding: 24px 0; border-bottom: 2px solid #e2e8f0; text-align: left;">
          <img src="https://imant.com/logo.png" alt="IMANT" style="height: 32px;" />
        </div>
        <div style="padding: 32px 0;">
          <p style="font-size: 16px;">Hi ${safeName},</p>
          <p style="font-size: 16px; line-height: 1.6;">You have been invited${safeTitle ? ` as ${safeTitle}` : ''} to join the IMANT team on ChangeFlow.</p>
          <p style="font-size: 16px; line-height: 1.6;">ChangeFlow is our central portal for managing client change requests, from initial estimates through to final approval and delivery.</p>
          
          <a href="${invitationUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0; font-size: 16px;">
            Set up your account
          </a>
          
          <p style="color: #777587; font-size: 13px; margin-top: 32px; line-height: 1.5;">
            This is a secure, personal invitation link. If you did not expect this invitation, please ignore this email.
          </p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding: 24px 0; text-align: left;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} IMANT. Sent via ChangeFlow.</p>
        </div>
      </div>
    `,
  });
}
