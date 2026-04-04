# Requirements: EBC-OS

**Defined:** 2026-03-30
**Core Value:** Field crews can manage their entire workday from one app that feels fast, reliable, and professional on a phone in the field.

## v1 Requirements

Requirements for milestone v1.0: Field Portal Perfection. Each maps to roadmap phases.

### Design Tokens

- [x] **TOKN-01**: App uses a spacing scale (4/8/12/16/20/24/32/40/48px) via CSS custom properties
- [x] **TOKN-02**: App uses a typography scale (xs/sm/base/lg/xl/2xl/3xl) via CSS custom properties
- [x] **TOKN-03**: All interactive elements enforce 44px minimum touch target via `--touch-min` token
- [x] **TOKN-04**: Focus rings are visible on all interactive elements via `--focus-ring` token
- [x] **TOKN-05**: Transitions use consistent timing (150ms micro, 300ms state) via tokens
- [x] **TOKN-06**: Shadow system (sm/md/lg) defined as CSS custom properties
- [x] **TOKN-07**: Semantic color aliases (`--phase-*`, `--status-*`) reference existing theme primitives

### Shared Components

- [x] **COMP-01**: `FieldButton` component with 44px touch target, loading state, variant support (primary/ghost/danger)
- [x] **COMP-02**: `FieldCard` component with consistent padding, border radius, theme-aware styling
- [x] **COMP-03**: `FieldInput` / `FieldSelect` with focus rings, error states, proper `inputmode`
- [x] **COMP-04**: `PortalHeader` with user info, logout, language toggle, project selector
- [x] **COMP-05**: `PortalTabBar` -- bottom navigation bar with icon + label, badge counts, 5-tab max
- [x] **COMP-06**: `StatusBadge` with semantic color mapping (approved=green, pending=amber, etc.)
- [x] **COMP-07**: `EmptyState` with icon, message, and optional action button
- [x] **COMP-08**: `LoadingSpinner` and skeleton screen components
- [x] **COMP-09**: `AsyncState` wrapper (loading/empty/error/success states in one component)
- [x] **COMP-10**: `FieldSignaturePad` extracted with theme-aware colors (no hard-coded hex)
- [x] **COMP-11**: `MaterialRequestCard` shared across Foreman/Employee/Driver portals

### Driver Portal

- [ ] **DRVR-01**: All inline styles replaced with CSS classes using design tokens
- [ ] **DRVR-02**: All buttons/inputs meet 44px touch target minimum
- [ ] **DRVR-03**: Route cards use `FieldCard` + `StatusBadge` components
- [ ] **DRVR-04**: Loading/empty states for route queue and completed deliveries

### Employee Portal

- [ ] **EMPL-01**: All inline styles replaced with CSS classes using design tokens
- [ ] **EMPL-02**: All buttons/inputs meet 44px touch target minimum
- [ ] **EMPL-03**: Clock-in flow uses shared field components
- [ ] **EMPL-04**: Material request form uses `FieldInput`/`FieldSelect` with proper `inputmode`
- [ ] **EMPL-05**: Map tile switcher buttons meet touch target requirements

### Foreman Portal

- [ ] **FRMN-01**: All inline styles replaced with CSS classes using design tokens
- [ ] **FRMN-02**: 11 horizontal tabs restructured into bottom nav (4-5 primary) + More menu
- [ ] **FRMN-03**: All buttons/inputs meet 44px touch target minimum
- [ ] **FRMN-04**: KPI cards use consistent font sizes from typography scale
- [ ] **FRMN-05**: Daily reports, JSA, and crew sections use shared field components
- [ ] **FRMN-06**: Phase colors use `--phase-*` semantic tokens instead of hard-coded hex

### Polish

- [x] **PLSH-01**: All 5 themes pass visual regression (no broken colors, missing vars)
- [x] **PLSH-02**: `touch-action: manipulation` applied globally to eliminate 300ms tap delay
- [x] **PLSH-03**: `overscroll-behavior: contain` prevents accidental pull-to-refresh
- [ ] **PLSH-04**: Responsive at 375px, 768px, 1024px viewports
- [x] **PLSH-05**: Offline/sync status indicator extended to all portals

## v1.1 Requirements

Requirements for milestone v1.1: Premium Construction UI Overhaul. Design spec: docs/superpowers/specs/2026-04-03-ui-overhaul-design.md

### Visual Design

