// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Estimating Calc Tests
//  Locks in the post-Apr-2026 tax/burden/OH/profit math so no one
//  silently regresses it. Run: npm test
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcItem, calcRoom, calcSummary } from "../../src/utils/estimatingCalc.js";

// ── Test fixtures ──
const ASSEMBLIES = [
  { code: "A1", name: "Interior wall", unit: "LF", matRate: 10, labRate: 20 },
  { code: "A2", name: "Demising wall", unit: "LF", matRate: 15, labRate: 30 },
  { code: "C1", name: "Ceiling ACT",   unit: "SF", matRate: 2,  labRate: 3  },
  { code: "D1", name: "Door opening",  unit: "EA", matRate: 100, labRate: 200 },
];

// Height factor at 10ft is the baseline (1.0). Higher walls need scaffold/lifts → labor up.
// Per src/data/constants.js getHF:
//   h ≤ 10 → f=1.00 (baseline)
//   h ≤ 14 → f=1.09 (+9% labor, tall ladder/baker scaffold)
//   h ≤ 18 → f=1.20 (+20%, rolling scaffold)
//   h ≤ 24 → f=1.30 (+30%, man-lift)
//   h ≤ 30 → f=1.54 (+54%, man-lift required)
//   h > 30 → f=1.70 (+70%+, multi-level staging)

describe("calcItem", () => {
  it("returns zero for unknown assembly code", () => {
    const item = { code: "XXX", qty: 100, height: 10, diff: 1 };
    expect(calcItem(item, ASSEMBLIES)).toEqual({ mat: 0, lab: 0, total: 0 });
  });

  it("multiplies qty × matRate × diff for material", () => {
    const item = { code: "A1", qty: 100, height: 10, diff: 1 };
    const r = calcItem(item, ASSEMBLIES);
    expect(r.mat).toBe(1000); // 100 × 10 × 1
  });

  it("applies height factor of 1.0 at 10ft (baseline)", () => {
    const item = { code: "A1", qty: 100, height: 10, diff: 1 };
    const r = calcItem(item, ASSEMBLIES);
    // Labor = qty × labRate × hf.f × diff = 100 × 20 × 1.0 × 1 = 2000
    expect(r.lab).toBe(2000);
    expect(r.total).toBe(3000); // mat + lab
  });

  it("applies height factor of 1.09 at 12ft (+9% labor)", () => {
    const item = { code: "A1", qty: 100, height: 12, diff: 1 };
    const r = calcItem(item, ASSEMBLIES);
    // Labor = 100 × 20 × 1.09 × 1 = 2180
    expect(r.lab).toBeCloseTo(2180, 2);
  });

  it("applies height factor of 1.20 at 16ft (rolling scaffold)", () => {
    const item = { code: "A1", qty: 100, height: 16, diff: 1 };
    const r = calcItem(item, ASSEMBLIES);
    // Labor = 100 × 20 × 1.20 × 1 = 2400
    expect(r.lab).toBeCloseTo(2400, 2);
  });

  it("applies height factor of 1.70 at 32ft (multi-level staging)", () => {
    const item = { code: "A1", qty: 100, height: 32, diff: 1 };
    const r = calcItem(item, ASSEMBLIES);
    // Labor = 100 × 20 × 1.70 × 1 = 3400
    expect(r.lab).toBeCloseTo(3400, 2);
  });

  it("applies diff (difficulty) multiplier to BOTH mat and lab", () => {
    const item = { code: "A1", qty: 100, height: 10, diff: 1.5 };
    const r = calcItem(item, ASSEMBLIES);
    expect(r.mat).toBe(1500); // 100 × 10 × 1.5
    expect(r.lab).toBe(3000); // 100 × 20 × 1.0 × 1.5
  });

  it("handles zero qty safely", () => {
    const item = { code: "A1", qty: 0, height: 10, diff: 1 };
    expect(calcItem(item, ASSEMBLIES)).toEqual({ mat: 0, lab: 0, total: 0 });
  });

  it("defaults height to 10 if omitted", () => {
    const r1 = calcItem({ code: "A1", qty: 100 }, ASSEMBLIES);
    const r2 = calcItem({ code: "A1", qty: 100, height: 10 }, ASSEMBLIES);
    expect(r1).toEqual(r2);
  });

  it("defaults diff to 1 if omitted", () => {
    const r1 = calcItem({ code: "A1", qty: 100, height: 10 }, ASSEMBLIES);
    const r2 = calcItem({ code: "A1", qty: 100, height: 10, diff: 1 }, ASSEMBLIES);
    expect(r1).toEqual(r2);
  });
});

