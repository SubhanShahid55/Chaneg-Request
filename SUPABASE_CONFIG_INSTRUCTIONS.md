# Supabase Production Configuration Instructions

As part of the deployment to production, the following Supabase settings must be manually updated in the Supabase Dashboard. 

## 1. Authentication Redirect URLs
The authentication emails (Magic Links, Invites, Resets) currently redirect to `http://localhost:3000`. This must be updated to the production domain.

1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** > **URL Configuration**.
3. Under **Site URL**, change `http://localhost:3000` to `https://changeflow.imant.com` (or your actual production domain).
4. Under **Redirect URLs**, add any valid callback routes, such as `https://changeflow.imant.com/auth/callback` or `https://changeflow.imant.com/**`.

## 2. Custom SMTP Settings
By default, Supabase sends auth emails from `noreply@mail.app.supabase.io`. To establish IMANT branding and improve deliverability, configure a custom SMTP server.

1. Go to **Project Settings** > **Authentication**.
2. Scroll down to **Custom SMTP**.
3. Enable Custom SMTP.
4. Fill in your SMTP provider details (e.g., Resend, SendGrid, Amazon SES):
   - **Sender Name**: IMANT
   - **Sender Email**: `noreply@imant.com`
   - **Host**: `smtp.yourprovider.com`
   - **Port**: `465` (or `587`)
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password
5. Save the configuration.

## 3. Email Templates (Optional but recommended)
While the backend explicitly handles custom application emails (`backend/src/services/email.ts`), Supabase still controls its own Auth templates (like Password Reset or Invite).

1. Go to **Authentication** > **Email Templates**.
2. Update the branding for the following templates to match IMANT:
   - Invite User
   - Magic Link
   - Reset Password

*Note: The frontend code now exclusively points to IMANT email addresses globally.*