- [x] **VIS-01**: EBC Brand theme (#0f1a24 + #ff7f21) is the default theme for new users
- [x] **VIS-02**: Eagle logo (ebc-eagle-white.png) renders in PortalHeader across all 3 portals
- [x] **VIS-03**: FieldCard, FieldButton, PortalHeader, PortalTabBar, EmptyState updated to Premium Construction visual language
- [x] **VIS-04**: Three card variants (Hero, Info, Alert) defined in styles.js using design tokens
- [x] **VIS-05**: Empty states always include an actionable button (never "check back later")
- [ ] **VIS-06**: All new UI strings have EN/ES translations (estimated 50+ keys per phase)

### Employee Home

- [ ] **HOME-01**: New Home tab is the default landing with clock status hero, stat tiles, and alerts feed
- [ ] **HOME-02**: Stat tiles (Hours/Tasks/Pending) navigate to their respective detail views on tap
- [ ] **HOME-03**: Active project card shows current assignment with trade tags, tappable to project detail
- [ ] **HOME-04**: Alerts feed shows credential warnings, material approvals, schedule changes (newest first, max 3 + "View All")
- [ ] **HOME-05**: Each alert navigates to its source tab (credentials, materials, schedule) on tap
- [ ] **HOME-06**: Home tab auto-refreshes clock status and stats when returning from Clock tab

### Schedule

- [ ] **SCHED-01**: Week strip shows 7 days with today highlighted and shift dot indicators
- [ ] **SCHED-02**: Shift cards display time range, project, location, and status badge (ACTIVE/SCHEDULED/COMPLETED)
- [ ] **SCHED-03**: Available shifts section shows foreman-posted shifts with "Request" action button
- [ ] **SCHED-04**: Shift pickup requires foreman approval (employee requests -> status PENDING -> foreman approves/denies)
- [ ] **SCHED-05**: Time-off request flow: bottom sheet with date range, reason dropdown, notes, submit to foreman
- [ ] **SCHED-06**: Schedule shows time-off status inline: "OFF -- Requested" / "OFF -- Approved" / "OFF -- Denied"
- [ ] **SCHED-07**: Schedule tab shows cached last-fetched data when offline with "Last updated" timestamp

### Credentials

- [ ] **CRED-01**: Credential wallet shows active/expiring/expired certs per employee
- [ ] **CRED-02**: Add credential flow (type, issue date, expiry date, issuing org, optional photo)
- [ ] **CRED-03**: Expiry alerts generated at 30/14/7 days, surface in Home alerts feed
- [ ] **CRED-04**: Foreman credential dashboard in Team tab showing crew cert status overview with filter by status

### Floor Plans

- [ ] **PLAN-01**: Employee portal has Drawings tab in "More" overflow (read-only, filtered to assigned projects)
- [ ] **PLAN-02**: Driver portal has Drawings tab (read-only, filtered to delivery projects)
- [x] **PLAN-03**: Shared DrawingsTab component extracted from ForemanView with readOnly and projectFilter props

### Foreman Scheduling

- [ ] **FSCH-01**: Post Available Shifts modal in Team tab (date, time, project, trade, overtime flag)
- [ ] **FSCH-02**: Shift pickup request queue with approve/deny buttons in Team tab
- [ ] **FSCH-03**: Time-off request queue with approve/deny + optional comments in Team tab
- [ ] **FSCH-04**: Foreman notified in-app when employee requests shift or time-off

### Notifications

- [ ] **NOTIF-01**: Schedule change alerts push to affected employees (in-app + browser push)
- [ ] **NOTIF-02**: Material request status changes push to requester (in-app + browser push)
- [ ] **NOTIF-03**: Credential expiry warnings push at 30/14/7 day thresholds (in-app + browser push)
- [ ] **NOTIF-04**: Shift posted by foreman notifies eligible employees
- [ ] **NOTIF-05**: Time-off approval/denial notifies requesting employee
- [ ] **NOTIF-06**: Browser push requires user permission prompt, graceful fallback to in-app only

### Data Model

- [x] **DATA-01**: `available_shifts` Supabase table created (date, time, project_id, foreman_id, trade, overtime, status, claimed_by)
- [x] **DATA-02**: `certifications` table extended with issuing_org, photo_path, cert_category columns
- [x] **DATA-03**: `shift_requests` table for employee shift pickup requests (employee_id, shift_id, status, reviewed_by)

### Driver Portal

- [ ] **DRVR-05**: Driver portal visual refresh with Premium Construction design language
- [ ] **DRVR-06**: Driver portal has alerts feed (schedule changes, delivery updates)
- [ ] **DRVR-07**: Driver portal has Drawings tab for delivery project floor plans

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Takeoff Engine

- **TKOF-01**: Undo/redo for measurements
- **TKOF-02**: Auto-scale detection for all plan formats
- **TKOF-03**: Selection and editing of placed measurements
- **TKOF-04**: Page navigation feels instant across large plan sets

### Advanced Field Features

- **AFLD-01**: Haptic feedback on confirmations (Android + Capacitor iOS)
- **AFLD-02**: Swipe-to-action on cards (approve/reject material requests)
- **AFLD-03**: Pull-to-refresh with custom animation
- **AFLD-04**: Crew-to-crew messaging

## Out of Scope

| Feature | Reason |
|---------|--------|
| Tailwind CSS migration | Already have working CSS variable system, avoid migration overhead |
| CSS Modules | Vite causes full page reloads, loses component state |
| Major Supabase schema changes | v1.1 adds 2 tables + column extensions only |
| Takeoff engine improvements | Separate milestone, ~70% work remaining |
| Phase 4 monetization features | Future milestone |
| Admin/PM desktop view changes | Field portals only |
| New themes | Use existing 8 themes, change default only |
| Offline-first scheduling | Schedule data online-only for consistency |
| Multi-language beyond EN/ES | Future milestone |
| Drag-and-drop schedule builder | Foreman feature, deferred -- start with modal-based shift posting |
| Font family change (Fira vs Barlow) | Deferred -- needs brand decision before committing |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 (Phases 1-6)

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKN-01 | Phase 1 | Complete |
| TOKN-02 | Phase 1 | Complete |
| TOKN-03 | Phase 1 | Complete |
| TOKN-04 | Phase 1 | Complete |
| TOKN-05 | Phase 1 | Complete |
| TOKN-06 | Phase 1 | Complete |
| TOKN-07 | Phase 1 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| COMP-05 | Phase 2 | Complete |
| COMP-06 | Phase 2 | Complete |
| COMP-07 | Phase 2 | Complete |
| COMP-08 | Phase 2 | Complete |
| COMP-09 | Phase 2 | Complete |
| COMP-10 | Phase 2 | Complete |
| COMP-11 | Phase 2 | Complete |
| DRVR-01 | Phase 3 | Pending |
| DRVR-02 | Phase 3 | Pending |
| DRVR-03 | Phase 3 | Pending |
| DRVR-04 | Phase 3 | Pending |
| EMPL-01 | Phase 4 | Pending |
| EMPL-02 | Phase 4 | Pending |
| EMPL-03 | Phase 4 | Pending |
| EMPL-04 | Phase 4 | Pending |
| EMPL-05 | Phase 4 | Pending |
| FRMN-01 | Phase 5 | Pending |
| FRMN-02 | Phase 5 | Pending |
| FRMN-03 | Phase 5 | Pending |
| FRMN-04 | Phase 5 | Pending |
| FRMN-05 | Phase 5 | Pending |
| FRMN-06 | Phase 5 | Pending |
| PLSH-01 | Phase 6 | Complete |
| PLSH-02 | Phase 6 | Complete |
| PLSH-03 | Phase 6 | Complete |
| PLSH-04 | Phase 6 | Pending |
| PLSH-05 | Phase 6 | Complete |

### v1.1 (Phases 7-10)

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 7 | Complete |
| DATA-02 | Phase 7 | Complete |
| DATA-03 | Phase 7 | Complete |
| VIS-01 | Phase 7 | Complete (07-01) |
| VIS-02 | Phase 7 | Complete (07-01) |
| VIS-03 | Phase 7 | Complete (07-01) |
| VIS-04 | Phase 7 | Complete (07-03) |
| VIS-05 | Phase 7 | Complete (07-01) |
| VIS-06 | Phase 7 | Complete (07-04 + gap closure) |
| PLAN-03 | Phase 7 | Complete (07-05) |
| HOME-01 | Phase 8 | Pending |
| HOME-02 | Phase 8 | Pending |
| HOME-03 | Phase 8 | Pending |
| HOME-04 | Phase 8 | Pending |
| HOME-05 | Phase 8 | Pending |
| HOME-06 | Phase 8 | Pending |
| SCHED-01 | Phase 8 | Pending |
| SCHED-02 | Phase 8 | Pending |
| SCHED-03 | Phase 8 | Pending |
| SCHED-04 | Phase 8 | Pending |
| SCHED-05 | Phase 8 | Pending |
| SCHED-06 | Phase 8 | Pending |
| SCHED-07 | Phase 8 | Pending |
| CRED-01 | Phase 8 | Pending |
| CRED-02 | Phase 8 | Pending |
| CRED-03 | Phase 8 | Pending |
| PLAN-01 | Phase 8 | Pending |
| DRVR-05 | Phase 9 | Pending |
| DRVR-06 | Phase 9 | Pending |
| DRVR-07 | Phase 9 | Pending |
| PLAN-02 | Phase 9 | Pending |
| FSCH-01 | Phase 9 | Pending |
| FSCH-02 | Phase 9 | Pending |
| FSCH-03 | Phase 9 | Pending |
| FSCH-04 | Phase 9 | Pending |
| CRED-04 | Phase 9 | Pending |
| NOTIF-01 | Phase 10 | Pending |
| NOTIF-02 | Phase 10 | Pending |
| NOTIF-03 | Phase 10 | Pending |
| NOTIF-04 | Phase 10 | Pending |
| NOTIF-05 | Phase 10 | Pending |
| NOTIF-06 | Phase 10 | Pending |

**Coverage:**
- v1.0 requirements: 38 total, 38 mapped, 0 unmapped
- v1.1 requirements: 42 total, 42 mapped, 0 unmapped
- Grand total: 80 requirements, 80 mapped

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-04-03 -- v1.1 traceability added (42 requirements mapped to Phases 7-10)*
