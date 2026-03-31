---
phase: 2
slug: shared-field-components
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — Wave 0 must install Vitest |
| **Config file** | None — Wave 0 adds `test: { environment: "jsdom" }` to `vite.config.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds (component unit tests only) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 02 | 1 | COMP-06 | unit | `npx vitest run src/components/field/StatusBadge.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | COMP-08 | unit | `npx vitest run src/components/field/LoadingSpinner.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | COMP-01 | unit | `npx vitest run src/components/field/FieldButton.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | COMP-02 | unit | `npx vitest run src/components/field/FieldCard.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | COMP-03 | unit | `npx vitest run src/components/field/FieldInput.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | COMP-07 | unit | `npx vitest run src/components/field/EmptyState.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | COMP-09 | unit | `npx vitest run src/components/field/AsyncState.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | COMP-04 | unit | `npx vitest run src/components/field/PortalHeader.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | COMP-05 | unit | `npx vitest run src/components/field/PortalTabBar.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 3 | COMP-10 | static | `grep -n "#[0-9a-fA-F]" src/components/field/FieldSignaturePad.jsx` (must return 0 results) | ❌ W0 | ⬜ pending |
| TBD | 02 | 3 | COMP-11 | unit | `npx vitest run src/components/field/MaterialRequestCard.test.jsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom` — Vitest, React testing utilities, DOM matchers (dev dependencies only — do NOT ship to field devices)
- [ ] `vite.config.js` — add `test: { environment: "jsdom" }` block so Vitest uses jsdom DOM environment
- [ ] `src/test/setup.js` — shared `import "@testing-library/jest-dom"` setup file
- [ ] `src/components/field/FieldButton.test.jsx` — stub covering COMP-01
- [ ] `src/components/field/FieldCard.test.jsx` — stub covering COMP-02
- [ ] `src/components/field/FieldInput.test.jsx` — stub covering COMP-03
- [ ] `src/components/field/StatusBadge.test.jsx` — stub covering COMP-06
- [ ] `src/components/field/EmptyState.test.jsx` — stub covering COMP-07
- [ ] `src/components/field/AsyncState.test.jsx` — stub covering COMP-09
- [ ] `src/components/field/PortalHeader.test.jsx` — stub covering COMP-04
- [ ] `src/components/field/PortalTabBar.test.jsx` — stub covering COMP-05
- [ ] `src/components/field/MaterialRequestCard.test.jsx` — stub covering COMP-11

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FieldSignaturePad draws with theme-aware stroke color | COMP-10 | Canvas 2D API unavailable in jsdom | Switch theme, draw on signature pad, verify stroke matches theme color (not hard-coded #1e2d3b) |
| PortalTabBar "More" sheet slides up from bottom | COMP-05 | Animation/UX is perceptual | Tap More tab, verify bottom sheet slides up, not modal/alert |
| All 5 themes render components without broken colors | COMP-04, COMP-05 | Visual regression is manual | Switch all 5 themes, verify no white-text-on-white, no missing backgrounds |
| Touch targets ≥ 44px on field device | COMP-01, COMP-03 | Touch perception is physical | Inspect element height in DevTools, verify ≥ 44px |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test files (11 stubs + framework install)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
