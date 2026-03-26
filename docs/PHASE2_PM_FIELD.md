# Phase 2 — PM & Field Workflows

> Created: 2026-03-25 · Updated: 2026-03-25 (merged team input)
> Goal: Shift EBC-OS from estimating-first to execution-first.

---

## 0. Why Phase 2 Exists

Phase 2 serves PMs and field teams as primary users. This aligns with how
construction operations protect margin: materials, labor, and schedule control.

**Success Metrics:**
- Reduced "waiting on materials" downtime (fewer stalled crews)
- Reduced emergency purchases / rush deliveries
- Faster PM decision cycle on material requests
- Fewer wrong-material incidents (structured capture vs. texts/calls)
- Clear audit trail: who requested, approved, routed, received

---

## 1. Scope

### In Scope
1. Material Request → PM Approval → Supplier vs Driver routing
2. Project Stage ownership (foreman-controlled, PM-visible)
3. Field → PM → Office data flow (PM Action Queue)
4. Clock-in photo verification (hardhat) — Phase 2C
5. Global project search by name + address — Phase 2D

### Out of Scope
- Estimating enhancements (unless blocking PM/Field)
- Full procurement automation / EDI
- Full accounting integrations beyond exports
- Multi-tenant SaaS

---

## 2. Roles & Permissions

| Role | Create Request | Approve/Reject | Choose Route | Deliver | Confirm Receipt | Advance Stage |
|------|---------------|----------------|-------------|---------|----------------|--------------|
| Employee | ✅ (own project) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Foreman | ✅ (own crew) | ❌ | ❌ | ❌ | ✅ | ✅ (field stages) |
| Driver | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| PM | ✅ (any project) | ✅ | ✅ | ❌ | ✅ | ✅ (any stage) |
| Owner/Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Core Workflow A: Material Request Approval

### 3.1 Problem Statement

Material requests originate on site as texts/calls/notes. Details get lost, PMs
miss messages, purchasing clarifies specs — causing hours of delay and crews
working out of sequence.

### 3.2 Design Principles

- **Field-first capture:** Structured input, not free-text only
- **PM as gatekeeper:** PM approves and chooses fulfillment route
- **Two fulfillment paths:** Supplier order (external) or in-house driver (internal)
- **Auditability:** Every decision timestamped with actor
- **Status visibility:** Foreman sees exactly where the request is

### 3.3 State Machine

```
DRAFT → SUBMITTED → PM_REVIEW → APPROVED → FULFILLMENT → DELIVERED → CLOSED
                        │
                        ▼
                    REJECTED → CLOSED

FULFILLMENT branches:
  Supplier route:  ORDERED → CONFIRMED → DELIVERED → CLOSED
  Driver route:    ASSIGNED → PICKED_UP → DELIVERED → CLOSED

Support states:
  PARTIAL_DELIVERY (keeps request open for remaining items)
  BACKORDER (supplier can't fill, PM decides)
  CANCELLED (PM/admin only)
```

### 3.4 Data Model

```javascript
// material_requests table — extend existing schema (all new fields nullable)
{
  // ── Existing fields (keep as-is) ──
  id, material, qty, unit, projectId, requestedBy, status, created_at,

  // ── NEW: Request details ──
  urgency: "normal" | "urgent" | "emergency",   // default "normal"
  neededBy: null | "2026-03-28",                 // date string
  deliveryLocation: null | string,               // jobsite area / address
  notes: "",                                     // free text
  attachments: [],                               // photo URLs (spec sheets, etc.)

  // ── NEW: Multi-item support ──
  items: [                                       // array of line items
    {
      description: "3-5/8\" 25ga Stud 10'",
      quantity: 200,
      unit: "EA",
      spec: "ClarkDietrich, 25ga only",          // constraints
      substituteAllowed: true,
      costCode: null,                            // optional phase code
    }
  ],

  // ── NEW: Approval ──
  approvedBy: null | employeeId,
  approvedAt: null | timestamp,
  rejectedReason: null | string,
  fulfillmentType: null | "supplier" | "in_house_driver",
  decisionNotes: null | string,

  // ── NEW: Supplier fulfillment ──
  vendorId: null | string,
  poNumber: null | string,
  promisedDeliveryWindow: null | string,

  // ── NEW: Driver fulfillment ──
  driverUserId: null | employeeId,
  scheduledPickupTime: null | timestamp,
  scheduledDropoffTime: null | timestamp,

  // ── NEW: Delivery ──
  deliveredAt: null | timestamp,
  confirmedBy: null | employeeId,                // foreman sign-off
  confirmedAt: null | timestamp,
  exceptions: null | string,                     // "partial" | "wrong_item" | "damaged"
  estimatedCost: null | number,

  // ── NEW: Audit trail ──
  auditTrail: [],                                // [{ action, actor, timestamp, notes }]
}
```

### 3.5 Screens (Minimum Viable)

**Foreman (mobile-first):**
1. **Create Request** — project selector, needed-by, items list (quick add), photo attach, submit
2. **My Requests** — statuses + last update timestamp
3. **Confirm Receipt** — confirm delivered / partial / issue

**PM (desktop + mobile):**
1. **Approval Inbox** — filters: project, urgency, overdue
2. **Request Detail** — approve/reject, choose route (supplier vs driver), set priority
3. **Material Pipeline** — all requests for project with status + bottlenecks

**Driver:**
1. **Assigned Deliveries** — pickup/dropoff instructions
2. **Mark Delivered** — photo proof optional

### 3.6 Notifications

