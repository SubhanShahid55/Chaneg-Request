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
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- clients
DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
CREATE POLICY clients_select ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated USING (true);

-- projects
DROP POLICY IF EXISTS projects_select ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_select ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_insert ON projects FOR INSERT TO authenticated WITH CHECK (true);

-- change_requests
DROP POLICY IF EXISTS cr_select ON change_requests;
DROP POLICY IF EXISTS cr_insert ON change_requests;
DROP POLICY IF EXISTS cr_update ON change_requests;
CREATE POLICY cr_select ON change_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_insert ON change_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY cr_update ON change_requests FOR UPDATE TO authenticated USING (true);

-- deliverables
DROP POLICY IF EXISTS del_select ON deliverables;
DROP POLICY IF EXISTS del_insert ON deliverables;
DROP POLICY IF EXISTS del_update ON deliverables;
DROP POLICY IF EXISTS del_delete ON deliverables;
CREATE POLICY del_select ON deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY del_insert ON deliverables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY del_update ON deliverables FOR UPDATE TO authenticated USING (true);
CREATE POLICY del_delete ON deliverables FOR DELETE TO authenticated USING (true);

-- exclusions
DROP POLICY IF EXISTS exc_select ON exclusions;
DROP POLICY IF EXISTS exc_insert ON exclusions;
DROP POLICY IF EXISTS exc_delete ON exclusions;
CREATE POLICY exc_select ON exclusions FOR SELECT TO authenticated USING (true);
CREATE POLICY exc_insert ON exclusions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY exc_delete ON exclusions FOR DELETE TO authenticated USING (true);

-- notes
DROP POLICY IF EXISTS notes_select ON notes;
DROP POLICY IF EXISTS notes_insert ON notes;
CREATE POLICY notes_select ON notes FOR SELECT TO authenticated USING (true);
CREATE POLICY notes_insert ON notes FOR INSERT TO authenticated WITH CHECK (true);

-- approval_links
DROP POLICY IF EXISTS al_select ON approval_links;
DROP POLICY IF EXISTS al_insert ON approval_links;
DROP POLICY IF EXISTS al_update ON approval_links;
CREATE POLICY al_select ON approval_links FOR SELECT TO authenticated USING (true);
CREATE POLICY al_insert ON approval_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY al_update ON approval_links FOR UPDATE TO authenticated USING (true);

-- approval_responses
DROP POLICY IF EXISTS ar_select ON approval_responses;
DROP POLICY IF EXISTS ar_insert ON approval_responses;
CREATE POLICY ar_select ON approval_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY ar_insert ON approval_responses FOR INSERT TO authenticated WITH CHECK (true);

-- activity_events
DROP POLICY IF EXISTS ae_select ON activity_events;
DROP POLICY IF EXISTS ae_insert ON activity_events;
CREATE POLICY ae_select ON activity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY ae_insert ON activity_events FOR INSERT TO authenticated WITH CHECK (true);
