# Phase 1: Token Foundation - Research

**Researched:** 2026-03-30
**Domain:** CSS Custom Properties / Design Token System
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- CSS variables over Tailwind (project decision — Tailwind migration is explicitly out of scope)
- Extend existing system, no migration overhead (project decision)
- Font decision is unresolved (Fira vs Barlow) — do NOT commit to a font family. Typography tokens must cover sizes/weights/line-heights only, NOT font-family
- Must work across all 8 existing themes without breaking theme switching
- MASTER.md is reference only, not source of truth — REQUIREMENTS.md and existing codebase take priority

### Claude's Discretion
Claude has full flexibility on all implementation decisions for this phase:
- D-01: Where tokens live (extend THEMES in constants.js, new CSS file, or hybrid)
- D-03: Spacing scale (REQUIREMENTS.md suggests 4/8/12/16/20/24/32/40/48px; MASTER.md uses 4/8/16/24/32/48/64)
- D-04: px vs rem
- D-05: Status colors — universal hex vs theme-adapted
- D-06: Phase colors — named tokens (--phase-framing) vs numbered (--phase-1)
- D-07: Shadow tokens — universal vs per-theme
- D-08: Glass/blur tokenization scope — Phase 1 only box-shadow, or include glass

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOKN-01 | App uses a spacing scale (4/8/12/16/20/24/32/40/48px) via CSS custom properties | Spacing audit of styles.js confirms 8/12/16/20/24 are the dominant values; full 9-step scale covers all existing uses |
| TOKN-02 | App uses a typography scale (xs/sm/base/lg/xl/2xl/3xl) via CSS custom properties | Font size audit reveals 10/11/12/13/14/15/18/20/24/28px in use; token scale maps cleanly to these |
| TOKN-03 | All interactive elements enforce 44px minimum touch target via `--touch-min` token | Current .btn has min-height:36px — this is below WCAG 2.5.5. Token + utility class needed |
| TOKN-04 | Focus rings visible on all interactive elements via `--focus-ring` token | styles.js uses `outline:none` on form-input/select/textarea focus — currently suppressed! Only amber-dim box-shadow substitute exists |
| TOKN-05 | Transitions use consistent timing (150ms micro, 300ms state) via tokens | Current code uses 0.15s, 0.2s, 0.25s, 0.4s scattered inline — needs consolidation |
| TOKN-06 | Shadow system (sm/md/lg) defined as CSS custom properties | Each theme has `--shadow` and `--card-shadow` but no sm/md/lg scale. Matrix theme uses `none` — shadows must be per-theme |
| TOKN-07 | Semantic color aliases (`--phase-*`, `--status-*`) reference existing theme primitives | PHASE_COLORS currently hard-coded hex arrays in 3 files; STATUS_COLORS hard-coded in 4 files. Theme primitives (--green, --amber, --blue, --red) already exist |
</phase_requirements>

---

## Summary

The existing codebase has a solid CSS variable foundation in the THEMES object (`src/data/constants.js`) — 8 themes, each defining ~25 variables applied to `:root` by `App.jsx`. New token vars added to each theme object automatically participate in theme switching at zero migration cost. This is the primary extension point.

The critical gap is that spacing, font sizes, transitions, and colors are all hard-coded in `src/styles.js` and in component inline styles. There is no shared vocabulary — `20px`, `16px`, `24px`, `13px` appear dozens of times each without reference to any scale. Phase 1 establishes the vocabulary. Phase 2+ consumes it.

Two architectural decisions stand out. First, universal tokens (spacing, typography, touch, focus, transitions) should live as a **standalone CSS file** (`src/tokens.css`) rather than inside the THEMES object — because they are theme-independent and must not be duplicated 8 times. Second, per-theme tokens (shadow sm/md/lg, semantic colors) must live inside the THEMES object because their values legitimately differ per theme (Matrix shadow is `none`, Blueprint shadow is a glow).

**Primary recommendation:** Two-file architecture — `src/tokens.css` for universal tokens, THEMES object additions for per-theme tokens. Import `tokens.css` once in `main.jsx`. Add utility classes for touch targets, shadows, and transitions to `styles.js`.

