# Technology Stack — Field Portal UI Refactor

**Project:** EBC-OS Field Portal Perfection (v1.0)
**Researched:** 2026-03-30
**Scope:** Stack additions/changes for design token system, shared component library, and portal-by-portal UI refactor only. Existing capabilities excluded per task brief.

---

## Context: What Already Exists

Before recommending additions, what the codebase actually has matters because it changes what is and is not needed:

- `src/styles.js` — 1,312-line CSS-in-JS string with a well-structured class system: `.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.card-glass`, `.modal`, `.badge`, `.form-input`, `.kpi-card`, `.nav-item`, etc. These classes already consume CSS custom properties correctly.
- `src/data/constants.js` — Full theme system: 7 themes (steel, blueprint, daylight, matrix, anime, ebc, midnight, cyberpunk), each exporting a `vars` object of ~22 CSS custom properties including `--bg`, `--bg2`, `--bg3`, `--bg4`, `--border`, `--border2`, `--amber`, `--text`, `--text2`, `--text3`, `--radius`, `--radius-sm`, `--shadow`, `--font-head`, `--font-body`, `--font-mono`, `--glass-bg`, `--glass-border`.
- `src/index.css` — Minimal: reset, safe-area-inset, PWA standalone background. No design tokens yet.
- `src/App.css` — Vite scaffold leftover, unused in production paths.
- React 19.2 (package.json shows `^19.2.4`), not React 18 as PROJECT.md states. `ref` can now be passed as a plain prop — `forwardRef` wrapper is no longer needed.
- `@capacitor/haptics ^8.0.1` — already installed. Haptic feedback requires zero new packages.

**The practical implication:** The design token gap is not "build a system from scratch." It is "promote the existing vars in constants.js into a formal token layer with missing categories (spacing, typography scale) and eliminate the 768 inline styles that bypass the existing system."

---

## Recommended Additions

### 1. clsx — Conditional Class Composition

**Package:** `clsx`
**Version:** `^2.1.1` (current as of 2026-03-30; 2.x is ESM-first with tree-shaking)
**Bundle size:** 239 bytes gzipped. `clsx/lite` variant is 140 bytes if only string args are used.
**Why:** The existing `styles.js` class system requires conditional class composition (`active`, `disabled`, variant states). Without a utility, developers write fragile string concatenation like `"btn " + (primary ? "btn-primary" : "btn-ghost") + (disabled ? " btn-disabled" : "")`. clsx makes this readable and type-safe. It runs 3x faster than `classnames` in benchmarks and plays better with Vite's tree-shaker due to its ESM build structure.
**Why not `classnames`:** Same API, 3x slower, larger, no ESM default export. No reason to choose it.
**Why not Tailwind Merge:** Only needed when Tailwind utility classes conflict. Not applicable here.

```bash
npm install clsx
```

Usage pattern for this codebase:
```jsx
import { clsx } from 'clsx';

// Button component example
<button className={clsx('btn', {
  'btn-primary': variant === 'primary',
  'btn-ghost': variant === 'ghost',
  'btn-danger': variant === 'danger',
  'btn-sm': size === 'sm',
})} />
```

### 2. vite-plugin-webfont-dl — Self-Hosted Font Pipeline

**Package:** `vite-plugin-webfont-dl`
**Version:** `^3.9.6` (current as of 2026-03-30)
**Why:** The existing themes reference Google Fonts (`'Barlow Condensed'`, `'Barlow'`, `'IBM Plex Mono'`, `'Inter'`) via CSS `--font-head`/`--font-body`/`--font-mono` vars. Currently these are loaded at runtime from Google's CDN or not loaded at all (fonts fall back to system fonts silently). This plugin downloads font files at build time, injects self-hosted `@font-face` declarations, and eliminates the third-party DNS connection. For a PWA used in the field with spotty connectivity, this is a functional requirement, not an optimization. `font-display: optional` (not `swap`) should be used for field apps — it prevents layout shift on slow connections by silently falling back rather than swapping mid-render.
**Installation:** Dev dependency only.

```bash
npm install -D vite-plugin-webfont-dl
```

`vite.config.js` addition:
```js
import webfontDownload from 'vite-plugin-webfont-dl';

export default {
  plugins: [
    react(),
    webfontDownload([
      'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=optional'
    ]),
  ]
}
```

