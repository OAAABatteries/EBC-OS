# Domain Pitfalls: Design System Migration

**Domain:** Adding design token system + shared component library to existing React construction app
**Project:** EBC-OS v1.0 Field Portal Perfection
**Researched:** 2026-03-30
**Confidence:** HIGH — grounded in actual codebase audit + verified sources

---

## Context: What Makes This Migration Unusually Risky

This is not a greenfield design system. The target is a live production app with:
- 583 inline style instances in ForemanView alone (2400+ LOC), 135 in EmployeeView
- 200+ ad-hoc `fontSize:` values in ForemanView, 46 in EmployeeView
- Theme system that works correctly (`document.documentElement.style.setProperty`) but is bypassed in 20+ places with raw hex values like `#8b5cf6`, `#f59e0b`, `#10b981`
- 5 complete themes in `constants.js`, all with full var sets — but those vars are inconsistently used
- 373 translation calls in ForemanView vs 106 in EmployeeView — i18n coverage uneven
- A live service worker controlling drawing cache and push notifications
- Field crews using phones on job sites — any visible regression erodes trust immediately

The pitfalls below are specific to this situation. Generic "design system best practices" are excluded.

---

## Critical Pitfalls

Mistakes that cause rewrites, regressions in production, or loss of field crew trust.

---

### Pitfall 1: Specificity War — New Classes Silently Lose to Existing Inline Styles

**What goes wrong:**
You add a `.field-btn` class with `min-height: 44px` to fix touch targets. The component still has `style={{ padding: "8px 12px", fontSize: 12 }}` on the same element. The inline style wins on those properties (inline specificity = 1-0-0-0, the highest possible). The class never takes effect. The developer sees no error, visual difference may be subtle, and the "migration" didn't actually migrate anything.

**Why it happens in this codebase:**
ForemanView has 583 inline `style={{}}` blocks. During incremental migration, you migrate the className but forget to remove the inline style on the same element. This is the default failure mode for partial migration.

**Consequences:**
- Touch targets appear fixed in code review but are still 18-24px on device
- Font sizes look corrected in the CSS file but remain at ad-hoc values from JSX
- Dark mode tokens appear to apply but the inline hex overrides them
- A whole phase of work produces no visible improvement

**Prevention:**
1. Establish a rule: when adding a class, delete the corresponding inline style properties in the same commit. Never do one without the other.
2. Use the browser devtools "Computed" tab — if a property shows strikethrough in the "Styles" panel, the class lost to an inline style.
3. Write a grep audit script before and after each component migration:
   ```bash
   grep -n "style={{" src/tabs/ForemanView.jsx | wc -l
   ```
   The number must go down with each PR. A migration PR that doesn't reduce the count migrated nothing.
4. Never use `!important` to override inline styles during migration — it creates a second layer of specificity debt that is harder to unwind.

**Detection:**
- Browser devtools shows CSS property with strikethrough in Styles panel
- Component still behaves differently across themes (inline hex overriding token)
- `style={{` grep count does not decrease after "migration" PR

---

### Pitfall 2: Token Variable Name Collision with Existing CSS Vars

**What goes wrong:**
The existing system already defines `--amber`, `--bg`, `--text`, `--border`, `--glass-bg`, etc. in `constants.js` and applies them via `document.documentElement.style.setProperty`. The new design token system introduces new names like `--color-primary`, `--color-surface`, `--spacing-md`. If any new token names overlap with the old names — or if the migration partially renames them — theme switching breaks silently.

**Why it happens in this codebase:**
The existing vars are terse and semantic (e.g., `--amber` is the accent/brand color for most themes, but in Blueprint theme it becomes cyan `#00bfef`, not amber at all). A new token called `--color-brand` might be introduced to replace `--amber`, but some components still read `var(--amber)` while others read `var(--color-brand)`. Both values exist on `:root` but may not match, causing split appearance between migrated and unmigrated components.

**Consequences:**
- Theme switching works on new components but not legacy ones
- The Daylight theme (light mode) may look broken while Steel (dark) looks fine
- The per-theme color test shows passing on one theme, broken on another

**Prevention:**
1. Do not rename existing vars during this milestone. Add new semantic tokens alongside the old ones.
   ```css
   /* New token */
   --color-brand: var(--amber);
   /* Old token stays, new one wraps it */
   ```