| Event | Who Gets Notified |
|-------|-------------------|
| New request submitted | PM |
| New urgent request | PM + Owner |
| Request approved | Requester + Foreman + Driver (if driver route) |
| Request rejected | Requester + Foreman |
| Out for delivery (in-transit) | Requester + Foreman |
| Delivered | Foreman (for confirmation) |
| Delivery confirmed | PM (audit trail complete) |
| Overdue request (no PM action in 4hrs) | PM + Owner (escalation) |

### 3.7 Edge Cases

| Scenario | Handling |
|----------|---------|
| PM is OOO | Escalate to backup PM/Owner after 4hr threshold |
| Partial delivery | Keep request open, track remaining items |
| Wrong/damaged material | Create exception + re-request path |
| "Need it now" (emergency) | Urgent flag, PM gets push notification, supports temp override |
| Substitute material | `substituteAllowed` flag per item, PM decides |
| Request cancelled mid-flight | PM/admin only, audit trail records reason |

---

## 4. Core Workflow B: Project Stage Ownership

### Purpose

Foreman is closest to the work. They set a controlled "current stage" for the
project. This becomes operational truth for PM planning.

### Construction Stages

```
PRE-CON → MOBILIZE → DEMO → FRAMING → BOARD → TAPE/FINISH → PUNCH → CLOSEOUT
```

| Stage | Owner | Key Deliverables | Exits When |
|-------|-------|-----------------|------------|
| Pre-Con | PM | Submittals, schedule, scope review, kick-off | GC issues NTP |
| Mobilize | PM + Foreman | Materials ordered, crew assigned, site access | First crew on site |
| Demo | Foreman | Demo complete, debris hauled, field verify | PM signs off |
| Framing | Foreman | Walls framed, inspections passed, rough-in | Inspection approved |
| Board | Foreman | Drywall hung, fire tape, insulation | All board hung |
| Tape/Finish | Foreman | Tape, bed, texture, paint if in scope | PM walk-through |
| Punch | PM + Foreman | Punch items resolved, touch-ups | GC punch sign-off |
| Closeout | PM | Final invoice, lien waiver, warranty, as-builts | Payment received |

### Data Model

```javascript
// Extend existing project object (not a new table)
{
  constructionStage: "pre-con" | "mobilize" | "demo" | "framing" | "board" | "tape" | "punch" | "closeout",
  stageOwner: null | employeeId,
  stageStarted: null | timestamp,
  stageHistory: [
    { stage: "pre-con", owner: "emp_123", started: "...", completed: "..." },
  ],
}
```

### Transition Rules

- **Foreman** can advance: demo, framing, board, tape (field stages only)
- **PM** can advance any stage
- **Owner** can advance any stage
- Stages **cannot skip** — must go in order
- Stages **can go backward** — PM or owner only (rework)
- System records who changed + when in `stageHistory`

### UI
- Projects list: stage badge (color-coded)
- Project detail: stage progress bar
- Foreman view: "Advance Stage" button
- Dashboard: "Projects by Stage" count widget

---

## 5. Core Workflow C: Field → PM → Office Data Flow

### PM Action Queue

Single widget showing everything awaiting PM action:

```javascript
const pmQueue = {
  materialRequests: materialRequests.filter(m => m.status === "submitted"),
  timeEntries: timeEntries.filter(t => t.status === "pending_review"),
  dailyReports: dailyReports.filter(r => !r.reviewedBy),
  problems: problems.filter(p => p.status === "open" && !p.assignedTo),
  stageAdvances: projects.filter(p => p.pendingStageAdvance),
};
```

**Where:** Dashboard, new section above "Today's Sites"

### Data Model Additions (all nullable)

```javascript
// time_entries — add review fields
{ reviewedBy: null | employeeId, reviewedAt: null | timestamp }

// daily_reports — add review fields
{ reviewedBy: null | employeeId, reviewedAt: null | timestamp, flagged: false }

// problems — add assignment fields
{ assignedTo: null | employeeId, resolvedAt: null | timestamp, resolution: null | string }
```

---

## 6. Phase 2C: Clock-In Photo Verification

- On clock-in: capture photo showing hardhat
- Store photo URL with time entry
- Exception flow: photo failure → supervisor override
- Manual review now; automation later

---

## 7. Phase 2D: Global Project Search

- Search by project name or address
- Quick-open from any screen
- Reduces friction for everyone

---

## 8. Delivery Plan

| Phase | Feature | ROI | Effort |
|-------|---------|-----|--------|
| **2A** | Material Request Approval + Routing | Highest (controls money + schedule) | Medium |
| **2B** | Project Stage Ownership + Pipeline | High (operational truth) | Medium |
| **2C** | Clock-In Photo Verification | Medium (compliance + payroll trust) | Small |
| **2D** | Global Project Search | Low (time saver) | Small |

---

## 9. Definition of Done (Phase 2A)

- [ ] Foreman can submit request with items + needed-by + urgency
- [ ] PM can approve/reject and choose route (supplier vs driver)
- [ ] If supplier route: status tracks ordered → confirmed → delivered
- [ ] If driver route: driver receives assignment, marks delivered
- [ ] Foreman confirms receipt (with exception option)
- [ ] Full audit trail visible for PM/admin
- [ ] Notifications working for key events
- [ ] Old requests without new fields still work (backward compat)
- [ ] `npm run build` passes

---

## 10. Rules

- All new fields are **nullable** — old data works unchanged
- No new Supabase tables — extend existing ones
- No UI redesigns — add to existing views
- Test each slice independently
- **Do NOT add estimating features** unless they block PM/Field work
