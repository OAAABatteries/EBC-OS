# Phase 9: Driver + Foreman Portal Updates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 09-driver-foreman-portal-updates
**Areas discussed:** Driver visual refresh, Foreman tab restructure, Shift management workflow, Foreman credential dashboard

---

## Driver Visual Refresh

### Alerts Feed Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New Home tab | Add Home tab like Employee got in Phase 8 — alerts + route summary as landing | ✓ |
| Alert banner on Route tab | Keep Route as landing, collapsible alerts section at top | |
| Alerts in More overflow | Alerts tab in More menu, minimal disruption | |

**User's choice:** New Home tab (Recommended)
**Notes:** None

### Drawings Tab

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in More overflow | Drawings in More menu for occasional use | |
| Yes, as primary tab | Promote to bottom bar | |
| You decide | Claude picks placement | |

**User's choice:** "Driver never views plans" (free-text override)
**Notes:** Drivers don't need floor plan access at all. DRVR-07 and PLAN-02 removed from Phase 9 scope.

### Home Tab Content

| Option | Description | Selected |
|--------|-------------|----------|
| Route summary + alerts | Delivery count hero, stat tiles, active alerts | ✓ |
| Alerts only | Just alerts feed, minimal | |
| You decide | Claude designs based on Employee pattern | |

**User's choice:** Route summary + alerts (Recommended)
**Notes:** None

### Visual Refresh Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full PremiumCard upgrade | Replace FieldCard with PremiumCard, Hero for summary, AlertCard for alerts | ✓ |
| Light touch — alerts only | Keep FieldCard, just add alerts | |
| You decide | Claude decides effort vs consistency | |

**User's choice:** Full PremiumCard upgrade (Recommended)
**Notes:** None

---

## Foreman Tab Restructure

### Primary Bottom Nav

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard, Team, Hours, Materials, More | Dashboard landing, Clock as hero. Everything else in More. | ✓ |
| Clock, Dashboard, Team, Materials, More | Keep Clock as primary tab | |
| Let me specify | Custom layout | |

**User's choice:** Dashboard, Team, Hours, Materials, More (Recommended)
**Notes:** Clock becomes hero element on Dashboard instead of its own tab.

### Premium Visual Refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full refresh | PortalHeader + PortalTabBar + PremiumCard throughout | ✓ |
| Just tab restructure | PortalTabBar but keep existing card styles | |
| You decide | Claude decides | |

**User's choice:** Yes, full refresh (Recommended)
**Notes:** None

### Dashboard Order

| Option | Description | Selected |
|--------|-------------|----------|
| Clock hero + KPIs + alerts | Clock status hero → KPI cards → Alerts feed | ✓ |
| KPIs first, clock below | Budget first since foremen care about project budget | |
| You decide | Claude decides based on Employee pattern | |

**User's choice:** Clock hero + KPIs + alerts (Recommended)
**Notes:** None

---

## Shift Management Workflow

### Shift Posting Location

| Option | Description | Selected |
|--------|-------------|----------|
| "Post Shift" button + modal | Button in Team tab opens bottom sheet | |
| Dedicated sub-section | Team tab gets Crew / Shifts / Requests sections | |
| You decide | Claude picks UX | |

**User's choice:** "This feature is more for superintendents/admin, and PMs" (free-text override)
**Notes:** FSCH-01 (post available shifts) is NOT a foreman capability. Deferred to admin/PM/super portal.

### Confirm Scope Change

| Option | Description | Selected |
|--------|-------------|----------|
| Correct — approve only | Foremen approve/deny. Shift posting is admin/PM. | ✓ |
| Foremen can post too | Keep FSCH-01 in Phase 9 | |
| Let me explain | More nuanced view | |

**User's choice:** Correct — approve only
**Notes:** Foremen only approve/deny shift pickup + time-off requests.

### Approval Queue

| Option | Description | Selected |
|--------|-------------|----------|
| Unified queue in Team tab | Both shift and time-off requests as cards with Approve/Deny | ✓ |
| Separate queues | Shift and time-off as separate sections | |
| In Dashboard alerts | Actionable alerts on Dashboard | |

**User's choice:** Unified queue in Team tab (Recommended)
**Notes:** None

---

## Foreman Credential Dashboard

### Integration in Team Tab

| Option | Description | Selected |
|--------|-------------|----------|
| Sub-section below crew list | Crew list → Pending Requests → Crew Certifications | ✓ |
| Toggle view | Header toggle: Crew / Certifications | |
| You decide | Claude picks layout | |

**User's choice:** Sub-section below crew list (Recommended)
**Notes:** None

### Cert Actions

| Option | Description | Selected |
|--------|-------------|----------|
| View only | Foreman sees status, employees manage their own certs | ✓ |
| View + remind | Foreman can send reminder to employee | |
| You decide | Claude picks based on Phase 10 scope | |

**User's choice:** View only (Recommended)
**Notes:** None

---

## Claude's Discretion

- Driver Home stat tile metrics and layout
- Foreman Dashboard KPI card redesign approach
- Pending Requests card layout
- Crew cert dashboard summary card design
- CSS class organization
- ForemanView inline FieldSignaturePad replacement

## Deferred Ideas

- FSCH-01 (Post Available Shifts) — admin/PM/superintendent capability
- DRVR-07 / PLAN-02 (Driver Drawings tab) — drivers never view plans
- Cert-based shift eligibility blocking — future milestone
- Foreman cert edit capability — employees self-manage
