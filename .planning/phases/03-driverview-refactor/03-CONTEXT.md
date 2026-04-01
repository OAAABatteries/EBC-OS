# Phase 3: DriverView Refactor - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate DriverView.jsx (510 lines, 42 inline styles) to zero inline styles, wire all shared field components, add loading/empty states on every async operation. This is the pilot refactor — the proven process here will be replicated for EmployeeView (Phase 4) and ForemanView (Phase 5). No new features, no business logic changes — presentation layer only.

</domain>

<decisions>
## Implementation Decisions

### Route Card Layout
- **D-01:** Claude's Discretion on card structure — choose between FieldCard + StatusBadge composition or a specialized approach based on route card's unique needs (drag-and-drop, stop numbering, distance display, action buttons). Key constraint: must eliminate all 42 inline styles.
- **D-02:** Claude's Discretion on stop number badge — choose between CSS-classed colored circle (current look) or StatusBadge reuse. Amber for in-transit, accent for queued must be preserved.
- **D-03:** Improve touch drag-and-drop experience. Current HTML5 drag events work poorly on mobile. Implement a touch-friendly alternative with long-press to initiate drag and clear visual feedback during reorder. This is a UX improvement, not a new feature — the drag-and-drop capability already exists.

### Header + Tab Navigation
- **D-04:** Wire PortalHeader to replace `employee-header` class usage. PortalHeader handles logo, user name, logout, language toggle.
- **D-05:** Wire PortalTabBar as bottom navigation bar. 3 tabs: Route (with stop count badge), Completed (with delivered count badge), Settings. Icons + text labels. No More menu needed (under 5 tabs). This establishes the bottom-nav pattern that Employee and Foreman portals will also use.

### KPI Summary Bar
- **D-06:** Claude's Discretion on KPI tile implementation — choose between CSS classes in styles.js (e.g., `.driver-stat-card`) or compact FieldCard variant. Current `foreman-kpi-card` classes are close but have foreman-specific sizing. All inline `padding`, `fontSize`, and color overrides must be eliminated.

### Loading + Empty States
- **D-07:** Claude's Discretion on AsyncState vs manual pattern — choose based on how `materialRequests` flows from App.jsx props. If there's a real loading state available, use AsyncState wrapper. If data is always synchronous from props, use EmptyState component directly with manual conditional rendering.
- **D-08:** Claude's Discretion on loading state source — decide whether to wire a real `isLoading` prop from App.jsx or use a local loading simulation. Base decision on how App.jsx currently provides data to portal views.

### Claude's Discretion
Claude has full flexibility on:
- Route card component structure (FieldCard composition vs CSS-only refactor)
- Stop number badge implementation
- KPI tile approach (CSS classes vs FieldCard variant)
- AsyncState vs manual empty/loading pattern
- Loading state source (prop from parent vs local simulation)

Constraints that are NOT flexible:
- Zero `style={{` in DriverView.jsx after refactor (DRVR-01)
- All buttons/inputs meet 44px touch target minimum (DRVR-02)
- Route cards use FieldCard and/or StatusBadge — no custom card markup (DRVR-03)
- Loading skeletons + EmptyState for route queue and completed deliveries (DRVR-04)
- No new npm dependencies
- All UI text through `t()` translation function
- CSS variables only — zero hard-coded hex or rgba
- Must work across all 5 themes
- No business logic changes — presentation layer only
- Touch drag-and-drop must be improved for mobile

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 & 2 Output (consumed by this phase)
- `src/tokens.css` — Universal CSS custom properties: spacing, typography, touch, focus ring, transitions
- `src/data/constants.js` — THEMES object with per-theme tokens: shadows, status colors, phase colors, primitives
- `src/styles.js` — Utility classes: `.btn`, `.btn-primary/ghost/danger`, `.card`, `.card-glass`, `.badge-*`, `.shadow-*`, `.touch-target`, `.focus-visible`, `.transition-*`
- `src/components/field/index.js` — Barrel export for all 11 shared components

