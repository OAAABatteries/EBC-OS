# Phase 8: Employee Portal Overhaul - Research

**Researched:** 2026-04-04
**Domain:** React portal UI — home dashboard, schedule with shift/time-off workflows, credential wallet, drawings access
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Primary bottom bar tabs: Home, Clock, Schedule, Materials, More. Settings moves to More overflow.
- **D-02:** More overflow contains: Credentials, Drawings, Time Log, JSA, Change Orders, RFIs, Settings.
- **D-03:** Home is the default landing tab (replaces Clock as first tab). Clock stays as a primary tab.
- **D-04:** PortalTabBar maxPrimary stays at 4 or bumps to 5 to fit Home + Clock + Schedule + Materials + More.
- **D-05:** Section order top to bottom on Home: Clock status hero → 3 stat tiles row → Active project card → Alerts feed.
- **D-06:** Clock hero is display-only — shows ON/OFF CLOCK status and time since last punch. Tap navigates to Clock tab. No punch button on Home.
- **D-07:** Stat tiles: Hours (this week), Tasks (active count), Pending (requests count).
- **D-08:** Alerts feed shows max 3 items (newest first) with "View All" link. Types: credential warnings, material approvals, schedule changes.
- **D-09:** Home auto-refreshes clock status and stats when returning from Clock tab (HOME-06).
- **D-10:** Week strip: swipeable 7-day horizontal row with today highlighted. Swipe left/right for past/future weeks. Tap a day to show that day's shifts.
- **D-11:** Month view and list view toggling deferred to Phase 10.
- **D-12:** Time-off request via bottom sheet: date range picker, reason dropdown, notes field, Submit button.
- **D-14:** Schedule shows cached last-fetched data when offline with "Last updated" timestamp (SCHED-07).
- **D-15:** Flat credential list sorted by expiry urgency — expired/expiring surface at top with red/amber badges, active below.
- **D-16:** Add credential via bottom sheet: cert type dropdown, issue date, expiry date, issuing org, optional photo capture.
- **D-17:** Expiry alerts at 30/14/7 day thresholds, surface as AlertCards in Home alerts feed.
- **D-18:** Shift eligibility naturally enforces cert maintenance.
- Home is the default landing tab (NOT flexible)
- Clock stays as a primary tab (NOT flexible)
- Settings moves to More overflow (NOT flexible)
- Clock hero on Home is display-only, no punch button (NOT flexible)
- Bottom sheets for time-off and add-credential, not full pages (NOT flexible)
- Week strip for schedule, not month view in Phase 8 (NOT flexible)

### Claude's Discretion

- Available shifts section placement (below shifts vs sub-tab)
- PortalTabBar maxPrimary count (4 vs 5)
- Home alert card interaction patterns
- Schedule offline indicator styling
- Bottom sheet animation and transition patterns
- Whether stat tile tap navigation uses route change or tab switch

### Deferred Ideas (OUT OF SCOPE)

- Schedule view toggle (week/month/list): Deferred to Phase 10
- Full-screen map on Clock tab: Deferred to Phase 10
- Credential compliance system (blocking, foreman notifications, cert requirement matrices): Future milestone
- Cert-based shift eligibility blocking: Future milestone
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-01 | New Home tab is default landing with clock status hero, stat tiles, alerts feed | Home tab component structure + tab order change in portalTabs array |
| HOME-02 | Stat tiles (Hours/Tasks/Pending) navigate to their respective detail views on tap | StatTile onTap prop already accepts handler; tab switch via setEmpTab |
| HOME-03 | Active project card shows current assignment with trade tags, tappable to project detail | PremiumCard Hero variant; derive assigned project from teamSchedule + mySchedule |
| HOME-04 | Alerts feed shows credential warnings, material approvals, schedule changes (max 3 + View All) | AlertCard component ready; derive alerts from certifications expiry calc + materialRequests status |
| HOME-05 | Each alert navigates to source tab on tap | AlertCard onTap triggers setEmpTab to credentials/materials/schedule |
| HOME-06 | Home auto-refreshes clock status and stats when returning from Clock tab | useEffect dep on empTab change — detect empTab === "home" after prior "clock" |
| SCHED-01 | Week strip: 7 days with today highlighted and shift dot indicators | New CSS classes needed; horizontal scroll container; state for selected week offset |
| SCHED-02 | Shift cards display time range, project, location, status badge | ShiftCard component fully built and ready to consume |
| SCHED-03 | Available shifts section with "Request" action | ShiftCard isAvailable prop + onPickUp handler; query available_shifts table |
| SCHED-04 | Shift pickup requires foreman approval (pending flow) | Insert to shift_requests with status='pending'; RLS already set |
| SCHED-05 | Time-off request via bottom sheet (date range, reason, notes, submit) | Bottom sheet pattern from PortalTabBar; FieldInput/FieldSelect components ready |
| SCHED-06 | Schedule shows time-off inline: Requested/Approved/Denied | Status badge on day cell; query time_off_requests (new table needed — see Data Model) |
| SCHED-07 | Schedule cached when offline with "Last updated" timestamp | localStorage cache of last fetch; useNetworkStatus hook already exists |
| CRED-01 | Credential wallet shows active/expiring/expired certs | CredentialCard ready; query certifications table filtered by employee |
| CRED-02 | Add credential flow (type, issue date, expiry, org, optional photo) | Bottom sheet pattern; photo capture via file input + Supabase storage upload |
| CRED-03 | Expiry alerts at 30/14/7 days surface in Home feed | Date-diff calculation in alert derivation logic |
| PLAN-01 | Employee portal has Drawings tab in More overflow (readOnly, filtered to assigned project) | DrawingsTab component ready with readOnly prop; wire projectFilter to assigned project ID |
</phase_requirements>

