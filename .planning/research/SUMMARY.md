# Project Research Summary

**Project:** EBC-OS Field Portal Perfection (v1.0)
**Domain:** Mobile-first field portal UI refactor — design token system, shared component library, portal-by-portal cleanup
**Researched:** 2026-03-30
**Confidence:** HIGH

---

## Executive Summary

EBC-OS already has the structural foundations of a professional field app: a working theme system with 7 themes and 22+ CSS custom properties, a comprehensive CSS class library in `styles.js`, role-based portals, and a Capacitor PWA shell. The gap is not missing infrastructure — it is 760+ inline styles and hard-coded hex values that bypass the existing system, leaving the theme engine firing but nothing listening. The refactor work is fundamentally a cleanup pass, not a rebuild. The correct approach is surgical: extend the existing CSS variable vocabulary with spacing/typography/touch tokens, build a small set of shared field components that consume those tokens, then migrate each portal in order from smallest to largest.

The recommended build order is DriverView first (510 lines, 42 inline styles — the pilot), then EmployeeView (1,745 lines, 135 inline styles), then ForemanView (3,953 lines, 583 inline styles). The token system and shared components are prerequisites for all three portal refactors — nothing should touch the portals until that foundation exists. The two net-new packages needed are `clsx` (239 bytes) for conditional class composition and `vite-plugin-webfont-dl` (dev dep) for self-hosted font loading in the offline PWA.

The primary risk is not technical complexity — it is partial migration shipping to production. A portal with 6 tabs migrated and 5 tabs still inline looks broken in multi-theme mode, and field crews lose trust in the tool. Every portal must be treated as an atomic unit: complete all tabs in one portal before merging to main. The secondary risk is inline styles silently winning CSS specificity wars against new classes — every inline style property removed must be matched by the class that replaces it in the same commit. Measure progress by the `style={{` grep count going down, not by the number of new CSS classes added.

---

## Key Findings

### Stack Additions

The codebase needs exactly 2 new packages. Everything else is CSS variable additions and class additions to existing files. No framework changes, no CSS module migration, no UI library.

**Additions:**
- `clsx ^2.1.1` (runtime, 239 bytes gzipped) — conditional class composition for the existing class system. Replaces fragile string concatenation like `"btn " + (active ? "btn-primary" : "")`. Faster than `classnames`, ESM tree-shakeable.
- `vite-plugin-webfont-dl ^3.9.6` (dev only) — downloads Google Fonts (Barlow, Barlow Condensed, IBM Plex Mono) at build time. Required for offline PWA reliability; fonts currently load from Google CDN or silently fall back to system fonts in the field.

**Already installed, just not wired:**
- `@capacitor/haptics ^8.0.1` — haptic feedback for clock-in/out confirmation requires zero new packages.

**Do not add:** Tailwind, CSS Modules, styled-components, any UI component library, any gesture library, Style Dictionary or any token build tool. The existing CSS-in-JS template literal in `styles.js` covers ~80% of what a library would provide with none of the overhead.

**One open decision:** Font choice (Fira Code/Fira Sans per PROJECT.md vs. Barlow/IBM Plex Mono per existing themes). Both work via `--font-head`/`--font-body`/`--font-mono` CSS vars. Needs PM sign-off before self-hosted fonts are configured.

**Confidence note on `vite-plugin-webfont-dl`:** Plugin is actively maintained; Vite 8 compatibility should be confirmed before committing.

### Feature Table Stakes

The single biggest gap is touch targets: current buttons render at 18-24px, WCAG 2.5.5 and Apple HIG require 44px minimum. Foremen wearing gloves cannot reliably tap the current UI. This is a pure CSS fix (`min-height: 44px` on `.btn` and `.emp-tab`) but it is the highest-impact change in scope.

**Must have (table stakes — currently missing or incomplete):**
- 44px minimum touch targets on all interactive elements — gloved-hand standard, currently 18-24px
- Skeleton screens on every async data load — blank screens on LTE/3G read as "broken app"
- Persistent offline status indicator — field connectivity is unpredictable; workers need to know if actions are queued
- Loading and error states on every Supabase call — current coverage is ~60%
- Empty states with call-to-action — blank areas look like bugs, not "nothing here yet"
- Haptic confirmation on clock-in, clock-out, and form submission — workers often look away from the screen
- Pull-to-refresh on all data lists — missing it makes the app feel like a web page
- Disabled states on buttons with in-flight actions — prevent double-submit on clock-in

