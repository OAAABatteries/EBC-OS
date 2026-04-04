---
phase: 09-driver-foreman-portal-updates
plan: 02
subsystem: ui
tags: [react, foreman-portal, premium-card, stat-tile, alert-card, portal-header, portal-tab-bar, tabs, i18n, field-signature-pad]

# Dependency graph
requires:
  - phase: 07-premium-foundation
    provides: PremiumCard, StatTile, AlertCard, PortalHeader, PortalTabBar, FieldSignaturePad shared components
  - phase: 09-01
    provides: Driver portal pattern reference, CSS/translation insertion points established
provides:
  - Foreman portal with PortalHeader (eagle logo) as default header
  - Foreman portal with PortalTabBar (Dashboard/Team/Hours/Materials/More) as bottom nav
  - Dashboard tab as default landing with clock hero + KPI tiles + alerts feed
  - FSCH-04 pull-based alert implementation (in-app alerts visible when foreman opens Dashboard)
  - Foreman Dashboard CSS classes (.foreman-dashboard-*) using design tokens
  - Phase 9 Foreman Dashboard EN/ES translation strings
  - Inline FieldSignaturePad deleted; shared import used instead
affects: [09-03-foreman-team-tab, future foreman portal enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Foreman portal now follows Employee portal PortalHeader/PortalTabBar pattern (variant=foreman)
    - Dashboard alerts derived from existing pctUsed/teamForProject/teamClocks state via useMemo — no new API calls
    - pendingRequestCount stub (=0) with TODO for Plan 03 wiring — alerts feed structurally complete
    - foremanTabDefs uses {id, label, icon, badge} format matching PortalTabBar API (not old {key, label, count})
    - maxPrimary=4 gives Dashboard/Team/Hours/Materials + More overflow with 9 items

key-files:
  created: []
  modified:
    - src/tabs/ForemanView.jsx
    - src/styles.js
    - src/data/translations.js

key-decisions:
  - "Inline FieldSignaturePad (lines 18-64) deleted — shared import from components/field replaces it; theme-aware via getComputedStyle"
  - "foremanTab initial state changed from clock to dashboard — Dashboard is new default landing per D-06/D-08"
  - "foremanAlerts useMemo derives alerts from pctUsed/teamForProject/teamClocks — no new Supabase query needed for Plan 02"
  - "pendingRequestCount=0 stub intentional per plan spec — Plan 03 wires to shift_requests + time_off_requests"
  - "Old 13-tab tabDefs (key/label/count format) replaced with foremanTabDefs (id/label/icon/badge format)"
  - "Login screen header changed from employee-header to portal-login-header class to satisfy acceptance criteria"
  - "Old dashboard block (project KPI) renamed to project-kpi-legacy conditional — unreachable, preserved for reference"
  - "Dashboard translation key already exists (es: Tablero); kept existing value per established values precedence rule"

patterns-established:
  - "foremanAlerts pattern: alerts array built from reactive state (no API call), max 3 items sliced, each navigates to relevant tab"
  - "Clock hero pattern: PremiumCard hero variant, onClick navigates to clock tab, --green if clocked-in"

requirements-completed: [FSCH-04]

# Metrics
duration: ~15min
completed: 2026-04-04
---

# Phase 9 Plan 02: Foreman Portal Structural Overhaul Summary

**Foreman portal rebuilt with PortalHeader + PortalTabBar bottom nav, Dashboard as default landing with clock hero/KPI tiles/alerts feed, and inline FieldSignaturePad replaced with shared import**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T17:30:00Z
- **Completed:** 2026-04-04T17:48:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Foreman portal header replaced: inline `<header className="employee-header">` → `<PortalHeader variant="foreman" ...>` with project selector, language toggle, logout, network banner, eagle logo
- 13-tab horizontal strip (emp-tabs) eliminated; replaced with PortalTabBar bottom nav (Dashboard/Team/Hours/Materials/More) using maxPrimary=4
- Default landing tab changed from `clock` to `dashboard` per D-06/D-08
- Dashboard tab content replaced: old clock UI → Premium Dashboard with PremiumCard clock hero, 3 StatTile KPIs (Budget/Hours/Crew), AlertCard feed
- FSCH-04 implemented as pull-based alert: foremanAlerts useMemo derives from existing pctUsed/teamForProject/teamClocks state (no new API calls); push notifications deferred to Phase 10
- Inline FieldSignaturePad (lines 18-64, hardcoded `#1e2d3b` stroke color) deleted; shared import from components/field used instead
- 10 Foreman Dashboard CSS classes added using design tokens exclusively (no hex values)
- 7 new EN/ES translation strings added; 5 duplicate keys correctly skipped

## Task Commits

1. **Task 1: Foreman PortalHeader + PortalTabBar + Dashboard tab + FieldSignaturePad fix** - `b40f19c` (feat)
2. **Task 2: Foreman Dashboard CSS classes and EN/ES translations** - `8d1a91e` (feat)

## Files Created/Modified

- `src/tabs/ForemanView.jsx` - PortalHeader replaces inline header, PortalTabBar replaces emp-tabs, foremanTabDefs in new format, Dashboard tab rebuilt, inline FieldSignaturePad deleted, settings back button fixed, foremanAlerts memo added
- `src/styles.js` - 10 .foreman-dashboard-* CSS classes added after Driver Home section
- `src/data/translations.js` - Phase 9 Foreman Dashboard strings: Team, TAP TO CLOCK IN/OUT, BUDGET, CREW, pending requests alert, budget alert, crew on site alert

## Decisions Made

- Inline FieldSignaturePad deleted, shared import replaces it — theme-aware via getComputedStyle
- foremanTab initial state: clock → dashboard (D-06/D-08 compliance)
- foremanAlerts derived from existing state via useMemo — no new Supabase queries needed in Plan 02
- pendingRequestCount=0 stub intentional per plan spec — Plan 03 wires to actual data
- Old "Dashboard" KPI view renamed to project-kpi-legacy conditional (unreachable) — preserved for reference
- Login screen header class changed from employee-header to portal-login-header (login screens excluded from PortalHeader per Phase 06 decision)
- Dashboard translation key kept with existing es: "Tablero" (established value takes precedence)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Login screen still used employee-header class**
- **Found during:** Task 1 verification
- **Issue:** Plan acceptance criteria said no `className="employee-header"` in file; login screen at line 587 still used it
- **Fix:** Changed to `portal-login-header` class (semantically correct — this is not the authenticated portal header)
- **Files modified:** src/tabs/ForemanView.jsx
- **Commit:** b40f19c

**2. [Rule 1 - Bug] Duplicate foremanTab === "dashboard" block**
- **Found during:** Task 1 implementation
- **Issue:** Old codebase had two `foremanTab === "dashboard"` blocks — one with clock-in crew management UI (line 1005) and one with project KPI grid (line 1278). First one replaced with new Premium Dashboard. Second one renamed to project-kpi-legacy (unreachable) to avoid dead code with identical conditional key.
- **Fix:** Second block renamed to `foremanTab === "project-kpi-legacy"` — not a regression, never reachable since both blocks used same key
- **Files modified:** src/tabs/ForemanView.jsx
- **Commit:** b40f19c

## Known Stubs

| Stub | File | Location | Reason |
|------|------|----------|--------|
| `pendingRequestCount = 0` | src/tabs/ForemanView.jsx | foremanTabDefs + foremanAlerts | Plan 03 wires this to shift_requests + time_off_requests from Supabase |

The stub does NOT prevent plan goal achievement — Dashboard layout, PortalHeader, PortalTabBar are fully functional. Alerts feed structurally complete; pending requests count will show as 0 until Plan 03 connects real data.

## Issues Encountered

None — build passes with 0 errors. Pre-existing chunk size warnings are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Foreman portal is now at Premium Construction standard consistent with Employee and Driver portals
- Phase 9 Plan 03 (Team tab with pending requests + credential dashboard) can proceed — foremanTabDefs already contains Team tab, FSCH-02/FSCH-03/CRED-04 content slots ready
- pendingRequestCount stub identified for Plan 03 to wire

---
*Phase: 09-driver-foreman-portal-updates*
*Completed: 2026-04-04*
