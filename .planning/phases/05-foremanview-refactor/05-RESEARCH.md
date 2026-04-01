# Phase 5: ForemanView Refactor - Research

**Researched:** 2026-04-01
**Domain:** React JSX refactor — inline style elimination, bottom tab navigation, CSS design token adoption, shared component wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Tab Selection):** Claude's Discretion — 4-5 primary tabs from 13 total. UI-SPEC locked: Dashboard, Materials, JSA, Reports, Settings as the 5 primary tabs. Remaining 8 (Clock, Team, Hours, Drawings, Lookahead, Documents, Site, Notes) go in More overflow.
- **D-02 (Language Toggle):** Claude's Discretion — UI-SPEC locked: Language toggle included in PortalHeader via `langToggle` prop, same segmented EN/ES control as Phase 4.
- **D-03 (Plan Splitting):** 4 plans in 4 waves. Plan 1: CSS classes in styles.js. Plan 2: Header/tabs/dashboard/clock/team/hours (~lines 1–1835). Plan 3: Materials/JSA (~lines 1836–2821). Plan 4: Drawings/lookahead/reports/documents/site/notes/settings (~lines 2822–3953).
- **D-04 (Phase Color Tokenization):** Replace all hex phase colors with `var(--phase-*)` tokens. Tokens already exist in all 8 themes in constants.js.
- **D-05 (KPI Typography):** Single token for all KPI primary values: `var(--text-display)` (28px). KPI labels: `var(--text-sm)`. Confirmed by UI-SPEC.

### Constraints NOT Flexible (Hard Rules)

- Zero static `style={{` in ForemanView.jsx after refactor (FRMN-01)
- 11-tab horizontal scroll replaced with bottom PortalTabBar + More (FRMN-02)
- All buttons/inputs meet 44px touch target minimum via `var(--touch-min)` (FRMN-03)
- KPI cards use consistent typography scale tokens (FRMN-04)
- Daily reports, JSA, crew use FieldCard, FieldButton, AsyncState, FieldSignaturePad (FRMN-05)
- Phase colors use `--phase-*` tokens, no hex literals (FRMN-06)
- No new npm dependencies
- All UI text through `t()` translation function
- CSS variables only — zero hard-coded hex or rgba (except dynamic runtime values)
- Must work across all 5 active themes
- No business logic changes — presentation layer only

### Claude's Discretion

- CSS class naming in styles.js: follow `frm-{region}-{element}` pattern (locked by UI-SPEC)
- AsyncState vs manual pattern for loading states
- FieldSignaturePad: import from barrel, delete inline definition at line 20
- EmptyState messaging (locked by UI-SPEC copywriting contract)
- Skeleton shimmer approach: follow Phase 3/4 pattern
- Dynamic inline style exceptions for runtime-computed values

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRMN-01 | All inline styles replaced with CSS classes using design tokens | 583 inline `style={{` instances confirmed by grep; CSS naming convention `frm-{region}-{element}` in styles.js |
| FRMN-02 | 11 horizontal tabs restructured into bottom nav (4-5 primary) + More menu | `PortalTabBar` component proven in Phase 4 with `maxPrimary` prop; `tabs` array accepts `{ id, label, icon, badge }` objects |
| FRMN-03 | All buttons/inputs meet 44px touch target minimum | `var(--touch-min)` = 44px in tokens.css; FieldButton enforces this; explicit `min-height: var(--touch-min)` needed on team rows, drawing list items, lookahead day cells |
| FRMN-04 | KPI cards use consistent font sizes from typography scale | Existing `.foreman-kpi-value` uses 22px hardcoded — MUST update to `var(--text-display)` (28px); `.foreman-kpi-label` uses 9px — update to `var(--text-sm)` (11px) |
| FRMN-05 | Daily reports, JSA, and crew sections use shared field components | All 11 shared components confirmed in barrel; FieldSignaturePad API matches existing inline definition (onSave, onClear, label, t props) |
| FRMN-06 | Phase colors use `--phase-*` semantic tokens instead of hard-coded hex | All 6 `--phase-*` tokens defined across all 8 themes in constants.js; `--phase-active`, `--phase-estimating`, `--phase-pre-construction`, `--phase-completed`, `--phase-warranty`, `--phase-in-progress` |

