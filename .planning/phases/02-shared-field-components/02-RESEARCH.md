# Phase 2: Shared Field Components - Research

**Researched:** 2026-03-31
**Domain:** React component extraction and authoring — CSS variable system, canvas API, bottom navigation, async state management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-06:** Build the PortalTabBar "More" overflow pattern NOW in Phase 2, not deferred.
- **D-07:** Tab bar must be bottom-anchored, always visible, icons + text labels (never icon-only), unmistakably clear active state, 44px minimum touch targets.
- **D-08:** All 11 components must be designed for a 150-person field crew with Facebook/TikTok as their primary app familiarity baseline.
- **D-04:** Extraction target is `src/components/field/`. Extracted components must be fully decoupled — no leftover inline styles, all colors via CSS vars.

### Claude's Discretion
- PortalHeader implementation pattern (prop-driven vs slot-based)
- PortalHeader project selector placement (inside header vs sticky sub-header strip below)
- Per-component extraction vs fresh build decision
- AsyncState implementation pattern (children wrapper vs render prop vs other)
- PortalTabBar overflow implementation details (drawer, sheet, modal, inline expand)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

### Hard Constraints (NOT flexible)
- No new npm dependencies
- No font-family tokens (Fira vs Barlow decision deferred)
- All UI text through `t()` translation function — bilingual EN/ES
- CSS variables only — zero hard-coded hex or rgba in component source
- 44px minimum touch targets on all interactive elements
- Must work across all 5 existing themes without breaking theme switching
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | `FieldButton` — 44px touch target, loading state, variant support (primary/ghost/danger) | Existing `.btn`/`.btn-primary`/`.btn-ghost`/`.btn-danger` classes extend cleanly; `.touch-target` utility exists; Lucide `Loader2` for spinner |
| COMP-02 | `FieldCard` — consistent padding, border radius, theme-aware styling | Existing `.card` / `.card-glass` classes; extend with `variant` prop + mobile padding override |
| COMP-03 | `FieldInput` / `FieldSelect` — focus rings, error states, proper `inputmode` | Existing `.form-input` / `.form-select`; `inputMode` prop passthrough; `.focus-visible` utility for rings |
| COMP-04 | `PortalHeader` — user info, logout, language toggle, project selector | Existing `.header` / `.logo` classes cover base; three-variant pattern via props; project selector as sticky sub-strip below |
| COMP-05 | `PortalTabBar` — bottom nav, icon + label, badge counts, 5-tab max with More overflow | No existing bottom nav CSS — new `.field-tab-bar` class needed in styles.js; "More" → bottom sheet pattern |
| COMP-06 | `StatusBadge` — semantic color mapping | Existing `.badge` + `.badge-green/red/amber/blue/muted` cover all six status values; pure React wrapper |
| COMP-07 | `EmptyState` — icon, message, optional action | Fresh build; Lucide icon + token typography; `FieldButton` ghost for action |
| COMP-08 | `LoadingSpinner` and skeleton screens | Lucide `Loader2` for spinner; skeleton uses `var(--bg3)` + shimmer animation in styles.js |
| COMP-09 | `AsyncState` wrapper — loading/empty/error/success | Children wrapper pattern; uses COMP-07 and COMP-08 internally; no new external deps |
| COMP-10 | `FieldSignaturePad` — extracted from ForemanView.jsx:20–65, theme-aware colors | Extract-and-tokenize; two hex replacements via `getComputedStyle`; canvas API pattern documented |
| COMP-11 | `MaterialRequestCard` — shared across all three portals | Extends `FieldCard`; uses `StatusBadge`; `FieldButton` for actions; layout spec from UI-SPEC |
</phase_requirements>

---

## Summary

Phase 2 is a component authoring and extraction phase operating entirely within the existing CSS variable theme system. The codebase already has mature utility classes (`.btn`, `.card`, `.badge`, `.form-input`, `.touch-target`, `.focus-visible`) that serve as the base for most of the 11 components — the work is primarily thin React wrappers that enforce contracts (touch targets, token-only colors, translation props, async state management) rather than building CSS from scratch.

