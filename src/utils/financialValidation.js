/**
 * Financial Validation & Control Utilities
 *
 * Shared by all financial record types (invoices, COs, AP bills, etc.)
 * Provides: validation, audit-diff, soft-delete, duplicate detection, labor cost computation.
 */

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
    .filter(b => String(b.projectId) === String(projectId) && b.costType === "material" && b.status !== "deleted")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
}

export function computeProjectSubCost(projectId, apBills) {
  return apBills
    .filter(b => String(b.projectId) === String(projectId) && b.costType === "subcontractor" && b.status !== "deleted")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
}

export function computeProjectTotalCost(projectId, projectName, timeEntries, employees, apBills, burdenMultiplier = 1.0) {
  const labor = computeProjectLaborCost(projectId, projectName, timeEntries, employees, burdenMultiplier);
  const materialCost = computeProjectMaterialCost(projectId, apBills);
  const subCost = computeProjectSubCost(projectId, apBills);
  const otherAPCost = apBills
    .filter(b => String(b.projectId) === String(projectId) && b.costType !== "material" && b.costType !== "subcontractor" && b.status !== "deleted")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalAPCost = materialCost + subCost + otherAPCost;
  return {
    labor: labor.burdenedCost,
    laborHours: labor.hours,
    laborRaw: labor.rawCost,
    material: materialCost,
    subcontractor: subCost,
    otherAP: otherAPCost,
    totalAP: totalAPCost,
    total: labor.burdenedCost + totalAPCost,
  };
}

// ── Labor Cost Computation ──

export function computeProjectLaborCost(projectId, projectName, timeEntries, employees, burdenMultiplier = 1.0) {
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
    const hours = (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000;
    const emp = employeeMap.get(te.employeeId) || employeeNameMap.get(te.employeeName);
    const rate = emp?.hourlyRate || 0;
    totalHours += hours;
    rawCost += hours * rate;
  }

  return { hours: totalHours, rawCost, burdenedCost: rawCost * burdenMultiplier };
}

// ── Labor Cost Breakdown by Cost Code ──

export function computeProjectLaborByCode(projectId, projectName, timeEntries, employees, burdenMultiplier = 1.0) {
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
    const hours = (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000;
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

export function computeBudgetVsActual(projectId, projectName, budgets, timeEntries, employees, apBills, commitments, burdenMultiplier = 1.0) {
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