**Should have (differentiators):**
- Consistent FieldCard component — 15+ different card implementations today; one canonical pattern signals "professional app"
- Role-aware home screen — foreman's first view should be their three morning tasks, not a generic grid
- Confirmation choreography on clock events — brief full-screen success state before returning (Procore pattern)
- OLED dark theme tuned for outdoor sunlight — 7:1+ contrast ratio, yellow/green accents, no blue text

**Defer to v2+:**
- Swipe-to-action gestures — medium-high complexity, lower value in web PWA vs. native
- Optimistic UI updates — high complexity, low risk to defer
- Deep link from notification to specific action — requires navigation state management beyond current scope

**Anti-patterns currently present that must be fixed:**
- ForemanView 11-tab horizontal scroll — must collapse to 4-5 bottom tabs + More overflow
- Full-screen spinner blocking entire view during loads
- Truncated tab labels ("Mate..." instead of "Materials")
- `var(--accent)` references where `--accent` does not exist in the THEMES object (silently breaks)

### Architecture Approach

The architecture recommendation is extend-in-place, not restructure. The CSS variable system in `constants.js` + `styles.js` already works; the theme switcher in App.jsx already applies vars to `:root`; the class system already covers buttons, cards, modals, forms, badges, and portal chrome. The refactor adds missing token categories (spacing, typography scale, touch minimum) to `styles.js` as `:root` constants, adds a `src/components/field/` directory for shared field components, and then migrates inline styles in each portal to use the existing classes.

**New shared components to build (`src/components/field/`):**

| Component | Source | Purpose |
|-----------|--------|---------|
| `PortalHeader` | Extract from all 3 portals | Shared `.employee-header` + logo + settings |
| `PortalTabBar` | Extract from all 3 portals | Shared `.emp-tabs` + `.emp-tab` pattern |
| `EmptyState` | Extract (10+ usages) | Parameterized empty/null state display |
| `StatusBadge` | Extract | Wraps `.badge` + variant logic |
| `LoadingSpinner` | New | Async operation indicator |
| `SkeletonBlock` | New | List/content placeholder |
| `AsyncState` | New | Composes loading/empty/error into one wrapper |
| `FieldSignaturePad` | Extract from ForemanView:20 | Fix hard-coded hex; used in both Foreman + Employee JSA |
| `FieldInput` / `FieldSelect` | New | 44px touch targets, `inputmode`, focus rings |
| `MaterialRequestCard` | Extract | Shared mat request display (Foreman + Employee) |

**New hooks/utils to extract:**
- `src/hooks/useLang.js` — t() function duplicated in all 3 portals; same localStorage key, same logic
- `src/utils/dateUtils.js` — `getWeekStart` duplicated in ForemanView and EmployeeView

**What not to touch:** Business logic, API calls, the `app` prop bundle shape, tab routing state, data fetching hooks.

### Critical Pitfalls

1. **Inline styles win specificity wars silently** — Adding a CSS class without removing the corresponding `style={{}}` property means the class never takes effect. The fix looks correct in code review, renders wrong on device. Rule: remove the inline style property in the same commit that adds the replacement class. Measure progress by `grep -c "style={{" src/tabs/*.jsx` going down.

2. **Partial migration ships to production** — ForemanView has 11 tabs. Migrating 6 and shipping them with 5 still inline creates visible inconsistency in multi-theme mode. Foremen notice. Trust erodes. Rule: a portal does not merge to main until all its tabs are complete.

3. **CSS variable name collisions** — The existing system defines `--amber`, `--bg`, `--text`, `--border`, etc. Adding new tokens that collide with or rename existing vars breaks theme switching silently on specific themes. Rule: add new semantic tokens as aliases pointing to existing primitive vars; do not rename anything this milestone.

4. **Touch target expansion breaks dense layouts** — Expanding `.btn` from 24px to 44px in a dense crew roll-call list breaks card layout and scroll. Use `min-height: 44px` with padding increases, not `height: 44px`. Test every tab view at 375px viewport after expanding targets. The clock-in circle (200x200 inline) is already oversized — exclude it from the 44px rule.

5. **Hard-coded phase colors in JavaScript data structures** — ForemanView has 8 hex colors embedded in JS phase data objects (`{ color: "#f59e0b" }`). CSS migration won't reach these. They need separate treatment: map phase keys to `--phase-*` CSS vars, or read computed values at runtime. These produce contrast failures in Daylight/Matrix themes.

---

## Implications for Roadmap

