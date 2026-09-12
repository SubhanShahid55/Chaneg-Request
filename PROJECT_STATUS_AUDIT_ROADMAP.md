# ChangeFlow — Comprehensive Project Audit, Status & Roadmap

> **Date:** September 12, 2026  
> **Repository:** `Chaneg Request`  
> **Tech Stack:** Next.js 16 (React 19, Tailwind CSS v4, TypeScript), Express 5 API (Node.js, TypeScript), Supabase (PostgreSQL + Auth + Storage), Redis (Caching layer), Resend (Transactional Email).

---

## 1. Executive Summary

**ChangeFlow** is a specialized SaaS platform designed for digital agencies, consultancies, and software development shops to manage scope creep and formalize change requests. It bridges informal client requests (from Slack, Jira, email, or client portal submissions) into structured, commercial scope estimates that are authorized via interactive tokenized approval links or client portal dashboards.

The project consists of three main tiers:
1. **Database & Auth (Supabase PostgreSQL)**: 12 migration files establishing 12 tables, Row-Level Security (RLS), custom triggers, private storage buckets, and relational constraints.
2. **Backend API (Express 5 + TypeScript)**: RESTful API enforcing a strict 8-stage state machine, role-based access control (`admin`, `standard`, `client`), Redis caching with PostgreSQL fallbacks, and transactional Resend email dispatch.
3. **Frontend Application (Next.js 16 App Router + Tailwind CSS v4)**: A dual-experience web app providing:
   - An internal agency workspace (Intake Drawer, Request Editor, Deliverable Scope Estimator, Project Baseline Rollups, Team Admin, Analytics & Reports).
   - A client-facing experience (Zero-friction unauthenticated tokenized approval portal & authenticated client project portal).

---

## 2. What Has Been Built So Far

### 2.1 Database & Supabase Schema
The database contains **12 migrations** located in `backend/supabase/migrations/`:

| Migration | Key Functionality Added |
|---|---|
| `001_initial_schema.sql` | Core tables: `profiles`, `clients`, `projects`, `change_requests`, `deliverables`, `exclusions`, `notes`, `approval_links`, `approval_responses`, `activity_events`. RLS enabled on all tables. |
| `002_roles_and_profile_storage.sql` | Adds `is_active` to `profiles`, enforces role check (`admin`, `standard`), creates private `profile-pictures` storage bucket. |
| `003_profile_job_title.sql` | Adds `job_title` to `profiles`. |
| `004_profile_on_auth_signup.sql` | Creates PostgreSQL trigger `handle_new_user()` on `auth.users` to automatically populate `public.profiles`. |
| `005_invitation_storage_policies.sql` | Configures storage RLS policies for `profile-pictures` bucket. |
| `006_invitation_lifecycle_and_avatar_metadata.sql` | Adds user lifecycle tracking (`status`, `onboarding_completed`, `invited_at`, `avatar_path`, `avatar_mime_type`, etc.). |
| `007_target_delivery_date_to_text.sql` | Converts `target_delivery_date` in `change_requests` from date to text (supports sprint names). |
| `008_reviewing_status.sql` | Updates `status` check constraint to include `reviewing` internal developer review stage. |
| `009_projects_and_deliverable_complexity.sql` | Adds project baseline fields (`scope_summary`, `agreed_budget`, `timeline_days`), adds `complexity` (`simple`, `standard`, `complex`) to deliverables, and creates `project_deliverables` table. |
| `010_drop_request_cost.sql` | Drops static `hours` and `cost` columns from `change_requests` in favor of dynamic rollup from `deliverables`. |
| `011_client_portal.sql` | Adds `client_users` table, `request_attachments` table, private `request-attachments` bucket, updates `source_channel` check to include `'portal'`, and configures client-scoped RLS policies. |
| `012_project_status.sql` | Adds `status` column to `projects` (`Active`, `On Hold`, `Completed`). |

---

### 2.2 Backend API Architecture (Express 5)

Mounted in `backend/src/index.ts`:

