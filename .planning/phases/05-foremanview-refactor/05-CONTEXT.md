# Phase 5: ForemanView Refactor - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate ForemanView.jsx (3,953 lines, 583 inline styles) to zero inline styles, replace 11-tab horizontal scroll with bottom tab bar (4-5 primary + More), tokenize phase colors with --phase-* CSS variables, wire all shared field components, standardize KPI typography. This is the largest and final portal refactor. No new features, no business logic changes -- presentation layer only.

</domain>

<decisions>
## Implementation Decisions

### Tab Navigation Structure
- **D-01:** Claude's Discretion on which 4-5 tabs are primary in PortalTabBar. 13 tabs total: dashboard, clock, team, hours, materials, jsa, drawings, lookahead, reports, documents, site, notes, settings. Claude chooses the best primary set based on foreman daily workflow (likely Dashboard, Materials, JSA, Reports, Settings). Remaining tabs go in More overflow.
- **D-02:** Claude's Discretion on language toggle -- whether foreman gets the same emp-lang-switch segmented control as employee, or language stays in settings only.

### Plan Splitting Strategy
- **D-03:** 4 plans in 4 waves (sequential -- same file). Plan 1: CSS classes in styles.js. Plan 2: Header/tabs/dashboard/clock/team/hours (~lines 1-1835). Plan 3: Materials/JSA (~lines 1836-2821, most complex with FieldSignaturePad). Plan 4: Drawings/lookahead/reports/documents/site/notes/settings (~lines 2822-3953). Each JSX plan handles ~600-1000 lines.

### Phase Color Tokenization
- **D-04:** Map hard-coded hex phase colors to existing --phase-* tokens from constants.js. Replace #8b5cf6 (pre-con) with var(--phase-pre-construction), etc. If any stage is missing a token, add it to constants.js THEMES object across all themes. No new architecture -- just use what exists.

### KPI Typography Consistency
- **D-05:** Single token for all KPI primary values: var(--text-2xl) for dollar amounts, percentages, crew counts. var(--text-xs) for KPI labels. No ad-hoc font sizes. Consistent across all dashboard cards.

### Claude's Discretion
Claude has full flexibility on:
- Primary tab selection (4-5 from 13 tabs)
- Language toggle inclusion in header
- Employee-specific CSS class naming in styles.js (follow frm-* or foreman-* pattern)
- AsyncState vs manual pattern for loading states
- FieldSignaturePad import -- must switch from inline definition (line 20) to barrel import from components/field/
- EmptyState messaging for empty tabs
- Skeleton shimmer approach (follow Phase 3/4 pattern)
- How to handle the many complex sections (drawings with cloud storage, lookahead scheduler, daily reports with signatures)
- Dynamic inline style exceptions (same Phase 3/4 precedent -- runtime-computed values like progress %, risk colors are acceptable)

Constraints that are NOT flexible:
- Zero static `style={{` in ForemanView.jsx after refactor (FRMN-01)
- 11-tab horizontal scroll replaced with bottom PortalTabBar + More (FRMN-02)
- All buttons/inputs meet 44px touch target minimum (FRMN-03)
- KPI cards use consistent typography scale tokens (FRMN-04)
- Daily reports, JSA, crew use FieldCard, FieldButton, AsyncState, FieldSignaturePad from shared library (FRMN-05)
- Phase colors use --phase-* tokens, no hex literals in JSX (FRMN-06)
- No new npm dependencies
- All UI text through `t()` translation function
- CSS variables only -- zero hard-coded hex or rgba (except dynamic runtime values)
- Must work across all 5 themes
- No business logic changes -- presentation layer only

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 & 2 Output (consumed by this phase)
- `src/tokens.css` -- Universal CSS custom properties including --phase-* tokens
- `src/data/constants.js` -- THEMES object with per-theme tokens including --phase-active, --phase-estimating, --phase-pre-construction, --phase-completed, --phase-warranty, --phase-in-progress
- `src/styles.js` -- Utility classes + driver-specific (Phase 3) + employee-specific (Phase 4) classes. Follow pattern for foreman-specific.
- `src/components/field/index.js` -- Barrel export for all 11 shared components

