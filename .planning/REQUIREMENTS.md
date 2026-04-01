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
- [x] **COMP-05**: `PortalTabBar` — bottom navigation bar with icon + label, badge counts, 5-tab max
- [x] **COMP-06**: `StatusBadge` with semantic color mapping (approved=green, pending=amber, etc.)
- [x] **COMP-07**: `EmptyState` with icon, message, and optional action button
- [x] **COMP-08**: `LoadingSpinner` and skeleton screen components
- [x] **COMP-09**: `AsyncState` wrapper (loading/empty/error/success states in one component)
- [x] **COMP-10**: `FieldSignaturePad` extracted with theme-aware colors (no hard-coded hex)
- [x] **COMP-11**: `MaterialRequestCard` shared across Foreman/Employee/Driver portals

### Driver Portal

- [x] **DRVR-01**: All inline styles replaced with CSS classes using design tokens
- [x] **DRVR-02**: All buttons/inputs meet 44px touch target minimum
- [x] **DRVR-03**: Route cards use `FieldCard` + `StatusBadge` components
- [x] **DRVR-04**: Loading/empty states for route queue and completed deliveries

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

- [ ] **PLSH-01**: All 5 themes pass visual regression (no broken colors, missing vars)
- [ ] **PLSH-02**: `touch-action: manipulation` applied globally to eliminate 300ms tap delay
- [ ] **PLSH-03**: `overscroll-behavior: contain` prevents accidental pull-to-refresh
- [ ] **PLSH-04**: Responsive at 375px, 768px, 1024px viewports
- [ ] **PLSH-05**: Offline/sync status indicator extended to all portals

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
| New backend/Supabase changes | Frontend presentation layer only |
| Takeoff engine improvements | Separate milestone, ~70% work remaining |
| Phase 4 monetization features | Future milestone |
| New business logic or features | Refactor only, no new capabilities |
| Font family change (Fira vs Barlow) | Deferred — needs brand decision before committing |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

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
| DRVR-01 | Phase 3 | Complete |
| DRVR-02 | Phase 3 | Complete |
| DRVR-03 | Phase 3 | Complete |
| DRVR-04 | Phase 3 | Complete |
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
| PLSH-01 | Phase 6 | Pending |
| PLSH-02 | Phase 6 | Pending |
| PLSH-03 | Phase 6 | Pending |
| PLSH-04 | Phase 6 | Pending |
| PLSH-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation — all 38 requirements mapped*
