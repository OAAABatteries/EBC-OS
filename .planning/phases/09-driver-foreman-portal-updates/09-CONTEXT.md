# Phase 9: Driver + Foreman Portal Updates - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Driver portal gets Premium Construction visuals with a new Home tab (alerts feed + route summary) and full PremiumCard upgrade. Foreman portal gets a complete structural overhaul: 13-tab horizontal strip → PortalTabBar bottom nav (5 primary + More overflow), full Premium visual refresh, shift/time-off approval queue in Team tab, and crew certification dashboard. Requirements: DRVR-05, DRVR-06, FSCH-02, FSCH-03, FSCH-04, CRED-04.

**Scope exclusions:**
- DRVR-07 / PLAN-02 (Driver Drawings tab) — drivers never view floor plans. Removed from Phase 9 scope.
- FSCH-01 (Post Available Shifts) — shift posting is an admin/PM/superintendent capability, not foreman. Deferred to future admin portal phase.

</domain>

<decisions>
## Implementation Decisions

### Driver Visual Refresh (DRVR-05, DRVR-06)
- **D-01:** Add a new Home tab to Driver as the default landing screen. Shows today's delivery count hero (PremiumCard Hero variant), stat tiles (Pending/Completed/Miles), and alerts feed (schedule changes, delivery updates via AlertCard).
- **D-02:** Route cards upgrade from FieldCard to PremiumCard Info variant. Full Premium Construction visual language applied throughout.
- **D-03:** Driver tab layout: Home (landing), Route, Completed, More. Settings moves to More overflow (consistent with Employee pattern from Phase 8 D-01).
- **D-04:** PortalTabBar maxPrimary = 4 for Driver (Home + Route + Completed + More).
- **D-05:** No Drawings tab for Driver — drivers never view floor plans. DRVR-07 and PLAN-02 removed from Phase 9.

### Foreman Tab Restructure
- **D-06:** Primary bottom nav tabs: Dashboard (landing), Team, Hours, Materials, More.
- **D-07:** More overflow contains: Clock, JSA, Drawings, Look-Ahead, Daily Report, Site, Notes, Documents, Settings.
- **D-08:** Clock moves from its own tab to a hero element on Dashboard — clock status display at the top of Dashboard, consistent with Employee Home pattern.
- **D-09:** Dashboard order: Clock status hero → KPI cards (budget, hours, crew counts) → Alerts feed (shift requests, time-off requests, cert warnings).
- **D-10:** Replace inline header with PortalHeader. Replace horizontal tab strip with PortalTabBar + More overflow.
- **D-11:** Full Premium visual refresh — PremiumCard used for KPI cards, team member cards, and request cards throughout ForemanView.

### Shift Management Workflow (FSCH-02, FSCH-03, FSCH-04)
- **D-12:** Foreman does NOT post shifts (FSCH-01 deferred — admin/PM/super capability). Foreman only reviews and approves/denies requests.
- **D-13:** Unified "Pending Requests" section in Team tab shows both shift pickup requests and time-off requests as cards with Approve/Deny buttons.
- **D-14:** Badge count on Team tab for pending request items.
- **D-15:** Approve/deny actions include optional comments field (FSCH-03).
- **D-16:** Foreman receives in-app notification when employee submits a shift or time-off request (FSCH-04).

### Foreman Credential Dashboard (CRED-04)
- **D-17:** Crew Certifications section appears below crew list and pending requests in Team tab. Team tab layout: Crew list → Pending Requests → Crew Certifications.
- **D-18:** Filter chips: All / Expiring / Expired. Each crew member shows cert status summary (active count, expiring count, expired count).
- **D-19:** View only — foreman cannot edit employee certs. Employees manage their own credentials via Employee portal. Foreman gets visibility, not edit capability.

### Claude's Discretion
Claude has full flexibility on:
- Driver Home tab stat tile metrics and layout details
- Driver alert types and alert card interaction patterns
- Foreman Dashboard KPI card design (reuse existing KPI logic or redesign with PremiumCard)
- Pending Requests card layout (combined list vs grouped by type)
- Crew cert dashboard summary card design
- Whether ForemanView inline FieldSignaturePad (line 18-64) gets replaced with the shared import
- CSS class organization for new Foreman sections

Constraints that are NOT flexible:
- Driver Home is the default landing tab
- Driver has no Drawings tab
- Foreman shift posting (FSCH-01) is NOT in scope
- Foreman primary tabs: Dashboard, Team, Hours, Materials, More (exactly 5)
- Clock is a Dashboard hero, not its own primary tab
- Credential dashboard is view-only for foremen
- Pending requests unified in Team tab (not separate queues)
- PortalHeader + PortalTabBar used for both portals
- Bottom sheet pattern for approval comments (consistent with Phase 8)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Specification
- `docs/superpowers/specs/2026-04-03-ui-overhaul-design.md` — Full design spec with card system CSS, header redesign, tab bar patterns

### Phase 7 Foundation
- `.planning/phases/07-premium-foundation/07-CONTEXT.md` — PremiumCard decisions, DrawingsTab API, schema decisions, component patterns
- `.planning/phases/07-premium-foundation/07-VERIFICATION.md` — Verified Phase 7 artifacts

