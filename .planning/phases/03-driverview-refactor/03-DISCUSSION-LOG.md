# Phase 3: DriverView Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-driverview-refactor
**Areas discussed:** Route card layout, Header + tab nav wiring, KPI summary bar, Loading + empty states

---

## Route Card Layout

### Card structure

| Option | Description | Selected |
|--------|-------------|----------|
| FieldCard + StatusBadge | Wrap each stop in FieldCard, use StatusBadge for status. Consistent with other portals. | |
| Dedicated RouteStopCard | New component for route-specific concerns (drag-drop, stop numbering, distance). Adds 12th component. | |
| You decide | Claude picks best approach | ✓ |

**User's choice:** Claude's discretion
**Notes:** Route cards have unique drag-and-drop, stop numbering, and distance display. Claude decides best composition.

### Stop number badge

| Option | Description | Selected |
|--------|-------------|----------|
| Colored circle (keep current look) | Amber for in-transit, accent for queued. Move styling to CSS classes. | |
| StatusBadge with number | Reuse StatusBadge for stop number + status color. | |
| You decide | Claude picks based on component fit | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

### Drag-and-drop

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is, clean up styles | HTML5 drag events stay, just replace inline styles with CSS classes. | |
| Improve touch experience | Touch-friendly alternative with long-press and visual feedback. | ✓ |

**User's choice:** Improve touch experience
**Notes:** HTML5 drag events work poorly on mobile. User wants long-press to drag with clear visual feedback.

---

## Header + Tab Navigation

### Tab navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab bar | Use PortalTabBar at bottom with icons + labels. 3 tabs, no More menu. Consumer app convention. | ✓ |
| Keep top tabs | Only 3 tabs — top tabs fine. Save bottom nav for ForemanView. | |
| You decide | Claude picks based on cross-portal consistency | |

**User's choice:** Bottom tab bar (PortalTabBar)
**Notes:** Establishes the bottom-nav pattern for all portals.

### Header

| Option | Description | Selected |
|--------|-------------|----------|
| Wire PortalHeader | Replace employee-header with PortalHeader. Consistent across portals. | ✓ |
| You decide | Claude decides based on driver's simpler needs | |

**User's choice:** Wire PortalHeader
**Notes:** None

---

## KPI Summary Bar

| Option | Description | Selected |
|--------|-------------|----------|
| CSS classes, no new component | Create driver-specific CSS classes in styles.js consuming tokens. | |
| Reuse FieldCard | Compact FieldCard variant for stat tiles. | |
| You decide | Claude picks cleanest approach | ✓ |

**User's choice:** Claude's discretion
**Notes:** Current foreman-kpi-card classes are close but have foreman-specific sizing. All inline styles must go.

---

## Loading + Empty States

### AsyncState pattern

| Option | Description | Selected |
|--------|-------------|----------|
| AsyncState wrapper | Wrap route queue and completed list in AsyncState for automatic loading/empty/error handling. | |
| Manual loading/empty | Replace inline empty divs with EmptyState component. Add skeletons manually. | |
| You decide | Claude picks based on data flow | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

### Data loading source

| Option | Description | Selected |
|--------|-------------|----------|
| Wire real loading state from parent | DriverView receives isLoading prop from App.jsx. Show skeletons during fetch. | |
| Local loading simulation | Brief skeleton flash on mount for perceived polish. | |
| You decide | Claude decides based on App.jsx data flow | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

## Claude's Discretion

- Route card component structure
- Stop number badge implementation
- KPI tile approach
- AsyncState vs manual empty/loading pattern
- Loading state source

## Deferred Ideas

None — discussion stayed within phase scope.
