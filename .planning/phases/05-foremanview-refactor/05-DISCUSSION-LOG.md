# Phase 5: ForemanView Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 05-foremanview-refactor
**Areas discussed:** Tab navigation structure, Plan splitting strategy, Phase color tokenization, KPI typography consistency

---

## Tab Navigation Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 5 primary: Dashboard, Materials, JSA, Reports, Settings | Core foreman daily workflow | |
| 4 primary: Dashboard, Materials, JSA, Settings + More | Tighter bar, reports in More | |
| 5 primary: Dashboard, Team, Materials, Reports, Settings | Elevates Team over JSA | |
| You decide | Claude's discretion | Yes |

**User's choice:** Claude's discretion
**Notes:** 13 tabs total. Claude picks optimal 4-5 primary based on foreman workflow.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes -- same segmented switch | Reuse emp-lang-switch in header | |
| No -- settings only | Language change rare for foremen | |
| You decide | Claude's discretion | Yes |

**User's choice:** Claude's discretion on language toggle

---

## Plan Splitting Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 4 plans: CSS + 3 JSX waves | CSS, then lines 1-1835, then 1836-2821, then 2822-3953 | Yes |
| 5 plans: CSS + 4 smaller JSX waves | Finer splits, lower risk per plan | |
| You decide | Claude's discretion | |

**User's choice:** 4 plans: CSS + 3 JSX waves (Recommended)

---

## Phase Color Tokenization

| Option | Description | Selected |
|--------|-------------|----------|
| Map to existing tokens | Replace hex with var(--phase-*) from constants.js | Yes |
| You decide | Claude's discretion | |

**User's choice:** Map to existing tokens (Recommended)

---

## KPI Typography Consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Single token for all KPI values | var(--text-2xl) for values, var(--text-xs) for labels | Yes |
| Tiered: large for primary, medium for secondary | More hierarchy but more complex | |
| You decide | Claude's discretion | |

**User's choice:** Single token for all KPI values (Recommended)

---

## Claude's Discretion

- Primary tab selection (4-5 from 13)
- Language toggle inclusion
- Foreman-specific CSS class naming pattern
- FieldSignaturePad barrel import compatibility
- Dynamic inline style exceptions
- JSA CSS class reuse from Phase 4

## Deferred Ideas

None -- discussion stayed within phase scope.
