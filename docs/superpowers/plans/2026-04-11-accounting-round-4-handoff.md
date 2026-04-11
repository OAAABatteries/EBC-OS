# EBC-OS Accounting Layer — Round 4 Session Handoff

**Created:** 2026-04-11
**Previous session ended at:** Bookkeeping 82/100, Accounting 78/100
**Target for this session:** 90+/100 on both auditors

---

## Context for next session

You are continuing work on the EBC-OS accounting layer. This is session 4. Prior sessions built the entire accounting data model (vendors, AP bills, commitments, accruals, budgets, periods) and passed 3 rounds of dual auditor review.

**Path so far:**
- Round 0 (pre-sprint): Bookkeeping 19/100, Accounting 14/100
- Round 1 (Sprint 0 — foundation): 34/100, 26/100
- Round 2 (Slices 1-6 built): 61/100, 44/100
- Round 3 (P0 math fixes): 74/100, 69/100
- Round 4 (P0 rollup): **82/100, 78/100** ← you are here

**Design spec:** `docs/superpowers/specs/2026-04-08-accounting-layer-design.md`
**Sprint 0 plan:** `docs/superpowers/plans/2026-04-08-accounting-layer-sprint0.md`

## Root cause blocking 90+

Both auditors independently concluded the same thing in Round 3: **the remaining defects all trace to 2 missing shared helpers**. Every screen reinvents the math inline and some get it wrong.

1. **No `computeWorkedHours` exported** — 3 screens recompute raw `(clockOut - clockIn)` / 3600000, skipping the unpaid lunch deduction. PayrollSummary IIF export sends inflated hours to QuickBooks.
2. **No `getAdjustedContract(project, changeOrders)` helper** — 2 dashboard sites use raw `p.contract` for margin; 6 other sites use `contract + approvedCOs`. Same project, different margin.

**Fix the root cause first, then clean up the downstream consumers.** Don't just patch individual call sites.

---

## ROUND 4 TASK LIST (priority order)

### P0 — Must land first (these fix the audit reports)

**P0-1: Export `computeWorkedHours` from financialValidation.js and use it everywhere**
- File: `src/utils/financialValidation.js` — change `function computeWorkedHours(te)` to `export function computeWorkedHours(te)`
- Consumer 1: `src/tabs/MoreTabs.jsx:1666-1670` (`PayrollSummaryTab` totalHours reduce) — replace inline calc with `computeWorkedHours(e)`
- Consumer 2: `src/tabs/MoreTabs.jsx:1404-1427` (`getCostCodeBreakdown` in `JobCostingTab`) — either delete the inline function and call `computeProjectLaborByCode` from `financialValidation.js` directly (preferred — it already exists and works), OR replace inline hours calc with `computeWorkedHours(te)`
- **Verify:** after fix, JobCosting drilldown totals must tie to the summary cell above (they currently differ by ~6%)
- **Verify:** PayrollSummary total hours for a fully-seeded 8h shift must read 7.5h (with lunch), not 8h
- Impact: **+3 bookkeeping, +3 accounting** (kills PayrollSummary QB export wage/tax exposure + JobCosting drilldown disagreement)

**P0-2: Create `getAdjustedContract(project, changeOrders)` helper and replace all raw-contract call sites**
- File: `src/utils/financialValidation.js` — add near the top:
  ```js
  export function getAdjustedContract(project, changeOrders = []) {
    const base = project?.contract || 0;
    const approvedCOs = (changeOrders || [])
      .filter(c => String(c.projectId) === String(project?.id) && c.status === "approved")
      .reduce((s, c) => s + (c.amount || 0), 0);
    return base + approvedCOs;
  }
  ```
- Bad sites to fix (found by bookkeeping auditor D1 + accounting P0-3):
  - `src/App.jsx:1000` — `profitAlerts` filter uses `((contract - costs.total) / contract)` with raw `p.contract`
  - `src/App.jsx:1006-1012` — same `profitAlerts` map section
  - `src/App.jsx:2903` — project tile margin chip inline IIFE uses raw `c = p.contract || 0`
- Good sites to audit (should already use adjusted, but verify): `App.jsx:5622` P&L card, `MoreTabs.jsx:1567-1568` JobCosting tile, `MoreTabs.jsx:3463` FinReports, `useAlertEngine.js:240`, `IncentiveTab.jsx:96`
- **Verify:** create a project with $200K base + $40K approved CO + $180K cost. Dashboard tile, P&L card, FinReports, and useAlertEngine must ALL show ~25% margin (not 10% on some and 25% on others).
- Impact: **+3 bookkeeping, +2 accounting** (kills the dashboard self-contradiction)

**P0-3: Wire `computeProjectCostForPeriod` to a UI period selector**
- The engine helper exists in `financialValidation.js:250-278` but no UI calls it.
- Add a period dropdown (All-time / This month / Last month / Custom YYYY-MM) on:
  - `JobCostingTab` per-project cards (`src/tabs/MoreTabs.jsx:1564`)
  - `FinReportsTab` WIP Schedule (`src/tabs/MoreTabs.jsx:3452`)
