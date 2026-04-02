# Phase 6: Polish and Theme Audit - Research

**Researched:** 2026-04-01
**Domain:** CSS theming, touch/scroll optimization, responsive layout, offline UI patterns (React + CSS variables)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full polish on ALL 5 themes -- Steel, Blueprint, Daylight, Matrix, Anime. Every theme should feel intentional and professional, even novelty themes (Matrix, Anime). Fix broken vars, contrast issues, inconsistent hover states, mismatched card backgrounds.
- **D-03:** Outdoor readability optimization targets Daylight and Blueprint themes specifically. Steel/Matrix/Anime are indoor/vehicle use -- standard contrast is fine.
- **D-04:** White flash prevention on theme switch is NOT a priority -- skip this.
- **D-05:** Add smooth CSS transition when switching themes so colors don't jump abruptly. Polish touch, not a blocking requirement.
- **D-08:** Add a brief CSS transition when switching themes. No live preview or theme picker redesign -- just smooth the color change.
- **D-09:** Persistent banner style -- always-visible strip when offline or reconnecting.
- **D-10:** Offline-only + reconnect behavior: hidden when fully online and synced. Shows "Offline -- N actions pending" when disconnected. Shows "Back online -- syncing N actions" on reconnect. Disappears after sync completes.
- **D-12:** Wire `useNetworkStatus` hook (already exists in `src/hooks/useNetworkStatus.js`) which provides `online`, `pendingCount`, and `wasOffline` state.
- **D-16:** Apply `touch-action: manipulation` globally (on `*, *::before, *::after` or body) to eliminate 300ms tap delay everywhere. Override with `touch-action: none` only on canvas/signature pad elements.

### Claude's Discretion

- **D-02:** Audit method -- choose between systematic manual checklist, automated screenshot capture, or hybrid approach based on what the codebase and tooling support.
- **D-06:** Hover approach -- decide whether to apply `hover:hover` media query to all interactive elements or use subtle hover effects on all devices. Base decision on what feels best per component.
- **D-07:** Contrast target -- determine a practical minimum for Steel, Matrix, and Anime dark themes that ensures field crew readability without clinical accessibility certification.
- **D-11:** Offline indicator placement -- decide whether to integrate into PortalHeader (single implementation, all portals inherit) or create a separate NetworkBanner component.
- **D-13:** 375px approach -- audit at 375px and add breakpoints only where content actually breaks. No preemptive 375px media queries.
- **D-14:** Tablet optimization -- determine if 768px/1024px layouts warrant multi-column treatment based on content density per portal.
- **D-15:** Support both portrait and landscape orientations.
- **D-17:** Overscroll-behavior -- `none` is already global in index.css. Decide whether to keep `none` or switch to `contain`.

### Non-Flexible Constraints

- All 5 themes must pass with full polish quality
- Daylight + Blueprint must be readable outdoors (bright sunlight contrast)
- No new npm dependencies
- No business logic changes
- All UI text through `t()` translation function
- Must not regress any portal functionality
- Presentation layer only -- no backend changes

### Deferred Ideas (OUT OF SCOPE)

- Cowboy/Texas/Rodeo theme -- own phase or post-milestone
- Live theme preview -- UX enhancement, not required for polish
- Always-visible connection status (green "Connected" bar even when online) -- user chose offline-only display
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLSH-01 | All 5 themes pass visual regression (no broken colors, missing vars) | Theme var audit reveals `--accent` undefined in all 5 themes; maps to `.driver-route-card`, `.driver-stop-badge`, `.emp-accent-label` in styles.js and several App.jsx inline styles. Full token coverage check per theme needed. |
| PLSH-02 | `touch-action: manipulation` applied globally to eliminate 300ms tap delay | Currently on ~9 individual CSS classes in styles.js. Single global rule in index.css or tokens.css will cover all interactive elements. Canvas/signature pads already have `touch-action: none` override. |
| PLSH-03 | `overscroll-behavior: contain` prevents accidental pull-to-refresh | Already has `overscroll-behavior: none` on body in index.css -- may already satisfy requirement. Decision needed: keep `none` (more restrictive) vs. switch to `contain` (allows iOS rubber-band). |
| PLSH-04 | Responsive at 375px, 768px, 1024px viewports | Responsive breakpoints already exist in styles.js (767px, 1024px, 399px). No explicit 375px rule. Audit-driven: add only where content breaks. App.css media queries are boilerplate Vite scaffold (not app UI). |
| PLSH-05 | Offline/sync status indicator extended to all portals | `useNetworkStatus` hook is complete. `SyncStatus` component exists but uses inline styles and only renders in App.jsx main content. Portals (ForemanView, EmployeeView, DriverView) each render `PortalHeader` -- cleanest integration point. |
</phase_requirements>

