-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Complete Database Schema
--  Eagles Brothers Constructors · Houston, TX
--
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--  Then click "Run" (or Ctrl+Enter)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═════════════════════════════════════════════════════════════
--  COMPANY
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL DEFAULT '',
  address          TEXT DEFAULT '',
  phone            TEXT DEFAULT '',
  email            TEXT DEFAULT '',
  license          TEXT DEFAULT '',
  default_tax      NUMERIC(5,2) DEFAULT 8.25,
  default_waste    NUMERIC(5,2) DEFAULT 10,
  default_overhead NUMERIC(5,2) DEFAULT 10,
  default_profit   NUMERIC(5,2) DEFAULT 20,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  USERS (profiles — linked to Supabase Auth)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id              UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  email                TEXT UNIQUE,
  role                 TEXT NOT NULL DEFAULT 'employee',
  pin                  TEXT DEFAULT '',
  title                TEXT DEFAULT '',
  phone                TEXT DEFAULT '',
  hourly_rate          NUMERIC(10,2) DEFAULT 0,
  active               BOOLEAN DEFAULT TRUE,
  avatar               TEXT DEFAULT '',
  must_change_password BOOLEAN DEFAULT FALSE,
  notifications        JSONB DEFAULT '{"schedule":true,"materials":true,"deliveries":true}',
  default_project_id   UUID,
  schedule             JSONB DEFAULT '{"start":"06:00","end":"14:30"}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  MARGIN TIERS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS margin_tiers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bronze     NUMERIC(5,2) DEFAULT 15,
  silver     NUMERIC(5,2) DEFAULT 20,
  gold       NUMERIC(5,2) DEFAULT 25,
  platinum   NUMERIC(5,2) DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  CONTACTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  company    TEXT DEFAULT '',
  role       TEXT DEFAULT '',
  bids       INTEGER DEFAULT 0,
  wins       INTEGER DEFAULT 0,
  color      TEXT DEFAULT '#3B82F6',
  last       TEXT DEFAULT '',
  priority   TEXT DEFAULT 'med',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  BIDS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bids (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  gc         TEXT DEFAULT '',
  value      NUMERIC(14,2) DEFAULT 0,
  due        TEXT DEFAULT '',
  status     TEXT DEFAULT 'estimating',
  scope      JSONB DEFAULT '[]',
  phase      TEXT DEFAULT '',
  risk       TEXT DEFAULT 'Low',
  notes      TEXT DEFAULT '',
  contact    TEXT DEFAULT '',
  month      TEXT DEFAULT '',
  close_out  TEXT,
  margin     NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bid Attachments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bid_attachments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id     UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT DEFAULT '',
  size       INTEGER DEFAULT 0,
  data       TEXT DEFAULT '',
  uploaded   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bid_attachments_bid ON bid_attachments(bid_id);

-- ═════════════════════════════════════════════════════════════
--  PROJECTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id            UUID REFERENCES bids(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  gc                TEXT DEFAULT '',
  contract          NUMERIC(14,2) DEFAULT 0,
  billed            NUMERIC(14,2) DEFAULT 0,
  progress          NUMERIC(5,2) DEFAULT 0,
  phase             TEXT DEFAULT 'Pre-Construction',
  start             TEXT DEFAULT '',
  "end"             TEXT DEFAULT '',
  am                TEXT DEFAULT '',
  pm                TEXT DEFAULT '',
  superintendent    TEXT DEFAULT '',
  address           TEXT DEFAULT '',
  labor_budget      NUMERIC(14,2) DEFAULT 0,
  labor_hours       NUMERIC(10,2) DEFAULT 0,
  demo              NUMERIC(14,2) DEFAULT 0,
  drywall           NUMERIC(14,2) DEFAULT 0,
  act               NUMERIC(14,2) DEFAULT 0,
  lat               NUMERIC(10,7),
  lng               NUMERIC(10,7),
  radius_ft         NUMERIC(10,2) DEFAULT 500,
  emergency_contact JSONB DEFAULT '{"name":"","phone":"","role":""}',
  scope             JSONB DEFAULT '[]',
  margin            NUMERIC(5,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  CALL LOG
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS call_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact    TEXT DEFAULT '',
  company    TEXT DEFAULT '',
  time       TIMESTAMPTZ DEFAULT NOW(),
  note       TEXT DEFAULT '',
  next       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  ASSEMBLIES
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assemblies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  unit        TEXT DEFAULT 'LF',
  p8          NUMERIC(10,2),
  p10         NUMERIC(10,2),
  p14         NUMERIC(10,2),
  p20         NUMERIC(10,2),
  mat_rate    NUMERIC(10,2) DEFAULT 0,
  lab_rate    NUMERIC(10,2) DEFAULT 0,
  verified    BOOLEAN DEFAULT FALSE,
  category    TEXT DEFAULT '',
  description TEXT DEFAULT '',
  components  JSONB DEFAULT '[]',
  special     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  SCOPE ITEMS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scope_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  "desc"     TEXT DEFAULT '',
  category   TEXT DEFAULT '',
  status     TEXT DEFAULT 'unchecked',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  TAKEOFFS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS takeoffs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id         UUID REFERENCES bids(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  waste_pct      NUMERIC(5,2) DEFAULT 10,
  tax_rate       NUMERIC(5,2) DEFAULT 8.25,
  overhead_pct   NUMERIC(5,2) DEFAULT 10,
  profit_pct     NUMERIC(5,2) DEFAULT 20,
  drawing_state      JSONB,          -- measurements, conditions, calibrations, etc.
  drawing_file_name  TEXT,           -- original PDF filename for re-upload prompt
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add drawing_state to existing takeoffs table
ALTER TABLE takeoffs ADD COLUMN IF NOT EXISTS drawing_state JSONB;
ALTER TABLE takeoffs ADD COLUMN IF NOT EXISTS drawing_file_name TEXT;

CREATE TABLE IF NOT EXISTS takeoff_rooms (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  takeoff_id UUID NOT NULL REFERENCES takeoffs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  floor      TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_takeoff_rooms_takeoff ON takeoff_rooms(takeoff_id);

CREATE TABLE IF NOT EXISTS takeoff_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID NOT NULL REFERENCES takeoff_rooms(id) ON DELETE CASCADE,
  code       TEXT DEFAULT '',
  "desc"     TEXT DEFAULT '',
  qty        NUMERIC(10,2) DEFAULT 0,
  unit       TEXT DEFAULT 'LF',
  height     NUMERIC(10,2) DEFAULT 8,
  diff       NUMERIC(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_takeoff_items_room ON takeoff_items(room_id);

-- ═════════════════════════════════════════════════════════════
--  INVOICES
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number     TEXT DEFAULT '',
  date       TEXT DEFAULT '',
  amount     NUMERIC(14,2) DEFAULT 0,
  status     TEXT DEFAULT 'draft',
  "desc"     TEXT DEFAULT '',
  paid_date  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);

-- ═════════════════════════════════════════════════════════════
--  CHANGE ORDERS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS change_orders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number     TEXT DEFAULT '',
  "desc"     TEXT DEFAULT '',
  amount     NUMERIC(14,2) DEFAULT 0,
  status     TEXT DEFAULT 'pending',
  submitted  TEXT DEFAULT '',
  approved   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_change_orders_project ON change_orders(project_id);

-- ═════════════════════════════════════════════════════════════
--  T&M TICKETS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tm_tickets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  ticket_number    TEXT DEFAULT '',
  date             TEXT DEFAULT '',
  status           TEXT DEFAULT 'submitted',
  description      TEXT DEFAULT '',
  labor_entries    JSONB DEFAULT '[]',
  material_entries JSONB DEFAULT '[]',
  submitted_date   TEXT DEFAULT '',
  approved_date    TEXT,
  billed_date      TEXT,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tm_tickets_project ON tm_tickets(project_id);

-- ═════════════════════════════════════════════════════════════
--  RFIs
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rfis (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  number        TEXT DEFAULT '',
  subject       TEXT DEFAULT '',
  date_sent     TEXT DEFAULT '',
  status        TEXT DEFAULT 'open',
  assigned      TEXT DEFAULT '',
  response      TEXT DEFAULT '',
  response_date TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rfis_project ON rfis(project_id);

-- ═════════════════════════════════════════════════════════════
--  SUBMITTALS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS submittals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id            UUID REFERENCES projects(id) ON DELETE CASCADE,
  number                TEXT DEFAULT '',
  "desc"                TEXT DEFAULT '',
  spec_section          TEXT DEFAULT '',
  status                TEXT DEFAULT 'preparing',
  submitted_date        TEXT,
  due                   TEXT DEFAULT '',
  pdf_key               TEXT,
  pdf_name              TEXT,
  pdf_size              INTEGER,
  linked_material_ids   JSONB DEFAULT '[]',
  linked_assembly_codes JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submittals_project ON submittals(project_id);

-- ═════════════════════════════════════════════════════════════
--  SCHEDULE TASKS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task       TEXT NOT NULL,
  start_date TEXT DEFAULT '',
  end_date   TEXT DEFAULT '',
  crew       TEXT DEFAULT '',
  status     TEXT DEFAULT 'not-started',
  milestone  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_project ON schedule_tasks(project_id);

-- ═════════════════════════════════════════════════════════════
--  DAILY REPORTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS daily_reports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date       TEXT DEFAULT '',
  crew_size  INTEGER DEFAULT 0,
  hours      NUMERIC(6,2) DEFAULT 0,
  work       TEXT DEFAULT '',
  issues     TEXT DEFAULT '',
  weather    TEXT DEFAULT '',
  safety     TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project ON daily_reports(project_id);

-- ═════════════════════════════════════════════════════════════
--  JSAs (Job Safety Analysis)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS jsas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id      TEXT DEFAULT '',
  title            TEXT NOT NULL,
  trade            TEXT DEFAULT 'framing',
  location         TEXT DEFAULT '',
  date             TEXT DEFAULT '',
  shift            TEXT DEFAULT 'day',
  weather          TEXT DEFAULT '',
  supervisor       TEXT DEFAULT '',
  competent_person TEXT DEFAULT '',
  status           TEXT DEFAULT 'draft',
  steps            JSONB DEFAULT '[]',
  ppe              JSONB DEFAULT '[]',
  permits          JSONB DEFAULT '[]',
  crew_sign_on     JSONB DEFAULT '[]',
  toolbox_talk     JSONB DEFAULT '{"topic":"","notes":"","discussed":false}',
  near_misses      JSONB DEFAULT '[]',
  audit            JSONB DEFAULT '[]',
  created_by       TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jsas_project ON jsas(project_id);

-- ═════════════════════════════════════════════════════════════
--  EQUIPMENT
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS equipment (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  type       TEXT DEFAULT 'lift',
  status     TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  EQUIPMENT BOOKINGS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS equipment_bookings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  start_date   TEXT DEFAULT '',
  end_date     TEXT DEFAULT '',
  status       TEXT DEFAULT 'confirmed',
  booked_by    TEXT DEFAULT '',
  booked_at    TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eq_bookings_equipment ON equipment_bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_eq_bookings_project ON equipment_bookings(project_id);

-- ═════════════════════════════════════════════════════════════
--  CALENDAR EVENTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS calendar_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                TEXT DEFAULT 'task',
  title               TEXT NOT NULL,
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  date                TEXT DEFAULT '',
  start_time          TEXT DEFAULT '',
  end_time            TEXT DEFAULT '',
  all_day             BOOLEAN DEFAULT FALSE,
  assigned_to         JSONB DEFAULT '[]',
  location            TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  status              TEXT DEFAULT 'scheduled',
  linked_rfi_id       UUID,
  linked_submittal_id UUID,
  linked_co_id        UUID,
  recurrence          TEXT,
  created_by          TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

-- ═════════════════════════════════════════════════════════════
--  CERTIFICATIONS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS certifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  issue_date  TEXT DEFAULT '',
  expiry_date TEXT DEFAULT '',
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_employee ON certifications(employee_id);

-- ═════════════════════════════════════════════════════════════
--  PTO REQUESTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pto_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT DEFAULT 'vacation',
  start_date  TEXT DEFAULT '',
  end_date    TEXT DEFAULT '',
  status      TEXT DEFAULT 'pending',
  reason      TEXT DEFAULT '',
  reviewed_by TEXT DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pto_requests_employee ON pto_requests(employee_id);

-- ═════════════════════════════════════════════════════════════
--  CREW SCHEDULE
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crew_schedule (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  week_start  TEXT DEFAULT '',
  days        JSONB DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true}',
  hours       JSONB DEFAULT '{"start":"06:00","end":"14:30"}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crew_schedule_employee ON crew_schedule(employee_id);

-- ═════════════════════════════════════════════════════════════
--  AUTO-UPDATE updated_at TRIGGER
-- ═════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I', t
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t
    );
  END LOOP;
END;
$$;

-- ═════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Permissive for now — authenticated users get full access.
--  Tighten with role-based policies later.
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "auth_full_access" ON %I FOR ALL
       TO authenticated USING (true) WITH CHECK (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "anon_read" ON %I FOR SELECT
       TO anon USING (true)', t
    );
  END LOOP;
END;
$$;

-- ═════════════════════════════════════════════════════════════
--  STORAGE BUCKET for file uploads
-- ═════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ebc-files', 'ebc-files', TRUE, 52428800,
  ARRAY[
    'image/png','image/jpeg','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv','text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "ebc_files_auth_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ebc-files');

CREATE POLICY "ebc_files_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'ebc-files');

CREATE POLICY "ebc_files_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'ebc-files');

CREATE POLICY "ebc_files_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'ebc-files');

-- ═════════════════════════════════════════════════════════════
--  ENABLE REALTIME on key tables
-- ═════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE change_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE tm_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE rfis;
ALTER PUBLICATION supabase_realtime ADD TABLE submittals;
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE jsas;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

-- ═════════════════════════════════════════════════════════════
--  PROJECT DRAWINGS (Cloud-first PDF storage)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS project_drawings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  bid_id        UUID REFERENCES bids(id) ON DELETE SET NULL,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     BIGINT DEFAULT 0,
  num_pages     INTEGER DEFAULT 0,
  revision      INTEGER DEFAULT 1,
  is_current    BOOLEAN DEFAULT TRUE,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  mime_type     TEXT DEFAULT 'application/pdf',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_drawings_project ON project_drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_drawings_bid ON project_drawings(bid_id);
ALTER TABLE project_drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access_drawings" ON project_drawings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_drawings" ON project_drawings FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE project_drawings;

-- ═════════════════════════════════════════════════════════════
--  EMAIL SCANS (Auto-populated from Gmail)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_scans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_message_id  TEXT UNIQUE NOT NULL,
  gmail_thread_id   TEXT DEFAULT '',
  from_email        TEXT DEFAULT '',
  from_name         TEXT DEFAULT '',
  subject           TEXT DEFAULT '',
  received_at       TIMESTAMPTZ,
  classification    TEXT DEFAULT 'unclassified',
  confidence        NUMERIC(3,2) DEFAULT 0,
  extracted_data    JSONB DEFAULT '{}',
  status            TEXT DEFAULT 'pending',
  bid_id            UUID REFERENCES bids(id) ON DELETE SET NULL,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  rejection_reason  TEXT DEFAULT '',
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_scans_status ON email_scans(status);
CREATE INDEX IF NOT EXISTS idx_email_scans_classification ON email_scans(classification);
ALTER TABLE email_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access_emails" ON email_scans FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE email_scans;

-- ═════════════════════════════════════════════════════════════
--  BUMP FILE SIZE LIMIT (100MB for large permit sets)
-- ═════════════════════════════════════════════════════════════
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'ebc-files';

-- ═════════════════════════════════════════════════════════════
--  DONE! Your EBC-OS database is ready.
-- ═════════════════════════════════════════════════════════════