### Phase 1: Token Foundation
**Rationale:** Nothing else can proceed until the vocabulary is established. Token additions are purely additive (no risk to existing behavior) and take the approach from "fixing as we go" to "fixing against a system."
**Delivers:** CSS spacing scale (`--space-1` through `--space-12`), typography scale (`--text-xs` through `--text-3xl`), `--touch-min: 44px`, loading state CSS classes (`.loading-spinner`, `.skeleton`, `.async-state`), form error classes. Also: `useLang` hook extraction and `dateUtils` extraction.
**Avoids:** Pitfall 2 (collision) — establishes canonical var names before any migration touches portals.
**Research flag:** Standard patterns, no additional research needed.

### Phase 2: Shared Field Components
**Rationale:** Portal refactors depend on these components existing. Building them in isolation (with no portal wiring yet) lets each component be verified cleanly before it touches a 3,000-line file.
**Delivers:** `EmptyState`, `StatusBadge`, `LoadingSpinner`, `SkeletonBlock`, `AsyncState`, `FieldSignaturePad`, `PortalHeader`, `PortalTabBar`, `FieldInput`, `FieldSelect`, `MaterialRequestCard`.
**Addresses:** Table stakes: loading states, empty states, error states, touch-optimized inputs.
**Avoids:** Pitfall 7 (i18n breakage) — components must call `t()` internally, never accept pre-translated strings.
**Research flag:** Standard patterns, no additional research needed.

### Phase 3: DriverView Refactor (pilot)
**Rationale:** Smallest portal (510 lines, 42 inline styles). Proves the migration process works before committing to the larger portals. Any process errors surface here at low cost.
**Delivers:** DriverView with zero inline styles, all classes from token system, PortalHeader and PortalTabBar wired, loading/empty states on all async operations.
**Avoids:** Pitfall 5 (partial migration ships) — complete DriverView fully before merging.
**Research flag:** Standard patterns.

### Phase 4: EmployeeView Refactor
**Rationale:** Mid-size portal (1,745 lines, 135 inline styles). Higher ROI per line of work than ForemanView. Must audit and define `--accent` in THEMES before starting (currently used in EmployeeView but undefined in THEMES object).
**Delivers:** EmployeeView with zero inline styles, FieldInput/FieldSelect wired to all form fields, inputmode attributes on all numeric/phone fields, clock-in haptic feedback, pull-to-refresh on data lists.
**Addresses:** Table stakes: haptic confirmation, form autosave for JSA (draft to localStorage every 30 seconds).
**Avoids:** Pitfall 1 (specificity war), Pitfall 7 (i18n on extracted components).

### Phase 5: ForemanView Refactor
**Rationale:** Largest and most complex portal. Saved for last when the process is proven and components are tested. Work tab by tab — clock tab first (highest traffic), then dashboard, team, materials, JSA, drawings, remaining tabs.
**Delivers:** ForemanView with zero inline styles, 11-tab horizontal scroll collapsed to bottom tab bar (Clock, Crew, Materials, Safety, More), phase data colors migrated to `--phase-*` CSS vars, FieldSignaturePad wired in JSA tab.
**Addresses:** Anti-pattern fix: 11-tab horizontal nav collapses to 4-5 bottom tabs. Table stakes: disabled states on in-flight actions, skeleton screens on all tab data loads.
**Avoids:** Pitfall 3 (hard-coded phase colors), Pitfall 4 (touch expansion breaks roll-call layout).
**Research flag:** Bottom tab navigation refactor is a structural change — flag for light architectural review during planning to confirm tab grouping logic before coding.

### Phase 6: Polish and Outdoor Audit
**Rationale:** Polish items that benefit from the clean token system being fully in place. Outdoor testing must happen on a physical device, not emulator.
**Delivers:** Pull-to-refresh on all remaining data lists, full 5-theme gauntlet test on all portals, outdoor sunlight contrast audit on device (target 7:1 on dark themes), SyncStatus component extended with pending-changes count badge.
**Avoids:** Pitfall 13 (Matrix/Blueprint themes missed in testing).
**Research flag:** Standard patterns.

### Phase Ordering Rationale

- Phases 1 and 2 are prerequisites for everything else. Nothing touches the portals until the token vocabulary and shared components exist — otherwise each portal gets a different subset of fixes and the inconsistency problem gets worse.
- Portal refactors follow smallest-to-largest to validate the process at low risk first.
- ForemanView's navigation restructure (11 tabs → bottom nav) is the highest structural risk and goes last, when the team's migration confidence is highest.
- Polish/outdoor audit goes last because it requires the full token system to be in place to be meaningful.

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (ForemanView):** The 11-tab-to-bottom-nav refactor needs a decision on tab grouping (which 4-5 tabs become primary, what goes in "More") before building. This is a product decision that should be validated with the foreman user before implementation.