---

## Summary

Phase 8 transforms EmployeeView.jsx from a time-clock-centric portal into a proactive dashboard. All required display components (StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab) were built in Phase 7 and are ready for consumption. The Supabase schema (available_shifts, shift_requests, certifications extension) is in place. Phase 8 is primarily a consumer phase — wiring existing components to real data, restructuring the tab layout, and building three new interaction surfaces: the Home dashboard, the enhanced Schedule tab, and the Credential wallet.

The single largest structural change is the tab order: `empTab` currently defaults to `"clock"` and `portalTabs` lists Clock first. Phase 8 adds a new `"home"` tab, places it first in the array, and changes the `useState` default. This cascades into every `empTab === "..."` conditional in the 1,721-line file, which must be read carefully before editing.

The two new Supabase data flows — shift data and credential data — follow the direct-client-query pattern established by DrawingsTab. Each tab manages its own async state with loading/error/empty using AsyncState or manual state. The time-off workflow requires a new `time_off_requests` Supabase table (not yet created); this is the only schema gap for Phase 8.

**Primary recommendation:** Restructure the plan into five discrete tasks: (1) tab skeleton refactor + Home static layout, (2) Home data wiring, (3) Schedule tab with week strip + shift data, (4) Credential wallet + add-credential sheet, (5) DrawingsTab wiring + translation gap closure. Each task ends with a passing build.

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.4 | UI framework | Project standard |
| @supabase/supabase-js | ^2.99.1 | Direct DB queries | Project standard; used in DrawingsTab, ForemanView |
| lucide-react | ^0.577.0 | Icons | Project standard |
| src/components/field | Phase 7 | All display components | Built and verified in Phase 7 |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useNetworkStatus hook | project | Online/offline detection | SCHED-07 offline cache |
| useDrawingCache hook | project | PDF blob caching | DrawingsTab already uses it |
| T (translations) | project | i18n EN/ES | All new UI strings |

### No New Installs Needed

Phase 8 requires zero new npm dependencies. Every library needed is already in the project.

**Version verification:** Not applicable — no new packages.

---

## Architecture Patterns

### Recommended File Targets

```
src/
├── tabs/
│   └── EmployeeView.jsx          # Primary file — tab skeleton + all tab renders
├── components/field/
│   └── index.js                  # No changes needed
├── data/
│   ├── translations.js           # Phase 8 EN/ES strings (~40+ keys)
│   └── constants.js              # No changes expected
└── supabase/
    └── migration_phase8_timeoff.sql   # New: time_off_requests table
```

### Pattern 1: Tab Skeleton Restructure

**What:** Change `empTab` default from `"clock"` to `"home"`. Add `"home"` as first entry in `portalTabs`. Add `"credentials"` and `"drawings"` to overflow.

**Current portalTabs:**
```jsx
// CURRENT (line 612-621 in EmployeeView.jsx)
const portalTabs = [
  { id: "clock", label: "Clock", icon: Clock, badge: isClockedIn },
  { id: "schedule", label: "Schedule", icon: Calendar, badge: false },
  { id: "materials", label: "Materials", icon: Package, badge: ... },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "log", label: "Time Log", icon: ClipboardList },
  { id: "jsa", label: "JSA", icon: Shield },
  { id: "cos", label: "Change Orders", icon: FileText },
  { id: "rfis", label: "RFIs", icon: FileText },
];
```

**Target portalTabs (D-01, D-02, D-03):**
```jsx
// TARGET — Phase 8
// maxPrimary={5} to fit Home + Clock + Schedule + Materials + More
const portalTabs = [
  { id: "home",        label: "Home",         icon: Home,           badge: false },
  { id: "clock",       label: "Clock",        icon: Clock,          badge: isClockedIn },
  { id: "schedule",    label: "Schedule",     icon: Calendar,       badge: false },
  { id: "materials",   label: "Materials",    icon: Package,        badge: myMatRequests?.some(r => r.status === "requested") },
  // — More overflow below —
  { id: "credentials", label: "Credentials",  icon: Shield,         badge: credBadge },
  { id: "drawings",    label: "Drawings",     icon: FileText,       badge: false },
  { id: "log",         label: "Time Log",     icon: ClipboardList,  badge: false },
  { id: "jsa",         label: "JSA",          icon: ShieldCheck,    badge: false },
  { id: "cos",         label: "Change Orders", icon: FileText,      badge: false },
  { id: "rfis",        label: "RFIs",         icon: FileText,       badge: false },
  { id: "settings",    label: "Settings",     icon: Settings,       badge: false },
];
```

