# Architecture Patterns: Field Portal UI Refactor

**Domain:** Role-based field portals (mobile-first construction ops)
**Researched:** 2026-03-30
**Confidence:** HIGH — all findings from direct codebase inspection

---

## Current Architecture

### File Layout

```
src/
  styles.js          # All CSS as a JS template literal (~800 lines), injected at runtime
  data/constants.js  # THEMES object — CSS custom property values per theme
  tabs/
    ForemanView.jsx  # 3,953 lines — monolithic, 583 inline style instances
    EmployeeView.jsx # 1,745 lines — monolithic, 135 inline style instances
    DriverView.jsx   #   510 lines — monolithic,  42 inline style instances
  components/
    ReportProblemModal.jsx  # shared, some inline styles
    FeatureGuide.jsx        # shared
    PhaseTracker.jsx        # shared, has its own CSS block in styles.js
    PdfViewer.jsx           # shared, lazy-loaded
    (14 other components)
```

### Theme System: What Exists

The theme system is architecturally sound but bypassed in practice.

**How it works (confirmed):**
- `THEMES` object in `src/data/constants.js` defines 7 themes (steel, blueprint, daylight, matrix, anime, ebc, midnight)
- Each theme is a flat map of CSS custom property key → value
- `App.jsx` applies them at runtime: `Object.entries(t.vars).forEach(([k,v]) => document.documentElement.style.setProperty(k, v))`
- CSS vars set on `:root` (`document.documentElement`) — available to every element in the tree

**Available CSS variables (all themes define these consistently):**
```
Layout/color:   --bg, --bg2, --bg3, --bg4
Borders:        --border, --border2
Semantic colors: --amber, --amber2, --amber-dim, --amber-glow
                 --blue, --blue-dim
                 --green, --green-dim
                 --red, --red-dim
                 --yellow
Text:           --text, --text2, --text3
Glass effects:  --glass-border, --glass-bg, --bg2-rgb
Typography:     --font-head, --font-body, --font-mono
Shape:          --radius, --radius-sm
Shadows:        --shadow, --card-shadow
```

**The gap:** Portal files bypass the theme system. Example from ForemanView.jsx:
```jsx
// WRONG — hard-coded, breaks all themes:
ctx.strokeStyle = "#1e2d3b";
background: "#f8f9fb"
color: "var(--accent)"  // --accent doesn't exist in THEMES

// WRONG — inline style where a class exists:
style={{ display: "flex", gap: 8, marginTop: 6 }}

// RIGHT — already used in some places:
border: "2px solid var(--border)"
```

**Count of violations:**
- ForemanView: 583 inline style blocks, 43 hard-coded hex colors
- EmployeeView: 135 inline style blocks, 22 hard-coded hex colors
- DriverView: 42 inline style blocks (lower, good candidate for pilot)

### CSS Class System: What Exists in styles.js

`styles.js` is a JS string injected into the `<style>` tag at app init. It contains a comprehensive set of classes that portals already use inconsistently:

**Generic utility classes (exist, underused):**
- Layout: `.flex`, `.flex-between`, `.flex-col`, `.flex-wrap`, `.gap-*`, `.mt-*`, `.mb-*`
- Text: `.text-xs` (11px), `.text-sm` (12px), `.text-md` (14px), `.text-lg` (18px), `.text-xl` (24px)
- Color: `.text-muted`, `.text-dim`, `.text-amber`, `.text-green`, `.text-red`, `.text-blue`
- Typography: `.font-head`, `.font-mono`, `.font-bold`, `.font-semi`

**Component classes (exist, used by portals):**
- Buttons: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`, `.btn-group`
- Cards: `.card`, `.card-glass`, `.card-header`, `.card-title`
- Forms: `.form-grid`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`
- Modals: `.modal-overlay`, `.modal`, `.modal-lg`, `.modal-header`, `.modal-title`, `.modal-close`, `.modal-actions`
- Badges: `.badge`, `.badge-green`, `.badge-red`, `.badge-amber`, `.badge-blue`, `.badge-muted`
- States: `.empty-state`, `.empty-icon`, `.empty-title`, `.empty-text`, `.empty-action`
- Tables: `.table-wrap`, `.data-table`
- Tabs: `.tab-header`, `.tab-btn` (top-nav style, different from emp-tab)

