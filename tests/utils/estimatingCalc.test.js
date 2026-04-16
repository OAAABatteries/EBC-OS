// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Estimating Calc Tests
//  Locks in the post-Apr-2026 tax/burden/OH/profit math so no one
//  silently regresses it. Run: npm test
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcItem, calcRoom, calcSummary, calcQtySums, calcCeilingTotals, classifyRatio, calcLFMetrics } from "../../src/utils/estimatingCalc.js";

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

// ─────────────────────────────────────────────────────────────
// LF Sanity Metrics (drywall/framing — linear-first takeoffs)
// EBC takeoffs measure walls/CB/CJ/FC in LF. Only RCP uses SF.
// ─────────────────────────────────────────────────────────────

// Realistic assembly fixtures mirroring src/data/constants.js structure
const LF_ASSEMBLIES = [
  { code: "A3", cat: "Walls", unit: "LF", name: '2-1/2" 20ga Partition', matRate: 12.73, labRate: 39.93 },
  { code: "A4", cat: "Walls", unit: "LF", name: '8" 20ga Partition (1-hr rated)', matRate: 20.36, labRate: 46.43 },
  { code: "SW1", cat: "Shaft Wall", unit: "LF", name: "Shaft Wall System (1-hr)", matRate: 14.35, labRate: 32.00 },
  { code: "ACT1", cat: "Ceilings", unit: "SF", name: "2x2 ACT Grid + Tile", matRate: 3.02, labRate: 4.25 },
  { code: "GC1", cat: "Ceilings", unit: "SF", name: "GWB Suspended Ceiling", matRate: 2.20, labRate: 5.15 },
  { code: "FD1", cat: "Ceilings", unit: "LF", name: "Furr-Down / Soffit", matRate: 12.50, labRate: 36.00 },
  { code: "CB", cat: "Profit Add-Ons", unit: "LF", name: "Corner Bead", matRate: 0.85, labRate: 1.20 },
  { code: "CJ", cat: "Profit Add-Ons", unit: "EA", name: "Control Joints", matRate: 12.00, labRate: 18.00 },
  { code: "FC", cat: "Profit Add-Ons", unit: "LF", name: "Fire Caulking", matRate: 2.50, labRate: 3.50 },
  { code: "DF", cat: "Counts", unit: "EA", name: "Door Frame", matRate: 65.00, labRate: 120.00 },
];

describe("calcQtySums", () => {
  it("returns zeros for empty takeoff", () => {
    const r = calcQtySums({ rooms: [] }, LF_ASSEMBLIES);
    expect(r).toEqual({ wallLF: 0, ratedWallLF: 0, ceilingSF: 0, cbLF: 0, cjEA: 0, fcLF: 0, dfEA: 0, slEA: 0 });
  });

  it("sums wallLF across multiple wall assemblies and rooms", () => {
    const tk = {
      rooms: [
        { items: [{ code: "A3", qty: 200, height: 10, diff: 1 }] },
        { items: [{ code: "A3", qty: 150, height: 10, diff: 1 }, { code: "A4", qty: 100, height: 10, diff: 1 }] },
      ],
    };
    const r = calcQtySums(tk, LF_ASSEMBLIES);
    expect(r.wallLF).toBe(450); // 200 + 150 + 100
  });

  it("identifies rated walls by name token AND by SW1 code", () => {
    const tk = {
      rooms: [{ items: [
        { code: "A3", qty: 300, height: 10, diff: 1 },  // not rated
        { code: "A4", qty: 200, height: 10, diff: 1 },  // rated (name has "1-hr")
        { code: "SW1", qty: 100, height: 10, diff: 1 }, // rated (SW1 code)
      ] }],
    };
    const r = calcQtySums(tk, LF_ASSEMBLIES);
    expect(r.wallLF).toBe(600);
    expect(r.ratedWallLF).toBe(300); // A4 + SW1
  });

  it("only counts cat:Ceilings + unit:SF toward ceilingSF (FD1 is LF, not SF)", () => {
    const tk = {
      rooms: [{ items: [
        { code: "ACT1", qty: 500, height: 10, diff: 1 }, // ceilings SF → counts
        { code: "GC1", qty: 200, height: 10, diff: 1 },  // ceilings SF → counts
        { code: "FD1", qty: 80, height: 10, diff: 1 },   // ceilings LF → does NOT count
      ] }],
    };
    const r = calcQtySums(tk, LF_ASSEMBLIES);
    expect(r.ceilingSF).toBe(700);
  });

  it("pulls add-on qty by specific code (CB, CJ, FC, DF)", () => {
    const tk = { rooms: [{ items: [
      { code: "CB", qty: 45, height: 10, diff: 1 },
      { code: "CJ", qty: 12, height: 10, diff: 1 },
      { code: "FC", qty: 30, height: 10, diff: 1 },
      { code: "DF", qty: 8, height: 10, diff: 1 },
    ] }] };
    const r = calcQtySums(tk, LF_ASSEMBLIES);
    expect(r.cbLF).toBe(45);
    expect(r.cjEA).toBe(12);
    expect(r.fcLF).toBe(30);
    expect(r.dfEA).toBe(8);
  });

  it("ignores unknown codes and zero/negative qty", () => {
    const tk = { rooms: [{ items: [
      { code: "ZZZ", qty: 999, height: 10, diff: 1 },
      { code: "A3", qty: 0, height: 10, diff: 1 },
      { code: "A3", qty: -50, height: 10, diff: 1 },
      { code: "A3", qty: 100, height: 10, diff: 1 },
    ] }] };
    const r = calcQtySums(tk, LF_ASSEMBLIES);
    expect(r.wallLF).toBe(100);
  });
});

