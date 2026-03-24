// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Supabase Client & Helpers
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

// ── Configuration ───────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Returns true when Supabase env vars are configured.
 * The app falls back to localStorage when this is false.
 */
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Supabase client singleton — only created when configured.
 */
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ═════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ═════════════════════════════════════════════════════════════

export async function signUp(email, password, metadata = {}) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function resetPassword(email) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

// ═════════════════════════════════════════════════════════════
//  CASE CONVERSION (camelCase ↔ snake_case)
//  App uses camelCase, Postgres uses snake_case
// ═════════════════════════════════════════════════════════════

function toSnake(str) {
  return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function keysToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toSnake(k), v])
    );
  }
  return obj;
}

function keysToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), v])
    );
  }
  return obj;
}

// ═════════════════════════════════════════════════════════════
//  GENERIC DATABASE CRUD
// ═════════════════════════════════════════════════════════════

async function _getAll(table, options = {}) {
  if (!supabase) return [];
  let query = supabase.from(table).select(options.select || "*");
  if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  if (options.filters) {
    for (const [col, val] of Object.entries(options.filters)) {
      query = query.eq(col, val);
    }
  }
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return keysToCamel(data || []);
}

async function _getById(table, id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error) throw error;
  return keysToCamel(data);
}

async function _upsert(table, row) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from(table).upsert(keysToSnake(row)).select().single();
  if (error) throw error;
  return keysToCamel(data);
}

async function _insert(table, row) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from(table).insert(keysToSnake(row)).select().single();
  if (error) throw error;
  return keysToCamel(data);
}

async function _update(table, id, updates) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from(table).update(keysToSnake(updates)).eq("id", id).select().single();
  if (error) throw error;
  return keysToCamel(data);
}

async function _remove(table, id) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// ── Bids ────────────────────────────────────────────────────
export const getBids = (opts) => _getAll("bids", { orderBy: "created_at", ascending: false, ...opts });
export const getBidById = (id) => _getById("bids", id);
export const saveBid = (bid) => _upsert("bids", bid);
export const insertBid = (bid) => _insert("bids", bid);
export const updateBid = (id, updates) => _update("bids", id, updates);
export const deleteBid = (id) => _remove("bids", id);

// ── Bid Attachments ─────────────────────────────────────────
export const getBidAttachments = (bidId) => _getAll("bid_attachments", { filters: { bid_id: bidId } });
export const saveBidAttachment = (att) => _insert("bid_attachments", att);
export const deleteBidAttachment = (id) => _remove("bid_attachments", id);

// ── Projects ────────────────────────────────────────────────
export const getProjects = (opts) => _getAll("projects", { orderBy: "created_at", ascending: false, ...opts });
export const getProjectById = (id) => _getById("projects", id);
export const saveProject = (project) => _upsert("projects", project);
export const insertProject = (project) => _insert("projects", project);
export const updateProject = (id, updates) => _update("projects", id, updates);
export const deleteProject = (id) => _remove("projects", id);

// ── Contacts ────────────────────────────────────────────────
export const getContacts = (opts) => _getAll("contacts", { orderBy: "name", ...opts });
export const getContactById = (id) => _getById("contacts", id);
export const saveContact = (c) => _upsert("contacts", c);
export const deleteContact = (id) => _remove("contacts", id);

// ── Call Log ────────────────────────────────────────────────
export const getCallLog = (opts) => _getAll("call_log", { orderBy: "time", ascending: false, ...opts });
export const saveCallLogEntry = (entry) => _insert("call_log", entry);
export const deleteCallLogEntry = (id) => _remove("call_log", id);

// ── Takeoffs ────────────────────────────────────────────────
export const getTakeoffs = (opts) => _getAll("takeoffs", { orderBy: "created_at", ascending: false, ...opts });
export const getTakeoffById = (id) => _getById("takeoffs", id);
export const saveTakeoff = (t) => _upsert("takeoffs", t);
export const deleteTakeoff = (id) => _remove("takeoffs", id);

export const getTakeoffRooms = (takeoffId) => _getAll("takeoff_rooms", { filters: { takeoff_id: takeoffId }, orderBy: "sort_order" });
export const saveTakeoffRoom = (r) => _upsert("takeoff_rooms", r);
export const deleteTakeoffRoom = (id) => _remove("takeoff_rooms", id);

