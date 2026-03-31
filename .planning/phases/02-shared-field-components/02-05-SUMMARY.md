---
phase: 02-shared-field-components
plan: 05
subsystem: ui
tags: [react, lucide-react, css-variables, portal, navigation, field-components, vitest]

# Dependency graph
requires:
  - phase: 02-01
    provides: CSS classes .field-tab-bar, .field-tab-item, .field-tab-badge, .field-tab-sheet, .field-tab-sheet-item, .field-tab-sheet-overlay added to src/styles.js

provides:
  - PortalHeader (COMP-04): three-variant glass header with optional project selector sub-strip
  - PortalTabBar (COMP-05): fixed bottom nav with More overflow bottom sheet
  - Both components exported from src/components/field/index.js barrel

affects:
  - 02-06 (remaining components)
  - 03 (DriverView portal wiring — uses PortalHeader + PortalTabBar)
  - 04 (EmployeeView portal wiring)
  - 05 (ForemanView portal wiring — 11-tab overflow critical)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Variant-via-props pattern for layout shell components (PortalHeader foreman/employee/driver)
    - React Fragment for adjacent DOM sibling outputs (header + sub-strip)
    - useState for bottom sheet open/close toggle (PortalTabBar)
    - Overflow tab detection via array slice — primaryTabs = tabs.slice(0, maxPrimary)
    - aria-expanded on More button for screen reader state communication

key-files:
  created:
    - src/components/field/PortalHeader.jsx
    - src/components/field/PortalHeader.test.jsx
    - src/components/field/PortalTabBar.jsx
    - src/components/field/PortalTabBar.test.jsx
  modified:
    - src/components/field/index.js

key-decisions:
  - "PortalHeader uses React Fragment for header+sub-strip so sub-strip can be omitted without a wrapper div"
  - "PortalTabBar sheet panel always rendered in DOM (CSS transform toggle), overlay only rendered when open — avoids layout shift"
  - "DOM structure test adjusted: container.childNodes.length checked directly (not via wrapper) since React Fragment renders children directly to container div"

patterns-established:
  - "Pattern: TDD test for DOM siblings uses container.childNodes.length not container.firstChild.childNodes.length when component uses React Fragment"
  - "Pattern: PortalTabBar maxPrimary prop defaults to 4 — callers can override for different portals"

requirements-completed:
  - COMP-04
  - COMP-05

# Metrics
duration: 9min
completed: 2026-03-31
---

# Phase 02 Plan 05: PortalHeader + PortalTabBar Summary

**Three-variant glass portal header (COMP-04) and fixed bottom nav with More overflow bottom sheet (COMP-05) — the structural frame for all field portals**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-31T21:09:49Z
- **Completed:** 2026-03-31T21:19:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- PortalHeader renders three distinct variants (foreman: title center + settings, employee: lang toggle + user + logout, driver: user + logout) all extending the existing glass .header class
- PortalTabBar renders a fixed bottom nav bar with up to 4 primary tabs + a "More" tab that opens a bottom sheet for overflow — critical for ForemanView's 11-tab layout
- Both components are fully theme-aware via CSS variable classes, contain zero hex literals, and export from the barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: Build PortalHeader (TDD RED)** - `937a398` (test)
2. **Task 1: Build PortalHeader (TDD GREEN)** - `df4fe7a` (feat)
3. **Task 2: Build PortalTabBar (TDD RED)** - `3b40e69` (test)
4. **Task 2: Build PortalTabBar (TDD GREEN)** - `25ff35d` (feat)

**Plan metadata:** (docs commit — see below)

_TDD tasks have separate test (RED) and implementation (GREEN) commits._

## Files Created/Modified

- `src/components/field/PortalHeader.jsx` — Three-variant portal header, extends .header and .logo CSS classes, optional project selector sub-strip at top:54
- `src/components/field/PortalHeader.test.jsx` — 13 tests covering all three variants, sub-strip conditional, t() prop, className composition
- `src/components/field/PortalTabBar.jsx` — Fixed bottom nav with overflow "More" tab, bottom sheet slide-up panel, overlay close pattern, icon+label tabs, badge support
- `src/components/field/PortalTabBar.test.jsx` — 16 tests covering primary tabs, More tab, overflow sheet open/close, overlay tap close, active states, aria-expanded, t() prop
- `src/components/field/index.js` — Added PortalHeader and PortalTabBar exports

## Decisions Made

- PortalHeader uses React Fragment so the project selector sub-strip renders as a true DOM sibling to the header, not nested inside it — keeps header height at exactly 54px
- PortalTabBar renders `.field-tab-sheet` always in DOM (CSS transform toggle), but only renders `.field-tab-sheet-overlay` when sheetOpen is true — avoids layout shift from DOM add/remove while keeping overlay non-intrusive when closed
- Test for "no sub-strip" checks `container.childNodes.length === 1` directly (not via a wrapper reference) because React Fragment renders children directly into the container div, not into a wrapper element

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DOM test assertion for React Fragment child count**
- **Found during:** Task 1 (PortalHeader GREEN phase — test run)
- **Issue:** Test originally checked `container.firstChild.childNodes.length` but React Fragment renders directly into container, making `container.firstChild` the `<header>` element itself (not a wrapper). The assertion `length === 1` was comparing header's child count, not the fragment's sibling count.
- **Fix:** Changed test to check `container.childNodes.length` directly — 1 when no sub-strip, 2 when sub-strip present
- **Files modified:** src/components/field/PortalHeader.test.jsx
- **Verification:** 13/13 tests pass
- **Committed in:** df4fe7a (Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test logic bug, not implementation bug)
**Impact on plan:** One-line test fix. Implementation matched plan exactly. No scope creep.

## Issues Encountered

None — implementation matched plan spec exactly. The one deviation was a test assertion error (checking wrong DOM node) caught immediately during GREEN phase.

## Known Stubs

None — both components are fully wired layout shells. They accept props and render them; no hardcoded empty values or placeholder text. Actual data wiring (logoutAction, userName, tabs array from portal state) happens in Phases 3-5 when portals are refactored.

## Next Phase Readiness

- Plan 02-06 (remaining components: EmptyState, AsyncState, FieldSignaturePad, MaterialRequestCard) can proceed independently — no dependency on this plan
- Phase 3 (DriverView wiring) can now use PortalHeader variant="driver" and PortalTabBar — the smallest portal pilot
- Phase 5 (ForemanView) specifically needs PortalTabBar's maxPrimary + overflow — 11 tabs confirmed working with the slice-and-More pattern
- Blocker noted: ForemanView tab grouping (which 4-5 become primary) still needs product decision with Emmanuel before Phase 5

---
*Phase: 02-shared-field-components*
*Completed: 2026-03-31*
