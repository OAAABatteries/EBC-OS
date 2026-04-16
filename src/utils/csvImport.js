// ═══════════════════════════════════════════════════════════════
//  EBC-OS · CSV Import Utility
//  Parses CSV into rows, detects columns, maps to data-type schemas,
//  validates rows, and prepares them for commit with audit trails.
//  No external dependencies — pure local parsing.
// ═══════════════════════════════════════════════════════════════

/**
 * Parse a CSV string into a 2D array of strings.
 * Handles: quoted fields with commas, escaped quotes (""), CR/LF, UTF-8 BOM.
 * Returns: { headers: string[], rows: string[][] }
 */
export function parseCSV(text) {
  if (!text || typeof text !== "string") return { headers: [], rows: [] };
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 0 && !(row.length === 1 && row[0] === "")) rows.push(row);
        row = [];
      } else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
  }
  if (rows.length === 0) return { headers: [], rows: [] };
  return { headers: rows[0].map(h => (h || "").trim()), rows: rows.slice(1) };
}

/**
 * Normalize a header for fuzzy matching (lowercase, alphanumeric only).
 */
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Import schemas — describe each data type's fields, aliases, validators, and deduplication keys.
 * Each field: { key, label, required?, type?, aliases? (array of alternative header names) }
 */
export const IMPORT_SCHEMAS = {
  projects: {
    label: "Projects",
    idField: "name",
    dedupe: (row, existing) => existing.find(p => !p.deletedAt && norm(p.name) === norm(row.name)),
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["project", "projectname", "jobname", "job"] },
      { key: "gc", label: "GC", aliases: ["generalcontractor", "contractor", "client"] },
      { key: "contract", label: "Contract Amount", type: "number", aliases: ["amount", "contractvalue", "value", "price"] },
      { key: "phase", label: "Phase", aliases: ["stage", "currentphase"] },
      { key: "status", label: "Status", aliases: ["state"], default: "in-progress" },
      { key: "start", label: "Start Date", type: "date", aliases: ["startdate", "began", "starting"] },
      { key: "end", label: "End Date", type: "date", aliases: ["enddate", "completion", "finish"] },
      { key: "pm", label: "PM", aliases: ["projectmanager", "manager"] },
      { key: "address", label: "Address", aliases: ["location", "site", "jobsite"] },
      { key: "scope", label: "Scope", aliases: ["scopeofwork", "sow"] },
    ],
    validate: (row) => {
      const errs = [];
      if (!row.name) errs.push("Name is required");
      if (row.contract && isNaN(Number(row.contract))) errs.push("Contract must be a number");
      return errs;
    },
  },
  contacts: {
    label: "Contacts",
    idField: "name",
    dedupe: (row, existing) => existing.find(c => !c.deletedAt && norm(c.email) && norm(c.email) === norm(row.email)) || existing.find(c => !c.deletedAt && norm(c.name) === norm(row.name) && norm(c.company) === norm(row.company)),
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["fullname", "contactname"] },
      { key: "company", label: "Company", aliases: ["organization", "org", "employer"] },
      { key: "role", label: "Role", aliases: ["title", "position", "jobtitle"] },
      { key: "email", label: "Email", aliases: ["emailaddress", "e-mail"] },
      { key: "phone", label: "Phone", aliases: ["phonenumber", "cell", "mobile", "telephone"] },
      { key: "category", label: "Category", aliases: ["type", "group"] },
      { key: "notes", label: "Notes", aliases: ["comments", "remarks"] },
    ],
    validate: (row) => {
      const errs = [];
      if (!row.name) errs.push("Name is required");
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errs.push("Invalid email format");
      return errs;
    },
  },
  employees: {
    label: "Employees",
    idField: "name",
    dedupe: (row, existing) => existing.find(e => !e.deletedAt && norm(e.email) && norm(e.email) === norm(row.email)) || existing.find(e => !e.deletedAt && norm(e.name) === norm(row.name)),
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["fullname", "employee"] },
      { key: "role", label: "Role", aliases: ["position", "title"], default: "employee" },
      { key: "email", label: "Email", aliases: ["emailaddress"] },
      { key: "phone", label: "Phone", aliases: ["cell", "mobile"] },
      { key: "hourlyRate", label: "Hourly Rate", type: "number", aliases: ["rate", "payrate", "wage"] },
      { key: "status", label: "Status", aliases: ["employmentstatus"], default: "active" },
      { key: "startDate", label: "Hire Date", type: "date", aliases: ["hired", "started", "hiredate"] },
      { key: "trade", label: "Trade", aliases: ["skill", "specialty"] },
    ],
    validate: (row) => {
      const errs = [];
      if (!row.name) errs.push("Name is required");
      if (row.hourlyRate && isNaN(Number(row.hourlyRate))) errs.push("Hourly rate must be a number");
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errs.push("Invalid email format");
      return errs;
    },
  },
  invoices: {
    label: "Invoices",
    idField: "number",
    dedupe: (row, existing, context) => {
      const projectId = resolveProjectId(row, context);
      return existing.find(i => !i.deletedAt && String(i.number) === String(row.number) && String(i.projectId) === String(projectId));
    },
    fields: [
      { key: "number", label: "Invoice #", required: true, aliases: ["invoicenumber", "invno", "inv"] },
      { key: "projectName", label: "Project Name", required: true, aliases: ["project", "job", "jobname"] },
      { key: "date", label: "Date", type: "date", required: true, aliases: ["invoicedate", "billdate"] },
      { key: "amount", label: "Amount", type: "number", required: true, aliases: ["total", "invoiceamount"] },
      { key: "status", label: "Status", aliases: ["paymentstatus"], default: "pending" },
      { key: "desc", label: "Description", aliases: ["description", "memo"] },
      { key: "paidDate", label: "Paid Date", type: "date", aliases: ["datepaid"] },
      { key: "retainageRate", label: "Retainage %", type: "number", aliases: ["retainage"] },
    ],
    validate: (row) => {
      const errs = [];
      if (!row.number) errs.push("Invoice number required");
      if (!row.projectName) errs.push("Project name required");
      if (!row.amount || isNaN(Number(row.amount))) errs.push("Valid amount required");
      if (!row.date) errs.push("Date required");
      return errs;
    },
  },
  changeOrders: {
    label: "Change Orders",
    idField: "number",
    dedupe: (row, existing, context) => {
      const projectId = resolveProjectId(row, context);
      return existing.find(c => !c.deletedAt && String(c.number) === String(row.number) && String(c.projectId) === String(projectId));
    },
    fields: [
      { key: "number", label: "CO #", required: true, aliases: ["conumber", "cono"] },
      { key: "projectName", label: "Project Name", required: true, aliases: ["project", "job"] },
      { key: "desc", label: "Description", required: true, aliases: ["description", "scope"] },
      { key: "amount", label: "Amount", type: "number", required: true, aliases: ["value", "cost"] },
      // Labor / Material split — optional. If only one is provided, the other is inferred
      // at save time. Both blank → treated as 100% labor (EBC's safe legacy default).
      { key: "laborAmount", label: "Labor $", type: "number", aliases: ["labor", "laborcost", "laborvalue"] },
      { key: "materialAmount", label: "Material $", type: "number", aliases: ["material", "materialcost", "materials"] },
      { key: "status", label: "Status", aliases: ["state"], default: "pending" },
      { key: "type", label: "Type", aliases: ["cotype"], default: "add" },
      { key: "date", label: "Date", type: "date", aliases: ["codate"] },
      { key: "submitted", label: "Submitted", type: "date", aliases: ["datesubmitted"] },
      { key: "approved", label: "Approved", type: "date", aliases: ["dateapproved"] },
    ],
    validate: (row) => {
      const errs = [];
      if (!row.number) errs.push("CO number required");
      if (!row.projectName) errs.push("Project name required");
      if (!row.desc) errs.push("Description required");
      if (row.amount === "" || row.amount === undefined || isNaN(Number(row.amount))) errs.push("Valid amount required");
      // If either labor/material is provided, both must sum to Amount (±$0.50). Blank-on-both = 100% labor.
      const hasSplit = (row.laborAmount !== "" && row.laborAmount !== undefined) || (row.materialAmount !== "" && row.materialAmount !== undefined);
      if (hasSplit) {
        const l = Number(row.laborAmount || 0);
        const m = Number(row.materialAmount || 0);
        const total = Number(row.amount || 0);
        if (!isFinite(l) || !isFinite(m)) errs.push("Labor/Material must be numbers");
        else if (Math.abs(total - l - m) > 0.5) errs.push(`Labor + Material (${l + m}) must equal Amount (${total})`);
      }
      return errs;
    },
  },
  bids: {
    label: "Bids",
    idField: "name",
    dedupe: (row, existing) => existing.find(b => !b.deletedAt && norm(b.name) === norm(row.name) && norm(b.gc) === norm(row.gc)),
    fields: [
      { key: "name", label: "Bid Name", required: true, aliases: ["project", "projectname", "job"] },
      { key: "gc", label: "GC", aliases: ["generalcontractor", "contractor"] },
      { key: "value", label: "Bid Value", type: "number", aliases: ["amount", "total"] },
      { key: "status", label: "Status", default: "estimating", aliases: ["state"] },
      { key: "due", label: "Due Date", type: "date", aliases: ["duedate", "deadline"] },
      { key: "received", label: "Received Date", type: "date", aliases: ["datereceived"] },
      { key: "address", label: "Address", aliases: ["location", "site"] },
      { key: "scope", label: "Scope", aliases: ["scopeofwork", "sow"] },
      { key: "notes", label: "Notes", aliases: ["comments"] },
    ],
    validate: (row) => {
      const errs = [];
      if (!row.name) errs.push("Bid name required");
      if (row.value && isNaN(Number(row.value))) errs.push("Value must be a number");
      return errs;
    },
  },
};