2. Build the new token layer as aliases pointing to the existing primitive vars from `constants.js`. This preserves theme switching (which sets `--amber` etc.) and lets new components use semantic names.
3. Defer renaming/removing the old var names to a separate, dedicated phase after all components migrate.
4. Create a flat list of all existing CSS vars before starting and treat it as a protected namespace.

**Detection:**
- Components look different with the same theme selected
- A component works on Steel but has wrong colors on Daylight
- CSS `var()` reference resolves to `initial` (empty value) in devtools

---

### Pitfall 3: Hard-Coded Phase Colors in Data Break Theme Consistency

**What goes wrong:**
ForemanView contains phase-color data objects hard-coded directly in JSX:
```javascript
{ key: "framing", label: "Framing", color: "#f59e0b", progress: 40 },
{ key: "board", label: "Board", color: "#f97316", progress: 60 },
```
These colors are used in rendered UI (Gantt-like phase indicators, progress bars). They are data, not styles, so a CSS class migration won't reach them. They will remain visible as hex-coded islands that never respond to theme switching. In the Matrix theme (bright green palette) or Daylight theme (light mode) these colors cause stark contrast violations that are invisible in the default Steel theme.

**Consequences:**
- Phase indicator colors are permanently dark-mode-optimized regardless of theme
- Accessibility failures in Daylight mode (hard hex colors may fail contrast ratios)
- Can't be caught by a CSS audit — it's in JavaScript data structures

**Prevention:**
1. Audit all JavaScript data objects for `color:` properties that hold hex values — these are a separate category from inline styles.
2. Map phase keys to CSS custom properties instead of hex values:
   ```javascript
   { key: "framing", colorVar: "--phase-framing", progress: 40 }
   ```
   Then define `--phase-framing` in the token system.
3. If a JS color value is needed (e.g., for a canvas or charting API), read it at runtime from the computed style of a sentinel element, not from a constant.

**Detection:**
- Switch to Daylight theme and look at all phase/status indicators — any that don't change are data-embedded hex
- Canvas signature pad background (`#f8f9fb`) is already an example in the codebase — it will look wrong in dark themes

---

### Pitfall 4: Touch Target Expansion Causes Cascading Layout Shifts

**What goes wrong:**
Current buttons and touch targets are 18-24px. Expanding to 44px minimum — which is the goal — expands every interactive element. In ForemanView's crew roll-call list, clock-in controls, and tab navigation, densely packed buttons are constrained by surrounding layout math. Expanding height by ~20-26px per button multiplied across a scrollable list breaks the card layout, causes text overflow, and can make modals too tall for the phone viewport.

**Why it is critical for this app:**
Foremen use this in the field. They have 10-15 crew members to clock in simultaneously. If the roll-call list is broken — buttons don't fit, scroll breaks, or a button is cut off — they cannot clock in their crew. This is a direct operational failure.

**Consequences:**
- Crew list becomes unscrollable or items become hidden
- Clock-in circle button (currently `width: 200, height: 200`) may conflict with new 44px minimum rules if the component is refactored naively
- Tab bar items (currently `padding: 6px 14px`) expand and push content below the fold
- Modal dialogs overflow the 375px phone viewport

**Prevention:**
1. Expand touch targets using `min-height: 44px` + `padding` increases, not `height: 44px`. This keeps text-short elements from looking bloated.
2. Use `touch-action` CSS and invisible padding extensions (`::after` pseudo-elements with negative margin) for elements where visual size must stay compact but tap area must grow.
3. Test every tab view on an actual 375px viewport — not browser devtools — after each component migration. The Foreman portal has 11 tabs; test all 11.
4. Migrate touch targets in DriverView first (500 LOC, lower risk) before tackling ForemanView's roll-call and clock-in UI.
5. Treat the clock-in circle (`width: 200, height: 200` inline) as off-limits for the touch target phase — it is intentionally large and must be separately evaluated.

**Detection:**
- After expanding a button, open the parent view on a 375px viewport; check if scroll still works
- Look for any element with `overflow: hidden` wrapping the newly expanded component

---

### Pitfall 5: Partial Migration Creates Permanent Visual Inconsistency That Ships to Production

**What goes wrong:**
Incremental migration — the only safe strategy for this codebase — by definition produces an in-between state where some components use the new system and others do not. The risk is that this partial state ships to production and becomes the new baseline. Foremen notice that "the drawings tab looks different from the clock-in tab" and file it as a bug. The longer the migration takes, the more this inconsistency normalizes.

