/**
 * QuickBooks Desktop IIF Export Utilities
 *
 * Generates IIF (Intuit Interchange Format) files that QB Desktop
 * can import via File > Utilities > Import > IIF Files.
 *
 * Two formats:
 * 1. TIMEACT — Time tracking entries for payroll
 * 2. TRNS/SPL/ENDTRNS — Invoices
 */

const TAB = "\t";

// ── QB Name Mappings ──
// These map EBC-OS names to exact QB Desktop names.
// Stored in localStorage so Anna can configure once.
const STORAGE_KEY = "ebc_qb_mappings";

export function getQBMappings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setQBMappings(mappings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

/**
 * Look up the QB name for an EBC-OS name.
 * Falls back to the original name if no mapping exists.
 */
function qbName(type, ebcName) {
  const mappings = getQBMappings();
  const map = mappings[type] || {};
  return map[ebcName] || ebcName;
}

// ── Time Tracking IIF (TIMEACT) ──

/**
 * Generate an IIF file string for time tracking entries.
 *
 * @param {Array} entries - Time entries with { employeeName, projectName, clockIn, clockOut, notes }
 * @param {Object} opts - { serviceItem: string, payrollItem: string }
 * @returns {string} IIF file content
 */
export function generateTimeIIF(entries, opts = {}) {
  const serviceItem = opts.serviceItem || "Drywall Labor";
  const payrollItem = opts.payrollItem || "Hourly Rate";

  const header = ["!TIMEACT", "DATE", "JOB", "EMP", "ITEM", "PITEM", "DURATION", "PROJ", "NOTE", "BILLINGSTATUS"].join(TAB);

  const rows = entries
    .filter((e) => e.clockIn && e.clockOut)
    .map((e) => {
      const clockIn = new Date(e.clockIn);
      const clockOut = new Date(e.clockOut);
      const diffMs = clockOut - clockIn;
      const totalHours = diffMs / 3600000;
      const h = Math.floor(totalHours);
      const m = Math.round((totalHours - h) * 60);
      const duration = `${h}:${String(m).padStart(2, "0")}`;

      const date = `${String(clockIn.getMonth() + 1).padStart(2, "0")}/${String(clockIn.getDate()).padStart(2, "0")}/${clockIn.getFullYear()}`;

      const empName = qbName("employees", e.employeeName);
      const jobName = qbName("jobs", e.projectName);
      const note = (e.notes || "").replace(/[\t\n\r]/g, " ").slice(0, 200);

      return [
        "TIMEACT",
        date,
        jobName,
        empName,
        serviceItem,
        payrollItem,
        duration,
        "", // PROJ (unused)
        note,
        "1", // Billable
      ].join(TAB);
    });

  return [header, ...rows].join("\r\n") + "\r\n";
}

// ── Invoice IIF (TRNS/SPL/ENDTRNS) ──

/**
 * Generate an IIF file string for invoices.
 *
 * @param {Array} invoices - Invoices with { number, date, customerName, amount, lineItems, terms, memo }
 *   lineItems: [{ description, amount, item }]
 * @returns {string} IIF file content
 */
export function generateInvoiceIIF(invoices, opts = {}) {
  const arAccount = opts.arAccount || "Accounts Receivable";
  const incomeAccount = opts.incomeAccount || "Construction Income";

  const trnsHeader = ["!TRNS", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO", "TERMS", "DUEDATE"].join(TAB);
  const splHeader = ["!SPL", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "INVITEM", "QNTY", "PRICE", "MEMO", "EXTRA"].join(TAB);
  const endHeader = "!ENDTRNS";

  const blocks = invoices.map((inv) => {
    const date = inv.date; // Expected MM/DD/YYYY
    const customerName = qbName("customers", inv.customerName);
    const terms = inv.terms || "Net 30";

    // Calculate due date from terms
    let dueDate = "";
    const daysMatch = terms.match(/(\d+)/);
    if (daysMatch && inv.date) {
      const d = new Date(inv.date);
      d.setDate(d.getDate() + parseInt(daysMatch[1]));
      dueDate = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
    }

    const memo = (inv.memo || "").replace(/[\t\n\r]/g, " ");

    // TRNS row (AR side, positive total)
    const trnsRow = [
      "TRNS", "INVOICE", date, arAccount, customerName,
      inv.amount.toFixed(2), inv.number, memo, terms, dueDate
    ].join(TAB);

    // SPL rows (income side, negative amounts)
    const lineItems = inv.lineItems && inv.lineItems.length > 0
      ? inv.lineItems
      : [{ description: "Drywall Scope", amount: inv.amount, item: "Drywall Labor" }];

    const splRows = lineItems.map((li) => {
      const itemName = qbName("items", li.item || "Drywall Labor");
      return [
        "SPL", "INVOICE", date, incomeAccount, customerName,
        (-li.amount).toFixed(2), itemName, "1", (-li.amount).toFixed(2),
        (li.description || "").replace(/[\t\n\r]/g, " "),
        "AUTOSTAX"
      ].join(TAB);
    });

    return [trnsRow, ...splRows, "ENDTRNS"].join("\r\n");
  });

  return [trnsHeader, splHeader, endHeader, ...blocks].join("\r\n") + "\r\n";
}

// ── Download Helper ──

export function downloadIIF(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Validation ──

/**
 * Check for potential issues before export.
 * Returns array of warning strings.
 */
export function validateTimeEntries(entries) {
  const warnings = [];
  const mappings = getQBMappings();
  const empMap = mappings.employees || {};
  const jobMap = mappings.jobs || {};

  const unmappedEmps = new Set();
  const unmappedJobs = new Set();
  let openEntries = 0;

  entries.forEach((e) => {
    if (!e.clockOut) {
      openEntries++;
      return;
    }
    if (!empMap[e.employeeName]) unmappedEmps.add(e.employeeName);
    if (!jobMap[e.projectName]) unmappedJobs.add(e.projectName);
  });

  if (openEntries > 0) {
    warnings.push(`${openEntries} open entries (no clock-out) will be skipped`);
  }
  if (unmappedEmps.size > 0) {
    warnings.push(`${unmappedEmps.size} employee name(s) not mapped to QB: ${[...unmappedEmps].join(", ")}`);
  }
  if (unmappedJobs.size > 0) {
    warnings.push(`${unmappedJobs.size} project name(s) not mapped to QB: ${[...unmappedJobs].join(", ")}`);
  }

  return warnings;
}