</phase_requirements>

---

## Summary

ForemanView.jsx is 3,953 lines with 583 confirmed inline `style={{` instances — the largest refactor in this milestone by a factor of 4x vs EmployeeView. The file contains 13 tabs, an inline FieldSignaturePad definition that must be deleted and replaced with the barrel import, and several uses of undefined CSS variables (`--accent`, `--surface1`, `--surface2`, `--orange`, `--purple`) that will be replaced with token-correct equivalents during the refactor.

All upstream infrastructure is in place and proven: tokens.css, styles.js, 11 shared field components (barrel export confirmed), PortalTabBar with More overflow (proven in Phase 4 with 4+4 tabs), PortalHeader with `langToggle` prop, and all `--phase-*` tokens across all 8 themes. Phase 3 (DriverView) and Phase 4 (EmployeeView) serve as the direct implementation patterns. EmployeeView exits the refactor with only 8 inline style instances remaining — all dynamic exceptions — making it the gold standard to match.

The 4-plan wave structure (CSS → Plan 2 JSX → Plan 3 JSX → Plan 4 JSX) is the same approach that worked for Phase 4. The main risks are (1) the sheer volume of CSS classes needed in Plan 1 (~200+), (2) JSA section complexity unique to foreman (full hazard matrix vs. employee view-only JSA), and (3) several undefined tokens (`--accent`, `--surface1`, `--surface2`) that appear ~16 times and must be mapped to actual tokens rather than created new.

**Primary recommendation:** Follow the Phase 4 plan structure exactly. Plan 1 creates all frm-* CSS classes and updates the 6 existing `.foreman-*` classes to use tokens. Plans 2–4 replace JSX inline styles with those classes in line-range batches. Every plan is verifiable with `grep "style={{" src/tabs/ForemanView.jsx`.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | existing | Component framework | Project standard |
| lucide-react | ^0.577.0 | Icons for tab bar items | Project icon library — confirmed in UI-SPEC |
| CSS custom properties | — | Design tokens | Phase 1 output; zero new setup |

### Shared Components (barrel import: `src/components/field/index.js`)

| Component | Export Name | Usage in ForemanView |
|-----------|-------------|----------------------|
| `PortalHeader` | `PortalHeader` | Top header replacing `employee-header` pattern |
| `PortalTabBar` | `PortalTabBar` | Bottom nav replacing `emp-tabs` horizontal scroll |
| `FieldButton` | `FieldButton` | All action buttons |
| `FieldInput` | `FieldInput` | Form text/number inputs |
| `FieldSelect` | `FieldSelect` | Dropdown selectors |
| `FieldCard` | `FieldCard` | All card wrappers |
| `StatusBadge` | `StatusBadge` | Material/phase/JSA status badges |
| `EmptyState` | `EmptyState` | Empty tab states |
| `AsyncState` | `AsyncState` | Loading/empty/error wrapper |
| `FieldSignaturePad` | `FieldSignaturePad` | Replace inline definition at line 20 |
| `LoadingSpinner`, `Skeleton` | destructured | Shimmer during data fetch |
| `MaterialRequestCard` | `MaterialRequestCard` | Materials tab request items |

**Installation:** None required. All components are built and in the barrel.

---

## Architecture Patterns

### Recommended Project Structure (no changes — single-file pattern)

```
src/
├── styles.js              — Plan 1 adds frm-* CSS classes here
├── tokens.css             — Already complete; no changes needed
├── data/constants.js      — No changes; --phase-* tokens already present
├── components/field/      — No changes; all 11 components complete
│   └── index.js           — Barrel already exports FieldSignaturePad
└── tabs/
    └── ForemanView.jsx    — Plans 2-4 refactor this file
```

### Pattern 1: Tab Navigation Replacement (FRMN-02)

**What:** Replace `emp-tabs` horizontal scroll div + `emp-tab` buttons with `PortalTabBar` component at bottom of screen.
**When to use:** Plan 2 (header/tab section).

