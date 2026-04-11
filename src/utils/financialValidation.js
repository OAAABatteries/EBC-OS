/**
 * Financial Validation & Control Utilities
 *
 * Shared by all financial record types (invoices, COs, AP bills, etc.)
 * Provides: validation, audit-diff, soft-delete, duplicate detection, labor cost computation.
 */

// ── Burden Constants ──

export const DEFAULT_BURDEN = 1.35; // FICA + SUTA + WC + GL + benefits

// ── Contract Adjustments ──

/**
 * Adjusted contract = base contract + all APPROVED change orders for this project.
 * Single source of truth for margin/earned-revenue math across dashboard, P&L,
 * job costing, FinReports, alert engine, and closeout. Pending/rejected/deleted
 * COs are ignored. Deduct COs are stored as negative amounts and net down.
 */
export function getAdjustedContract(project, changeOrders = []) {
  const base = project?.contract || 0;
  const approvedCOs = (changeOrders || [])
    .filter(c =>
      c
      && c.status === "approved"
      && String(c.projectId) === String(project?.id)
    )
    .reduce((s, c) => s + (c.amount || 0), 0);
  return base + approvedCOs;
}

// ── Validation Rules ──

export function validateInvoice(inv) {
  const errors = [];
  if (!inv.projectId) errors.push("Project is required");
  if (!inv.amount || inv.amount <= 0) errors.push("Amount must be greater than $0");
  if (!inv.date) errors.push("Date is required");
  if (!inv.desc && !inv.description) errors.push("Description is required");
  return errors;
}

export function validateChangeOrder(co) {
  const errors = [];
  if (!co.projectId) errors.push("Project is required");
  if (!co.description && !co.desc) errors.push("Description is required");
  if (co.amount === undefined || co.amount === null || co.amount === "") errors.push("Amount is required");
  if (!co.type) errors.push("Type is required (add/deduct/credit/rework)");
  if (!co.number) errors.push("CO number is required");
  return errors;
}

export function validateAPBill(bill) {
  const errors = [];
  if (!bill.vendorId) errors.push("Vendor is required");
  if (!bill.projectId) errors.push("Project is required");
  if (!bill.amount || bill.amount <= 0) errors.push("Amount must be greater than $0");
  if (!bill.invoiceNumber) errors.push("Invoice number is required");
  if (!bill.date) errors.push("Date is required");
  if (!bill.costType) errors.push("Cost type is required");
  if (!bill.description) errors.push("Description is required");
  return errors;
}

// ── Audit-Diff ──

export function auditDiff(oldRecord, newRecord, criticalFields, user) {
  const audit = [...(oldRecord.audit || [])];
  const now = new Date().toISOString();
  const userName = user?.name || "System";

  for (const field of criticalFields) {
    const oldVal = oldRecord[field];
    const newVal = newRecord[field];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      audit.push({ timestamp: now, userName, field, oldValue: String(oldVal ?? ""), newValue: String(newVal ?? "") });
    }
  }
  return audit;
}

export const CRITICAL_FIELDS = {
  invoice: ["amount", "date", "dueDate", "projectId", "status", "desc", "paidDate", "checkNum"],
  changeOrder: ["amount", "status", "type", "submittedDate", "approvedDate", "desc", "description"],
  apBill: ["amount", "date", "dueDate", "vendorId", "projectId", "costType", "invoiceNumber", "status", "description"],
};

// ── Soft-Delete ──

export function softDelete(record, userName, reason) {
  const audit = [...(record.audit || [])];
  audit.push({
    timestamp: new Date().toISOString(),
    userName: userName || "System",
    field: "status",
    oldValue: record.status || "",
    newValue: "deleted",
  });
  return {
    ...record,
    status: "deleted",
    deletedAt: new Date().toISOString(),
    deletedBy: userName || "System",
    deletionReason: reason || "",
    audit,
  };
}

export function filterActive(records) {
  return records.filter(r => r.status !== "deleted");
}

// ── Duplicate Detection ──

export function findDuplicateInvoice(invoice, existingInvoices) {
  return existingInvoices.find(
    inv => inv.id !== invoice.id
      && inv.number === invoice.number
      && String(inv.projectId) === String(invoice.projectId)
      && inv.status !== "deleted"
  ) || null;
}

export function findDuplicateCO(co, existingCOs) {
  return existingCOs.find(
    c => c.id !== co.id
      && c.number === co.number
      && String(c.projectId) === String(co.projectId)
      && c.status !== "deleted"
  ) || null;
}

