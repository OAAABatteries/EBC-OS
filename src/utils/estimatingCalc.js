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

// ── Assembly classification helpers (internal) ──
// Any assembly with cat:"Walls" measured in LF counts toward wallLF.
// Any assembly with cat:"Ceilings" measured in SF counts toward ceilingSF.
// Heuristic: assemblies whose name contains a fire-rating token are "rated" walls.
const RATED_WALL_RE = /\b(1[- ]?hr|2[- ]?hr|fire[- ]?rated|shaft\s*wall|rated)\b/i;

// Shaft Wall is a distinct category in the assembly DB but counts toward wall LF
// for takeoff sanity metrics — it's still linear wall framing on the job.
function isWallLF(asm) { return asm && (asm.cat === "Walls" || asm.cat === "Shaft Wall") && asm.unit === "LF"; }
function isCeilingSF(asm) { return asm && asm.cat === "Ceilings" && asm.unit === "SF"; }
function isRatedWall(asm) { return isWallLF(asm) && (RATED_WALL_RE.test(asm.name || "") || asm.code === "SW1"); }

/**
 * Sum takeoff line-item quantities by category and key add-on code.
 * All sums honor the difficulty multiplier NO — these are raw measured qty.
 *
 * @param {object} tk - { rooms: [{ items: [{ code, qty }] }] }
 * @param {Array} assemblies - assembly library with { code, cat, unit, name }
 * @returns {{
 *   wallLF: number,        // Σ qty where cat=Walls, unit=LF
 *   ratedWallLF: number,   // subset of wallLF where name/code indicates fire-rating
 *   ceilingSF: number,     // Σ qty where cat=Ceilings, unit=SF
 *   cbLF: number,          // code "CB"
 *   cjEA: number,          // code "CJ"
 *   fcLF: number,          // code "FC"
 *   dfEA: number,          // code "DF"
 *   slEA: number,          // code "SL"
 * }}
 */
export function calcQtySums(tk, assemblies) {
  let wallLF = 0, ratedWallLF = 0, ceilingSF = 0;
  let cbLF = 0, cjEA = 0, fcLF = 0, dfEA = 0, slEA = 0;
  const asmByCode = new Map((assemblies || []).map((a) => [a.code, a]));
  (tk.rooms || []).forEach((rm) => {
    (rm.items || []).forEach((it) => {
      const asm = asmByCode.get(it.code);
      const qty = Number(it.qty) || 0;
      if (!asm || qty <= 0) return;
      if (isWallLF(asm)) {
        wallLF += qty;
        if (isRatedWall(asm)) ratedWallLF += qty;
      }
      if (isCeilingSF(asm)) ceilingSF += qty;
      if (it.code === "CB") cbLF += qty;
      if (it.code === "CJ") cjEA += qty;
      if (it.code === "FC") fcLF += qty;
      if (it.code === "DF") dfEA += qty;
      if (it.code === "SL") slEA += qty;
    });
  });
  return { wallLF, ratedWallLF, ceilingSF, cbLF, cjEA, fcLF, dfEA, slEA };
}

/**
 * Compute ceiling-only material + labor totals (for $/Ceiling SF metrics).
 * Mirrors calcRoom but filters to ceiling-category items.
 */
export function calcCeilingTotals(tk, assemblies) {
  let mat = 0, lab = 0;
  const asmByCode = new Map((assemblies || []).map((a) => [a.code, a]));
  (tk.rooms || []).forEach((rm) => {
    (rm.items || []).forEach((it) => {
      const asm = asmByCode.get(it.code);
      if (!asm || asm.cat !== "Ceilings") return;
      const c = calcItem(it, assemblies);
      mat += c.mat;
      lab += c.lab;
    });
  });
  return { mat, lab, total: mat + lab };
}

/**
 * Classify a coverage ratio against its industry target.
 * @param {number} actualPct - actual % (e.g. 0.12 for 12%)
 * @param {number} targetPct - expected % (e.g. 0.15 for 15%)
 * @param {{ tightBand?: number, looseBand?: number }} [bands]
 * @returns {"green"|"amber"|"red"|"neutral"}
 */