---

## Summary

Phase 6 is a polish pass on a well-built CSS variable theme system. The codebase is in strong shape -- all inline styles have been eliminated from portals, shared components are in place, and the network hook is already complete. The remaining work is targeted: one broken CSS variable (`--accent`) to resolve across all themes, a global touch-action rule to consolidate, an offline indicator to wire into the three portal headers, and a viewport audit pass at 375px.

The most consequential finding from code inspection is that `--accent` is used in `.driver-route-card`, `.driver-stop-badge`, `.emp-accent-label`, and several App.jsx inline styles, but it is **not defined** in any of the 5 theme `vars` objects in constants.js. This causes those elements to render with an invisible/fallback value in all themes -- a broken-variable bug that PLSH-01 must fix. The fix is to add `--accent` to every theme's vars as an alias (e.g., `"--accent": "var(--amber)"`) or replace the `var(--accent)` references with `var(--amber)`.

The existing `SyncStatus` component covers the offline banner logic but lives outside portals and uses hardcoded inline styles. The plan should either extend `PortalHeader` to accept network props and render an inline banner, or create a thin `NetworkBanner` component that PortalHeader renders. PortalHeader integration is recommended (D-11 discretion: it is cleaner and avoids prop-drilling in three separate portal files).

**Primary recommendation:** Work in 4 focused task tracks: (1) theme var audit + `--accent` fix, (2) global touch-action + overscroll decision, (3) offline banner integration into PortalHeader, (4) responsive viewport audit at 375px/768px/1024px. Theme CSS transition is low effort and can slot into track 1 or as a separate micro-task.

---

## Standard Stack

### Core (all already in project -- no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS custom properties | Native | Theme variable system | Already implemented across all 5 themes in constants.js |
| React hooks | 18.x | Network status, state | `useNetworkStatus` already exists and is complete |
| `src/styles.js` | N/A | Single CSS string module | Established pattern for all app CSS classes |
| `src/tokens.css` | N/A | Universal tokens (spacing, typography, touch) | Theme-independent, already in place |
| `src/index.css` | N/A | Global resets and body rules | Where global touch-action rule goes |

### No New Dependencies

This phase explicitly prohibits new npm dependencies. All work is CSS + React using existing infrastructure.

---

## Architecture Patterns

### Theme System: CSS Variables on `document.documentElement`

Themes are applied by iterating each theme's `vars` object and calling `document.documentElement.style.setProperty(k, v)`. This runs in a `useEffect` on theme change in `App.jsx` (line 584-587):

```js
// Source: src/App.jsx line 584
useEffect(() => {
  const t = THEMES[theme] || THEMES.steel;
  Object.entries(t.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}, [theme]);
```

All 5 themes (Steel, Blueprint, Daylight, Matrix, Anime) plus `ebc` theme are defined in `constants.js` starting at line 13. Each theme's `vars` object maps CSS variable names to values. A 6th theme (`ebc`) exists in constants.js but is not listed in CONTEXT.md's D-01 -- only Steel, Blueprint, Daylight, Matrix, Anime are in scope.

### Theme Transition: Global CSS Rule

To smooth theme switching (D-05, D-08), add a `transition` on `:root` or `*, *::before, *::after` targeting color properties. This should target only visual properties, not layout:

```css
/* Source: pattern recommendation -- goes in src/index.css */
*, *::before, *::after {
  transition: background-color var(--duration-micro) var(--ease-standard),
              border-color var(--duration-micro) var(--ease-standard),
              color var(--duration-micro) var(--ease-standard),
              box-shadow var(--duration-micro) var(--ease-standard);
}
```

