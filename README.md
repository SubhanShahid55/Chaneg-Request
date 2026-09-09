# ChangeFlow - Change Request Tracker

> **Precision Modern SaaS Application** built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS**. Designed for software agencies to rapidly capture client change requests from Slack/Jira/Email, attach scope/cost/timeline estimates, and dispatch interactive tokenized client approval links.

---

## 🚀 Getting Started

The UI now starts at a login screen, reads from the authenticated backend, and does not seed demo records. Set these values before starting the services:

```env
# backend/.env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=https://change-flow-eight.vercel.app

# frontend/.env.local
NEXT_PUBLIC_API_URL=https://chaneg-flow-backend.vercel.app
```

For Vercel, create the frontend project with `frontend` as its **Root Directory**. Create the backend as a separate project with `backend` as its **Root Directory**. The frontend project should have `NEXT_PUBLIC_API_URL` set to the deployed backend URL, and the backend project should have `CORS_ORIGINS` set to `https://change-flow-eight.vercel.app`.

The frontend receives a Supabase access token from `POST /auth/login` and stores only the session token in the existing client session mechanism. Redis is used for short-lived request/stat caches and safely falls back to direct Supabase reads when unavailable. Activity notifications refresh from the database every five seconds.

Run migrations `001_initial_schema.sql` and `002_roles_and_profile_storage.sql` in Supabase. The first administrator must be created in Supabase Auth and then assigned `role = 'admin'` in `profiles`; administrators can invite subsequent users from `/admin`. Profile images are uploaded to the private `profile-pictures` bucket through the admin API and are never committed to the repository.

Run `003_profile_job_title.sql` before using the invitation form. `role` remains the protected access level (`admin` or `standard`); `job_title` is the human-readable role or title, such as `Project manager` or `Other`. For branded invitation emails, configure a real `RESEND_API_KEY` and a verified `FROM_EMAIL` in the backend deployment. Without those values, Supabase sends its default invitation email.

To reset development or staging data while preserving active administrators, manually run `backend/supabase/reset_dev_data.sql` in the Supabase SQL Editor. It removes requests, clients, projects, activities, approvals, and non-admin accounts, and stops if no active admin profile exists. This file is intentionally outside the migrations directory so normal deployments never execute it automatically.

### 1. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Build for Production
```bash
npm run build
npm start
```

---

## 📱 Implemented Screens & Routes

| # | Screen Name | Route | Description |
|---|---|---|---|
| **1** | **ChangeFlow - Agency Dashboard** | [`/`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/page.tsx) | Velocity intake charts, stat matrix (Total Requests, Pending Approval, Approved, Total Value), filter tabs, live search, CSV export, and change request table. |
| **2** | **ChangeFlow Logo Asset** | [`/design-system`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/design-system/page.tsx) | Scalable SVG mark & PNG preview with vector download. |
| **3** | **Change Request Tracker Spec** | [`/design-system`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/design-system/page.tsx) | Architecture specification, library overview, data model, and integration goals. |
| **5** | **Design System** | [`/design-system`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/design-system/page.tsx) | Precision Modern SaaS palette, typography scale (Geist + JetBrains Mono), spacing, elevation tiers, and status badges. |
| **2** | **ChangeFlow Logo Asset** | [`public/assets/logo.svg`](file:///c:/Users/CT/Desktop/Chaneg%20Request/public/assets/logo.svg) | Scalable vector brand logo. |
| **3** | **Change Request Tracker Spec** | [`stitch_raw/code/03_tracker_spec.md`](file:///c:/Users/CT/Desktop/Chaneg%20Request/stitch_raw/code/03_tracker_spec.md) | Architecture specification & data layer overview. |
| **5** | **Design System Specification** | [`stitch_raw/code/05_design_system.md`](file:///c:/Users/CT/Desktop/Chaneg%20Request/stitch_raw/code/05_design_system.md) | Precision Modern SaaS palette, typography scale, and elevation tiers. |
| **6** | **ChangeFlow - Agency Sign In** | [`/login`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/login/page.tsx) | Team portal login with quick-fill testing credentials, Google Workspace auth, and SOC2/Supabase hooks. |
| **7** | **Request Detail & Scope Estimate** | [`/requests/CR-1042`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/requests/[id]/page.tsx) | Deep-dive scope editor with real-time hour steppers, live rate calculations ($3,600 USD), Slack quote excerpt, deliverables breakdown, exclusions, and dispatch triggers. |
| **8** | **Client Approval (Mobile)** | [`/approval/CR-1042`](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/app/approval/[id]/page.tsx) | Responsive client view with mobile frame preview toggle, 256-bit token ribbon, terms agreement, interactive authorization with loading animation, revision request flow, and signed confirmation state `#CF-9821`. |
| **9** | **Dashboard with Slide-over Panel** | [`/` (Press `N` or click "+ New Request")](file:///c:/Users/CT/Desktop/Chaneg%20Request/src/components/SlideoverDrawer.tsx) | Smooth slide-in panel to capture new requests with client selector, intake channel picker, urgency pills, and instant scope generation. |

---

## 📦 Raw Stitch Assets & Code

All raw downloads from Stitch Project ID `18075879198080234593` are preserved locally:
- **Screenshots**: [`stitch_raw/screenshots/`](file:///c:/Users/CT/Desktop/Chaneg%20Request/stitch_raw/screenshots/)
- **Original HTML / SVG / Markdown**: [`stitch_raw/code/`](file:///c:/Users/CT/Desktop/Chaneg%20Request/stitch_raw/code/)