**Tab array shape (from Phase 4 precedent):**
```jsx
// Source: src/tabs/EmployeeView.jsx (Phase 4 output)
const FOREMAN_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: false },
  { id: "materials", label: "Materials",  icon: Package,         badge: pendingMatCount > 0 },
  { id: "jsa",       label: "JSA",        icon: Shield,          badge: activeJsaCount === 0 },
  { id: "reports",   label: "Reports",    icon: FileText,        badge: false },
  { id: "settings",  label: "Settings",   icon: Settings,        badge: false },
  // overflow (8 tabs)
  { id: "clock",     label: "Clock",      icon: Clock,           badge: false },
  { id: "team",      label: "Team",       icon: HardHat,         badge: false },
  // ... remaining 6
];

<PortalTabBar
  tabs={FOREMAN_TABS}
  activeTab={foremanTab}
  onTabChange={setForemanTab}
  maxPrimary={5}
  t={t}
/>
```

**PortalTabBar `maxPrimary` prop:** Accepts integer. Slices the tabs array — first N are primary, remainder go to More sheet. Phase 4 used `maxPrimary={4}` (4+4). Phase 5 uses `maxPrimary={5}` (5+8).

### Pattern 2: CSS Class Naming for styles.js (FRMN-01)

**Convention:** `frm-{region}-{element}` — matches `driver-*` (Phase 3) and `emp-*` (Phase 4).

**Region map (from UI-SPEC):**
```
frm-kpi-       frm-team-      frm-report-
frm-jsa-       frm-draw-      frm-look-
frm-budget-    frm-content-
```

**Updating existing classes (Plan 1 MUST do this, not duplicate):**
```css
/* BEFORE (in styles.js) */
.foreman-kpi-value { font-size: 22px; }       /* → var(--text-display) */
.foreman-kpi-label { font-size: 9px; }        /* → var(--text-sm) */
.foreman-kpi-sub   { font-size: 11px; }       /* verify vs token */
.foreman-kpi-grid  { gap: 10px; }             /* → var(--space-2) per UI-SPEC */

/* AFTER */
.foreman-kpi-value { font-size: var(--text-display); font-weight: var(--weight-bold); color: var(--amber); font-family: var(--font-mono); }
.foreman-kpi-label { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3); margin-bottom: var(--space-1); }
.foreman-kpi-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-bottom: var(--space-4); }
```

### Pattern 3: PortalHeader with Language Toggle (Decision D-02)

**What:** Replace the existing `employee-header` div with `PortalHeader` component. Include `langToggle` prop (same pattern as Phase 4).
**Source:** Phase 4 EmployeeView implementation.

```jsx
// PortalHeader variant="foreman" props
<PortalHeader
  variant="foreman"
  title={selectedProject?.name}
  userName={`${activeForeman.name} · ${t("Foreman Portal")}`}
  languageToggle={langToggle}  // Phase 4 emp-lang-switch pattern
  logoutAction={<FieldButton variant="ghost" onClick={handleLogout} t={t}>{t("Logout")}</FieldButton>}
  projectSelector={myProjects.length > 1 ? <select ...> : null}
  t={t}
/>
```

Note: PortalHeader currently only renders `languageToggle` for `variant="employee"`. For Phase 5, the `variant="foreman"` branch needs to be updated in Plan 2 to also render `languageToggle` — OR pass it via the right-slot mechanism. Check the actual PortalHeader.jsx and update as needed. This is a minor component update, not a blocker.

### Pattern 4: FieldSignaturePad Swap (FRMN-05)

**What:** Delete the inline `FieldSignaturePad` function (lines 20–66 in ForemanView.jsx). Import from barrel.
**Why safe:** The shared component has an identical API (`onSave`, `onClear`, `label`, `t` props). Key difference: shared version uses `getComputedStyle` for theme-aware stroke color (no hex) and uses `.field-signature-canvas` CSS class instead of inline `style={{ background: "#f8f9fb" }}`.

```jsx
// DELETE lines 20-66 (inline FieldSignaturePad definition)

// ADD to imports
import { PortalHeader, PortalTabBar, FieldButton, FieldInput, FieldSelect,
         FieldCard, StatusBadge, EmptyState, AsyncState, LoadingSpinner,
         Skeleton, FieldSignaturePad, MaterialRequestCard } from "../components/field";
```

