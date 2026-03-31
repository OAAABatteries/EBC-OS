# Phase 2: Shared Field Components - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-shared-field-components
**Areas discussed:** PortalHeader scope, Component extraction vs fresh build, AsyncState usage pattern, PortalTabBar future-proofing

---

## PortalHeader Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Prop-driven, one component | Single `<PortalHeader>` with props controlling what shows: `showLanguageToggle`, `showSettings`, `showProjectSelector`, `title`, `userName`. Portal passes what it needs. | |
| Slot-based, minimal core | Header provides logo + right-side slot only. Each portal fills the slot with its own controls. | |
| You decide | Claude picks the best pattern based on what the three portals actually need. | ✓ |

**User's choice:** You decide
**Notes:** Claude has full discretion on implementation pattern.

### Follow-up: Project Selector Placement

| Option | Description | Selected |
|--------|-------------|----------|
| In the header | Project selector is part of the top bar. Compact, always visible. | |
| Below the header | Portal manages its own project selector placement. Header stays lean. | |
| You decide | Claude picks based on layout constraints at 375px. | ✓ |

**User's choice:** You decide

---

## Component Extraction vs Fresh Build

| Option | Description | Selected |
|--------|-------------|----------|
| Extract and fix | Pull existing components (FieldSignaturePad, MaterialRequestCard logic) out of portal files, tokenize hard-coded values, move to `src/components/field/`. | |
| Build fresh | Write all 11 components from scratch using the token system as foundation. | |
| You decide | Claude picks per-component: extract where existing code is solid, build fresh where it's a mess. | ✓ |

**User's choice:** You decide
**Notes:** Claude decides per-component.

---

## AsyncState Usage Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Children wrapper | `<AsyncState loading={...} empty={...} error={...}>{children}</AsyncState>` — children only render on success. Standard React pattern. | |
| Render prop | Parent passes `render={() => <Content />}` as a prop. More explicit control but verbose. | |
| You decide | Claude picks based on what fits the existing portal code patterns best. | ✓ |

**User's choice:** You decide

---

## PortalTabBar Future-Proofing

| Option | Description | Selected |
|--------|-------------|----------|
| Build for Phase 5 now | Include overflow "More" drawer in Phase 2. Phases 3–4 portals use it with 3–4 tabs (overflow never triggers). Phase 5 gets it for free. | ✓ |
| Simple tab bar now, extend in Phase 5 | Build clean 3–5 tab bottom bar now. Phase 5 adds overflow. Less Phase 2 scope but Phase 5 touches component again. | |
| You decide | Claude picks based on complexity cost vs Phase 5 risk. | |

**User's choice:** Build for Phase 5 now (user chose C initially, but added key context that changed the recommendation)
**Notes:** User noted 150+ employees with varying tech literacy — Facebook/TikTok is the primary app familiarity baseline. This made "build it right now" the clear call. Icons + labels always (never icon-only). Bottom bar, consumer app conventions, unmistakable active state.

---

## User-Provided Context

- **Crew size:** 150+ employees
- **Tech literacy:** Variable — Facebook and TikTok are the primary UX reference points
- **Design implication:** Every component interaction pattern should feel like a consumer app, not enterprise software. "Does this feel like Facebook or TikTok?" is the UX litmus test.
