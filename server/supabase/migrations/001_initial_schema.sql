-- ============================================================
-- ChangeFlow Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- ─── Helper: reference code sequence ────────────────────────
CREATE SEQUENCE IF NOT EXISTS change_request_code_seq START WITH 1042;

-- ─── Tables ─────────────────────────────────────────────────

-- Profiles (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  role        text NOT NULL DEFAULT 'Team Member',
  avatar_url  text,
  email       text
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text NOT NULL,
  contact_name  text NOT NULL,
  contact_email text NOT NULL,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name      text NOT NULL
);

-- Change Requests
CREATE TABLE IF NOT EXISTS change_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code        text UNIQUE NOT NULL,
  client_id             uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id            uuid REFERENCES projects(id) ON DELETE SET NULL,
  title                 text NOT NULL,
  client_quote          text,
  source_channel        text CHECK (source_channel IN ('call', 'text', 'meeting', 'email')),
  priority              text NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'priority', 'critical')),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'awaiting_approval', 'approved', 'in_progress', 'completed', 'declined')),
  hourly_rate           numeric,
  hours                 numeric,
  cost                  numeric,
  target_delivery_date  date,
  timeline_days         int,
  created_by            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Deliverables
CREATE TABLE IF NOT EXISTS deliverables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  description text NOT NULL,
  hours       numeric NOT NULL DEFAULT 0,
  category    text NOT NULL DEFAULT 'Frontend'
);

-- Exclusions
CREATE TABLE IF NOT EXISTS exclusions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  description text NOT NULL
);

-- Notes (internal team notes)
CREATE TABLE IF NOT EXISTS notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Approval Links
CREATE TABLE IF NOT EXISTS approval_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  token       text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  viewed_at   timestamptz
);

-- Approval Responses
CREATE TABLE IF NOT EXISTS approval_responses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  decision          text NOT NULL CHECK (decision IN ('approved', 'declined')),
  confirmation_code text,
  decline_reason    text,
  responded_at      timestamptz NOT NULL DEFAULT now()
);

-- Activity Events
CREATE TABLE IF NOT EXISTS activity_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  event_data  jsonb,
  actor_name  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_client ON change_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_ref    ON change_requests(reference_code);
