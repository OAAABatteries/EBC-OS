---
phase: 5
slug: foremanview-refactor
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-01
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — structural grep verification (established Phase 3/4 pattern) |
| **Config file** | None — no test framework in project |
| **Quick run command** | `grep "style={{" src/tabs/ForemanView.jsx \| wc -l` |
| **Full suite command** | All 6 structural grep checks (see Per-Task Verification Map) |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep "style={{" src/tabs/ForemanView.jsx | wc -l` — count should decrease each wave
- **After every plan wave:** Run all 6 structural grep checks
- **Before `/gsd:verify-work`:** All structural checks return 0 AND manual 5-theme visual check passes
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | FRMN-01 | structural | `grep "style={{" src/tabs/ForemanView.jsx \| wc -l` | N/A (grep) | ⬜ pending |
| 05-02-01 | 02 | 2 | FRMN-02 | structural | `grep "emp-tabs\|horizontal.*scroll" src/tabs/ForemanView.jsx` | N/A (grep) | ⬜ pending |
| 05-02-02 | 02 | 2 | FRMN-04 | structural | `grep "foreman-kpi-value" src/styles.js \| grep "text-display"` | N/A (grep) | ⬜ pending |
| 05-03-01 | 03 | 3 | FRMN-05 | structural | `grep "function FieldSignaturePad" src/tabs/ForemanView.jsx` returns 0 | N/A (grep) | ⬜ pending |
| 05-04-01 | 04 | 4 | FRMN-06 | structural | `grep "#10b981\|#3b82f6\|#8b5cf6\|#6b7280\|#eab308" src/tabs/ForemanView.jsx` returns 0 | N/A (grep) | ⬜ pending |
| 05-04-02 | 04 | 4 | FRMN-01 | structural | `grep "style={{" src/tabs/ForemanView.jsx` returns 0 (final gate) | N/A (grep) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All verification is grep-based structural checks — no test files or framework installation needed. This is the established pattern for Phases 3 and 4.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom tab bar renders with 5 primary + More overflow | FRMN-02 | Visual layout verification | Open foreman portal, verify bottom bar with 5 tabs + More sheet |
| All interactive elements >= 44px touch target | FRMN-03 | Touch target size verification | Inspect all buttons/inputs on 375px viewport in Chrome DevTools |
| Phase colors render correctly in all 5 themes | FRMN-06 | Cross-theme visual parity | Switch through all 5 themes, verify dashboard phase colors |
| KPI cards display consistent typography | FRMN-04 | Visual consistency check | Compare KPI value font sizes across all dashboard cards |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
