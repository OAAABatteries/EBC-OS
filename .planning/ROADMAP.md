# Roadmap: EBC-OS v1.0 Field Portal Perfection

## Overview

Transform EBC-OS field portals from functional-but-amateur into commercial-grade construction apps. The journey runs from token foundation (establishing the vocabulary) through shared component extraction (building the toolkit) to portal-by-portal refactors in order of smallest to largest, finishing with a full theme and outdoor-readiness audit. Every phase delivers a complete, verifiable capability before the next one begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Token Foundation** - Define the design vocabulary (spacing, typography, touch, shadows, semantic colors) as CSS custom properties
- [ ] **Phase 2: Shared Field Components** - Build and verify the shared component toolkit that all portal refactors will consume
- [ ] **Phase 3: DriverView Refactor** - Migrate the smallest portal as the process pilot — zero inline styles, shared components wired
- [ ] **Phase 4: EmployeeView Refactor** - Migrate the mid-size portal using the proven process — forms, clock-in, and map controls fully polished
- [ ] **Phase 5: ForemanView Refactor** - Migrate the largest portal — 11-tab nav collapsed to bottom bar, phase colors tokenized, all tabs complete
- [ ] **Phase 6: Polish and Theme Audit** - Cross-portal polish, 5-theme gauntlet, outdoor contrast verification, global touch/scroll optimizations

## Phase Details

### Phase 1: Token Foundation
**Goal**: The design vocabulary exists as CSS custom properties — every portal can consume spacing, typography, touch targets, shadows, and semantic color aliases from tokens instead of hard-coded values
**Depends on**: Nothing (first phase)
**Requirements**: TOKN-01, TOKN-02, TOKN-03, TOKN-04, TOKN-05, TOKN-06, TOKN-07
**Success Criteria** (what must be TRUE):
  1. A developer can apply consistent spacing to any element using `--space-*` variables without writing a pixel value
  2. All interactive elements across the app can enforce 44px touch targets via the `--touch-min` token
  3. Focus rings appear on all interactive elements using the `--focus-ring` token — no inline focus styles anywhere
  4. Semantic color aliases (`--phase-*`, `--status-*`) resolve correctly in all 5 themes without breaking existing theme switching
  5. Shadow classes (sm/md/lg) and transition timing classes exist and render visibly different from each other
**Plans:** 1/3 plans executed
Plans:
- [x] 01-01-PLAN.md — Create universal tokens (tokens.css) and wire into main.jsx
- [ ] 01-02-PLAN.md — Add per-theme shadow scale and semantic color aliases to THEMES
- [ ] 01-03-PLAN.md — Add utility classes to styles.js and update text utilities to consume tokens

### Phase 2: Shared Field Components
**Goal**: A `src/components/field/` directory contains all 11 shared components, each consuming design tokens and verified in isolation before any portal touches them
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, COMP-11
**Success Criteria** (what must be TRUE):
  1. `FieldButton` renders at 44px minimum height in all three variants (primary, ghost, danger) and shows a loading spinner when its loading prop is true
  2. `AsyncState` wraps any async operation and correctly renders loading skeleton, empty state with message, or error state without the parent component managing that logic
  3. `PortalHeader` and `PortalTabBar` render correctly in all 5 themes with no hard-coded colors
  4. `FieldSignaturePad` draws and saves signatures using theme-aware colors — no hard-coded hex values present in its source
  5. `MaterialRequestCard` displays a material request identically whether rendered in DriverView, EmployeeView, or ForemanView
**Plans**: TBD
**UI hint**: yes

