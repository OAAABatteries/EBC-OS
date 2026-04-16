// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Estimating Calculation Primitives
//  Extracted from Estimating.jsx for testability and reuse.
//  Pure functions — no React, no side effects, no I/O.
//  Full test coverage in src/utils/__tests__/estimatingCalc.test.js
// ═══════════════════════════════════════════════════════════════
import { getHF } from "../data/constants";

/**
 * Calculate material + labor cost for a single line item.
 * @param {object} item - { code, qty, height, diff }
 * @param {Array} assemblies - assembly library with { code, matRate, labRate }
 * @returns {{ mat: number, lab: number, total: number }}
 */
export function calcItem(item, assemblies) {
  const asm = assemblies.find((a) => a.code === item.code);
  if (!asm) return { mat: 0, lab: 0, total: 0 };
  const hf = getHF(item.height || 10);
  const matTotal = (item.qty || 0) * (asm.matRate || 0) * (item.diff || 1);
  const labTotal = (item.qty || 0) * (asm.labRate || 0) * hf.f * (item.diff || 1);
  return { mat: matTotal, lab: labTotal, total: matTotal + labTotal };
}

/**
 * Sum material + labor across all items in a room.
 * @param {object} room - { items: [] }
 * @param {Array} assemblies
 * @returns {{ mat: number, lab: number, total: number }}
 */
export function calcRoom(room, assemblies) {
  let mat = 0, lab = 0;
  (room.items || []).forEach((it) => {
    const c = calcItem(it, assemblies);
    mat += c.mat;
    lab += c.lab;
  });
  return { mat, lab, total: mat + lab };
}

/**
 * Compute full bid summary with waste, burden, overhead, profit, and tax.
 *
 * Texas commercial subcontracting convention:
 * - Waste applies to MATERIAL only
 * - Labor burden (25-40%) applies to LABOR only
 * - Overhead + profit apply to pre-tax cost
 * - Sales tax is a pass-through on materials, added AT THE END
 *
 * Fixed bugs from the pre-Apr-2026 version:
 * - Waste was being double-counted in the tax base
 * - Overhead + profit cascaded on top of tax (charged markup on pass-through)
 *
 * @param {object} tk - takeoff: { rooms, wastePct, laborBurdenPct, taxRate, overheadPct, profitPct }
 * @param {Array} assemblies
 * @returns Full summary with all intermediate values for UI display.
 */
export function calcSummary(tk, assemblies) {
  let matSub = 0, labSub = 0;
  (tk.rooms || []).forEach((rm) => {
    const c = calcRoom(rm, assemblies);
    matSub += c.mat;
    labSub += c.lab;
  });
  const subtotal = matSub + labSub;
  const wasteAmt = matSub * ((tk.wastePct || 0) / 100);
  const matWithWaste = matSub + wasteAmt;
  const burdenPct = tk.laborBurdenPct ?? 0;
  const burdenAmt = labSub * (burdenPct / 100);
  const labWithBurden = labSub + burdenAmt;
  const netCost = matWithWaste + labWithBurden;
  const overheadAmt = netCost * ((tk.overheadPct || 0) / 100);
  const costWithOverhead = netCost + overheadAmt;
  const profitAmt = costWithOverhead * ((tk.profitPct || 0) / 100);
  const costWithProfit = costWithOverhead + profitAmt;
  const taxAmt = matWithWaste * ((tk.taxRate || 0) / 100);
  const grandTotal = costWithProfit + taxAmt;
  const costWithTax = netCost + taxAmt; // legacy field, rarely used
  return {
    matSub, labSub, subtotal,
    wasteAmt, matWithWaste,
    burdenAmt, labWithBurden,
    netCost,
    overheadAmt, costWithOverhead,
    profitAmt, costWithProfit,
    taxAmt, costWithTax,
    grandTotal,
  };
}
