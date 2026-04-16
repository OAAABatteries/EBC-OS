# Takeoff Engine Rebuild Plan

Dated: April 15, 2026
Audit score: **3.3 / 10 — REBUILD (core pipeline)**

## TL;DR

The takeoff PDF viewer is a feature-rich measurement tool, but the **pipeline from measurement → priced line item → proposal** is broken at three places, and the critical construction-estimating primitives (sheet refs, spec refs, addendum tracking, burden, sanity metrics) don't exist at all.

Fixing this is not a polish pass. It's a data-spine rebuild.

## Why This Matters

Per user memory (`project_roadmap.md`, `feedback_premature_breadth.md`):
- "Stop expanding, fix takeoff engine first. Core must be trustworthy before anything else."
- EBC makes 100% margin on labor — labor is the profit driver.
- Estimating is the entry point for every job. A bid with a bad number costs the company.

User's own words on current state: **"This estimating is lacking so bad it's sad."**

## What Was Fixed This Session (Phase 0 — hotfixes)

### ✅ Tax/overhead math bug (critical)
**Before:**
```javascript
taxAmt = matSub * (1 + wastePct) * taxRate
costWithTax = netCost + taxAmt
overheadAmt = costWithTax * overheadPct   // ← OH cascades on tax
profit = costWithOverhead * profitPct      // ← profit cascades on tax
```
Two bugs:
1. Tax was applied to material+waste BUT `netCost` already includes waste → math muddled
2. Overhead and profit were computed on `costWithTax` → charging markup on pass-through sales tax

**After:** Waste on material only (labor has no waste), overhead/profit on pre-tax cost, tax added LAST as Texas-convention pass-through. Also added `laborBurdenPct` as a separate first-class multiplier on labor only.

**Impact:** On a $2M job with $400K materials, 6% tax, 10% OH, 8% profit → saves ~$4.7k of phantom markup per bid. Multiply across 8 bids/month.

### ✅ Killed the external Claude plan analyzer (critical, violates no-AI rule)
**Before:** `src/services/planAnalyzer.js` called Claude API to extract project metadata, wall types, scope, RFI candidates, etc.

**After:** Complete local-heuristic rewrite. Uses regex/pattern matching against pdfjs-extracted text to pull:
- Project name, address, architect, GC, SF, occupancy, building type, ceiling height
- Wall types (TYPE A1, W-1, Wall Type 1, etc.) matched to EBC assembly codes
- Ceiling types (ACT-1, GYP-BD, etc.)
- Scope summary (demo, framing, drywall, fire-rating, insulation, ACT, doors, corner bead)
- Demo items (parsed from "remove / demo / tear down" phrases)
- RFI candidates (parsed from "by others / N.I.C. / TBD / clarify / confirm")
- Alternate/separate prices
- Paint colors (PT-1, PT-2, etc.)

Signature preserved (`analyzePlans(apiKey, planText, assemblies)`) so existing callers work without changes. The `apiKey` argument is now ignored. Result object carries `_source: "local-heuristic"` flag.

**Impact:** Removes API cost, removes "Set API key first" gate, removes leak of confidential plan data, respects your explicit rule.

## What Still Needs to Be Done — Phase 1 (1 week)

### 1. Fix "Send to Estimate" to preserve structure (2 days)
**File:** `src/routes/TakeoffRoute.jsx` line 186, `src/components/DrawingViewer.jsx` line 3934

**Problem:** Aggregates all conditions by `asmCode`, rounds quantities to integers, dumps everything into `rooms[0]`. Bid areas, condition folders, page/sheet source — all lost.

**Fix:** Aggregate by `(asmCode, bidAreaId, folderId)`. Create one room per bid area. Preserve decimal qty (1 decimal for LF/SF, integer for count — per-condition property). Store `sourceMeasurementIds: string[]` on each line item.

### 2. Quantity traceability on line items (2-3 days)
**File:** `src/tabs/Estimating.jsx` schema + UI

**Problem:** Line items have `{ code, desc, qty, unit, height, diff }`. No sheet, measurement, or spec reference.

**Fix:** Extend schema with `{ sourceMeasurementIds: string[], sourceSheets: string[], specSection: string, revisionAtEstimate: string }`. Add "Source" column in line-item table. Click → jump to drawing/measurement.

### 3. Sanity metrics panel (1 day)
**File:** `src/tabs/Estimating.jsx` summary view

**Problem:** No $/SF, no labor-hours/SF, no comparison to 215+ historical bids in seed data.

**Fix:** Top of bid summary:
- `$/SF` (grand total / project SF)
- `Labor $/SF`
- `Hours/SF` (labor$ / avg rate)
- Color red if ±20% off cluster-median of matching-phase historicals
- No API — compute locally from `projects` data

## What Still Needs to Be Done — Phase 2 (2 weeks)

### 4. Addendum/bulletin/RFI tracking (3-5 days)
**File:** New `src/tabs/estimating/Documents.jsx`, `src/data/constants.js` schema

**Problem:** Zero tracking of addenda, bulletins, RFIs, or drawing revisions. Missed addendum = lost job or change-order fight.

**Fix:** `documents[]` collection on each takeoff: `{ type: "plans" | "specs" | "addendum" | "bulletin" | "rfi", number, date, sheets[], notes, acknowledged: bool }`. Gate "Export PDF" on all addenda acknowledged. Ribbon at top of takeoff.