**Why it is high risk here:**
ForemanView has 11 tabs. If tabs 1-3 are migrated in Phase 1 and tabs 4-11 are unmigrated, field crews will use both styles simultaneously. The 5-theme system amplifies this — in Matrix or Blueprint themes, unmigrated components will look dramatically different from migrated ones.

**Consequences:**
- Partial state ships to production and undermines trust in the refactor
- Old inline styles become harder to remove because the code "works" and removing them feels risky
- Team loses motivation to complete the migration

**Prevention:**
1. Adopt a portal-complete rule: a portal is not releasable until all tabs within it are migrated. Do not release "ForemanView tabs 1-3 migrated" — release "ForemanView fully migrated."
2. Migrate portals in order of size: DriverView (500 LOC) → EmployeeView (1500 LOC) → ForemanView (2400 LOC). Each is a complete, atomic unit.
3. Use visual regression snapshots (even manual screenshots) before and after each portal migration, comparing all 5 themes.
4. Keep a migration checklist per portal with a tab-by-tab migration status.

**Detection:**
- Two adjacent tabs in a portal have noticeably different typography weight, spacing, or color density
- Style panel in devtools shows mixed class-based and inline-based properties on the same element

---

## Medium-Risk Pitfalls

Issues that degrade quality or create rework but do not cause immediate operational failure.

---

### Pitfall 6: Breaking Theme Switching When Moving from `constants.js` to Token Files

**What goes wrong:**
The current theme system applies vars via:
```javascript
const t = THEMES[theme] || THEMES.steel;
Object.entries(t.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
```
This works correctly. If the new token system introduces a CSS file (e.g., `tokens.css`) that also defines these same var names at `:root`, a specificity conflict emerges: the CSS file's `:root` rule applies at cascade specificity, while `style.setProperty` applies at the element's inline style level. Inline style wins. But if the CSS file is loaded after the JS runs, there may be a flash or override in unexpected order during page load.

**Why it matters:**
The app has a `"daylight"` default theme stored in localStorage. On cold load, the CSS file's `:root` values apply first, then the JS override runs. If the token CSS file defines dark values at `:root` as its defaults but the user has `"daylight"` saved, there will be a brief flash of dark-mode colors on load.

**Prevention:**
1. Do not define primitive color values in a CSS file if those values are already controlled by JS `style.setProperty`. Only define the semantic layer in CSS, pointing back to the JS-controlled primitives.
2. If a `tokens.css` file is introduced, its `:root` block should only contain values that are NOT overridden by the theme switcher — layout tokens, spacing, typography, radius, shadow.
3. Test theme switching: switch from Steel to Daylight, reload the page, verify the correct theme loads without flash.

---

### Pitfall 7: i18n Breakage When Extracting Shared Components

**What goes wrong:**
ForemanView has 373 `t()` calls. EmployeeView has 106. When extracting a shared component (e.g., a shared `ClockInButton` or `CrewListItem`), the extracted component needs access to the `t()` translation function. If the component receives the label as a hardcoded prop string instead of a translation key, the text becomes untranslatable — it shows English on Spanish-language sessions.

**Common mistake pattern:**
```jsx
// Wrong: hardcoded English label baked into prop
<FieldButton label="Clock In" />

// Wrong: translation done at call site, breaking the component's reusability
<FieldButton label={t("Clock In")} />  // Still fragile — breaks sentence-level translations

// Correct: component calls t() internally, or accepts a translation key
<FieldButton labelKey="Clock In" />  // Component calls t(labelKey)
```

**Secondary risk:** When splitting a large component, it's easy to accidentally drop a `t()` wrapper around a string that was previously inside a translated block. The string appears in English in both locales with no error.

**Prevention:**
1. Shared components must call `t()` internally on all user-visible text, never accept pre-translated strings as props.
2. After extracting each shared component, run the Spanish locale and visually verify all text in that component is translated.
3. Run a grep for raw English strings in extracted component files:
   ```bash
   grep -n "\"[A-Z][a-z]" src/components/shared/*.jsx
   ```
   Any quoted capitalized English strings not inside `t()` are candidates for missed translations.
4. Do not split existing `t("sentence with context")` calls across components — the translation key must remain whole.

---

### Pitfall 8: Service Worker Serving Stale CSS After Refactor Deploy

