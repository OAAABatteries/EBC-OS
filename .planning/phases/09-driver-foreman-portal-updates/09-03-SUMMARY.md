---
phase: 09-driver-foreman-portal-updates
plan: 03
subsystem: ui
tags: [react, foreman-portal, team-tab, shift-requests, certifications, approval-flow, bottom-sheet, filter-chips, i18n, vitest]

# Dependency graph
requires:
  - phase: 09-02
    provides: Foreman portal with PortalHeader/PortalTabBar, Team tab slot, pendingRequestCount=0 stub, foremanAlerts useMemo
  - phase: 07-premium-foundation
    provides: shift_requests + certifications Supabase tables, PremiumCard, CredentialCard, FieldButton, FieldInput
provides:
  - Foreman Team tab with crew list + pending requests section + cert dashboard (3 sections per D-17)
  - Approve/deny flow via bottom sheet with optional comment (D-15)
  - pendingRequestCount wired to shift_requests (replaces Plan 02 stub)
  - Crew cert dashboard with All/Expiring/Expired filter chips (D-18)
  - View-only cert cards per crew member (D-19, CRED-04)
  - Foreman Team CSS classes (foreman-team-* + foreman-approval-sheet)
  - Phase 9 Foreman Team EN/ES translation strings with proper Spanish accents
  - Unit tests for approve/deny/error paths (tests/foreman-approval.test.jsx)
