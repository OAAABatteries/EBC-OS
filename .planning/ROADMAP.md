# Roadmap: EBC-OS

## Overview

### v1.0: Field Portal Perfection (Complete)

Transform EBC-OS field portals from functional-but-amateur into commercial-grade construction apps. The journey runs from token foundation (establishing the vocabulary) through shared component extraction (building the toolkit) to portal-by-portal refactors in order of smallest to largest, finishing with a full theme and outdoor-readiness audit. Every phase delivers a complete, verifiable capability before the next one begins.

### v1.1: Premium Construction UI Overhaul

Transform all 3 field portals into presentation-ready premium construction apps. EBC Brand theme as default, proactive employee dashboard, shift scheduling with pickup/time-off workflows, credential wallet with expiry tracking, universal floor plan access, foreman crew management tools, and a cross-portal notification system. Four phases: foundation (data + design system), employee portal overhaul, driver + foreman updates, notifications + polish.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0 Phases (Complete)

- [x] **Phase 1: Token Foundation** - Define the design vocabulary (spacing, typography, touch, shadows, semantic colors) as CSS custom properties (completed 2026-03-30)
- [x] **Phase 2: Shared Field Components** - Build and verify the shared component toolkit that all portal refactors will consume
- [ ] **Phase 3: DriverView Refactor** - Migrate the smallest portal as the process pilot -- zero inline styles, shared components wired
- [ ] **Phase 4: EmployeeView Refactor** - Migrate the mid-size portal using the proven process -- forms, clock-in, and map controls fully polished
- [ ] **Phase 5: ForemanView Refactor** - Migrate the largest portal -- 11-tab nav collapsed to bottom bar, phase colors tokenized, all tabs complete
- [x] **Phase 6: Polish and Theme Audit** - Cross-portal polish, 5-theme gauntlet, outdoor contrast verification, global touch/scroll optimizations (completed 2026-04-03)

### v1.1 Phases

- [ ] **Phase 7: Premium Foundation** - Data model extensions, Premium Construction design system, shared components for scheduling/credentials/alerts
- [ ] **Phase 8: Employee Portal Overhaul** - New Home dashboard, enhanced Schedule with shift pickup and time-off, Credential wallet, Drawings access
- [ ] **Phase 9: Driver + Foreman Portal Updates** - Driver visual refresh with alerts and drawings; Foreman scheduling tools, shift management, credential dashboard
- [ ] **Phase 10: Notifications + Cross-Portal Polish** - Proactive notification system with browser push, cross-portal alert routing, final integration verification

## Phase Details

### Phase 1: Token Foundation
**Goal**: The design vocabulary exists as CSS custom properties -- every portal can consume spacing, typography, touch targets, shadows, and semantic color aliases from tokens instead of hard-coded values
**Depends on**: Nothing (first phase)
**Requirements**: TOKN-01, TOKN-02, TOKN-03, TOKN-04, TOKN-05, TOKN-06, TOKN-07
**Success Criteria** (what must be TRUE):
  1. A developer can apply consistent spacing to any element using `--space-*` variables without writing a pixel value
  2. All interactive elements across the app can enforce 44px touch targets via the `--touch-min` token
  3. Focus rings appear on all interactive elements using the `--focus-ring` token -- no inline focus styles anywhere
  4. Semantic color aliases (`--phase-*`, `--status-*`) resolve correctly in all 5 themes without breaking existing theme switching
  5. Shadow classes (sm/md/lg) and transition timing classes exist and render visibly different from each other
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md -- Create universal tokens (tokens.css) and wire into main.jsx
- [x] 01-02-PLAN.md -- Add per-theme shadow scale and semantic color aliases to THEMES
- [x] 01-03-PLAN.md -- Add utility classes to styles.js and update text utilities to consume tokens