export function classifyRatio(actualPct, targetPct, bands = {}) {
  if (!Number.isFinite(actualPct) || !Number.isFinite(targetPct) || targetPct <= 0) return "neutral";
  const tight = bands.tightBand ?? 0.25;  // ±25% of target → green
  const loose = bands.looseBand ?? 0.50;  // ±50% of target → amber
  const dev = Math.abs(actualPct - targetPct) / targetPct;
  if (dev <= tight) return "green";
  if (dev <= loose) return "amber";
  return "red";
}

/**
 * Build the LF-based sanity metrics for drywall/framing takeoffs.
 * Returns tile data + coverage ratio analysis.
 *
 * @param {object} tk
 * @param {Array} assemblies
 * @param {object} summary - output of calcSummary (for labor/grandTotal)
 * @param {object} [opts] - { avgLabRate?: 45 }
 */
export function calcLFMetrics(tk, assemblies, summary, opts = {}) {
  const avgLabRate = opts.avgLabRate || 45;
  const sums = calcQtySums(tk, assemblies);
  const { wallLF, ratedWallLF, ceilingSF, cbLF, cjEA, fcLF, dfEA } = sums;

  // Per-LF dollar metrics (wall-based)
  const dollarsPerWallLF = wallLF > 0 ? (summary.grandTotal || 0) / wallLF : null;
  const laborPerWallLF = wallLF > 0 ? (summary.labWithBurden || summary.labSub || 0) / wallLF : null;
  const hoursPerWallLF = wallLF > 0 && avgLabRate > 0
    ? ((summary.labWithBurden || summary.labSub || 0) / avgLabRate) / wallLF
    : null;

  // Coverage ratios — industry targets come from constants.js lines 139-144
  const cbRatio = wallLF > 0 ? cbLF / wallLF : null;
  const cbStatus = cbRatio === null ? "neutral" : classifyRatio(cbRatio, 0.15);

  const cjExpected = wallLF > 0 ? wallLF / 30 : 0;
  const cjCoverage = cjExpected > 0 ? cjEA / cjExpected : null; // 1.0 = matches target
  const cjStatus = cjCoverage === null
    ? "neutral"
    : cjCoverage < 0.5 ? "red"
    : cjCoverage < 0.8 ? "amber"
    : cjCoverage <= 1.5 ? "green"
    : "amber"; // way over target is suspicious but not catastrophic

  // FC: only evaluate when fcLF > 0 OR rated walls present.
  // If rated walls exist but FC is zero → red (missed fire caulk on rated partitions).
  // If no rated walls and FC is zero → neutral (likely no rated scope).
  let fcStatus = "neutral";
  let fcNote = null;
  if (ratedWallLF > 0) {
    const fcExpected = ratedWallLF * 0.10;
    if (fcLF <= 0) { fcStatus = "red"; fcNote = `${Math.round(ratedWallLF)} LF of rated wall but 0 LF FC`; }
    else if (fcLF < fcExpected * 0.5) fcStatus = "amber";
    else fcStatus = "green";
  } else if (fcLF > 0) {
    // FC present but no rated walls detected — worth noting
    fcStatus = "amber";
    fcNote = "FC present but no rated-wall assemblies detected — verify classification";
  } else {
    fcNote = "No rated-wall assemblies — confirm no 1-hr / 2-hr partitions in scope";
  }

  // DF — informational: show actual vs "typical" from wallLF/25
  const dfTypical = wallLF > 0 ? Math.round(wallLF / 25) : 0;

  // Ceiling metrics (RCP — the legitimate SF block)
  const ceilingTotals = calcCeilingTotals(tk, assemblies);
  const dollarsPerCeilingSF = ceilingSF > 0 ? ceilingTotals.total / ceilingSF : null;
  const laborPerCeilingSF = ceilingSF > 0 ? ceilingTotals.lab / ceilingSF : null;

  return {
    sums,
    wall: { wallLF, dollarsPerWallLF, laborPerWallLF, hoursPerWallLF, avgLabRate },
    ratios: {
      cb: { actual: cbLF, expected: wallLF > 0 ? wallLF * 0.15 : 0, ratio: cbRatio, status: cbStatus },
      cj: { actual: cjEA, expected: Math.round(cjExpected), coverage: cjCoverage, status: cjStatus },
      fc: { actual: fcLF, ratedWallLF, status: fcStatus, note: fcNote },
      df: { actual: dfEA, typical: dfTypical },
    },
    ceiling: { ceilingSF, dollarsPerCeilingSF, laborPerCeilingSF, totals: ceilingTotals },
  };
}