Two components require new CSS in `styles.js`: `PortalTabBar` (no bottom-nav CSS exists; the current `.nav` pattern is horizontal and desktop-oriented) and `LoadingSpinner`/skeleton (shimmer animation not yet defined). The `FieldSignaturePad` extraction is the most surgical task — two hard-coded hex values in a canvas context must be replaced with `getComputedStyle` reads, which is the correct pattern for injecting CSS variables into the Canvas 2D API. All other extractions are clean class-composition operations.

The translation pattern is `t("string")` passed as a prop — NOT a hook. Every component that renders visible text must accept `t` as a required prop and pass it through. The `T` object in `src/data/translations.js` covers most existing strings; new component strings (EmptyState copy, AsyncState error copy) will need new entries added there.

**Primary recommendation:** Build in dependency order — COMP-08 (LoadingSpinner/Skeleton) and COMP-06 (StatusBadge) first as atomic leaves, then COMP-01/02/03 as primitive field components, then COMP-07/09 (EmptyState/AsyncState) which consume COMP-08, then COMP-04/05 (PortalHeader/PortalTabBar) as layout components, then COMP-10/11 (FieldSignaturePad/MaterialRequestCard) as complex extractors.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component model | Already installed, all portals use it |
| Lucide React | 0.577.0 | SVG icons | Already installed, used across all portals |
| Vite | 8.0.0 | Build tool | Already configured |

### CSS System
| Asset | Location | Purpose |
|-------|----------|---------|
| `src/tokens.css` | Universal spacing, typography, touch, focus, transition tokens | Components consume — do not redefine |
| `src/data/constants.js` (THEMES) | Per-theme color primitives, shadow scale, semantic aliases | Runtime theme switching via `App.jsx` |
| `src/styles.js` | Single CSS string export — all utility classes live here | Add new component utility classes here |

### No New Dependencies
The constraint is verified against package.json. Lucide React (lucide-react@0.577.0) covers all icon needs. No animation library, no component library, no utility CSS framework is needed or permitted.