Also change: `useState("clock")` → `useState("home")` (line 89).
Also change: back button in Settings from `setEmpTab("clock")` → `setEmpTab("home")` (line 1634).
Also change: `settingsAction` handlers throughout to use `setEmpTab("settings")` (already correct).

**PortalTabBar** accepts `maxPrimary` prop — set to `5` to show Home, Clock, Schedule, Materials, More as primary slots with all remaining tabs in the sheet.

### Pattern 2: Home Dashboard Layout

**What:** New `empTab === "home"` block following the D-05 section order.

```jsx
{empTab === "home" && (
  <div className="emp-content">
    {/* 1. Clock status hero */}
    <PremiumCard variant="hero" className="home-clock-hero" onClick={() => setEmpTab("clock")}>
      <div className="home-clock-status">{isClockedIn ? t("ON CLOCK") : t("OFF CLOCK")}</div>
      <div className="home-clock-elapsed">{isClockedIn ? elapsed : lastPunchLabel}</div>
    </PremiumCard>

    {/* 2. Stat tiles row */}
    <div className="home-stat-row">
      <StatTile label="Hours" value={weekTotal.toFixed(1)} onTap={() => setEmpTab("log")} t={t} />
      <StatTile label="Tasks" value={activeTaskCount} onTap={() => setEmpTab("schedule")} t={t} />
      <StatTile label="Pending" value={pendingCount} onTap={() => setEmpTab("materials")} t={t} />
    </div>

    {/* 3. Active project card */}
    {assignedProject && (
      <PremiumCard variant="info" className="home-project-card" onClick={() => setSelectedInfoProject(assignedProject.id)}>
        ...
      </PremiumCard>
    )}

    {/* 4. Alerts feed — max 3 */}
    <div className="home-alerts-section">
      <div className="home-alerts-header">
        <span className="section-label">{t("ALERTS")}</span>
        {homeAlerts.length > 3 && <button onClick={() => {/* show all */}}>{t("View All")}</button>}
      </div>
      {homeAlerts.slice(0, 3).map(alert => (
        <AlertCard key={alert.id} type={alert.type} message={alert.message}
          timestamp={alert.timestamp} onTap={() => setEmpTab(alert.sourceTab)} t={t} />
      ))}
    </div>
  </div>
)}
```

### Pattern 3: Home Auto-Refresh (HOME-06)

**What:** Detect when empTab changes TO "home" after being on "clock" and refresh clock state.

```jsx
// Track previous tab to detect "returning from Clock"
const prevTabRef = useRef(empTab);
useEffect(() => {
  if (empTab === "home" && prevTabRef.current === "clock") {
    // Force re-derive: activeEntry is already live via useMemo(timeEntries)
    // Stats re-derive automatically since weekEntries/weekTotal are memos
    // If Supabase data needed, trigger refetch here
  }
  prevTabRef.current = empTab;
}, [empTab]);
```

Note: `activeEntry`, `weekTotal`, `weekEntries` are all `useMemo` derived from `timeEntries` prop — they are already reactive. The only case where explicit refresh is needed is if shift/credential data is fetched on demand rather than on mount.

### Pattern 4: Supabase Query Pattern (established by DrawingsTab)

```jsx
// Source: DrawingsTab.jsx pattern — replicate for shifts and credentials
const [shifts, setShifts] = useState([]);
const [shiftsLoading, setShiftsLoading] = useState(false);
const [shiftsError, setShiftsError] = useState(null);
const [lastFetchedAt, setLastFetchedAt] = useState(null); // for SCHED-07 offline indicator

const loadShifts = useCallback(async () => {
  setShiftsLoading(true);
  setShiftsError(null);
  try {
    const { data, error } = await supabase
      .from('available_shifts')
      .select('*, projects(name, address)')
      .eq('status', 'open')
      .gte('date', toDateStr(weekStart))
      .lte('date', toDateStr(weekEnd));
    if (error) throw error;
    setShifts(data || []);
    setLastFetchedAt(new Date());
    localStorage.setItem('ebc_scheduleCache', JSON.stringify({ shifts: data, at: new Date().toISOString() }));
  } catch (err) {
    setShiftsError(err.message);
    // Fall back to localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem('ebc_scheduleCache') || '{}');
      if (cached.shifts) { setShifts(cached.shifts); setLastFetchedAt(new Date(cached.at)); }
    } catch {}
  } finally {
    setShiftsLoading(false);
  }
}, [weekStart, weekEnd]);
```

### Pattern 5: Bottom Sheet for Time-Off and Add-Credential

**What:** Reuse the existing `field-tab-sheet` CSS pattern from PortalTabBar — but as a local state boolean, not tied to PortalTabBar internals.

