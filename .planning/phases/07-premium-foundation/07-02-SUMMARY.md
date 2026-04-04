---
phase: 07-premium-foundation
plan: 02
subsystem: database
tags: [supabase, postgres, rls, scheduling, certifications, sql-migration]

# Dependency graph
requires:
  - phase: 07-premium-foundation plan 01
    provides: design tokens and UI foundation
provides:
  - available_shifts table with RLS (DATA-01)
  - shift_requests table with FK to available_shifts and RLS (DATA-03)
  - certifications extended with issuing_org, photo_path, cert_category (DATA-02)
affects: [08-employee-portal-overhaul, 09-driver-foreman-portal-updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration files use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS for idempotency"
    - "RLS enabled immediately after table creation (D-15 pattern)"
    - "get_user_role() function for role checks in RLS policies"
    - "Separate granular policies per operation (SELECT/INSERT/UPDATE/DELETE)"

key-files:
  created:
    - supabase/migration_phase7_scheduling.sql
  modified: []

key-decisions:
  - "available_shifts.date stored as TEXT (not DATE) to match existing schema conventions"
  - "shift_requests employees can INSERT for themselves (auth.uid() = employee_id) while foremen manage approvals"
  - "available_shifts allows employee reads (FOR SELECT USING true) so all employees can see open shifts"
  - "certifications photo_path has no DEFAULT (nullable) since photo is optional"

patterns-established:
  - "Phase 7 migrations use uuid_generate_v4() consistent with schema.sql UUID pattern"
  - "Scheduling status columns use CHECK constraints: open/claimed/cancelled, pending/approved/denied"

requirements-completed: [DATA-01, DATA-02, DATA-03]

# Metrics
duration: 1min
completed: 2026-04-04
---

# Phase 7 Plan 02: Scheduling Schema Foundation Summary

**Supabase migration adding available_shifts and shift_requests tables with granular RLS, plus certifications column extensions (issuing_org, photo_path, cert_category) for Phase 8 scheduling and credential UI**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-04T04:12:35Z
- **Completed:** 2026-04-04T04:13:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `available_shifts` table with all 12 required columns (date, time_start, time_end, project_id, foreman_id, trade, overtime, status, claimed_by, created_at, updated_at + id) and 4 indexes
- Created `shift_requests` table with FK to available_shifts (shift_id REFERENCES available_shifts), 3 indexes, and granular employee/foreman RLS split
- Extended `certifications` table with 3 new columns (issuing_org, photo_path, cert_category) using idempotent ADD COLUMN IF NOT EXISTS
- 7 total RLS policies across both tables (4 available_shifts + 3 shift_requests), all using get_user_role() consistent with existing rls_policies.sql

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scheduling tables, certifications extension, and RLS policies** - `331ff43` (feat)

**Plan metadata:** (docs commit — pending)

## Files Created/Modified
- `supabase/migration_phase7_scheduling.sql` - Two new scheduling tables, certifications column extensions, 7 RLS policies, 7 indexes. Safe to re-run (IF NOT EXISTS throughout).

## Decisions Made
- `available_shifts.date` stored as TEXT (not DATE type) matching existing schema.sql conventions where date-like fields use TEXT
- Employees get SELECT on available_shifts without restriction (USING true) so they can browse and claim open shifts
- `certifications.photo_path` has no DEFAULT value (nullable) since cert photos are optional documents
- shift_requests RLS: employees INSERT for themselves (auth.uid() = employee_id check), foremen/admins approve/deny via UPDATE
- No DELETE policy on shift_requests — employees cancel via status update, not hard delete (preserves audit trail)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Migration SQL file must be run in Supabase Dashboard SQL Editor before Phase 8 UI work begins.

## Next Phase Readiness
- Phase 8 (Employee Portal Overhaul) can now wire schedule UI to `available_shifts` and `shift_requests` tables
- Phase 9 (Foreman Portal) can use `available_shifts` POST endpoints for shift posting
- `certifications` table ready for credential wallet UI with photo upload support
- All tables are idempotent — safe to run migration in staging and production

---
*Phase: 07-premium-foundation*
*Completed: 2026-04-04*