### Phase 8 Patterns (follow these)
- `.planning/phases/08-employee-portal-overhaul/08-CONTEXT.md` — Home tab pattern, tab restructure decisions, bottom sheet patterns, Schedule + Credentials tab patterns
- `src/tabs/EmployeeView.jsx` — Reference implementation for Home tab, PortalTabBar integration, bottom sheet patterns

### Portal Source Files (being modified)
- `src/tabs/DriverView.jsx` — 654 lines, already uses PortalHeader/PortalTabBar/FieldCard/FieldButton/EmptyState. Gets Home tab + PremiumCard upgrade.
- `src/tabs/ForemanView.jsx` — 3639 lines, uses old inline header + 13-tab horizontal strip. Major restructure to PortalHeader/PortalTabBar. Has inline FieldSignaturePad (lines 18-64) that should use shared import.

### Component Library
- `src/components/field/index.js` — Barrel exports for all shared components
- `src/components/field/PremiumCard.jsx` — Hero/Info/Alert variants
- `src/components/field/AlertCard.jsx` — Tappable alert cards
- `src/components/field/ShiftCard.jsx` — Shift display with status badge
- `src/components/field/CredentialCard.jsx` — Cert wallet cards
- `src/components/field/PortalHeader.jsx` — Shared header with eagle logo
- `src/components/field/PortalTabBar.jsx` — Bottom nav with More overflow
- `src/components/field/StatTile.jsx` — Dashboard metric tiles

### Data Model
- `supabase/migration_phase7_scheduling.sql` — available_shifts, shift_requests tables, certifications extension, RLS policies

### Styles & Tokens
- `src/styles.js` — CSS class definitions
- `src/tokens.css` — Universal design tokens
- `src/data/constants.js` — Theme definitions, tab definitions
- `src/data/translations.js` — EN/ES translations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PremiumCard (Hero/Info/Alert):** Hero for clock/route heroes, Info for KPI/route cards, Alert for notifications
- **AlertCard:** Ready for alerts feeds in both Driver Home and Foreman Dashboard
- **ShiftCard:** Ready for pending shift request display in Foreman Team tab
- **CredentialCard:** Ready for foreman cert dashboard crew view
- **StatTile:** Ready for Driver Home stat tiles and Foreman Dashboard KPIs
- **PortalHeader:** Wire to both portals (Driver already has it, Foreman needs migration)
- **PortalTabBar:** Wire to Foreman (Driver already has it). Handles maxPrimary + More overflow with sheet panel.
- **DrawingsTab:** Already imported in ForemanView (line 8) — stays in More overflow
- **EmployeeView.jsx:** Reference implementation for Home tab pattern, tab restructure, bottom sheets

### Established Patterns
- **CSS-in-JS via styles.js:** All component styles as CSS classes. Design tokens only.
- **Bottom sheets:** PortalTabBar sheet pattern for More menu, reused in Phase 8 for time-off and add-credential
- **Translations:** All UI strings through `t()` function with EN/ES in translations.js
- **Supabase queries:** Direct client queries in components. shift_requests and certifications tables already exist with RLS.

### Integration Points
- **DriverView.jsx:** Add Home tab, restructure driverTabDefs, replace FieldCard with PremiumCard
- **ForemanView.jsx:** Replace header (line 750-761), replace tab strip (lines 789-800), restructure all tab rendering, add Team tab sections
- **constants.js:** Foreman tab definitions (if used) or inline tabDefs in ForemanView
- **translations.js:** Phase 9 EN/ES strings for new sections
- **Supabase queries:** Read shift_requests + certifications for Foreman Team tab

</code_context>

<specifics>
## Specific Ideas

- ForemanView has an inline FieldSignaturePad (lines 18-64) with hardcoded stroke color `#1e2d3b` — replace with shared import from `src/components/field/FieldSignaturePad.jsx` which reads theme color via getComputedStyle
- Driver alerts feed should mirror the Employee Home alerts pattern: max 3 items, newest first, "View All" link
- Foreman Dashboard alerts should prioritize actionable items (pending shift/time-off requests) over informational ones (cert warnings)
- Badge count on Foreman Team tab = pending shift requests + pending time-off requests

</specifics>

<deferred>
## Deferred Ideas

- **FSCH-01 — Post Available Shifts:** Foremen don't post shifts. This is an admin/PM/superintendent tool. Defer to admin portal phase.
- **DRVR-07 / PLAN-02 — Driver Drawings tab:** Drivers never view floor plans. Removed from scope entirely.
- **Cert-based shift eligibility blocking:** Auto-prevent shift pickup when required certs are expired. Future milestone.
- **Foreman cert edit capability:** Foremen editing employee certs. Deferred — employees self-manage.
- **Drag-and-drop schedule builder:** Already noted in REQUIREMENTS.md Out of Scope. Foreman uses modal-based approach.

</deferred>

---

*Phase: 09-driver-foreman-portal-updates*
*Context gathered: 2026-04-04*
