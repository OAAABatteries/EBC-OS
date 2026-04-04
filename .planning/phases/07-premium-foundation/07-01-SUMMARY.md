---
phase: 07-premium-foundation
plan: "01"
subsystem: shared-field-components
tags: [ui, theme, design-tokens, PortalHeader, EmptyState, PortalTabBar]
dependency_graph:
  requires: []
  provides: [default-ebc-theme, eagle-logo-theme-aware, emptystate-40px, tabbar-accent-active]
  affects: [src/App.jsx, src/components/field/PortalHeader.jsx, src/components/field/EmptyState.jsx, src/styles.js]
tech_stack:
  added: []
  patterns: [CSS class override for theme-aware components, conditional className for CSS filter]
key_files:
  created: []
  modified:
    - src/App.jsx
    - src/components/field/PortalHeader.jsx
    - src/components/field/EmptyState.jsx
    - src/styles.js
    - src/components/field/EmptyState.test.jsx
    - src/components/field/PortalHeader.test.jsx
decisions:
  - "Default theme changed to ebc — new users see EBC Brand on first load"
  - "PortalHeader theme prop defaults to null — daylight filter is dormant until portal consumers pass the prop in Phases 8-9 (intentional)"
  - "portal-header-accent-border class overrides border-bottom-color only — width/style fallback to .header glass-border remains"
metrics:
  duration: "3m"
  completed: "2026-04-03"
  tasks_completed: 2
  files_modified: 6
---

# Phase 7 Plan 01: Premium Visual Foundation Summary

Applied Premium Construction visual language to existing shared components and set EBC Brand as the default theme for new users.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Default theme + PortalHeader eagle logo + header visual refresh | 7c96b0d | src/App.jsx, src/components/field/PortalHeader.jsx, src/styles.js |
| 2 | EmptyState redesign + PortalTabBar + FieldButton visual refresh | 29d7c46 | src/components/field/EmptyState.jsx, src/styles.js, test files |

## What Was Built

**Default theme changed to "ebc":** `useLocalStorage("theme", "ebc")` in App.jsx ensures new users see EBC Brand on first load. Existing users with saved theme are unaffected.

**Theme-aware eagle logo:** PortalHeader now accepts a `theme` prop. When `theme === 'daylight'`, the `portal-header-logo--dark` CSS class applies `filter:invert(1) brightness(0.3)` to invert the white eagle for light-background daylight theme. The theme prop defaults to null so existing foreman/employee/driver portal callers are not broken — they will wire the prop in Phases 8-9.

**Accent-tinted header border:** The `portal-header-accent-border` class overrides the existing `glass-border` color with `rgba(255,127,33,0.15)` — the EBC amber at low opacity. The border width/style remain from `.header`.

**EmptyState visual refresh:** Icon size reduced from 48px to 40px. Heading updated to `--text-base bold` (down from `--text-lg bold`). Body updated to `--text-sm` (down from `--text-base`). Both changes per UI-SPEC.

**PortalTabBar active state:** `.field-tab-item.active` now uses `var(--accent)` (not `var(--amber)`) with `transform:scale(0.95)`. The `--accent` alias was established in Phase 06.

**FieldButton / FieldCard audit:** Both confirmed already compliant — `.btn-primary` uses `var(--amber)` (same as `var(--accent)` per Phase 06 alias), no hex literals. FieldCard uses `var(--bg2)`, `var(--radius)`, `var(--glass-border)`. No changes needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated tests broken by plan spec changes**
- **Found during:** Task 2 (vitest run)
- **Issue:** EmptyState test expected `size={48}` (old value). PortalHeader test expected `alt="EBC"` (old value). Both were broken by intentional plan changes.
- **Fix:** Updated `EmptyState.test.jsx` description and assertions to expect `size={40}`. Updated `PortalHeader.test.jsx` alt assertion to expect `"EBC Eagle"`.
- **Files modified:** src/components/field/EmptyState.test.jsx, src/components/field/PortalHeader.test.jsx
- **Commit:** 29d7c46

### Pre-existing Failures (Out of Scope)

- `PortalHeader > variant="foreman" does NOT render languageToggle` — pre-existing test failure in main repo and 2 agent worktrees. The component renders `languageToggle` for foreman (correct behavior). The test spec is wrong. Not caused by this plan.

## Known Stubs

None — all changes wire real CSS tokens and component logic with no placeholder values.

## Self-Check: PASSED

- src/App.jsx: `useLocalStorage("theme", "ebc")` — line 354
- src/components/field/PortalHeader.jsx: `theme = null` prop, `portal-header-logo--dark` conditional class, `alt="EBC Eagle"`
- src/styles.js: `.portal-header-logo--dark`, `.portal-header-accent-border`, `.empty-state-heading` uses `--text-base`, `.empty-state-body` uses `--text-sm`, `.field-tab-item.active` uses `--accent` and `scale(0.95)`
- src/components/field/EmptyState.jsx: `size={40}`
- Commits verified: `7c96b0d` (Task 1), `29d7c46` (Task 2)
- Test results: 1013 passing, 3 pre-existing failures unrelated to this plan