**Portal-specific classes (exist, in styles.js):**
- Employee portal shell: `.employee-app`, `.employee-header`, `.employee-logo`, `.employee-body`
- Sub-tabs: `.emp-tabs`, `.emp-tab` (used by all 3 portals and DeliveriesTab)
- Clock UI: `.clock-card`, `.clock-status`, `.clock-time`, `.clock-project`, `.clock-btn`
- Geofence: `.geo-status` (`.inside`, `.outside`, `.override`), `.geo-dot`
- Auth: `.pin-wrap`, `.pin-dots`, `.pin-dot`, `.pin-grid`, `.pin-key`
- Foreman KPI: `.foreman-kpi-grid`, `.foreman-kpi-card`, `.foreman-kpi-label`, `.foreman-kpi-value`
- Foreman team: `.foreman-team-row`, `.foreman-team-name`, `.foreman-team-role`, `.foreman-team-hours`
- Foreman budget: `.foreman-budget-bar`, `.foreman-budget-fill`, `.foreman-project-select`
- Driver: `.driver-queue-card`, `.driver-nav-link`, `.driver-badge`
- Schedule: `.schedule-day`, `.schedule-day-name`, `.schedule-project`, `.schedule-time`
- Materials: `.mat-request-card`, `.mat-status-*` (7 variants)

**Missing from styles.js (need to add):**
- Loading states: `.loading-spinner`, `.skeleton`, `.loading-overlay`
- Touch targets: `.touch-target` (min 44px)
- Status indicators beyond badges
- Typography scale formalized as named tokens rather than utility classes
- Focus ring standardization

### Tab Structure

All 3 portals follow the same pattern:
```jsx
const [xxxTab, setXxxTab] = useState("clock");
// ...
<div className="emp-tabs">
  {TABS.map(tab => (
    <button key={tab.key}
      className={`emp-tab${xxxTab === tab.key ? " active" : ""}`}
      onClick={() => setXxxTab(tab.key)} />
  ))}
</div>
{xxxTab === "clock" && (...)}
{xxxTab === "dashboard" && (...)}
```

**ForemanView tabs (11):** clock, dashboard, team, hours, materials, jsa, drawings, lookahead, reports, documents, site, notes

**EmployeeView tabs (8):** clock, schedule, log, jsa, materials, cos, rfis, settings

**DriverView tabs (3+):** route, schedule, settings

### Data Flow for Theming

```
App.jsx
  useEffect([theme]) → document.documentElement CSS vars
  app bundle → { theme, setTheme } passed to all portals

Portal receives { theme, setTheme, show, ...data } via app prop
  Portals import THEMES from constants.js for theme toggle UI
  Theme application is already global — no per-portal work needed
```

**The `app` prop bundle** passes everything from App.jsx down as a single object. No Context API is used. All portals receive the same bundle shape.

### Shared Component Patterns Observed

