# Phase 2 — PM & Field Workflows

> Created: 2026-03-25 · Three focused workflows, no feature creep.

---

## Scope (Only These Three)

1. **Material Request Lifecycle** — field → warehouse → delivery → confirmation
2. **Project Stage Ownership Rules** — who owns what at each construction phase
3. **Field → PM → Office Data Flow** — how information moves up the chain

---

## 1. Material Request Lifecycle

### Current State
- `materialRequests` stored in Supabase (`material_requests` table), synced via realtime
- Statuses exist in CSS: `requested`, `approved`, `in-transit`, `delivered`
- EmployeeView: crew can create requests (material name, qty, unit, project)
- ForemanView: foremen see requests, can update status
- MaterialsTab: warehouse view shows inventory, request list
- DriverView: sees delivery queue, route optimization
- **Gap:** No approval workflow. No cost tracking. No PO linkage. No warehouse deduction.

### Target Lifecycle

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ DRAFTED │───→│ REQUESTED│───→│ APPROVED  │───→│ IN-TRANSIT│───→│ DELIVERED │
│ (field) │    │ (field)  │    │ (PM/whse) │    │ (driver)  │    │ (field)   │
└─────────┘    └──────────┘    └───────────┘    └───────────┘    └───────────┘
                    │                │                                  │
                    ▼                ▼                                  ▼
               ┌─────────┐    ┌──────────┐                      ┌──────────┐
               │ REJECTED│    │ ON-ORDER │                      │ CONFIRMED│
               │ (PM)    │    │ (whse)   │                      │ (foreman)│
               └─────────┘    └──────────┘                      └──────────┘
```

### Data Model Changes

```javascript
// material_requests table — ADD these fields to existing schema
{
  // Existing fields (keep as-is)
  id, material, qty, unit, projectId, requestedBy, status, created_at,

  // NEW fields
  urgency: "normal" | "urgent" | "emergency",     // default "normal"
  neededBy: "2026-03-28",                          // date string, optional
  approvedBy: null | employeeId,                   // who approved
  approvedAt: null | timestamp,
  rejectedReason: null | string,                   // why rejected
  deliveredAt: null | timestamp,
  confirmedBy: null | employeeId,                  // foreman sign-off
  confirmedAt: null | timestamp,
  estimatedCost: null | number,                    // from warehouse lookup
  notes: "",                                       // free text
}
```

### Who Does What

| Role | Can Create | Can Approve | Can Reject | Can Deliver | Can Confirm |
|------|-----------|-------------|------------|-------------|-------------|
| Employee | ✅ (own project) | ❌ | ❌ | ❌ | ❌ |
| Foreman | ✅ (own crew) | ❌ | ❌ | ❌ | ✅ (delivery receipt) |
| Driver | ❌ | ❌ | ❌ | ✅ (mark in-transit/delivered) | ❌ |
| PM | ✅ (any project) | ✅ | ✅ | ❌ | ✅ |
| Owner/Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

### Notifications

| Event | Who Gets Notified |
|-------|-------------------|
| New request (urgent) | PM + warehouse |
| Request approved | Requester + driver |
| Request rejected | Requester + foreman |
| Marked in-transit | Requester + foreman |
| Delivered | Foreman (for confirmation) |
| Delivery confirmed | PM (audit trail) |

### Implementation Notes
- Backward compatible: old requests without new fields default to `null`
- No Supabase migration needed if using JSONB or nullable columns
- Warehouse inventory auto-deducts on "approved" (if item exists in warehouse)
- Cost estimate pulled from material library pricing

---

## 2. Project Stage Ownership Rules

### Current State
- Projects have `phase` (Medical, Commercial, Retail, etc.) — this is sector, NOT stage
- No formal construction stage tracking
- No ownership assignment per stage
- ForemanView shows projects but no phase-gate handoffs

### Target: Construction Stages with Ownership

```
BID WON → PRE-CON → MOBILIZE → DEMO → FRAMING → BOARD → TAPE/FINISH → PUNCH → CLOSEOUT
```

### Stage Definitions

| Stage | Owner | Key Deliverables | Exits When |
|-------|-------|-----------------|------------|
| **Pre-Con** | PM | Submittals sent, schedule received, scope review, kick-off | GC issues NTP |
| **Mobilize** | PM + Foreman | Materials ordered, crew assigned, site access confirmed | First crew on site |
| **Demo** | Foreman | Demo complete, debris hauled, field verification done | PM signs off demo scope |
| **Framing** | Foreman | All walls framed, inspections passed, rough-in complete | Inspection approved |
| **Board** | Foreman | Drywall hung, fire tape complete, insulation installed | All board hung |
| **Tape & Finish** | Foreman | Tape, bed, texture, prime/paint if in scope | PM walk-through |
| **Punch** | PM + Foreman | Punch list items resolved, touch-ups complete | GC punch sign-off |
| **Closeout** | PM | Final invoice, lien waiver, warranty letter, as-builts | Payment received |

### Data Model Changes

```javascript
// ADD to project object (not a new table — extend existing projects)
{
  // Existing fields (keep)
  id, name, gc, value, status, ...

  // NEW fields
  constructionStage: "pre-con" | "mobilize" | "demo" | "framing" | "board" | "tape" | "punch" | "closeout",
  stageOwner: employeeId,          // current stage owner
  stageStarted: timestamp,         // when current stage began
  stageHistory: [                  // audit trail
    { stage: "pre-con", owner: "emp_123", started: "...", completed: "..." },
    { stage: "mobilize", owner: "emp_456", started: "...", completed: "..." },
  ],
}
```

### Stage Transition Rules

```
Only these roles can advance a stage:
  PM         → can advance any stage
  Foreman    → can advance demo, framing, board, tape (field stages only)
  Owner      → can advance any stage