### Pattern 5: Phase Color Token Replacement (FRMN-06)

**Mapping (all tokens confirmed in constants.js across all 8 themes):**

| Current JSX hex | Replace with token |
|-----------------|-------------------|
| `#10b981` (green/active) | `var(--phase-active)` |
| `#3b82f6` (blue) | `var(--phase-estimating)` |
| `#8b5cf6` (purple/pre-con) | `var(--phase-pre-construction)` |
| `#6b7280` (gray/complete) | `var(--phase-completed)` |
| `#eab308` (yellow/warranty) | `var(--phase-warranty)` |
| `#f59e0b` (amber/in-progress) | `var(--phase-in-progress)` |

### Pattern 6: Undefined Token Resolution

ForemanView uses several undefined CSS variables that will be eliminated:

| Undefined token | Occurrences | Correct replacement |
|-----------------|-------------|---------------------|
| `var(--accent)` | ~13 | `var(--amber)` — accent = amber in EBC design system |
| `var(--accent-dim)` | ~2 | `var(--amber-dim)` |
| `var(--surface1)` | ~3 | `var(--bg2)` |
| `var(--surface2)` | ~3 | `var(--bg3)` |
| `var(--orange, #f59e0b)` | ~6 | `var(--amber)` — amber is the stale/warning color |
| `var(--purple, #8b5cf6)` | ~1 | `var(--phase-pre-construction)` (resolves to `var(--blue)` in most themes) |

Note: `--orange` appears only in drawings tab with a hex fallback. The fallback will be removed and replaced with `var(--amber)` as the warning signal color (consistent with rest of app).

### Pattern 7: Dynamic Runtime Inline Style Exceptions

Approved exceptions — these remain as `style={{` with a JSX comment:

| Element | Reason | Comment to add |
|---------|--------|----------------|
| `.foreman-budget-fill` width | Runtime % computed from budget data | `{/* dynamic: budget % computed at runtime */}` |
| Progress bar widths | Runtime % from time/hours data | `{/* dynamic: progress % computed at runtime */}` |
| JSA risk badge colors | Risk score computed from matrix | `{/* dynamic: risk score color computed at runtime */}` |
| Selected item background | `selectedProjectId === p.id` conditional | `{/* dynamic: selected state */}` |

### Anti-Patterns to Avoid

- **Duplicating existing `.foreman-*` classes:** Plan 1 updates existing classes in-place; does not create `.frm-kpi-*` alongside `.foreman-kpi-*`. The existing classes are already used in JSX and must be updated, not replaced.
- **Using `--accent` in new CSS classes:** Map to `--amber` instead. `--accent` is undefined in all themes.
- **Calling `PortalTabBar` without `maxPrimary={5}`:** Default is `maxPrimary={4}`. ForemanView needs 5 primary tabs.
- **Removing `t()` around user-visible strings:** Every displayed string must go through `t()` including empty state headings.
- **Creating new loading/error state patterns:** Use `AsyncState` wrapper consistently. Do not write manual `{loading ? <spinner> : ...}` patterns.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom tab navigation | Custom scroll nav | `PortalTabBar` | Already built, tested, handles More sheet, badge counts, focus states |
| Signature capture canvas | Custom canvas component | `FieldSignaturePad` | Theme-aware, handles devicePixelRatio, mid-session theme switch |
| Loading/empty/error state | Manual conditionals | `AsyncState` | Covers all 4 states in one component, consistent UX |
| Empty tab placeholders | Custom empty divs | `EmptyState` | Consistent icon/heading/body/action pattern, i18n-ready |
| Status indicators | Custom badge spans | `StatusBadge` | `STATUS_CLASS_MAP` covers all standard statuses |
| Action buttons | Raw `<button>` elements | `FieldButton` | Enforces 44px touch target, loading state, variants, focus ring |
| Material request cards | Custom card markup | `MaterialRequestCard` | Shared across Foreman/Employee/Driver, reuse directly |
| Skeleton loading | Custom shimmer divs | `Skeleton` from `LoadingSpinner` | Shimmer animation gated on `prefers-reduced-motion`, consistent |

