# Phase 7: Premium Foundation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Data model extensions for scheduling and credentials, Premium Construction visual language applied to all shared components, and new shared components (PremiumCard, StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab) built and ready for portal consumption in Phases 8-10. EBC Brand theme becomes the default. No portal-level page layouts change in this phase -- only foundation work.

</domain>

<decisions>
## Implementation Decisions

### Card System (VIS-03, VIS-04)
- **D-01:** Create a NEW `PremiumCard` component in `src/components/field/` with three variants: Hero, Info, Alert. Do NOT modify existing FieldCard -- it stays for backward compatibility.
- **D-02:** Hero variant: gradient bg (--bg2 to --bg3), 3px accent left border, shadow-sm. Info variant: flat --bg2, no shadow. Alert variant: accent-tinted bg (rgba), dot indicator.
- **D-03:** Claude's Discretion on migration boundary -- decide whether shared components (PortalHeader, EmptyState) adopt PremiumCard in Phase 7, or wait for portal-specific phases 8-9.

### PortalHeader Eagle Logo (VIS-02)
- **D-04:** Eagle logo always visible in PortalHeader across ALL themes -- not just EBC Brand. This is company identity, not theme-specific.
- **D-05:** Eagle logo is theme-aware -- use `ebc-eagle-white.png` as the base asset, apply CSS filter or swap to `eagle-blue.png` (Daylight) or other color variants as needed for contrast per theme.
- **D-06:** Asset already exists at `public/ebc-eagle-white.png` and `public/eagle-blue.png`. No new assets needed -- recolor via CSS or existing variants.
- **D-07:** Keep the existing `onError` fallback pattern (hide logo if image fails to load).

### Default Theme (VIS-01)
- **D-08:** EBC Brand theme becomes the default for new users by changing `defaultTheme` in `src/data/constants.js`. Existing users who have a saved theme preference keep their selection.

### EmptyState Redesign (VIS-05)
- **D-09:** Every EmptyState instance MUST include an actionable button. No passive "check back later" messaging. The action prop (already a ReactNode slot) must always be populated.
- **D-10:** Visual refresh per design spec: Lucide icon 40px, heading in --text-base bold, body in --text-sm --text2, FieldButton primary as action.

### Supabase Schema (DATA-01, DATA-02, DATA-03)
- **D-11:** Claude's Discretion on delivery method -- SQL migration file in `supabase/` directory (matching existing `schema.sql` pattern) OR Supabase CLI migration. Pick what fits the project's existing pattern.
- **D-12:** Create `available_shifts` table: date, time_start, time_end, project_id, foreman_id, trade, overtime (boolean), status (open/claimed/cancelled), claimed_by (nullable employee_id), created_at, updated_at.
- **D-13:** Create `shift_requests` table: employee_id, shift_id (FK to available_shifts), status (pending/approved/denied), reviewed_by (nullable foreman_id), review_notes, created_at, updated_at.
- **D-14:** Extend `certifications` table with 3 new columns: `issuing_org` (TEXT), `photo_path` (TEXT, nullable), `cert_category` (TEXT -- e.g., safety, trade, license).
- **D-15:** RLS policies created in Phase 7 alongside the tables -- tables must be secured from creation. Foremen: read/write shifts, review requests. Employees: read shifts, create requests, manage own certs.

### DrawingsTab Extraction (PLAN-03)
- **D-16:** Full extraction from ForemanView.jsx -- the entire drawings tab (list + DrawingViewer integration) becomes `src/components/field/DrawingsTab.jsx`.
- **D-17:** Props: `readOnly` (boolean -- false for foreman, true for employee/driver), `projectFilter` (project ID or array -- filters drawings to relevant projects), `onDrawingSelect` (optional callback).
- **D-18:** Self-contained Supabase queries -- DrawingsTab fetches its own data from `project_drawings` table given a projectId. Consumers just mount it with a project ID.
- **D-19:** ForemanView replaces its inline drawings code with `<DrawingsTab readOnly={false} projectFilter={selectedProjectId} />`.

### Translations (VIS-06)
- **D-20:** All new UI strings introduced in Phase 7 must have EN and ES translations added to the existing translations.js pattern.

### Claude's Discretion
Claude has full flexibility on:
- PremiumCard migration boundary (Phase 7 shared components or Phase 8-9 portals)
- Supabase migration delivery method (SQL file vs CLI migration)
- Eagle logo CSS filter approach vs asset swap per theme
- StatTile, AlertCard, ShiftCard, CredentialCard component API design (props, variants)
- Whether to create a new `--text-display` token for 28px hero numbers or use inline size