**Caveat:** This applies the transition to all elements on theme switch. The `--duration-micro` token (150ms) is the correct duration. Exclude `transition: none` on elements that should not animate (loading skeletons, canvas). This is a Polish-only touch -- not a blocking requirement per D-05.

### Offline Banner: PortalHeader Integration

Current state: `SyncStatus` component renders in `App.jsx` main content area only. Portal views (DriverView, EmployeeView, ForemanView) do not show offline status.

All three portals already call `PortalHeader`. The recommended integration (D-11 discretion) is to extend `PortalHeader` to accept `network` prop and render an inline offline banner below the header strip:

```jsx
// Pattern: extend PortalHeader signature
export function PortalHeader({ ..., network }) {
  const showOffline = network && !network.online;
  const showReconnecting = network && network.wasOffline && network.online;
  return (
    <>
      <header className="header ...">...</header>
      {projectSelector && <div style={{ position: 'sticky', top: 54, ...}}>...</div>}
      {showOffline && (
        <div className="network-banner network-banner--offline">
          {t ? t("Offline") : "Offline"} — {network.pendingCount} {t ? t("actions pending") : "actions pending"}
        </div>
      )}
      {showReconnecting && !showOffline && (
        <div className="network-banner network-banner--reconnecting">
          {t ? t("Back online") : "Back online"} — {t ? t("syncing") : "syncing"} {network.pendingCount} {t ? t("actions") : "actions"}
        </div>
      )}
    </>
  );
}
```

Each portal view must then:
1. Import `useNetworkStatus` from `src/hooks/useNetworkStatus.js`
2. Call `const network = useNetworkStatus()` inside the component
3. Pass `network={network}` to its `PortalHeader` call

Network banner CSS classes go in `styles.js` using theme vars (no hardcoded colors).

### Global Touch-Action Rule

Replace ~9 per-class `touch-action: manipulation` declarations with a single global rule in `src/index.css`:

```css
/* Source: CSS Touch Action spec */
*, *::before, *::after {
  touch-action: manipulation;
}
```

Then ensure canvas and signature pad elements retain their existing `touch-action: none` override:
- `.field-signature-canvas` already has `touch-action: none` in styles.js (line 317)
- `.emp-jsa-canvas` already has `touch-action: none` in styles.js (line 789)

These override the global rule because they appear later in the cascade and are more specific. No change needed to those selectors.

### Overscroll-Behavior: Keep `none`

Current state: `body { overscroll-behavior: none; }` in index.css.

**Recommendation (D-17 discretion):** Keep `overscroll-behavior: none`. Rationale:
- The app uses `position: fixed` on body with `overflow: hidden` (see index.css lines 7-10) -- this means iOS rubber-band bounce is already suppressed by the positioning model, not just overscroll-behavior. The `none` value is redundant but not harmful.
- PLSH-03 requirement text says "contain" but the success criterion says "does not trigger browser pull-to-refresh." Both `none` and `contain` satisfy the success criterion.
- Switching from `none` to `contain` would allow iOS rubber-band on scrollable child elements. In a PWA with `position: fixed` body, this is untested and could introduce unexpected behavior.
- Report this as already-satisfied if the `none` global rule is in place and no accidental pull-to-refresh is triggerable. If the auditor wants `contain` specifically for PLSH-03 compliance language, it is a one-line change.

### `--accent` Variable: The Primary Theme Bug

**Finding (HIGH confidence, code-verified):** `--accent` is referenced in the following places but is NOT defined in any of the 5 theme `vars` objects in constants.js:

| Location | Usage |
|----------|-------|
| `styles.js` line 973 | `.driver-route-card` border-left color |
| `styles.js` line 981 | `.driver-stop-badge` background |
| `styles.js` line 741 | `.emp-accent-label` text color |
| `App.jsx` line 1595 | Estimating section border color (inline style) |
| `App.jsx` line 1662, 1727 | Link colors (inline styles -- out of phase scope) |

The `ebc` theme (6th theme) also does not define `--accent`. For in-scope portals, the fix options are:

**Option A (Recommended):** Add `"--accent": "var(--amber)"` to all 5 theme vars in constants.js. This is consistent with the existing pattern (var() references inside vars are valid and resolve at runtime). `--amber` is defined in all themes and is the established primary action color.

**Option B:** Replace `var(--accent)` with `var(--amber)` directly in styles.js at the three locations. This eliminates the indirection but requires touching styles.js instead of constants.js.

Option A is preferred because it keeps the fix in one file (constants.js) and makes the alias explicit.

Note: `--text-on-accent` in `.driver-stop-badge` has a fallback `#fff` which works for all themes. No fix needed for that variable.

### Contrast Targets for Outdoor Readability (D-03, D-07)

**Daylight theme** (`--text: #1a1d28` on `--bg: #f2f3f7`): Contrast ratio ~13:1. Already excellent for outdoor use.

**Blueprint theme** (`--text: #bdddf0` on `--bg: #020a16`): Contrast ratio ~11:1. Already strong.

**Practical minimum for dark themes (Steel, Matrix, Anime) -- D-07 discretion:**
- Steel: `--text: #d4dae6` on `--bg: #06080c` ≈ 10:1. Fine.
- Matrix: `--text: #00ff41` on `--bg: #000400` -- Terminal green on near-black. ~12:1. Intentional aesthetic, high contrast.
- Anime: `--text: #f0e4ff` on `--bg: #080414` ≈ 13:1. Fine.

**Recommendation:** Contrast ratios for primary text are all strong. The audit should focus on secondary text colors (`--text2`, `--text3`) and UI state colors (disabled states, muted labels) which are deliberately lower contrast and may fail at distance. Practical minimum: `--text2` should achieve ≥ 3:1 for field crew readability. No theme overhaul needed -- spot-fix any `--text3` usage in critical UI labels.

### Hover State Approach (D-06 Discretion)

**Current pattern:** `.field-card` uses `@media(hover:hover)` to enable transform on pointer devices, `@media(hover:none)` to suppress on touch devices. This pattern is in styles.js lines 294-295.

**Recommendation:** Extend `@media(hover:hover)` to buttons and tab items. On touch devices, hover states should be absent or minimal. The existing pattern is correct -- replicate it for:
- `.field-button` family: subtle background shift on hover (hover:hover only)
- `.field-tab-item`: background highlight on hover (hover:hover only)
- Portal-specific buttons that currently have unconditional hover: audit and wrap in `@media(hover:hover)`

Do NOT apply universal subtle hover effects on touch devices -- iOS/Android provide their own tap highlight (`-webkit-tap-highlight-color: transparent` is already global, meaning no tap flash). Unconditional CSS hover effects on touch feel broken when elements stay "hovered" after a tap.

### Responsive 375px Audit Scope

**Current breakpoints in styles.js:**
- `@media(max-width:767px)` -- main phone rules
- `@media(max-width:399px)` -- small phone (`<400px` = iPhone SE, some Androids)
- `@media(max-width:900px) and (max-height:500px) and (orientation:landscape)` -- landscape

375px (iPhone SE, base iPhone models) falls between the `<400px` and `<768px` breakpoints -- the `@media(max-width:399px)` rule already applies at 375px. App.css media queries are Vite boilerplate scaffold content (`.counter`, `.hero`, `#center`, `#next-steps`) -- they are NOT used by the application UI and should not be modified.

**Audit focus for 375px:** Check for horizontal overflow in:
- ForemanView: tab bar with badge counts may compress on 375px
- EmployeeView: form rows with label + input pairs
- DriverView: KPI grid tiles (`driver-kpi-grid`)
- Modal widths: `min(580px, 94vw)` at 375px = 352.5px -- adequate