- When period is non-null, call `computeProjectCostForPeriod(p.id, p.name, period, timeEntries, employees, apBills, accruals, burden)` instead of `computeProjectTotalCost`
- The test question "What was Project 1's March gross margin?" should become answerable from these screens.
- Impact: **+3 accounting** (unblocks the core test question the auditor has asked since Round 1)

**P0-4: Pick one earned-revenue clamping policy and apply it everywhere**
- `src/tabs/MoreTabs.jsx:3461` — FinReports clamps: `earnedRevenue = Math.min(percentComplete, 1) * adjustedContract`
- `src/App.jsx:5620` — Project P&L card does NOT clamp
- **Accounting-correct position:** clamp at 100% for earned revenue, but show cost-overrun separately as "projected loss"
- Apply consistently in both call sites
- Impact: **+1 bookkeeping, +1 accounting**

**P0-5: FLSA-compliant OT — per workweek, not per pay period**
- `src/tabs/MoreTabs.jsx:1671-1674` currently applies a single 40h cap across the selected period (week/biweekly/month)
- Under FLSA, OT is per workweek. Biweekly 38h + 38h = zero OT (not 40 reg + 36 OT)
- Fix: group entries by ISO workweek (Mon-Sun) before applying the 40h cap. Sum OT across weeks.
- This is a wage compliance defect — the QB IIF export currently ships wrong numbers.
- Impact: **+1 bookkeeping** (plus kills legal exposure)

### P1 — Should land this session

**P1-1: Closeout PDF retainage uses real invoices**
- `src/App.jsx:5790-5794` — currently hardcodes `retainageHeld = revisedContract * 0.10`
- 3 bugs in 1 line: hardcoded 10% ignores companySettings, uses revisedContract (all COs) not adjusted (approved COs), and computes off contract instead of billed invoices
- Fix: `retainageHeld = projInvoices.reduce((s, i) => s + (i.retainageWithheld ?? Math.round((i.amount || 0) * (app.companySettings?.defaultRetainageRate || 10) / 100)), 0)`
- Impact: **+1 accounting**

**P1-2: Add missing drilldowns on Exception Dashboard**
- `src/tabs/MoreTabs.jsx:3596-3618` — KPI cards exist for 6 categories, drilldown lists only for 3 (Low Margin, Missing W-9, Unapproved AP)
- Add drilldown blocks for:
  - Stale Billing — list of projects with no invoice in 30+ days
  - Missing Lien Waivers — list of subcontractor bills with no waiver
  - Net Retainage Exposure — split receivable vs payable with project/vendor breakdown
- Impact: **+1 bookkeeping**

**P1-3: Period validation on time entry create/edit**
- `src/tabs/ForemanView.jsx:367, 415` — no `validatePeriod` call on time entry creation
- `src/tabs/TimeClockAdmin.jsx` — no `validatePeriod` call on edits
- Time entries are the largest cost component and have ZERO period discipline
- Fix: wrap create/edit in `validatePeriod(clockIn date, periods)`; require admin override + reason for closed periods
- Add `lastEditedAt` + `lastEditedBy` to time entries
- Extend Cutoff Report to scan `lastEditedAt > closedAt`
- Impact: **+1 accounting**

**P1-4: Cutoff Report scans accruals**
- `src/tabs/MoreTabs.jsx:2990-3043` — scans Invoices, AP Bills, COs, T&M, Time Entries but NOT Accruals
- Add an Accrual loop identical to the AP Bill loop, keyed on `a.period === closedP.period && a.createdAt > closedAt`
- Accruals are the most material period-shift entry and they have no cutoff visibility
- Impact: **+1 bookkeeping**

**P1-5: Single retainage formula — unify AP Aging with Retainage tab**
- `src/tabs/MoreTabs.jsx:2175-2176` — AP Bills aging row computes `retAmt = bill.amount * (bill.retainageRate || 0) / 100` inline
- `src/tabs/MoreTabs.jsx:2796` — Retainage tab uses stored `b.retainageAmount ?? Math.round(...)`
- Fix: extract helper `getAPBillRetainage(bill)` in financialValidation.js, use everywhere
- Impact: **+0.5 bookkeeping**

**P1-6: Commitment fallback OR bug**
- `src/tabs/MoreTabs.jsx:2535` — `const invoicedToDate = liveInvoiced || c.invoicedToDate || 0;`
- If all linked bills are voided, `liveInvoiced === 0` and falls back to stale stored value
- Fix: `const invoicedToDate = linkedBills.length > 0 ? liveInvoiced : (c.invoicedToDate || 0);`
- Impact: defensive hardening

**P1-7: `materialEst` field rename**
- `src/App.jsx:1006` — dashboard profit alerts return `materialEst: costs.material` — it's actually actual material cost, not an estimate
- Rename to `materialActual`. Audit all consumers.
- Minor but important for trustworthiness

**P1-8: Single active-project filter**
- `FinReportsTab` excludes `status === "completed"` projects; `JobCostingTab` does not
- Fix: create `getActiveProjects(projects)` helper, use everywhere
- Impact: WIP and JobCosting will reconcile for months with completed projects

### P2 — Nice to have

