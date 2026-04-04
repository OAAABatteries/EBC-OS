# Phase 8: Employee Portal Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 08-employee-portal-overhaul
**Areas discussed:** Tab layout + navigation, Home dashboard layout, Schedule + shift workflow, Credential wallet UX

---

## Tab Layout + Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Clock stays primary | Bottom bar: Home, Clock, Schedule, Materials, More | ✓ |
| Clock moves to More | Bottom bar: Home, Schedule, Materials, Credentials, More | |
| Clock merges into Home | Home hero IS the clock | |

**User's choice:** Clock stays primary
**Notes:** Settings moves to More (decided before discussion). Clock is used daily for punch-in.

| Option | Description | Selected |
|--------|-------------|----------|
| Home, Clock, Schedule, Materials, More | Core daily-use tabs. Rest in More overflow. | ✓ |
| Home, Clock, Schedule, Credentials, More | Prioritizes credentials over materials | |
| Home, Clock, Schedule, Materials, Credentials | 5 primary, no More | |

**User's choice:** Home, Clock, Schedule, Materials, More

---

## Home Dashboard Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Hero clock → Stats → Project → Alerts | Most urgent info first | ✓ |
| Greeting → Hero → Stats → Alerts → Project | Personal greeting first | |
| Stats grid → Alerts → Clock + Project | Dashboard-first | |

**User's choice:** Hero clock → Stats → Project → Alerts

| Option | Description | Selected |
|--------|-------------|----------|
| Display-only with link | Shows status, tap to Clock tab | ✓ |
| Full punch-in from Home | Punch button directly on Home | |

**User's choice:** Display-only with link

| Option | Description | Selected |
|--------|-------------|----------|
| Hours / Tasks / Pending | Per spec | ✓ |
| Hours / Shifts / Credentials | Schedule-focused | |
| You decide | Claude picks | |

**User's choice:** Hours / Tasks / Pending (per spec)

---

## Schedule + Shift Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Swipeable week strip | 7-day horizontal, swipe for weeks | ✓ |
| Fixed current week | No navigation | |
| Calendar month view | Full month grid | |

**User's choice:** Initially wanted all three as a toggle. Redirected — week strip now, toggle deferred to Phase 10.

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet | Date range, reason, notes, submit | ✓ |
| Full page form | Separate page | |
| Inline on schedule | Tap day, inline option | |

**User's choice:** Bottom sheet

| Option | Description | Selected |
|--------|-------------|----------|
| Below today's shifts | Natural scroll flow | |
| Separate sub-tab | Toggle at top | |
| You decide | Claude places it | ✓ |

**User's choice:** Claude's discretion

---

## Credential Wallet UX

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list sorted by expiry | Urgent certs at top | ✓ |
| Grouped by category | Sections: Safety, Trade, License | |
| You decide | Claude picks | |

**User's choice:** Flat list sorted by expiry. User asked about enforcement — discussed using shift eligibility as natural cert pressure. Full compliance system deferred.

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet | Consistent with time-off pattern | ✓ |
| Full page form | More space for photo | |
| You decide | Claude picks | |

**User's choice:** Bottom sheet

---

## Claude's Discretion

- Available shifts section placement (below shifts vs sub-tab)
- PortalTabBar maxPrimary count
- Home alert interaction patterns
- Bottom sheet animation patterns

## Deferred Ideas

- Schedule view toggle (week/month/list) → Phase 10
- Full-screen map on Clock tab → Phase 10
- Credential compliance/enforcement system → Future milestone
- Cert-based shift eligibility blocking → Future milestone
