# Phase 7: Premium Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 07-premium-foundation
**Areas discussed:** Card system variants, PortalHeader eagle logo, Supabase table strategy, DrawingsTab extraction

---

## Card System Variants

| Option | Description | Selected |
|--------|-------------|----------|
| Extend FieldCard with variant prop | Add variant='hero'\|'info'\|'alert' prop to existing FieldCard. Backwards compatible. | |
| Create new PremiumCard component | New component alongside FieldCard. More freedom, portals migrate later. | ✓ |
| You decide | Claude picks approach based on component architecture. | |

**User's choice:** Create new PremiumCard component
**Notes:** FieldCard stays for backward compatibility. PremiumCard is a new component in src/components/field/.

### Follow-up: Migration timing

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 7 builds PremiumCard only | Portals keep FieldCard until their own refactor phase. | |
| Phase 7 migrates shared components | Update PortalHeader, EmptyState, etc. to use PremiumCard. | |
| You decide | Claude determines the right migration boundary. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on whether shared components adopt PremiumCard in Phase 7 or Phase 8-9.

---

## PortalHeader Eagle Logo

| Option | Description | Selected |
|--------|-------------|----------|
| Always show eagle, all themes | Eagle in src/assets/, always rendered regardless of theme. | ✓ |
| Eagle only on EBC Brand theme | Show eagle only when EBC Brand active. Other themes show text. | |
| You decide | Claude determines based on brand identity. | |

**User's choice:** Always show eagle, all themes
**Notes:** EBC identity is company-wide, not theme-specific.

### Follow-up: Asset sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Asset exists in repo | Eagle PNG already in the project. | ✓ |
| Need to source it | User will provide before execution. | |
| You decide | Claude finds or creates placeholder. | |

**User's choice:** Asset exists in repo
**Notes:** Confirmed: public/ebc-eagle-white.png and public/eagle-blue.png already in use across App.jsx, LoginScreen, OnboardingWizard, PortalHeader, ForemanView.

### Follow-up: Theme-aware logo

| Option | Description | Selected |
|--------|-------------|----------|
| Keep theme-aware swap | Daylight uses eagle-blue.png, others use white. | |
| Always white eagle | One logo everywhere. | |
| You decide | Claude picks based on contrast per theme. | |

**User's choice:** (Free text) "The eagle should always be theme aware. Use the white eagle to make it in any color as needed"
**Notes:** Theme-aware recoloring via CSS filter or asset swap. White base asset, adapted per theme for contrast.

---

## Supabase Table Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| SQL migration file in repo | Add supabase/migrations/ file. Reviewable, version-controlled. | |
| Supabase dashboard manually | User creates tables/columns in dashboard. | |
| You decide | Claude picks based on existing supabase/ directory pattern. | ✓ |

**User's choice:** You decide
**Notes:** Claude determines delivery method based on project pattern.

### Follow-up: RLS timing

| Option | Description | Selected |
|--------|-------------|----------|
| RLS in Phase 7 | Define policies upfront with tables. Safer. | ✓ |
| RLS in Phase 8-9 | Create tables open, add RLS when portal code queries them. | |
| You decide | Claude determines timing based on security posture. | |

**User's choice:** RLS in Phase 7
**Notes:** Tables must be secured from creation. No temporarily open tables.

---

## DrawingsTab Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Full extract with viewer | Entire drawings tab (list + DrawingViewer) as shared component. | ✓ |
| List only, viewer stays | Only drawing list/selection UI extracted. | |
| You decide | Claude determines extraction boundary. | |

**User's choice:** Full extract with viewer
**Notes:** Complete extraction including DrawingViewer integration. Props: readOnly, projectFilter, onDrawingSelect.

### Follow-up: Data fetching

| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained with Supabase | DrawingsTab fetches own data given projectId. | ✓ |
| Data as props | Parent portal fetches and passes drawings down. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Self-contained with Supabase
**Notes:** Consumers just mount with a project ID. Simpler for portal integration.

---

## Claude's Discretion

- PremiumCard migration boundary (Phase 7 shared components or Phase 8-9 portals)
- Supabase migration delivery method (SQL file vs CLI migration)
- Eagle logo CSS filter approach vs asset swap per theme
- New component API design (StatTile, AlertCard, ShiftCard, CredentialCard)
- --text-display token creation vs inline hero number sizing

## Deferred Ideas

None -- discussion stayed within phase scope.
