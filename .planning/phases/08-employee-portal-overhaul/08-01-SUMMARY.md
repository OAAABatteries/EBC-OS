---
phase: 08-employee-portal-overhaul
plan: 01
subsystem: employee-portal
tags: [tab-shell, migration, css, stubs, drawings]
dependency_graph:
  requires: []
  provides: [tab-skeleton, phase8-css, time-off-migration, stub-components, drawings-tab]
  affects: [EmployeeView, HomeTab, ScheduleTab, CredentialsTab]
tech_stack:
  added: []
  patterns: [tab-extraction, stub-first, barrel-exports]
key_files:
  created:
    - supabase/migration_phase8_timeoff.sql
    - src/tabs/employee/HomeTab.jsx
    - src/tabs/employee/ScheduleTab.jsx
    - src/tabs/employee/CredentialsTab.jsx
  modified:
    - src/styles.js
    - src/tabs/EmployeeView.jsx
decisions:
  - credBadgeCount state lives in EmployeeView shell (passed down to CredentialsTab via onBadgeUpdate)
  - assignedProject derived via useMemo from mySchedule for DrawingsTab projectFilter
  - Settings back and handleLogout both target home tab (not clock)
metrics:
  duration: "4m"
  completed_date: "2026-04-04"
  tasks: 2
  files: 6
---

# Phase 8 Plan 01: Foundation — Tab Shell, CSS, Migration, Stubs Summary

**One-liner:** Phase 8 foundation complete — time_off_requests migration with RLS, 25 Phase 8 CSS classes, EmployeeView restructured to Home-default 5-primary-tab shell with Drawings wired and stub components extracted.

## What Was Built

### Task 1: Migration SQL and CSS Classes

Created `supabase/migration_phase8_timeoff.sql` with:
- `time_off_requests` table: 11 columns, 3 indexes, RLS enabled
- SELECT policy: employee reads own rows, management reads all
- INSERT policy: employee can only insert for self (auth.uid() = employee_id)
- UPDATE policy: management roles only (foreman/owner/admin/pm)

Appended 25 Phase 8 CSS classes to `src/styles.js`:
- Home dashboard: `.home-clock-hero`, `.home-clock-status`, `.home-clock-elapsed`, `.home-stat-row`, `.home-alerts-section`, `.home-alerts-header`, `.home-project-card`
- Schedule: `.week-strip`, `.week-day-cell`, `.week-day-cell.today`, `.week-day-cell.selected`, `.week-day-abbr`, `.week-day-num`, `.week-day-dot`, `.schedule-offline-notice`
- Credentials: `.cred-list`
- Bottom sheet: `.sheet-overlay`, `.sheet-container`, `.sheet-container.open`, `.sheet-header`, `.sheet-form`
- Utilities: `.section-label`, `.view-all-link`

### Task 2: Tab Shell + Stub Components

Created `src/tabs/employee/` directory with 3 stub files:
- `HomeTab.jsx` — full prop signature documented, returns empty content stub
- `ScheduleTab.jsx` — full prop signature documented, returns empty content stub
- `CredentialsTab.jsx` — shows EmptyState with Add Credential button

Restructured `src/tabs/EmployeeView.jsx`:
- Default tab changed from `"clock"` to `"home"`
- Added `credBadgeCount` state and `assignedProject` useMemo
- Imports: `Home`, `ShieldCheck` icons; `DrawingsTab` from field; `HomeTab`, `ScheduleTab`, `CredentialsTab` from `./employee/`
- `portalTabs` array now has 11 tabs (was 8): Home, Clock, Schedule, Materials, Credentials, Drawings, Time Log, JSA, Change Orders, RFIs, Settings
- `maxPrimary` changed from 4 to 5
- Settings back button and `handleLogout` now target `"home"` (was `"clock"`)
- Drawings tab wired: `<DrawingsTab readOnly={true} projectFilter={assignedProject?.id || null} t={t} />`
- Existing Schedule tab block replaced with `<ScheduleTab ... />` component

Build passed with zero errors.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `src/tabs/employee/HomeTab.jsx` — returns `<p>{t("Home")}</p>` placeholder. Intentional stub; Plan 02 builds the full Home tab implementation.
- `src/tabs/employee/ScheduleTab.jsx` — returns `<p>{t("Schedule")}</p>` placeholder. Intentional stub; Plan 03 builds the full Schedule tab with week strip.
- `src/tabs/employee/CredentialsTab.jsx` — shows EmptyState with no data source wired. Intentional stub; Plan 04 builds the full Credentials wallet.

These stubs are intentional per plan design — each subsequent plan (02, 03, 04) fills in the implementation.

## Self-Check: PASSED

All 6 files verified present. Both task commits found:
- `c154714` — feat(08-01): migration SQL + Phase 8 CSS classes
- `b52a8c8` — feat(08-01): tab shell restructure + stub components + Drawings wiring