export function findDuplicateAPBill(bill, existingBills) {
  return existingBills.find(
    b => b.id !== bill.id
      && b.invoiceNumber === bill.invoiceNumber
      && String(b.vendorId) === String(bill.vendorId)
      && b.status !== "deleted"
  ) || null;
}

// ── Vendor Validation ──

export function validateVendor(vendor) {
  const errors = [];
  if (!vendor.name || !vendor.name.trim()) errors.push("Vendor name is required");
  if (!vendor.status) errors.push("Status is required (active/inactive)");
  return errors;
}

export function findDuplicateVendor(vendor, existingVendors) {
  if (!vendor.name) return null;
  const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetName = normalize(vendor.name);
  return existingVendors.find(
    v => v.id !== vendor.id
      && v.status !== "deleted"
      && normalize(v.name) === targetName
  ) || null;
}

// ── Period Discipline ──

export function validatePeriod(date, periods) {
  if (!date) return { allowed: false, warning: "Date is required", period: null };
  const d = typeof date === "string" ? date : new Date(date).toISOString().slice(0, 10);
  const period = d.slice(0, 7); // "YYYY-MM"
  const match = periods.find(p => p.period === period);
  if (!match) return { allowed: true, warning: null, period };
  if (match.status === "closed") {
    return { allowed: false, warning: `Period ${period} is closed (closed by ${match.closedBy || "unknown"} on ${match.closedAt ? match.closedAt.slice(0, 10) : "unknown date"})`, period };
  }
  return { allowed: true, warning: null, period };
}

// ── AP Bill Cost Aggregations ──

export function computeProjectMaterialCost(projectId, apBills) {
  return apBills
    .filter(b => String(b.projectId) === String(projectId) && b.costType === "material" && b.status !== "deleted" && b.status !== "void")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
}

export function computeProjectSubCost(projectId, apBills) {
  return apBills
    .filter(b => String(b.projectId) === String(projectId) && b.costType === "subcontractor" && b.status !== "deleted" && b.status !== "void")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
}

export function computeProjectTotalCost(projectId, projectName, timeEntries, employees, apBills, burdenMultiplier = DEFAULT_BURDEN, accruals = [], period = null) {
  const labor = computeProjectLaborCost(projectId, projectName, timeEntries, employees, burdenMultiplier);
  const materialCost = computeProjectMaterialCost(projectId, apBills);
  const subCost = computeProjectSubCost(projectId, apBills);
  const otherAPCost = apBills
    .filter(b => String(b.projectId) === String(projectId) && b.costType !== "material" && b.costType !== "subcontractor" && b.status !== "deleted" && b.status !== "void")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalAPCost = materialCost + subCost + otherAPCost;

  // ── Accrual handling ──
  // Active accruals = posted accruals for this project (optionally filtered by period)
  // Reversals = accruals where autoReverse === true AND reversalPeriod === period
  //   These SUBTRACT from cost because they reverse a prior-period accrual INTO the current period
  const projectAccruals = accruals.filter(a => {
    if (a.status !== "posted") return false;
    if (String(a.projectId) !== String(projectId)) return false;
    return true;
  });

  let accrualLabor = 0;
  let accrualMaterial = 0;
  let accrualSub = 0;
  let accrualOther = 0;

  for (const a of projectAccruals) {
    // Determine if this accrual should be included
    let include = false;
    let sign = 1;

    if (period === null) {
      // All-time: include ALL posted accruals
      include = true;
    } else {
      // Period-scoped: include if posted to this period
      if (a.period === period) {
        include = true;
      }
      // Subtract reversals that land in this period (they offset a prior-period accrual)
      if (a.autoReverse === true && a.reversalPeriod === period) {
        include = true;
        sign = -1;
      }
    }

    if (!include) continue;

    const amt = (a.amount || 0) * sign;
    switch (a.costType) {
      case "labor":
        accrualLabor += amt;
        break;
      case "material":
        accrualMaterial += amt;
        break;
      case "subcontractor":
        accrualSub += amt;
        break;
      default:
        accrualOther += amt;
        break;
    }
  }

  const accrualTotal = accrualLabor + accrualMaterial + accrualSub + accrualOther;

  return {
    labor: labor.burdenedCost + accrualLabor,
    laborHours: labor.hours,
    laborRaw: labor.rawCost,
    material: materialCost + accrualMaterial,
    subcontractor: subCost + accrualSub,
    otherAP: otherAPCost + accrualOther,
    totalAP: totalAPCost,
    accruals: accrualTotal,
    total: labor.burdenedCost + totalAPCost + accrualTotal,
  };
}

