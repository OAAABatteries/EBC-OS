# EBC-OS

## What This Is

EBC-OS is an all-in-one construction operations platform for Eagles Brothers Constructors, a Houston-based drywall/framing subcontractor. It provides role-based field portals (Foreman, Employee, Driver), project management, takeoff/estimating, safety compliance, and back-office tools. Built with React + Vite, Supabase backend, deployed on Netlify.

## Core Value

Field crews can manage their entire workday — clock in, view drawings, submit JSAs, request materials, report problems — from one app that feels fast, reliable, and professional on a phone in the field.

## Current Milestone: v1.2 (Next — TBD)

**Previous Milestone:** v1.1 Premium Construction UI Overhaul (Complete — 9 phases, 30+ plans)
- Premium Construction visual redesign with EBC Brand default across 3 themes
- Employee Home tab, Schedule tab with shift management, Credential wallet
- Foreman portal restructure: 5-tab bottom nav, Team tab with approval queue + cert dashboard
- Driver Home tab with alerts feed, PremiumCard upgrade
- Universal floor plan access with IndexedDB-first offline caching
- Proactive notification system: cert expiry, late arrival, material, schedule change alerts
- Component library token cleanup: 60+ hard-coded colors replaced with CSS custom properties
- Hover/active/focus states for all interactive card variants
- Design spec: docs/superpowers/specs/2026-04-03-ui-overhaul-design.md

**Previous Milestone:** v1.0 Field Portal Perfection (Complete — 6 phases, 22 plans)
- Design token system, shared component library, inline style elimination
- DriverView, EmployeeView, ForemanView portal refactors
- Touch optimization, theme polish, offline status banner

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Role-based auth routing (foreman/employee/driver → dedicated portals)
- ✓ GPS geofence clock-in with location validation
- ✓ Material request workflow (request → approve → deliver)
- ✓ JSA/RCRA safety assessment with crew signatures
- ✓ Drawing viewer with offline caching
- ✓ Driver route optimization with drag-and-drop reorder
- ✓ i18n (English/Spanish) across all portals
- ✓ 3-theme system (EBC Brand, Midnight, Daylight)
- ✓ Signature pad (touch-to-sign canvas)
- ✓ Daily reports with photo documentation
- ✓ Audit trail for COs, invoices, T&M, time entries
- ✓ Premium Construction visual redesign with EBC Brand default (v1.1, Phases 07-09)
- ✓ Employee Home tab with proactive dashboard (v1.1, Phase 08)
- ✓ Enhanced Schedule tab with shift management (v1.1, Phase 08)
- ✓ Credential wallet and cert tracking (v1.1, Phases 08-09)
- ✓ Universal floor plan access with IndexedDB offline cache (v1.1, Phase 07)
- ✓ Foreman crew scheduling tools — approval queue + cert dashboard (v1.1, Phase 09)
- ✓ Proactive notification/alert system — cert expiry, late arrival, material, schedule (v1.1)
- ✓ Component library visual refresh — tokens, hover states, focus rings (v1.1)

### Active

<!-- Next milestone scope — TBD -->

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
- **Themes:** 3 themes (EBC Brand, Midnight, Daylight) in constants.js with CSS vars; hard-coded hex eliminated
- **Icons:** Lucide React (consistent, SVG-based)
- **Portals:** ForemanView (2400+ lines), EmployeeView (1500+ lines), DriverView (500+ lines)
- **Components:** PremiumCard (hero/info/alert), PortalHeader, PortalTabBar, StatTile, AlertCard, ShiftCard, CredentialCard, FieldCard, FieldButton, EmptyState
- **Design tokens:** tokens.css (spacing, typography, radius, shadows, semantic colors); styles.js uses CSS custom properties throughout
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
| CSS variables over Tailwind | Already have theme system, avoid migration overhead | Validated v1.1 |
| Component library over global refactor | Incremental, testable, doesn't break existing code | Validated v1.1 |
| Dark OLED as primary design target | Field crews use phones, battery/readability matters | Validated v1.1 |
| Montserrat headings + system body | Professional headings, native body text for speed | Validated v1.1 |
| IndexedDB over Cache API for drawings | Persistent, survives eviction, large blob support | Validated v1.1 |

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
*Last updated: 2026-04-12 — Milestone v1.1 complete (9 phases, 30+ plans). All field portals upgraded to Premium Construction UI with proactive notifications, credential tracking, and IndexedDB offline drawings.*