---

## Standard Stack

No new npm packages required. All work is pure CSS custom properties + small JS additions.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| CSS Custom Properties | Native | Token storage and cascade | Already used throughout the project; zero overhead |
| `src/data/constants.js` (THEMES) | Existing | Per-theme token values | The authoritative theme definition — already wired into App.jsx |
| `src/styles.js` | Existing | Utility classes consuming tokens | The global stylesheet; the correct place for shadow/transition classes |
| `src/tokens.css` | New file | Universal tokens (spacing, type, touch, focus) | Separates theme-independent values from the 8x-repeated THEMES object |

### No New Dependencies
The project stack (Vite 8, React 19, no Tailwind) does not require any design token tooling. W3C Design Tokens spec tools (style-dictionary, theo, token-transformer) are unnecessary — the THEMES object pattern is already a hand-rolled token system that works.

**Installation:**
```bash
# No new packages needed
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── tokens.css            # NEW — universal tokens (theme-independent)
├── data/
│   └── constants.js      # MODIFIED — per-theme token vars added to each theme's vars object
├── styles.js             # MODIFIED — utility classes for shadow-sm/md/lg, transition-*, touch-target
└── main.jsx              # MODIFIED — import './tokens.css' (one line addition)
```

### Pattern 1: Universal Token File (tokens.css)

**What:** A single CSS file using `:root` that defines all theme-independent tokens.
**When to use:** Spacing, typography scale, touch minimum, focus ring, transition timing — any value that does not change between themes.

```css
/* Source: CSS Custom Properties spec + codebase audit */
:root {
  /* Spacing — matches REQUIREMENTS.md 9-step scale */
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Typography scale — covers all font sizes found in styles.js */
  --text-xs:   10px;  /* labels, table headers */
  --text-sm:   11px;  /* kpi-label, badges */
  --text-base: 13px;  /* body text, table cells, buttons */
  --text-md:   14px;  /* room-header, nav icons */
  --text-lg:   15px;  /* card-title */
  --text-xl:   18px;  /* modal-title, logo */
  --text-2xl:  20px;  /* section-title */
  --text-3xl:  28px;  /* kpi-value */

  /* Line heights */
  --leading-tight:  1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font weights */
  --weight-normal:  400;
  --weight-medium:  500;
  --weight-semi:    600;
  --weight-bold:    700;

  /* Touch target */
  --touch-min: 44px;

  /* Focus ring — uses amber variable which is theme-defined */
  --focus-ring: 0 0 0 2px var(--amber);

  /* Transition timing */
  --duration-micro: 150ms;   /* hover states, micro-interactions */
  --duration-state: 300ms;   /* tab switches, panel opens */
  --ease-standard: cubic-bezier(.4, 0, .2, 1);
  --transition-micro: var(--duration-micro) var(--ease-standard);
  --transition-state: var(--duration-state) var(--ease-standard);
}
```

**Note on px vs rem:** Use `px` for all tokens. The app targets mobile field workers who may have non-standard browser zoom levels. The existing codebase uses `px` exclusively. Rem introduces font-size inheritance risk across theme switches and Capacitor WebViews. Staying on `px` means zero disruption and predictable touch target enforcement.

### Pattern 2: Per-Theme Token Additions (constants.js THEMES)

**What:** Add semantic color aliases and shadow scale vars to each of the 8 theme objects.
**When to use:** Any token whose value should adapt to the active theme.

```javascript
// Source: existing THEMES structure — add to each theme's vars object
// Example for the "steel" theme:
"--shadow-sm": "0 1px 4px rgba(0,0,0,0.12)",
"--shadow-md": "0 2px 12px rgba(0,0,0,0.25)",
"--shadow-lg": "0 4px 32px rgba(0,0,0,0.40)",

// Status semantic aliases — reference existing primitives
"--status-approved":  "var(--green)",
"--status-pending":   "var(--amber)",
"--status-denied":    "var(--red)",
"--status-in-transit":"var(--blue)",

// Phase semantic aliases — named by construction phase, not number
// (named tokens: --phase-framing over --phase-1 because phases are
// named concepts in EBC's domain, not ordinal slots)
"--phase-active":          "var(--green)",
"--phase-estimating":      "var(--amber)",
"--phase-pre-construction":"var(--blue)",
"--phase-completed":       "var(--text3)",
"--phase-warranty":        "var(--yellow)",
```