**What goes wrong:**
The app has an active service worker (`InstallPrompt.jsx` subscribes to `controllerchange` and `message` events; `useDrawingCache.js` sends `CACHE_DRAWING` messages to the SW controller). If the service worker uses a cache-first strategy for app shell assets (HTML, CSS, JS), field crews who have installed the PWA may load stale styles after a CSS refactor is deployed. They will see the old inline-heavy UI mixed with new class-based styles from a partial cache hit.

**Why it is medium (not critical) for this project:**
The current `vite.config.js` does NOT use `vite-plugin-pwa`, meaning there is no auto-generated service worker from Vite. The service worker appears to be manually written (references in `InstallPrompt.jsx`). Vite's default build hashes CSS/JS file names, which normally busts service worker caches automatically on deploy.

**Risk becomes critical if:**
- The service worker manually caches by URL path (e.g., `/index.html`) rather than by hashed filename
- `styles.js` (the global CSS string) is not included in the SW's cache manifest
- A team member adds `vite-plugin-pwa` during this milestone without understanding the existing SW

**Prevention:**
1. Read the actual service worker file before starting the CSS refactor to understand its caching strategy.
2. Confirm that CSS output filenames include content hashes in the Vite build output (`dist/assets/index-[hash].css`). Vite does this by default with Rollup.
3. After deploying a CSS refactor, verify by checking the Network tab in DevTools with a clean profile — confirm the new hashed CSS file is loaded, not a cached path.
4. Do not add `vite-plugin-pwa` or any service worker modification during this milestone.

---

### Pitfall 9: Typography Scale Breaks Data Density in Foreman Dashboards

**What goes wrong:**
ForemanView has 200+ ad-hoc `fontSize:` values ranging from `fontSize: 10` to `fontSize: 28`. These are tuned for data density — KPI values, table cells, status badges. A typography scale that jumps from 11px → 13px → 15px → 18px → 22px → 28px will not have intermediate steps for the densest data display (10px, 12px labels on data tables, badge text).

**Why it matters for field use:**
Foremen scan dashboards quickly. The current small font sizes for secondary data (project phase labels at `10px`, badge text at `11px`) are intentional — they compress information onto one screen. Replacing them with the nearest "scale" size (13px) increases line height and card height, breaking the glanceable layout design.

**Prevention:**
1. The typography scale must include a `--text-xs` level at 11-12px specifically for data labels, table cells, and status badges. This is non-negotiable for a construction dashboard.
2. Audit the range of existing font sizes before defining the scale, not after:
   ```bash
   grep -o "fontSize: [0-9]*" src/tabs/ForemanView.jsx | sort -t: -k2 -n | uniq -c
   ```
3. Map each existing size to its semantic role, then define scale steps that cover all roles. The recommended scale for this app: 10px (badge/micro), 12px (label/caption), 14px (body), 16px (body-lg), 18px (subhead), 22px (head), 28px (kpi).
4. Do not force all text onto a 5-step scale if the app genuinely needs 7 levels.

---

### Pitfall 10: New CSS File Adding Global Selector Leaks

**What goes wrong:**
The current system uses `styles.js` — a JS string injected as a `<style>` tag. When adding a `tokens.css` or a `field-components.css`, developers sometimes write broad element selectors (`button { ... }`, `input { ... }`) assuming they will apply only within the new component scope. In a non-CSS-Modules project (which this is), these selectors are globally scoped. They will override or conflict with the carefully crafted glass/nav/modal button styles already in `styles.js`.

**Consequences:**
- `button { min-height: 44px }` in a new CSS file raises all buttons globally, including icon buttons, the nav more-button, and dropdown items
- `input { border-radius: 8px }` overrides the signature pad's `border: 2px solid var(--border)`
- Specificity wars begin immediately

**Prevention:**
1. All new CSS classes must use BEM-style or component-prefixed naming: `.field-btn`, `.field-input`, `.portal-card`. Never add bare element selectors.
2. Adopt a file naming convention where the prefix signals scope: `_field-components.css` contains only `.field-*` classes.
3. Reserve element-level resets strictly for `tokens.css` or `index.css` — and check against the existing `styles.js` global reset first.

---

## Low-Risk Pitfalls

Issues that cause minor rework or confusion but are easily caught and fixed.

---

### Pitfall 11: Deeply Chained CSS Variable Fallbacks Causing Parse Overhead