```jsx
const [showTimeOffSheet, setShowTimeOffSheet] = useState(false);

// Render pattern (follows field-tab-sheet CSS classes already in styles.js)
{showTimeOffSheet && (
  <div className="field-tab-sheet-overlay" onClick={() => setShowTimeOffSheet(false)} />
)}
<div className={`field-tab-sheet ${showTimeOffSheet ? 'open' : ''}`}>
  <div className="sheet-content" style={{ padding: 'var(--space-4)' }}>
    <h3>{t("Request Time Off")}</h3>
    <FieldInput type="date" label={t("Start Date")} value={toDate} onChange={...} t={t} />
    <FieldInput type="date" label={t("End Date")} value={fromDate} onChange={...} t={t} />
    <FieldSelect label={t("Reason")} value={reason} onChange={...} options={REASON_OPTIONS} t={t} />
    <FieldInput label={t("Notes")} value={notes} onChange={...} t={t} />
    <FieldButton variant="primary" onClick={handleSubmitTimeOff} t={t}>{t("Submit Request")}</FieldButton>
  </div>
</div>
```

The `field-tab-sheet` CSS class already handles: fixed position, bottom anchor, glass backdrop, transform animation (translateY(0) when `.open`), z-index 151. No new CSS needed for the sheet container itself.

### Pattern 6: Week Strip (SCHED-01)

**What:** 7-day horizontal scrollable row with swipe gesture detection. Need new CSS classes.

```jsx
const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
const [selectedDay, setSelectedDay] = useState(toDateStr(new Date()));

const weekDays = useMemo(() => {
  const start = getWeekStart(new Date());
  start.setDate(start.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}, [weekOffset]);
```

Week strip needs new CSS classes (does not exist in current styles.js). Minimum needed:
- `.week-strip` — horizontal flex row, overflow-x hidden, touch-action pan-x
- `.week-strip-day` — flex column, centered, min-width 44px
- `.week-strip-day--today` — accent color highlight
- `.week-strip-day--selected` — accent border or background
- `.week-strip-dot` — small indicator for shifts on that day

Swipe detection: use `onTouchStart` + `onTouchEnd` delta comparison on the week strip container. Threshold: 50px horizontal delta triggers week change. This is simpler and lighter than adding a library.

### Pattern 7: Credential Expiry Sort

```jsx
const sortedCredentials = useMemo(() => {
  const today = new Date();
  const msPerDay = 86400000;

  return [...credentials].sort((a, b) => {
    const daysA = a.expiryDate ? Math.ceil((new Date(a.expiryDate) - today) / msPerDay) : Infinity;
    const daysB = b.expiryDate ? Math.ceil((new Date(b.expiryDate) - today) / msPerDay) : Infinity;
    return daysA - daysB; // expired (negative) and expiring-soon float to top
  });
}, [credentials]);

function credStatus(expiryDate) {
  if (!expiryDate) return 'active';
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 7) return 'expiring'; // maps to red via StatusBadge
  if (days <= 30) return 'expiring'; // maps to amber
  return 'active';
}
```

### Pattern 8: Alert Derivation (HOME-04, CRED-03)

Alerts are derived in a `useMemo` that combines three sources into a unified array:

```jsx
const homeAlerts = useMemo(() => {
  const alerts = [];

  // Credential expiry alerts (CRED-03)
  credentials.forEach(cert => {
    const days = cert.expiryDate
      ? Math.ceil((new Date(cert.expiryDate) - new Date()) / 86400000)
      : null;
    if (days !== null && days <= 30) {
      alerts.push({
        id: `cred-${cert.id}`,
        type: days <= 0 ? 'error' : 'warning',
        message: days <= 0
          ? `${cert.cert_type} ${t("Expired")}`
          : `${cert.cert_type} — ${days} ${t("days until expiry")}`,
        timestamp: cert.expiryDate,
        sourceTab: 'credentials',
      });
    }
  });

  // Material approval alerts (HOME-04)
  myMatRequests.filter(r => r.status === 'approved').forEach(r => {
    alerts.push({
      id: `mat-${r.id}`,
      type: 'success',
      message: `${r.material} ${t("approved")}`,
      timestamp: r.approvedAt,
      sourceTab: 'materials',
    });
  });

  // Sort newest first
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}, [credentials, myMatRequests]);
```

### Anti-Patterns to Avoid