**Shadow decision rationale (D-07):** Shadows MUST be per-theme because:
- Matrix theme already has `"--shadow": "none"` — a global override would break it
- Blueprint theme uses colored glow shadows (`0 0 12px rgba(0,191,239,0.04)`) not opacity-black
- Each theme has different background brightness; shadow depth must match
- Shadow sm/md/lg are additions that replace the existing single `--shadow` / `--card-shadow` per-theme vars

### Pattern 3: Utility Classes in styles.js

**What:** Small utility classes that consume tokens for common patterns.
**When to use:** Touch targets (not inline style), shadow levels, transition shorthands.

```css
/* Source: existing .btn pattern in styles.js as reference */

/* Touch target enforcer */
.touch-target { min-height: var(--touch-min); min-width: var(--touch-min); }

/* Shadow utilities */
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }

/* Transition utilities */
.transition-micro { transition: all var(--transition-micro); }
.transition-state  { transition: all var(--transition-state); }

/* Focus ring — single source of truth */
.focus-ring:focus-visible { outline: none; box-shadow: var(--focus-ring); }
```

### Pattern 4: main.jsx Import

```jsx
// Add one line to src/main.jsx BEFORE the styles injection
import './tokens.css'
```

This ensures tokens.css loads before styles.js injects its `<style>` tag, so `var(--space-*)` references in styles.js work without race conditions.

### Anti-Patterns to Avoid

- **Putting universal tokens in THEMES:** Duplicates the same value 8 times with no benefit. Spacing 16px should be defined once.
- **Using rem for spacing:** The codebase is 100% px-based. Mixed units create compounding issues in Capacitor WebViews where `font-size` on `html` may differ from browser default.
- **Numbered phase tokens (`--phase-1`, `--phase-2`):** The PHASE_COLORS arrays are array-indexed in MoreTabs.jsx (chart bars), but named in MapView.jsx and EmployeeView.jsx ("Active", "Estimating", "Pre-Construction"). Named tokens (`--phase-active`) are self-documenting and match how the rest of the app references phases. Chart bars cycling through an array don't need semantic tokens — they just need a palette.
- **Tokenizing glass/blur effects in Phase 1:** The glass aesthetic (`backdrop-filter: blur(20px) saturate(1.6)`) is already well-established and consistent in styles.js. Adding glass tokens would add complexity without improving the downstream portal refactors in Phases 3-5. Keep Phase 1 scope to box-shadow only (D-08 decision: box-shadow only).
- **Removing `outline: none` without adding `--focus-ring`:** The existing focus suppression (`outline:none` on `.form-input:focus`) is only safe if replaced by a visible alternative. The `--focus-ring` token must be applied at the same time `outline:none` is preserved.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design token pipeline | Custom build step, token transformer | Plain CSS custom properties in tokens.css | The THEMES pattern is already a working token system; no tooling overhead needed |
| Typography system | Custom type scale engine | CSS vars + existing class names (`.text-xs`, `.text-sm`) | styles.js already has `.text-xs` through `.text-xl` — just wire them to tokens |
| Shadow scale | New component or helper | CSS vars in THEMES + `.shadow-sm/md/lg` utilities | Extending the existing `--shadow` / `--card-shadow` pattern to 3 levels |
| Focus ring management | JS focus manager | CSS `--focus-ring` var + `:focus-visible` pseudo | `:focus-visible` is the CSS-native, keyboard-only focus solution |

**Key insight:** This phase is vocabulary definition, not architecture. Every problem already has a solution in the existing system — the work is adding named tokens so the vocabulary exists, not building new machinery.

---

## Common Pitfalls