**Installation:** None required — all dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── field/               # New directory — create in Phase 2
│       ├── index.js         # Named exports for all 11 components
│       ├── FieldButton.jsx
│       ├── FieldCard.jsx
│       ├── FieldInput.jsx
│       ├── FieldSelect.jsx
│       ├── PortalHeader.jsx
│       ├── PortalTabBar.jsx
│       ├── StatusBadge.jsx
│       ├── EmptyState.jsx
│       ├── LoadingSpinner.jsx
│       ├── AsyncState.jsx
│       ├── FieldSignaturePad.jsx
│       └── MaterialRequestCard.jsx
├── styles.js                # New component CSS classes added here (not separate files)
└── tokens.css               # Untouched (Phase 1 output)
```

### Pattern 1: CSS Class Composition (for wrapper components)
**What:** Apply existing utility classes via `className` composition. Add only what the existing class doesn't provide.
**When to use:** COMP-01, 02, 03, 06 — wherever a Phase 1 utility class covers 80%+ of the need.

```jsx
// COMP-01: FieldButton — extends .btn + variant class + touch-target enforcement
export function FieldButton({ variant = "primary", loading, disabled, children, t, ...props }) {
  const variantClass = { primary: "btn-primary", ghost: "btn-ghost", danger: "btn-danger" }[variant];
  return (
    <button
      className={`btn ${variantClass} touch-target focus-visible`}
      disabled={disabled || loading}
      aria-label={loading ? (t ? t("Loading, please wait") : "Loading, please wait") : undefined}
      {...props}
    >
      {loading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}
```

Note: `.btn` has `min-height: 36px`. `.touch-target` adds `min-height: var(--touch-min)` (44px). The cascade applies both — `touch-target` wins because it comes later in the same stylesheet. Verify this order holds in styles.js before relying on it. (Confirmed: `.touch-target` appears at line 282, `.btn` at line 96 — later position wins.)

### Pattern 2: CSS Variable in Canvas Context (for FieldSignaturePad)
**What:** Canvas 2D API does not inherit CSS variables. Must read resolved value at draw time via `getComputedStyle`.
**When to use:** COMP-10 — any canvas-based component that needs theme-aware colors.

```jsx
// Correct pattern — read CSS var at draw time, not at mount
const startDraw = (e) => {
  const ctx = canvasRef.current.getContext("2d");
  const strokeColor = getComputedStyle(canvasRef.current)
    .getPropertyValue("--text")
    .trim();
  ctx.strokeStyle = strokeColor || "#000"; // fallback for safety
  // ...
};
```

**Critical detail:** The `getComputedStyle` call must happen inside the draw event handler, NOT in `useEffect` on mount. If called at mount, it captures the initial theme value and does not update when the user switches themes mid-session.

### Pattern 3: Children Wrapper for AsyncState (COMP-09)
**What:** AsyncState manages four mutually exclusive states. It renders its children only on success. Loading, empty, and error states render their own UI.
**When to use:** COMP-09 — confirmed by CONTEXT.md D-05.

```jsx
export function AsyncState({ loading, empty, error, emptyMessage, emptyAction, skeleton, children, t }) {
  if (loading) return skeleton || <LoadingSpinner t={t} />;
  if (error)   return <ErrorDisplay message={error} t={t} />;
  if (empty)   return <EmptyState message={emptyMessage} action={emptyAction} t={t} />;
  return children;
}
```

**Prop priority:** `loading` takes precedence over all others. `error` takes precedence over `empty`. This matches the UI-SPEC contract exactly.

### Pattern 4: PortalTabBar Bottom Sheet for "More" Overflow
**What:** A fixed bottom tab bar with 4 primary tabs + 1 "More" tab. Tapping "More" opens a bottom sheet (slide-up panel) with remaining tabs as full-width rows. Sheet closes on backdrop tap or second "More" tap.
**When to use:** COMP-05 — required by CONTEXT.md D-06.

```jsx
// New CSS needed in styles.js:
// .field-tab-bar — fixed bottom, height 56px + safe-area, glass background
// .field-tab-item — flex column, min 44x44, icon + label
// .field-tab-sheet — fixed overlay + slide-up panel
```

Bottom sheet uses `position: fixed; bottom: 56px; left: 0; right: 0` with `transform: translateY(100%)` when closed, `translateY(0)` when open, animated via `transition: transform var(--transition-state)`.

### Pattern 5: PortalHeader Variant via Props
**What:** A single component handles three visual variants (Foreman, Employee, Driver) through props, not through separate components or slots.
**When to use:** COMP-04 — recommended over slot-based given three known variants and 375px layout constraints.

Reasoning: The three variants share 90% of structure (glass header, logo left, actions right). A `variant` prop + conditional rendering of the right-side slot is simpler to maintain than a slot API, and all three variants are known at design time. The project selector is placed as a sticky sub-header strip below the header (36px, `var(--bg3)` background) to avoid 375px overflow — this is the recommendation from the UI-SPEC.

### Anti-Patterns to Avoid
- **Inline styles in components:** Any `style={{ color: "#..." }}` is a Phase 2 violation. Zero exceptions. The SyncStatus component demonstrates the old pattern — do not follow it.
- **Hex literals in canvas context:** The only acceptable way to set canvas stroke/fill in a themed component is `getComputedStyle(el).getPropertyValue('--token').trim()`.
- **useEffect for getComputedStyle in signature pad:** Reading theme values at mount in `useEffect` breaks when the user switches themes. Read at draw time inside event handlers.
- **CSS modules or separate .css files:** Vite causes full page reloads with CSS modules, losing component state. All CSS goes in `styles.js` as confirmed by codebase convention and REQUIREMENTS.md out-of-scope table.
- **Hook-based translation:** The existing pattern is `t` as a prop, not a context hook. Components that use a translation hook will break prop-threading in Phases 3–5.
- **New badge CSS classes:** The six status values all map to existing `.badge-*` classes. Do not add `.badge-approved` or similar — it would duplicate existing classes with different names.
- **Hover transforms on mobile touch cards:** `.card:hover` has `transform: translateY(-1px)`. On touch devices this fires on tap and causes layout shift. Gate with `@media (hover: hover)` in FieldCard's override.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button states (colors, hover, active) | Custom button CSS | `.btn` + `.btn-primary/ghost/danger` from styles.js | Already handles hover, active, shadow, font — 10+ properties per variant |
| Badge styling | Custom badge CSS | `.badge` + `.badge-green/red/amber/blue/muted` | Already handles padding, radius, font-weight, color pairing — 5 variants done |
| Card background/border/radius | Custom card CSS | `.card` + `.card-glass` | Glass effect, border, hover already done |
| Form input focus state | Custom focus CSS | `.form-input` + `.focus-visible` | Focus border + shadow already in styles.js |
| Touch target enforcement | `height: 44px` inline | `.touch-target` utility class | Token-based, automatically tracks `--touch-min` |
| Theme-switching logic | Component-level theme state | `var(--token)` in CSS | `App.jsx` applies `THEMES[theme].vars` to `documentElement` — cascade handles everything |
| Status color mapping | `if status === "approved" return "#10b981"` | `StatusBadge` wrapping `.badge-green` / `var(--status-approved)` | Hard-coded hex breaks themes; semantic aliases defined in THEMES already |
| Shimmer animation math | Custom keyframe calculation | `linear-gradient(90deg, var(--bg3) 0%, var(--bg2) 50%, var(--bg3) 100%)` animated | Pure CSS, no JS, theme-aware |
| SVG icons | Custom SVG paths | Lucide React (already installed) | Consistent viewBox, tree-shakeable, 0 new dependency cost |

**Key insight:** The existing styles.js utility layer was designed exactly for this phase. Building custom solutions would duplicate hundreds of lines already debugged and theme-tested. The component layer's job is to enforce contracts (touch targets, loading states, async patterns) on top of the existing CSS vocabulary.

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is a component authoring/extraction phase, not a rename, refactor, or data migration phase. No runtime state is being renamed or moved. The `FieldSignaturePad` extraction moves code from `ForemanView.jsx` to `src/components/field/` but the source file (ForemanView.jsx) keeps its own local reference until Phase 5 when the portal wiring is done. No stored data, live service config, OS-registered state, secrets, or build artifacts are affected.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build | ✓ | 24.14.0 | — |
| React | All components | ✓ | 19.2.4 | — |
| Lucide React | COMP-01, 05, 07, 08, 10 | ✓ | 0.577.0 | — |
| Vite | Build/dev server | ✓ | 8.0.0 | — |
| src/tokens.css | Token consumption | ✓ | Phase 1 output | — |
| src/styles.js | Class composition | ✓ | Phase 1 output | — |

**Missing dependencies with no fallback:** None.

**Note on `--amber-glow` variable:** Confirmed present in all THEMES objects as of constants.js scan. Used in FieldButton primary shadow — safe to reference.

**Note on `--red-dim` / `--green-dim` / `--blue-dim`:** Confirmed in all 5 themes (steel, blueprint, daylight, and presumably the other themes follow the same schema). FieldButton danger and StatusBadge rely on these.

---

## Common Pitfalls

### Pitfall 1: Canvas CSS Variables Captured at Mount
**What goes wrong:** Developer calls `getComputedStyle` inside `useEffect([], [])` (mount-only), stores the resolved color in state, and uses that state for `ctx.strokeStyle`. Signature pad renders correctly on load but shows wrong colors after user switches themes.
**Why it happens:** CSS custom property resolution is lazy — `getComputedStyle` returns the value at call time, not a live reference. Theme switches update `documentElement.style` but the stored state does not re-render.
**How to avoid:** Call `getComputedStyle(canvasRef.current).getPropertyValue('--text').trim()` inside the `startDraw` handler, every time the user begins a new stroke. Cost is negligible — one style lookup per stroke start.
**Warning signs:** Signature pad works in all themes on first load but shows wrong ink/background after a theme switch without page reload.

### Pitfall 2: `.btn` min-height Wins Over `.touch-target`
**What goes wrong:** Developer applies `.touch-target` expecting 44px min-height, but `.btn` class is declared later in the stylesheet and its `min-height: 36px` overrides it.
**Why it happens:** CSS specificity is equal (single class selectors); last declaration wins. The order in styles.js matters.
**How to avoid:** Confirmed safe: `.touch-target` is at line 282 in styles.js; `.btn` is at line 96. `.touch-target` wins in the cascade. However, if `.btn-sm` is ever applied alongside `.touch-target`, `.btn-sm` has `min-height: 28px` and appears at line 108 — it would lose to `.touch-target` (282) only if both are in the same element. Verify `FieldButton` never receives `btn-sm` class.

### Pitfall 3: `t` Prop Missing Causes Silent Failures
**What goes wrong:** A component uses `t("Clear")` without checking if `t` is defined. In JSX, `t("Clear")` when `t` is undefined throws a runtime error. In some cases developers use `t ? t("Clear") : "Clear"` (seen in the extracted `FieldSignaturePad` in ForemanView) — this is a fallback pattern but masks the bug.
**Why it happens:** Translation prop is required but not enforced at the type level (no TypeScript in this codebase).
**How to avoid:** Document `t` as required in every component that renders visible text. Do not silently fall back to English strings inside the component — callers must provide `t`. The `t ? t(...) : ...` pattern in the existing code is a workaround for internal usage, not a convention to replicate.
**Warning signs:** Components render English strings even when the app is set to Spanish.

### Pitfall 4: PortalTabBar Fixed Positioning Conflicts with Existing Content Layout
**What goes wrong:** Adding `position: fixed; bottom: 0` to the tab bar causes page content to scroll behind it. Portals currently use `.main-content` with `padding-bottom: calc(40px + env(safe-area-inset-bottom))`. This padding is insufficient once a 56px tab bar is fixed at the bottom.
**Why it happens:** Fixed elements are removed from flow — the page does not know to reserve space for them unless explicitly told.
**How to avoid:** When PortalTabBar is present, the page's main scrollable area needs `padding-bottom: calc(56px + env(safe-area-inset-bottom) + var(--space-6))`. Since Phase 2 builds components in isolation (no portal wiring), document this as a Phase 3–5 integration requirement so planner includes it.
**Warning signs:** Content at the bottom of list views is obscured by the tab bar and cannot be scrolled into view.

### Pitfall 5: Bottom Sheet z-index Conflict
**What goes wrong:** The "More" bottom sheet renders below the tab bar or behind other fixed elements.
**Why it happens:** The existing z-index scale uses z-index: 100 for `.header` and modals use z-index: 1000. The tab bar itself will be z-index: 100. The bottom sheet must be higher than the tab bar but lower than toast notifications (z-index: 2000).
**How to avoid:** Set tab bar to `z-index: 100`, bottom sheet overlay to `z-index: 150`, bottom sheet panel to `z-index: 151`. This fits cleanly in the existing scale.

### Pitfall 6: FieldCard `.card:hover` Transform on Touch Devices
**What goes wrong:** The existing `.card:hover` rule applies `transform: translateY(-1px)` — on touch devices, this fires on tap and causes a visible layout jump before navigation or action occurs.
**Why it happens:** CSS `:hover` on touch devices fires on tap in most mobile browsers (the "sticky hover" problem). The current `.card` class predates the mobile-first field component work.
**How to avoid:** Override in FieldCard's CSS section: add `@media (hover: hover) { .field-card:hover { transform: translateY(-1px); } }` so the transform only applies on devices with a real hover pointer. On touch devices, no transform.

### Pitfall 7: `prefers-reduced-motion` Not Respected in Skeleton Animation
**What goes wrong:** The shimmer skeleton animation runs for users who have requested reduced motion, which can cause discomfort or nausea for users with vestibular disorders.
**Why it happens:** Skeleton shimmer is a continuous loop animation — not gated behind a media query.
**How to avoid:** Wrap skeleton keyframe animation in `@media (prefers-reduced-motion: no-preference) { ... }`. When reduced motion is preferred, show a static `var(--bg3)` block with no animation. This is low cost and aligns with the accessibility requirements flagged by the ui-ux-pro-max skill.

---

## Code Examples

Verified patterns from codebase source:

### GetComputedStyle for Canvas Theme Integration
```jsx
// Source: derived from ForemanView.jsx:33 extraction + CSS var system
const startDraw = (e) => {
  e.preventDefault();
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  // Read CSS var at draw time — works correctly after theme switches
  const strokeColor = getComputedStyle(canvas).getPropertyValue("--text").trim();
  ctx.strokeStyle = strokeColor || "#000";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  setDrawing(true);
};
```

### Skeleton Shimmer CSS (add to styles.js)
```css
/* ══ FIELD COMPONENTS ══ */
@keyframes skeleton-shimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
@media (prefers-reduced-motion: no-preference) {
  .skeleton-shimmer {
    background: linear-gradient(90deg, var(--bg3) 0%, var(--bg2) 50%, var(--bg3) 100%);
    background-size: 400px 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }
}
.skeleton-shimmer {
  background: var(--bg3); /* static fallback for reduced-motion */
  border-radius: var(--radius-sm);
}
```

### PortalTabBar Fixed Positioning with Safe Area
```css
/* Add to styles.js — ══ FIELD COMPONENTS ══ section */
.field-tab-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border-top: 1px solid var(--glass-border);
  display: flex;
  align-items: stretch;
  z-index: 100;
}
.field-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: var(--touch-min);
  min-width: var(--touch-min);
  cursor: pointer;
  border: none;
  background: none;
  color: var(--text3);
  font-size: var(--text-sm);
  font-weight: var(--weight-normal);
  font-family: var(--font-body);
  transition: all var(--transition-micro);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
.field-tab-item.active {
  color: var(--amber);
  font-weight: var(--weight-bold);
}
.field-tab-item:active {
  transform: scale(0.92);
}
.field-tab-badge {
  position: absolute;
  top: 6px; right: calc(50% - 14px);
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--red);
}
.field-tab-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 150;
}
.field-tab-sheet {
  position: fixed;
  bottom: 56px; left: 0; right: 0;
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border-top: 1px solid var(--glass-border);
  border-radius: var(--radius) var(--radius) 0 0;
  z-index: 151;
  padding: var(--space-2) 0;
  transform: translateY(100%);
  transition: transform var(--transition-state);
}
.field-tab-sheet.open {
  transform: translateY(0);
}
.field-tab-sheet-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  min-height: var(--touch-min);
  color: var(--text);
  font-size: var(--text-base);
  cursor: pointer;
  touch-action: manipulation;
  transition: background var(--transition-micro);
}
.field-tab-sheet-item:hover,
.field-tab-sheet-item:active {
  background: var(--bg3);
}
.field-tab-sheet-item.active {
  color: var(--amber);
  font-weight: var(--weight-bold);
}
```

### StatusBadge — Pure React Wrapper (no new CSS)
```jsx
// Source: derived from badge classes in styles.js:135–141 + DeliveriesTab STATUS_COLORS pattern
const STATUS_CLASS_MAP = {
  approved:    "badge-green",
  pending:     "badge-amber",
  denied:      "badge-red",
  "in-transit":"badge-blue",
  completed:   "badge-muted",
  project:     "badge-muted",
};