- **Authentication & Profiles (`/auth`, `/profile`)**:
  - `POST /auth/login`: Authenticates agency users (`profiles`) and client users (`client_users`) via Supabase Auth.
  - `POST /auth/session`: Validates Supabase JWT, auto-provisions profile if missing.
  - `POST /auth/refresh`: Session refresh via Supabase Auth.
  - `POST /auth/password`: Completes invitation flow by setting password, name, and job title.
  - `POST /auth/forgot-password` & `POST /auth/update-password`: Password recovery.
  - `PATCH /profile`: Updates profile name and job title.
  - `POST /profile/avatar` & `DELETE /profile/avatar`: Uploads and validates avatar image (magic byte validation for PNG, JPG, WebP; 5MB limit; private signed URLs).

- **Change Requests (`/requests`)**:
  - `GET /requests`: Paginated list with search, status filters, and 15s Redis caching.
  - `GET /requests/:id`: Full details, parallel-fetching deliverables, exclusions, internal notes, approval links, response, client, project, activity events, and attachments.
  - `POST /requests`: Intake creation with reference code generation (`CR-1042`, etc.), deliverables, and exclusions.
  - `PATCH /requests/:id`: Updates basic fields (title, quote, channel, priority).
  - `PATCH /requests/:id/estimate`: Commercial scope editor persisting hourly rate, deliverables, and exclusions, recalculating cost.
  - `POST /requests/:id/send-for-approval`: Moves status `draft`/`pending` ➔ `reviewing`.
  - `POST /requests/:id/approve-review`: Admin approval moving `reviewing` ➔ `awaiting_approval`, generating 14-day cryptographic approval token and dispatching Resend email.
  - `POST /requests/:id/request-review-changes`: Moves `reviewing` ➔ `pending` with note logged.
  - `POST /requests/:id/advance`: Advances `approved` ➔ `in_progress` ➔ `completed`.
  - `POST /requests/:id/notes`: Logs internal team discussion with actor attribution.
  - `GET /requests/:id/activity`: Full chronological audit trail.
  - `GET /requests/export`: CSV download of change requests.

- **Public Client Approval (`/approval`)**:
  - Protected by IP rate limiter (20 requests/minute).
  - `GET /approval/:token`: Validates token expiration (14 days) and response state. Logs `viewed_by_client` event on first open.
  - `POST /approval/:token/approve`: Authorizes quote, generates confirmation code (e.g. `CF-4921`), transitions status to `approved`, sends internal team email alert.
  - `POST /approval/:token/decline`: Rejects quote with client feedback, transitions status to `declined`, sends team email alert.

- **Client Portal (`/portal`)**:
  - Authenticated via `requireClientAuth` (checks `client_users` table).
  - `GET /portal/project`: Current project baseline and rollup calculations.
  - `GET /portal/requests` & `GET /portal/requests/:id`: Client's requests with proposal details and signed attachment URLs.
  - `POST /portal/requests`: Inbound client request intake with base64 attachment upload.
  - `POST /portal/requests/:id/approve` & `POST /portal/requests/:id/decline`: Client authorization directly in the portal.

- **Projects & Baseline Scope (`/projects`)**:
  - `GET /projects` & `GET /projects/:id`: Projects with client info, original deliverables, approved change requests, and rollup metrics (`calculateProjectRollup`).
  - `POST /projects`: Creates project with baseline deliverables, agreed budget, and timeline.

- **Administration (`/admin`)**:
  - Restricted by `requireAdmin`.
  - `GET /admin/users`: Lists internal team members with invite status, last login, and roles.
  - `POST /admin/users`: Invites new team members via Resend or Supabase Auth link.
  - `PATCH /admin/users/:id`: Updates user role, name, or active status.
  - `POST /admin/users/:id/resend-invite`: Regenerates and emails invite link.
  - `POST /admin/clients/:clientId/invite`: Generates client portal access invite.

- **Analytics, Reports & SSE (`/stats`, `/events`)**:
  - `/stats/summary`, `/stats/weekly-velocity`, `/stats/weekly-intake`, `/stats/status-breakdown`.
  - `/events/recent` & `/events/stream` (SSE stream for live updates).

- **Automated Tests**:
  - 87 unit tests passing across state machine transitions, estimate calculations, project rollups, and approval token resolution rules.

---

### 2.3 Frontend Application (Next.js 16 App Router)