**Confidence:** MEDIUM — verified plugin exists and is actively maintained on npm/GitHub. The specific Vite 8 compatibility should be confirmed before committing to this approach (Vite 8 is newer than the plugin's last tested version in training data).

### 3. No Gesture Library Needed — Use What Is Already There

The existing codebase already has `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on `.btn` and `.btn-icon` in `styles.js`. This handles the primary mobile touch concern (300ms delay removal, no ghost tap highlight).

For the specific touch improvements in scope (44px+ touch targets, 8px+ spacing), these are pure CSS changes — no library is needed. If swipe gestures are added to portals in a future milestone, `@use-gesture/react` (~7KB gzip) is the correct choice. It is out of scope for this milestone.

For haptic feedback on button press: `@capacitor/haptics` is already installed. Use it directly:
```js
import { Haptics, ImpactStyle } from '@capacitor/haptics';
// In a shared useHaptic hook:
export const useHaptic = () => ({
  light: () => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
});
```
The `.catch(() => {})` handles web/browser fallback gracefully. Zero new packages.

---

## Integration Points with the Existing Theme System

### Extending the Token Vocabulary in constants.js

The current vars object covers color, borders, radius, shadow, and font-family. It is missing spacing, typography scale, and interactive state tokens. These should be added to every theme's `vars` object (or to a shared base that all themes inherit):

```js
// Proposed additions to every theme's vars object
"--space-1": "4px",
"--space-2": "8px",
"--space-3": "12px",
"--space-4": "16px",
"--space-5": "20px",
"--space-6": "24px",
"--space-8": "32px",
"--space-10": "40px",
"--space-12": "48px",

"--touch-min": "44px",   // Apple HIG / WCAG 2.5.8 minimum
"--touch-comfortable": "48px",  // Material Design recommendation

"--text-xs": "11px",
"--text-sm": "12px",
"--text-base": "13px",
"--text-md": "15px",
"--text-lg": "18px",
"--text-xl": "20px",
"--text-2xl": "24px",
"--text-3xl": "28px",

"--transition-fast": "0.15s cubic-bezier(.4,0,.2,1)",
"--transition-base": "0.2s cubic-bezier(.4,0,.2,1)",
"--transition-slow": "0.25s cubic-bezier(.4,0,.2,1)",

"--focus-ring": "0 0 0 2px var(--amber-dim)",
```

The spacing scale is 4px-base (not 8px) because 4px gives finer control for dense field UI. The 8pt grid recommendation applies to design tools; 4px increments are standard in CSS token systems (Tailwind uses 4px as its base unit).

### CSS Architecture Decision: Enhanced styles.js, Not CSS Modules

**Decision: Stay with the single `styles.js` approach. Do not introduce CSS Modules.**

Rationale:
- CSS Modules cause full page reloads on file change in Vite instead of hot updates, losing component state during development. This slows the refactor work significantly.
- The existing system already uses a global class approach (`styles.js` injected once at app mount). CSS Modules would require converting all 18+ components and 3 portals to scoped imports, which is scope creep well beyond the presentation-layer-only constraint.
- CSS-in-JS (styled-components, Emotion) is explicitly ruled out by PROJECT.md constraints and would add bundle weight.
- The `@layer` CSS cascade feature could be introduced to organize the `styles.js` content, but it provides no practical benefit here: there is no cascade conflict problem to solve because the codebase is a single app with no competing stylesheets from third-party UI libraries. Reserve `@layer` for the hypothetical future milestone where a UI library is added.

**What to actually do:** Split `styles.js` into logical sections with clear comments (already started — the file uses `/* == SECTION == */` markers), and add the new token classes there. The pattern is working; refine it, don't replace it.

### Typography Integration

The PROJECT.md calls for Fira Code / Fira Sans. The existing themes use Barlow / Barlow Condensed / IBM Plex Mono. This is a decision that needs PM sign-off, not a research finding. Technically either works through the `--font-head` / `--font-body` / `--font-mono` variables. The `vite-plugin-webfont-dl` addition handles self-hosting whichever fonts are chosen.

---

## What NOT to Add

### Do NOT add a CSS framework (Tailwind, Bootstrap, UnoCSS)

PROJECT.md explicitly prohibits this. The technical reason: Tailwind class names conflict with the existing CSS variable system — you would need tailwind-merge on top of clsx, and you would still need to express theme switching through CSS vars anyway. Net result: two parallel systems, doubled complexity. The existing approach of semantic CSS classes consuming CSS custom properties is the correct pattern for a multi-theme app.

### Do NOT add styled-components or Emotion

CSS-in-JS at runtime adds ~12KB gzip and creates a second rendering bottleneck. The existing template literal in `styles.js` is a poor man's CSS-in-JS that runs once at mount; replacing it with a full CSS-in-JS library would add overhead with no benefit.

### Do NOT add a UI component library (MUI, Chakra, shadcn, Radix)

The existing `styles.js` already defines: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`, `.card`, `.card-glass`, `.modal`, `.modal-lg`, `.badge`, `.form-input`, `.form-select`, `.form-textarea`, `.nav-item`, `.kpi-card`. These cover ~80% of what a UI library would provide. Adding a library would require either overriding all its styles (making it pointless) or migrating all existing usage (massive scope).

### Do NOT add a gesture library (Hammer.js, @use-gesture/react) for this milestone

Touch optimization in scope is about CSS touch targets and spacing — not gesture detection. The 44px touch targets are a padding/min-height CSS change, not a library addition.

### Do NOT add a CSS-in-JS token tool (Style Dictionary, Theo, Cobalt)

These tools generate token files from JSON/YAML sources and are valuable when tokens are shared between design tools (Figma) and multiple codebases. EBC-OS is a single codebase and tokens already live in `constants.js` in a clean JS object format. Adding a build-time token pipeline would introduce a new file format, a new build step, and a new mental model for a team that is not running Figma token syncs. Overkill.

### Do NOT add React.memo or useMemo broadly

The portal refactor is presentation-layer. Performance profiling should precede any memoization additions. Premature optimization obscures the code without measured benefit.

---

## Key Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| CSS architecture | Enhanced `styles.js` with new token vars | Zero migration overhead, proven pattern, existing structure already works |
| Class composition | `clsx ^2.1.1` | 239B, ESM tree-shakeable, 3x faster than classnames |
| Font loading | `vite-plugin-webfont-dl` dev dep | Self-hosted fonts required for offline PWA reliability |
| Spacing scale | 4px base (--space-1 through --space-12) | Matches Tailwind convention, finer control than 8px for dense UI |
| Touch targets | CSS only (min-height: var(--touch-min)) | No library needed, 44px is a padding/size change |
| Haptic feedback | Existing @capacitor/haptics | Already installed, just not yet wired to button components |
| CSS Modules | Do not introduce | Vite HMR regression, scope creep, no cascade conflict to solve |
| @layer | Do not introduce yet | No competing stylesheets problem to solve at this stage |
| Gesture library | Do not add | Out of scope for this milestone |
| UI framework | Do not add | Existing class system covers 80% already, migration cost is prohibitive |
| Fira Code vs Barlow | Deferred to PM decision | Both work via existing CSS vars; fonts self-hosted either way |

---

## Installation Summary

**New runtime dependencies:**
```bash
npm install clsx
```

**New dev dependencies:**
```bash
npm install -D vite-plugin-webfont-dl
```

**Total additions:** 2 packages. One is 239 bytes at runtime.

Everything else is CSS variable additions to `constants.js` and class additions to `styles.js`.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| clsx version/API | HIGH | Verified on npm, stable 2.x API, widely adopted |
| vite-plugin-webfont-dl | MEDIUM | Plugin is real and maintained; Vite 8 compatibility should be verified before use |
| CSS architecture recommendation | HIGH | Based on direct codebase inspection, not assumptions |
| Capacitor haptics (existing) | HIGH | Confirmed in package.json at ^8.0.1 |
| React 19 ref-as-prop (no forwardRef) | HIGH | Confirmed in React 19.2 release notes |
| @layer decision | MEDIUM | Based on current use case analysis; if a UI library is ever added, reassess |
| Font decision (Fira vs Barlow) | LOW | This is a design/brand decision, not a technical one — research cannot resolve it |

---

## Sources

- [clsx on npm](https://www.npmjs.com/package/clsx) — bundle size, ESM support, API
- [vite-plugin-webfont-dl on GitHub](https://github.com/feat-agency/vite-plugin-webfont-dl) — build-time font downloading
- [Capacitor Haptics API](https://capacitorjs.com/docs/apis/haptics) — existing plugin API docs
- [CSS Custom Properties for Design Tokens (frontendtools.tech)](https://www.frontendtools.tech/blog/css-variables-guide-design-tokens-theming-2025) — three-tier token architecture
- [8pt Grid Spacing Reference](https://spec.fm/specifics/8-pt-grid) — spacing scale rationale
- [WCAG 2.5.8 Target Size](https://testparty.ai/blog/wcag-target-size-guide) — 44px minimum touch target
- [CSS Cascade Layers (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) — @layer when/why
- [React 19 Ref as Prop (Saeloun)](https://blog.saeloun.com/2025/03/24/react-19-ref-as-prop/) — forwardRef no longer required
- [Self-hosted fonts for Core Web Vitals (web.dev)](https://web.dev/patterns/web-vitals-patterns/fonts/font-self-hosted/) — font-display strategy