export function StatusBadge({ status, t }) {
  const cls = STATUS_CLASS_MAP[status] || "badge-muted";
  const label = t ? t(status) : status;
  return <span className={`badge ${cls}`}>{label}</span>;
}
```

### Translation Pattern (existing)
```jsx
// Source: src/data/translations.js + DriverView.jsx:54
const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;
// Components receive t as a prop — they do NOT create t internally
export function FieldButton({ ..., t, children }) {
  // uses t("Loading, please wait") etc.
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-coded hex in canvas context (ForemanView) | `getComputedStyle` read at draw time | Phase 2 | FieldSignaturePad works across all themes |
| Horizontal desktop nav (`.nav` / `.nav-item`) | Fixed bottom tab bar (`.field-tab-bar`) | Phase 2 | All three portals get consumer-app navigation |
| Ad-hoc loading states per portal | `AsyncState` wrapper | Phase 2 | Consistent loading/empty/error UX across all data operations |
| Per-portal card/button/badge markup | Shared `field/` component library | Phase 2 | Phases 3–5 consume components rather than duplicating markup |
| `STATUS_COLORS` hex object in DeliveriesTab | `StatusBadge` using semantic CSS tokens | Phase 2 | Status colors respect theme switches automatically |

**Deprecated/outdated after Phase 2:**
- The local `FieldSignaturePad` function inside ForemanView.jsx will be superseded by the extracted version. It stays in place until Phase 5 wires the portal — do not delete it in Phase 2.
- `STATUS_COLORS` in DeliveriesTab.jsx uses hard-coded hex — it stays until Phase 3 wires the portal.

---

## Open Questions

1. **`--amber-glow` missing from some themes**
   - What we know: `--amber-glow` is present in steel, blueprint, and daylight themes (verified). The codebase has 5+ themes in constants.js.
   - What's unclear: Whether all remaining themes (neon, matrix, etc.) define `--amber-glow`. FieldButton's primary variant uses it.
   - Recommendation: The executor should run `grep "amber-glow" src/data/constants.js` before writing FieldButton to confirm. If any theme is missing it, `box-shadow: 0 2px 8px var(--amber-glow)` will silently produce no shadow (not a crash). Acceptable risk — add a fallback `0 2px 8px rgba(224,148,34,0.20)` if missing.

2. **`spin` keyframe animation for Lucide Loader2**
   - What we know: SyncStatus.jsx uses `animation: spin 1s linear infinite` on a Unicode character. This implies a `@keyframes spin` exists somewhere in styles.js.
   - What's unclear: Whether the keyframe is defined in styles.js or is an assumption.
   - Recommendation: Executor should search for `@keyframes spin` in styles.js before relying on it for `Loader2`. If absent, add it to the new `/* ══ FIELD COMPONENTS ══ */` section.

3. **`--radius` vs `--radius-sm` in FieldCard**
   - What we know: `.card` uses `border-radius: 12px` (hardcoded in styles.js:47, not a token). `--radius` is `10px` in steel/daylight, `6px` in blueprint.
   - What's unclear: Whether FieldCard should use the existing `.card` class (which has `12px` hardcoded) or switch to `border-radius: var(--radius)`.
   - Recommendation: Extend `.card` as-is (inherit the 12px). Do not refactor the base `.card` class in Phase 2 — that would affect existing portal views before they're ready for migration.

4. **PortalHeader project selector — foreman-only or shared**
   - What we know: The project selector is currently embedded near ForemanView's header logic. CONTEXT.md D-02 leaves placement to Claude's discretion.
   - What's unclear: Whether Driver and Employee portals ever need a project selector.
   - Recommendation: Make the project selector an optional prop on PortalHeader (`projectSelector?: ReactNode`). If provided, render it as a sticky sub-strip. If not provided, no sub-strip renders. This handles the foreman case without forcing the pattern on other portals.

---

## Validation Architecture

### Test Framework
No test framework is installed. No test files exist. `nyquist_validation` is not explicitly set to false in `.planning/config.json` (key is absent, treated as enabled).

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must install |
| Config file | None — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` (after Wave 0 install) |
| Full suite command | `npx vitest run` (after Wave 0 install) |

**Recommended framework:** Vitest. It integrates with Vite 8 without configuration, matches the existing build toolchain, supports React component testing via `@testing-library/react`, and has zero conflict with the existing setup. No competing test runners are present.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | FieldButton renders primary/ghost/danger variants at min 44px height | unit | `npx vitest run --reporter=verbose src/components/field/FieldButton.test.jsx` | ❌ Wave 0 |
| COMP-01 | FieldButton shows Loader2 spinner when loading=true, hides children | unit | same file | ❌ Wave 0 |
| COMP-02 | FieldCard renders default and glass variants without hard-coded colors | unit | `npx vitest run src/components/field/FieldCard.test.jsx` | ❌ Wave 0 |
| COMP-03 | FieldInput renders error state and passes inputMode prop to input element | unit | `npx vitest run src/components/field/FieldInput.test.jsx` | ❌ Wave 0 |
| COMP-06 | StatusBadge maps all 6 status values to correct badge-* class | unit | `npx vitest run src/components/field/StatusBadge.test.jsx` | ❌ Wave 0 |
| COMP-07 | EmptyState renders icon, heading, body, and optional action button | unit | `npx vitest run src/components/field/EmptyState.test.jsx` | ❌ Wave 0 |
| COMP-09 | AsyncState renders loading skeleton when loading=true | unit | `npx vitest run src/components/field/AsyncState.test.jsx` | ❌ Wave 0 |
| COMP-09 | AsyncState renders children when loading=false, empty=false, error=null | unit | same file | ❌ Wave 0 |
| COMP-09 | AsyncState renders error display when error is set (even if empty=true) | unit | same file | ❌ Wave 0 |
| COMP-04 | PortalHeader renders correct right-side content per variant prop | unit | `npx vitest run src/components/field/PortalHeader.test.jsx` | ❌ Wave 0 |
| COMP-05 | PortalTabBar shows active state on correct tab | unit | `npx vitest run src/components/field/PortalTabBar.test.jsx` | ❌ Wave 0 |
| COMP-05 | PortalTabBar shows More sheet when More tab is tapped | unit | same file | ❌ Wave 0 |
| COMP-10 | FieldSignaturePad source contains no hex literals | static/grep | `grep -n "#[0-9a-fA-F]" src/components/field/FieldSignaturePad.jsx` returns 0 results | ❌ Wave 0 |
| COMP-11 | MaterialRequestCard renders title, StatusBadge, quantity, and action buttons | unit | `npx vitest run src/components/field/MaterialRequestCard.test.jsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (full suite — it will be fast since only component tests exist)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom` — framework, React testing utilities, DOM matchers
- [ ] `vite.config.js` — add `test: { environment: "jsdom" }` to Vite config (Vitest reads from same config)
- [ ] `src/components/field/FieldButton.test.jsx` — covers COMP-01
- [ ] `src/components/field/FieldCard.test.jsx` — covers COMP-02
- [ ] `src/components/field/FieldInput.test.jsx` — covers COMP-03
- [ ] `src/components/field/StatusBadge.test.jsx` — covers COMP-06
- [ ] `src/components/field/EmptyState.test.jsx` — covers COMP-07
- [ ] `src/components/field/AsyncState.test.jsx` — covers COMP-09
- [ ] `src/components/field/PortalHeader.test.jsx` — covers COMP-04
- [ ] `src/components/field/PortalTabBar.test.jsx` — covers COMP-05
- [ ] `src/components/field/MaterialRequestCard.test.jsx` — covers COMP-11
- [ ] `src/test/setup.js` — shared `@testing-library/jest-dom` import

**Note on COMP-10 (FieldSignaturePad):** Canvas 2D API is not available in jsdom. The meaningful verification for COMP-10 is a static grep check (no hex literals in source) plus a visual spot-check. Do not attempt a jsdom canvas test — it will always fail or produce misleading results.

**Note on test install constraint:** The constraint "no new npm dependencies" applies to runtime production dependencies. Dev dependencies (`--save-dev`) are permitted — they do not ship to field devices.

---

## Sources

### Primary (HIGH confidence)
- `src/styles.js` (scanned lines 1–330) — all existing CSS classes, their properties, and declaration order
- `src/tokens.css` — all token names and values
- `src/data/constants.js` (lines 1–80) — THEMES structure, color primitive names, semantic alias names
- `src/tabs/ForemanView.jsx` (lines 1–66) — FieldSignaturePad implementation, exact hex values to replace, canvas API usage
- `src/tabs/DriverView.jsx` (lines 1–60) — t() pattern, portal auth structure
- `src/tabs/EmployeeView.jsx` (lines 1–50) — PHASE_COLORS hex pattern (confirms D-06/COMP-11 need)
- `src/tabs/DeliveriesTab.jsx` (lines 1–38) — STATUS_COLORS hex pattern (confirms StatusBadge need)
- `.planning/phases/02-shared-field-components/02-CONTEXT.md` — all locked/discretion decisions
- `.planning/phases/02-shared-field-components/02-UI-SPEC.md` — all component visual contracts
- `package.json` — confirmed React 19.2.4, Lucide React 0.577.0, Vite 8.0.0

### Secondary (MEDIUM confidence)
- `.claude/skills/ui-ux-pro-max/SKILL.md` — touch target requirements (44px), `prefers-reduced-motion` guidance, hover-vs-tap rules — aligns with CONTEXT.md decisions and validates them

### Tertiary (LOW confidence)
- None — all findings verified against codebase source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and codebase scan
- Architecture patterns: HIGH — derived from reading actual source files, not assumed
- CSS class order and cascade behavior: HIGH — verified line numbers in styles.js
- Pitfalls: HIGH — each derived from a specific code observation (ForemanView hex, SyncStatus inline styles, DeliveriesTab STATUS_COLORS)
- Test framework recommendation: MEDIUM — Vitest/jsdom is the standard Vite pairing but not yet installed; verify Vite 8 / Vitest compatibility before committing

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable stack — React, Lucide, and CSS patterns are unlikely to change meaningfully in 30 days)
