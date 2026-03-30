# Requirements: EBC-OS

**Defined:** 2026-03-30
**Core Value:** Field crews can manage their entire workday from one app that feels fast, reliable, and professional on a phone in the field.

## v1 Requirements

Requirements for milestone v1.0: Field Portal Perfection. Each maps to roadmap phases.

### Design Tokens

- [ ] **TOKN-01**: App uses a spacing scale (4/8/12/16/20/24/32/40/48px) via CSS custom properties
- [ ] **TOKN-02**: App uses a typography scale (xs/sm/base/lg/xl/2xl/3xl) via CSS custom properties
- [ ] **TOKN-03**: All interactive elements enforce 44px minimum touch target via `--touch-min` token
- [ ] **TOKN-04**: Focus rings are visible on all interactive elements via `--focus-ring` token
- [ ] **TOKN-05**: Transitions use consistent timing (150ms micro, 300ms state) via tokens
- [ ] **TOKN-06**: Shadow system (sm/md/lg) defined as CSS custom properties
- [ ] **TOKN-07**: Semantic color aliases (`--phase-*`, `--status-*`) reference existing theme primitives

### Shared Components

- [ ] **COMP-01**: `FieldButton` component with 44px touch target, loading state, variant support (primary/ghost/danger)
- [ ] **COMP-02**: `FieldCard` component with consistent padding, border radius, theme-aware styling
- [ ] **COMP-03**: `FieldInput` / `FieldSelect` with focus rings, error states, proper `inputmode`
- [ ] **COMP-04**: `PortalHeader` with user info, logout, language toggle, project selector
- [ ] **COMP-05**: `PortalTabBar` — bottom navigation bar with icon + label, badge counts, 5-tab max
- [ ] **COMP-06**: `StatusBadge` with semantic color mapping (approved=green, pending=amber, etc.)
- [ ] **COMP-07**: `EmptyState` with icon, message, and optional action button
- [ ] **COMP-08**: `LoadingSpinner` and skeleton screen components
- [ ] **COMP-09**: `AsyncState` wrapper (loading/empty/error/success states in one component)
- [ ] **COMP-10**: `FieldSignaturePad` extracted with theme-aware colors (no hard-coded hex)
- [ ] **COMP-11**: `MaterialRequestCard` shared across Foreman/Employee/Driver portals

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
| TOKN-01 | — | Pending |
| TOKN-02 | — | Pending |
| TOKN-03 | — | Pending |
| TOKN-04 | — | Pending |
| TOKN-05 | — | Pending |
| TOKN-06 | — | Pending |
| TOKN-07 | — | Pending |
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| COMP-03 | — | Pending |
| COMP-04 | — | Pending |
| COMP-05 | — | Pending |
| COMP-06 | — | Pending |
| COMP-07 | — | Pending |
| COMP-08 | — | Pending |
| COMP-09 | — | Pending |
| COMP-10 | — | Pending |
| COMP-11 | — | Pending |
| DRVR-01 | — | Pending |
| DRVR-02 | — | Pending |
| DRVR-03 | — | Pending |
| DRVR-04 | — | Pending |
| EMPL-01 | — | Pending |
| EMPL-02 | — | Pending |
| EMPL-03 | — | Pending |
| EMPL-04 | — | Pending |
| EMPL-05 | — | Pending |
| FRMN-01 | — | Pending |
| FRMN-02 | — | Pending |
| FRMN-03 | — | Pending |
| FRMN-04 | — | Pending |
| FRMN-05 | — | Pending |
| FRMN-06 | — | Pending |
| PLSH-01 | — | Pending |
| PLSH-02 | — | Pending |
| PLSH-03 | — | Pending |
| PLSH-04 | — | Pending |
| PLSH-05 | — | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 0
- Unmapped: 38

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after initial definition*