### Shared Components (wire into ForemanView)
- `src/components/field/FieldCard.jsx` -- Card wrapper
- `src/components/field/StatusBadge.jsx` -- Semantic status badge
- `src/components/field/FieldButton.jsx` -- 44px touch target button with disabled/loading
- `src/components/field/FieldInput.jsx` -- Input with focus ring, inputmode
- `src/components/field/FieldSelect.jsx` -- Select dropdown (check barrel for export name)
- `src/components/field/PortalHeader.jsx` -- Shared header with optional languageToggle prop
- `src/components/field/PortalTabBar.jsx` -- Bottom nav with More overflow (proven with 4+4 in Phase 4)
- `src/components/field/AsyncState.jsx` -- Loading/empty/error/success state wrapper
- `src/components/field/EmptyState.jsx` -- Empty state with icon, message, optional action
- `src/components/field/LoadingSpinner.jsx` -- Spinner and Skeleton shimmer
- `src/components/field/FieldSignaturePad.jsx` -- Signature pad (MUST import from barrel, NOT use inline definition)

### Pilot References (Phase 3 + 4 output -- the patterns to follow)
- `src/tabs/DriverView.jsx` -- 649 lines, zero inline styles, skeleton loading
- `src/tabs/EmployeeView.jsx` -- ~1,760 lines, zero static inline styles, PortalTabBar with 4+4 overflow, language switch
- `.planning/phases/03-driverview-refactor/03-CONTEXT.md` -- Pilot refactor decisions
- `.planning/phases/04-employeeview-refactor/04-CONTEXT.md` -- Employee refactor decisions (PortalTabBar overflow, form migration)

### Target File
- `src/tabs/ForemanView.jsx` -- 3,953 lines, 583 inline style instances to eliminate, inline FieldSignaturePad definition to remove

### Requirements
- `.planning/REQUIREMENTS.md` -- FRMN-01 through FRMN-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **All 11 shared field components** (`src/components/field/`): Proven in Phases 3-4.
- **Existing CSS classes in styles.js**: `.btn`, `.card`, `.badge-*`, `.driver-*`, `.emp-*` classes. Foreman-specific classes need to be added.
- **--phase-* tokens in constants.js**: Already defined in all themes -- just need to be consumed in JSX instead of hex literals.
- **emp-lang-switch pattern**: Segmented EN/ES toggle from Phase 4 -- reusable if foreman needs it.

### Key Complexity Areas
- **FieldSignaturePad inline definition (line 20)**: ForemanView defines its own FieldSignaturePad instead of importing from barrel. Must delete inline definition and import from components/field/. May need to verify API compatibility.
- **Daily reports section (~line 3087)**: Complex with signature capture, weather, crew assignments, safety notes. High inline style density.
- **JSA section (~line 1936)**: Complex with hazard matrix, risk scoring, PPE grid. Already refactored for EmployeeView in Phase 4 -- reuse those CSS classes.
- **Drawings section (~line 2822)**: Cloud storage integration, revision tracking. Unique to foreman.
- **Lookahead section (~line 3004)**: Schedule planning grid. Unique to foreman.

### Integration Points
- 1 `employee-header` style class usage → PortalHeader
- `emp-tabs` horizontal scroll → PortalTabBar with 4-5 primary + More
- Multiple `.foreman-kpi-card` inline-styled cards → CSS classes with --text-2xl token
- Phase color hex literals → var(--phase-*) tokens
- Inline FieldSignaturePad → barrel import
- Multiple form inputs → FieldInput/FieldSelect where applicable
- Empty sections → EmptyState component

</code_context>

<specifics>
## Specific Ideas

- **FieldSignaturePad barrel import**: The inline definition at line 20 must be removed and replaced with the barrel import. Verify that the shared FieldSignaturePad has the same API (onSave, onClear, label, t props).
- **JSA CSS class reuse**: Phase 4 already created emp-jsa-* classes for EmployeeView's JSA tab. The foreman JSA may be more complex (full hazard matrix) but should reuse those classes where possible and extend with frm-jsa-* only for foreman-specific additions.
- **Largest plan ever**: Plan 1 (CSS) will need ~200+ classes for 583 inline styles. This is the biggest styles.js addition yet.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 05-foremanview-refactor*
*Context gathered: 2026-04-01*