affects: [phase-09-verification, future foreman portal enhancements, Phase 10 notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Team tab: 3-section layout (crew list, pending requests, crew certs) in a single IIFE block
    - pendingRequests fetched via useEffect on [activeForeman, selectedProjectId, foremanTab]
    - crewCerts fetched via useEffect on [activeForeman, foremanTab, teamForProject]
    - filteredCrewCerts: useMemo groups certs by employee, computes computedStatus, applies certFilter
    - Approval bottom sheet: approvalSheet state {request, action} drives conditional render with field-tab-sheet-overlay
    - Dynamic import path: src/lib/supabase (not supabaseClient — incorrect path in plan spec, fixed via Rule 1)
    - Test mock: vi.mock('../src/lib/supabase') with mockFrom/mockUpdate/mockEq chain

key-files:
  created:
    - tests/foreman-approval.test.jsx
  modified:
    - src/tabs/ForemanView.jsx
    - src/styles.js
    - src/data/translations.js

key-decisions:
  - "Dynamic import path corrected to ../lib/supabase — plan spec used ../supabaseClient which does not exist; correct path matches CredentialsTab, HomeTab, ScheduleTab patterns"
  - "Expired chip key uses existing translation (Vencido singular) — Expired key already exists from Phase 8 with es: Vencido; plan spec value Vencidos skipped per established-values precedence rule"
  - "Test uses vi.mock with chained mockFrom/mockUpdate/mockEq to simulate builder pattern; tests handler logic in isolation without mounting ForemanView"
  - "CredentialCard rendered view-only (no onTap prop) per D-19 — foreman sees cert data but cannot edit"

# Metrics
duration: ~20min
completed: 2026-04-04
---

# Phase 9 Plan 03: Foreman Team Tab Summary

**Foreman Team tab fully implemented with pending request approval queue (bottom sheet), crew certification dashboard with filter chips, and unit tests for the approval handler**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-04T18:00:00Z
- **Completed:** 2026-04-04T18:20:00Z
- **Tasks:** 1 (+ checkpoint)
- **Files modified:** 3 modified, 1 created

## Accomplishments

- Pending Requests section added to Team tab: queries shift_requests (status=pending) from Supabase, displays PremiumCard rows per request, Approve/Deny buttons open bottom sheet
- Approval bottom sheet (D-15): slides up over content, shows employee name + shift info, optional comment via FieldInput, confirm button calls Supabase UPDATE on shift_requests
- pendingRequestCount stub replaced with `pendingRequests.length` — Team tab badge and Dashboard alerts now reflect live pending count
- Crew Certifications section added (CRED-04): queries certifications for all teamForProject crew, groups by employee, renders CredentialCard rows (view-only per D-19)
- Filter chips (All/Expiring/Expired) filter cert list via filteredCrewCerts useMemo with 30-day expiry threshold
- 6 new CSS classes for Team sections + 8 classes for approval sheet added to styles.js using design tokens
- 28 EN/ES translation strings added with proper Spanish accents (Confirmar Aprobación, Confirmar Denegación)
- Unit test file created: 3 tests covering approve path, deny path with comment, and error/reject path — all pass

## Task Commits

1. **Task 1: Foreman Team tab + pending requests + cert dashboard + approval handler + CSS + translations + tests** - `7687cd3` (feat)

## Files Created/Modified

- `src/tabs/ForemanView.jsx` — Team tab sections added, state declarations for Team features, 3 useEffects (pending requests fetch, cert fetch, no new side effects), handleApproveRequest, filteredCrewCerts useMemo, approval bottom sheet JSX, CredentialCard + FieldInput imported
- `src/styles.js` — foreman-team-section, foreman-team-count, foreman-team-cert-chip--active, foreman-approval-sheet CSS classes added
- `src/data/translations.js` — PENDING REQUESTS, CREW CERTIFICATIONS, Confirm Approval/Denial with accents, 28 total new strings
- `tests/foreman-approval.test.jsx` — 3 vitest unit tests for approve/deny/error paths

## Decisions Made

- Dynamic import corrected to `../lib/supabase` (plan spec had wrong path `../supabaseClient`)
- "Expired" chip keeps existing es: "Vencido" (established value from Phase 8 takes precedence over plan spec "Vencidos")
- CredentialCard rendered without `onTap` prop — enforces view-only per D-19
- Approval tests mock Supabase builder chain directly — no component mount needed for handler logic verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong Supabase import path**
- **Found during:** Task 1 implementation (test run failure)
- **Issue:** Plan spec used `import("../supabaseClient")` but this file does not exist. Correct path is `../lib/supabase` (matches CredentialsTab, HomeTab, ScheduleTab patterns)
- **Fix:** Changed all 3 dynamic imports in ForemanView.jsx and updated test mock path accordingly
- **Files modified:** src/tabs/ForemanView.jsx, tests/foreman-approval.test.jsx
- **Commit:** 7687cd3

**2. [Rule - Established Values] "Expired" translation key already exists**
- **Found during:** Task 1 translations insert
- **Issue:** `"Expired": { es: "Vencido" }` already exists at line 274 from Phase 8. Plan spec requested `es: "Vencidos"` (plural). Duplicate key would silently overwrite.
- **Fix:** Skipped adding "Expired" entry — existing "Vencido" value used for filter chip
- **Files modified:** none (omission)
- **Impact:** Expired chip shows "Vencido" (singular) instead of "Vencidos" (plural) in ES mode

## Known Stubs

None — all Plan 02 stubs resolved. pendingRequestCount now wired to live Supabase data.

## Issues Encountered

- Pre-existing test failure: `PortalHeader variant="foreman" does NOT render languageToggle` (5 instances across main + .claude/worktrees copies). Out of scope — exists before Plan 03, not caused by these changes.
- Build: 0 errors, pre-existing chunk size warnings only.

## User Setup Required

None.

## Next Phase Readiness

- Phase 9 is complete. All 9 requirements across Driver and Foreman portals are implemented.
- Phase 10 (Notifications + Cross-Portal Polish) can proceed — NOTIF push notifications deferred from Phase 9 per plan spec.
- Pending request alerts are now pull-based (FSCH-04 complete) — Phase 10 will add push delivery.

---
*Phase: 09-driver-foreman-portal-updates*
*Completed: 2026-04-04*

## Self-Check: PASSED

- FOUND: src/tabs/ForemanView.jsx
- FOUND: src/styles.js
- FOUND: src/data/translations.js
- FOUND: tests/foreman-approval.test.jsx
- FOUND commit: 7687cd3 (feat Task 1)
- Build: 0 errors
- Tests: 3 approval tests pass, 5 pre-existing PortalHeader failures (out of scope)