describe("calcRoom", () => {
  it("sums mat + lab across all items", () => {
    const room = { items: [
      { code: "A1", qty: 100, height: 10, diff: 1 }, // 1000 mat, 2000 lab
      { code: "A2", qty: 50,  height: 10, diff: 1 }, //  750 mat, 1500 lab
    ]};
    const r = calcRoom(room, ASSEMBLIES);
    expect(r.mat).toBe(1750);
    expect(r.lab).toBe(3500);
    expect(r.total).toBe(5250);
  });

  it("returns zeros for an empty room", () => {
    expect(calcRoom({ items: [] }, ASSEMBLIES)).toEqual({ mat: 0, lab: 0, total: 0 });
  });

  it("returns zeros if items is undefined", () => {
    expect(calcRoom({}, ASSEMBLIES)).toEqual({ mat: 0, lab: 0, total: 0 });
  });

  it("ignores items with unknown codes", () => {
    const room = { items: [
      { code: "A1", qty: 100, height: 10, diff: 1 }, // counts
      { code: "XXX", qty: 999, height: 10, diff: 1 }, // ignored
    ]};
    const r = calcRoom(room, ASSEMBLIES);
    expect(r.mat).toBe(1000);
    expect(r.lab).toBe(2000);
  });
});

describe("calcSummary — Texas commercial convention", () => {
  const tk = (overrides = {}) => ({
    rooms: [{
      items: [
        { code: "A1", qty: 1000, height: 10, diff: 1 }, // 10,000 mat, 20,000 lab
      ],
    }],
    wastePct: 0,
    laborBurdenPct: 0,
    overheadPct: 0,
    profitPct: 0,
    taxRate: 0,
    ...overrides,
  });

  it("zero markups: grandTotal === subtotal", () => {
    const s = calcSummary(tk(), ASSEMBLIES);
    expect(s.matSub).toBe(10000);
    expect(s.labSub).toBe(20000);
    expect(s.subtotal).toBe(30000);
    expect(s.grandTotal).toBe(30000);
  });

  it("waste applies to MATERIAL ONLY (not labor)", () => {
    const s = calcSummary(tk({ wastePct: 10 }), ASSEMBLIES);
    expect(s.wasteAmt).toBe(1000); // 10% of 10,000 material, NOT of 30,000 subtotal
    expect(s.matWithWaste).toBe(11000);
    expect(s.labWithBurden).toBe(20000); // unchanged
    expect(s.grandTotal).toBe(31000);
  });

  it("labor burden applies to LABOR ONLY (not material)", () => {
    const s = calcSummary(tk({ laborBurdenPct: 30 }), ASSEMBLIES);
    expect(s.burdenAmt).toBe(6000); // 30% of 20,000 labor
    expect(s.labWithBurden).toBe(26000);
    expect(s.matWithWaste).toBe(10000); // unchanged
    expect(s.grandTotal).toBe(36000);
  });

  it("overhead applies to pre-tax cost (material with waste + labor with burden)", () => {
    const s = calcSummary(tk({ wastePct: 10, laborBurdenPct: 30, overheadPct: 10 }), ASSEMBLIES);
    const netCost = 11000 + 26000; // 37,000
    expect(s.netCost).toBe(netCost);
    expect(s.overheadAmt).toBe(3700);
    expect(s.costWithOverhead).toBe(40700);
  });

  it("profit applies to cost + overhead (not tax)", () => {
    const s = calcSummary(tk({ overheadPct: 10, profitPct: 8 }), ASSEMBLIES);
    // no waste, no burden: netCost = 30,000
    // overhead = 3,000 → 33,000
    // profit = 33,000 × 8% = 2,640
    expect(s.overheadAmt).toBe(3000);
    expect(s.profitAmt).toBe(2640);
    expect(s.costWithProfit).toBe(35640);
  });

  it("sales tax is a PASS-THROUGH on materials, added AFTER profit", () => {
    const s = calcSummary(tk({ taxRate: 8.25 }), ASSEMBLIES);
    // tax only on material + waste (no waste here, so just material)
    expect(s.taxAmt).toBeCloseTo(10000 * 0.0825, 2); // 825
    expect(s.grandTotal).toBeCloseTo(30000 + 825, 2);
    // Critical: tax NOT multiplied by OH or profit (no phantom markup on pass-through)
  });

  it("regression guard: OH and profit do NOT cascade on tax", () => {
    // If OH/profit cascaded on tax, grandTotal would be ~$36,000
    // Correct math: netCost 30k × 1.1 OH × 1.08 profit = 35,640 → + 825 tax = 36,465
    const s = calcSummary(tk({ overheadPct: 10, profitPct: 8, taxRate: 8.25 }), ASSEMBLIES);
    expect(s.grandTotal).toBeCloseTo(36465, 0);
    // Had this been buggy (tax before OH/profit cascade): would be ~37,119
    // Difference on a real job scales linearly with material$
  });

  it("full realistic bid: $2M job, 6% tax, 10% OH, 8% profit, 30% burden, 5% waste", () => {
    const big = {
      rooms: [{ items: [
        { code: "A1", qty: 40000, height: 10, diff: 1 }, // 400k mat, 800k lab
        { code: "C1", qty: 100000, height: 10, diff: 1 }, // 200k mat, 300k lab
      ]}],
      wastePct: 5,
      laborBurdenPct: 30,
      overheadPct: 10,
      profitPct: 8,
      taxRate: 6,
    };
    const s = calcSummary(big, ASSEMBLIES);
    expect(s.matSub).toBe(600000);
    expect(s.labSub).toBe(1100000);
    expect(s.wasteAmt).toBe(30000); // 5% of 600k
    expect(s.burdenAmt).toBe(330000); // 30% of 1.1M
    const netCost = 630000 + 1430000; // 2,060,000
    expect(s.netCost).toBe(netCost);
    expect(s.overheadAmt).toBe(206000);
    expect(s.profitAmt).toBeCloseTo(181280, 0); // 2.266M × 8%
    expect(s.taxAmt).toBe(37800); // 6% of 630k
    expect(s.grandTotal).toBeCloseTo(2485080, 0);
  });

  it("handles empty rooms gracefully", () => {
    const s = calcSummary({ rooms: [] }, ASSEMBLIES);
    expect(s.matSub).toBe(0);
    expect(s.labSub).toBe(0);
    expect(s.grandTotal).toBe(0);
  });

  it("handles missing markup fields (backward compat)", () => {
    // Old takeoffs without laborBurdenPct — should default to 0
    const old = { rooms: [{ items: [{ code: "A1", qty: 100, height: 10, diff: 1 }] }] };
    const s = calcSummary(old, ASSEMBLIES);
    expect(s.burdenAmt).toBe(0);
    expect(s.wasteAmt).toBe(0);
    expect(s.overheadAmt).toBe(0);
    expect(s.profitAmt).toBe(0);
    expect(s.taxAmt).toBe(0);
    expect(s.grandTotal).toBe(s.subtotal);
  });
});
