# Phase 2: Shared Field Components - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Build `src/components/field/` — 11 shared components that all three portal refactors (Phases 3–5) will consume. Components must consume Phase 1 design tokens, enforce 44px touch targets, use theme-aware CSS variables (zero hard-coded hex), and handle async loading/empty/error states. This is a component extraction and creation phase — no portal wiring, no inline style cleanup in existing portals yet.

</domain>

<decisions>
## Implementation Decisions

### PortalHeader
- **D-01:** Claude's Discretion on implementation pattern — choose between prop-driven single component or slot-based minimal core. Key constraint: must cover three distinct existing variants (Foreman: logo + title + settings gear; Employee: logo + user name + language toggle + logout; Driver: logo + user name + logout).
- **D-02:** Claude's Discretion on project selector placement — decide whether the project selector (currently embedded near ForemanView's header) lives inside `PortalHeader` or is placed below the header by the portal itself. Consider 375px layout constraints.

### Component Extraction Strategy
- **D-03:** Claude's Discretion per component — extract-and-fix where existing code is solid (e.g., `FieldSignaturePad` logic in ForemanView.jsx is battle-tested but has hard-coded hex `#1e2d3b` and `#f8f9fb` that must be tokenized). Build fresh where existing code is a mess or no clean version exists.
- **D-04:** When extracting, the extraction target is `src/components/field/`. Extracted components must be fully decoupled from the source file — no leftover inline styles, all colors via CSS vars.

### AsyncState Pattern
- **D-05:** Claude's Discretion on implementation pattern — choose children wrapper, render prop, or another approach based on what fits existing portal code best. Must cleanly handle four states: loading (skeleton), empty (with message + optional action), error (with message), and success (children).

### PortalTabBar
- **D-06:** Build the overflow "More" pattern NOW in Phase 2, not deferred to Phase 5. Rationale: 150+ field crew users whose entire app mental model is Facebook/TikTok — they recognize bottom nav + "More" overflow immediately. Foremen have 11 tabs; hiding 6–7 behind "More" is the correct UX for this audience.
- **D-07:** Tab bar design must follow consumer app conventions: bottom-anchored, always visible, icons + text labels (never icon-only — field workers in varying lighting and education levels cannot rely on icon recognition alone), unmistakably clear active state. Touch targets 44px minimum.

### Field User Experience Philosophy
- **D-08:** All 11 components must be designed for a 150-person field crew with Facebook/TikTok as their primary app familiarity baseline. Every interaction pattern should derive from consumer app conventions, not enterprise software. This is the guiding principle for every component design decision in this phase.

### Claude's Discretion
Claude has full flexibility on:
- PortalHeader implementation pattern (prop-driven vs slot-based)
- PortalHeader project selector placement
- Per-component extraction vs fresh build decision
- AsyncState implementation pattern (children wrapper vs render prop vs other)
- PortalTabBar overflow implementation details (drawer, sheet, modal, inline expand)

Constraints that are NOT flexible:
- No new npm dependencies
- No font-family tokens (Fira vs Barlow decision unresolved, deferred to post-milestone)
- All UI text through `t()` translation function — bilingual (EN/ES)
- CSS variables only — zero hard-coded hex or rgba in component source
- 44px minimum touch targets on all interactive elements
- Must work across all 5 existing themes without breaking theme switching

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Token System (Phase 1 output — components consume these)
- `src/tokens.css` — Universal CSS custom properties: spacing (`--space-*`), typography (`--text-*`, `--weight-*`), touch (`--touch-min: 44px`), focus ring (`--focus-ring`), transitions
- `src/data/constants.js` — THEMES object with per-theme tokens: `--shadow-sm/md/lg`, `--status-*`, `--phase-*`, all primitive color vars (`--amber`, `--green`, `--red`, etc.)
- `src/styles.js` — Utility classes: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.card`, `.card-glass`, `.badge`, `.badge-green/red/amber/blue/muted`, `.shadow-sm/md/lg`, `.touch-target`, `.focus-visible`, `.transition-micro/state`

### Existing Code to Extract From
- `src/tabs/ForemanView.jsx` lines 20–65 — `FieldSignaturePad` component (extract-and-tokenize target). Hard-coded: `ctx.strokeStyle = "#1e2d3b"`, `background: "#f8f9fb"`
- `src/tabs/DeliveriesTab.jsx` — `STATUS_COLORS` object (lines 14+), status badge rendering patterns
- `src/tabs/EmployeeView.jsx` — Material request card markup, `employee-header` class usage
- `src/tabs/DriverView.jsx` — `employee-header` usage, route card patterns

### Requirements
- `.planning/REQUIREMENTS.md` §Shared Components — COMP-01 through COMP-11 (all 11 components defined)

### Design Reference
- `design-system/ebc-os/MASTER.md` — Reference only (not source of truth). Useful for shadow/spacing patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`FieldSignaturePad` (ForemanView.jsx:20–65)**: Complete, battle-tested signature canvas with touch support and clear/save. Needs hex-to-token swap only. Best extraction candidate.
- **`.btn` / `.btn-primary` / `.btn-ghost` / `.btn-danger` classes (styles.js)**: `FieldButton` should layer on top — enforce `min-height: var(--touch-min)` and loading spinner state, not replace the existing btn styles.
- **`.badge-*` classes (styles.js)**: `StatusBadge` can wrap these with semantic status-to-variant mapping logic.
- **`.card` / `.card-glass` (styles.js)**: `FieldCard` extends these with consistent field-app padding and token-based variants.

### Established Patterns
- **Theme switching**: `App.jsx` applies `THEMES[theme].vars` to `document.documentElement.style` at runtime. Components using `var(--token)` automatically participate — no component-level theme logic needed.
- **CSS-in-JS via template literal**: `src/styles.js` exports a single CSS string. New component utility classes should be added here, not in separate CSS files per component.
- **Translation**: All display text uses `t("string")` pattern. Components must accept `t` as a prop or use a translation hook.
- **Lucide React icons**: Consistent SVG icon system already in use — `PortalTabBar` and `EmptyState` should use Lucide icons.

### Integration Points
- **`src/components/field/`**: New directory — does not exist yet. All 11 components land here.
- **`src/styles.js`**: Add component-level utility classes here (e.g., `.field-tab-bar`, `.field-header`, `.async-skeleton`).
- **Portal files (ForemanView, EmployeeView, DriverView)**: Phase 2 does NOT touch these. Components are built and verified in isolation. Portal wiring happens in Phases 3–5.

</code_context>

<specifics>
## Specific Ideas

- **PortalTabBar "More" overflow**: Pattern familiar to 150-person field crew from Facebook/TikTok. Build it correctly now so Phase 5 ForemanView gets it for free with its 11 tabs.
- **Icon + label tabs**: Never icon-only. Field workers in variable lighting and education backgrounds need text labels beneath icons — identical to Facebook's tab bar convention.
- **Consumer app baseline**: Every component interaction decision should ask "does this feel like Facebook or TikTok?" before asking "does this follow Material Design?" The target user has strong muscle memory from consumer apps, not enterprise tools.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-shared-field-components*
*Context gathered: 2026-03-31*
