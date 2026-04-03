# EBC-OS

## What This Is

EBC-OS is an all-in-one construction operations platform for Eagles Brothers Constructors, a Houston-based drywall/framing subcontractor. It provides role-based field portals (Foreman, Employee, Driver), project management, takeoff/estimating, safety compliance, and back-office tools. Built with React + Vite, Supabase backend, deployed on Netlify.

## Core Value

Field crews can manage their entire workday — clock in, view drawings, submit JSAs, request materials, report problems — from one app that feels fast, reliable, and professional on a phone in the field.

## Current Milestone: v1.1 Premium Construction UI Overhaul

**Goal:** Transform all 3 field portals into presentation-ready premium construction apps with proactive scheduling, credential tracking, and universal floor plan access.

**Target features:**
- Premium Construction visual redesign (EBC Brand theme default, Midnight alternative)
- New Employee Home tab: proactive dashboard with clock hero, stat tiles, alerts feed
- Enhanced Schedule tab: week strip, shift cards, available shift pickup, time-off requests
- Credential wallet: cert tracking with expiry alerts for all employees
- Floor plans/drawings: accessible to all portal users (Employee, Driver, Foreman)
- Foreman scheduling tools: post available shifts, approve time-off, credential dashboard
- Proactive notification system: schedule changes, material approvals, cert warnings
- Component library visual refresh: cards, buttons, headers, tab bars, empty states
- Design spec: docs/superpowers/specs/2026-04-03-ui-overhaul-design.md

**Previous Milestone:** v1.0 Field Portal Perfection (Complete — 6 phases, 22 plans)
- Design token system, shared component library, inline style elimination
- DriverView, EmployeeView, ForemanView portal refactors
- Touch optimization, theme polish, offline status banner

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

<!-- Current scope — Premium Construction UI Overhaul milestone -->

- [ ] Premium Construction visual redesign with EBC Brand as default theme
- [ ] Employee Home tab with proactive dashboard
- [ ] Enhanced Schedule tab with shift management
- [ ] Credential wallet and cert tracking
- [ ] Universal floor plan access (all portals)
- [ ] Foreman crew scheduling tools
- [ ] Proactive notification/alert system
- [ ] Component library visual refresh

### Out of Scope

<!-- Explicit boundaries for this milestone -->

- Takeoff engine improvements — Separate milestone
- Admin/PM desktop view changes — Field portals only
- New Supabase tables — Use existing schema, extend with columns if needed
- Authentication flow changes — Keep existing auth
- New theme creation — Use existing 8 themes, change default only
- Multi-language additions beyond EN/ES
- Offline-first scheduling — Schedule data online-only for consistency

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
*Last updated: 2026-04-03 — Milestone v1.0 complete (6 phases, 22 plans). Starting v1.1 Premium Construction UI Overhaul. Design spec at docs/superpowers/specs/2026-04-03-ui-overhaul-design.md. Inspired by Crunchtime Teamworx scheduling patterns.*
