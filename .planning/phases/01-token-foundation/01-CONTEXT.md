# Phase 1: Token Foundation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Define CSS custom properties for spacing, typography, touch targets, focus rings, shadows, transitions, and semantic color aliases. This is pure design vocabulary — no UI components, no portal refactoring. Every portal will consume these tokens starting in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Token File Location
- **D-01:** Claude's Discretion — choose the best approach for where tokens live (extend THEMES in constants.js, new CSS file, or hybrid). The key constraint: theme-specific values (semantic colors, shadows) must resolve per-theme, while universal tokens (spacing, touch, focus) are the same everywhere.

### MASTER.md Role
- **D-02:** design-system/ebc-os/MASTER.md is a reference, not source of truth. REQUIREMENTS.md and the existing codebase take priority. MASTER.md values can be adjusted freely to fit the actual app.

### Spacing Scale
- **D-03:** Claude's Discretion — choose the spacing scale that best matches existing padding/margin values in the codebase. REQUIREMENTS.md suggests 4/8/12/16/20/24/32/40/48px (9 steps). MASTER.md uses 4/8/16/24/32/48/64 (7 steps). Pick what works.
- **D-04:** Claude's Discretion — choose px vs rem based on what makes sense for a mobile-first construction field app.

### Semantic Color Mapping
- **D-05:** Claude's Discretion — decide whether status colors (approved/pending/denied/in-transit) are universal hex values or theme-adapted. Consider the existing 8-theme system.
- **D-06:** Claude's Discretion — decide whether phase colors use named tokens (--phase-framing) or numbered tokens (--phase-1, --phase-2). Consider how phases are used in the codebase (currently array-indexed in PHASE_COLORS).

### Shadow System
- **D-07:** Claude's Discretion — decide whether shadow tokens are universal or per-theme. Consider that dark themes naturally diminish box-shadow visibility.
- **D-08:** Claude's Discretion — decide whether to also tokenize glass/blur effects or keep Phase 1 scope to box-shadow only.

### Claude's Discretion
Claude has full flexibility on all implementation decisions for this phase. The user trusts Claude to make the best technical choices based on codebase analysis. Key constraints to respect:
- CSS variables over Tailwind (project decision)
- Extend existing system, no migration overhead (project decision)
- Font decision is unresolved (Fira vs Barlow) — do NOT commit to a font family. Typography tokens should cover sizes/weights/line-heights only.
- Must work across all 8 existing themes without breaking theme switching
- Tokens must satisfy all 7 TOKN-* requirements

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Theme System
- `src/data/constants.js` — THEMES object with 8 themes, ~25 CSS vars each. This is the current theme definition system.
- `src/styles.js` — Global CSS-in-JS string consuming theme variables. All existing layout/component styles live here.

### Existing Color Usage
- `src/tabs/MoreTabs.jsx` — PHASE_COLORS array (8 hex values for chart bars)
- `src/tabs/EmployeeView.jsx` — PHASE_COLORS object
- `src/tabs/DeliveriesTab.jsx` — STATUS_COLORS object (approved/in-transit/project/office)
- `src/tabs/calendar/CalendarPTO.jsx` — STATUS_COLORS (pending/approved/denied)
- `src/App.jsx` — STATUS_COLORS useMemo

### Design Reference
- `design-system/ebc-os/MASTER.md` — Reference (not source of truth) for spacing, shadow, typography patterns

### Requirements
- `.planning/REQUIREMENTS.md` §Design Tokens — TOKN-01 through TOKN-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **THEMES object** (`src/data/constants.js`): Well-structured theme system with 8 themes. Each theme defines CSS custom properties applied to document root. This is the extension point for new tokens.
- **styles.js global CSS**: Uses var() references extensively. New tokens can be consumed immediately by this file.
- **Glass aesthetic** (`.glass`, `.card-glass`): backdrop-filter pattern is established and works across themes.

### Established Patterns
- **Theme switching**: App.jsx applies theme vars to document root. New tokens added to THEMES will automatically participate in theme switching.
- **CSS-in-JS via template literal**: `src/styles.js` exports a single CSS string injected into a `<style>` tag. Utility classes are defined here.
- **Hard-coded values**: Spacing (16px, 24px, 20px, 14px scattered), font sizes (11px-28px various), shadows (inline rgba), and colors (hex arrays) are NOT tokenized yet.

### Integration Points
- **THEMES object in constants.js**: Add new token vars to each theme object
- **styles.js**: Add utility classes that consume new tokens (e.g., `.shadow-sm`, `.shadow-md`)
- **Existing inline styles in portal views**: Will be migrated in Phases 3-5, not Phase 1

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred all implementation decisions to Claude's best judgment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-token-foundation*
*Context gathered: 2026-03-30*
