# Phase 6: Polish and Theme Audit - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-portal visual QA, theme consistency across all 5 themes, global touch and scroll optimizations, responsive verification at 375px/768px/1024px viewports, and offline/sync status indicator rollout to all 3 portals. This is the final polish pass before the milestone closes -- no new features, no new components, no business logic changes.

</domain>

<decisions>
## Implementation Decisions

### Theme Gauntlet (PLSH-01)
- **D-01:** Full polish on ALL 5 themes -- Steel, Blueprint, Daylight, Matrix, Anime. Every theme should feel intentional and professional, even novelty themes (Matrix, Anime). Fix broken vars, contrast issues, inconsistent hover states, mismatched card backgrounds.
- **D-02:** Claude's Discretion on audit method -- choose between systematic manual checklist, automated screenshot capture, or hybrid approach based on what the codebase and tooling support.
- **D-03:** Outdoor readability optimization targets Daylight and Blueprint themes specifically. Steel/Matrix/Anime are indoor/vehicle use -- standard contrast is fine.
- **D-04:** White flash prevention on theme switch is NOT a priority -- skip this.
- **D-05:** Add smooth CSS transition when switching themes so colors don't jump abruptly. Polish touch, not a blocking requirement.

### Hover States
- **D-06:** Claude's Discretion on hover approach -- decide whether to apply `hover:hover` media query to all interactive elements (current pattern on field cards) or use subtle hover effects on all devices. Base decision on what feels best per component.

### Dark Theme Contrast
- **D-07:** Claude's Discretion on contrast target -- determine a practical minimum for Steel, Matrix, and Anime dark themes that ensures field crew readability without clinical accessibility certification.

### Theme Switching UX
- **D-08:** Add a brief CSS transition when switching themes. No live preview or theme picker redesign -- just smooth the color change.

### Offline/Sync Indicator (PLSH-05)
- **D-09:** Persistent banner style -- always-visible strip when offline or reconnecting.
- **D-10:** Offline-only + reconnect behavior: hidden when fully online and synced. Shows "Offline -- N actions pending" when disconnected. Shows "Back online -- syncing N actions" on reconnect. Disappears after sync completes.
- **D-11:** Claude's Discretion on placement -- decide whether to integrate into PortalHeader (single implementation, all portals inherit) or create a separate NetworkBanner component. PortalHeader integration is likely cleaner since all 3 portals already use it.
- **D-12:** Wire `useNetworkStatus` hook (already exists in `src/hooks/useNetworkStatus.js`) which provides `online`, `pendingCount`, and `wasOffline` state.

### Responsive (PLSH-04)
- **D-13:** Claude's Discretion on 375px approach -- audit at 375px and add breakpoints only where content actually breaks. No preemptive 375px media queries.
- **D-14:** Claude's Discretion on tablet optimization -- determine if 768px/1024px layouts warrant multi-column treatment based on content density per portal.
- **D-15:** Support both portrait and landscape orientations -- design for portrait as primary, ensure landscape doesn't overflow or break.

### Touch/Scroll Globals (PLSH-02, PLSH-03)
- **D-16:** Apply `touch-action: manipulation` globally (on `*, *::before, *::after` or body) to eliminate 300ms tap delay everywhere. Override with `touch-action: none` only on canvas/signature pad elements.
- **D-17:** Claude's Discretion on overscroll-behavior -- `none` is already global in index.css. Decide whether to keep `none` (stricter, prevents all overscroll) or switch to `contain` (allows iOS rubber-band bounce, feels more native).

### Claude's Discretion
Claude has full flexibility on:
- Theme audit methodology (checklist vs screenshots vs hybrid)
- Hover effect approach (hover:hover media query vs subtle universal hover)
- Dark theme contrast target (practical readability over strict WCAG)
- Offline indicator placement (PortalHeader integration vs standalone component)
- 375px fix approach (audit-driven, add breakpoints only where needed)
- Tablet layout optimization (scale mobile vs multi-column where warranted)
- Overscroll-behavior value (none vs contain)

Constraints that are NOT flexible:
- All 5 themes must pass with full polish quality
- Daylight + Blueprint must be readable outdoors (bright sunlight contrast)
- No new npm dependencies
- No business logic changes
- All UI text through `t()` translation function
- Must not regress any portal functionality
- Presentation layer only -- no backend changes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Tokens
- `src/tokens.css` -- Universal tokens (spacing, typography, touch, transitions)
- `src/styles.js` -- All CSS classes including field component styles, per-portal classes, media queries
- `src/data/constants.js` -- THEMES object with all 5 theme definitions (Steel, Blueprint, Daylight, Matrix, Anime)

### Shared Components
- `src/components/field/PortalHeader.jsx` -- Header component used by all portals (potential offline indicator integration point)
- `src/components/field/index.js` -- Barrel export for all field components

### Network Status
- `src/hooks/useNetworkStatus.js` -- Hook providing `online`, `pendingCount`, `wasOffline`, `refreshPending`
- `src/App.jsx` -- Currently the only consumer of useNetworkStatus

### Portal Views
- `src/tabs/DriverView.jsx` -- Smallest portal (0 remaining inline styles)
- `src/tabs/EmployeeView.jsx` -- Mid-size portal (8 dynamic inline style exceptions)
- `src/tabs/ForemanView.jsx` -- Largest portal (20 dynamic inline style exceptions)

### Existing Global Styles
- `src/index.css` -- Contains global `overscroll-behavior: none`
- `src/App.css` -- Contains 1024px media queries for layout

### Requirements
- `.planning/REQUIREMENTS.md` -- PLSH-01 through PLSH-05 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useNetworkStatus` hook: fully built with online/offline detection, pendingCount from localStorage queue, wasOffline flag with 5s auto-clear. Just needs to be wired into portal UI.
- `touch-action: manipulation` already on ~12 CSS classes in styles.js -- will be replaced by global rule.
- `overscroll-behavior: none` already global in index.css -- PLSH-03 may already be satisfied.
- `hover:hover` media query pattern established on `.field-card` -- reusable for other components.
- Responsive media queries at 768px and 1024px already exist for employee map, foreman tabs, calendar views.

### Established Patterns
- Theme CSS vars defined in THEMES object in constants.js, applied via inline style on root element.
- All field components consume CSS vars (no hard-coded hex) -- theme switching should "just work" if vars are defined.
- Dynamic inline style exceptions are documented per-phase (runtime-computed values like progress %, canvas display, z-index) -- these are NOT bugs.

### Integration Points
- PortalHeader is the natural integration point for offline banner -- all 3 portals already render it.
- `src/index.css` is the natural place for global touch-action rule.
- Theme transition CSS would go in index.css or tokens.css (global scope).

</code_context>

<specifics>
## Specific Ideas

- Cowboy/Texas/Rodeo theme requested as a future addition -- deferred (does not exist in codebase)
- Outdoor readability specifically for Daylight + Blueprint -- the two lightest themes
- Smooth theme switching transition -- brief CSS transition on color change
- Offline banner should be non-intrusive when online, prominent when offline

</specifics>

<deferred>
## Deferred Ideas

- **Cowboy/Texas/Rodeo theme** -- New theme idea for field crews. Requires full theme definition in constants.js + audit. Own phase or post-milestone.
- **Live theme preview** -- Show mini preview of each theme before selecting. UX enhancement, not required for polish.
- **Always-visible connection status** -- Green "Connected" bar even when online. User chose offline-only display instead.

</deferred>

---

*Phase: 06-polish-and-theme-audit*
*Context gathered: 2026-04-01*