**Tablet (768px-1024px) D-14 discretion:** The existing `@media(max-width:1024px)` rules handle tablet already. Multi-column layouts (kpi-grid, bid-grid, project-grid) scale down appropriately. PortalHeader portals are phone-primary -- tablet is a secondary form factor where the mobile layout stretches gracefully. Only add multi-column if content is demonstrably cramped.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Online/offline detection | Custom WebSocket ping loop | `window.addEventListener('online'/'offline')` via existing `useNetworkStatus` | Already implemented. Browser events are reliable for this purpose. |
| Theme transition | JavaScript-based color interpolation | CSS `transition: background-color, color` on `*` | CSS handles all transitions natively at GPU level |
| Touch delay elimination | Custom pointer event polyfill | `touch-action: manipulation` global CSS rule | Native browser behavior, no JS needed |
| Overscroll | Custom scroll event handlers | `overscroll-behavior: none/contain` CSS property | Native, no JS |
| Contrast calculation | Custom color math | Human spot-check with browser DevTools color picker | Phase scope is practical readability, not WCAG certification |

---

## Common Pitfalls

### Pitfall 1: Theme Transition Causing Input Lag

**What goes wrong:** Adding `transition: background-color 150ms` to `*` also affects `<input>` background on focus, buttons during active state, and animated elements -- causing visual stutter on rapid interactions.

**Why it happens:** The wildcard `*` selector includes every element including those with existing transitions.

**How to avoid:** Use the token `var(--duration-micro)` (150ms) for theme transitions. For elements with their own state transitions (buttons active, input focus), the existing transition rules will override if they are more specific. Do NOT transition `opacity` or `transform` globally -- these affect loading animations and hover transforms.

**Warning signs:** Skeleton shimmer animation stutters after adding global transition.

### Pitfall 2: `touch-action: manipulation` Breaking Canvas Drawing

**What goes wrong:** Applying `touch-action: manipulation` globally and not verifying canvas overrides causes signature pad and JSA canvas touch drawing to stop working on mobile.

**Why it happens:** `touch-action: none` is required for canvas elements to receive raw pointer events without browser interference. The global rule must be overridden at those elements.

**How to avoid:** Verify `.field-signature-canvas` and `.emp-jsa-canvas` retain `touch-action: none` in styles.js. These already exist (lines 317, 789) -- confirm they appear AFTER the global rule in the CSS cascade.

**Warning signs:** Signature pad draws nothing when finger is placed on it.

### Pitfall 3: `--accent` Fix Missing Some References

**What goes wrong:** Fixing `--accent` in constants.js but missing App.jsx inline style references at lines 1595, 1662, 1727.

**Why it happens:** Those are inline styles in the main App (PM/estimating tab), not portal files. They are outside the phase scope (portal-only), but they also use `var(--accent)` which will still be undefined.

**How to avoid:** Adding `"--accent": "var(--amber)"` to all theme vars in constants.js fixes ALL consumers simultaneously (both styles.js classes and App.jsx inline styles) because the variable becomes defined globally. This is why Option A (constants.js fix) is preferred over Option B (styles.js replacement).

### Pitfall 4: Offline Banner Shifts Portal Layout

**What goes wrong:** The offline banner appearing above or below the sticky header pushes the scrollable body content down, causing a layout jump when online/offline status changes.

**Why it happens:** Adding an element to the header region shifts the top of the scroll container.

**How to avoid:** Use `position: sticky` for the banner and ensure the PortalHeader Fragment returns header + optional banner. The scroll container (`.employee-body`) should not be offset by the banner. Test by going offline mid-scroll to confirm no jump.

**Warning signs:** Content visibly snaps up/down when network status changes.

### Pitfall 5: PortalHeader `t` Prop Scope

**What goes wrong:** Adding translated strings to offline banner inside PortalHeader without the `t` prop being passed by DriverView.

**Why it happens:** DriverView already passes `t={t}` to PortalHeader. EmployeeView and ForemanView also pass `t={t}`. The `t` prop is available. But new string keys must be present in the translations object (`src/data/translations.js`).

**How to avoid:** Before adding new translation keys, check `src/data/translations.js` for existing keys. Use the existing `t()` pattern. Add new keys (e.g., "Offline", "actions pending", "Back online", "syncing") to the translations file if not present.

---

## Code Examples

### Global Touch-Action Rule (goes in src/index.css)

```css
/* Source: src/index.css -- add after body {} block */
*, *::before, *::after {
  touch-action: manipulation;
}
/* Canvas/drawing elements -- override to allow raw touch events */
/* .field-signature-canvas and .emp-jsa-canvas already have touch-action: none in styles.js */
```