Stage cannot skip: must go in order (pre-con → mobilize → demo → ...)
Stage can go backward: PM or owner only (rework scenario)
```

### UI Changes
- **Projects list:** Show stage badge (color-coded) next to each project
- **Project detail:** Stage progress bar with current position highlighted
- **Foreman view:** "Advance Stage" button on their active projects
- **Dashboard:** "Projects by Stage" summary widget

---

## 3. Field → PM → Office Data Flow

### Current State
- ForemanView creates: time entries, JSAs, daily reports, problems, material requests
- EmployeeView creates: time entries, material requests, problems
- PM sees everything in Dashboard, Projects, MoreTabs
- **Gap:** No formal review/approval pipeline. Data flows but nobody "signs off."

### Target: Three-Tier Data Flow

```
FIELD (Employee/Foreman)          PM                         OFFICE (Owner/Admin)
─────────────────────────    ──────────────────           ──────────────────────
Clock in/out ──────────────→ Review time entries ───────→ Payroll export
Material request ──────────→ Approve/reject ────────────→ Cost tracking
Daily report ──────────────→ Review & flag issues ──────→ Archive
Problem report ────────────→ Assign resolution ─────────→ Track to close
JSA sign-off ──────────────→ Verify compliance ─────────→ Safety audit trail
Stage advance ─────────────→ Confirm / override ────────→ Schedule update
```

### Approval Queue (PM Inbox)

The PM needs a single view of everything awaiting their action:

```javascript
// Computed from existing data — no new table needed
const pmQueue = {
  timeEntries: timeEntries.filter(t => t.status === "pending_review"),
  materialRequests: materialRequests.filter(m => m.status === "requested"),
  dailyReports: dailyReports.filter(r => !r.reviewedBy),
  problems: problems.filter(p => p.status === "open" && !p.assignedTo),
  stageAdvances: projects.filter(p => p.pendingStageAdvance),
};
```

### Implementation: "PM Action Queue" Widget

**Where:** Dashboard tab, new section above "Today's Sites"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ ⚡ ACTION QUEUE                          12 items│
├─────────────────────────────────────────────────┤
│ 🕐 Time Entries (3)     │ Review  │ Approve All │
│ 📦 Material Requests (2) │ Review  │             │
│ 📋 Daily Reports (4)    │ Review  │ Mark Read   │
│ ⚠️ Problems (2)         │ Assign  │             │
│ 🔄 Stage Advances (1)   │ Confirm │             │
└─────────────────────────────────────────────────┘
```

### Data Model Changes

```javascript
// ADD to existing objects (nullable, backward compatible)

// time_entries
{ reviewedBy: null | employeeId, reviewedAt: null | timestamp }

// daily_reports
{ reviewedBy: null | employeeId, reviewedAt: null | timestamp, flagged: false }

// problems
{ assignedTo: null | employeeId, resolvedAt: null | timestamp, resolution: null | string }
```

### Notification Flow

| Source | Event | Notifies |
|--------|-------|----------|
| Employee | Clocks out | Foreman (if overtime) |
| Foreman | Submits daily report | PM |
| Foreman | Reports problem (urgent) | PM + Owner |
| Foreman | Advances stage | PM |
| PM | Approves material request | Requester + Driver |
| PM | Assigns problem | Assigned person |
| PM | Approves time entries | Payroll queue |

---

## Implementation Priority

| # | Workflow | Effort | Dependencies |
|---|----------|--------|-------------|
| 1 | Material Request Lifecycle | Medium | Extend existing request UI + add approval |
| 2 | PM Action Queue | Small | Computed from existing data, new Dashboard widget |
| 3 | Project Stage Ownership | Medium | New fields on project, stage bar UI |

### Slice Order
1. **Material Request statuses + approval** (most impactful — field uses daily)
2. **PM Action Queue** (makes PM life easier, uses existing data)
3. **Project Stages** (structure, less urgent than daily ops)

---

## Rules

- All new fields are **nullable** — old saved data works unchanged
- No new Supabase tables — extend existing ones
- No UI redesigns — add to existing views
- Test each slice independently before moving to next