### Shared Components (wire into DriverView)
- `src/components/field/FieldCard.jsx` — Card wrapper with consistent padding, border radius, theme-aware styling
- `src/components/field/StatusBadge.jsx` — Semantic status-to-color badge (approved=green, pending=amber, etc.)
- `src/components/field/FieldButton.jsx` — 44px touch target button with loading spinner, variant support
- `src/components/field/FieldInput.jsx` — Input with focus ring, error state, proper inputmode
- `src/components/field/PortalHeader.jsx` — Shared header: logo, user info, logout, language toggle
- `src/components/field/PortalTabBar.jsx` — Bottom nav bar with icon + label, badge counts, More overflow
- `src/components/field/AsyncState.jsx` — Loading/empty/error/success state wrapper
- `src/components/field/EmptyState.jsx` — Empty state with icon, message, optional action
- `src/components/field/LoadingSpinner.jsx` — Spinner and skeleton screen components

### Target File
- `src/tabs/DriverView.jsx` — 510 lines, 42 inline style instances to eliminate

### Requirements
- `.planning/REQUIREMENTS.md` §Driver Portal — DRVR-01 through DRVR-04

### Prior Phase Context
- `.planning/phases/01-token-foundation/01-CONTEXT.md` — Token decisions (px over rem, universal tokens in tokens.css)
- `.planning/phases/02-shared-field-components/02-CONTEXT.md` — Component decisions (consumer app UX baseline, icon+label tabs, PortalTabBar More pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **All 11 shared field components** (`src/components/field/`): Ready to wire. FieldCard, StatusBadge, FieldButton, FieldInput, PortalHeader, PortalTabBar, AsyncState, EmptyState, LoadingSpinner, FieldSignaturePad, MaterialRequestCard.
- **Existing CSS classes in styles.js**: `.btn`, `.btn-primary`, `.card`, `.badge-*`, `.empty-state`, `.foreman-kpi-card`, `.driver-queue-card`, `.employee-header`, `.emp-tabs`, `.settings-*` — some are reusable, others need replacement.
- **Design tokens in tokens.css**: `--space-*`, `--text-*`, `--touch-min`, `--focus-ring`, `--transition-*` — all ready for consumption.

### Established Patterns
- **Theme switching**: Components using `var(--token)` automatically participate — no component-level theme logic needed.
- **CSS-in-JS via template literal**: `src/styles.js` exports a single CSS string. New driver-specific utility classes go here.
- **Translation**: All display text uses `t("string")` pattern via `T` import from translations.
- **Lucide React icons**: Consistent SVG icon system — PortalTabBar and EmptyState already use Lucide.

### Integration Points
- **PortalHeader**: Replace `<header className="employee-header">` blocks (login screen + main view)
- **PortalTabBar**: Replace `<div className="emp-tabs">` with bottom-positioned tab bar
- **FieldCard**: Replace `.driver-queue-card` and `.card` inline-styled cards
- **StatusBadge**: Replace inline-styled stop number circles with status-aware badges
- **EmptyState**: Replace inline-styled `.empty-state` divs
- **FieldButton**: Replace inline-styled `.btn` elements with proper touch targets
- **FieldInput**: Replace inline-styled date input for delivery scheduling
- **Login screen**: Also uses employee-header — must wire PortalHeader here too

### Current Inline Style Breakdown (42 total)
- Logo/header area: 6 instances (display, alignItems, gap, height, objectFit)
- KPI stat cards: 10 instances (flex, minWidth, padding, fontSize, color)
- Route card structure: 12 instances (borderLeft, cursor, opacity, display, flex, gap, width, height, borderRadius, background, color, fontSize, fontWeight)
- Action buttons: 6 instances (flex, display, alignItems, justifyContent, gap, background, color)
- Layout containers: 5 instances (display, flexDirection, gap, marginBottom, textAlign)
- Date input: 3 instances (flex, fontSize, padding, height, color)

</code_context>

<specifics>
## Specific Ideas

- **Touch drag-and-drop**: Current HTML5 drag events fail on mobile. User specifically wants improved touch experience — long-press to initiate, visual feedback during drag. This is the one UX improvement in scope.
- **Bottom tab bar**: Establishes the cross-portal pattern. Route tab shows stop count badge, Completed shows delivered count badge. Consumer app convention (Facebook/TikTok muscle memory).
- **Pilot process**: This is the smallest portal (510 lines). The refactor pattern proven here (inline style → CSS class, custom markup → shared component) becomes the template for EmployeeView (1500 lines) and ForemanView (2400 lines).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-driverview-refactor*
*Context gathered: 2026-03-31*