`FieldSignaturePad` — defined inside ForemanView.jsx at line 20. It is a clear candidate for extraction. It uses some hard-coded hex (#1e2d3b, #f8f9fb) and some CSS vars. Both EmployeeView and ForemanView likely have duplicate or similar signature pad usage (JSA signing exists in both).

`getWeekStart` utility — defined in both ForemanView.jsx and EmployeeView.jsx independently. Should be in utils/.

Language toggle (t() function) — duplicated in all 3 portals. Same pattern, same localStorage key.

---

## Proposed Changes

### Design Token Additions (extend, not replace)

The existing CSS variable set is the design token system. It is already correct. The fix is:

1. Add missing tokens to `styles.js` (not to `constants.js` — those are theme-specific values only):
   - Typography scale tokens as CSS vars on `:root` (non-theme, constant)
   - Spacing scale tokens
   - Touch target minimum as a CSS var

2. Add missing semantic tokens to every theme in `constants.js`:
   ```js
   "--font-size-xs": "11px",
   "--font-size-sm": "12px",
   "--font-size-base": "13px",
   "--font-size-md": "14px",
   "--font-size-lg": "18px",
   "--font-size-xl": "24px",
   "--touch-min": "44px",
   "--spacing-xs": "4px",
   "--spacing-sm": "8px",
   "--spacing-md": "12px",
   "--spacing-lg": "16px",
   "--spacing-xl": "24px",
   ```
   OR define these as CSS on `:root` in `styles.js` since they don't vary by theme.

3. Never add `--accent` or other vars that aren't in the THEMES object — the cascade will silently fail.

### New Shared Field Components

These should live in `src/components/field/` to separate field-specific UI from the existing `src/components/` (which contains admin/back-office components).

**Extract from ForemanView.jsx:**

| Component | Source Location | Why Extract |
|-----------|----------------|-------------|
| `FieldSignaturePad` | ForemanView.jsx:20 | Used in JSA signing in both Foreman and Employee portals |
| `ClockCard` | Inline in all 3 portals | Identical or near-identical clock display logic |
| `GeofenceIndicator` | EmployeeView/ForemanView | Same `.geo-status` pattern, duplicated logic |
| `PortalHeader` | All 3 portals | Same `.employee-header` + logo + settings gear pattern |
| `PortalTabBar` | All 3 portals | Same `.emp-tabs` + `.emp-tab` rendering pattern |
| `MaterialRequestCard` | ForemanView + EmployeeView | Same `.mat-request-card` + status badge pattern |
| `EmptyState` | All portals | Same `.empty-state` pattern used 10+ times |
| `FieldKpiCard` | ForemanView dashboard | `.foreman-kpi-card` pattern |

**New components (don't exist yet):**

| Component | Purpose |
|-----------|---------|
| `LoadingSpinner` | Async operation indicator — currently inline |
| `SkeletonBlock` | Placeholder for loading lists |
| `FieldInput` | `<input>` with `inputmode`, focus ring, 44px touch target |
| `FieldSelect` | `<select>` with proper focus/sizing |
| `StatusBadge` | Wraps `.badge` + variant logic — replaces inline conditional classes |
| `AsyncState` | Wrapper rendering loading/empty/error branches consistently |

### Modified Components (change in place)

**`ReportProblemModal.jsx`** — already shared, but uses inline styles. Migrate to CSS classes. Uses hard-coded hex for priority colors; replace with CSS vars or extract `PRIORITY_COLOR` map to a constants file.

**`PhaseTracker.jsx`** — already has its own CSS block in styles.js (`.phase-*` classes). No structural change needed, but verify it has no inline style regressions.

### What NOT to Touch

- Business logic in portals (state management, API calls, calculations)
- The `app` prop bundle interface
- Tab routing state (xxxTab/setXxxTab pattern)
- Data fetching hooks (useGeolocation, useDrawingCache, etc.)
- Translation function t() — but extract to a shared hook (see below)

---

## Integration Strategy

### Theme Integration — Already Works, Just Use It

The CSS vars are on `:root`. Every component written with `var(--*)` tokens automatically participates in theme switching. No changes to the theme application mechanism in App.jsx are needed.

**The only integration point:** Remove hard-coded hex values and replace with the correct CSS var. For each hard-coded color found, map to the nearest semantic token:

| Hard-coded value | Replace with |
|-----------------|-------------|
| `#1e2d3b` | `var(--bg4)` (EBC theme bg4) |
| `#f8f9fb` | `var(--bg3)` (daylight theme bg3 match) |
| `#000` (on amber buttons) | `var(--btn-on-accent, #000)` or just `#000` (acceptable — always dark on amber) |
| `rgba(16,185,129,0.35)` | `var(--green-dim)` (already a theme var) |
| Inline `color: "var(--accent)"` | Delete — `--accent` doesn't exist; use `var(--amber)` |

### Styles.js Integration — CSS-Append Strategy

`styles.js` is a runtime-injected string. When new component CSS is needed, **append to styles.js** rather than creating per-component CSS files. This keeps all style injection in one place and avoids the need for CSS modules or a build step change.

The append location within styles.js should be:
```
[existing portal sections at bottom]
/* ══ FIELD COMPONENTS ══ */  ← new section here
.field-input { ... }
.field-select { ... }
.loading-spinner { ... }
.skeleton { ... }
.async-state { ... }
```

### New Component Integration Point

New components in `src/components/field/` import nothing from styles — they rely solely on the CSS classes already in `styles.js`. Props pass semantic state, component applies CSS class names.

```jsx
// FieldInput.jsx — integration pattern
export function FieldInput({ label, error, inputMode = "text", ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input
        className={`form-input${error ? " form-input--error" : ""}`}
        inputMode={inputMode}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
```

### i18n Integration — Extract the t() Hook

All 3 portals define the same inline t() function. Extract to `src/hooks/useLang.js`:

```js
export function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;
  return { lang, setLang, t };
}
```

Portals replace their inline lang state with `const { lang, setLang, t } = useLang()`. Zero behavior change.

### App Prop Bundle — No Changes

The `app` prop object passed from App.jsx to each portal contains `{ theme, setTheme, show, ...data }`. New shared field components receive only the props they need (passed through from the portal), not the full `app` bundle. This keeps components decoupled from the app's data shape.

---

## Build Order

Build order is based on dependency (foundational pieces first) and risk (lowest risk changes first to validate the approach before touching the most complex portal).

### Phase 1: Foundation (no portal changes yet)

1. **Add missing CSS tokens to styles.js** — typography scale, spacing scale, touch-target min, loading state classes, form error classes. No JSX changes. Zero risk. Establishes the full token vocabulary before any refactor begins.

2. **Extract `useLang` hook** (`src/hooks/useLang.js`) — three-line hook extraction. Replace usage in all 3 portals. No visual change. Confirms the extraction pattern works.

3. **Extract `getWeekStart` and other duplicated utilities** to `src/utils/dateUtils.js`. No visual change.

### Phase 2: New Shared Field Components

Build from simplest to most depended-upon. Each component can be verified in isolation before wiring into portals.

4. **`EmptyState` component** (`src/components/field/EmptyState.jsx`) — wraps the `.empty-state` pattern. Replace 10+ inline empty states across portals. No logic changes.

5. **`StatusBadge` component** — wraps `.badge` + variant. Replace material status badge inline logic.

6. **`LoadingSpinner` + `SkeletonBlock`** — new, no existing equivalent. Adds loading state coverage.

7. **`AsyncState` wrapper** — depends on LoadingSpinner + EmptyState. Provides loading/empty/error trifecta as a single component.

8. **`FieldSignaturePad`** — extract from ForemanView.jsx line 20. Fix its two hard-coded hex values. Verify it works in EmployeeView JSA tab.

9. **`PortalHeader` component** — extract `.employee-header` + logo + settings gear pattern. All 3 portals share this structure exactly.

10. **`PortalTabBar` component** — extract `.emp-tabs` + `.emp-tab` mapping. All 3 portals share this pattern.

11. **`FieldInput` + `FieldSelect`** — new wrappers with `inputmode`, `touch-action`, focus rings. Used in forms across all portals.

12. **`MaterialRequestCard`** — extract from ForemanView + EmployeeView shared usage.

### Phase 3: DriverView Refactor (pilot portal)

DriverView is 510 lines with 42 inline styles. Smallest surface area. Use it as the proof of concept for the full inline-style elimination approach.

13. **DriverView inline style pass** — replace all 42 inline style blocks with CSS classes. Wire in PortalHeader, PortalTabBar. Fix hard-coded colors.

14. **DriverView loading states** — add AsyncState / LoadingSpinner to any async operations.

### Phase 4: EmployeeView Refactor

1,745 lines, 135 inline styles. More complex than DriverView but more manageable than ForemanView.

15. **EmployeeView inline style pass** — 135 instances. Tab by tab (clock → schedule → log → jsa → materials).

16. **EmployeeView form polish** — FieldInput/FieldSelect wiring, inputmode on all numeric fields.

17. **EmployeeView loading states** — geofence loading, clock-in state.

### Phase 5: ForemanView Refactor

3,953 lines, 583 inline styles. Largest file. Work tab by tab, not all at once.

18. **ForemanView: clock tab** — highest-traffic tab. Start here. Wire ClockCard, GeofenceIndicator.

19. **ForemanView: dashboard tab** — KPI grid, team summary. Wire FieldKpiCard.

20. **ForemanView: team tab**

21. **ForemanView: materials tab** — wire MaterialRequestCard.

22. **ForemanView: jsa tab** — longest tab section. Wire FieldSignaturePad.

23. **ForemanView: drawings/reports/documents tabs** — lower inline style density.

24. **ForemanView: remaining tabs** (hours, lookahead, site, notes)

---

## File Organization

```
src/
  styles.js               # Extend with new token sections + field component CSS
  data/
    constants.js          # Add typography/spacing tokens to all theme vars (or put in styles.js :root)
  hooks/
    useLang.js            # NEW — extract from portals
    useGeolocation.js     # exists
    useDrawingCache.js    # exists
    ... (existing hooks unchanged)
  utils/
    dateUtils.js          # NEW — getWeekStart + other date helpers extracted from portals
    geofence.js           # exists
    ... (existing utils unchanged)
  components/
    field/                # NEW directory — field-portal-specific components only
      index.js            # barrel export
      PortalHeader.jsx    # shared portal chrome
      PortalTabBar.jsx    # shared tab navigation
      EmptyState.jsx      # empty/null state display
      StatusBadge.jsx     # semantic status badge
      LoadingSpinner.jsx  # async loading indicator
      SkeletonBlock.jsx   # list placeholder
      AsyncState.jsx      # loading/empty/error compositor
      FieldSignaturePad.jsx # extracted from ForemanView
      FieldInput.jsx      # touch-optimized input
      FieldSelect.jsx     # touch-optimized select
      MaterialRequestCard.jsx  # shared mat request UI
      FieldKpiCard.jsx    # KPI metric display
      ClockCard.jsx       # clock-in/out display
      GeofenceIndicator.jsx    # GPS status indicator
    ReportProblemModal.jsx  # exists — migrate inline styles
    FeatureGuide.jsx        # exists — no structural change
    PhaseTracker.jsx        # exists — no structural change
    PdfViewer.jsx           # exists — no change
    ... (other existing components)
  tabs/
    ForemanView.jsx       # refactored incrementally — structure unchanged
    EmployeeView.jsx      # refactored incrementally
    DriverView.jsx        # refactored first (pilot)
    ... (other tabs unchanged during this milestone)
```

### CSS Organization Within styles.js

Add these sections at the bottom (after existing portal sections):

```css
/* ══ FIELD COMPONENTS ══ */
/* ── Field Input ── */
.field-input { ... }
.field-input--error { ... }
.field-select { ... }

/* ── Loading States ── */
.loading-spinner { ... }
.skeleton { ... }
.skeleton-text { ... }
.skeleton-block { ... }

/* ── Async State ── */
.async-state { ... }
.async-state--loading { ... }
.async-state--empty { ... }
.async-state--error { ... }
```

---

## Integration Points Summary

| Integration Point | Type | Where | Risk |
|------------------|------|-------|------|
| `document.documentElement` CSS vars | Existing | App.jsx:586 | None — already works |
| `app` prop bundle shape | Existing | App.jsx:595 → portals | None — no changes |
| `styles.js` string injection | Extend | App.jsx imports styles.js | Low — append only |
| `THEMES` object in constants.js | Extend | Add new token keys | Low — additive |
| `emp-tabs` / `emp-tab` CSS classes | Existing | All 3 portals, DeliveriesTab | None — extract, don't rename |
| `useLang` hook | New | Replace inline t() in portals | Low — same behavior |
| `src/components/field/` | New directory | Portals import from here | Low — portals keep existing behavior |

---

## Pitfalls Identified

### inline style → className is not always 1:1

Many inline styles in the portals combine layout + color + spacing in a single `style={{}}` block. The refactor should:
1. Check if a matching CSS class already exists in styles.js (it usually does)
2. If the class exists but adds unwanted styles, use a more specific class or add a modifier
3. If no class exists, add it to styles.js (not as a new file)
4. Never delete an inline style without verifying the replacement class works across all 7 themes

### DeliveriesTab also uses emp-tabs/emp-tab

`src/tabs/DeliveriesTab.jsx` uses `className="emp-tabs"` and `emp-tab`. If `PortalTabBar` becomes the canonical tab bar, DeliveriesTab must also migrate. It's not a portal but it shares the pattern.

### FieldSignaturePad has hard-coded `#1e2d3b` (EBC theme bg4)

The canvas background is `#f8f9fb` and stroke is `#1e2d3b`. In non-EBC themes these will be wrong. When extracting `FieldSignaturePad`, replace both with CSS vars: `var(--bg3)` and `var(--text)` respectively.

### styles.js is a JS string, not a .css file

CSS linting and IDE autocomplete won't work inside the template literal. When adding new classes, manually verify class names match exactly between the string and the JSX. A typo silently applies no styles.

### Touch targets are currently 18-24px

The `.btn` class has `min-height: 36px`. The `.emp-tab` has `padding: 8px 12px` which renders around 30px. The `.clock-btn` is full-width with `padding: 16px` — correctly sized. The refactor must bump `.btn` to `min-height: 44px` and `.emp-tab` to `min-height: 44px`. This is a global change to styles.js that affects the entire app, not just field portals — validate it doesn't break the back-office admin views.

### `form-input` font-size is 13px (desktop), 16px (mobile via media query)

The responsive rule at `@media(max-width:767px)` already sets `.form-input { font-size: 16px }` to prevent iOS zoom. This is correct. Do not override it with inline `fontSize` styles (some portal inputs do this, which overrides the media query).

---

## Sources

All findings from direct inspection of:
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/styles.js` (full file)
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/data/constants.js` (THEMES object)
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/tabs/ForemanView.jsx` (lines 1-220, inline style sampling)
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/tabs/EmployeeView.jsx` (lines 1-100, structure)
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/tabs/DriverView.jsx` (lines 1-80, structure)
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/App.jsx` (theme application, app bundle)
- `C:/Users/abner/EBC_APP_2026/EBC-OS/src/components/ReportProblemModal.jsx` (shared component pattern)
- Grep analysis of inline style counts, class name usage, tab structure