**Key insight:** Every single component needed for ForemanView was built in Phase 2 specifically for this phase. The "don't hand-roll" list is the entire component library.

---

## Common Pitfalls

### Pitfall 1: Updating Existing `.foreman-*` Classes vs. Creating New `frm-*` Classes

**What goes wrong:** Plan 1 creates new `frm-kpi-value` class alongside existing `foreman-kpi-value`. JSX in ForemanView still references `foreman-kpi-value`. Plan 1 CSS work doesn't improve anything because JSX still uses old class names.

**Why it happens:** The natural impulse is to follow the Phase 3/4 naming convention (all new classes) without realizing some `.foreman-*` classes already exist in styles.js and are already used in JSX.

**How to avoid:** Plan 1 explicitly updates the 6 existing `.foreman-*` classes to use tokens (do not duplicate). Separately add new `frm-*` classes for patterns not yet covered. JSX plans (2-4) reference both `.foreman-*` (existing) and new `frm-*` classes.

**Existing `.foreman-*` classes to UPDATE in Plan 1:**
- `.foreman-kpi-grid` — update `gap: 10px` → `gap: var(--space-2)`
- `.foreman-kpi-value` — update `font-size: 22px` → `font-size: var(--text-display)`
- `.foreman-kpi-label` — update `font-size: 9px` → `font-size: var(--text-sm)`
- `.foreman-kpi-sub` — update `font-size: 11px` → keep as-is (no token for 11px; `--text-sm` is 11px — map to `var(--text-sm)`)
- `.foreman-kpi-card` — no pixel values to update
- `.foreman-team-row` — already uses CSS variables; confirm padding uses tokens
- `.foreman-budget-fill` — no font-size; width is dynamic (correct exception)
- `.foreman-project-select` — update font-size to `var(--text-base)`

### Pitfall 2: PortalHeader Language Toggle Render Guard

**What goes wrong:** Language toggle renders correctly in Phase 4 (variant="employee") but not in Phase 5 because PortalHeader.jsx currently renders `languageToggle` only when `variant === "employee"`.

**Why it happens:** PortalHeader was designed initially for employee. The foreman branch renders a settings button and title, not a language toggle.

**How to avoid:** In Plan 2, update PortalHeader.jsx to render `languageToggle` when provided, regardless of variant — or add it to the foreman branch's right-slot render. This is a 3-line change. Do NOT change the employee behavior.

**Current PortalHeader.jsx foreman right-slot (line 62):**
```jsx
{variant === 'foreman' && settingsAction}  // ← add languageToggle here
```

### Pitfall 3: `--accent` Undefined Token

**What goes wrong:** After replacing inline styles with CSS classes, a new `.frm-team-clock-btn` class uses `color: var(--accent)`. The variable is undefined — the element renders with browser default color.

**Why it happens:** ForemanView has ~13 occurrences of `var(--accent)` in inline styles. It is tempting to carry `var(--accent)` forward into CSS classes. `--accent` is NOT defined in any theme in constants.js.

**How to avoid:** Every instance of `var(--accent)` must be replaced with `var(--amber)`. Every instance of `var(--accent-dim)` → `var(--amber-dim)`. This is part of the inline style elimination, not a separate task.

### Pitfall 4: JSA Section Has Foreman-Specific Logic Not in EmployeeView

**What goes wrong:** Plan 3 (Materials/JSA) assumes it can reuse emp-jsa-* CSS classes throughout. The foreman JSA includes a full hazard matrix, Pre-Task Safety Roll Call (rcStep state machine), indoor/outdoor toggle, and supervisor sign-off that do not exist in EmployeeView.

**Why it happens:** The CONTEXT.md says to reuse emp-jsa-* classes where possible. It's easy to extend too aggressively.

**How to avoid:** Use `emp-jsa-*` classes for the list view, detail view, and sign-off sections that share structure with EmployeeView. Create `frm-jsa-*` classes specifically for the hazard matrix grid (`frm-jsa-matrix`, `frm-jsa-risk-cell`), the roll call state machine UI (`frm-jsa-rollcall-*`), and the indoor/outdoor toggle. The dividing line: if the HTML structure is identical to EmployeeView, reuse; if it has foreman-only elements, create `frm-jsa-*`.

