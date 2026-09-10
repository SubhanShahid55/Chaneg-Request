# ChangeFlow — Product Requirements Document (PRD)

> **Version:** 2.0 (Reconciled with Shipped Product)  
> **Status:** Production / Implemented  
> **Repository:** `Chaneg Request`  
> **Target Audience:** Agency Owners, Project Managers, Software Leads, and Client Stakeholders  

---

## 1. Executive Summary & Vision

ChangeFlow is a precision SaaS platform engineered specifically for software consultancies and digital agencies to capture, scope, estimate, and authorize client change requests. 

Unmanaged scope creep in client services leads to margin compression, contentious billing disputes, and delivery delays. ChangeFlow provides a transparent, legally sound bridge between informal client requests (from Slack, email, Jira, or conversations) and signed commercial approvals.

---

## 2. User Roles & Personas

| Role | Access Level | Primary Responsibilities |
|---|---|---|
| **Agency Admin** | `admin` | System configuration, client onboarding, inviting and managing team members, viewing organization-wide analytics and pipeline values. |
| **Agency Team Lead / PM** | `standard` | Capturing inbound change requests, itemizing deliverables and exclusions, adjusting effort and rates, dispatching tokenized approval links, managing implementation status, and logging internal notes. |
| **Client Stakeholder** | Unauthenticated (Token-authorized) | Accessing secure, tokenized approval links without password friction, reviewing deliverables and exclusions, authorizing quotes with confirmation codes, or submitting targeted adjustment requests. |

---

## 3. Technology Stack & System Architecture

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with custom brand indigo design system tokens (`--color-primary: #3525cd` / `#4f46e5`, background `#f8f9ff`)
- **State & Sync:** React Context Provider (`useApp`), dual-channel sync via Server-Sent Events (`/events/stream`) with automatic 5-second polling fallback
- **Accessibility & Motion:** Full `@media (prefers-reduced-motion: reduce)` compliance, accessible toast notifications (`role="alert"`), ARIA labels

