# EBC-OS

## What This Is

EBC-OS is an all-in-one construction operations platform for Eagles Brothers Constructors, a Houston-based drywall/framing subcontractor. It provides role-based field portals (Foreman, Employee, Driver), project management, takeoff/estimating, safety compliance, and back-office tools. Built with React + Vite, Supabase backend, deployed on Netlify.

## Core Value

Field crews can manage their entire workday — clock in, view drawings, submit JSAs, request materials, report problems — from one app that feels fast, reliable, and professional on a phone in the field.

## Current Milestone: v1.0 Field Portal Perfection

**Goal:** Transform EBC-OS field portals from functional-but-amateur into commercial-grade construction apps that crews actually want to use.

**Target features:**
- Design token system (colors, spacing, typography, shadows)
- Shared field component library (44px+ touch targets)
- Kill 768+ inline styles — move to CSS classes using theme variables
- Typography scale (5-6 defined sizes)
- Loading/empty/error states for every async operation
- Foreman portal refactor (11 tabs)
- Employee portal refactor (4 tabs)
- Driver portal refactor (3 tabs)
- Form input polish (focus rings, error states, inputmode)
- Touch optimization (touch-action, 8px+ spacing)

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Role-based auth routing (foreman/employee/driver → dedicated portals)
- ✓ GPS geofence clock-in with location validation
- ✓ Material request workflow (request → approve → deliver)
- ✓ JSA/RCRA safety assessment with crew signatures
- ✓ Drawing viewer with offline caching
- ✓ Driver route optimization with drag-and-drop reorder
- ✓ i18n (English/Spanish) across all portals
- ✓ 5-theme system (steel, blueprint, daylight, matrix, anime)
- ✓ Signature pad (touch-to-sign canvas)
- ✓ Daily reports with photo documentation
- ✓ Audit trail for COs, invoices, T&M, time entries

### Active

<!-- Current scope — Field Portal Perfection milestone -->

- [ ] Design token system
- [ ] Shared field component library
- [ ] Inline style elimination
- [ ] Typography scale
- [ ] Loading/empty/error states
- [ ] Portal-by-portal UI refactor
- [ ] Form input polish
- [ ] Touch optimization

### Out of Scope

<!-- Explicit boundaries for this milestone -->

- Takeoff engine improvements — Separate milestone, ~70% work remaining
- New features or business logic — This is presentation layer only
- Tailwind/CSS framework migration — Stay with CSS variables + classes
- Backend/Supabase changes — Frontend only
- Phase 4 monetization features — Future milestone

## Context

- **Stack:** React 18 + Vite, no CSS framework, inline styles + CSS classes + CSS custom properties
- **Themes:** 5 complete themes in constants.js with proper CSS vars, but code bypasses them with hard-coded hex
- **Icons:** Lucide React (consistent, SVG-based)
- **Portals:** ForemanView (2400+ lines), EmployeeView (1500+ lines), DriverView (500+ lines)
- **Audit findings:** 768+ inline style instances, 20+ hard-coded colors, touch targets at 18-24px (should be 44px), 12+ ad-hoc font sizes, inconsistent card/button patterns, ~60% loading state coverage
- **Design system generated:** UI UX Pro Max recommended Dark Mode OLED style, Fira Code/Fira Sans typography, navy/slate/green palette
- **Users:** Field crews (drywall/framing workers), foremen, drivers — use phones in field conditions

## Constraints

- **No new dependencies:** Prefer CSS custom properties over adding Tailwind or styled-components
- **No breaking changes:** Business logic must remain untouched — refactor presentation only
- **Mobile-first:** 375px is the primary viewport, scale up to tablets
- **Dark mode primary:** OLED-friendly dark is the default, light themes must also work
- **Offline-capable:** Drawing caching and clock-in must work with spotty connectivity
- **Bilingual:** All UI text must go through the t() translation function

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CSS variables over Tailwind | Already have theme system, avoid migration overhead | — Pending |
| Component library over global refactor | Incremental, testable, doesn't break existing code | — Pending |
| Dark OLED as primary design target | Field crews use phones, battery/readability matters | — Pending |
| Fira Code + Fira Sans typography | Recommended for dashboards/data, good readability | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after milestone v1.0 initialization*