### 5. Internal-review proposal PDF (1-2 days)
**File:** `src/utils/proposalPdf.js`

**Problem:** Client PDF hides qty, unit rates, line totals. Review is impossible.

**Fix:** Add second PDF output: `audience: "internal" | "client"`. Internal shows qty, unit cost, labor/material split, height factors, source sheets. Client gets the current polished version.

### 6. Burden / insurance / bond separation (2-3 days)
**File:** `src/data/constants.js`, `src/tabs/Estimating.jsx`

**Problem:** `labRate` is fully-loaded (wage+burden) without separation. Can't tune labor markup independent of material. Can't present M/L separately to GC.

**Fix:** Split `labRate` → `wageRate + burdenPct + laborMarkup`. Add project-level `bondPct`, `insurancePct`. Show all four in summary.

### 7. Sheet index + measurement list panels (2 days)
**File:** `src/components/DrawingViewer.jsx`

**Problem:** No way to navigate a 50-sheet plan set. No way to audit measurements.

**Fix:** Left-rail tabs:
- **Sheets** — list of page keys grouped by PDF, with name + has-measurements indicator + calibration-set indicator + CO-revised indicator
- **Measurements** — flat filterable list (by condition/bid-area), click to scroll into view

## What Still Needs to Be Done — Phase 3 (1-2 weeks)

### 8. Decompose DrawingViewer.jsx (3-5 days)
**File:** `src/components/DrawingViewer.jsx` (4,295 lines — 8.5× over 500-line guideline)

**Extract:**
- `useTakeoffCanvas()` hook (rendering)
- `useCalibration()` hook
- `useConditions()` hook
- `useMeasurements()` hook
- `<MeasurementTools/>` component
- `<ConditionsPanel/>` component
- `<SummaryView/>` component
- `<CORevisionOverlay/>` component

Target: 400-600 lines each.

### 9. Decompose Estimating.jsx (2,668 lines)
**File:** `src/tabs/Estimating.jsx`

Same pattern — extract business logic into pure functions and sub-components.

### 10. Unit tests for core calculations
**New files:** `src/tabs/__tests__/Estimating.test.js`, `src/utils/__tests__/*.test.js`

Coverage for:
- `calcSummary` (tax, OH, profit, burden, waste permutations)
- `calcRoom`, `calcItem`
- `buildScopeLines`
- `pdfBidExtractor` parse cases
- Calibration math

## What To KEEP (the things worth preserving)

- **PDF viewer geometry** — calibration, scale presets, polygon area, angle snap, typical groups, CO overlay — math is right
- **Proposal PDF branding** — EBC navy + orange, clean layout, professional
- **pdfBidExtractor.js** — clever heuristic local parser, already respects no-AI rule
- **Scope checklist concept** (18 items) — good framework, needs wiring to measurements
- **Cloud-first PDF loading** (signed URL → IDB cache → Supabase bytes) — smart layering
- **Profit suggestions panel** — corner bead %, CJ per 30 LF, fire caulk % — correct tradecraft knowledge
- **Height factor table** (`getHF`) — real estimator data

## What To KILL (confirmed removed Apr 15)

- ✅ Claude API plan analyzer (killed this session, replaced with local heuristic)
- Still to remove: "AI Gap Analysis" panel (same API dependency)
- Still to rebuild: "Compare to History" (currently Claude call → local statistical comparison)

## Recommended Attack Order for Next Session(s)

### Session A (1 day):
- Phase 1 item #3 — Sanity metrics panel (lowest risk, highest daily value)

### Session B (2 days):
- Phase 1 item #1 — "Send to Estimate" structure preservation
- Phase 1 item #2 — Quantity traceability (schema migration)

### Session C (1 week):
- Phase 2 items #4 + #5 + #6 + #7 — Addendum tracking, internal PDF, burden split, sheet index

### Session D (1-2 weeks):
- Phase 3 — Decompose DrawingViewer + Estimating + add unit tests

## Success Criteria (what "fixed" looks like)

- [ ] Any line item in a bid → click → shows the exact measurements and sheets that produced it
- [ ] "Send to Estimate" preserves bid areas, folders, and decimal quantities
- [ ] Every bid has $/SF and Labor$/SF visible next to the total, with historical comparison
- [ ] No bid can be exported to PDF without confirming all addenda/bulletins are acknowledged
- [ ] Tax is a separate pass-through line AFTER profit, not embedded in markup
- [ ] Labor has a separate burden %, wage rate, and markup — all editable per project
- [ ] Owner or reviewer can audit a bid without opening localStorage JSON
- [ ] DrawingViewer.jsx is under 1,000 lines, decomposed into hooks and sub-components
- [ ] At least 70% unit-test coverage on `calcSummary`, `calcRoom`, and `pdfBidExtractor`

## Files Touched This Session

- `src/tabs/Estimating.jsx` — fixed `calcSummary` tax/OH math, added `burdenAmt`, `labWithBurden`, `matWithWaste`, `costWithProfit` to return value
- `src/services/planAnalyzer.js` — killed Claude API call, replaced with local heuristic regex parser
- `docs/takeoff-rebuild-plan.md` (this file) — plan for subsequent sessions

## One-Sentence Truth

The takeoff has great bones (measurement math, PDF viewer, branding) but the data spine between takeoff → pricing → proposal is broken; fix the spine before any UI polish.