CREATE INDEX IF NOT EXISTS idx_deliverables_request    ON deliverables(request_id);
CREATE INDEX IF NOT EXISTS idx_exclusions_request      ON exclusions(request_id);
CREATE INDEX IF NOT EXISTS idx_notes_request           ON notes(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_links_token    ON approval_links(token);
CREATE INDEX IF NOT EXISTS idx_approval_links_request  ON approval_links(request_id);
CREATE INDEX IF NOT EXISTS idx_activity_request        ON activity_events(request_id);
CREATE INDEX IF NOT EXISTS idx_activity_created        ON activity_events(created_at);

-- ─── Row Level Security ─────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events   ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write all internal tables.
-- The public approval flow is handled by Express using the service role key,
-- so no anonymous policies are needed.

-- profiles
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- clients
CREATE POLICY clients_select ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated USING (true);

-- projects
CREATE POLICY projects_select ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_insert ON projects FOR INSERT TO authenticated WITH CHECK (true);

-- change_requests
CREATE POLICY cr_select ON change_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_insert ON change_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY cr_update ON change_requests FOR UPDATE TO authenticated USING (true);

-- deliverables
CREATE POLICY del_select ON deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY del_insert ON deliverables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY del_update ON deliverables FOR UPDATE TO authenticated USING (true);
CREATE POLICY del_delete ON deliverables FOR DELETE TO authenticated USING (true);

-- exclusions
CREATE POLICY exc_select ON exclusions FOR SELECT TO authenticated USING (true);
CREATE POLICY exc_insert ON exclusions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY exc_delete ON exclusions FOR DELETE TO authenticated USING (true);

-- notes
CREATE POLICY notes_select ON notes FOR SELECT TO authenticated USING (true);
CREATE POLICY notes_insert ON notes FOR INSERT TO authenticated WITH CHECK (true);

-- approval_links
CREATE POLICY al_select ON approval_links FOR SELECT TO authenticated USING (true);
CREATE POLICY al_insert ON approval_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY al_update ON approval_links FOR UPDATE TO authenticated USING (true);

-- approval_responses
CREATE POLICY ar_select ON approval_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY ar_insert ON approval_responses FOR INSERT TO authenticated WITH CHECK (true);

-- activity_events
CREATE POLICY ae_select ON activity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY ae_insert ON activity_events FOR INSERT TO authenticated WITH CHECK (true);


-- ─── Seed Data ──────────────────────────────────────────────

-- Sarah Chen profile (will be linked when she signs up via Supabase auth)
-- For now, we seed the client and request data.

-- Clients
INSERT INTO clients (id, company_name, contact_name, contact_email, avatar_url) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Acme Corp', 'Mark Jensen', 'mark@acme.corp', NULL),
  ('c0000001-0000-0000-0000-000000000002', 'Veloce Health', 'Dr. Elena Rostova', 'e.rostova@veloce.io', NULL),
  ('c0000001-0000-0000-0000-000000000003', 'HyperScale Inc', 'Julian Hayes', 'julian@hyperscale.co', NULL),
  ('c0000001-0000-0000-0000-000000000004', 'Nexus Labs', 'Siddharth Patel', 'spatel@nexuslabs.tech', NULL),
  ('c0000001-0000-0000-0000-000000000005', 'Luminary Media', 'Chloe Davenport', 'chloe@luminary.fm', NULL),
  ('c0000001-0000-0000-0000-000000000006', 'Strata Logistics', 'Marcus Brody', 'mbrody@stratalogistics.com', NULL),
  ('c0000001-0000-0000-0000-000000000007', 'Beacon Retail', 'Samantha Vance', 'samantha@beaconretail.com', NULL),
  ('c0000001-0000-0000-0000-000000000008', 'AeroPulse Avionics', 'Capt. Roger Vance', 'rvance@aeropulse.aero', NULL)
ON CONFLICT DO NOTHING;

-- Projects
INSERT INTO projects (id, client_id, name) VALUES
  ('p0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Enterprise Billing & Invoicing'),
  ('p0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Patient Intake Portal'),
  ('p0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', 'SaaS Analytics Dashboard'),
  ('p0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'Robotics Fleet Commander'),
  ('p0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000005', 'Audio Streaming App'),
  ('p0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000006', 'Driver Dispatch Mobile App'),
  ('p0000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'Customer CRM'),
  ('p0000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000007', 'E-Commerce Storefront'),
  ('p0000001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000008', 'Flight Deck Telemetry Web App'),
  ('p0000001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000003', 'SaaS Analytics Dashboard')
ON CONFLICT DO NOTHING;

-- Change Requests (matching the frontend mock data)
INSERT INTO change_requests (id, reference_code, client_id, project_id, title, client_quote, source_channel, priority, status, hourly_rate, hours, cost, target_delivery_date, timeline_days, created_at, updated_at) VALUES
  -- CR-1042: Acme Corp, pending
  ('r0000001-0000-0000-0000-000000000001', 'CR-1042',
   'c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001',
   'Enterprise Tiered Pricing & Pro-rated Invoicing',
   'We signed Pilot Alpha today. We desperately need mid-cycle billing proration and seat tiers live by Sprint 38 to invoice them without manual calculation.',
   'email', 'priority', 'pending', 150, 24, 3600, '2025-06-15', 5,
   '2025-05-18T16:42:00Z', '2025-05-18T16:42:00Z'),

  -- CR-1043: Veloce Health, approved
  ('r0000001-0000-0000-0000-000000000002', 'CR-1043',
   'c0000001-0000-0000-0000-000000000002', 'p0000001-0000-0000-0000-000000000002',
   'HIPAA-Compliant Document Upload & Virus Scanning',
   'Our compliance auditor flagged patient PDF uploads. We need quarantine scanning before files touch the database.',
   'meeting', 'critical', 'approved', 150, 32, 4800, '2025-06-10', 6,
   '2025-05-16T11:20:00Z', '2025-05-17T09:15:00Z'),

  -- CR-1044: HyperScale, in_progress
  ('r0000001-0000-0000-0000-000000000003', 'CR-1044',
   'c0000001-0000-0000-0000-000000000003', 'p0000001-0000-0000-0000-000000000003',
   'Custom Metric Formula Builder & CSV Exporter',
   'Finance needs to compute custom weighted ratios directly in the table instead of dumping into Excel every morning.',
   'call', 'standard', 'in_progress', 150, 20, 3000, '2025-06-20', 4,
   '2025-05-17T14:30:00Z', '2025-05-18T10:00:00Z'),

  -- CR-1045: Nexus Labs, pending
  ('r0000001-0000-0000-0000-000000000004', 'CR-1045',
   'c0000001-0000-0000-0000-000000000004', 'p0000001-0000-0000-0000-000000000004',
   'Live Telemetry Map Clustering & Latency Thresholds',
   'Map is lagging with over 2,000 units on screen. We need GeoJSON clustering and latency color-coding ASAP.',
   'text', 'priority', 'pending', 160, 28, 4480, '2025-06-25', 5,
   '2025-05-18T08:15:00Z', '2025-05-18T08:15:00Z'),

  -- CR-1046: Luminary Media, draft
  ('r0000001-0000-0000-0000-000000000005', 'CR-1046',
   'c0000001-0000-0000-0000-000000000005', 'p0000001-0000-0000-0000-000000000005',
   'Dolby Atmos Spatial Audio Toggle & Equalizer Presets',
   'Dolby partnership was finalized yesterday. Premium listeners must have spatial audio toggle on mobile and web.',
   'email', 'standard', 'draft', 150, 18, 2700, '2025-06-25', 4,
   '2025-05-19T09:40:00Z', '2025-05-19T09:40:00Z'),

  -- CR-1047: Strata Logistics, approved
  ('r0000001-0000-0000-0000-000000000006', 'CR-1047',
   'c0000001-0000-0000-0000-000000000006', 'p0000001-0000-0000-0000-000000000006',
   'Offline Proof-of-Delivery Signature & Photo Sync',
   'Drivers in rural Texas keep losing deliveries because the app locks up without cellular connectivity.',
   'call', 'priority', 'approved', 150, 26, 3900, '2025-06-10', 5,
   '2025-05-15T15:00:00Z', '2025-05-16T17:20:00Z'),

  -- CR-1048: Acme Corp, pending
  ('r0000001-0000-0000-0000-000000000007', 'CR-1048',
   'c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000007',
   'Salesforce Two-Way Opportunity Contact Sync',
   'Sales reps are double-entering lead data into both systems. We need seamless webhook sync.',
   'email', 'standard', 'pending', 150, 22, 3300, '2025-06-20', 4,
   '2025-05-17T18:00:00Z', '2025-05-17T18:00:00Z'),

  -- CR-1049: Beacon Retail, declined
  ('r0000001-0000-0000-0000-000000000008', 'CR-1049',
   'c0000001-0000-0000-0000-000000000007', 'p0000001-0000-0000-0000-000000000008',
   'Apple Pay & Google Pay One-Click Checkout Sheet',
   'Mobile bounce rates on checkout step 1 are over 60%. We need 1-tap Apple Pay directly on product pages.',
   'meeting', 'critical', 'declined', 150, 16, 2400, '2025-06-15', 3,
   '2025-05-14T12:10:00Z', '2025-05-14T12:10:00Z'),

  -- CR-1050: AeroPulse, completed
  ('r0000001-0000-0000-0000-000000000009', 'CR-1050',
   'c0000001-0000-0000-0000-000000000008', 'p0000001-0000-0000-0000-000000000009',
   'FAA Audit Log Export & Cryptographic Signature',
   'Our upcoming FAA inspection requires verifiable digital signatures on all pilot checklist logs.',
   'email', 'priority', 'completed', 175, 24, 4200, '2025-06-01', 4,
   '2025-05-10T10:00:00Z', '2025-05-11T14:30:00Z'),

  -- CR-1051: HyperScale, in_progress
  ('r0000001-0000-0000-0000-000000000010', 'CR-1051',
   'c0000001-0000-0000-0000-000000000003', 'p0000001-0000-0000-0000-000000000010',
   'Multi-Tenant SSO via Okta SAML 2.0',
   'Enterprise tier prospects are demanding Okta SAML before committing to annual $50k licenses.',
   'text', 'priority', 'in_progress', 150, 30, 4500, '2025-06-20', 6,
   '2025-05-18T15:20:00Z', '2025-05-18T17:00:00Z')
ON CONFLICT DO NOTHING;

-- Set the sequence to continue after CR-1051
SELECT setval('change_request_code_seq', 1051);

-- Deliverables for CR-1042
INSERT INTO deliverables (request_id, description, hours, category) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'Database Schema & Migration — Postgres enum additions for tiered volume breakpoints and audit columns.', 4, 'Database / API'),
  ('r0000001-0000-0000-0000-000000000001', 'Stripe Billing Proration Webhook Engine — Sync customer invoice lines on subscription change events and calculate balance credits.', 8, 'Backend'),
  ('r0000001-0000-0000-0000-000000000001', 'Admin Customer Portal Seat Adjustment Interface — React dashboard dialog allowing billing admins to view pro-rated delta before confirmation.', 8, 'Frontend'),
  ('r0000001-0000-0000-0000-000000000001', 'Automated Invoice PDF Credit Recalculation — Adjust headless PDF generator to display credit line items and net payable sum.', 4, 'QA & DevOps');

-- Deliverables for CR-1043
INSERT INTO deliverables (request_id, description, hours, category) VALUES
  ('r0000001-0000-0000-0000-000000000002', 'AWS S3 Quarantine Bucket Setup — Isolated pre-scan bucket with Lambda trigger for instant ClamAV scan.', 8, 'QA & DevOps'),
  ('r0000001-0000-0000-0000-000000000002', 'Async Scan Notification & UI Progress Bar — Websocket events reporting file scan verification to patient UI.', 12, 'Frontend'),
  ('r0000001-0000-0000-0000-000000000002', 'Audit Logging & Encryption At Rest — KMS-managed 256-bit encryption and immutable HIPAA audit trail entries.', 12, 'Backend');

-- Deliverables for CR-1044
INSERT INTO deliverables (request_id, description, hours, category) VALUES
  ('r0000001-0000-0000-0000-000000000003', 'Math Parser & Safe Expression Evaluator — Server-side sandboxed formula evaluation with syntax verification.', 6, 'Backend'),
  ('r0000001-0000-0000-0000-000000000003', 'Formula Input Modal & Autocomplete — UI input with column tag autocomplete and live syntax preview.', 8, 'Frontend'),
  ('r0000001-0000-0000-0000-000000000003', 'Streaming CSV & XLSX Export Worker — Background worker to stream large datasets without memory timeouts.', 6, 'QA & DevOps');

-- Exclusions for CR-1042
INSERT INTO exclusions (request_id, description) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'Multi-currency exchange rate hedging'),
  ('r0000001-0000-0000-0000-000000000001', 'Retroactive re-billing of historical cycles prior to Q2'),
  ('r0000001-0000-0000-0000-000000000001', 'Direct ERP / QuickBooks live automated sync (separate CR-1055 scope)');

-- Exclusions for CR-1043
INSERT INTO exclusions (request_id, description) VALUES
  ('r0000001-0000-0000-0000-000000000002', 'Legacy document migration from old server'),
  ('r0000001-0000-0000-0000-000000000002', 'OCR text extraction');

-- Exclusions for CR-1044
INSERT INTO exclusions (request_id, description) VALUES
  ('r0000001-0000-0000-0000-000000000003', 'Predictive ML modeling'),
  ('r0000001-0000-0000-0000-000000000003', 'SQL raw injection support');

-- Approval link for CR-1042
INSERT INTO approval_links (request_id, token, created_at, expires_at) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'tok_acme_89f2a', '2025-05-18T16:42:00Z', '2025-06-01T16:42:00Z');