### Pitfall 5: Vol of Plan 1 CSS Classes

**What goes wrong:** Plan 1 tries to enumerate all 200+ CSS classes needed for 583 inline style instances but misses ~50 that appear in Plans 2-4. Those later plans then add ad-hoc inline styles or invent classes not in styles.js.

**Why it happens:** 583 instances across 3,953 lines is a large audit surface. It's impossible to catalog every single class in advance without reading every line.

**How to avoid:** Plan 1 should create the region-level CSS "vocabulary" — the base classes for each UI region. Plans 2-4 should be allowed to add incidental `frm-*` classes to styles.js as part of their own scope (append to the FOREMAN VIEW section). Plan 1's goal is not to create every single class — it's to establish the full token-based foundation and update the existing `.foreman-*` classes.

### Pitfall 6: `emp-content` vs. `frm-content` Wrapper

**What goes wrong:** ForemanView currently uses `className="emp-content"` as the tab content wrapper. Plan 2 replaces `emp-tabs` with PortalTabBar but leaves `emp-content` as the wrapper. This is fine — the wrapper class only provides `max-width: 420px` on mobile. However, if Plan 1 creates a `frm-content` class instead, Plan 2 must update all 13 tab content divs.

**How to avoid:** Keep using `emp-content` as the tab content wrapper. It's a layout utility, not a semantic name. Only create `frm-content-pad` for the bottom padding (different purpose). This matches the precedent: DriverView uses `emp-content` for width constraint even though it's a driver portal.

---

## Code Examples

Verified patterns from Phase 3/4 output (live code):

### PortalTabBar Usage (from EmployeeView.jsx Phase 4 output)
```jsx
// Source: src/tabs/EmployeeView.jsx (Phase 4 output — live in codebase)
const empTabs = [
  { id: 'clock',     label: 'Clock',     icon: Clock,         badge: false },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar,      badge: false },
  { id: 'materials', label: 'Materials', icon: Package,       badge: hasMatBadge },
  { id: 'jsa',       label: 'JSA',       icon: Shield,        badge: hasJsaBadge },
  { id: 'documents', label: 'Documents', icon: FileText,      badge: false },
  { id: 'map',       label: 'Map',       icon: MapPin,        badge: false },
  { id: 'settings',  label: 'Settings',  icon: Settings,      badge: false },
];

<PortalTabBar
  tabs={empTabs}
  activeTab={empTab}
  onTabChange={setEmpTab}
  maxPrimary={4}
  t={t}
/>
```

### AsyncState Usage (from EmployeeView.jsx Phase 4 output)
```jsx
// Source: src/tabs/EmployeeView.jsx
<AsyncState
  loading={loading}
  empty={items.length === 0}
  error={error}
  emptyIcon={Package}
  emptyMessage={t("No material requests for this project.")}
  t={t}
  skeleton={<Skeleton className="emp-mat-list" />}
>
  {/* content when loaded + non-empty */}
</AsyncState>
```

### EmptyState with Heading Prop (correct API)
```jsx
// Source: src/components/field/EmptyState.jsx
// EmptyState takes { icon, heading, message, action, t }
// NOT emptyMessage — that's AsyncState's prop name
<EmptyState
  icon={Shield}
  heading={t("No JSA")}
  message={t("No Job Safety Analysis on file. Tap New JSA to begin.")}
  t={t}
/>
```

### emp-lang-switch Language Toggle (from EmployeeView.jsx)
```jsx
// Source: src/tabs/EmployeeView.jsx — reuse exactly in ForemanView
const langToggle = (
  <div className="emp-lang-switch">
    <button
      className={`emp-lang-option${lang === 'en' ? ' emp-lang-active' : ''}`}
      onClick={() => setLang('en')}
    >EN</button>
    <button
      className={`emp-lang-option${lang === 'es' ? ' emp-lang-active' : ''}`}
      onClick={() => setLang('es')}
    >ES</button>
  </div>
);
```

