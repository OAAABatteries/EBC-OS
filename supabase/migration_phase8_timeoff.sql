-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Phase 8 Time-Off Requests
--  Date: 2026-04-04
--  Purpose: Employee time-off request workflow for Phase 8
--           employee portal (PLAN-01)
--
--  What this does:
--    1. Creates time_off_requests table with RLS
--    2. Enables employee self-service INSERT
--    3. Restricts UPDATE to management roles
--
--  SAFE: Uses IF NOT EXISTS — can be re-run without damage.
-- ═══════════════════════════════════════════════════════════════

-- Phase 8: Employee Time-Off Requests (PLAN-01)

-- ═══ TIME OFF REQUESTS ═══

CREATE TABLE IF NOT EXISTS time_off_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id),
  date_start    DATE NOT NULL,
  date_end      DATE NOT NULL,
  reason        TEXT NOT NULL,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  reviewed_by   UUID REFERENCES auth.users(id),
  review_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_off_employee ON time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_date_start ON time_off_requests(date_start);

ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Employees can read own rows; foremen/admins can read all
CREATE POLICY "time_off_requests_select" ON time_off_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = employee_id
    OR get_user_role() IN ('foreman', 'owner', 'admin', 'pm')
  );

-- Employees can insert requests for themselves only
CREATE POLICY "time_off_requests_insert" ON time_off_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = employee_id);

-- Foremen/admins can update status, reviewed_by, review_notes
CREATE POLICY "time_off_requests_update" ON time_off_requests
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('foreman', 'owner', 'admin', 'pm'))
  WITH CHECK (get_user_role() IN ('foreman', 'owner', 'admin', 'pm'));


-- ═════════════════════════════════════════════════════════════
--  VERIFICATION QUERIES (run after migration)
-- ═════════════════════════════════════════════════════════════
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'time_off_requests' ORDER BY ordinal_position;
--
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename = 'time_off_requests';


-- ═════════════════════════════════════════════════════════════
--  DONE! Phase 8 time-off request schema is ready.
--  Next: Phase 8 Plan 03 will wire ScheduleTab to this table.
-- ═════════════════════════════════════════════════════════════
