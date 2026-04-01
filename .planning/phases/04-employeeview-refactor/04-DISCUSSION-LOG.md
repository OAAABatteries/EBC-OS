# Phase 4: EmployeeView Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 04-employeeview-refactor
**Areas discussed:** Tab navigation layout, Clock-in flow components, Material request form, Map tile switcher touch targets

---

## Tab Navigation Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 4 primary + More overflow | Clock, Schedule, Materials, Settings as primary. Log, JSA, COS, RFIs in More overflow. | Yes |
| 5 primary + More overflow | Elevates Safety (JSA) to primary tab bar. | |
| Keep current 4 only | Other views stay contextual, accessed within tabs. | |

**User's choice:** 4 primary + More overflow (Recommended)
**Notes:** First portal to validate the PortalTabBar More overflow menu designed in Phase 2.

| Option | Description | Selected |
|--------|-------------|----------|
| Contextual badges | Clock shows timer, Materials shows pending count, Schedule shows shift count. | Yes |
| Dot indicators only | Simple activity dots, no numbers. | |
| You decide | Claude's discretion on badges. | |

**User's choice:** Contextual badges (Recommended)

---

## Clock-In Flow Components

| Option | Description | Selected |
|--------|-------------|----------|
| FieldButton disabled prop | Built-in disabled handling replaces inline opacity/cursor styles. | Yes |
| Custom CSS classes | .clock-btn-disabled class in styles.js. | |
| You decide | Claude's discretion. | |

**User's choice:** FieldButton disabled prop (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Full wiring | PortalHeader for 3 headers, FieldButton for actions, AsyncState for geo loading, FieldInput for override password. | Yes |
| Headers + buttons only | Wire headers and buttons, leave map/override flow with CSS-only fixes. | |
| You decide | Claude's discretion on depth. | |

**User's choice:** Full wiring (Recommended)

---

## Material Request Form

| Option | Description | Selected |
|--------|-------------|----------|
| FieldInput + FieldSelect with inputmode | Full migration with numeric keyboard support for quantities. | Yes |
| FieldInput only, keep native selects | FieldInput for text/number, native select for dropdowns. | |
| You decide | Claude's discretion. | |

**User's choice:** FieldInput + FieldSelect with inputmode (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Fields only -- no flow changes | Presentation layer, no business logic changes. | Yes |
| Add confirmation step | Review screen before submission. | |
| Add AsyncState to submission | Loading/success/error states on submit action. | |

**User's choice:** Fields only -- no flow changes (Recommended)

---

## Map Tile Switcher

| Option | Description | Selected |
|--------|-------------|----------|
| Floating pill buttons | 3 FieldButtons floating top-right of map, 44px min-height, themed. | Yes |
| Bottom segmented control | Toggle bar below map, never obscures content. | |
| You decide | Claude's discretion. | |

**User's choice:** Floating pill buttons (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| FieldButton with variant | Ghost for unselected, primary for active. Touch target + focus ring + theme for free. | Yes |
| Custom CSS classes | .map-tile-btn with custom sizing. | |
| You decide | Claude's discretion. | |

**User's choice:** FieldButton with variant (Recommended)

---

## Claude's Discretion

- Employee-specific CSS class naming pattern
- AsyncState vs manual pattern for loading states
- Loading state source for clock-in geolocation
- PortalTabBar More menu item ordering
- EmptyState messaging for empty tabs
- Leaflet map container handling within CSS-only constraint
- Skeleton shimmer approach

## Deferred Ideas

None -- discussion stayed within phase scope.