### Theme Transition (goes in src/index.css)

```css
/* Source: pattern -- add after touch-action global rule */
*, *::before, *::after {
  transition:
    background-color var(--duration-micro) var(--ease-standard),
    border-color var(--duration-micro) var(--ease-standard),
    color var(--duration-micro) var(--ease-standard),
    box-shadow var(--duration-micro) var(--ease-standard);
}
/* Do NOT transition transform, opacity, width, height -- breaks animations */
```

Note: Combine touch-action and transition into one `*, *::before, *::after` block to avoid duplicate selectors.

### --accent Fix (goes in src/data/constants.js, in each theme's vars)

```js
// Add to Steel, Blueprint, Daylight, Matrix, Anime vars objects:
"--accent": "var(--amber)",
// This is a var() reference -- valid CSS custom property value.
// Resolves to each theme's --amber at paint time.
```

### NetworkBanner CSS Classes (goes in src/styles.js)

```css
/* Append to field components section */
.network-banner{
  display:flex;align-items:center;gap:var(--space-2);
  padding:var(--space-2) var(--space-4);
  font-size:var(--text-base);font-weight:var(--weight-bold);
  position:sticky;z-index:98;
}
.network-banner--offline{background:var(--text3);color:var(--bg2)}
.network-banner--reconnecting{background:var(--green-dim);color:var(--green)}
```

### useNetworkStatus Wire-in Pattern (for each portal view)