### Phase 2: Shared Field Components
**Goal**: A `src/components/field/` directory contains all 11 shared components, each consuming design tokens and verified in isolation before any portal touches them
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, COMP-11
**Success Criteria** (what must be TRUE):
  1. `FieldButton` renders at 44px minimum height in all three variants (primary, ghost, danger) and shows a loading spinner when its loading prop is true
  2. `AsyncState` wraps any async operation and correctly renders loading skeleton, empty state with message, or error state without the parent component managing that logic
  3. `PortalHeader` and `PortalTabBar` render correctly in all 5 themes with no hard-coded colors
  4. `FieldSignaturePad` draws and saves signatures using theme-aware colors -- no hard-coded hex values present in its source
  5. `MaterialRequestCard` displays a material request identically whether rendered in DriverView, EmployeeView, or ForemanView
**Plans:** 6/6 plans complete
Plans:
- [x] 02-01-PLAN.md -- Test infrastructure (Vitest), field component CSS classes, barrel index.js
- [x] 02-02-PLAN.md -- Leaf components: StatusBadge, LoadingSpinner/Skeleton, FieldButton
- [x] 02-03-PLAN.md -- Leaf components: FieldCard, FieldInput/FieldSelect
- [x] 02-04-PLAN.md -- Composite components: EmptyState, AsyncState
- [x] 02-05-PLAN.md -- Layout components: PortalHeader, PortalTabBar
- [x] 02-06-PLAN.md -- Complex extractors: FieldSignaturePad, MaterialRequestCard + translations
**UI hint**: yes

### Phase 3: DriverView Refactor
**Goal**: DriverView is fully migrated -- zero inline styles, all shared field components wired, loading and empty states on every async operation, the pilot process proven
**Depends on**: Phase 2
**Requirements**: DRVR-01, DRVR-02, DRVR-03, DRVR-04
**Success Criteria** (what must be TRUE):
  1. A `grep "style={{" src/tabs/DriverView.jsx` returns zero results
  2. Every button and input in DriverView is tappable without mis-tap at 375px viewport -- touch targets visibly meet 44px minimum
  3. Route cards display using `FieldCard` and `StatusBadge` -- no custom card markup in DriverView
  4. The route queue and completed deliveries list show skeleton screens while loading and an `EmptyState` component when no data exists
**Plans**: TBD
**UI hint**: yes

### Phase 4: EmployeeView Refactor
**Goal**: EmployeeView is fully migrated -- zero inline styles, `FieldInput`/`FieldSelect` wired to all form fields with proper inputmode, clock-in and map tile controls meet touch requirements
**Depends on**: Phase 3
**Requirements**: EMPL-01, EMPL-02, EMPL-03, EMPL-04, EMPL-05
**Success Criteria** (what must be TRUE):
  1. A `grep "style={{" src/tabs/EmployeeView.jsx` returns zero results
  2. The clock-in flow uses `PortalHeader`, `FieldButton`, and `AsyncState` -- no custom header or spinner markup in EmployeeView
  3. The material request form fields use `FieldInput`/`FieldSelect` with appropriate `inputmode` attributes (numeric fields open the numeric keyboard on mobile)
  4. Map tile switcher buttons are tappable without mis-tap -- all meet 44px minimum touch target
**Plans**: TBD
**UI hint**: yes

### Phase 5: ForemanView Refactor
**Goal**: ForemanView is fully migrated -- zero inline styles, 11-tab horizontal scroll replaced with a bottom tab bar (4-5 primary tabs + More menu), phase colors tokenized, all 11 tabs complete before merge
**Depends on**: Phase 4
**Requirements**: FRMN-01, FRMN-02, FRMN-03, FRMN-04, FRMN-05, FRMN-06
**Success Criteria** (what must be TRUE):
  1. A `grep "style={{" src/tabs/ForemanView.jsx` returns zero results
  2. The foreman's tab navigation is a bottom bar with 4-5 primary tabs and a "More" overflow -- no horizontal scrolling tab strip exists
  3. KPI cards display dollar amounts, percentages, and crew counts using the typography scale -- all values use the same font-size token, not ad-hoc sizes
  4. Phase status colors in the dashboard render correctly in all 5 themes -- `--phase-*` tokens in use, no hex literals in JSX
  5. Daily reports, JSA, and crew sections use `FieldCard`, `FieldButton`, `AsyncState`, and `FieldSignaturePad` from the shared component library
