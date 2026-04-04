-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Phase 7 Scheduling and Credential Extensions
--  Date: 2026-04-04
--  Purpose: Foundation data layer for Phase 8 employee scheduling
--           and Phase 9 foreman shift management
--
--  What this does:
--    1. Creates available_shifts table (DATA-01)
--    2. Extends certifications table with new columns (DATA-02)
--    3. Creates shift_requests table with FK to available_shifts (DATA-03)
--    4. Enables RLS + indexes on both new tables
--
--  SAFE: All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
--  Can be re-run without damage.
-- ═══════════════════════════════════════════════════════════════

-- Phase 7: Scheduling and Credential Extensions
-- DATA-01: available_shifts table
-- DATA-02: certifications column extensions
-- DATA-03: shift_requests table

-- ═══ AVAILABLE SHIFTS (DATA-01) ═══

CREATE TABLE IF NOT EXISTS available_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         TEXT NOT NULL,
  time_start   TEXT NOT NULL,
  time_end     TEXT NOT NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  foreman_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  trade        TEXT DEFAULT '',
  overtime     BOOLEAN DEFAULT FALSE,
  status       TEXT DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'cancelled')),
  claimed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_available_shifts_project ON available_shifts(project_id);
CREATE INDEX IF NOT EXISTS idx_available_shifts_date ON available_shifts(date);
CREATE INDEX IF NOT EXISTS idx_available_shifts_foreman ON available_shifts(foreman_id);
CREATE INDEX IF NOT EXISTS idx_available_shifts_status ON available_shifts(status);

ALTER TABLE available_shifts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read shifts (employees need to see available shifts)
CREATE POLICY "available_shifts_select" ON available_shifts
  FOR SELECT TO authenticated USING (true);

-- Foremen, owners, admins, PMs can insert/update/delete shifts
CREATE POLICY "available_shifts_insert" ON available_shifts
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('foreman', 'owner', 'admin', 'pm'));

CREATE POLICY "available_shifts_update" ON available_shifts
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('foreman', 'owner', 'admin', 'pm'))
  WITH CHECK (get_user_role() IN ('foreman', 'owner', 'admin', 'pm'));

CREATE POLICY "available_shifts_delete" ON available_shifts
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('foreman', 'owner', 'admin', 'pm'));

-- ═══ SHIFT REQUESTS (DATA-03) ═══

CREATE TABLE IF NOT EXISTS shift_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id     UUID NOT NULL REFERENCES available_shifts(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_requests_employee ON shift_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_requests_shift ON shift_requests(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_requests_status ON shift_requests(status);

ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- Employees can read their own requests; foremen/admins can read all
CREATE POLICY "shift_requests_select" ON shift_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = employee_id
    OR get_user_role() IN ('foreman', 'owner', 'admin', 'pm')
  );

-- Employees can create requests for themselves
CREATE POLICY "shift_requests_insert" ON shift_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = employee_id);

-- Foremen/admins can update (approve/deny); employees can update own pending requests (cancel)
CREATE POLICY "shift_requests_update" ON shift_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = employee_id
    OR get_user_role() IN ('foreman', 'owner', 'admin', 'pm')
  )
  WITH CHECK (
    auth.uid() = employee_id
    OR get_user_role() IN ('foreman', 'owner', 'admin', 'pm')
  );

-- ═══ CERTIFICATIONS EXTENSION (DATA-02) ═══

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS issuing_org TEXT DEFAULT '';
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cert_category TEXT DEFAULT '';


-- ═════════════════════════════════════════════════════════════
--  VERIFICATION QUERIES (run these after migration)
-- ═════════════════════════════════════════════════════════════
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'available_shifts' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'shift_requests' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'certifications' ORDER BY ordinal_position;
--
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('available_shifts', 'shift_requests');


-- ═════════════════════════════════════════════════════════════
--  DONE! Phase 7 scheduling schema foundation is ready.
--  Next: Phase 8 will wire UI components to these tables.
-- ═════════════════════════════════════════════════════════════