**What goes wrong:**
During migration, some developers add aggressive fallback chains:
```css
color: var(--color-brand, var(--amber, var(--accent, #f59e0b)));
```
Three levels of nesting are fine. If this pattern propagates to dozens of properties across many components, the browser must resolve each chain during style recalculation.

**Reality check:**
For 2-3 levels of nesting across a few dozen tokens, this has negligible real-world impact on modern Android/iOS browsers. It becomes measurable at 10+ nesting levels or when `setProperty` is called frequently on animated elements.

**Prevention:**
Limit fallback chains to one level for all new token references:
```css
color: var(--color-brand, var(--amber));
```
Remove the terminal raw hex fallback once the token system is proven stable.

---

### Pitfall 12: `color: "#fff"` on Icon-Only Buttons Breaks in Certain Themes

**What goes wrong:**
Several elements in the codebase use `color: "#fff"` inline on text/icons inside colored background elements (e.g., `background: "var(--red)", color: "#fff"`). This pattern assumes dark backgrounds. In Daylight theme, the `--red` variable is `#dc2626`, which still reads white correctly. But if a future theme is added with a light red or pastel accent, the white text will become unreadable.

**Consequence:** Low risk now — the existing 5 themes all have appropriate contrast with `#fff` on `--red`. Risk elevates if a new theme is added.

**Prevention:**
Replace `color: "#fff"` on icon containers with a semantic token `--color-on-danger` that defaults to white but can be overridden per theme.

---

### Pitfall 13: Removing Inline Styles Without Testing All 5 Themes

**What goes wrong:**
Development is typically done in Steel (dark default) or Daylight. The Matrix, Blueprint, and Anime themes use dramatically different color palettes. After removing an inline hex and pointing to a token, the Matrix theme may produce a neon-green version of a UI element that was always displayed in amber — visually jarring and easy to miss if only two themes are tested.

**Prevention:**
Add a simple theme-cycling test to the migration checklist: for each migrated component, step through all 5 themes and verify the component is legible and intentional in each.

---

### Pitfall 14: Forgetting `accent` Variable — It Exists in ForemanView but Not in All Themes

**What goes wrong:**
ForemanView uses `var(--accent)` in several inline styles and class references. Searching `constants.js`, `--accent` is not defined as a standard theme var in the THEMES object — the defined vars are `--amber`, `--blue`, `--green`, `--red`, `--yellow` as semantic colors. If `--accent` was added locally by a developer directly to the DOM or in a style tag, it may not survive a full token migration that replaces the injection mechanism.

**Prevention:**
1. Run `grep -rn "var(--accent)" src/` and inventory every usage before migration starts.
2. If `--accent` is undefined in the THEMES object, formally add it as an alias to the appropriate primary color in each theme definition before any migration touches elements using it.

---

## Prevention Strategies

### Strategy 1: Migrate by Deletion Count, Not by Addition Count

The only trustworthy measure of migration progress is the reduction of `style={{` instances. Before each PR merges, run:
```bash
grep -c "style={{" src/tabs/ForemanView.jsx
grep -c "style={{" src/tabs/EmployeeView.jsx
grep -c "style={{" src/tabs/DriverView.jsx
```
Record the number. It must be lower than the previous count. A PR that adds CSS classes but doesn't remove inline styles has not migrated anything.

### Strategy 2: Preserve-Then-Remove Order for Every Property

For each inline style property being migrated:
1. Add the CSS class with the equivalent rule
2. Verify visually that the class rule renders correctly
3. Delete the inline style property
4. Never do step 3 without step 2

Doing 1 and 3 simultaneously is the common regression source.

### Strategy 3: Audit Before Token Naming

Before defining any token names, run this audit:
```bash
grep -o "var(--[a-z0-9-]*)" src/styles.js | sort | uniq
grep -o "var(--[a-z0-9-]*)" src/index.css | sort | uniq
```
This produces the complete list of CSS vars currently in use. All new token names must not conflict with this list or must explicitly replace items on this list.

### Strategy 4: Theme-Gauntlet Test for Every Component

After migrating a component, manually test it with: Steel → Blueprint → Daylight → Matrix → Anime. This takes 30 seconds per component and catches theme-specific regressions before they ship.

### Strategy 5: No Business Logic Modifications in Styling PRs