- **Do not add a punch button to the Home tab.** Clock hero is display-only (D-06 locked).
- **Do not create a full-page route for time-off or add-credential.** Both are bottom sheets (locked).
- **Do not hardcode hex colors.** Use design tokens exclusively (`var(--accent)`, `var(--red)`, `var(--amber-dim)`).
- **Do not use inline `style={{}}` in JSX.** All styling via CSS classes in styles.js.
- **Do not leave blank EmptyState components.** VIS-05 requires actionable button on every EmptyState.
- **Do not assume `certifications` table exists with prior data.** RLS limits employees to their own rows — queries must include `eq('employee_id', activeEmp.id)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab overflow/More menu | Custom overflow logic | `PortalTabBar` with `maxPrimary={5}` | Already built, handles sheet animation and active state |
| Card variants | Custom card markup | `PremiumCard` hero/info/alert | Phase 7 built exactly these variants with design token styles |
| Shift display | Custom shift row | `ShiftCard` component | Accepts all needed props (timeRange, project, location, status, isAvailable, onPickUp) |
| Credential row | Custom cert card | `CredentialCard` component | Accepts certName, issuedDate, expiryDate, issuingOrg, status, onTap |
| Alert items | Custom alert markup | `AlertCard` component | Accepts type, message, timestamp, onTap — already has color variants |
| Stat metric tiles | Custom stat boxes | `StatTile` component | Accepts label, value, color, onTap |
| Bottom sheet container | Modal/dialog element | Existing `field-tab-sheet` CSS + local boolean state | The CSS class already exists in styles.js and handles animation |
| Offline status | Custom banner | `useNetworkStatus` hook + existing pattern | Hook already used in EmployeeView at line 69 |
| PDF viewer | Custom renderer | `DrawingsTab` component | Self-contained, handles all offline/cache logic |
| Loading/error/empty states | Custom conditionals | `AsyncState` component or the manual pattern from DrawingsTab | Both patterns established; pick per complexity |

**Key insight:** Phase 7 was specifically built to produce these components for Phase 8 consumption. The planner should treat every new screen as an assembly task — fetch data, pass to components — not a build task.

---

## Data Model

### Tables Available (Phase 7 schema — confirmed in migration SQL)

**`available_shifts`** — foreman-posted open shifts
```
id, date(TEXT), time_start(TEXT), time_end(TEXT), project_id(UUID→projects),
foreman_id(UUID→users), trade(TEXT), overtime(BOOLEAN),
status('open'|'claimed'|'cancelled'), claimed_by(UUID→users),
created_at, updated_at
```
RLS: All authenticated users can SELECT; only foreman/owner/admin/pm can INSERT/UPDATE/DELETE.

**`shift_requests`** — employee shift pickup requests
```
id, employee_id(UUID→users), shift_id(UUID→available_shifts),
status('pending'|'approved'|'denied'),
reviewed_by(UUID→users), review_notes(TEXT),
created_at, updated_at
```
RLS: Employees read own rows; foremen read all. Employees INSERT for self. Both can UPDATE.

**`certifications`** (existing table + Phase 7 columns)
```
id, employee_id(?), cert_type(?), issue_date(?), expiry_date(?),
[Phase 7 additions] issuing_org(TEXT), photo_path(TEXT), cert_category(TEXT)
```
Note: The certifications table's base schema (pre-Phase 7) must be verified in actual Supabase. The migration only adds columns — the base columns (employee_id, cert_type, issue_date, expiry_date) are assumed to exist from prior phases.

### Schema Gap: `time_off_requests` Table Missing

SCHED-05 (time-off request flow) and SCHED-06 (inline status display) require a `time_off_requests` table that does NOT yet exist. Phase 8 must create it.

**Proposed schema:**
```sql
CREATE TABLE IF NOT EXISTS time_off_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  reason        TEXT DEFAULT '' CHECK (reason IN ('Personal', 'Medical', 'Family', 'Other', '')),
  notes         TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
-- Employees read/insert own rows; foremen read all; both can update status
```

This SQL must be delivered as `supabase/migration_phase8_timeoff.sql` and run before the schedule UI is tested.

### Supabase Query Patterns (from DrawingsTab — HIGH confidence)

```js
// Direct client import (no custom wrapper needed for simple selects)
import { supabase } from '../../lib/supabase'; // or relative path from EmployeeView

// Employee's certifications
const { data, error } = await supabase
  .from('certifications')
  .select('*')
  .eq('employee_id', activeEmp.id)
  .order('expiry_date', { ascending: true });

// Available shifts for a date range
const { data, error } = await supabase
  .from('available_shifts')
  .select('*, projects(name)')
  .eq('status', 'open')
  .gte('date', startDateStr)
  .lte('date', endDateStr);

// Insert time-off request
const { data, error } = await supabase
  .from('time_off_requests')
  .insert({ employee_id: activeEmp.id, start_date, end_date, reason, notes });

// Insert shift request
const { data, error } = await supabase
  .from('shift_requests')
  .insert({ employee_id: activeEmp.id, shift_id: shiftId });
```

### Offline Cache Pattern (SCHED-07)

```js
// Cache key per employee to avoid cross-user cache pollution
const CACHE_KEY = `ebc_scheduleCache_${activeEmp?.id}`;

// On successful fetch: write cache
localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: new Date().toISOString() }));

