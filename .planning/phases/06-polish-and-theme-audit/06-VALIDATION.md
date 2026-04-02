---
phase: 6
slug: polish-and-theme-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in project |
| **Config file** | None |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual browser check in each theme
- **Before `/gsd:verify-work`:** All 5 themes visually checked in all 3 portals
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | PLSH-01 | manual-visual | `npm run build` | N/A | ⬜ pending |
| TBD | TBD | TBD | PLSH-02 | manual-touch | `npm run build` | N/A | ⬜ pending |
| TBD | TBD | TBD | PLSH-03 | manual-touch | `npm run build` | N/A | ⬜ pending |
| TBD | TBD | TBD | PLSH-04 | manual-visual | `npm run build` | N/A | ⬜ pending |
| TBD | TBD | TBD | PLSH-05 | manual-functional | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — all validation is visual/manual with `npm run build` as the only automated gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 5 themes render without broken colors or missing vars | PLSH-01 | Visual — no automated screenshot diffing | Switch each theme in each portal, inspect for broken vars in DevTools |
| No 300ms tap delay on interactive elements | PLSH-02 | Touch behavior — requires physical device or DevTools touch emulation | Tap buttons in DevTools mobile mode, verify instant response |
| No pull-to-refresh on scroll | PLSH-03 | Touch behavior — requires scroll gesture testing | Scroll data lists in DevTools mobile mode, verify no browser pull-to-refresh |
| No horizontal scroll at 375px/768px/1024px | PLSH-04 | Responsive layout — requires viewport resizing | Resize DevTools to each breakpoint, verify no horizontal overflow |
| Offline indicator in all 3 portals | PLSH-05 | Network state — requires toggling offline mode | Toggle offline in DevTools Network tab, verify banner appears in each portal |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
