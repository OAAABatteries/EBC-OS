# Phase 8: Employee Portal Overhaul - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the Employee portal from a basic time clock into a proactive dashboard app. Workers open it and immediately see clock status, weekly stats, active project, and alerts. They can manage their schedule, pick up shifts, request time off, track credentials, and view floor plans. 17 requirements (HOME-01 through HOME-06, SCHED-01 through SCHED-07, CRED-01 through CRED-03, PLAN-01).

</domain>

<decisions>
## Implementation Decisions

### Tab Layout + Navigation
- **D-01:** Primary bottom bar tabs: Home, Clock, Schedule, Materials, More. Settings moves to More overflow.
- **D-02:** More overflow contains: Credentials, Drawings, Time Log, JSA, Change Orders, RFIs, Settings.
- **D-03:** Home is the default landing tab (replaces Clock as first tab). Clock stays as a primary tab -- crew uses it daily for punch-in.
- **D-04:** PortalTabBar maxPrimary stays at 4 or bumps to 5 to fit Home + Clock + Schedule + Materials + More.

### Home Dashboard Layout
- **D-05:** Section order top to bottom: Clock status hero → 3 stat tiles row → Active project card → Alerts feed.
- **D-06:** Clock hero is display-only with link -- shows ON/OFF CLOCK status and time since last punch. Tap navigates to full Clock tab for punch-in/out. No punch button on Home.
- **D-07:** Stat tiles: Hours (this week), Tasks (active count), Pending (requests count). Each taps to its source detail view.
- **D-08:** Alerts feed shows max 3 items (newest first) with "View All" link. Types: credential warnings, material approvals, schedule changes.
- **D-09:** Home auto-refreshes clock status and stats when returning from Clock tab (HOME-06).

### Schedule + Shift Workflow
- **D-10:** Week strip: swipeable 7-day horizontal row with today highlighted. Swipe left/right for past/future weeks. Tap a day to show that day's shifts.
- **D-11:** Month view and list view toggling deferred to Phase 10 polish.
- **D-12:** Time-off request via bottom sheet: date range picker, reason dropdown (Personal/Medical/Family/Other), notes field, Submit button.
- **D-13:** Claude's Discretion on available shifts placement -- below today's shifts or as a separate sub-tab. Pick what fits the layout best.
- **D-14:** Schedule shows cached last-fetched data when offline with "Last updated" timestamp (SCHED-07).

### Credential Wallet
- **D-15:** Flat list sorted by expiry urgency -- expired/expiring certs surface at top with red/amber badges, then active certs below.
- **D-16:** Add credential via bottom sheet: cert type dropdown, issue date, expiry date, issuing org, optional photo capture. Consistent with time-off request bottom sheet pattern.
- **D-17:** Expiry alerts generated at 30/14/7 day thresholds, surface as AlertCards in Home alerts feed.
- **D-18:** Shift eligibility naturally enforces cert maintenance -- employees can't pick up shifts requiring certs they don't have or that are expired.

### Claude's Discretion
Claude has full flexibility on:
- Available shifts section placement (below shifts vs sub-tab)
- PortalTabBar maxPrimary count (4 vs 5)
- Home alert card interaction patterns
- Schedule offline indicator styling
- Bottom sheet animation and transition patterns
- Whether stat tile tap navigation uses route change or tab switch

Constraints that are NOT flexible:
- Home is the default landing tab
- Clock stays as a primary tab
- Settings moves to More overflow
- Clock hero on Home is display-only (no punch button)
- Bottom sheets for time-off and add-credential (not full pages)
- Week strip for schedule (not month view in Phase 8)

### Folded Todos
None -- no matching backlog items.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 7 Foundation
- `.planning/phases/07-premium-foundation/07-CONTEXT.md` -- Card system decisions, component API patterns, eagle logo behavior
- `.planning/phases/07-premium-foundation/07-VERIFICATION.md` -- Verified artifacts and what's ready for consumption