export const getTakeoffItems = (roomId) => _getAll("takeoff_items", { filters: { room_id: roomId } });
export const saveTakeoffItem = (i) => _upsert("takeoff_items", i);
export const deleteTakeoffItem = (id) => _remove("takeoff_items", id);

// ── Invoices ────────────────────────────────────────────────
export const getInvoices = (opts) => _getAll("invoices", { orderBy: "date", ascending: false, ...opts });
export const saveInvoice = (inv) => _upsert("invoices", inv);
export const deleteInvoice = (id) => _remove("invoices", id);

// ── Change Orders ───────────────────────────────────────────
export const getChangeOrders = (opts) => _getAll("change_orders", { orderBy: "date", ascending: false, ...opts });
export const saveChangeOrder = (co) => _upsert("change_orders", co);
export const deleteChangeOrder = (id) => _remove("change_orders", id);

// ── T&M Tickets ─────────────────────────────────────────────
export const getTmTickets = (opts) => _getAll("tm_tickets", { orderBy: "date", ascending: false, ...opts });
export const saveTmTicket = (t) => _upsert("tm_tickets", t);
export const deleteTmTicket = (id) => _remove("tm_tickets", id);

// ── RFIs ────────────────────────────────────────────────────
export const getRfis = (opts) => _getAll("rfis", { orderBy: "date_sent", ascending: false, ...opts });
export const saveRfi = (r) => _upsert("rfis", r);
export const deleteRfi = (id) => _remove("rfis", id);

// ── Submittals ──────────────────────────────────────────────
export const getSubmittals = (opts) => _getAll("submittals", { orderBy: "submitted_date", ascending: false, ...opts });
export const saveSubmittal = (s) => _upsert("submittals", s);
export const deleteSubmittal = (id) => _remove("submittals", id);

// ── Schedule Tasks ──────────────────────────────────────────
export const getScheduleTasks = (opts) => _getAll("schedule_tasks", { orderBy: "start_date", ...opts });
export const saveScheduleTask = (t) => _upsert("schedule_tasks", t);
export const deleteScheduleTask = (id) => _remove("schedule_tasks", id);

// ── Daily Reports ───────────────────────────────────────────
export const getDailyReports = (opts) => _getAll("daily_reports", { orderBy: "date", ascending: false, ...opts });
export const saveDailyReport = (r) => _upsert("daily_reports", r);
export const deleteDailyReport = (id) => _remove("daily_reports", id);

// ── JSAs ────────────────────────────────────────────────────
export const getJsas = (opts) => _getAll("jsas", { orderBy: "date", ascending: false, ...opts });
export const saveJsa = (j) => _upsert("jsas", j);
export const deleteJsa = (id) => _remove("jsas", id);

// ── Equipment ───────────────────────────────────────────────
export const getEquipment = (opts) => _getAll("equipment", { orderBy: "name", ...opts });
export const saveEquipment = (e) => _upsert("equipment", e);
export const deleteEquipment = (id) => _remove("equipment", id);

// ── Assemblies ──────────────────────────────────────────────
export const getAssemblies = (opts) => _getAll("assemblies", { orderBy: "code", ...opts });
export const saveAssembly = (a) => _upsert("assemblies", a);
export const deleteAssembly = (id) => _remove("assemblies", id);

// ── Company ─────────────────────────────────────────────────
export const getCompany = () => _getAll("company", { limit: 1 }).then(rows => rows[0] || null);
export const saveCompany = (c) => _upsert("company", c);

// ── Users (profiles) ────────────────────────────────────────
export const getUsers = (opts) => _getAll("users", { orderBy: "name", ...opts });
export const getUserById = (id) => _getById("users", id);
export const saveUser = (u) => _upsert("users", u);

// ── Margin Tiers ────────────────────────────────────────────
export const getMarginTiers = () => _getAll("margin_tiers", { limit: 1 }).then(rows => rows[0] || null);
export const saveMarginTiers = (t) => _upsert("margin_tiers", t);