### KPI Card Structure (CSS class pattern)
```jsx
// CSS from styles.js after Plan 1 update:
// .foreman-kpi-grid { gap: var(--space-2) }
// .foreman-kpi-value { font-size: var(--text-display) }
// .foreman-kpi-label { font-size: var(--text-sm) }
<div className="foreman-kpi-grid">
  <FieldCard className="foreman-kpi-card">
    <div className="foreman-kpi-label">{t("Budget Used")}</div>
    <div className="foreman-kpi-value">{budgetUsedPct}%</div>
    <div className="foreman-kpi-sub">{t("of total budget")}</div>
  </FieldCard>
</div>
```

### Phase Color Token Usage (FRMN-06)
```jsx
// BEFORE (inline hex):
<span style={{ color: "#10b981" }}>{phase}</span>

// AFTER (token — no inline style):
<span className="frm-phase-active">{phase}</span>
// In styles.js: .frm-phase-active { color: var(--phase-active) }

// OR for status badge:
<StatusBadge status="active" t={t} />
```

### Dynamic Exception Comment Pattern (approved)
```jsx
// Budget fill — approved dynamic exception
<div
  className="foreman-budget-fill"
  style={{ width: `${budgetPct}%` }}  {/* dynamic: budget % computed at runtime */}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline styles for all layout | CSS custom property classes | Phase 1-4 | Zero static inline styles = theme safety |
| Horizontal tab scroll (`emp-tabs`) | Bottom bar via `PortalTabBar` | Phase 4 | Native nav pattern for mobile |
| Inline FieldSignaturePad definition | Barrel import from field/ | Phase 2 | Theme-aware stroke, no hex literals |
| Hard-coded hex phase colors | `var(--phase-*)` semantic tokens | Phase 1 | Correct color in all 5 themes |
| Custom empty/loading patterns | `AsyncState` + `EmptyState` | Phase 2 | Consistent UX, reduced JSX verbosity |

**Deprecated in this phase:**
- `employee-header` class: replaced by `PortalHeader` component
- `emp-tabs` horizontal scroll div: replaced by `PortalTabBar`
- Inline `FieldSignaturePad` function (ForemanView.jsx lines 20–66): replaced by barrel import
- `var(--accent)` references: replaced by `var(--amber)` (token never defined)
- `var(--surface1)`, `var(--surface2)`: replaced by `var(--bg2)`, `var(--bg3)` respectively

---

## Open Questions

1. **PortalHeader language toggle for foreman variant**
   - What we know: `PortalHeader.jsx` line 51 renders `languageToggle` only when `variant === 'employee'`
   - What's unclear: Should Plan 2 update PortalHeader to always render `languageToggle` when provided, or add it to the foreman branch specifically?
   - Recommendation: Update PortalHeader to render `languageToggle` when provided regardless of variant (1-line change). More general, cleaner. Document the change in Plan 2 scope.

2. **`--phase-pre-construction` vs. purple hex**
   - What we know: ForemanView uses `#8b5cf6` (purple) for pre-construction in one inline style. `--phase-pre-construction` resolves to `var(--blue)` in all themes.
   - What's unclear: Is blue the correct token for pre-construction, or does a purple-like token need to be added to themes?
   - Recommendation: Use `var(--phase-pre-construction)` as-is (it resolves to blue). The hex `#8b5cf6` was non-standard. If Emmanuel or the team wants purple, that's a future token addition — out of scope for this refactor.

3. **`cal-nav-btn` class usage in ForemanView**
   - What we know: ForemanView uses `cal-nav-btn` class (e.g., line 1950, 2827) which is defined in styles.js for the calendar nav. These buttons likely need to become `FieldButton variant="ghost"` per FRMN-05.
   - What's unclear: Are these purely decorative nav arrows or primary action triggers?
   - Recommendation: Replace `cal-nav-btn` instances with `FieldButton variant="ghost"` where they are action triggers (refresh drawings, add JSA). This enforces 44px touch target per FRMN-03.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is a pure JSX/CSS refactor. No external tools, services, databases, or CLI utilities are required beyond the existing Vite dev server and npm script suite already in use for Phases 1-4.

---

## Validation Architecture