// On network failure: read cache and show "Last updated" timestamp
const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
if (cached) {
  setShifts(cached.data);
  setLastFetchedAt(new Date(cached.fetchedAt));
}
```

---

## Common Pitfalls

### Pitfall 1: Tab Default Not Changed in All Places

**What goes wrong:** `empTab` default is `"clock"` (line 89). Changing it to `"home"` will work for first render, but `handleLogout` at line 206 also calls `setEmpTab("clock")`. The settings back button at line 1634 also points to `"clock"`. Missing these causes jarring navigation after logout or from Settings.

**How to avoid:** Search for ALL `setEmpTab("clock")` calls before editing and update each one appropriately.

**Warning signs:** After logout, app lands on Clock tab instead of Home. Settings back button goes to Clock.

### Pitfall 2: PortalTabBar maxPrimary Mismatch

**What goes wrong:** `PortalTabBar` slices tabs at `maxPrimary` index. Currently `maxPrimary={4}`. With 5 primary tabs (Home, Clock, Schedule, Materials, More-button), it must be set to `5`. If left at 4, "Materials" gets pushed into overflow and the badge logic breaks.

**How to avoid:** Set `maxPrimary={5}` at the PortalTabBar render site (line 1716).

**Warning signs:** Materials tab appears in More overflow instead of primary bar.

### Pitfall 3: Bottom Sheet z-index Stacking

**What goes wrong:** `field-tab-sheet` is z-index 151. The overlay is z-index 150. The PortalTabBar's `field-tab-bar` is z-index ~100 (check styles.js). A local bottom sheet rendered inside `employee-body` will NOT stack correctly if position isn't `fixed`.

**How to avoid:** The time-off and add-credential sheets must be rendered at the TOP LEVEL of the `employee-app` div (alongside PortalTabBar), not inside the scrollable `employee-body`. This matches how PortalTabBar renders its sheet.

**Warning signs:** Sheet appears clipped behind the tab bar at the bottom.

### Pitfall 4: Supabase `supabase` Import Path in EmployeeView

**What goes wrong:** DrawingsTab imports from `'../../lib/supabase'`. EmployeeView.jsx is at `src/tabs/EmployeeView.jsx` so the path would be `'../lib/supabase'`. Using the wrong path causes a build error.

**How to avoid:** Verify the import path before adding Supabase calls to EmployeeView.jsx.

### Pitfall 5: certifications Base Schema Unknown

**What goes wrong:** Phase 7 migration only added 3 columns (issuing_org, photo_path, cert_category). The base certifications table columns (cert_type, employee_id, etc.) were never documented in any migration file reviewed. Querying `certifications` without knowing the full schema will cause null data.

**How to avoid:** Wave 0 task must include a Supabase schema verification query: `SELECT column_name FROM information_schema.columns WHERE table_name='certifications';` before writing the credential query.

**Warning signs:** Credential wallet renders empty even after adding test data.

### Pitfall 6: `elapsed` Used in Home Tab Without Guard

**What goes wrong:** `elapsed` at line 192-198 computes `now - new Date(activeEntry.clockIn)`. On the Home tab, if Home is the default and employee is not clocked in, `elapsed` is `""` (empty string — safe). But if the Home hero references `elapsed` directly without checking `isClockedIn`, it may show empty string instead of the intended "OFF CLOCK" label.

**How to avoid:** Always guard: `isClockedIn ? elapsed : lastPunchLabel` where `lastPunchLabel` derives from the most recent completed time entry.

### Pitfall 7: Missing Translation Keys Fail Silently

**What goes wrong:** The `t()` function in EmployeeView is `(key) => lang === "es" && T[key]?.es ? T[key].es : key`. If a key is not in translations.js, it returns the raw key string in both languages. This is not a runtime crash — but Spanish users see English raw key strings.

**How to avoid:** Phase 8 must add all new strings to translations.js in the same wave that introduces the UI that uses them. The Phase 7 DrawingsTab gap (12 missing strings) was caught at verification — Phase 8 should not repeat this.

---

## Code Examples

### Verified Pattern: Home tab wired to existing data

```jsx
// Source: EmployeeView.jsx existing useMemo patterns (lines 531-582)
// weekTotal and myMatRequests already computed — reuse directly
const pendingCount = myMatRequests.filter(r => r.status === "requested").length;
const activeTaskCount = myShifts.filter(s => s.status === "active").length; // from Supabase

// Clock hero display (D-06: display-only, no punch button)
<PremiumCard variant="hero" onClick={() => setEmpTab("clock")} role="button" tabIndex={0}>
  <div className="home-clock-status-label">
    {isClockedIn ? t("ON CLOCK") : t("OFF CLOCK")}
  </div>
  {isClockedIn && <div className="home-clock-elapsed">{elapsed}</div>}
  {!isClockedIn && lastPunch && (
    <div className="home-clock-last">{t("Last punch")}: {fmtTime(lastPunch.clockOut)}</div>
  )}
  <div className="home-clock-tap-hint text-sm text-muted">{t("Tap to clock in/out")}</div>
</PremiumCard>
```

### Verified Pattern: Week strip swipe detection

```jsx
// Lightweight swipe without external library
const touchStartX = useRef(null);

