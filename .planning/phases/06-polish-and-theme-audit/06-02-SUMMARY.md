---
phase: 06-polish-and-theme-audit
plan: 02
subsystem: ui
tags: [network-status, offline-indicator, portal-header, i18n]

requires:
  - phase: 06-polish-and-theme-audit
    plan: 01
    provides: Network banner CSS classes (.network-banner, --offline, --reconnecting)
  - phase: 02-shared-field-components
    provides: PortalHeader component, useNetworkStatus hook
provides:
  - PortalHeader network prop rendering offline/reconnecting sticky banner
  - useNetworkStatus wired into all 3 portal views (Driver, Employee, Foreman)
  - Translation keys for offline banner strings (EN/ES)
affects: [DriverView, EmployeeView, ForemanView, PortalHeader]

tech-stack:
  added: []
  patterns: [conditional network banner rendering via optional prop, t() fallback pattern for untranslated contexts]

key-files:
  created: []
  modified: [src/components/field/PortalHeader.jsx, src/data/translations.js, src/tabs/DriverView.jsx, src/tabs/EmployeeView.jsx, src/tabs/ForemanView.jsx]

key-decisions:
  - "WifiOff icon imported directly in PortalHeader (self-contained, no barrel re-export needed)"
  - "Login/PIN screen PortalHeaders do not receive network prop -- offline banner only shows in authenticated views"
  - "EmployeeView offline fallback screen receives network prop since user is already authenticated"

patterns-established:
  - "Optional prop pattern: when network is not passed, banner JSX evaluates to null (no unnecessary renders)"

requirements-completed: [PLSH-05]

duration: 2min
completed: 2026-04-03
---

# Phase 6 Plan 02: Offline/Sync Status Indicator Summary

**Wire useNetworkStatus hook into all 3 portals via PortalHeader network prop for offline/reconnecting banner with EN/ES translations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T15:45:15Z
- **Completed:** 2026-04-03T15:47:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended PortalHeader with optional `network` prop that renders sticky offline/reconnecting banner
- Imported WifiOff icon from lucide-react for offline banner visual indicator
- Added 5 translation keys (Offline, actions pending, Back online, syncing, actions) with Spanish translations
- Wired useNetworkStatus hook into DriverView, EmployeeView, and ForemanView
- Passed network prop to all logged-in PortalHeader instances (4 total across 3 portals)
- Kept login/PIN screen PortalHeaders clean (no network prop)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PortalHeader with network prop + add translation keys** - `76d2602` (feat)
2. **Task 2: Wire useNetworkStatus into all 3 portal views** - `5aeff2d` (feat)

## Files Created/Modified
- `src/components/field/PortalHeader.jsx` - Added network prop, WifiOff import, offline/reconnecting banner JSX
- `src/data/translations.js` - Added 5 offline banner translation keys (EN/ES)
- `src/tabs/DriverView.jsx` - Import useNetworkStatus, call hook, pass to PortalHeader
- `src/tabs/EmployeeView.jsx` - Import useNetworkStatus, call hook, pass to 2 PortalHeaders (logged-in + offline fallback)
- `src/tabs/ForemanView.jsx` - Import useNetworkStatus, call hook, pass to PortalHeader

## Decisions Made
- WifiOff icon imported directly in PortalHeader to keep component self-contained
- Login/PIN screen PortalHeaders intentionally excluded from network prop to avoid showing offline banner before authentication
- EmployeeView offline fallback screen included because user is already authenticated at that point

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data sources are wired (useNetworkStatus hook provides live network state).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PLSH-05 complete: all 3 portals show offline/reconnecting banners
- Network banner CSS from Plan 01 now fully consumed
- Ready for Plan 03 (remaining polish items)

---
## Self-Check: PASSED

All 5 modified files exist. Both commit hashes (76d2602, 5aeff2d) verified in git log.

---
*Phase: 06-polish-and-theme-audit*
*Completed: 2026-04-03*