`workflow.nyquist_validation` is not set to `false` in `.planning/config.json` — validation section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in project root |
| Config file | None — Wave 0 gap |
| Quick run command | `grep "style={{" src/tabs/ForemanView.jsx \| wc -l` (structural verification) |
| Full suite command | Manual: open app in browser, switch all 5 themes, navigate all 13 tabs |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRMN-01 | Zero static inline styles in ForemanView.jsx | structural | `grep "style={{" src/tabs/ForemanView.jsx` returns 0 | ❌ Wave 0 (use grep command) |
| FRMN-02 | Bottom tab bar with 5 primary + More overflow | smoke | Visual inspection — open foreman portal, verify bottom bar | manual-only |
| FRMN-03 | All interactive elements ≥ 44px | smoke | Visual inspection on 375px viewport + Chrome DevTools | manual-only |
| FRMN-04 | KPI values use `--text-display` token | structural | `grep "font-size: 22px\|font-size:22px" src/styles.js` returns 0 for foreman-kpi-value | ❌ Wave 0 (use grep command) |
| FRMN-05 | FieldSignaturePad imported from barrel | structural | `grep "function FieldSignaturePad" src/tabs/ForemanView.jsx` returns 0 | ❌ Wave 0 (use grep command) |
| FRMN-06 | No hex phase colors in ForemanView.jsx | structural | `grep "#10b981\|#3b82f6\|#8b5cf6\|#6b7280\|#eab308" src/tabs/ForemanView.jsx` returns 0 | ❌ Wave 0 (use grep command) |

### Sampling Rate

- **Per task commit:** `grep "style={{" src/tabs/ForemanView.jsx | wc -l` — count should decrease each wave
- **Per wave merge:** Full grep suite (all 6 structural checks above)
- **Phase gate:** All structural checks return 0 AND manual 5-theme visual check passes before `/gsd:verify-work`

### Wave 0 Gaps

All verification is grep-based — no test files needed. The structural checks listed above can be run as inline bash commands. No Wave 0 file creation required for this refactor phase.

*(No Jest/Vitest infrastructure exists in the project. All verification is structural grep + manual browser testing — this is the established pattern for Phases 3 and 4.)*

---

## Sources

### Primary (HIGH confidence)
- `src/tabs/ForemanView.jsx` — Target file, 3,953 lines, 583 inline style instances (grep-verified)
- `src/components/field/index.js` — Barrel export confirmed, all 11 components present
- `src/components/field/PortalTabBar.jsx` — `maxPrimary` prop, tabs array shape, sheet implementation
- `src/components/field/PortalHeader.jsx` — variant prop, languageToggle placement
- `src/components/field/FieldSignaturePad.jsx` — API match confirmed (onSave, onClear, label, t)
- `src/components/field/AsyncState.jsx` — `emptyMessage` vs. `heading` prop distinction verified
- `src/components/field/EmptyState.jsx` — `heading` + `message` props confirmed
- `src/styles.js` — Existing `.foreman-*` classes located (lines 1043–1061), `emp-jsa-*` classes (lines 780–826), `emp-lang-switch` (lines 660–663), driver-* patterns
- `src/tokens.css` — `--text-display: 28px`, `--text-sm: 11px`, `--touch-min: 44px` confirmed
- `src/data/constants.js` — All `--phase-*` tokens confirmed in all 8 themes; `--accent` and `--orange` NOT defined in any theme
- `src/tabs/EmployeeView.jsx` — Phase 4 gold standard: 8 remaining inline styles (all dynamic exceptions)
- `.planning/phases/05-foremanview-refactor/05-CONTEXT.md` — Locked decisions
- `.planning/phases/05-foremanview-refactor/05-UI-SPEC.md` — Tab nav contract, typography, color, copywriting

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Accumulated decisions, blockers (--accent undefined flagged at Phase 4)
- `src/tabs/DriverView.jsx` — Phase 3 pilot reference for pattern baseline

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components are built and in codebase; verified by reading source files
- Architecture: HIGH — Phase 3 and 4 are complete; patterns are code-verified, not theoretical
- Pitfalls: HIGH — identified by reading actual source code line by line, not from theory
- Token mapping: HIGH — grep-verified which tokens are defined vs. undefined

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable codebase; no fast-moving dependencies)