**Plans**: TBD
**UI hint**: yes

### Phase 6: Polish and Theme Audit
**Goal**: All five themes pass a full visual gauntlet across all portals, global touch and scroll optimizations are applied, offline status indicators reach all portals, and the app is verified readable outdoors
**Depends on**: Phase 5
**Requirements**: PLSH-01, PLSH-02, PLSH-03, PLSH-04, PLSH-05
**Success Criteria** (what must be TRUE):
  1. Switching between all 5 themes on any portal shows no broken colors, missing variables, or white-flash moments -- all themes render correctly end to end
  2. Tapping any button in any portal triggers action immediately -- no 300ms tap delay perceptible by the user
  3. Scrolling a data list does not trigger browser pull-to-refresh -- `overscroll-behavior: contain` is in effect
  4. Every portal layout is usable without horizontal scrolling at 375px, 768px, and 1024px viewports
  5. The offline/sync status indicator appears consistently in all three portals and shows a pending-changes count when actions are queued but not yet synced
**Plans**: TBD
**UI hint**: yes

### Phase 7: Premium Foundation
**Goal**: The data model supports scheduling/credentials, the Premium Construction visual language is applied to all shared components, and new shared components (StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab) are built and ready for portal consumption
**Depends on**: Phase 6
**Requirements**: DATA-01, DATA-02, DATA-03, VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, VIS-06, PLAN-03
**Success Criteria** (what must be TRUE):
  1. New users see EBC Brand theme by default with the eagle logo in PortalHeader across all 3 portals
  2. FieldCard renders in three distinct variants (Hero, Info, Alert) that are visually distinguishable and defined in styles.js using design tokens
  3. EmptyState always includes an actionable button -- no instance renders with only passive text
  4. Supabase has `available_shifts` and `shift_requests` tables, and `certifications` table has issuing_org, photo_path, cert_category columns
  5. A shared DrawingsTab component exists in `src/components/field/` with readOnly and projectFilter props, extracting logic from ForemanView
**Plans:** 5/5 plans executed
Plans:
- [x] 07-01-PLAN.md -- Visual refresh (default theme, eagle logo, EmptyState, PortalTabBar, FieldButton audit)
- [x] 07-02-PLAN.md -- Supabase schema (available_shifts, shift_requests tables, certifications extension, RLS)
- [x] 07-03-PLAN.md -- PremiumCard component (Hero/Info/Alert variants + CSS)
- [x] 07-04-PLAN.md -- New shared components (StatTile, AlertCard, ShiftCard, CredentialCard) + translations
- [x] 07-05-PLAN.md -- DrawingsTab extraction from ForemanView
**UI hint**: yes

### Phase 8: Employee Portal Overhaul
**Goal**: Employee portal is a proactive dashboard app -- workers open it and immediately see clock status, weekly stats, active project, and alerts; they can manage their schedule, pick up shifts, request time off, track credentials, and view floor plans
**Depends on**: Phase 7
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, CRED-01, CRED-02, CRED-03, PLAN-01
**Success Criteria** (what must be TRUE):
  1. Employee opens app and lands on Home tab showing clock status hero, 3 stat tiles (Hours/Tasks/Pending), active project card, and up to 3 alerts -- not a blank screen
  2. Tapping any stat tile or alert navigates to its source detail view (Hours to Time Log, cert warning to Credentials tab, etc.)
  3. Schedule tab shows a 7-day week strip with today highlighted, shift cards with project/time/status, and an Available Shifts section when the foreman has posted open shifts
  4. Employee can submit a time-off request via bottom sheet (date range, reason, notes) and see its status inline on the schedule (Requested/Approved/Denied)
  5. Employee can view, add, and track credentials with expiry dates, and expiring certs surface as alerts in the Home feed