- Fix seed time entries to use fixed dates (`"2026-03-25"`) instead of `today`-relative math so the demo survives clock drift
- Add `retainageReleased` filter to RetainageTab payable to exclude released bills (MVP release workflow exists, but the filter isn't used yet)
- Enforce `validatePeriod` on AP Bill edit date change (currently only validates the NEW date, not whether the OLD date period is now closed)
- Add `periodOverride` to `CRITICAL_FIELDS.invoice` so retainage field edits flow through audit trail

---

## CRITICAL: Verification Protocol

**After each fix, verify in the browser, not just the build.**

1. `npm run build` — must pass with zero errors
2. The preview server is running on port 5173. Reload and navigate to the affected screen.
3. For margin/cost fixes, spot-check Project 1 (Endurance Woodside) — it now has a full seed data walk: $74,800 contract, $66,200 budget, Oscar/Ricardo/Carlos time entries with costCode, AP bills for framing/board/tape, $2,100 labor accrual, $15,300 open commitments
4. For reconciliation fixes, open the same project from 2 different screens and confirm the numbers tie

**Preview mode bug (pre-existing):** `localStorage.ebc_viewAsRole` can get stuck and cause EmployeeView to crash. Clear with:
```js
localStorage.removeItem('ebc_viewAsRole');
localStorage.removeItem('ebc_activeEmployee');
```

**DEV_BYPASS_LOGIN:** `src/App.jsx:246` — auto-logs in as Abner (admin). Keep this ON until all portals hit 95%. Flip to `false` to re-enable login.

---

## Files Under Active Change

| File | Purpose | Touched in Session 3 |
|------|---------|:---:|
| `src/utils/financialValidation.js` | Cost engine, validation, period helpers, DEFAULT_BURDEN, computeWorkedHours | ✓ |
| `src/tabs/MoreTabs.jsx` | Financials section (13 subtabs, ~3900 lines in this file range) | ✓ heavy |
| `src/App.jsx` | Dashboard, project detail, margin alerts | ✓ |
| `src/data/constants.js` | Seed data, initVendors, initAPBills, initCommitments, initAccruals, initBudgets, initPeriods | ✓ |
| `src/hooks/useAlertEngine.js` | Margin/stale/submittal alerts | ✓ |
| `src/tabs/IncentiveTab.jsx` | Live project margins | ✓ |
| `src/tabs/ForemanView.jsx` | Time entry creation (needs P1-3) | — |
| `src/tabs/TimeClockAdmin.jsx` | Time entry edit (needs P1-3) | — |

## Key Architectural Facts

- `DEFAULT_BURDEN = 1.35` (exported from financialValidation.js) — FICA + SUTA + WC + GL + benefits
- Labor rates are RAW wages (Foreman $42, Journeyman $35, Apprentice $22, Driver $25). Confirmed not pre-burdened.
- `app.accruals` must always be passed to `computeProjectTotalCost` as the 7th arg. Already done in 8 call sites — if you add a 9th, pass it.
- `filterActive()` excludes `status === "deleted"`. Cost functions also exclude `"void"`.
- Soft-delete pattern everywhere: invoices, COs, AP bills, accruals, commitments, T&M, vendors.
- Period validation: every save() in MoreTabs calls `validatePeriod` and blocks non-admins; admin override requires reason, stored as `periodOverride: { reason, approvedBy, timestamp }`.
- Project 1 has a full walkable dataset for the "March margin" test question. Other projects have auto-generated budgets only.

## Audit Commands

Run both auditors in parallel after each sprint cycle:

```
Agent: construction-bookkeeping-auditor
Agent: construction-accountant-reviewer
```

Previous score history (targets in parens):
- Bookkeeping: 19 → 34 → 61 → 74 → 82 → **(90+ target)**
- Accounting: 14 → 26 → 44 → 69 → 78 → **(85+ target)**

## What to expect when you hit 90+/85+

The accounting auditor stated: "These are not architectural failures. They are integration gaps. The cost engine is sound. The data model is sound. The remaining work is making sure every consumer of those numbers asks the same question the same way. 1-2 day cleanup, not a rewrite."

If P0-1 through P0-5 land cleanly, the scores should hit 88-90 bookkeeping and 85-88 accounting. The P1 items get us the rest of the way.

**Beyond 90:** The only things left are architectural features (not gaps):
- General ledger / double-entry (blocks CPA use for close — currently app is job-cost, not GL)
- Schedule of values G702/G703 billing
- Change order cost isolation (separate base scope margin from CO margin)
- T&M cost aggregation into cost engine
- Bank reconciliation
- ASC 606 loss job recognition
- Retainage aging buckets (0-30/31-60/61-90/91+)
- Vendor 1099 YTD report
- Budget baseline lock after first invoice posts
- Attachment storage → IndexedDB or Supabase (base64 localStorage will blow 5-10MB quota fast)

These are roadmap items, not defects. Score past 90 will be determined by which of these ship.

## Session Kickoff Command

Open this handoff file, read the commits in `git log --oneline -20`, then start with P0-1 (the `computeWorkedHours` export). It's the smallest change with the largest score impact and it eliminates the root cause for 3 other defects.