### Pitfall 1: Matrix Theme Shadow = none
**What goes wrong:** Applying a non-none shadow-sm to Matrix theme elements makes them look wrong — Matrix is intentionally flat/scanline aesthetic.
**Why it happens:** The existing `"--shadow": "none"` in Matrix theme signals this aesthetic intent.
**How to avoid:** In the Matrix theme's vars object, set `"--shadow-sm": "none"`, `"--shadow-md": "none"`, `"--shadow-lg": "0 0 10px rgba(0,255,65,0.06)"` (the existing card-shadow pattern — a subtle glow, not black opacity).
**Warning signs:** If shadows appear in Matrix theme after the change, the per-theme value was not set.

### Pitfall 2: Focus Ring Uses --amber Which Is Theme-Defined
**What goes wrong:** `--focus-ring: 0 0 0 2px var(--amber)` in tokens.css — but `--amber` is defined per-theme. If tokens.css loads before theme vars are applied, the fallback is undefined.
**Why it happens:** CSS variable cascade — if `--amber` is not yet set when `:root` is computed for tokens.css, the computed value of `--focus-ring` would be invalid.
**How to avoid:** CSS custom properties resolve lazily at paint time, not at parse time. Since `--amber` is always applied to `document.documentElement` by App.jsx before any render, the cascade resolves correctly. This is by design and is safe. However: `--focus-ring` must reference `var(--amber)` as a reference, not a resolved value — which is how CSS vars work by default.
**Warning signs:** Focus ring appears invisible or incorrectly colored on first load before theme is applied.

### Pitfall 3: Existing Utility Classes Partially Duplicate Token Names
**What goes wrong:** styles.js already has `.text-xs{font-size:11px}`, `.text-sm{font-size:12px}`, etc. Adding `--text-xs:10px` and `--text-sm:11px` tokens creates a misalignment — the class says 11px but the token says 10px.
**Why it happens:** The existing utility classes in styles.js used ad-hoc px values (11px for xs, 12px for sm) that don't align perfectly with REQUIREMENTS.md's named scale.
**How to avoid:** When adding tokens, also update the existing text utility classes in styles.js to consume the new tokens:
```css
.text-xs  { font-size: var(--text-xs);   }
.text-sm  { font-size: var(--text-sm);   }
.text-md  { font-size: var(--text-md);   }
.text-lg  { font-size: var(--text-lg);   }
.text-xl  { font-size: var(--text-xl);   }
```
This is Phase 1 scope because it's vocabulary wiring, not portal refactoring.
**Warning signs:** If you add `--text-xs` but `.text-xs` still uses a hard-coded value, the token exists but nothing consumes it.

