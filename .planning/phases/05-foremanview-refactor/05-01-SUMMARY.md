---
phase: 05-foremanview-refactor
plan: 01
subsystem: ui
tags: [css, design-tokens, styles, foreman, field-portal]

# Dependency graph
requires:
  - phase: 01-token-foundation
    provides: CSS custom property tokens (--text-*, --space-*, --touch-min, --radius-*, --weight-*, --leading-*, --transition-*)
  - phase: 02-shared-field-components
    provides: Shared field components consuming tokens; established frm-* naming convention precedent
provides:
  - Updated FOREMAN VIEW section in src/styles.js with all 8 existing .foreman-* classes consuming design tokens
  - 104-line frm-* CSS class vocabulary covering all 13 ForemanView tab UI regions
  - Phase status utility classes (.frm-phase-*) using var(--phase-*) tokens
  - Clock, notes, hours, JSA, drawings, materials, reports, documents, site, lookahead, settings CSS classes
affects:
  - 05-02: ForemanView JSX inline style elimination (tab groups 1-5 need these classes)
  - 05-03: ForemanView JSX inline style elimination (tab groups 6-10)
  - 05-04: ForemanView JSX wire-up and component integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - frm-{region}-{element} CSS naming convention mirrors driver-* (Phase 3) and emp-* (Phase 4)
    - All foreman-specific classes consume var(--token) exclusively — zero hex, zero hard-coded px
    - Phase status colors use var(--phase-*) tokens resolving to theme-appropriate values across all 5 themes

key-files:
  created: []
  modified:
    - src/styles.js

key-decisions:
  - ".foreman-* classes updated in-place — not duplicated — to maintain single source of truth"
  - "frm-team-clock-btn uses var(--amber) not var(--accent) — accent is undefined in all themes"
  - "foreman-kpi-value updated from 22px to var(--text-display) per D-05 (FRMN-04)"
  - "foreman-team-row gets min-height:var(--touch-min) to satisfy FRMN-03 touch target contract"

patterns-established:
  - "frm-{region}-{element}: Naming pattern for all ForemanView CSS classes"
  - "Token-only classes: No hex or raw px values permitted in any new foreman CSS class"
  - "Phase color tokens: frm-phase-* classes reference var(--phase-*) for multi-theme safety"

requirements-completed: [FRMN-01, FRMN-04, FRMN-06]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 5 Plan 01: ForemanView CSS Vocabulary Summary

**Tokenized 8 existing .foreman-* classes and added 104-line frm-* CSS vocabulary covering all 13 ForemanView tab regions with zero hex literals and zero hard-coded pixel values**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T19:44:25Z
- **Completed:** 2026-04-01T19:47:18Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Updated all 8 existing `.foreman-*` classes to consume design tokens — replaced hard-coded `font-size:22px`, `font-size:9px`, `gap:10px`, `font-size:13px`, `padding:8px 12px`, and `margin:8px` with `var(--text-*)`, `var(--space-*)`, `var(--touch-min)`
- Added `min-height:var(--touch-min)` to `.foreman-team-row` satisfying FRMN-03 touch target contract
- Added 104 new `frm-*` CSS classes covering all 13 ForemanView tabs: content-pad, kpi extensions, budget, team, hours, materials, JSA (including matrix and PPE grid), drawings, lookahead, reports (with weather-btn states), documents, site, notes, settings, clock, and phase status utilities
- Phase status classes (`.frm-phase-active`, `.frm-phase-dot.active`, etc.) use `var(--phase-*)` tokens satisfying FRMN-06

## Task Commits

Each task was committed atomically:

1. **Task 1: Update existing .foreman-* classes to consume design tokens** - `55d09e5` (feat)
2. **Task 2: Add new frm-* CSS classes for all ForemanView UI regions** - `281282b` (feat)

## Files Created/Modified

- `src/styles.js` — FOREMAN VIEW section: 8 existing classes tokenized + 104 frm-* classes appended (net +138 lines)

## Decisions Made

- `.foreman-*` classes updated in-place, not duplicated — preserves single source of truth for existing ForemanView JSX usage
- `frm-team-clock-btn` uses `var(--amber)` not `var(--accent)` — `--accent` is undefined across all themes (documented blocker in STATE.md)
- `foreman-kpi-value` updated from `font-size:22px` to `font-size:var(--text-display)` per D-05 decision in UI-SPEC (FRMN-04 satisfied)
- `foreman-team-row` gets `min-height:var(--touch-min)` per FRMN-03 touch target requirement
- Responsive override for `.foreman-project-select` also updated to use `var(--text-base)` and `var(--space-3)`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The actual location of FOREMAN VIEW section was around line 838 (not 1042 as noted in plan context — code evolved since spec was written), but the correct lines were identified via grep before editing.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/styles.js` FOREMAN VIEW section is complete and ready for Plans 2-4
- Plans 2 and 3 can now replace ForemanView.jsx inline styles by referencing `frm-*` class names
- Plan 4 JSX wire-up (PortalHeader, PortalTabBar, shared components) can use `frm-section-title`, `frm-flex-between`, and tab-specific classes
- No blockers for Phase 5 continuation

---
*Phase: 05-foremanview-refactor*
*Completed: 2026-04-01*
