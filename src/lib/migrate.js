// ═══════════════════════════════════════════════════════════════
//  EBC-OS · localStorage → Supabase Migration Helper
//  Eagles Brothers Constructors · Houston, TX
//
//  Usage: call migrateToSupabase() after the user connects their
//  Supabase project. This reads all localStorage data and pushes
//  it into the Supabase tables.
// ═══════════════════════════════════════════════════════════════

import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Read a localStorage key used by the app (all prefixed with "ebc_").
 */
function readLocal(key) {
  try {
    const raw = localStorage.getItem("ebc_" + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Map localStorage keys → Supabase table names and optional transforms.
 */
const TABLE_MAP = [
  { localKey: "bids",          table: "bids" },
  { localKey: "projects",      table: "projects" },
  { localKey: "contacts",      table: "contacts",   transform: transformContact },
  { localKey: "callLog",       table: "call_log",   transform: transformCallLog },
  { localKey: "invoices",      table: "invoices" },
  { localKey: "changeOrders",  table: "change_orders" },
  { localKey: "rfis",          table: "rfis" },
  { localKey: "submittals",    table: "submittals" },
  { localKey: "schedule",      table: "schedule_tasks" },
  { localKey: "dailyReports",  table: "daily_reports" },
  { localKey: "takeoffs",      table: "takeoffs" },
  { localKey: "tmTickets",     table: "tm_tickets" },
  { localKey: "jsas",          table: "jsas" },
  { localKey: "equipment",     table: "equipment" },
];

// ── Field transforms ─────────────────────────────────────────

function transformContact(c) {
  return {
    name: c.name || "",
    company_name: c.company || "",
    role: c.role || "",
    phone: c.phone || "",
    email: c.email || "",
    priority: c.priority || "med",
    notes: c.notes || "",
    bids_count: c.bidsCount || c.bids_count || 0,
    wins_count: c.winsCount || c.wins_count || 0,
    color: c.color || "",
  };
}

function transformCallLog(entry) {
  return {
    note: entry.note || "",
    next_step: entry.nextStep || entry.next_step || "",
    time: entry.time || new Date().toISOString(),
  };
}

/**
 * Generic snake_case transform for flat objects.
 * Converts camelCase keys to snake_case and drops non-schema fields.
 */
function toSnake(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal/numeric IDs that will be replaced by UUIDs
    if (key === "id" && typeof value === "number") continue;
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

// ═════════════════════════════════════════════════════════════
//  MAIN MIGRATION FUNCTION
// ═════════════════════════════════════════════════════════════

/**
 * Migrate all localStorage data into Supabase.
 * @param {string} companyId - The company UUID to associate data with.
 * @param {object} [options]
 * @param {function} [options.onProgress] - Called with { table, count, done }
 * @param {boolean} [options.dryRun] - If true, returns the data without writing
 * @returns {object} { success: boolean, results: [...], errors: [...] }
 */
export async function migrateToSupabase(companyId, options = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { onProgress, dryRun = false } = options;
  const results = [];
  const errors = [];

  for (const { localKey, table, transform } of TABLE_MAP) {
    const raw = readLocal(localKey);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      results.push({ table, count: 0, skipped: true });
      continue;
    }

    const rows = raw.map((item) => {
      const base = transform ? transform(item) : toSnake(item);
      return { ...base, company_id: companyId };
    });

    if (dryRun) {
      results.push({ table, count: rows.length, data: rows });
      if (onProgress) onProgress({ table, count: rows.length, done: false });
      continue;
    }

    try {
      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) {
        errors.push({ table, error: error.message });
      } else {
        results.push({ table, count: data.length });
      }
    } catch (err) {
      errors.push({ table, error: err.message });
    }

    if (onProgress) onProgress({ table, count: rows.length, done: true });
  }

  // ── Migrate company settings ────────────────────────────
  const companySettings = readLocal("companyDefaults") || readLocal("company");
  if (companySettings && !dryRun) {
    try {
      await supabase.from("company").upsert({
        id: companyId,
        name: companySettings.name || companySettings.companyName || "",
        address: companySettings.address || "",
        phone: companySettings.phone || "",
        email: companySettings.email || "",
        license: companySettings.license || "",
        tax_rate: companySettings.taxRate || companySettings.tax_rate || 8.25,
        waste_pct: companySettings.wastePct || companySettings.waste_pct || 5.0,
        overhead_pct: companySettings.overheadPct || companySettings.overhead_pct || 10.0,
        profit_pct: companySettings.profitPct || companySettings.profit_pct || 10.0,
      });
      results.push({ table: "company", count: 1 });
    } catch (err) {
      errors.push({ table: "company", error: err.message });
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}

/**
 * Export all localStorage data as a JSON object (for backup/inspection).
 */
export function exportLocalStorageData() {
  const data = {};
  for (const { localKey, table } of TABLE_MAP) {
    const raw = readLocal(localKey);
    if (raw && Array.isArray(raw) && raw.length > 0) {
      data[table] = raw;
    }
  }
  // Include company settings
  const company = readLocal("companyDefaults") || readLocal("company");
  if (company) data.company = company;

  // Include users/accounts
  const users = readLocal("users");
  if (users) data.users = users;

  return data;
}

/**
 * Download the export as a JSON file in the browser.
 */
export function downloadExportAsJson() {
  const data = exportLocalStorageData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ebc-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
