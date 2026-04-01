# Phase 4: EmployeeView Refactor - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate EmployeeView.jsx (1,745 lines, 135 inline styles) to zero inline styles, wire all shared field components, add proper `inputmode` to form fields, and ensure touch targets on map tile switcher. This is the second portal refactor following the pilot process proven in Phase 3 (DriverView). No new features, no business logic changes -- presentation layer only.

</domain>

<decisions>
## Implementation Decisions

### Tab Navigation Layout
- **D-01:** 4 primary tabs in PortalTabBar: Clock, Schedule, Materials, Settings. Overflow tabs (Log, JSA, COS, RFIs) go into the PortalTabBar "More" overflow menu. This is the first portal to use the More overflow feature designed in Phase 2.
- **D-02:** Contextual badge counts on tabs: Clock tab shows active timer indicator when clocked in. Materials shows pending request count. Schedule shows today's shift count. Matches DriverView badge pattern.

### Clock-In Flow Components
- **D-03:** Use FieldButton's built-in disabled prop for clock-in disabled states. Replace all `style={{ opacity: 0.5, cursor: "not-allowed" }}` with FieldButton disabled. Consistent with Phase 3 approach.
- **D-04:** Full wiring depth -- PortalHeader for all 3 header instances (login sub-screen, main view, settings). FieldButton for all action buttons. AsyncState for the geolocation loading state. FieldInput for the override password field. Deep but consistent.

### Material Request Form
- **D-05:** Replace all `.form-input` with FieldInput (proper focus ring, error states, touch sizing). Replace `.form-select` with FieldSelect. Add `inputmode="numeric"` for quantity fields, `inputmode="decimal"` for amounts. Ensures numeric keyboard on mobile.
- **D-06:** Fields-only migration -- no submission flow changes. Presentation layer only, matching Phase 3 scope. Migrate fields to shared components, add inputmode, eliminate inline styles. No business logic changes.

### Map Tile Switcher
- **D-07:** Floating pill-shaped FieldButtons in the top-right corner of the map. 3 options: dark, satellite, street. 44px min-height, themed background, active state highlighted with primary variant, inactive with ghost variant. Clear, tappable, doesn't obscure the map much.
- **D-08:** Use FieldButton with ghost variant (unselected) and primary variant (active). Gets 44px touch target, focus ring, and theme support for free.

### Claude's Discretion
Claude has full flexibility on:
- Employee-specific CSS class naming in styles.js (follow driver-* pattern from Phase 3)
- AsyncState vs manual pattern for loading states (proven in Phase 3 with both approaches)
- Loading state source for clock-in geolocation (useGeolocation hook already provides `loading` boolean -- wire directly)
- PortalTabBar More menu item ordering for overflow tabs
- EmptyState messaging for empty schedule/materials/log tabs
- How to handle the Leaflet map container within the CSS-class-only constraint
- Skeleton shimmer approach (follow Phase 3 pattern with initialLoading + 600ms timer)

Constraints that are NOT flexible:
- Zero `style={{` in EmployeeView.jsx after refactor (EMPL-01)
- All buttons/inputs meet 44px touch target minimum (EMPL-02)
- Clock-in flow uses PortalHeader, FieldButton, and AsyncState (EMPL-03)
- Material request form uses FieldInput/FieldSelect with proper inputmode (EMPL-04)
- Map tile switcher buttons meet 44px touch target (EMPL-05)
- No new npm dependencies
- All UI text through `t()` translation function
- CSS variables only -- zero hard-coded hex or rgba
- Must work across all 5 themes
- No business logic changes -- presentation layer only

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 & 2 Output (consumed by this phase)
- `src/tokens.css` -- Universal CSS custom properties: spacing, typography, touch, focus ring, transitions
- `src/data/constants.js` -- THEMES object with per-theme tokens: shadows, status colors, phase colors, primitives
- `src/styles.js` -- Utility classes + driver-specific classes (follow pattern for employee-specific)
- `src/components/field/index.js` -- Barrel export for all 11 shared components