```jsx
// Source: src/hooks/useNetworkStatus.js (already exists)
import { useNetworkStatus } from "../hooks/useNetworkStatus";

// Inside portal component:
const network = useNetworkStatus();

// Pass to PortalHeader:
<PortalHeader variant="driver" network={network} t={t} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 300ms click delay on mobile (legacy browsers) | `touch-action: manipulation` eliminates delay | ~2015 (Chrome 32, iOS 9.3) | No JS polyfill needed |
| Per-element overscroll handlers | `overscroll-behavior: contain/none` CSS | ~2018 (Chrome 63, iOS 16) | One CSS line replaces event handlers |
| CSS class toggling for theme switching | CSS custom properties on `:root` | ~2017 | All consumers update automatically |
| JavaScript color transition (animate between theme colors) | CSS transition on color properties | Always CSS-native | GPU-accelerated, zero JS |

---

## Discretion Recommendations

The planner should follow these recommendations when making decisions in Claude's Discretion areas:

| Decision Area | Recommendation | Rationale |
|---------------|----------------|-----------|
| D-02 Theme audit method | Manual checklist across all 5 themes in all 3 portals | No screenshot tooling exists in project. Manual checklist per portal per theme is ~15 checks -- tractable. Hybrid: code audit (find var() references) + manual visual check on key screens. |
| D-06 Hover approach | Replicate `@media(hover:hover)` pattern to `.field-button`, `.field-tab-item`, `.lang-toggle button` | Consistent with established field-card pattern. Touch-safe. |
| D-07 Contrast target | `--text2` ≥ 3:1 for body content; `--text3` for purely decorative/muted elements | Practical field readability without WCAG certification. Current primary text ratios are all >10:1 and fine. |
| D-11 Indicator placement | PortalHeader integration (accept `network` prop) | One change propagates to all portals. Cleaner than prop-drilling into each portal's local JSX. |
| D-13 375px approach | Audit only; add breakpoints for `driver-kpi-grid` and foreman tab bar if they overflow | Existing `@media(max-width:399px)` already covers 375px. Spot-fix only. |
| D-14 Tablet optimization | Keep mobile stretch layout -- no multi-column for portals | Portals are phone-primary. Multi-column at 768px is premature complexity for a field app used on phones. |
| D-17 Overscroll | Keep `none` -- PLSH-03 success criterion is already satisfied | Body is `position: fixed; overflow: hidden`. Pull-to-refresh is not triggerable. If requirement language demands `contain`, it's a one-word change. |

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- phase is presentation layer only, CSS + React modifications with no new tools, services, CLIs, or databases required)

---

## Validation Architecture

Workflow config key `nyquist_validation` is absent from `.planning/config.json` -- treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected -- no test config files, no test directories, no package.json test scripts found |
| Config file | None |
| Quick run command | `npm run build` (type + build validation) |
| Full suite command | `npm run build` |

No automated test infrastructure exists in this project. All validation is visual/manual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLSH-01 | All 5 themes render without broken colors or missing vars | manual-visual | `npm run build` (no runtime errors) | N/A |
| PLSH-02 | No 300ms tap delay on any interactive element | manual-touch | `npm run build` | N/A |
| PLSH-03 | No pull-to-refresh on scroll | manual-touch | `npm run build` | N/A |
| PLSH-04 | No horizontal scroll at 375px/768px/1024px | manual-visual (DevTools) | `npm run build` | N/A |
| PLSH-05 | Offline indicator appears in all 3 portals | manual-functional | `npm run build` | N/A |

All requirements are visual or interaction-based -- there is no automated test that can verify "no broken colors" or "no 300ms delay" without browser automation tooling (Playwright/Cypress) which is not in scope. Verification is manual with DevTools.

### Sampling Rate

- **Per task commit:** `npm run build` -- confirms no JS/CSS import errors
- **Per wave merge:** `npm run build` + manual browser check in each theme
- **Phase gate:** All 5 themes visually checked in all 3 portals before `/gsd:verify-work`

### Wave 0 Gaps

None -- no test infrastructure to create. Build command (`npm run build`) is the only automated check available. Manual verification checklist will be defined in PLAN.md files.

---

## Open Questions

1. **EBC theme scope**
   - What we know: 6 themes exist in constants.js (Steel, Blueprint, Daylight, Matrix, Anime, EBC). CONTEXT.md D-01 lists only 5 themes (Steel, Blueprint, Daylight, Matrix, Anime).
   - What's unclear: Is `ebc` theme shown to field crew users? Is it in the theme picker? Does it need PLSH-01 coverage?
   - Recommendation: Plan should note the discrepancy. If `ebc` theme is accessible in the theme picker UI, include it in the audit. If it is hidden/unused, document it as out of scope.

2. **PortalHeader `t` prop for new strings**
   - What we know: "Offline", "actions pending", "Back online", "syncing" are new UI strings that need translation.
   - What's unclear: Are these keys already in `src/data/translations.js`?
   - Recommendation: Planner should include a task step to check translations.js and add missing keys before wiring the banner. Adding to translations.js is a presentation-layer change within phase scope.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `src/data/constants.js` (THEMES object, all 5 theme vars)
- Direct code inspection: `src/hooks/useNetworkStatus.js` (hook API)
- Direct code inspection: `src/components/SyncStatus.jsx` (existing offline UI)
- Direct code inspection: `src/components/field/PortalHeader.jsx` (integration point)
- Direct code inspection: `src/index.css` (overscroll-behavior: none, body positioning)
- Direct code inspection: `src/styles.js` (touch-action occurrences, hover:hover pattern, media queries)
- Direct code inspection: `src/tokens.css` (transition tokens)
- Direct code inspection: `src/App.jsx` (theme application, useNetworkStatus usage, var(--accent) references)

### Secondary (MEDIUM confidence)

- MDN CSS `touch-action` property: `manipulation` value eliminates double-tap zoom and 300ms delay (browser-native, no polyfill)
- MDN CSS `overscroll-behavior`: `none` prevents all overscroll effects including pull-to-refresh; `contain` allows local rubber-band but prevents chain propagation
- CSS custom properties cascade: `var()` references inside custom property values resolve at paint time, making `"--accent": "var(--amber)"` a valid and standard pattern

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- all code is existing, directly inspected
- Architecture: HIGH -- patterns verified in existing codebase
- `--accent` bug: HIGH -- code-verified: absent from all 5 theme vars, present in 3+ style usages
- Contrast ratios: MEDIUM -- computed from hex values in constants.js against WCAG formula; not DevTools-verified
- Touch pitfalls: HIGH -- canvas `touch-action: none` verified in styles.js lines 317, 789

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable codebase, no fast-moving dependencies)