- **Routing Structure**:
  - `/login`: Team login with email/password.
  - `/dashboard`: Main agency workspace with KPI summary cards, interactive SVG velocity intake chart, and quick request table.
  - `/requests`: Full filterable, searchable, and sortable request table with status pills, priority badges, and CSV export.
  - `/requests/[id]`: Interactive scope builder with real-time hours/cost steppers, category pickers, exclusions list, developer review approval actions, client link copy, internal note thread, and activity timeline.
  - `/projects` & `/projects/[id]`: Client project portfolio, original baseline scope items vs. approved change requests, and budget/timeline variance rollup metrics.
  - `/admin`: Team user administration, invitation sending, role switching (`admin` vs `standard`), and account deactivation.
  - `/reports`: Pipeline valuation overview, volume charts, and request breakdown.
  - `/notifications`: Dedicated notifications list with unread indicators and "mark all read" functionality.
  - `/approval/[id]`: Responsive client approval view with interactive authorization, confirmation code generation, revision feedback flow, and print-ready summary.
  - `/portal`, `/portal/login`, `/portal/requests`, `/portal/requests/new`, `/portal/requests/[id]`: Authenticated client portal for viewing project baseline, submitting requests with file uploads, and reviewing quotes.
  - `/accept-invite`, `/reset-password`, `/set-password`, `/forgot-password`: Account setup and password recovery screens.

- **Component Library**:
  - `Header.tsx`: Collapsible responsive sidebar, global search bar, notification bell dropdown with unread badge, and user logout.
  - `SlideoverDrawer.tsx`: Multi-step intake drawer (accessible via `N` key) with client picker, inline project creation, raw quote capture, and initial deliverable estimation.
  - `StatusStepper.tsx`: Visual progress indicator across the 8 lifecycle stages.
  - `ActivityTimeline.tsx`: Detailed audit trail distinguishing agency vs. client actions.
  - `CommandPalette.tsx`: Global search and shortcut navigation modal.
  - `ProfileSettingsModal.tsx` & `AvatarUpload.tsx`: Profile editing and image upload modal.
  - `AuthGate.tsx`: Route protection and session validation redirecting unauthenticated users.

---

## 3. Potential Loopholes, Vulnerabilities & Bugs Found

During our comprehensive audit of backend, frontend, and database code, we identified **16 specific loopholes, vulnerabilities, and defects**:

### 🔴 Critical & Security Loopholes

#### 1. Public Approval Token Enumeration Bypass
- **Location:** `backend/src/routes/approval.ts` (lines 27–43)
- **Vulnerability:**
  ```typescript
  if (error || !link) {
    const { data: request } = await supabaseAdmin
      .from('change_requests')
      .select('id')
      .eq('reference_code', token)
      .single();
    if (request) { ... }
  }
  ```
- **Risk:** If a request's 256-bit token is not provided, the route accepts the change request's `reference_code` (e.g. `CR-1042`) in place of the secret token. Because reference codes are sequential integers (`CR-1042`, `CR-1043`, `CR-1044`...), **anyone on the public internet can enumerate reference codes and view, approve, or decline any change request without knowing the secret token!**