### Phase 3: DriverView Refactor
**Goal**: DriverView is fully migrated — zero inline styles, all shared field components wired, loading and empty states on every async operation, the pilot process proven
**Depends on**: Phase 2
**Requirements**: DRVR-01, DRVR-02, DRVR-03, DRVR-04
**Success Criteria** (what must be TRUE):
  1. A `grep "style={{" src/tabs/DriverView.jsx` returns zero results
  2. Every button and input in DriverView is tappable without mis-tap at 375px viewport — touch targets visibly meet 44px minimum
  3. Route cards display using `FieldCard` and `StatusBadge` — no custom card markup in DriverView
  4. The route queue and completed deliveries list show skeleton screens while loading and an `EmptyState` component when no data exists
**Plans**: TBD
**UI hint**: yes

### Phase 4: EmployeeView Refactor
**Goal**: EmployeeView is fully migrated — zero inline styles, `FieldInput`/`FieldSelect` wired to all form fields with proper inputmode, clock-in and map tile controls meet touch requirements
**Depends on**: Phase 3
**Requirements**: EMPL-01, EMPL-02, EMPL-03, EMPL-04, EMPL-05
**Success Criteria** (what must be TRUE):
  1. A `grep "style={{" src/tabs/EmployeeView.jsx` returns zero results
  2. The clock-in flow uses `PortalHeader`, `FieldButton`, and `AsyncState` — no custom header or spinner markup in EmployeeView
  3. The material request form fields use `FieldInput`/`FieldSelect` with appropriate `inputmode` attributes (numeric fields open the numeric keyboard on mobile)
  4. Map tile switcher buttons are tappable without mis-tap — all meet 44px minimum touch target
**Plans**: TBD
**UI hint**: yes

### Phase 5: ForemanView Refactor
**Goal**: ForemanView is fully migrated — zero inline styles, 11-tab horizontal scroll replaced with a bottom tab bar (4-5 primary tabs + More menu), phase colors tokenized, all 11 tabs complete before merge
**Depends on**: Phase 4
**Requirements**: FRMN-01, FRMN-02, FRMN-03, FRMN-04, FRMN-05, FRMN-06
**Success Criteria** (what must be TRUE):
  1. A `grep "style={{" src/tabs/ForemanView.jsx` returns zero results
  2. The foreman's tab navigation is a bottom bar with 4-5 primary tabs and a "More" overflow — no horizontal scrolling tab strip exists
  3. KPI cards display dollar amounts, percentages, and crew counts using the typography scale — all values use the same font-size token, not ad-hoc sizes
  4. Phase status colors in the dashboard render correctly in all 5 themes — `--phase-*` tokens in use, no hex literals in JSX
  5. Daily reports, JSA, and crew sections use `FieldCard`, `FieldButton`, `AsyncState`, and `FieldSignaturePad` from the shared component library
**Plans**: TBD
**UI hint**: yes

### Phase 6: Polish and Theme Audit
**Goal**: All five themes pass a full visual gauntlet across all portals, global touch and scroll optimizations are applied, offline status indicators reach all portals, and the app is verified readable outdoors
**Depends on**: Phase 5
**Requirements**: PLSH-01, PLSH-02, PLSH-03, PLSH-04, PLSH-05
**Success Criteria** (what must be TRUE):
  1. Switching between all 5 themes on any portal shows no broken colors, missing variables, or white-flash moments — all themes render correctly end to end
  2. Tapping any button in any portal triggers action immediately — no 300ms tap delay perceptible by the user
  3. Scrolling a data list does not trigger browser pull-to-refresh — `overscroll-behavior: contain` is in effect
  4. Every portal layout is usable without horizontal scrolling at 375px, 768px, and 1024px viewports
  5. The offline/sync status indicator appears consistently in all three portals and shows a pending-changes count when actions are queued but not yet synced
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Token Foundation | 1/3 | In Progress|  |
| 2. Shared Field Components | 0/TBD | Not started | - |
| 3. DriverView Refactor | 0/TBD | Not started | - |
| 4. EmployeeView Refactor | 0/TBD | Not started | - |
| 5. ForemanView Refactor | 0/TBD | Not started | - |
| 6. Polish and Theme Audit | 0/TBD | Not started | - |
