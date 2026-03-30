---
phase: 1
slug: token-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no test config, no `tests/` directory |
| **Config file** | None — Wave 0 creates dev-only token audit helper |
| **Quick run command** | Manual browser inspection + DevTools computed styles |
| **Full suite command** | Manual visual regression across 8 themes |
| **Estimated runtime** | ~5 minutes (manual 8-theme walkthrough) |

---

## Sampling Rate

- **After every task commit:** Open app in browser, switch to EBC Brand theme, confirm changed tokens render correctly
- **After every plan wave:** Switch through all 8 themes, verify no broken vars (empty/invalid computed values)
- **Before `/gsd:verify-work`:** Full 8-theme visual pass must be green
- **Max feedback latency:** ~60 seconds (app hot reload + theme switch)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | TOKN-01 | manual | `getComputedStyle(document.documentElement).getPropertyValue('--space-4')` in DevTools | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | TOKN-02 | manual | DevTools computed styles check for `--text-*` vars | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | TOKN-03 | manual | DevTools element computed height >= 44px | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | TOKN-04 | manual | Tab through interactive elements, verify visible focus ring | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | TOKN-05 | manual | Side-by-side comparison of hover (150ms) vs modal (300ms) | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | TOKN-06 | manual | Inspect `.shadow-sm/md/lg` render visibly different | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | TOKN-07 | manual | Switch all 8 themes, confirm `--phase-*` and `--status-*` adapt | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Dev-only token audit helper in `main.jsx` — logs all new CSS vars, warns on empty/invalid values on startup (remove before merge)

*Manual-only validation is acceptable for Phase 1 — pure CSS token definitions cannot break app logic, only visual rendering*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spacing vars resolve | TOKN-01 | CSS var values only visible in computed styles | Open DevTools → Computed → search `--space` |
| Typography vars resolve | TOKN-02 | Font size rendering is visual | Apply classes, inspect computed font-size |
| 44px touch targets | TOKN-03 | Touch target is a visual/layout concern | Inspect element height in DevTools |
| Focus ring visibility | TOKN-04 | Keyboard navigation is interactive | Tab through elements, check ring appears |
| Transition timing | TOKN-05 | Timing is perceptual | Hover buttons, open modals, compare feel |
| Shadow depth difference | TOKN-06 | Shadow rendering is visual | Place 3 cards side-by-side, compare depth |
| Semantic colors per theme | TOKN-07 | 8-theme matrix is visual | Switch each theme, check phase/status colors |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: every task commit gets a browser check
- [ ] Wave 0 covers token audit helper
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
