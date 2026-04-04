---
phase: 9
slug: driver-foreman-portal-updates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DRVR-05 | manual | grep PremiumCard src/tabs/DriverView.jsx | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | DRVR-06 | manual | grep AlertCard src/tabs/DriverView.jsx | ✅ | ⬜ pending |
| 09-02-01 | 02 | 1 | FSCH-02 | manual | grep shift_requests src/tabs/ForemanView.jsx | ✅ | ⬜ pending |
| 09-02-02 | 02 | 1 | FSCH-03 | manual | grep time-off src/tabs/ForemanView.jsx | ✅ | ⬜ pending |
| 09-02-03 | 02 | 1 | FSCH-04 | manual | grep notification src/tabs/ForemanView.jsx | ✅ | ⬜ pending |
| 09-03-01 | 03 | 1 | CRED-04 | manual | grep certifications src/tabs/ForemanView.jsx | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Driver Home tab renders PremiumCard Hero with delivery count | DRVR-05 | Visual rendering requires browser | Open Driver portal, verify Home tab shows hero card |
| Driver alerts feed shows AlertCards | DRVR-06 | Requires Supabase data | Create test delivery, verify alert appears |
| Foreman PortalTabBar replaces horizontal strip | FSCH-02 | Layout verification | Open Foreman portal, verify 5 bottom tabs + More |
| Foreman approve/deny shift requests | FSCH-02 | Interactive workflow | Submit shift request as employee, approve as foreman |
| Foreman approve/deny time-off requests | FSCH-03 | Interactive workflow | Submit time-off as employee, approve as foreman |
| Foreman cert dashboard filter chips | CRED-04 | Visual + data verification | Open Team tab, verify All/Expiring/Expired filters work |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