-- Approval responses for already-approved/declined requests
INSERT INTO approval_responses (request_id, decision, confirmation_code, responded_at) VALUES
  ('r0000001-0000-0000-0000-000000000002', 'approved', 'CF-9712', '2025-05-17T09:15:00Z'),
  ('r0000001-0000-0000-0000-000000000003', 'approved', 'CF-9788', '2025-05-18T10:00:00Z'),
  ('r0000001-0000-0000-0000-000000000006', 'approved', 'CF-9654', '2025-05-16T17:20:00Z'),
  ('r0000001-0000-0000-0000-000000000009', 'approved', 'CF-9410', '2025-05-11T14:30:00Z'),
  ('r0000001-0000-0000-0000-000000000010', 'approved', 'CF-9812', '2025-05-18T17:00:00Z');

INSERT INTO approval_responses (request_id, decision, decline_reason, responded_at) VALUES
  ('r0000001-0000-0000-0000-000000000008', 'declined', 'Client postponed to Q4 budget cycle due to merchant bank contract renegotiation.', '2025-05-14T12:10:00Z');

-- Activity events for seed data
INSERT INTO activity_events (request_id, event_type, event_data, actor_name, created_at) VALUES
  ('r0000001-0000-0000-0000-000000000001', 'created', '{"title": "Enterprise Tiered Pricing & Pro-rated Invoicing"}', 'Sarah Chen', '2025-05-18T16:42:00Z'),
  ('r0000001-0000-0000-0000-000000000002', 'created', '{"title": "HIPAA-Compliant Document Upload & Virus Scanning"}', 'Sarah Chen', '2025-05-16T11:20:00Z'),
  ('r0000001-0000-0000-0000-000000000002', 'approved', '{"confirmation_code": "CF-9712", "approved_by": "Dr. Elena Rostova"}', 'Dr. Elena Rostova', '2025-05-17T09:15:00Z'),
  ('r0000001-0000-0000-0000-000000000003', 'created', '{"title": "Custom Metric Formula Builder & CSV Exporter"}', 'Sarah Chen', '2025-05-17T14:30:00Z'),
  ('r0000001-0000-0000-0000-000000000003', 'approved', '{"confirmation_code": "CF-9788", "approved_by": "Julian Hayes"}', 'Julian Hayes', '2025-05-18T10:00:00Z'),
  ('r0000001-0000-0000-0000-000000000003', 'marked_in_progress', '{}', 'Sarah Chen', '2025-05-18T10:05:00Z'),
  ('r0000001-0000-0000-0000-000000000009', 'created', '{"title": "FAA Audit Log Export & Cryptographic Signature"}', 'Sarah Chen', '2025-05-10T10:00:00Z'),
  ('r0000001-0000-0000-0000-000000000009', 'approved', '{"confirmation_code": "CF-9410", "approved_by": "Capt. Roger Vance"}', 'Capt. Roger Vance', '2025-05-11T14:30:00Z'),
  ('r0000001-0000-0000-0000-000000000009', 'marked_in_progress', '{}', 'Sarah Chen', '2025-05-11T14:35:00Z'),
  ('r0000001-0000-0000-0000-000000000009', 'marked_complete', '{}', 'Sarah Chen', '2025-05-11T14:30:00Z'),
  ('r0000001-0000-0000-0000-000000000008', 'created', '{"title": "Apple Pay & Google Pay One-Click Checkout Sheet"}', 'Sarah Chen', '2025-05-14T12:10:00Z'),
  ('r0000001-0000-0000-0000-000000000008', 'declined', '{"declined_by": "Samantha Vance", "reason": "Client postponed to Q4 budget cycle."}', 'Samantha Vance', '2025-05-14T12:10:00Z');