Constraints that are NOT flexible:
- PremiumCard is a NEW component, not a FieldCard modification
- Eagle logo always visible on all themes
- RLS policies created with the tables, not deferred
- DrawingsTab is self-contained with own Supabase queries
- No new npm dependencies
- px units for all sizing (not rem)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Specification
- `docs/superpowers/specs/2026-04-03-ui-overhaul-design.md` -- Full design spec with color tokens, typography hierarchy, card system CSS, header redesign, tab bar updates, empty state patterns, and all portal layouts

### Database Schema
- `supabase/schema.sql` -- Current schema including certifications table (needs column extensions)
- `supabase/rls_policies.sql` -- Existing RLS policy patterns to follow

### Shared Components (being updated)
- `src/components/field/FieldCard.jsx` -- Existing card component (stays unchanged, PremiumCard is new)
- `src/components/field/PortalHeader.jsx` -- Header component getting eagle logo + visual refresh
- `src/components/field/EmptyState.jsx` -- Empty state component getting action-required redesign
- `src/components/field/PortalTabBar.jsx` -- Tab bar getting visual refresh
- `src/components/field/FieldButton.jsx` -- Button component getting visual refresh
- `src/components/field/index.js` -- Barrel file for all field components (add new exports)

### Design Tokens & Styles
- `src/tokens.css` -- Universal design tokens (spacing, typography, transitions)
- `src/styles.js` -- CSS class definitions (new card variant classes go here)
- `src/data/constants.js` -- Theme definitions including EBC Brand vars, defaultTheme setting

### Source for DrawingsTab Extraction
- `src/tabs/ForemanView.jsx` -- Lines ~93, ~398-461, ~818, ~2729-2801 contain drawings state, fetch logic, tab registration, and render code
- `src/components/DrawingViewer.jsx` -- Existing viewer component used by drawings tab
- `src/lib/supabase.js` -- Supabase client and storage helpers

### Prior Phase Context
- `.planning/phases/01-token-foundation/01-CONTEXT.md` -- Token decisions (px units, token naming)
- `.planning/phases/02-shared-field-components/02-CONTEXT.md` -- Component patterns (hover:hover, FieldButton Lucide imports, EmptyState action slot)
- `.planning/phases/06-polish-and-theme-audit/06-CONTEXT.md` -- Theme polish decisions (--accent aliases, transition scope)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FieldCard` (src/components/field/FieldCard.jsx) -- Layout wrapper, no variants. PremiumCard builds on same principles but with Hero/Info/Alert differentiation.
- `PortalHeader` (src/components/field/PortalHeader.jsx) -- Already renders eagle logo via `<img src="/ebc-eagle-white.png">`. Needs visual refresh + theme-aware logo swap.
- `EmptyState` (src/components/field/EmptyState.jsx) -- Action prop is ReactNode slot. Needs enforcement that action is always present.
- `DrawingViewer` (src/components/DrawingViewer.jsx) -- PDF viewer component, already standalone.
- `useNetworkStatus` hook -- online/offline detection, used in Phase 6 offline banner.
- `useDrawingCache` hook -- Offline drawing caching, relevant to DrawingsTab.

### Established Patterns
- CSS classes defined in `styles.js`, injected via `<style>` tag in main.jsx
- Theme vars in `constants.js` THEMES object, applied via CSS custom properties
- i18n via `t()` function from `translations.js`
- Supabase queries directly in components (no abstraction layer)
- Component barrel exports from `src/components/field/index.js`

### Integration Points
- `constants.js` `defaultTheme` property -- change from current default to "ebc"
- `src/components/field/index.js` -- Add PremiumCard, DrawingsTab, and other new component exports
- `styles.js` -- Add CSS classes for PremiumCard variants, updated EmptyState, header refresh
- `supabase/schema.sql` -- Add new tables and column extensions

</code_context>

<specifics>
## Specific Ideas

- Eagle logo should use CSS filter for theme adaptation rather than maintaining multiple image assets per theme (white base + filter for contrast)
- Design spec prescribes exact CSS for each card variant (Hero: gradient bg + accent border-left, Info: flat bg2, Alert: accent-tinted rgba bg + dot indicator) -- implement per spec
- PortalHeader design spec: left=eagle 24px, center=empty, right=language toggle + avatar circle, bottom border=accent-tinted rgba

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 07-premium-foundation*
*Context gathered: 2026-04-03*