describe("calcCeilingTotals", () => {
  it("returns zero for no ceiling items", () => {
    const tk = { rooms: [{ items: [{ code: "A3", qty: 200, height: 10, diff: 1 }] }] };
    const r = calcCeilingTotals(tk, LF_ASSEMBLIES);
    expect(r).toEqual({ mat: 0, lab: 0, total: 0 });
  });

  it("sums mat + lab only for cat:Ceilings items", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 200, height: 10, diff: 1 },   // wall, excluded
      { code: "ACT1", qty: 500, height: 10, diff: 1 }, // ceiling, included
    ] }] };
    const r = calcCeilingTotals(tk, LF_ASSEMBLIES);
    // ACT1: 500 × 3.02 = 1510 mat; 500 × 4.25 × 1.0 = 2125 lab
    expect(r.mat).toBeCloseTo(1510, 2);
    expect(r.lab).toBeCloseTo(2125, 2);
    expect(r.total).toBeCloseTo(3635, 2);
  });
});

describe("classifyRatio", () => {
  it("returns neutral for invalid inputs", () => {
    expect(classifyRatio(null, 0.15)).toBe("neutral");
    expect(classifyRatio(0.15, 0)).toBe("neutral");
    expect(classifyRatio(NaN, 0.15)).toBe("neutral");
  });

  it("green when within ±25% of target (default)", () => {
    expect(classifyRatio(0.15, 0.15)).toBe("green"); // exact
    expect(classifyRatio(0.12, 0.15)).toBe("green"); // -20%
    expect(classifyRatio(0.18, 0.15)).toBe("green"); // +20%
  });

  it("amber when 25-50% off target", () => {
    expect(classifyRatio(0.10, 0.15)).toBe("amber"); // -33%
    expect(classifyRatio(0.22, 0.15)).toBe("amber"); // +47%
  });

  it("red when >50% off target", () => {
    expect(classifyRatio(0.05, 0.15)).toBe("red"); // -67%
    expect(classifyRatio(0.30, 0.15)).toBe("red"); // +100%
  });
});