### Shared Components (wire into EmployeeView)
- `src/components/field/FieldCard.jsx` -- Card wrapper
- `src/components/field/StatusBadge.jsx` -- Semantic status badge
- `src/components/field/FieldButton.jsx` -- 44px touch target button with disabled state handling
- `src/components/field/FieldInput.jsx` -- Input with focus ring, error state, inputmode support
- `src/components/field/FieldSelect.jsx` -- Select dropdown (check if exists; may need FieldInput with select behavior)
- `src/components/field/PortalHeader.jsx` -- Shared header: logo, user info, logout, language toggle
- `src/components/field/PortalTabBar.jsx` -- Bottom nav with icon + label, badge counts, More overflow menu
- `src/components/field/AsyncState.jsx` -- Loading/empty/error/success state wrapper
- `src/components/field/EmptyState.jsx` -- Empty state with icon, message, optional action
- `src/components/field/LoadingSpinner.jsx` -- Spinner and Skeleton shimmer components

### Pilot Reference (Phase 3 output -- the pattern to follow)
- `src/tabs/DriverView.jsx` -- 649 lines, zero inline styles, all shared components wired, Skeleton loading
- `.planning/phases/03-driverview-refactor/03-CONTEXT.md` -- Pilot refactor decisions and patterns

### Target File
- `src/tabs/EmployeeView.jsx` -- 1,745 lines, 135 inline style instances to eliminate

### Requirements
- `.planning/REQUIREMENTS.md` -- EMPL-01 through EMPL-05

### Hooks (already used, keep wired)
- `src/hooks/useGeolocation.js` -- Provides position, error, loading, getPosition (wire loading to AsyncState)
- `src/hooks/useNotifications.js` -- Clock reminders

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **All 11 shared field components** (`src/components/field/`): Ready to wire. Proven in Phase 3.
- **Existing CSS classes in styles.js**: `.btn`, `.btn-primary`, `.card`, `.badge-*`, `.empty-state`, `.driver-*` classes (Phase 3 output). Employee-specific classes need to be added following the same pattern.
- **Design tokens in tokens.css**: `--space-*`, `--text-*`, `--touch-min`, `--focus-ring`, `--transition-*` -- all ready.
- **useGeolocation hook**: Already provides `loading` boolean -- can wire directly to AsyncState for clock-in loading state.
- **Leaflet map**: Uses `L.tileLayer` with TILE_SETS constant (dark, satellite, street). Map tile buttons are the tiny inline-styled ones needing touch target upgrade.

### Established Patterns (from Phase 3 pilot)
- **PortalHeader**: Replaces `<header className="employee-header">` blocks -- 3 instances in EmployeeView
- **PortalTabBar**: Replaces `<div className="emp-tabs">` with bottom-positioned tab bar
- **FieldButton**: Replaces inline-styled `.btn` and `.clock-btn` elements. Built-in disabled prop handles opacity/cursor.
- **Skeleton loading**: `initialLoading` state + 600ms timer + Skeleton shimmer cards (from Phase 3 gap closure)
- **Theme switching**: Components using `var(--token)` automatically participate

### Integration Points
- 3 `employee-header` instances → PortalHeader
- 1 `emp-tabs` div with 4 visible tabs → PortalTabBar with 4 primary + More overflow
- Multiple `.form-input` and `.form-select` → FieldInput/FieldSelect with inputmode
- Clock-in/out buttons with inline disabled styles → FieldButton with disabled prop
- Map tile switcher with inline styles → FieldButton floating pills
- Geolocation loading state → AsyncState wrapper

### Current Inline Style Breakdown (135 total)
- Employee header area: ~15 instances
- Clock-in/out buttons and controls: ~25 instances (including disabled states)
- Map and map tile switcher: ~20 instances
- Form fields (material requests, clock override): ~20 instances
- KPI/stat tiles: ~15 instances
- Layout containers and spacing: ~25 instances
- Settings/theme area: ~15 instances

</code_context>

<specifics>
## Specific Ideas

- **First portal to use PortalTabBar More overflow**: 4 primary tabs visible, 4 overflow tabs in More menu. This validates the More menu pattern designed in Phase 2 before ForemanView (Phase 5) needs it.
- **useGeolocation hook loading → AsyncState**: The hook already exposes a `loading` boolean, making it a natural fit for AsyncState wrapping on the clock-in map. No need for the local `initialLoading` simulation used in DriverView.
- **Numeric keyboard for material quantities**: `inputmode="numeric"` on quantity fields is the key mobile UX improvement. Users enter quantities frequently and currently get the full keyboard.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 04-employeeview-refactor*
*Context gathered: 2026-04-01*
