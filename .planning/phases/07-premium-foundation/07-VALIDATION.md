---
phase: 7
slug: premium-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | VIS-01 | manual | grep defaultTheme App.jsx | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | VIS-02 | manual | grep eagle PortalHeader.jsx | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | VIS-03, VIS-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | VIS-05 | manual | grep EmptyState | ✅ | ⬜ pending |
| 07-03-01 | 03 | 2 | DATA-01, DATA-02, DATA-03 | manual | psql schema check | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 2 | PLAN-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 3 | VIS-06 | manual | grep translations.js | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test infrastructure covers all phase requirements via vitest (installed in Phase 2)

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EBC Brand default theme | VIS-01 | localStorage default, no DOM test | Clear localStorage, reload, verify EBC theme active |
| Eagle logo renders all themes | VIS-02 | Visual check across themes | Switch all 8 themes, verify eagle visible |
| Card variant visual distinction | VIS-04 | Visual appearance check | Render Hero/Info/Alert, verify distinct appearance |
| Supabase tables + RLS | DATA-01, DATA-02, DATA-03 | DB schema verification | Run migration, check tables exist with correct columns and policies |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