// ── Scope Items ─────────────────────────────────────────────
export const getScopeItems = (opts) => _getAll("scope_items", { orderBy: "category", ...opts });
export const saveScopeItem = (s) => _upsert("scope_items", s);
export const deleteScopeItem = (id) => _remove("scope_items", id);

// ── Time Entries ────────────────────────────────────────────
export const getTimeEntries = (opts) => _getAll("time_entries", { orderBy: "clock_in", ascending: false, ...opts });
export const saveTimeEntry = (t) => _upsert("time_entries", t);
export const deleteTimeEntry = (id) => _remove("time_entries", id);

// ── Material Requests ───────────────────────────────────────
export const getMaterialRequests = (opts) => _getAll("material_requests", { orderBy: "created_at", ascending: false, ...opts });
export const saveMaterialRequest = (m) => _upsert("material_requests", m);
export const deleteMaterialRequest = (id) => _remove("material_requests", id);

// ── Company Locations ───────────────────────────────────────
export const getCompanyLocations = (opts) => _getAll("company_locations", { orderBy: "name", ...opts });
export const saveCompanyLocation = (l) => _upsert("company_locations", l);
export const deleteCompanyLocation = (id) => _remove("company_locations", id);

// ── Incidents ───────────────────────────────────────────────
export const getIncidents = (opts) => _getAll("incidents", { orderBy: "created_at", ascending: false, ...opts });
export const saveIncident = (i) => _upsert("incidents", i);
export const deleteIncident = (id) => _remove("incidents", id);

// ── Toolbox Talks ───────────────────────────────────────────
export const getToolboxTalks = (opts) => _getAll("toolbox_talks", { orderBy: "created_at", ascending: false, ...opts });
export const saveToolboxTalk = (t) => _upsert("toolbox_talks", t);
export const deleteToolboxTalk = (id) => _remove("toolbox_talks", id);

// ── Crew Schedule ───────────────────────────────────────────
export const getTeamSchedule = (opts) => _getAll("crew_schedule", { orderBy: "week_start", ...opts });
export const saveTeamScheduleEntry = (c) => _upsert("crew_schedule", c);
export const deleteTeamScheduleEntry = (id) => _remove("crew_schedule", id);

// ═════════════════════════════════════════════════════════════
//  FILE STORAGE
// ═════════════════════════════════════════════════════════════

const DEFAULT_BUCKET = "ebc-files";

export async function uploadFile(path, file, bucket = DEFAULT_BUCKET) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;
  return data;
}

export async function downloadFile(path, bucket = DEFAULT_BUCKET) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

export function getFileUrl(path, bucket = DEFAULT_BUCKET) {
  if (!supabase) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function deleteFile(path, bucket = DEFAULT_BUCKET) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function listFiles(folder = "", bucket = DEFAULT_BUCKET) {
  if (!supabase) return [];
  const { data, error } = await supabase.storage.from(bucket).list(folder);
  if (error) throw error;
  return data || [];
}

// ═════════════════════════════════════════════════════════════
//  TAKEOFF PDF STORAGE (cloud persistence for drawing PDFs)
// ═════════════════════════════════════════════════════════════

const PDF_BUCKET = "ebc-files";
const PDF_PREFIX = "takeoff-pdfs";

/**
 * Upload a takeoff PDF to Supabase Storage.
 * Path: takeoff-pdfs/{takeoffId}/{index}_{filename}
 */
export async function uploadTakeoffPdf(takeoffId, pdfData, fileName, index = 0) {
  if (!supabase) return null;
  const path = `${PDF_PREFIX}/${takeoffId}/${index}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const blob = new Blob([pdfData], { type: "application/pdf" });
  const { data, error } = await supabase.storage.from(PDF_BUCKET).upload(path, blob, {
    upsert: true,
    cacheControl: "86400",
  });
  if (error) { console.warn(`[Supabase] PDF upload failed: ${path}`, error.message); return null; }
  console.log(`[Supabase] PDF uploaded: ${path} (${(pdfData.byteLength / 1024 / 1024).toFixed(1)}MB)`);
  return data;
}

/**
 * Download a takeoff PDF from Supabase Storage.
 * Returns ArrayBuffer or null.
 */
export async function downloadTakeoffPdf(takeoffId, fileName, index = 0) {
  if (!supabase) return null;
  const path = `${PDF_PREFIX}/${takeoffId}/${index}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    const { data, error } = await supabase.storage.from(PDF_BUCKET).download(path);
    if (error) { console.warn(`[Supabase] PDF download failed: ${path}`, error.message); return null; }
    const buf = await data.arrayBuffer();
    console.log(`[Supabase] PDF downloaded: ${path} (${(buf.byteLength / 1024 / 1024).toFixed(1)}MB)`);
    return buf;
  } catch (e) { console.warn(`[Supabase] PDF download error:`, e.message); return null; }
}