Phases with well-established patterns (no additional research needed):
- **Phase 1:** CSS token additions to an existing system — no unknowns
- **Phase 2:** Component extraction from existing code — no unknowns
- **Phase 3:** DriverView is small enough that research adds no value over just building it
- **Phase 4:** EmployeeView refactor follows established portal migration pattern
- **Phase 6:** Polish pass — standard quality assurance work

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on direct codebase inspection, not assumptions. `clsx` and `vite-plugin-webfont-dl` are verified. Only gap: Vite 8 compatibility of the font plugin. |
| Features | HIGH | Table stakes from WCAG standards + direct codebase audit of gaps. Differentiators from verified Procore/Fieldwire pattern analysis. |
| Architecture | HIGH | All findings from direct file inspection. Inline style counts, class inventory, and component structure verified by grep analysis. |
| Pitfalls | HIGH | Grounded in actual codebase audit (specific line numbers, specific counts). Not generic advice — every pitfall maps to a real instance in the code. |

**Overall confidence: HIGH**

### Gaps to Address

- **Font decision (Fira Code/Fira Sans vs. Barlow/Barlow Condensed):** PROJECT.md says one thing, existing themes say another. Needs PM decision before the font plugin is configured. Does not block Phases 1-3.
- **ForemanView tab grouping:** Which tabs become the 4-5 primary bottom tabs? "Clock, Crew, Materials, Safety, More" is a research suggestion but should be validated with Emmanuel or a foreman before Phase 5 builds. Documents/Reports/Site/Notes need a home.
- **`--accent` variable:** Used in ForemanView and EmployeeView JSX but not defined in the THEMES object. Must be audited and formally added as a theme alias before any portal migration touches elements that reference it.
- **Service worker caching strategy:** PITFALLS.md flagged the need to read the actual SW file before starting CSS refactor. Confirm Vite content-hashes CSS output and that the SW does not manually cache by URL path.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/styles.js`, `src/data/constants.js`, `src/tabs/ForemanView.jsx`, `src/tabs/EmployeeView.jsx`, `src/tabs/DriverView.jsx`, `src/App.jsx` — all architectural findings
- [WCAG 2.5.5 Target Size (Enhanced)](https://testparty.ai/blog/wcag-target-size-guide) — 44px minimum touch target standard
- [Skeleton Screens 101 — Nielsen Norman Group](https://www.nngroup.com/articles/skeleton-screens/) — loading state patterns
- [Industrial UX: Sunlight Susceptible Screens](https://medium.com/@callumjcoe/industrial-ux-sunlight-susceptible-screens-2e52b1d9706b) — outdoor contrast and color
- [CSS Specificity — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity) — specificity pitfall basis
- [React 19 Ref as Prop](https://blog.saeloun.com/2025/03/24/react-19-ref-as-prop/) — forwardRef no longer required

### Secondary (MEDIUM confidence)
- [clsx on npm](https://www.npmjs.com/package/clsx) — bundle size, ESM support
- [vite-plugin-webfont-dl on GitHub](https://github.com/feat-agency/vite-plugin-webfont-dl) — build-time font downloading
- [Offline Mobile App Design — OpenForge](https://openforge.io/offline-mobile-app-design/) — offline state patterns
- [Bottom Tab Bar Navigation Best Practices — UX Dworld](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/) — tab navigation
- [Procore Mobile Navigation Redesign](https://support.procore.com/product-releases/new-releases/mobile-new-sidebar-and-home-screen-experience-for-procore-ios-and-android-apps) — field app nav patterns
- [Design System in Existing Product — Netguru](https://www.netguru.com/blog/design-system-in-existing-product) — migration strategy
- [Dark Mode vs Light Mode: Complete UX Guide 2025 — AlterSquare](https://altersquare.io/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025/) — dark mode best practices
- [2025 Guide to Haptics — Saropa](https://saropa-contacts.medium.com/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback-676dd5937774) — haptic feedback guidelines

### Tertiary (LOW confidence)
- Font decision (Fira Code vs. Barlow) — design/brand call, not resolvable by research

---

*Research completed: 2026-03-30*
*Ready for roadmap: yes*