<div
  className="week-strip"
  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
  onTouchEnd={(e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      setWeekOffset(prev => prev + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  }}
>
  {weekDays.map((day) => (
    <button
      key={toDateStr(day)}
      className={`week-strip-day${toDateStr(day) === toDateStr(new Date()) ? ' week-strip-day--today' : ''}${selectedDay === toDateStr(day) ? ' week-strip-day--selected' : ''}`}
      onClick={() => setSelectedDay(toDateStr(day))}
    >
      <span className="week-strip-day-name">{day.toLocaleDateString(lang === "es" ? "es" : "en", { weekday: "short" })}</span>
      <span className="week-strip-day-num">{day.getDate()}</span>
      {dayHasShift(toDateStr(day)) && <span className="week-strip-dot" />}
    </button>
  ))}
</div>
```

### Verified Pattern: Shift request insert

```jsx
// Source: shift_requests RLS in migration_phase7_scheduling.sql (line 93)
// Employees can INSERT for themselves (auth.uid() = employee_id)
const handlePickUpShift = async (shiftId) => {
  try {
    const { error } = await supabase
      .from('shift_requests')
      .insert({ employee_id: activeEmp.id, shift_id: shiftId });
    if (error) throw error;
    show(t("Request submitted — awaiting foreman approval"), "ok");
    loadShifts(); // refresh
  } catch (err) {
    show(t("Could not submit your request. Try again."), "err");
  }
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `empTab` defaults to "clock" | Will default to "home" | Phase 8 | Home is first UX surface |
| 4 primary tabs | 5 primary tabs (maxPrimary=5) | Phase 8 | Home fits without crowding |
| Schedule = read-only week (Mon-Fri from teamSchedule) | Schedule = swipeable 7-day + Supabase shift data | Phase 8 | Full 7 days, live shift data |
| No credential visibility for employees | Credential wallet tab | Phase 8 | Expiry tracking in field |
| DrawingsTab only in ForemanView | DrawingsTab in Employee More overflow | Phase 8 | Field crew accesses plans |

**Deprecated/outdated:**
- `DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"]` and `DAY_LABELS_EN`: These support the old 5-day read-only schedule strip. The new week strip uses a date-based approach (7 days from week start). The old constants can be removed or left unused — they are not in the new Schedule render.

---

## Open Questions

1. **certifications base schema column names**
   - What we know: issuing_org, photo_path, cert_category added in Phase 7. Base table existed before.
   - What's unclear: Is it `cert_type` or `type`? Is employee FK `employee_id` or `user_id`?
   - Recommendation: Wave 0 task runs `SELECT column_name FROM information_schema.columns WHERE table_name='certifications'` and documents actual column names before the credential query is written.

2. **Photo capture for add-credential (CRED-02 optional)**
   - What we know: Supabase storage `photo_path` column exists. No file upload helper in supabase.js was found for this use case.
   - What's unclear: Is there a Supabase storage bucket for credential photos? Does `uploadFile` exist in supabase.js?
   - Recommendation: Check `src/lib/supabase.js` for existing upload function. If absent, add one. If no credential-photos bucket exists, the add-credential sheet ships with photo capture disabled until bucket is provisioned. The field is optional per D-16.

3. **"Tasks" stat tile definition (D-07)**
   - What we know: D-07 says "Tasks (active count)". The project has no dedicated tasks table.
   - What's unclear: Does "tasks" mean active shifts? Active material requests? Active JSAs?
   - Recommendation: "Tasks" = employee's active shifts today (from available_shifts/shift_requests). If zero active shifts, derive from mySchedule assignments. Document interpretation in plan so verifier knows what to check.

---

## Environment Availability

Phase 8 is purely code changes (React JSX + Supabase queries). No new CLI tools or external services beyond what is already running.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build | Yes | (inferred from npm working) | — |
| Vite | Build | Yes | confirmed (`built in 617ms`) | — |
| @supabase/supabase-js | Shift/cred queries | Yes | ^2.99.1 | — |
| Supabase project (remote) | Live data | Yes (assumed) | — | Cache fallback for SCHED-07 |
| time_off_requests table | SCHED-05, SCHED-06 | NO — does not exist yet | — | Must be created in Wave 0 |

**Missing dependencies with no fallback:**
- `time_off_requests` Supabase table — blocks SCHED-05 and SCHED-06. Must be created in Wave 0 migration before schedule UI is tested.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 + @testing-library/react ^16.3.2 + jsdom |
| Config file | None — must be created in Wave 0 |
| Quick run command | `npx vitest run src/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

No `vitest.config.js` exists. No test files exist in `src/` (only in `node_modules`). Wave 0 must create the config and at minimum one test file per requirement.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | Home tab renders clock hero, stat tiles, alerts feed | unit | `npx vitest run src/tests/home-tab.test.jsx -x` | No — Wave 0 |
| HOME-02 | StatTile onTap fires with correct tab target | unit | `npx vitest run src/tests/home-tab.test.jsx -x` | No — Wave 0 |
| HOME-03 | Active project card renders when project assigned | unit | `npx vitest run src/tests/home-tab.test.jsx -x` | No — Wave 0 |
| HOME-04 | Alerts derived from credentials expiry within 30 days | unit | `npx vitest run src/tests/alert-derivation.test.js -x` | No — Wave 0 |
| HOME-05 | Alert card onTap calls setEmpTab with correct tab | unit | `npx vitest run src/tests/home-tab.test.jsx -x` | No — Wave 0 |
| HOME-06 | empTab change to "home" from "clock" triggers refresh | unit | `npx vitest run src/tests/home-tab.test.jsx -x` | No — Wave 0 |
| SCHED-01 | Week strip renders 7 days, today highlighted | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| SCHED-02 | ShiftCard renders time range, status badge | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| SCHED-03 | Available shifts shown with Request button | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| SCHED-04 | Shift pickup inserts to shift_requests (mocked supabase) | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| SCHED-05 | Time-off sheet opens, form submits | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| SCHED-06 | Time-off status displays inline on day cell | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| SCHED-07 | Offline fallback shows cached data + timestamp | unit | `npx vitest run src/tests/schedule-tab.test.jsx -x` | No — Wave 0 |
| CRED-01 | Credential wallet sorts expired/expiring to top | unit | `npx vitest run src/tests/credential-wallet.test.jsx -x` | No — Wave 0 |
| CRED-02 | Add-credential sheet submits to certifications | unit | `npx vitest run src/tests/credential-wallet.test.jsx -x` | No — Wave 0 |
| CRED-03 | Expiry alert generated for cert within 30 days | unit | `npx vitest run src/tests/alert-derivation.test.js -x` | No — Wave 0 |
| PLAN-01 | DrawingsTab renders in More overflow with readOnly=true | unit | `npx vitest run src/tests/drawings-integration.test.jsx -x` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/tests/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose && npm run build`
- **Phase gate:** Full suite green + build clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.js` — framework config with jsdom environment and path aliases
- [ ] `src/tests/home-tab.test.jsx` — covers HOME-01 through HOME-06
- [ ] `src/tests/schedule-tab.test.jsx` — covers SCHED-01 through SCHED-07
- [ ] `src/tests/credential-wallet.test.jsx` — covers CRED-01, CRED-02, CRED-03
- [ ] `src/tests/alert-derivation.test.js` — covers HOME-04, CRED-03 alert logic (pure function, no DOM)
- [ ] `src/tests/drawings-integration.test.jsx` — covers PLAN-01
- [ ] `supabase/migration_phase8_timeoff.sql` — time_off_requests table (blocks SCHED-05, SCHED-06)

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 8 |
|-----------|-------------------|
| No inline styles (`style={{}}` forbidden) | All new CSS in styles.js as class strings |
| No hex literals | Use `var(--accent)`, `var(--red)`, `var(--amber)` etc. |
| Use typed interfaces for public APIs | JSDoc props on any new helper functions |
| Files under 500 lines | EmployeeView.jsx is 1,721 lines — Phase 8 ADDS content. Consider splitting large tab renders into small sub-components if file grows beyond 2,500 lines |
| CSS-in-JS via styles.js | All new classes in styles.js using design tokens |
| Translations for all strings | Every new t() call must have EN/ES in translations.js same wave |
| Build must pass after every commit | `npm run build` clean before PR |
| Run tests after code changes | `npx vitest run` after each task |

---

## Sources

### Primary (HIGH confidence)
- `src/tabs/EmployeeView.jsx` — read directly (lines 1-621, 870-1721)
- `src/components/field/PortalTabBar.jsx` — read directly
- `src/components/field/ShiftCard.jsx`, `CredentialCard.jsx`, `StatTile.jsx`, `AlertCard.jsx`, `PremiumCard.jsx`, `DrawingsTab.jsx` — read directly
- `supabase/migration_phase7_scheduling.sql` — read directly (complete schema)
- `src/styles.js` — grep-verified all relevant CSS classes
- `src/data/translations.js` — read directly (Phase 7 block lines 602-654)
- `.planning/phases/07-premium-foundation/07-VERIFICATION.md` — read directly (verified artifact state)
- `package.json` — read directly (vitest ^4.1.2, no test infrastructure exists)

### Secondary (MEDIUM confidence)
- `.planning/phases/08-employee-portal-overhaul/08-CONTEXT.md` — user decisions, phase decisions
- `.planning/REQUIREMENTS.md` — acceptance criteria for all 17 requirement IDs

### Tertiary (LOW confidence)
- certifications base schema (pre-Phase 7 columns) — not verified from migration files; column names are assumed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json and existing code
- Architecture patterns: HIGH — derived from direct code reading of Phase 7 components and EmployeeView.jsx
- Supabase schema: HIGH for available_shifts and shift_requests (migration SQL read); MEDIUM for certifications base columns (assumed, not verified)
- Pitfalls: HIGH — identified from direct code reading, not guesswork
- Test infrastructure: HIGH — confirmed absent, Wave 0 gaps explicit

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack — no fast-moving dependencies)