// ── Period-Scoped Cost Computation (G10) ──

export function computeProjectCostForPeriod(projectId, projectName, period, timeEntries, employees, apBills, accruals = [], burdenMultiplier = DEFAULT_BURDEN) {
  // Filter time entries to only those clocked-in during this period
  const periodTimeEntries = timeEntries.filter(te => {
    if (te.status === "deleted") return false;
    if (te.isTM) return false;
    if (!te.clockIn) return false;
    const clockInPeriod = String(te.clockIn).slice(0, 7); // "YYYY-MM"
    return clockInPeriod === period;
  });

  // Filter AP bills to only those dated within this period
  const periodApBills = apBills.filter(b => {
    if (b.status === "deleted" || b.status === "void") return false;
    if (!b.date) return false;
    const billPeriod = String(b.date).slice(0, 7); // "YYYY-MM"
    return billPeriod === period;
  });

  return computeProjectTotalCost(
    projectId,
    projectName,
    periodTimeEntries,
    employees,
    periodApBills,
    burdenMultiplier,
    accruals,
    period
  );
}

// ── Labor Cost Computation ──

/**
 * Compute worked hours from a time entry.
 * Prefers stored `totalHours` (which already subtracts unpaid lunch for shifts >=6h);
 * falls back to raw (clockOut - clockIn) only when totalHours is absent.
 * Applies a 0.5h lunch deduction on fallback when shift >= 6h.
 */