#### 2. Database Trigger Makes Every Client an Internal User in RLS
- **Location:** `backend/supabase/migrations/004_profile_on_auth_signup.sql` and `011_client_portal.sql`
- **Vulnerability:**
  `004_profile_on_auth_signup.sql` attaches a trigger `on_auth_user_created` to `auth.users` that automatically inserts a row into `public.profiles` for *every* new user with `is_active = true` and `role = 'standard'`.
  Meanwhile, `011_client_portal.sql` defines:
  ```sql
  CREATE OR REPLACE FUNCTION is_internal_user()
  RETURNS boolean AS $$
  BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
- **Risk:** When a client is invited to the client portal (`client_users`), the trigger creates a record in `public.profiles` for them as well! Consequently, `is_internal_user()` evaluates to `TRUE` for all client users. **Client users bypass RLS and can read internal team notes, agency profiles, and all other clients' change requests!**

#### 3. Unprotected Profile Route Mounting
- **Location:** `backend/src/index.ts` (lines 60–61)
- **Vulnerability:**
  `app.use('/auth', authRoutes)` and `app.use('/profile', requireAuth, authRoutes)` both mount `authRoutes`. In `auth.ts`, `router.patch('/')` and `router.post('/avatar')` are at the router root. If requested via `/auth/`, `requireAuth` is skipped.

---

### 🟠 High-Impact Functional & Compilation Bugs

#### 4. Backend TypeScript Compilation Failure (`npm run build` Fails)
- **Location:** `backend/src/routes/requests.ts` (lines 302–303) and `backend/src/services/email.ts` (lines 27–28, 88–89, 121–122)
- **Defect:** Object literals contain duplicate keys:
  - `hourly_rate` repeated twice in `requests.ts`
  - `subject` and `html` repeated twice in `email.ts`
- **Impact:** `tsc` throws `TS1117: An object literal cannot have multiple properties with the same name.` The backend **fails production build** (`npm run build` exits with code 1).

#### 5. Dropped `hours` and `cost` Columns Breaking Requests Workflow
- **Location:** `backend/supabase/migrations/010_drop_request_cost.sql` vs. backend & frontend code
- **Defects:**
  - Migration 010 removed `hours` and `cost` from `change_requests`.
  - In `backend/src/routes/requests.ts` (lines 304–305), `POST /requests` attempts to insert `{ hours: estimate.hours, cost: estimate.cost }` into `change_requests`, which fails if columns don't exist in Supabase.
  - In `backend/src/routes/requests.ts` (line 490):
    ```typescript
    if (!request.hourly_rate || !request.hours || !request.target_delivery_date)
    ```
    Since `request.hours` is now null/undefined on the row, **`POST /:id/send-for-approval` ALWAYS fails with "Estimate is incomplete"!**
  - In `backend/src/routes/portal.ts` (line 48), `select('..., hours, ...')` references the dropped column.
  - In `frontend/src/app/portal/requests/[id]/page.tsx` (line 101), `hasProposal` checks `request.hours !== null`, so proposals never render in the client portal.

#### 6. Double HTTP Response Crash in `GET /events/recent`
- **Location:** `backend/src/routes/events.ts` (lines 16 & 26)
- **Defect:**
  ```typescript
  res.json({ events: data ?? [] });
  // ...
  res.json({ events: mapped });
  ```
- **Impact:** Calling `res.json()` twice causes Express to throw `ERR_HTTP_HEADERS_SENT` ("Cannot set headers after they are sent to the client") on every single request to `/events/recent`.

#### 7. Double Event Emission in SSE Stream
- **Location:** `backend/src/routes/events.ts` (lines 50 & 59)
- **Defect:**
  ```typescript
  send({ type: 'activity', event });
  // ...
  send({ type: 'activity', event: mappedEvent });
  ```
- **Impact:** Every activity notification is broadcast twice over the SSE connection to all connected clients.

#### 8. SSE Browser Connection Always Fails (401 Unauthorized)
- **Location:** `backend/src/index.ts` (line 67) vs. `frontend/src/lib/store.tsx` (line 174)
- **Defect:** Backend requires `requireAuth` (`Authorization: Bearer <token>`) on `/events/stream`. The browser `EventSource` API (`new EventSource('/events/stream')`) does not support passing custom HTTP headers.
- **Impact:** SSE connection immediately fails with 401 Unauthorized in every browser session, silently closing and forcing the frontend into fallback 5-second polling.

#### 9. Missing Database Function `next_change_request_code`
- **Location:** `backend/src/routes/portal.ts` (line 101)
- **Defect:** Calls `supabaseAdmin.rpc('next_change_request_code')`. No migration ever created this PostgreSQL function. It falls back to `Math.floor(Math.random() * 10000)`, risking duplicate key collisions on `change_requests.reference_code`.

#### 10. Broken CSV Export Route on Requests Page
- **Location:** `frontend/src/app/requests/page.tsx` (line 61) vs. `backend/src/routes/requests.ts` (line 66)
- **Defect:** Frontend requests `${API_BASE_URL}/requests/export.csv`. Backend only defines `/export`.
- **Impact:** Express matches `/requests/:id` with `id = 'export.csv'`, returning a `404 Not Found: Change request "export.csv" was not found.`

---

### 🟡 Medium Gaps & Polish Issues

#### 11. `reviewing` Status Vanishes from Dashboard & Velocity Stats
- **Location:** `backend/src/routes/stats.ts`
- **Defect:** Switch statements in `/stats/summary`, `/stats/weekly-velocity`, and `/stats/weekly-intake` handle `draft` and `pending`, but omit `reviewing`.
- **Impact:** Once a request is sent for internal developer review, it disappears from "Needs my review", intake velocity, and charts until approved.

#### 12. No Client User Invitation UI in the Frontend
- **Location:** `frontend/src/app/admin/page.tsx`
- **Defect:** While backend provides `POST /admin/clients/:clientId/invite`, the frontend admin screen only allows inviting internal team members (`admin`/`standard`). There is no UI button to invite client stakeholders to their portal.

#### 13. Request Detail Shows "Not Found" on Direct Page Refresh
- **Location:** `frontend/src/app/requests/[id]/page.tsx` (lines 20–21, 67–124)
- **Defect:** The page only reads from in-memory state via `useApp().getRequestById(id)`. It does not call `fetchRequest(id)` as a fallback when loading a direct link or refreshing. If a request is outside the first 100 loaded requests, it falsely displays "Change Request Not Found".

#### 14. Corrupted Email Templates in Resend Service
- **Location:** `backend/src/services/email.ts`
- **Defect:** Merged legacy email HTML templates created malformed HTML with duplicate `<div>` containers, missing tags, and contradictory agency branding ("Momentum Studio" vs. "IMANT").

#### 15. Redis Pattern Invalidation Array Flaw
- **Location:** `backend/src/services/cache.ts` (lines 45–52)
- **Defect:** `for await (const key of redis.scanIterator(...))` executes `keys.push(...key)`. When `key` is a string, spreading it pushes individual characters into `keys`, instructing Redis to delete single letters.

#### 16. Hardcoded Fallbacks in Public Approval View
- **Location:** `frontend/src/app/approval/[id]/page.tsx` (lines 174, 177)
- **Defect:** Expired state hardcodes "Please ask Sarah" and `mailto:info@imant.com` instead of dynamically referencing the agency lead or client contact.

---

## 4. What Needs to be Done (Roadmap & Action Items)

### Phase 1: Critical Security & Compilation Fixes (Immediate Priority)
- [ ] **Fix Backend Build Errors**: Remove duplicate object keys in `backend/src/routes/requests.ts` and `backend/src/services/email.ts` so `npm run build` compiles cleanly.
- [ ] **Close Approval Token Enumeration**: In `backend/src/routes/approval.ts`, strictly require the 256-bit approval token. Remove the fallback to `reference_code`.
- [ ] **Fix Database User Trigger & RLS**:
- [x] **Fix Backend Build Errors**: Remove duplicate object keys in `backend/src/routes/requests.ts` and `backend/src/services/email.ts` so `npm run build` compiles cleanly.
- [x] **Close Approval Token Enumeration**: In `backend/src/routes/approval.ts`, strictly require the 256-bit approval token. Remove the fallback to `reference_code`.
- [x] **Fix Database User Trigger & RLS**:
  - Update `handle_new_user()` in PostgreSQL to ignore users who have metadata `is_client = true`.
  - Ensure client users only exist in `client_users` and cannot satisfy `is_internal_user()`.
- [ ] **Fix Dropped `hours`/`cost` Logic in Backend**:
- [x] **Fix Dropped `hours`/`cost` Logic in Backend**:
  - In `POST /requests`, remove `hours` and `cost` insert fields.
  - In `POST /requests/:id/send-for-approval`, calculate total hours by querying `deliverables` instead of checking `request.hours`.
  - In `portal.ts`, calculate hours from deliverables.
- [ ] **Fix Double Response in Events**: In `backend/src/routes/events.ts`, remove the early `res.json()` on line 16 and duplicate SSE `send()` on line 50.
- [x] **Fix Double Response in Events**: In `backend/src/routes/events.ts`, remove the early `res.json()` on line 16 and duplicate SSE `send()` on line 50.

---

### Phase 2: Functional Gaps & Workflow Integrity
- [ ] **Fix CSV Export Route**: Add route alias `GET /requests/export.csv` in `backend/src/routes/requests.ts` (or align frontend to `/requests/export`).
- [ ] **Create Database Sequence RPC**: Add migration creating `next_change_request_code()` function using `change_request_code_seq` to safely generate sequential codes in portal submissions.
- [ ] **Add `reviewing` to Stats Calculations**: Update `stats.ts` to categorize `reviewing` under `needs_review` and `pending` velocity.
- [ ] **Fix SSE Authentication**: Pass a short-lived token via query param (e.g. `/events/stream?token=...`) in `backend/src/routes/events.ts` and validate it, allowing browser `EventSource` to establish a persistent real-time connection.
- [ ] **Fix Direct Request Loading in Frontend**: In `frontend/src/app/requests/[id]/page.tsx`, add a `useEffect` that calls `fetchRequest(id)` if the request is not found in local context state.
- [ ] **Fix Redis Scan Invalidation**: In `backend/src/services/cache.ts`, push `key` as a string without spreading it.
- [x] **Fix CSV Export Route**: Add route alias `GET /requests/export.csv` in `backend/src/routes/requests.ts` (or align frontend to `/requests/export`).
- [x] **Create Database Sequence RPC**: Add migration creating `next_change_request_code()` function using `change_request_code_seq` to safely generate sequential codes in portal submissions.
- [x] **Add `reviewing` to Stats Calculations**: Update `stats.ts` to categorize `reviewing` under `needs_review` and `pending` velocity.
- [x] **Fix SSE Authentication**: Pass a short-lived token via query param (e.g. `/events/stream?token=...`) in `backend/src/routes/events.ts` and validate it, allowing browser `EventSource` to establish a persistent real-time connection.
- [x] **Fix Direct Request Loading in Frontend**: In `frontend/src/app/requests/[id]/page.tsx`, add a `useEffect` that calls `fetchRequest(id)` if the request is not found in local context state.
- [x] **Fix Redis Scan Invalidation**: In `backend/src/services/cache.ts`, push `key` as a string without spreading it.

---

### Phase 3: Client Portal & UI Completion
- [ ] **Client User Invite UI**: Add a "Client Users" tab or section under `/admin` or in Client details to send portal invites via `POST /admin/clients/:clientId/invite`.
- [ ] **Clean Up Email Templates**: Clean and unify HTML templates in `backend/src/services/email.ts` with consistent branding tokens.
- [ ] **Dynamic Agency Contact on Approval Page**: Replace hardcoded "Sarah" and `info@imant.com` with the actual project lead's name and email from the change request record.
- [ ] **Portal Proposal Rendering**: In `frontend/src/app/portal/requests/[id]/page.tsx`, calculate deliverables hours and display the commercial proposal accurately.
- [x] **Client User Invite UI**: Add a "Client Users" tab or section under `/admin` or in Client details to send portal invites via `POST /admin/clients/:clientId/invite`.
- [x] **Clean Up Email Templates**: Clean and unify HTML templates in `backend/src/services/email.ts` with consistent branding tokens.
- [x] **Dynamic Agency Contact on Approval Page**: Replace hardcoded "Sarah" and `info@imant.com` with the actual project lead's name and email from the change request record.
- [x] **Portal Proposal Rendering**: In `frontend/src/app/portal/requests/[id]/page.tsx`, calculate deliverables hours and display the commercial proposal accurately.

---

### Phase 4: Production Polish & DevOps
- [ ] **Automated Migration Runner**: Add a script or GitHub action to run pending Supabase migrations systematically.
- [ ] **API & Route Integration Tests**: Expand tests from pure unit tests to include HTTP integration tests against the Express routes using Supertest.
- [ ] **Production Email Configuration**: Verify the custom domain in Resend and update `backend/.env` with production `RESEND_API_KEY`, `FROM_EMAIL`, and `APP_URL`.
- [x] **Automated Migration Runner**: Add a script or GitHub action to run pending Supabase migrations systematically.
- [x] **API & Route Integration Tests**: Expand tests from pure unit tests to include HTTP integration tests against the Express routes using Supertest.
- [x] **Production Email Configuration**: Verify the custom domain in Resend and update `backend/.env` with production `RESEND_API_KEY`, `FROM_EMAIL`, and `APP_URL`.

