# Phase 9: Driver + Foreman Portal Updates — Research

**Researched:** 2026-04-04
**Domain:** React portal restructure — PortalTabBar migration, PremiumCard wiring, Supabase shift/cert queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Driver Visual Refresh (DRVR-05, DRVR-06)**
- D-01: Add a new Home tab to Driver as the default landing screen. Shows today's delivery count hero (PremiumCard Hero variant), stat tiles (Pending/Completed/Miles), and alerts feed (schedule changes, delivery updates via AlertCard).
- D-02: Route cards upgrade from FieldCard to PremiumCard Info variant. Full Premium Construction visual language applied throughout.
- D-03: Driver tab layout: Home (landing), Route, Completed, More. Settings moves to More overflow (consistent with Employee pattern from Phase 8 D-01).
- D-04: PortalTabBar maxPrimary = 4 for Driver (Home + Route + Completed + More).
- D-05: No Drawings tab for Driver — drivers never view floor plans. DRVR-07 and PLAN-02 removed from Phase 9.

**Foreman Tab Restructure**
- D-06: Primary bottom nav tabs: Dashboard (landing), Team, Hours, Materials, More.
- D-07: More overflow contains: Clock, JSA, Drawings, Look-Ahead, Daily Report, Site, Notes, Documents, Settings.
- D-08: Clock moves from its own tab to a hero element on Dashboard — clock status display at the top of Dashboard, consistent with Employee Home pattern.
- D-09: Dashboard order: Clock status hero → KPI cards (budget, hours, crew counts) → Alerts feed (shift requests, time-off requests, cert warnings).
- D-10: Replace inline header with PortalHeader. Replace horizontal tab strip with PortalTabBar + More overflow.
- D-11: Full Premium visual refresh — PremiumCard used for KPI cards, team member cards, and request cards throughout ForemanView.

**Shift Management Workflow (FSCH-02, FSCH-03, FSCH-04)**
- D-12: Foreman does NOT post shifts (FSCH-01 deferred). Foreman only reviews and approves/denies requests.
- D-13: Unified "Pending Requests" section in Team tab shows both shift pickup requests and time-off requests as cards with Approve/Deny buttons.
- D-14: Badge count on Team tab for pending request items.
- D-15: Approve/deny actions include optional comments field (FSCH-03).
- D-16: Foreman receives in-app notification when employee submits a shift or time-off request (FSCH-04).

**Foreman Credential Dashboard (CRED-04)**
- D-17: Crew Certifications section appears below crew list and pending requests in Team tab. Team tab layout: Crew list → Pending Requests → Crew Certifications.
- D-18: Filter chips: All / Expiring / Expired. Each crew member shows cert status summary (active count, expiring count, expired count).
- D-19: View only — foreman cannot edit employee certs. Employees manage their own credentials via Employee portal. Foreman gets visibility, not edit capability.

**Non-Flexible Constraints**
- Driver Home is the default landing tab (state initial value: `"home"`, not `"route"`)
- Driver has no Drawings tab
- Foreman shift posting (FSCH-01) is NOT in scope
- Foreman primary tabs: Dashboard, Team, Hours, Materials, More (exactly 5)
- Clock is a Dashboard hero, not its own primary tab
- Credential dashboard is view-only for foremen
- Pending requests unified in Team tab (not separate queues)
- PortalHeader + PortalTabBar used for both portals
- Bottom sheet pattern for approval comments (consistent with Phase 8)

### Claude's Discretion
- Driver Home tab stat tile metrics and layout details
- Driver alert types and alert card interaction patterns
- Foreman Dashboard KPI card design (reuse existing KPI logic or redesign with PremiumCard)
- Pending Requests card layout (combined list vs grouped by type)
- Crew cert dashboard summary card design
- Whether ForemanView inline FieldSignaturePad (line 18-64) gets replaced with the shared import
- CSS class organization for new Foreman sections

### Deferred Ideas (OUT OF SCOPE)
- FSCH-01 — Post Available Shifts: Foremen don't post shifts. Admin/PM/superintendent tool. Defer to admin portal phase.
- DRVR-07 / PLAN-02 — Driver Drawings tab: Drivers never view floor plans. Removed from scope entirely.
- Cert-based shift eligibility blocking: Auto-prevent shift pickup when required certs are expired. Future milestone.
- Foreman cert edit capability: Foremen editing employee certs. Deferred — employees self-manage.
- Drag-and-drop schedule builder: Already noted in REQUIREMENTS.md Out of Scope. Foreman uses modal-based approach.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRVR-05 | Driver portal visual refresh with Premium Construction design language | PremiumCard hero/info variants ready; DriverView already imports PortalHeader + PortalTabBar; route cards use FieldCard today — swap to PremiumCard info |
| DRVR-06 | Driver portal has alerts feed (schedule changes, delivery updates) | AlertCard component ready in field/index.js; same pattern as EmployeeView HomeTab alerts feed |
| FSCH-02 | Shift pickup request queue with approve/deny buttons in Team tab | shift_requests table exists with RLS; foremen can UPDATE status; ShiftCard ready but request cards need approve/deny FieldButton actions |
| FSCH-03 | Time-off request queue with approve/deny + optional comments in Team tab | review_notes column exists in shift_requests; bottom sheet pattern established in Phase 8 |
| FSCH-04 | Foreman notified in-app when employee requests shift or time-off | In-app only (browser push is Phase 10); implement as AlertCard in Dashboard alerts feed driven by pending request count |
| CRED-04 | Foreman credential dashboard in Team tab showing crew cert status overview with filter by status | certifications table with RLS; CredentialCard ready; filter chip pattern new CSS needed |
</phase_requirements>

---

## Summary

Phase 9 is a pure UI restructure and component-wiring phase — no new backend tables, no new shared components, no new hooks. Every building block already exists from Phases 7 and 8. The work is: (1) Driver gets a new Home tab and PremiumCard upgrade on its existing tabs, and (2) ForemanView gets its 13-tab horizontal strip replaced with PortalTabBar bottom nav, a new Dashboard tab, a restructured Team tab with shift approval workflow and cert dashboard, and a complete Premium visual refresh.