ForemanView mixes business logic and JSX heavily. During refactoring, resist the temptation to "clean up" logic, rename state variables, or reorganize hooks in the same PR as a styling change. Styling PRs must touch only: `style={{...}}` removal, `className` additions, and corresponding CSS file updates. Mixed PRs make regressions untraceable.

### Strategy 6: Incremental Portal Release Gate

Define a release gate for each portal:
- All `style={{` instances reduced by target percentage (80%+ for first pass)
- Zero hard-coded hex values in JSX (except data-embedded phase colors, which have their own migration)
- All touch targets verified at 44px minimum on 375px viewport
- All 5 themes visually reviewed
- Spanish locale tested for all extracted components

A portal does not ship until it clears its gate.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Token system definition | Colliding with existing `--amber`, `--bg`, `--text` vars | Map new semantic tokens as aliases to existing primitives; do not rename |
| CSS file introduction | Global selector leak from bare `button`, `input` selectors | Enforce component-prefixed class names; never write bare element rules in new files |
| DriverView refactor (Phase 1 recommended) | Inline `THEMES` import used for theme selector UI | Preserve `THEMES` import; only remove inline styles, not the data usage |
| EmployeeView refactor | Missing `--accent` var at `var(--accent)` call sites | Audit and define `--accent` in THEMES before refactoring EmployeeView |
| ForemanView clock-in tab | Clock-in circle has explicit `200x200` inline size — expanding to 44px min would break it | Treat the clock-in circle as explicitly excluded from the 44px touch target rule; it already exceeds it |
| ForemanView phase colors | Phase data array has 8 hex colors baked into JS — CSS migration won't reach them | Create `--phase-*` CSS vars; replace hex in data object with CSS var references |
| Shared component extraction | Extracted components receiving pre-translated props instead of translation keys | Components must call `t()` internally; audit with grep after each extraction |
| Touch target expansion | `padding: 6px 14px` nav items expanding to 44px min-height pushing content below fold | Use `min-height` not `height`; test all tab views at 375px viewport height |
| Typography scale introduction | Ad-hoc 10-12px font sizes in data tables getting rounded up to 13px scale step | Include `--text-xs` (11-12px) step explicitly; construction dashboards need data density |
| PWA / service worker | CSS refactor deploy serving stale styles to installed PWA users | Confirm Vite content-hashes CSS output; read SW caching strategy before starting |
| Signature pad (canvas element) | Hard-coded `#f8f9fb` background conflicts with dark themes | Add a `--color-surface-paper` token; use it for canvas and print-style backgrounds |
| Dark mode primary assertion | Daylight theme introduced a separate test matrix — light tokens must be validated separately | After every token change, test Steel AND Daylight; don't assume dark-to-light token ratio |
| Interim partial state | Mixed old/new styles shipping between portal completion milestones | Complete one full portal before merging to main; use feature branches per portal |

---

## Sources

- [CSS Specificity — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity)
- [Using CSS Custom Properties — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [CSS Variables Performance — Lisi Linhart](https://lisilinhart.info/posts/css-variables-performance)
- [CSS Variables Gone Wrong: Pitfalls — PixelFreeStudio](https://blog.pixelfreestudio.com/css-variables-gone-wrong-pitfalls-to-watch-out-for/)
- [Design Tokens Guide — penpot.app](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [Design System in Existing Product — Netguru](https://www.netguru.com/blog/design-system-in-existing-product)
- [Visual Breaking Change in Design Systems — EightShapes/Medium](https://medium.com/eightshapes-llc/visual-breaking-change-in-design-systems-1e9109fac9c4)
- [Pro Tips for Design System Migration — houhoucoop/Medium](https://medium.com/@houhoucoop/pro-tips-for-ui-library-migration-in-large-projects-d54f0fbcd083)
- [PWA Cache Behavior — Infinity Interactive](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [Designing Better Target Sizes — ishadeed.com](https://ishadeed.com/article/target-size/)
- [Shipping i18n-friendly Libraries in React — Assembly Engineering](https://medium.com/assembly-engineering/shipping-i18n-friendly-libraries-in-react-bf4c27289297)
- [CSS Variable Fallback — Defensive CSS](https://defensivecss.dev/tip/css-variable-fallback/)
- [Managing Global Styles with Design Tokens — UXPin](https://www.uxpin.com/studio/blog/managing-global-styles-in-react-with-design-tokens/)
- [Common Sense Refactoring of Messy React Components — Alex Kondov](https://alexkondov.com/refactoring-a-messy-react-component/)