describe("calcLFMetrics", () => {
  const summary = { grandTotal: 50000, labWithBurden: 25000, labSub: 20000 };

  it("computes $/LF and labor/LF when wallLF > 0", () => {
    const tk = { rooms: [{ items: [{ code: "A3", qty: 1000, height: 10, diff: 1 }] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.wall.wallLF).toBe(1000);
    expect(r.wall.dollarsPerWallLF).toBe(50); // 50000/1000
    expect(r.wall.laborPerWallLF).toBe(25);
    // Hours = laborWithBurden / avgRate / wallLF = 25000/45/1000 ≈ 0.556
    expect(r.wall.hoursPerWallLF).toBeCloseTo(0.5556, 3);
  });

  it("returns null per-LF metrics when wallLF is zero (ceiling-only takeoff)", () => {
    const tk = { rooms: [{ items: [{ code: "ACT1", qty: 500, height: 10, diff: 1 }] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.wall.wallLF).toBe(0);
    expect(r.wall.dollarsPerWallLF).toBeNull();
    expect(r.wall.laborPerWallLF).toBeNull();
    expect(r.wall.hoursPerWallLF).toBeNull();
  });

  it("CB ratio: green at 15% of wallLF (exact target)", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 1000, height: 10, diff: 1 },
      { code: "CB", qty: 150, height: 10, diff: 1 },
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.cb.ratio).toBeCloseTo(0.15, 3);
    expect(r.ratios.cb.status).toBe("green");
  });

  it("CB ratio: red when way under target (missed corners)", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 1000, height: 10, diff: 1 },
      { code: "CB", qty: 20, height: 10, diff: 1 }, // 2% — way low
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.cb.status).toBe("red");
  });

  it("CJ coverage: green when at target (wallLF/30)", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 900, height: 10, diff: 1 }, // expects 30 CJs
      { code: "CJ", qty: 30, height: 10, diff: 1 },
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.cj.expected).toBe(30);
    expect(r.ratios.cj.coverage).toBe(1.0);
    expect(r.ratios.cj.status).toBe("green");
  });

  it("CJ coverage: red when less than 50% of expected", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 900, height: 10, diff: 1 }, // expects 30
      { code: "CJ", qty: 10, height: 10, diff: 1 }, // 33% coverage
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.cj.status).toBe("red");
  });

  it("FC: red when rated walls present but zero FC", () => {
    const tk = { rooms: [{ items: [
      { code: "A4", qty: 500, height: 10, diff: 1 }, // rated wall
      // no FC
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.fc.status).toBe("red");
    expect(r.ratios.fc.note).toMatch(/rated wall but 0 LF FC/);
  });

  it("FC: amber when FC present but no rated-wall assemblies detected", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 500, height: 10, diff: 1 }, // not rated
      { code: "FC", qty: 50, height: 10, diff: 1 },
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.fc.status).toBe("amber");
    expect(r.ratios.fc.note).toMatch(/no rated-wall assemblies detected/);
  });

  it("FC: neutral with informative note when no rated walls and no FC", () => {
    const tk = { rooms: [{ items: [{ code: "A3", qty: 500, height: 10, diff: 1 }] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.fc.status).toBe("neutral");
    expect(r.ratios.fc.note).toMatch(/confirm no 1-hr/);
  });

  it("ceiling block: computes $/CeilingSF from ceiling-only totals", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 500, height: 10, diff: 1 },     // wall - ignored
      { code: "ACT1", qty: 1000, height: 10, diff: 1 },  // ceiling
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ceiling.ceilingSF).toBe(1000);
    // ACT1 at 1000: mat = 1000×3.02 = 3020; lab = 1000×4.25 = 4250; total = 7270
    expect(r.ceiling.dollarsPerCeilingSF).toBeCloseTo(7.27, 2);
    expect(r.ceiling.laborPerCeilingSF).toBeCloseTo(4.25, 2);
  });

  it("DF: provides actual count + typical (wallLF/25) for visual comparison", () => {
    const tk = { rooms: [{ items: [
      { code: "A3", qty: 500, height: 10, diff: 1 }, // 20 typical doors
      { code: "DF", qty: 18, height: 10, diff: 1 },
    ] }] };
    const r = calcLFMetrics(tk, LF_ASSEMBLIES, summary);
    expect(r.ratios.df.actual).toBe(18);
    expect(r.ratios.df.typical).toBe(20);
  });
});