/**
 * List all PDFs for a takeoff (returns file names and paths).
 */
export async function listTakeoffPdfs(takeoffId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.storage.from(PDF_BUCKET).list(`${PDF_PREFIX}/${takeoffId}`);
    if (error) return [];
    return (data || []).map(f => f.name).sort();
  } catch { return []; }
}

// ═════════════════════════════════════════════════════════════
//  PROJECT DRAWINGS (Cloud-first PDF storage)
// ═════════════════════════════════════════════════════════════

/**
 * Get a signed URL for streaming PDF via range requests (pdfjs compatible).
 * @param {string} path - Storage path (e.g. "project-drawings/abc/file.pdf")
 * @param {number} expiresIn - Seconds until URL expires (default 1 hour)
 */
export async function getSignedUrl(path, expiresIn = 3600, bucket = DEFAULT_BUCKET) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) { console.warn("[Supabase] Signed URL error:", error.message); return null; }
    return data?.signedUrl || null;
  } catch (e) { console.warn("[Supabase] getSignedUrl failed:", e.message); return null; }
}

/**
 * Upload a drawing File directly to Supabase Storage (no FileReader needed).
 * Returns { path, fileName, fileSize } on success.
 */
export async function uploadProjectDrawing(projectId, bidId, file, bucket = DEFAULT_BUCKET) {
  if (!supabase) throw new Error("Supabase not configured");
  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = projectId || bidId || "unassigned";
  const path = `project-drawings/${folder}/${uuid}_${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: "86400",
  });
  if (error) throw error;
  return { path, fileName: file.name, fileSize: file.size };
}

// Project drawings CRUD (metadata in project_drawings table)
export const getProjectDrawings = (opts) => _getAll("project_drawings", { orderBy: "created_at", ascending: false, ...opts });
export async function getDrawingsByBid(bidId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("project_drawings").select("*").eq("bid_id", bidId).eq("is_current", true).order("created_at", { ascending: false });
    if (error) { console.warn("[Supabase] getDrawingsByBid:", error.message); return []; }
    return (data || []).map(keysToCamel);
  } catch { return []; }
}
export async function getDrawingsByProject(projectId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("project_drawings").select("*").eq("project_id", projectId).eq("is_current", true).order("created_at", { ascending: false });
    if (error) { console.warn("[Supabase] getDrawingsByProject:", error.message); return []; }
    return (data || []).map(keysToCamel);
  } catch { return []; }
}
export const insertProjectDrawing = (d) => _insert("project_drawings", d);
export const updateProjectDrawing = (id, updates) => _update("project_drawings", id, updates);
export const deleteProjectDrawing = (id) => _remove("project_drawings", id);

// ═════════════════════════════════════════════════════════════
//  REALTIME SUBSCRIPTIONS
// ═════════════════════════════════════════════════════════════

/**
 * Subscribe to changes on a table. Returns an object with an unsubscribe() method.
 *
 * @param {string} table  - Table name
 * @param {function} callback - Receives { eventType, new: row, old: row }
 * @param {string} [filter] - Optional filter, e.g. "project_id=eq.123"
 */
export function subscribeToTable(table, callback, filter) {
  if (!supabase) return { unsubscribe: () => {} };

  let channel = supabase
    .channel(`public:${table}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to multiple tables at once. Returns a combined unsubscribe function.
 */
export function subscribeToTables(tableCallbackMap) {
  const subs = Object.entries(tableCallbackMap).map(([table, cb]) =>
    subscribeToTable(table, cb)
  );
  return {
    unsubscribe: () => subs.forEach((s) => s.unsubscribe()),
  };
}