DriverView (654 lines) is a clean starting point. It already imports PortalHeader, PortalTabBar, and FieldButton. The only missing pieces are: initial tab state must change from `"route"` to `"home"`, the driverTabDefs array must be updated to add Home and put Settings in overflow, a HomeTab render block must be added, and route card markup must swap FieldCard for PremiumCard.

ForemanView (3639 lines) is the heavy lift. It has a 13-tab inline array (tabDefs at line 716) rendered as a horizontal `.emp-tabs` strip (lines 788-799). The inline header at lines 750-761 must be replaced with PortalHeader. The tab strip must be replaced with PortalTabBar. The new Dashboard tab is a net-new render block. The Team tab gets two new sections appended below the existing crew list. The FieldSignaturePad inline definition at lines 18-64 with hardcoded strokeStyle `#1e2d3b` should be replaced with the shared import (discretionary per CONTEXT.md but strongly recommended — it's a COMP-10 compliance gap).

Data access for both new features is straightforward: Supabase direct client queries on `shift_requests` (filter by foreman's project crew, status = 'pending') and `certifications` (filter by employee_ids in crew). RLS policies already allow foremen to SELECT and UPDATE shift_requests.

**Primary recommendation:** Split implementation into four plans: (1) Driver Home tab + tab restructure + PremiumCard upgrade; (2) Foreman structural shell — PortalHeader + PortalTabBar + Dashboard tab + FieldSignaturePad cleanup; (3) Foreman Team tab — crew list refresh, Pending Requests section, bottom sheet approve/deny workflow; (4) Foreman Team tab — Crew Certifications dashboard + translations for both portals.

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x (existing) | Component model, useState/useMemo/useCallback | Codebase standard |
| lucide-react | existing | Tab icons, inline icons | Codebase standard; all tab icons source from here |
| @supabase/supabase-js | existing | shift_requests + certifications queries | All Supabase queries are direct client calls in components |

### Supporting Components (already built, imported from barrel)

| Component | Location | API Contract |
|-----------|----------|-------------|
| PremiumCard | src/components/field/PremiumCard.jsx | `variant="hero|info|alert"`, `alertType="warning|success|error|info"`, spreads all div props |
| AlertCard | src/components/field/AlertCard.jsx | `type`, `message`, `timestamp`, `onTap`, `t` |
| ShiftCard | src/components/field/ShiftCard.jsx | `timeRange`, `project`, `location`, `status`, `isAvailable`, `isOvertime`, `onPickUp`, `t` |
| CredentialCard | src/components/field/CredentialCard.jsx | `certName`, `issuedDate`, `expiryDate`, `issuingOrg`, `status`, `onTap`, `t` |
| StatTile | src/components/field/StatTile.jsx | `label`, `value`, `color` (CSS var string), `onTap`, `t` — uses `--stat-color` CSS custom prop |
| PortalTabBar | src/components/field/PortalTabBar.jsx | `tabs` (array of `{id, label, icon, badge}`), `activeTab`, `onTabChange`, `maxPrimary`, `t` |
| PortalHeader | src/components/field/PortalHeader.jsx | `variant`, `userName`, `languageToggle`, `settingsAction`, `projectSelector`, `t`, `network` |
| FieldButton | src/components/field/FieldButton.jsx | `variant="primary|ghost|danger"`, `onClick`, `loading`, `t` |
| FieldInput | src/components/field/FieldInput.jsx | Standard controlled input |
| FieldSignaturePad | src/components/field/FieldSignaturePad.jsx | `onSave`, `onClear`, `label`, `t` — reads theme color via getComputedStyle (no hardcoded hex) |
| EmptyState | src/components/field/EmptyState.jsx | `icon`, `heading`, `message`, `t`, children (action slot) |
| StatusBadge | src/components/field/StatusBadge.jsx | `status` string → semantic color |

**Installation:** None required. All components are in `src/components/field/index.js` barrel.

---

## Architecture Patterns

### DriverView — Current Structure (654 lines)

```
DriverView.jsx
├── State: activeDriver, driverTab ("route" initial), optimizedStops, todayDelivered
├── driverTabDefs: [{id:"route"}, {id:"completed"}, {id:"settings"}] — maxPrimary=3
├── LOGIN screen (early return if !activeDriver)
├── MAIN view:
│   ├── <PortalHeader variant="driver" .../>   ← already wired
│   ├── employee-body div
│   │   ├── {driverTab === "route"} → KPI grid + stop list (FieldCard)
│   │   ├── {driverTab === "completed"} → completed list (FieldCard)
│   │   └── {driverTab === "settings"} → settings wrap
│   └── <PortalTabBar tabs={driverTabDefs} maxPrimary={3} .../>  ← already wired
```

**Phase 9 Driver changes:**
1. Change `useState("route")` → `useState("home")` (line 77)
2. Update `driverTabDefs` (lines 353-359): add Home tab, restructure so Settings goes in overflow, maxPrimary becomes 4
3. Add `{driverTab === "home"}` render block with PremiumCard hero + StatTile row + AlertCard feed
4. In route tab: replace `<FieldCard>` route stop cards with `<PremiumCard variant="info">` (or "hero" for in-transit)
5. Change `maxPrimary={3}` to `maxPrimary={4}` on PortalTabBar
6. Import additional components: `PremiumCard, StatTile, AlertCard` from field barrel

### ForemanView — Current Structure (3639 lines)

```
ForemanView.jsx
├── Inline FieldSignaturePad function (lines 18-64) — hardcoded strokeStyle "#1e2d3b"
├── State: foremanTab ("clock" initial), selectedProjectId, clockEntry, ...
├── tabDefs array (line 716-730): 13 tabs — clock, dashboard, team, hours, jsa, materials,
│     drawings, lookahead, reports, site, notes, documents, settings
├── LOGIN screen (early return if !activeForeman)
├── MAIN view:
│   ├── <header className="employee-header"> (lines 750-761) — inline, NOT PortalHeader
│   ├── employee-body div
│   │   ├── Project selector <select> (lines 765-778) — outside tab strip
│   │   ├── Empty project state (lines 780-786)
│   │   ├── <div className="emp-tabs"> (lines 788-799) — horizontal scroll strip
│   │   │   └── {tabDefs.map(tab => <button className="emp-tab">)}
│   │   └── {selectedProject && foremanTab !== "settings" && (
│   │       ├── {foremanTab === "clock"} → clock tab content
│   │       ├── {foremanTab === "dashboard"} → dashboard (budget, crew KPIs, etc.)
│   │       ├── {foremanTab === "team"} → crew list
│   │       ├── {foremanTab === "hours"} → time entries
│   │       ├── {foremanTab === "jsa"} → JSA list/detail/create
│   │       ├── {foremanTab === "materials"} → material requests
│   │       ├── {foremanTab === "drawings"} → <DrawingsTab>
│   │       ├── {foremanTab === "lookahead"} → look-ahead events
│   │       ├── {foremanTab === "reports"} → daily reports
│   │       ├── {foremanTab === "site"} → site logistics
│   │       ├── {foremanTab === "notes"} → project notes
│   │       └── {foremanTab === "documents"} → RFIs/COs/submittals
│   └── {foremanTab === "settings"} → settings wrap
```

**Phase 9 Foreman changes:**

1. **Line 18-64 cleanup:** Remove inline `function FieldSignaturePad` definition; add `FieldSignaturePad` to the field barrel import at the top. (Discretionary per CONTEXT.md, but closes COMP-10 gap.)

2. **Import updates:** Add to field barrel import: `PremiumCard, StatTile, AlertCard, CredentialCard, ShiftCard, FieldSignaturePad`; add Lucide icons for new tab bar: `LayoutDashboard, Users, Package, Clock as ClockIcon, Shield, Calendar as CalendarIcon, ClipboardList, MapPin, MessageSquare, FileQuestion, Shield as ShieldIcon, MoreHorizontal` (some already imported).

3. **Tab state:** Change `useState("clock")` → `useState("dashboard")` (line 117).

4. **Replace inline header (lines 750-761):** Swap `<header className="employee-header">` block with `<PortalHeader variant="foreman" projectSelector={...} t={t} network={network} />`. Wire existing project selector `<select>` as the `projectSelector` prop.

5. **Replace tab strip (lines 788-799):** Remove `<div className="emp-tabs">` block. Wire `<PortalTabBar>` in its place with new `foremanPortalTabs` array. Tabs use `id` field (PortalTabBar uses `tab.id`), not `key` (old tabDefs used `tab.key`).

6. **New Dashboard tab render block:** New `{foremanTab === "dashboard"}` section with clock hero + KPI StatTiles + AlertCard feed. The existing `{foremanTab === "dashboard"}` block (budget/crew KPIs) becomes a subsection inside the new Dashboard.

7. **Revised Team tab:** Existing crew list kept; append Pending Requests section + bottom sheet state + Crew Certifications section with filter chips.

8. **Supabase queries:** Add `useEffect` calls on tab mount for shift_requests and certifications. Foreman's project crew is already in `teamForProject` (existing derived state).

### Pattern: PortalTabBar Tab Definition

PortalTabBar reads `tab.id` (not `tab.key`) and `tab.icon` (component reference, not string). Existing ForemanView tabDefs use `key` — must rename to `id` in new array:

```javascript
// Source: src/components/field/PortalTabBar.jsx — verified
const foremanPortalTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: false },
  { id: "team",      label: "Team",      icon: Users,           badge: pendingRequests.length > 0 },
  { id: "hours",     label: "Hours",     icon: Clock,           badge: false },
  { id: "materials", label: "Materials", icon: Package,         badge: pendingMaterials > 0 },
  // overflow (maxPrimary=4, so everything from index 4 onward goes into More sheet):
  { id: "clock",     label: "Clock",     icon: ClockIcon,       badge: false },
  { id: "jsa",       label: "JSA",       icon: Shield,          badge: activeJsaCount > 0 },
  { id: "drawings",  label: "Drawings",  icon: FileText,        badge: false },
  { id: "lookahead", label: "Look-Ahead",icon: Calendar,        badge: lookAheadEvents.length > 0 },
  { id: "reports",   label: "Daily Report", icon: ClipboardList, badge: false },
  { id: "site",      label: "Site",      icon: MapPin,          badge: criticalUnchecked.length > 0 },
  { id: "notes",     label: "Notes",     icon: MessageSquare,   badge: projNotesCount > 0 },
  { id: "documents", label: "Documents", icon: FileQuestion,    badge: rfiAlerts.length > 0 },
  { id: "settings",  label: "Settings",  icon: Settings,        badge: false },
];
```

### Pattern: Driver Tab Restructure

```javascript
// Current (lines 353-359 in DriverView.jsx):
const driverTabDefs = [
  { id: "route",     label: "Route",     icon: Navigation, badge: optimizedStops.length > 0 },
  { id: "completed", label: "Completed", icon: CheckCircle, badge: todayDelivered.length > 0 },
  { id: "settings",  label: "Settings",  icon: Settings },
];
// maxPrimary={3}

// Phase 9 target:
const driverTabDefs = [
  { id: "home",      label: "Home",      icon: Home,       badge: false },
  { id: "route",     label: "Route",     icon: Navigation, badge: optimizedStops.length > 0 },
  { id: "completed", label: "Completed", icon: CheckCircle, badge: todayDelivered.length > 0 },
  // overflow (maxPrimary=4):
  { id: "settings",  label: "Settings",  icon: Settings,   badge: false },
];
// maxPrimary={4}
// Initial state: useState("home")
```

### Pattern: Driver Home Tab Layout

```jsx
// Source: derived from EmployeeView HomeTab pattern (Phase 8 reference impl)
{driverTab === "home" && (
  <div className="emp-content">
    {/* Hero */}
    <PremiumCard variant="hero" style={{ borderLeftColor: optimizedStops.length > 0 ? 'var(--accent)' : 'var(--text3)' }}>
      <div className="text-sm" style={{ color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)' }}>
        {greeting}  {/* "Good Morning, {firstName}" */}
      </div>
      <div style={{ fontSize: 'var(--text-display)', fontWeight: 900, lineHeight: 'var(--leading-tight)' }}>
        {optimizedStops.length}
      </div>
      <div className="text-sm" style={{ color: 'var(--text3)', textTransform: 'uppercase' }}>
        {t("STOPS TODAY")}
      </div>
    </PremiumCard>

    {/* Stat tiles */}
    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
      <StatTile label={t("PENDING")}   value={pendingCount}              color="var(--accent)" onTap={() => setDriverTab("route")}    t={t} />
      <StatTile label={t("DELIVERED")} value={todayDelivered.length}     color="var(--green)"  onTap={() => setDriverTab("completed")} t={t} />
      <StatTile label={t("MILES")}     value={totalDistance.toFixed(1)}  color="var(--text)"   t={t} />
    </div>

    {/* Alerts feed */}
    <div style={{ marginTop: 'var(--space-6)' }}>
      <div className="text-sm" style={{ color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', marginBottom: 'var(--space-3)' }}>
        {t("ALERTS")}
      </div>
      {driverAlerts.slice(0, 3).map(alert => (
        <AlertCard key={alert.id} type={alert.type} message={alert.message} timestamp={alert.timestamp}
          onTap={() => setDriverTab("route")} t={t} />
      ))}
      {driverAlerts.length > 3 && (
        <button style={{ color: 'var(--accent)', fontSize: 'var(--text-base)' }} onClick={() => setDriverTab("route")}>
          {t("View All")}
        </button>
      )}
      {driverAlerts.length === 0 && <EmptyState icon={CheckCircle} heading={t("No alerts")} t={t} />}
    </div>
  </div>
)}
```

### Pattern: Foreman Dashboard Tab Layout

```jsx
// Source: CONTEXT.md D-08, D-09 + UI-SPEC layout contract
{foremanTab === "dashboard" && (
  <div className="emp-content">
    {/* Clock hero — tappable to clock tab */}
    <PremiumCard variant="hero"
      style={{ borderLeftColor: isForemanClockedIn ? 'var(--green)' : 'var(--text3)', cursor: 'pointer' }}
      onClick={() => setForemanTab("clock")}
    >
      <div className="text-sm" style={{ color: isForemanClockedIn ? 'var(--green)' : 'var(--text3)', textTransform: 'uppercase' }}>
        {isForemanClockedIn ? t("ON CLOCK") : t("OFF CLOCK")}
      </div>
      <div style={{ fontSize: 'var(--text-display)', fontWeight: 900 }}>
        {clockDuration || "—"}
      </div>
      <div className="text-sm" style={{ color: 'var(--text3)', textTransform: 'uppercase' }}>
        {t("TAP TO CLOCK IN/OUT")}
      </div>
    </PremiumCard>

    {/* KPI tiles */}
    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
      <StatTile label={t("BUDGET")} value={`${budgetPct}%`} color={budgetPct > 90 ? 'var(--accent)' : 'var(--green)'} onTap={() => setForemanTab("hours")} t={t} />
      <StatTile label={t("HOURS")}  value={todayHoursForProject.toFixed(1)} color="var(--text)"  onTap={() => setForemanTab("hours")} t={t} />
      <StatTile label={t("CREW")}   value={clockedInCrew}                   color="var(--green)" onTap={() => setForemanTab("team")}  t={t} />
    </div>

    {/* Alerts feed */}
    {/* Priority: pending requests first (actionable), then cert warnings (informational) */}
    <div style={{ marginTop: 'var(--space-6)' }}>
      <div className="text-sm" style={{ color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', marginBottom: 'var(--space-3)' }}>
        {t("ALERTS")}
      </div>
      {foremanAlerts.slice(0, 3).map(alert => (
        <AlertCard key={alert.id} type={alert.type} message={alert.message} timestamp={alert.timestamp}
          onTap={() => setForemanTab(alert.targetTab)} t={t} />
      ))}
    </div>
  </div>
)}
```

### Pattern: Foreman Team Tab — Pending Requests Section

```jsx
// Source: CONTEXT.md D-13, D-15 + UI-SPEC interaction contract
// State needed: pendingRequests[], approveSheetOpen, denySheetOpen, activeRequestId, commentText

{/* Pending Requests section */}
<div style={{ marginTop: 'var(--space-8)' }}>
  <div className="text-sm" style={{ color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', marginBottom: 'var(--space-3)' }}>
    {t("PENDING REQUESTS")} {pendingRequests.length > 0 && `(${pendingRequests.length})`}
  </div>
  {pendingRequests.length === 0
    ? <EmptyState icon={CheckCircle} heading={t("No pending requests")} message={t("Your crew is all set")} t={t} />
    : pendingRequests.map(req => (
      <PremiumCard key={req.id} variant="info" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="text-base font-bold">{req.employeeName}</div>
        <div className="text-sm" style={{ color: req.type === 'shift' ? 'var(--accent)' : 'var(--yellow)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)' }}>
          {req.type === 'shift' ? t("SHIFT REQUEST") : t("TIME OFF")}
        </div>
        <div className="text-base" style={{ color: 'var(--text2)', marginTop: 'var(--space-2)' }}>
          {req.dateRange}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <FieldButton variant="primary" onClick={() => openApproveSheet(req.id)} t={t}>
            {t("Approve Request")}
          </FieldButton>
          <FieldButton variant="danger" onClick={() => openDenySheet(req.id)} t={t}>
            {t("Deny Request")}
          </FieldButton>
        </div>
      </PremiumCard>
    ))
  }
</div>
```

### Pattern: Bottom Sheet for Approval Comments

The PortalTabBar already renders a sheet overlay (`field-tab-sheet-overlay`, `field-tab-sheet`) using CSS transform toggle. The approval comment bottom sheet reuses the same CSS pattern — **do not import or reinvent a sheet component**. Add local state `approveSheetOpen`/`denySheetOpen`/`activeRequestId`/`commentText` to ForemanView, and render a `<div className="field-tab-sheet ...">` directly below the PortalTabBar (sibling, not inside any tab content area). Use inline boolean class to toggle `.open`.

```jsx
// Source: PortalTabBar.jsx pattern — field-tab-sheet + field-tab-sheet-overlay
// Approval sheet renders outside employee-body div, before PortalTabBar

{(approveSheetOpen || denySheetOpen) && (
  <div className="field-tab-sheet-overlay" onClick={closeSheet} aria-hidden="true" />
)}
<div className={`field-tab-sheet ${approveSheetOpen || denySheetOpen ? 'open' : ''}`}>
  <div style={{ padding: 'var(--space-4)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
      <div className="text-base font-bold">{approveSheetOpen ? t("Approve Request") : t("Deny Request")}</div>
      <button style={{ color: 'var(--text2)', minHeight: 'var(--touch-min)', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={closeSheet}>{t("Go Back")}</button>
    </div>
    {/* Request summary (read-only) */}
    <FieldInput
      value={commentText}
      onChange={e => setCommentText(e.target.value)}
      placeholder={t("Add comment (optional)")}
      inputMode="text"
      t={t}
    />
    <FieldButton
      variant={approveSheetOpen ? "primary" : "danger"}
      style={{ marginTop: 'var(--space-3)', width: '100%' }}
      onClick={confirmAction}
      t={t}
    >
      {approveSheetOpen ? t("Confirm Approval") : t("Confirm Denial")}
    </FieldButton>
  </div>
</div>
```

### Pattern: Crew Certifications Filter Chips

New CSS classes needed in styles.js (no existing filter chip classes). Add to PREMIUM CARDS section:

```css
/* Filter chips — horizontal scroll row */
.filter-chip-row{display:flex;gap:var(--space-2);overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.filter-chip-row::-webkit-scrollbar{display:none}
.filter-chip{display:inline-flex;align-items:center;padding:var(--space-1) var(--space-3);border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:var(--text-sm);font-weight:var(--weight-bold);cursor:pointer;white-space:nowrap;min-height:var(--touch-min);transition:all var(--transition-micro);touch-action:manipulation}
.filter-chip.active{background:rgba(255,127,33,0.15);border-color:var(--accent);color:var(--accent)}
```

### Pattern: Foreman Cert Dashboard — Crew-Level View

CredentialCard is designed for individual cert rows (certName, issuedDate, etc.). For the foreman crew view, each row shows a crew MEMBER with cert STATUS SUMMARY — not individual certs. Two options:

1. Render CredentialCard once per member with a `certName` of the member's name and use the body slot for summary counts — simple but semantically awkward.
2. Use PremiumCard info variant directly per crew member with custom inner layout — cleaner, matches D-11 (PremiumCard for team member cards).

**Recommendation (Claude's discretion):** Use PremiumCard info variant for the crew member cert summary rows. Reserve CredentialCard for individual cert items. This matches D-17/D-18 which describe each "crew member" as a card, not each cert.

```jsx
// Per crew member cert summary card
<PremiumCard variant="info" style={{ marginBottom: 'var(--space-2)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div>
      <div className="text-base font-bold">{member.name}</div>
      <div className="text-sm" style={{ color: 'var(--text3)' }}>{member.role}</div>
    </div>
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {activeCerts > 0 && <span style={{ color: 'var(--green)', fontSize: 'var(--text-sm)' }}>{t("{n} active", { n: activeCerts })}</span>}
      {expiringCerts > 0 && <span style={{ color: 'var(--yellow)', fontSize: 'var(--text-sm)' }}>{t("{n} expiring", { n: expiringCerts })}</span>}
      {expiredCerts > 0 && <span style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>{t("{n} expired", { n: expiredCerts })}</span>}
    </div>
  </div>
</PremiumCard>
```

### Anti-Patterns to Avoid

- **Using `tab.key` instead of `tab.id` in new PortalTabBar tabs:** PortalTabBar reads `tab.id`. Old ForemanView tabDefs use `tab.key`. Do not copy-paste old tabDefs verbatim.
- **Placing the bottom sheet inside `employee-body`:** The sheet must be a sibling to `employee-body`, positioned before `<PortalTabBar>`. If nested inside the scrolling body, it will clip and CSS fixed positioning will break.
- **Adding inline `style={{}}` with hex values:** All colors via CSS variables. The only allowed inline styles are structural (display, gap, margin using `var(--space-*)`) or dynamic boolean state (opacity, cursor). No hex literals.
- **Rendering PortalTabBar before the bottom sheet div:** Sheet must come before PortalTabBar in the DOM so z-index stacking is correct (sheet z-index 151, overlay 150, tab bar 100).
- **Forgetting `maxPrimary` prop on PortalTabBar:** Without it, defaulting to 4 still works for Driver, but Foreman needs exactly 4 primary + 9 overflow (13 tabs total). Pass `maxPrimary={4}` explicitly on both.
- **Querying certifications for ALL employees:** Filter by `employee_id IN (teamForProject.map(e => e.id))`. Don't fetch all certs and filter in-memory with large datasets.
- **Duplicating the network status hook:** ForemanView does not currently import `useNetworkStatus`. Add it alongside the field barrel import — same pattern as DriverView line 6 and EmployeeView line 73.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom tab bar with More overflow | Custom tab + sheet | PortalTabBar (already exists) | Handles More toggle, overlay, badge, active state |
| Alert cards | Custom div | AlertCard (wraps PremiumCard) | PremiumCard variants, dot indicator, tap handler |
| Stat metric tiles | Custom div | StatTile (wraps PremiumCard) | --stat-color token, tap routing, consistent sizing |
| Shift request display | Custom card | PremiumCard info + FieldButton pair | All styles already defined |
| Approval bottom sheet | Custom modal | Reuse field-tab-sheet CSS classes | Same pattern as PortalTabBar More sheet — no new CSS needed |
| Crew cert summary | Custom card | PremiumCard info variant | Consistent with D-11 and existing premium-card-info CSS |
| Status indicators | Custom span | StatusBadge | Semantic color mapping already handles approved/pending/denied/expiring |
| Loading skeletons | Custom div | Skeleton from LoadingSpinner barrel export | Already imported in DriverView (line 5) |
| Signature pad | Inline function (lines 18-64) | FieldSignaturePad from barrel | Shared component reads theme color — no hardcoded hex |

**Key insight:** This phase is almost entirely component wiring and structural restructure. The design system, components, and data tables all exist. Every hour spent building a custom solution for any item in this table is a regression from Phase 7's investment.

---

## Common Pitfalls

### Pitfall 1: State key mismatch between old tabDefs and new PortalTabBar

**What goes wrong:** The existing ForemanView tabDefs use `tab.key` to set/read `foremanTab` state (`setForemanTab(tab.key)`, `foremanTab === tab.key`). PortalTabBar reads `tab.id` for `activeTab` comparison and emits `tab.id` via `onTabChange`. If the new tab array uses `key` instead of `id`, all active state and `{foremanTab === "x"}` conditional renders will break.

**How to avoid:** When building `foremanPortalTabs`, use the `id` field — not `key`. Ensure all `{foremanTab === "clock"}`, `{foremanTab === "dashboard"}`, etc. conditional renders use the matching `id` string. The tab ID values themselves can stay the same as the old tab keys (clock, dashboard, team, etc.).

**Warning signs:** All tab content renders as blank / active highlight never appears.

### Pitfall 2: foreman clock state — ForemanView has its own clockEntry state, not the shared timeEntries

**What goes wrong:** The Foreman clock-in state is `clockEntry` (local state, `{clockIn, lat, lng, projectId}`), not a `timeEntries` entry. The Dashboard clock hero needs to derive `isForemanClockedIn` from `clockEntry !== null`, and the duration from `new Date() - new Date(clockEntry?.clockIn)`. Don't query `timeEntries` for the foreman's own clock status.

**How to avoid:** Re-use `clockEntry` state that already exists in ForemanView. Wire `isForemanClockedIn = clockEntry !== null` and compute elapsed time from `clockEntry.clockIn`.

**Warning signs:** Clock hero always shows OFF CLOCK even when foreman is clocked in.

### Pitfall 3: ForemanView project guard — tabs only render when `selectedProject` is truthy

**What goes wrong:** The existing ForemanView wraps ALL tab content in `{selectedProject && foremanTab !== "settings" && (...)}` (line 882). The new Dashboard tab with the clock hero and KPI tiles lives inside this guard. The clock hero shows "No projects assigned" rather than rendering.

**How to avoid:** Keep the new Dashboard tab render inside the `selectedProject &&` guard. Add the EmptyState for no project at the top of the Dashboard render block (or rely on the existing "No projects assigned" empty state at line 780). Don't move the tab renders outside this guard.

**Warning signs:** Dashboard tab appears blank when no project is selected; or the "No projects assigned" message disappears.

### Pitfall 4: Driver driverAlerts — must source from real data or remain empty (no fake data)

**What goes wrong:** Driver alerts (DRVR-06) need a data source. The app does not have a dedicated alerts table for driver-specific events. Inventing a mock alerts array bypasses the Supabase-first approach and creates tech debt.

**How to avoid:** Derive driver alerts from existing materialRequests state (status changes on their deliveries) and optionally from Supabase notifications table when Phase 10 arrives. For Phase 9, build the alert derivation as a `useMemo` from `materialRequests` filtered to the driver's ID and recent status changes. The alert feed will be sparse but correct. If no real alerts exist, show EmptyState — do not fabricate data.

**Warning signs:** Hard-coded alert objects in the component source.

### Pitfall 5: CSS bottom padding for PortalTabBar clearance in Foreman

**What goes wrong:** ForemanView currently uses `employee-body` as its scrolling container. With PortalTabBar added (56px fixed at bottom), tab content will be obscured by the bar. Employee portal uses `emp-content-pad` class for this. ForemanView does not.

**How to avoid:** Add `emp-content-pad` (or `padding-bottom: calc(56px + var(--space-12) + env(safe-area-inset-bottom))`) to the ForemanView `employee-body` container, or add it to the tab content `emp-content` wrappers. Check how EmployeeView handles this — it uses `className="employee-body emp-content-pad"` (line 925).

**Warning signs:** Content at the bottom of any tab is hidden behind the tab bar.

### Pitfall 6: shift_requests query — must join with available_shifts and users tables

**What goes wrong:** `shift_requests` has `employee_id` and `shift_id` foreign keys. To display "Employee Name — SHIFT REQUEST — Date Range", you need the employee name (from users/employees) and the shift date/time (from available_shifts). A bare `shift_requests` query only gives you IDs.

**How to avoid:** Use Supabase's `.select('*, available_shifts(*), users!employee_id(*)')` join syntax to get all related data in one query. Or join client-side using the existing `employees` prop array.

**How the data reaches ForemanView:** `employees` array is passed as `app.employees`. Match `shift_requests.employee_id` against `employees` to get the name without a second query.

### Pitfall 7: PortalHeader projectSelector prop — pass the JSX element, not a string

**What goes wrong:** PortalHeader renders `{projectSelector}` as a React node inside its sub-strip div. Passing a string (the project name) rather than the `<select>` JSX element will render as text, not a dropdown.

**How to avoid:** Build the projectSelector JSX before the return statement and pass it as a prop:
```jsx
const projectSelectorEl = myProjects.length > 1 ? (
  <select className="foreman-project-select" value={selectedProjectId || ""} onChange={...}>
    {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
) : null;

// In return:
<PortalHeader variant="foreman" projectSelector={projectSelectorEl} t={t} network={network} />
```

---

## Code Examples

### Supabase Query — Pending Shift Requests for Foreman's Crew

```javascript
// Source: migration_phase7_scheduling.sql RLS policy + Supabase direct client pattern
// RLS allows foremen to SELECT all shift_requests (get_user_role() IN ('foreman', ...))

const fetchPendingRequests = async (crewEmployeeIds) => {
  const { data, error } = await supabase
    .from('shift_requests')
    .select('*, available_shifts(date, time_start, time_end, project_id)')
    .eq('status', 'pending')
    .in('employee_id', crewEmployeeIds)
    .order('created_at', { ascending: false });

  if (error) console.error('shift_requests fetch', error);
  return data || [];
};
```

### Supabase Query — Foreman Crew Certifications

```javascript
// Source: migration_phase7_scheduling.sql certifications extension
// certifications table: employee_id, cert_name, expiry_date, issuing_org, cert_category, status

const fetchCrewCerts = async (crewEmployeeIds) => {
  const { data, error } = await supabase
    .from('certifications')
    .select('employee_id, cert_name, expiry_date, issuing_org, status')
    .in('employee_id', crewEmployeeIds);

  if (error) console.error('certifications fetch', error);
  return data || [];
};
```

### Supabase Mutation — Approve or Deny Request

```javascript
// Source: migration_phase7_scheduling.sql shift_requests RLS update policy
// Foremen can UPDATE status + review_notes

const handleApprove = async (requestId, comment) => {
  const { error } = await supabase
    .from('shift_requests')
    .update({
      status: 'approved',
      reviewed_by: activeForeman.id,
      review_notes: comment || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (!error) {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    show(t("Request approved"), "ok");
  }
};
```

### PortalHeader — Foreman Header with Project Selector

```jsx
// Source: PortalHeader.jsx prop contract (verified from source)
// projectSelector renders in sub-strip; settingsAction renders in right slot

<PortalHeader
  variant="foreman"
  userName={`${activeForeman.name} · ${t("Foreman Portal")}`}
  projectSelector={projectSelectorEl}
  settingsAction={
    <button className="settings-gear" onClick={() => setForemanTab("settings")} title={t("Settings")}>
      &#9881;
    </button>
  }
  t={t}
  network={network}
/>
```

### Greeting Helper — Driver Home

```javascript
// Greeting derived from current hour — no library needed
const getGreeting = (lang) => {
  const hour = new Date().getHours();
  if (hour < 12) return lang === 'es' ? `Buenos días, ` : `Good Morning, `;
  return lang === 'es' ? `Buenas tardes, ` : `Good Afternoon, `;
};
const firstName = activeDriver?.name?.split(" ")[0] || "";
const greeting = getGreeting(lang) + firstName;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline header markup in ForemanView | PortalHeader shared component | Phase 7 (built), Phase 9 (wired) | Theme-aware, eagle logo, sub-strip, network banner |
| Horizontal .emp-tabs scroll strip | PortalTabBar bottom nav with More sheet | Phase 7 (built), Phase 9 (wired to Foreman) | Standard mobile UX; already proven in Phase 8 Employee |
| FieldCard on route stops | PremiumCard (hero for active, info for queued) | Phase 7 (built), Phase 9 (wired to Driver) | Premium Construction visual language |
| No Home tab in Driver | Home tab as default landing | Phase 9 | Daily summary + alerts on open |
| Clock as primary Foreman tab | Clock hero on Dashboard | Phase 9 (D-08) | Reduces tab count; clock status always visible on landing |
| Inline FieldSignaturePad in ForemanView (hardcoded hex) | Shared FieldSignaturePad (theme-aware) | Phase 2 (built), Phase 9 (wired) | COMP-10 compliance; no hardcoded `#1e2d3b` |

**Deprecated/outdated:**
- `emp-tabs` horizontal strip class: Replaced by PortalTabBar in all portals after Phase 9. Do not add new tabs using the old strip pattern.
- `driver-kpi-grid` / `driver-kpi-tile` classes: The old KPI grid in DriverView route tab used custom classes. Phase 9 replaces these with StatTile components in the new Home tab. The route tab KPI bar becomes part of the new Home tab, not duplicated.

---

## Translations Gap Analysis

Phase 9 requires approximately 50 new translation keys. The following keys already exist in translations.js and do NOT need to be added:

Already present: `"Clock"`, `"Materials"`, `"Settings"`, `"Completed"`, `"Dashboard"` (likely), `"Denied"` / `"Deny"`, `"Approved"`, `"Cancel"`, `"Logout"`, `"Sign In"`, `"Offline"`, `"No projects assigned"`, `"Certifications"`, `"Expired"`, `"Expiring Soon"`, `"Back"`.

New keys required (from UI-SPEC copywriting contract):

**Driver:**
`"Home"`, `"Good Morning, {name}"` (or greeting key), `"Good Afternoon, {name}"`, `"STOPS TODAY"`, `"PENDING"`, `"DELIVERED"`, `"MILES"`, `"ALERTS"`, `"View All"`, `"No deliveries scheduled"`, `"Check back when your route is assigned"`, `"Route is clear"`, `"All deliveries complete for today"`, `"No deliveries yet"`, `"Your completed deliveries will appear here"`

**Foreman:**
`"Team"`, `"Hours"`, `"ON CLOCK"`, `"OFF CLOCK"`, `"TAP TO CLOCK IN/OUT"`, `"BUDGET"`, `"CREW"`, `"PENDING REQUESTS"`, `"SHIFT REQUEST"`, `"TIME OFF"`, `"Approve Request"`, `"Deny Request"`, `"Add comment (optional)"`, `"Approve Request"` (sheet title), `"Deny Request"` (sheet title), `"Confirm Approval"`, `"Confirm Denial"`, `"Go Back"`, `"No pending requests"`, `"Your crew is all set"`, `"CREW CERTIFICATIONS"`, `"All"`, `"Expiring"`, `"{n} active"`, `"{n} expiring"`, `"{n} expired"`, `"Your crew certs are up to date"`, `"No expired credentials"`, `"No projects assigned"` (already exists), `"Foreman Portal"`

Keys that need care because partial matches exist: `"Completed"` exists for Driver tabs but not as a tab label in the new structure — verify `"Completed"` maps correctly.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 9 is pure UI component wiring with Supabase client-side queries. No external tools, CLIs, or services beyond the already-running Supabase project. No new packages to install.

---

## Validation Architecture

No automated test infrastructure detected for JSX integration tests. The project has Vitest configured (Phase 2 Plan 01 set it up) but tests are for component props, not portal integration flows.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (configured in Phase 2) |
| Config file | vitest.config.js (or vite.config.js with test key) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| DRVR-05 | Driver route cards render PremiumCard info variant | manual | Visual verification in browser |
| DRVR-06 | Driver Home alerts feed renders AlertCard items | manual | Check with mock materialRequests data |
| FSCH-02 | Pending shift requests appear with Approve/Deny buttons | manual | Requires Supabase data in shift_requests |
| FSCH-03 | Bottom sheet opens on Approve/Deny tap, comment submits | manual | Interactive test in browser |
| FSCH-04 | Dashboard alerts feed shows pending request count | manual | Derived from pendingRequests.length |
| CRED-04 | Crew cert dashboard shows filter chips and cert summaries | manual | Requires certifications data in Supabase |

### Phase Gate
Manual verification: log in as a foreman, open each primary tab, verify visual and interaction contracts match the UI-SPEC. Log in as a driver, verify Home tab is default landing with stat tiles and alert feed.

---

## Open Questions

1. **ForemanView clockEntry — does it persist to Supabase or localStorage only?**
   - What we know: `clockEntry` state is local React state initialized to null. The existing clock tab saves time entries to `timeEntries` (app-level state), but `clockEntry` itself appears to be ephemeral for the session.
   - What's unclear: If the foreman closes and reopens the app, is `clockEntry` restored? If not, the Dashboard clock hero will always show OFF CLOCK on page reload.
   - Recommendation: Check localStorage for `ebc_foremanClock` or similar. If not persisted, add localStorage persist in the same pattern as `ebc_teamClocks`. This is discoverable in the full ForemanView source between lines 150-680 (state declarations).

2. **Driver alerts data source — what events constitute a driver alert?**
   - What we know: DRVR-06 requires an alerts feed with "schedule changes, delivery updates." The app has `materialRequests` state. There is no dedicated driver notifications table until Phase 10.
   - What's unclear: What specific materialRequest status changes should trigger alerts? Is a route being assigned (status `approved` → `assigned`) an alert? A delivery date change?
   - Recommendation: For Phase 9, derive alerts from `materialRequests.filter(r => r.driverId === activeDriver.id)` and surface the 3 most recently updated items. This is minimal but correct. Document this as a Phase 10 enhancement target.

3. **Foreman network status — does useNetworkStatus need to be imported?**
   - What we know: ForemanView does not currently import `useNetworkStatus`. PortalHeader accepts a `network` prop and renders the offline banner automatically.
   - What's unclear: Not a gap — just needs the import added. Confirmed: add `import { useNetworkStatus } from "../hooks/useNetworkStatus";` alongside the field barrel import.
   - Recommendation: Add it. Takes 2 lines. Foreman portal will show the offline banner consistently with Driver and Employee portals.

---

## Sources

### Primary (HIGH confidence)
- `src/tabs/DriverView.jsx` — full source read, lines 1-654. Current tab structure, PortalTabBar usage, driverTabDefs, state management.
- `src/tabs/ForemanView.jsx` — source read, lines 1-150, 680-800, 840-880, 3570-3639. Inline FieldSignaturePad, tabDefs, inline header, tab strip, settings tab, end of file.
- `src/tabs/EmployeeView.jsx` — source read, lines 1-100, 100-200, 580-670, 665-800, 900-980. PortalTabBar wiring pattern, HomeTab pattern, tab definitions, login screen.
- `src/components/field/index.js` — barrel exports, all components confirmed present.
- `src/components/field/PremiumCard.jsx` — full source, API contract confirmed.
- `src/components/field/PortalTabBar.jsx` — full source, `tabs[].id` field confirmed, maxPrimary behavior confirmed.
- `src/components/field/PortalHeader.jsx` — full source, `projectSelector` prop as React node confirmed.
- `src/components/field/AlertCard.jsx` — full source.
- `src/components/field/ShiftCard.jsx` — full source.
- `src/components/field/CredentialCard.jsx` — full source.
- `src/components/field/StatTile.jsx` — full source, `--stat-color` CSS custom prop confirmed.
- `src/styles.js` — lines 1-80, 302-397. premium-card-*, field-tab-*, stat-tile, alert-card, shift-card, credential-card CSS classes all confirmed present.
- `supabase/migration_phase7_scheduling.sql` — full source. shift_requests schema, RLS policies, certifications extension confirmed.
- `src/data/translations.js` — lines 1-60, 200-280. Existing keys confirmed.
- `.planning/phases/09-driver-foreman-portal-updates/09-CONTEXT.md` — all decisions.
- `.planning/phases/09-driver-foreman-portal-updates/09-UI-SPEC.md` — full source. Layout contracts, copywriting, component inventory.

### Secondary (MEDIUM confidence)
- `src/data/constants.js` — lines 1-60. EBC theme vars, THEMES structure confirmed. Tab definitions not stored here for Foreman (inline in ForemanView).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified by reading source files
- Architecture patterns: HIGH — derived from actual source code, not assumptions
- Pitfalls: HIGH — derived from reading actual implementation details (line numbers cited)
- Translations: MEDIUM — translation file read partially (lines 1-60, 200-280); full file not read, some keys may already exist

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable codebase; 30-day window)