### Pitfall 4: --accent Is Referenced But Not Defined in THEMES
**What goes wrong:** `src/App.css` references `--accent`, `--accent-bg`, `--accent-border`. These are NOT in the THEMES object. If Phase 1 adds a clean token system without addressing this, the undefined vars remain a live bug.
**Why it happens:** `App.css` appears to be leftover Vite scaffold from project creation. The `.counter` and `.hero` classes it defines are not used by EBC-OS components.
**How to avoid:** Phase 1 should NOT add `--accent` to THEMES (it's out of scope). But the research flags this: `App.css` is dead scaffold code. The planner should include a Wave 0 task to confirm `App.css` classes are unused and can be ignored.
**Warning signs:** Any element using `.counter` class in React components — which grep confirms does not exist.

### Pitfall 5: STATUS_COLORS in submittalsPackagePdf.js Cannot Use CSS Vars
**What goes wrong:** `src/utils/submittalsPackagePdf.js` defines `STATUS_COLORS` as RGB arrays for jsPDF (e.g., `{ bg: [16, 185, 129], text: [255, 255, 255] }`). These are passed to jsPDF's `setFillColor(r, g, b)` method — CSS variables cannot be used here.
**Why it happens:** PDF rendering in jsPDF requires actual numeric color values, not CSS variable references.
**How to avoid:** Do NOT attempt to replace `submittalsPackagePdf.js` STATUS_COLORS with `--status-*` tokens in Phase 1 (or ever). The semantic token system is for DOM rendering only. PDF utilities need separate hardcoded values.
**Warning signs:** If a plan task says "update STATUS_COLORS in submittalsPackagePdf.js to use tokens" — that task is wrong.

### Pitfall 6: PHASE_COLORS in MoreTabs.jsx Is a Chart Palette, Not Semantic
**What goes wrong:** MoreTabs.jsx uses `PHASE_COLORS = ["#3b82f6", "#10b981", "#e09422", ...]` as a rotating color wheel for pie chart slices — index 0, 1, 2, ... with no semantic meaning. Replacing this with `--phase-*` tokens does not make sense.
**Why it happens:** Chart bar/slice colors cycle by index, not by named phase.
**How to avoid:** Leave the MoreTabs.jsx PHASE_COLORS array as-is for Phase 1. Phase 5 (Foreman portal) may address chart color tokens if needed. The `--phase-*` semantic tokens created in Phase 1 serve the named-phase usage in MapView.jsx and EmployeeView.jsx only.
**Warning signs:** A plan task that modifies MoreTabs.jsx PHASE_COLORS during Phase 1 — out of scope.

---

## Code Examples

### Complete tokens.css

```css
/* Source: derived from styles.js font-size/spacing audit + REQUIREMENTS.md */
:root {
  /* ── SPACING SCALE ────────────────────────────────────── */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ── TYPOGRAPHY SCALE ────────────────────────────────── */
  --text-xs:    10px;  /* table headers, form labels, kpi-label style */
  --text-sm:    11px;  /* badge text, gantt bar labels */
  --text-base:  13px;  /* primary body: table cells, btn, toast, form-input */
  --text-md:    14px;  /* secondary body: gantt-label, room-header */
  --text-lg:    15px;  /* card-title */
  --text-xl:    18px;  /* modal-title, logo */
  --text-2xl:   20px;  /* section-title */
  --text-3xl:   28px;  /* kpi-value display figures */

  /* Line heights */
  --leading-tight:   1.2;
  --leading-normal:  1.5;
  --leading-relaxed: 1.75;

  /* Font weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semi:   600;
  --weight-bold:   700;

  /* Letter spacing */
  --tracking-tight:  -0.01em;
  --tracking-normal:  0;
  --tracking-wide:    0.05em;
  --tracking-wider:   0.08em;

  /* ── TOUCH & INTERACTION ─────────────────────────────── */
  --touch-min: 44px;

  /* ── FOCUS RING ──────────────────────────────────────── */
  /* Uses --amber (theme primitive) — resolves lazily at paint time */
  --focus-ring: 0 0 0 2px var(--amber);

  /* ── TRANSITIONS ─────────────────────────────────────── */
  --duration-micro:  150ms;
  --duration-state:  300ms;
  --ease-standard:   cubic-bezier(.4, 0, .2, 1);
  --transition-micro: var(--duration-micro) var(--ease-standard);
  --transition-state: var(--duration-state) var(--ease-standard);
}
```

### Per-Theme Additions to THEMES in constants.js (example: steel)

```javascript
// Add to steel.vars (and all 7 other themes with theme-appropriate values):
"--shadow-sm": "0 1px 4px rgba(0,0,0,0.12)",
"--shadow-md": "0 2px 12px rgba(0,0,0,0.28)",
"--shadow-lg": "0 4px 32px rgba(0,0,0,0.45)",

// Status semantic aliases
"--status-approved":   "var(--green)",
"--status-pending":    "var(--amber)",
"--status-denied":     "var(--red)",
"--status-in-transit": "var(--blue)",
"--status-project":    "var(--text2)",
"--status-office":     "var(--text3)",

// Phase semantic aliases (named, not numbered)
"--phase-active":           "var(--green)",
"--phase-estimating":       "var(--amber)",
"--phase-pre-construction": "var(--blue)",
"--phase-completed":        "var(--text3)",
"--phase-warranty":         "var(--yellow)",
"--phase-in-progress":      "var(--green)",  // alias used in GanttScheduleView
```

### Matrix Theme Shadow Override

```javascript
// Matrix theme — glow shadows, not black opacity
"--shadow-sm": "none",
"--shadow-md": "0 0 10px rgba(0,255,65,0.04)",
"--shadow-lg": "0 0 20px rgba(0,255,65,0.08)",
```

### Blueprint Theme Shadow Override

```javascript
// Blueprint theme — colored border/glow shadows
"--shadow-sm": "0 0 0 1px rgba(0,191,239,0.06)",
"--shadow-md": "0 0 12px rgba(0,191,239,0.08)",
"--shadow-lg": "0 0 24px rgba(0,191,239,0.12)",
```

### Utility Classes to Add to styles.js

```css
/* Touch target */
.touch-target { min-height: var(--touch-min); min-width: var(--touch-min); }

/* Shadow scale */
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }

/* Transition utilities */
.transition-micro { transition: all var(--transition-micro); }
.transition-state  { transition: all var(--transition-state); }

/* Focus ring utility (for elements that need explicit focus ring) */
.focus-visible:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

### Updating Existing Text Utilities to Consume Tokens

```css
/* In styles.js, replace hard-coded values in the UTILITIES section: */
.text-xs  { font-size: var(--text-xs);   }
.text-sm  { font-size: var(--text-sm);   }
.text-md  { font-size: var(--text-md);   }
.text-lg  { font-size: var(--text-lg);   }
.text-xl  { font-size: var(--text-xl);   }
/* text-2xl and text-3xl are new additions */
.text-2xl { font-size: var(--text-2xl);  }
.text-3xl { font-size: var(--text-3xl);  }
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hard-coded `20px`, `16px`, `24px` in styles.js | `var(--space-5)`, `var(--space-4)`, `var(--space-6)` | Single source of truth for spacing |
| `--shadow` and `--card-shadow` (2 values) | `--shadow-sm`, `--shadow-md`, `--shadow-lg` (3-level scale) | Consistent depth language across components |
| `PHASE_COLORS = { "Active": "#10b981" }` hard-coded | `--phase-active: var(--green)` theme-adaptive | Phase colors adapt to Matrix/Blueprint/etc correctly |
| `transition: all 0.2s cubic-bezier(...)` repeated inline | `transition: all var(--transition-micro)` | One change point for all micro-interaction timing |
| `outline: none` on focus + amber box-shadow substitute | `--focus-ring` token + `:focus-visible` | Accessible, keyboard-navigable, theme-aware |

**Current baseline font sizes in styles.js (audit result):**
- 10px: table headers, form labels, gantt header, bar fill, phase-node-date
- 11px: kpi-label, badges, logo-sub, nav-more text (.text-xs class)
- 12px: kpi-sub, section-sub, data-table .num, gantt-label, bar-label, bar-value, search-input (.text-sm class)
- 12.5px: nav-item, nav-more-btn (non-standard — maps to text-base)
- 13px: form-input, button, toast, table-td, tab-btn, empty-text, scope-title, contact-card (primary body size)
- 14px: contact-avatar, btn-icon font-size, room-header, bar-track (.text-md class)
- 15px: card-title
- 18px: modal-title, logo, modal-close (.text-lg class)
- 20px: section-title
- 28px: kpi-value

---

## Open Questions

1. **`--accent` in App.css**
   - What we know: `src/App.css` references `--accent`, `--accent-bg`, `--accent-border`. These vars are not in THEMES. The `.counter` class using them is Vite scaffold.
   - What's unclear: Are any React components actually using `.counter`? (grep suggests no.)
   - Recommendation: Wave 0 task — grep for `.counter` class usage in JSX. If zero hits, document App.css as dead scaffold. Do not add `--accent` to THEMES.

2. **12.5px font sizes in nav-item and nav-more-btn**
   - What we know: These are non-standard values (`font-size: 12.5px`) that don't fit neatly into the token scale.
   - What's unclear: Should they round up to `--text-base` (13px) or down to `--text-sm` (11px)? Visual difference is minimal.
   - Recommendation: Map nav-item to `--text-base` (13px). The 0.5px difference is imperceptible and eliminates the non-standard value.

3. **Focus ring on dark themes with low-contrast amber**
   - What we know: `--focus-ring: 0 0 0 2px var(--amber)` uses the amber accent. On Daylight theme, `--amber` is `#c06e10` (brown-orange) — this may not meet WCAG 3:1 non-text contrast ratio against a white background.
   - What's unclear: Daylight theme background is `#f2f3f7` — the contrast of `#c06e10` against `#f2f3f7` should be checked.
   - Recommendation: For Phase 1, define the token and let Phase 6 (Polish) handle WCAG auditing for all 5 themes (PLSH-01). Flag in plan verification step.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1 is pure CSS/JS file edits with no external dependencies. No CLIs, databases, or services required.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (key absent) — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config, no `tests/` directory, no `*.test.*` files |
| Config file | None — Wave 0 must create if automated validation is desired |
| Quick run command | Manual browser inspection (no test runner available) |
| Full suite command | Manual visual regression across 8 themes |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOKN-01 | `--space-1` through `--space-12` resolve in browser | Manual inspection | `getComputedStyle(document.documentElement).getPropertyValue('--space-4')` in DevTools | ❌ Wave 0 |
| TOKN-02 | `--text-xs` through `--text-3xl` resolve correctly | Manual inspection | DevTools computed styles check | ❌ Wave 0 |
| TOKN-03 | `.touch-target` class produces 44px min dimension | Manual + visual | DevTools element computed height | ❌ Wave 0 |
| TOKN-04 | Focus ring visible on tab-through | Manual keyboard navigation | Tab through all interactive elements in each theme | ❌ Wave 0 |
| TOKN-05 | Transitions feel consistent (micro vs state) | Manual interaction | Side-by-side comparison of hover vs modal open | ❌ Wave 0 |
| TOKN-06 | `.shadow-sm/md/lg` render visibly different | Manual visual | Open app, inspect card variants | ❌ Wave 0 |
| TOKN-07 | `--phase-active` and `--status-approved` render correct color in each theme | Manual theme switching | Switch all 8 themes, confirm colors adapt | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Open app in browser, switch to EBC Brand theme, confirm changed tokens render correctly
- **Per wave merge:** Switch through all 8 themes, verify no broken vars (empty/invalid computed values)
- **Phase gate:** Full 8-theme visual pass before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No automated test runner exists — validation is manual browser inspection
- [ ] Recommend adding a `console.log` token audit helper to `main.jsx` (dev only) that checks all new vars resolve non-empty on startup — remove before merge

*(Manual-only validation is acceptable for Phase 1 — pure CSS token definitions cannot break app logic, only visual rendering)*

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `src/data/constants.js` (THEMES, 8 themes, all var names)
- Codebase direct inspection: `src/styles.js` (all existing font sizes, spacing values, transition timings)
- Codebase direct inspection: `src/App.css` (--accent undefined issue)
- Codebase grep: PHASE_COLORS and STATUS_COLORS usage in 6 files
- `.planning/REQUIREMENTS.md` — TOKN-01 through TOKN-07 requirements
- `.planning/phases/01-token-foundation/01-CONTEXT.md` — decisions D-01 through D-08

### Secondary (MEDIUM confidence)
- `.claude/skills/ui-ux-pro-max/SKILL.md` — confirms 44px touch target (WCAG 2.5.5), 150-300ms transition range, 4.5:1 color contrast requirements, focus-visible CSS pseudo-class as standard

### Tertiary (LOW confidence)
- `design-system/ebc-os/MASTER.md` — spacing reference (7-step scale); used only as cross-reference per D-02 (reference only, not source of truth)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing system analyzed directly
- Architecture: HIGH — two-file pattern derived directly from codebase constraints (universal vs per-theme values)
- Spacing/typography scale: HIGH — derived from actual styles.js font-size audit, not guessed
- Pitfalls: HIGH — all identified from direct code inspection (Matrix shadow = none, focus suppression, submittalsPackagePdf jsPDF constraint)
- Semantic color decisions: HIGH — phase and status keys derived from actual variable names in existing PHASE_COLORS / STATUS_COLORS objects

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (stable CSS/JS — no fast-moving dependencies)