### Requirements
- `.planning/REQUIREMENTS.md` -- HOME-01 through HOME-06, SCHED-01 through SCHED-07, CRED-01 through CRED-03, PLAN-01 acceptance criteria

### Data Model
- `supabase/migration_phase7_scheduling.sql` -- available_shifts, shift_requests tables, certifications extension, RLS policies

### Component Library
- `src/components/field/index.js` -- Barrel exports for all shared components
- `src/components/field/PremiumCard.jsx` -- Hero/Info/Alert variants
- `src/components/field/StatTile.jsx` -- Dashboard metric tiles
- `src/components/field/AlertCard.jsx` -- Tappable notification cards
- `src/components/field/ShiftCard.jsx` -- Shift display with status badge
- `src/components/field/CredentialCard.jsx` -- Cert wallet cards
- `src/components/field/DrawingsTab.jsx` -- Self-contained drawings component (readOnly prop)

### Existing Employee Portal
- `src/tabs/EmployeeView.jsx` -- Current employee portal implementation (will be heavily modified)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PremiumCard (Hero/Info/Alert):** Clock hero uses Hero variant, stat tiles use Info variant via StatTile, alerts use Alert variant via AlertCard
- **ShiftCard:** Ready for schedule tab -- accepts timeRange, project, status, overtime, onPickUp props
- **CredentialCard:** Ready for credential wallet -- accepts certName, status, issued, expiry, onTap props
- **DrawingsTab:** Ready for Drawings in More -- mount with `readOnly={true} projectFilter={assignedProjectId}`
- **PortalTabBar:** Already handles maxPrimary + More overflow with sheet panel
- **StatusBadge:** Used by ShiftCard and CredentialCard for status display
- **FieldButton:** Used for actions in cards and bottom sheets
- **EmptyState:** All empty states have action buttons per Phase 7 decision

### Established Patterns
- **CSS-in-JS via styles.js:** All component styles as CSS classes injected via `<style>` tag. Design tokens only, no hex literals.
- **Bottom sheets:** PortalTabBar sheet pattern exists for More menu -- reuse for time-off and add-credential flows
- **Translations:** All UI strings through `t()` function with EN/ES in translations.js
- **Supabase queries:** Direct client queries (no ORM). See DrawingsTab for the established pattern with loading/error states.

### Integration Points
- **EmployeeView.jsx:** Main file to modify -- add Home tab, restructure tab layout, integrate new components
- **src/data/constants.js:** Employee tab definitions for PortalTabBar
- **src/data/translations.js:** Phase 8 EN/ES strings to add
- **Supabase tables:** available_shifts, shift_requests, certifications (all have RLS policies)

</code_context>

<specifics>
## Specific Ideas

- Shift eligibility as natural cert enforcement -- employees can't pick up shifts requiring expired certs. This creates organic pressure to maintain credentials without a separate compliance system.
- Schedule view toggle (week/month/list) deferred to Phase 10 -- ship with swipeable week strip for now.
- Credential enforcement features (blocking job assignments, automated foreman notifications, cert requirement matrices) noted for future phase.

</specifics>

<deferred>
## Deferred Ideas

- **Schedule view toggle (week/month/list):** Three-view toggle for Schedule tab. Deferred to Phase 10 polish -- week strip covers 90% of field crew needs.
- **Full-screen map on Clock tab:** Expand button for the geolocation map. UX enhancement for Phase 10.
- **Credential compliance system:** Full enforcement with job assignment blocking, automated foreman notifications, cert requirement matrices. Future milestone -- Phase 8 delivers visibility and alerts, not enforcement.
- **Cert-based shift eligibility blocking:** Auto-prevent shift pickup when required certs are expired. Future milestone after cert categories are established.

</deferred>

---

*Phase: 08-employee-portal-overhaul*
*Context gathered: 2026-04-04*