// Helper: resolve project name → projectId using context (full list of projects)
function resolveProjectId(row, context) {
  if (!row.projectName || !context?.projects) return null;
  const match = context.projects.find(p => !p.deletedAt && norm(p.name) === norm(row.projectName));
  return match?.id || null;
}

/**
 * Auto-detect column mapping: for each field in the schema, find the best-matching CSV header.
 * Returns an object: { schemaFieldKey: csvHeaderIndex | -1 }
 */
export function autoDetectMapping(schema, headers) {
  const mapping = {};
  const normHeaders = headers.map(norm);
  for (const field of schema.fields) {
    const candidates = [field.key, field.label, ...(field.aliases || [])].map(norm);
    let idx = -1;
    for (const candidate of candidates) {
      idx = normHeaders.findIndex(h => h === candidate);
      if (idx >= 0) break;
    }
    // Fallback: partial match
    if (idx < 0) {
      for (const candidate of candidates) {
        idx = normHeaders.findIndex(h => h.includes(candidate) || candidate.includes(h));
        if (idx >= 0) break;
      }
    }
    mapping[field.key] = idx;
  }
  return mapping;
}

/**
 * Apply mapping + parse row values into typed field object.
 */
export function applyMapping(schema, mapping, csvRow) {
  const out = {};
  for (const field of schema.fields) {
    const idx = mapping[field.key];
    let raw = idx >= 0 ? (csvRow[idx] || "") : "";
    raw = String(raw).trim();
    if (!raw && field.default !== undefined) {
      out[field.key] = field.default;
      continue;
    }
    if (!raw) continue;
    if (field.type === "number") {
      const n = Number(String(raw).replace(/[$,\s]/g, ""));
      out[field.key] = isNaN(n) ? raw : n;
    } else if (field.type === "date") {
      // Try common formats. Accept YYYY-MM-DD, M/D/YYYY, MM/DD/YYYY.
      const d = new Date(raw);
      if (!isNaN(d)) out[field.key] = d.toISOString().slice(0, 10);
      else out[field.key] = raw;
    } else {
      out[field.key] = raw;
    }
  }
  return out;
}

