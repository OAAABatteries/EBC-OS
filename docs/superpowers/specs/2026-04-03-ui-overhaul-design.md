# EBC-OS UI Overhaul: Premium Construction Design Spec

**Date:** 2026-04-03
**Status:** Draft — Awaiting review
**Scope:** Visual redesign + scheduling features + credential tracking across all 3 portals
**Default Theme:** EBC Brand (#0f1a24 + #ff7f21)
**Secondary Theme:** Midnight (#000000 + #ff9f0a)

---

## 1. Design Direction

**Premium Construction** — dark, authoritative, industrial. The app should feel like a precision instrument, not a SaaS dashboard.

### Design Principles

1. **Proactive, not passive** — The app tells the worker what's next. No empty states, no "check back later."
2. **Everything navigates** — Every number, stat, and alert is tappable and leads to its detail view.
3. **Brand-first** — EBC eagle logo in every header. Orange (#ff7f21) accent throughout. Unmistakably Eagles Brothers.
4. **Field-ready** — 44px+ tap targets, high contrast, readable in sunlight, works with gloves.
5. **Typography-driven hierarchy** — Bold numbers for data, uppercase labels for categories, subdued text for context.

### What Changes vs. What Stays

**Stays (do not touch):**
- All business logic, hooks, Supabase queries, offline sync
- useNetworkStatus, useAlertEngine, all custom hooks
- Data models, localStorage patterns, auth flow
- i18n infrastructure (t() function, translations.js pattern)
- tokens.css spacing/typography/transition tokens
- Theme switching mechanism in constants.js

**Changes:**
- Component visual appearance (FieldCard, FieldButton, PortalHeader, PortalTabBar, EmptyState)
- Page layouts within each portal view
- styles.js CSS rules (rewritten for new visual language)
- Tab structure in Employee and Driver portals (new tabs added)
- New components: HomeDashboard, ScheduleView, CredentialCard, AlertFeed, ShiftCard
- EBC Brand theme becomes default (constants.js `defaultTheme`)

---

## 2. Design System Updates

### 2.1 Color Token Refinements (EBC Brand Theme)

The EBC theme vars in constants.js already define the palette. No new color tokens needed — use existing vars:

| Role | Token | EBC Value | Usage |
|------|-------|-----------|-------|
| Page bg | --bg | #0f1a24 | App background |
| Card bg | --bg2 | #162231 | Card surfaces |
| Elevated bg | --bg3 | #1a2d3d | Hover states, inputs |
| Raised bg | --bg4 | #213547 | Active states |
| Accent | --amber / --accent | #ff7f21 | CTAs, active tabs, labels |
| Success | --green | #22c55e | Clocked in, approved, on-site |
| Warning | --yellow | #eab308 | Cert expiring, schedule change |
| Error | --red | #ef4444 | Denied, off-site, overdue |
| Primary text | --text | #f1f5f9 | Headers, data values |
| Secondary text | --text2 | #94a3b8 | Descriptions, project names |
| Tertiary text | --text3 | #64748b | Labels, timestamps |

### 2.2 Typography Hierarchy

Use existing tokens.css values. The hierarchy, from loudest to quietest:

| Level | Token | Size | Weight | Use |
|-------|-------|------|--------|-----|
| Hero number | --text-display | 28px | 900 | Clock time, KPI heroes |
| Stat number | custom | 20px | 800 | Stat tile values |
| Section title | --text-lg | 18px | 800 | "Schedule", "Time Log" |
| Card title | --text-base + bold | 13px | 700 | Project names, shift times |
| Body | --text-base | 13px | 400 | Descriptions |
| Label | --text-sm | 11px | 600 | Uppercase labels, badges |
| Micro | custom | 9px-10px | 600 | Stat tile labels, timestamps |

### 2.3 Card System

Three card variants, differentiated by visual weight:

**Hero Card** — The main action area (clock status, active project)
- Background: linear-gradient(135deg, var(--bg2), var(--bg3))
- Border: 1px solid rgba(255,255,255,0.05)
- Border-left: 3px solid var(--accent) (active state)
- Radius: var(--radius) (8px)
- Padding: var(--space-4) (16px)
- Shadow: var(--shadow-sm)

**Info Card** — Secondary information (stat tiles, project info)
- Background: var(--bg2)
- Border: 1px solid rgba(255,255,255,0.05)
- Radius: var(--radius) (8px)
- Padding: var(--space-3) (12px)
- No shadow

**Alert Card** — Notifications and warnings
- Background: rgba(accent-color, 0.06)
- Border: 1px solid rgba(accent-color, 0.12)
- Radius: var(--radius-sm) (6px)
- Padding: var(--space-3) var(--space-3)
- Left dot indicator (6px circle in accent color)

### 2.4 Header

**PortalHeader redesign:**
- Left: Eagle logo (ebc-eagle-white.png, 24px height) — NOT a text badge
- Center: (empty — clean, minimal)
- Right: Language toggle (subtle, text-only) + Avatar circle (initials, --bg3 background)
- Bottom border: 1px solid rgba(--accent, 0.15) — amber tint, not generic gray
- Background: rgba(--bg, 0.95) with backdrop-filter: blur(12px)
- Height: 48px (unchanged)

### 2.5 Tab Bar

**PortalTabBar updates:**
- Active tab: --accent color for both icon and label, scale(0.95) subtle press
- Inactive: --text3 color
- Background: rgba(--bg, 0.95) with backdrop-filter: blur(24px)
- Border-top: 1px solid rgba(255,255,255,0.05)
- Icons: Lucide React, 20px — NOT emoji
- Labels: 9px, uppercase optional per portal

### 2.6 Empty States

**Redesigned EmptyState component:**
- Icon: Lucide, 40px, --text3 color
- Heading: --text-base, --weight-bold, --text color
- Body: --text-sm, --text2 color
- Action button: FieldButton primary variant
- Always include an action — never just "check back later"

Examples:
- Time Log empty: "No entries yet" + "Clock In" button
- Materials empty: "No requests" + "Request Materials" button
- Schedule empty: "No shifts scheduled" + "Contact your foreman"

---

## 3. Employee Portal Redesign

### 3.1 Tab Structure (NEW)

| Tab | Icon (Lucide) | New? | Purpose |
|-----|---------------|------|---------|
| Home | Home | YES | Proactive dashboard — clock status, stats, alerts |
| Clock | Clock | existing | Clock in/out with geofence map |
| Schedule | Calendar | ENHANCED | Week view with shift details, available shifts, time-off requests |
| Materials | Package | existing | Material requests + history |
| More | MoreHorizontal | existing | JSA, Change Orders, RFIs, Drawings, Credentials, Settings |

**Removed from primary tabs:** Time Log (moved into Home, accessible via Hours stat tile)

**Added to "More" overflow:**
- Drawings/Plans (currently foreman-only — now all users)
- Credentials (NEW — cert wallet)

### 3.2 Home Tab (NEW)

Layout top-to-bottom:

1. **Greeting + Clock Hero**
   - "Good [Morning/Afternoon], {firstName}" — --accent color, uppercase, --text-sm
   - Clock duration: --text-display (28px), --weight-900, --text color
   - Status badge inline: "ON CLOCK" (green) or "OFF CLOCK" (--text3)
   - Weekly progress bar: --bg3 track, gradient --accent fill
   - "32.5h this week" / "40h target" labels below bar

2. **Stat Tiles Row** (3 tiles, equal width, flex gap --space-2)
   - Each tile is tappable (navigates to detail view):
     - **Hours** (value: weekly total) → navigates to Time Log list
     - **Tasks** (value: assigned task count) → navigates to tasks/schedule
     - **Pending** (value: pending requests count) → navigates to pending items
   - Style: Info Card variant, centered text
   - Number: 20px, --weight-800, color varies (--text for hours, --green for tasks, --accent for pending)
   - Label: 9px, --text3, uppercase

3. **Active Project Card**
   - Style: Hero Card variant
   - "ACTIVE PROJECT" label (micro, --text3, uppercase)
   - Project name: card title weight
   - Phase/scope: body text, --text2
   - Trade tags: pill badges (--accent background at 0.1 opacity, --accent text)
   - Tappable → navigates to project detail or floor plans

4. **Alerts Feed**
   - "ALERTS" label (micro, --text3, uppercase)
   - Alert Cards stacked, newest first, max 3 visible + "View All" link
   - Each alert tappable → navigates to source:
     - Cert expiry → Credentials tab
     - Material approved → Materials tab
     - Schedule change → Schedule tab
     - JSA required → JSA tab
   - Alert types with color coding:
     - Warning (cert expiry, schedule change): --amber dot
     - Success (approved, completed): --green dot
     - Error (denied, overdue): --red dot
     - Info (new assignment): --blue dot

### 3.3 Schedule Tab (ENHANCED)

Layout top-to-bottom:

1. **Week Strip**
   - 7-day horizontal strip (Mon-Sun)
   - Today highlighted: --accent background at 0.15, --accent text
   - Days with shifts: dot indicator below number
   - Tappable days scroll to that day's shifts
   - Header right: "Request Off" link (--accent color)

2. **Shift Cards** (grouped by day)
   - Day label: "Today — Thursday, Apr 3" (micro, --text3, uppercase)
   - Shift card: Hero Card variant with --accent left border (active) or --text3 left border (scheduled)
   - Time range: card title (14px, bold)
   - Project + location: body text
   - Status badge: "ACTIVE" (green bg) / "SCHEDULED" (gray bg) / "COMPLETED" (--text3)

3. **Available Shifts Section** (Crunchtime-inspired)
   - Dashed border card (rgba(--accent, 0.2))
   - Shift details + "Pick Up" button (FieldButton primary, compact)
   - Only shows when foreman has posted available shifts
   - Overtime indicator label when applicable

4. **Time-Off Request Flow**
   - "Request Off" opens bottom sheet modal
   - Date range picker + reason dropdown + notes textarea
   - Submit creates a pending request visible to foreman
   - Status shown inline in schedule: "OFF — Requested" / "OFF — Approved" / "OFF — Denied"

### 3.4 Drawings/Plans Tab (NEW for Employee)

- Same implementation as ForemanView drawings tab
- Read-only: browse and zoom project drawings
- Filtered to employee's active project(s)
- Cloud drawings from Supabase + local cache
- Zoom controls for detail viewing

### 3.5 Credentials Tab (NEW)

Layout:

1. **Credential Summary**
   - Count of active/expiring/expired credentials
   - "Add Credential" button

2. **Credential Cards** (list)
   - Cert name (e.g., "OSHA-10 Construction")
   - Issued date / Expiry date
   - Status badge: Active (green) / Expiring Soon (amber) / Expired (red)
   - Issuing org name
   - Tappable → detail view with full info

3. **Add Credential Flow**
   - Bottom sheet: cert type dropdown, issue date, expiry date, issuing org, optional photo upload
   - Saves to employee profile in Supabase

---

## 4. Driver Portal Redesign

### 4.1 Tab Structure (UPDATED)

| Tab | Icon (Lucide) | New? | Purpose |
|-----|---------------|------|---------|
| Route | Navigation | existing | Active delivery queue with optimization |
| Completed | CheckCircle | existing | Today's delivered items |
| Drawings | FileText | YES | Access project floor plans |
| Settings | Settings | existing | Profile, theme, language |

### 4.2 Route Tab Visual Update

- Apply Premium Construction card system to route cards
- Amber left border on active stop
- Distance badge with miles
- Drag handle: more visible, 44px touch target
- Status progression badges: ASSIGNED → IN TRANSIT → DELIVERED

### 4.3 Drawings Tab (NEW for Driver)

- Same as Employee drawings tab — read-only access to project plans
- Helps drivers find delivery locations within buildings

---

## 5. Foreman Portal Redesign

### 5.1 Tab Structure (unchanged, visual update only)

All existing 10+ tabs remain. Visual overhaul applies the Premium Construction design language:

- Dashboard KPI cards → Hero Card + Info Card variants
- Team list → proper card list with avatar, status, credential alerts
- Hours → progress bars with --accent gradient fills
- Materials → status workflow badges with semantic colors
- JSA → risk matrix keeps existing colors, card wrappers updated

### 5.2 Crew Scheduling Features (NEW for Foreman)

- **Post Available Shifts** — foreman creates open shifts that appear in employee Schedule tabs
- **Time-Off Request Queue** — list of pending requests with approve/deny buttons
- **Crew Credential Dashboard** — see whose certs are expiring, who needs renewals
- **Schedule Builder** — week view with drag-and-drop crew assignment (if scope allows)

---

## 6. Cross-Portal Features

### 6.1 Floor Plans for All Users

All three portals get access to project drawings:
- Employee: read-only, filtered to assigned projects
- Driver: read-only, filtered to delivery projects
- Foreman: full access (existing behavior)

Implementation: extract ForemanView drawings logic into a shared `DrawingsTab` component in `src/components/field/`, configure with `readOnly` and `projectFilter` props.

### 6.2 Notification System

Proactive alerts across all portals:
- Schedule changes → push to affected employees
- Material request status changes → push to requester
- Credential expiry warnings → push 30/14/7 days before
- JSA completion required → push to assigned crew

Implementation: extend useAlertEngine hook with new alert types. Alerts persist in localStorage, dismissable, navigable.

### 6.3 Navigation Pattern

**Every data point navigates to its source:**

| Tappable Element | Navigates To |
|-----------------|--------------|
| Hours stat tile | Time Log list (full history) |
| Tasks stat tile | Schedule tab (assigned shifts) |
| Pending stat tile | Filtered list of pending items |
| Active Project card | Project detail or Drawings tab |
| Alert card | Source detail (cert, material, schedule) |
| Shift card | Shift detail with project info |
| Credential card | Credential detail view |

---

## 7. Implementation Strategy

### Phase Breakdown (suggested)

**Phase 7A: Design System + Shared Components**
- Update FieldCard, FieldButton, PortalHeader, PortalTabBar, EmptyState visuals
- Add new components: StatTile, AlertCard, ShiftCard, CredentialCard
- Update styles.js with new Premium Construction CSS
- Set EBC Brand as default theme
- Estimated: 3-4 plans

**Phase 7B: Employee Portal Overhaul**
- New Home tab with dashboard layout
- Enhanced Schedule tab with week strip + shift cards
- New Credentials tab
- Add Drawings tab (extract from ForemanView)
- Wire navigation from stat tiles and alerts
- Estimated: 4-5 plans

**Phase 7C: Driver + Foreman Portal Updates**
- Driver visual update + Drawings tab
- Foreman visual update + scheduling features (post shifts, approve time-off)
- Foreman credential dashboard
- Estimated: 3-4 plans

**Phase 7D: Notifications + Polish**
- Extend useAlertEngine with new alert types
- Push notification integration
- Cross-portal testing
- Estimated: 2 plans

**Total estimated: 12-15 plans across 4 sub-phases**

---

## 8. Non-Goals (Explicit Exclusions)

- No admin/PM view changes (desktop views are out of scope)
- No new Supabase tables (use existing schema, extend with columns if needed)
- No authentication flow changes
- No new theme creation (use existing 8 themes, just change default)
- No multi-language additions beyond EN/ES
- No offline-first scheduling (schedule data is online-only for consistency)

---

## 9. Success Criteria

1. Employee opens app → sees Home tab with clock status, stats, project, alerts. Not an empty screen.
2. Every stat tile and alert navigates to real content.
3. Schedule tab shows upcoming shifts with project details and available shift pickup.
4. All users can access project floor plans from their portal.
5. Credential tracking with expiry alerts integrated into alerts feed.
6. EBC Brand theme is default — eagle logo in header, orange accents throughout.
7. All existing functionality preserved — zero regressions.
8. Build passes, no console errors, responsive at 375px/768px/1024px.