**Plans:** 5 plans (3 waves -- HomeTab/ScheduleTab/CredentialsTab run in parallel)
Plans:
- [x] 08-01-PLAN.md -- Foundation: migration SQL, CSS classes, tab skeleton, directory + stubs, Drawings wiring
- [ ] 08-02-PLAN.md -- HomeTab.jsx: clock hero, stat tiles, project card, alerts feed (parallel)
- [ ] 08-03-PLAN.md -- ScheduleTab.jsx: week strip, shifts, available shifts, pickup, time-off (parallel)
- [ ] 08-04-PLAN.md -- CredentialsTab.jsx: credential wallet, add-credential bottom sheet (parallel)
- [ ] 08-05-PLAN.md -- EN/ES translations and final human verification
**UI hint**: yes

### Phase 9: Driver + Foreman Portal Updates
**Goal**: Driver portal has Premium Construction visuals with alerts and floor plan access; Foreman portal has crew scheduling tools (post shifts, approve pickups, manage time-off) and a credential dashboard
**Depends on**: Phase 8
**Requirements**: DRVR-05, DRVR-06, DRVR-07, PLAN-02, FSCH-01, FSCH-02, FSCH-03, FSCH-04, CRED-04
**Success Criteria** (what must be TRUE):
  1. Driver portal renders with Premium Construction card system (Hero/Info/Alert variants) and has a working Drawings tab filtered to delivery projects
  2. Driver sees an alerts feed with schedule changes and delivery updates
  3. Foreman can post an available shift (date, time, project, trade, overtime) from the Team tab and it appears in employee Schedule tabs
  4. Foreman can approve or deny shift pickup requests and time-off requests with optional comments, and the employee sees the updated status
  5. Foreman credential dashboard in Team tab shows crew cert status overview with ability to filter by active/expiring/expired
**Plans**: TBD
**UI hint**: yes

### Phase 10: Notifications + Cross-Portal Polish
**Goal**: Proactive notifications reach all portal users for schedule changes, material updates, credential warnings, and shift posts -- via in-app alerts and browser push with graceful permission handling
**Depends on**: Phase 9
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06
**Success Criteria** (what must be TRUE):
  1. When a foreman changes an employee's schedule, the employee receives an in-app alert and (if permitted) a browser push notification
  2. Material request status changes (approved/denied/delivered) push to the requesting employee both in-app and via browser push
  3. Credential expiry warnings fire at 30, 14, and 7 days before expiration and appear in both the Home alerts feed and as push notifications
  4. Browser push requests user permission on first relevant event with a clear prompt, and falls back gracefully to in-app-only when denied
  5. All new UI strings across Phases 7-10 have both EN and ES translations -- switching language shows no untranslated keys
**Plans**: TBD

## Progress

**Execution Order:**
v1.0: Phases 1 -> 2 -> 3 -> 4 -> 5 -> 6
v1.1: Phases 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Token Foundation | 3/3 | Complete | 2026-03-30 |
| 2. Shared Field Components | 6/6 | Complete | |
| 3. DriverView Refactor | 0/TBD | Not started | - |
| 4. EmployeeView Refactor | 0/TBD | Not started | - |
| 5. ForemanView Refactor | 0/TBD | Not started | - |
| 6. Polish and Theme Audit | 2/3 | In Progress | |
| 7. Premium Foundation | 1/5 | In Progress|  |
| 8. Employee Portal Overhaul | 0/5 | Planned | - |
| 9. Driver + Foreman Portal Updates | 0/TBD | Not started | - |
| 10. Notifications + Cross-Portal Polish | 0/TBD | Not started | - |