### Backend
- **Framework:** [Express 5](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/), [Node.js 24](https://nodejs.org/)
- **Database:** Supabase Postgres (10 tables with Row-Level Security)
- **Caching:** Redis with automatic fallback to direct PostgreSQL queries if Redis is unavailable
- **Authentication:** Supabase Auth (JWT bearer verification) + Role-Based Access Control (`admin` / `standard`)
- **File Storage:** Private Supabase Storage bucket (`profile-pictures`) with short-lived signed URLs
- **Email Delivery:** Resend transactional email integration for team invitations, password resets, and notifications
- **Testing:** Native Node.js test runner (`node --import tsx --test`) with 100% passing state machine and approval route tests

---

## 4. Change Request Lifecycle & Authoritative State Machine

The state machine is authoritatively enforced in [`backend/src/services/stateMachine.ts`](file:///c:/Users/CT/Desktop/Chaneg%20Request/backend/src/services/stateMachine.ts). Unauthorized transitions throw a `TransitionError` (HTTP 409).

```
     [ draft ] ────┐
           ▼
     [ pending ] ──► [ reviewing ] ──► [ awaiting_approval ] ──► [ approved ] ──► [ in_progress ] ──► [ completed ]
               │  ▲
               └──┘
                         │
                         ▼
                     [ declined ]
```

### Transition Rules
1. **`draft` & `pending` ➔ `reviewing`**: Triggered when the agency submits the request for internal developer approval (`POST /requests/:id/send-for-approval`). Requires non-zero hourly rate, estimated hours, and target delivery date.
2. **`reviewing` ➔ `awaiting_approval`**: Triggered by an admin approving the internal review (`POST /requests/:id/approve-review`). This generates the approval token and sends the client email.
3. **`reviewing` ➔ `pending`**: Triggered by an admin requesting changes (`POST /requests/:id/request-review-changes`), with the reason stored as an internal note.
4. **`awaiting_approval` ➔ `approved`**: Triggered by client authorization in the approval portal (`POST /approval/:token/approve`). Generates a cryptographically unique confirmation code (e.g. `CF-4921`).
5. **`awaiting_approval` ➔ `declined`**: Triggered when the client submits revision feedback or questions (`POST /approval/:token/decline`).
6. **`approved` ➔ `in_progress`**: Triggered by agency team advancing the request (`POST /requests/:id/advance`) when development begins.
7. **`in_progress` ➔ `completed`**: Triggered by agency team advancing the request (`POST /requests/:id/advance`) upon client delivery.
8. **Terminal States**: `completed` and `declined` are terminal. No further automatic status transitions are allowed.

---

## 5. Shipped Feature Inventory

### 5.1 Authentication, RBAC & Profile Management
- Secure login, password reset, set password, and invitation acceptance flows.
- Admin portal (`/admin`) for inviting team members, assigning job titles, and managing client companies.
- Custom avatar image uploads to private storage with signed URL retrieval.
- Strict isolation of service-role keys: all admin operations pass through the authenticated Express backend.

### 5.2 Rapid Intake & Request Creation
- Slide-over intake drawer accessible via shortcut `N` or UI button.
- Intake channel attribution (Slack, Jira, Email, Meeting, Portal) with raw client quote preservation.
- Automatic reference code generation (`CR-1042`, etc.) and client assignment.

### 5.3 Commercial Estimator & Scope Builder
- Dynamic deliverables table: categorize items (Frontend, Backend, DevOps, Design, QA), specify hours, and calculate costs at customizable hourly rates.
- Add and delete deliverables inline.
- Scope exclusions list to establish clear delivery boundaries and prevent unquoted assumptions.
- Explicit "Save Estimate Changes" persistence (`PATCH /requests/:id/estimate`) with dirty state indicators.

### 5.4 Public Client Approval Portal (`/approval/:token`)
- Friction-free unauthenticated access: clients open secure 256-bit tokenized links.
- Rate-limited to 20 requests per minute per IP to prevent token enumeration.
- 14-day link expiration with dedicated expired state messaging.
- First-view tracking: automatically logs `viewed_by_client` activity event when opened.
- Idempotent resolution: already-responded tokens display existing confirmation details or feedback.
- One-click authorization generating confirmation numbers, with printable PDF-ready summary.
- Adjustment request flow with shortcut feedback pills (split phases, postpone sprint).

### 5.5 Audit Trail & Activity Timeline
- Comprehensive tracking of 9 distinct event types:
  - `created`
  - `estimate_updated`
  - `sent_for_approval`
  - `viewed_by_client`
  - `approved`
  - `declined`
  - `marked_in_progress`
  - `marked_complete`
  - `note_added`
- Visual timeline with actor differentiation (Agency Team Member vs. Client Stakeholder) and relative/absolute timestamps.

### 5.6 Agency Internal Collaboration
- Private internal notes thread on each change request, separate from client-visible details.
- Author attribution and chronological ordering.

### 5.7 Productivity & Reporting
- Filterable and sortable request table (`/requests`) by Reference Code, Title, Client, Priority, Estimate ($), and Last Updated date.
- CSV export for both client-side table view and authenticated backend bulk dump (`/requests/export.csv`).
- Velocity analytics chart tracking approved and pending requests across rolling 8-week windows.
- Portfolio pipeline valuation summaries on Dashboard and Reports pages.

---

## 6. Schema Decision Log & Future Considerations

### Phase 5 Finding: Request Assignee
- **Current Architecture**: Change requests are associated with a client company, a client contact person, and an agency project lead (`profiles` table link). 
- **Recommendation**: To support multi-developer assignments without breaking database constraints, an explicit migration adding an `assignee_id REFERENCES profiles(id)` column to `change_requests` or a many-to-many `request_assignees` table should be scheduled for Version 2.1.

### Phase 7 Architectural Proposal: Public API Platform
- **Scope**: Outlined as a future architectural expansion. External webhooks for intake from Slack slash-commands or GitHub Issues can be authenticated via API keys with SHA-256 hashes stored in a dedicated `api_keys` table.

---

## 7. Verification & Quality Standards
- **Automated Tests**: Unit and integration test suites covering all state machine branches and token resolution logic (`npm test` in `backend`).
- **TypeScript Integrity**: Strict type checking across both frontend and backend without suppressed compilation errors (`npm run build`).
- **Performance**: Redis caching layer with 15-second TTLs on listing queries and automatic pattern invalidation on mutations.
- **Design Tokens**: Strict adherence to the brand indigo palette (`#4f46e5` / `#3525cd`, surface `#f8f9ff`), avoiding arbitrary rogue colors.