export function computeWorkedHours(te) {
  if (!te) return 0;
  if (typeof te.totalHours === "number" && te.totalHours >= 0) return te.totalHours;
  if (typeof te.hours === "number" && te.hours >= 0) return te.hours;
  if (!te.clockIn || !te.clockOut) return 0;
  const raw = (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000;
  if (!isFinite(raw) || raw <= 0) return 0;
  return raw >= 6 ? Math.max(0, raw - 0.5) : raw;
}

export function computeProjectLaborCost(projectId, projectName, timeEntries, employees, burdenMultiplier = DEFAULT_BURDEN) {
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const employeeNameMap = new Map(employees.map(e => [e.name, e]));

  const projEntries = timeEntries.filter(te => {
    if (te.status === "deleted") return false;
    if (!te.clockIn || !te.clockOut) return false;
    if (te.isTM) return false;
    if (te.projectId && String(te.projectId) === String(projectId)) return true;
    if (te.projectName && te.projectName === projectName) return true;
    return false;
  });

  let totalHours = 0;
  let rawCost = 0;

  for (const te of projEntries) {
    const hours = computeWorkedHours(te);
    const emp = employeeMap.get(te.employeeId) || employeeNameMap.get(te.employeeName);
    const rate = emp?.hourlyRate || 0;
    totalHours += hours;
    rawCost += hours * rate;
  }

  return { hours: totalHours, rawCost, burdenedCost: rawCost * burdenMultiplier };
}

// ── Labor Cost Breakdown by Cost Code ──

export function computeProjectLaborByCode(projectId, projectName, timeEntries, employees, burdenMultiplier = DEFAULT_BURDEN) {
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const employeeNameMap = new Map(employees.map(e => [e.name, e]));

  const projEntries = timeEntries.filter(te => {
    if (te.status === "deleted") return false;
    if (!te.clockIn || !te.clockOut) return false;
    if (te.isTM) return false;
    if (te.projectId && String(te.projectId) === String(projectId)) return true;
    if (te.projectName && te.projectName === projectName) return true;
    return false;
  });

  const byCode = new Map();
  let totalHours = 0;
  let totalRaw = 0;

  for (const te of projEntries) {
    const hours = computeWorkedHours(te);
    const emp = employeeMap.get(te.employeeId) || employeeNameMap.get(te.employeeName);
    const rate = emp?.hourlyRate || 0;
    const cost = hours * rate;
    const code = te.costCode || "unassigned";

    totalHours += hours;
    totalRaw += cost;

    const existing = byCode.get(code) || { hours: 0, rawCost: 0, burdenedCost: 0 };
    existing.hours += hours;
    existing.rawCost += cost;
    existing.burdenedCost += cost * burdenMultiplier;
    byCode.set(code, existing);
  }

  return {
    byCode,
    total: { hours: totalHours, rawCost: totalRaw, burdenedCost: totalRaw * burdenMultiplier },
  };
}

// ── Accrual Validation ──

export function validateAccrual(accrual) {
  const errors = [];
  if (!accrual.projectId) errors.push("Project is required");
  if (!accrual.amount || accrual.amount <= 0) errors.push("Amount must be greater than $0");
  if (!accrual.period) errors.push("Period is required (YYYY-MM)");
  if (!accrual.accrualType) errors.push("Accrual type is required (labor_stub/sub_accrual/material_receipt)");
  if (!accrual.description) errors.push("Description is required");
  return errors;
}

// ── Commitment Validation ──

export function validateCommitment(commitment) {
  const errors = [];
  if (!commitment.projectId) errors.push("Project is required");
  if (!commitment.vendorId) errors.push("Vendor is required");
  if (!commitment.costType) errors.push("Cost type is required");
  if (!commitment.originalAmount || commitment.originalAmount <= 0) errors.push("Original amount must be greater than $0");
  if (!commitment.description) errors.push("Description is required");
  return errors;
}

// ── Committed Cost Aggregation ──

export function computeProjectCommittedCost(projectId, commitments) {
  return commitments
    .filter(c => String(c.projectId) === String(projectId) && c.status === "active")
    .reduce((sum, c) => sum + (c.remainingCommitment || 0), 0);
}

// ── Budget vs Actual ──

export function computeBudgetVsActual(projectId, projectName, budgets, timeEntries, employees, apBills, commitments, burdenMultiplier = DEFAULT_BURDEN) {
  const budgetLines = budgets[projectId] || [];
  if (budgetLines.length === 0) return [];

  // Pre-compute labor by cost code
  const laborByCode = computeProjectLaborByCode(projectId, projectName, timeEntries, employees, burdenMultiplier);

  return budgetLines.map(line => {
    const { phase, costType, budgetAmount } = line;
    let actual = 0;

    if (costType === "labor") {
      // Labor actual from time entries filtered by costCode matching phase
      const codeData = laborByCode.byCode.get(phase);
      actual = codeData ? codeData.burdenedCost : 0;
    } else {
      // Material / subcontractor / other from AP bills matching phase + costType
      actual = apBills
        .filter(b =>
          String(b.projectId) === String(projectId)
          && b.costType === costType
          && b.status !== "deleted"
          && b.status !== "void"
          && (b.phase === phase || b.costCode === phase)
        )
        .reduce((sum, b) => sum + (b.amount || 0), 0);
    }

    // Committed = remaining commitment from active commitments matching phase + costType
    const committed = commitments
      .filter(c =>
        String(c.projectId) === String(projectId)
        && c.phase === phase
        && c.costType === costType
        && c.status === "active"
      )
      .reduce((sum, c) => sum + (c.remainingCommitment || 0), 0);

    const projectedFinal = actual + committed;
    const variance = budgetAmount - projectedFinal;

    return {
      phase,
      costType,
      budget: budgetAmount,
      actual,
      committed,
      projectedFinal,
      variance,
      overBudget: projectedFinal > budgetAmount,
    };
  });
}

// ── Estimated Total Cost (G1) ──
// Used for % complete calculations: cost / totalEstimatedCost (NOT cost / adjustedContract)

export function computeProjectEstimatedTotalCost(projectId, budgets) {
  const lines = budgets?.[projectId] || [];
  return lines.reduce((sum, line) => sum + (line.budgetAmount || 0), 0);
}

// ── Accrual Period Helpers (G11) ──

// Returns accruals that are active (posted) in the given period
export function getActiveAccrualsForPeriod(projectId, period, accruals) {
  return accruals.filter(a => {
    if (a.status !== "posted") return false;
    if (String(a.projectId) !== String(projectId)) return false;
    return a.period === period;
  });
}

// Returns accruals that are reversing INTO the given period
// (prior-period accruals with autoReverse=true and reversalPeriod=this period)
export function getReversingAccrualsForPeriod(projectId, period, accruals) {
  return accruals.filter(a => {
    if (a.status !== "posted") return false;
    if (String(a.projectId) !== String(projectId)) return false;
    return a.autoReverse === true && a.reversalPeriod === period;
  });
}

// Sum accruals for a project (optionally scoped to a period)
// If period is null: sum all posted accruals for the project
// If period is given: posted accruals matching period MINUS accruals reversing INTO that period
export function sumProjectAccruals(projectId, accruals, period = null) {
  if (period === null) {
    return accruals
      .filter(a => a.status === "posted" && String(a.projectId) === String(projectId))
      .reduce((sum, a) => sum + (a.amount || 0), 0);
  }

  const posted = getActiveAccrualsForPeriod(projectId, period, accruals)
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const reversed = getReversingAccrualsForPeriod(projectId, period, accruals)
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  return posted - reversed;
}