/**
 * Build a preview with validation + dedupe status for each mapped row.
 * Returns array of { raw, mapped, status: "new" | "match" | "error", errors, existing? }
 */
export function buildPreview(schema, mapping, csvRows, existing, context) {
  return csvRows.map((csvRow, i) => {
    const mapped = applyMapping(schema, mapping, csvRow);
    // Apply validation
    const errors = schema.validate ? schema.validate(mapped) : [];
    // Check dedupe
    const matchedExisting = errors.length === 0 ? schema.dedupe(mapped, existing, context) : null;
    return {
      index: i,
      raw: csvRow,
      mapped,
      errors,
      status: errors.length > 0 ? "error" : matchedExisting ? "match" : "new",
      existing: matchedExisting,
    };
  });
}

/**
 * Prepare records for commit. Returns { toInsert, toUpdate, skipped }.
 * - toInsert: new records (generate IDs)
 * - toUpdate: existing records (merge)
 * - skipped: error rows
 */
export function prepareCommit(preview, context, auth) {
  const toInsert = [];
  const toUpdate = [];
  const skipped = [];
  const now = new Date().toISOString();
  const who = auth?.name || "Unknown";
  for (const row of preview) {
    if (row.status === "error") { skipped.push(row); continue; }
    // Resolve project name → projectId if schema has it
    let record = { ...row.mapped };
    if ("projectName" in record && context?.projects) {
      const proj = context.projects.find(p => !p.deletedAt && norm(p.name) === norm(record.projectName));
      if (proj) record.projectId = proj.id;
      delete record.projectName;
    }
    if (row.status === "match") {
      const existing = row.existing;
      const merged = { ...existing, ...record };
      merged.audit = [...(existing.audit || []), { timestamp: now, userName: who, field: "bulk-import-update", oldValue: null, newValue: "csv-import" }];
      toUpdate.push(merged);
    } else {
      // new record
      record.id = crypto.randomUUID();
      record.createdAt = now;
      record.createdBy = who;
      record.audit = [{ timestamp: now, userName: who, field: "bulk-import-create", oldValue: null, newValue: "csv-import" }];
      toInsert.push(record);
    }
  }
  return { toInsert, toUpdate, skipped };
}
