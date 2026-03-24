// ═══════════════════════════════════════════════════════════════
//  EBC-OS · useSyncedState Hook
//  Syncs state to BOTH localStorage (instant) AND Supabase (async)
//  localStorage = cache for instant loads + offline resilience
//  Supabase = source of truth for multi-device / multi-user
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

/** Deduplicate an array by `id`, keeping the last occurrence (most recent write wins). */
const dedup = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const seen = new Map();
  for (const item of arr) {
    if (item && item.id != null) seen.set(item.id, item);
  }
  return seen.size === arr.length ? arr : [...seen.values()];
};

// ── Field aliases: seed/app field names → DB column names ──
const FIELD_ALIASES = {
  start_date: "start",
  end_date: "end",
  value: "contract",
};

// ── snake_case ↔ camelCase ──
function toSnake(str) {
  const snake = str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
  return FIELD_ALIASES[snake] || snake;
}
// Reverse aliases: DB column names → app field names (snake_case)
const REVERSE_ALIASES = { start: "start_date", end: "end_date", contract: "value" };
function toCamel(str) {
  const mapped = REVERSE_ALIASES[str] || str;
  return mapped.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function keysToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toSnake(k), keysToSnake(v)])
    );
  }
  return obj;
}
function keysToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), keysToCamel(v)])
    );
  }
  return obj;
}

// ── Offline queue for failed writes ──
const QUEUE_KEY = "ebc_sync_queue";

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch { return []; }
}

function addToQueue(op) {
  const queue = getQueue();
  queue.push({ ...op, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function removeFromQueue(index) {
  const queue = getQueue();
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── Flush offline queue when back online ──
let flushingQueue = false;
export async function flushSyncQueue() {
  if (!isSupabaseConfigured() || !supabase || flushingQueue) return;
  flushingQueue = true;
  try {
    const queue = getQueue();
    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      try {
        if (op.type === "upsert") {
          await supabase.from(op.table).upsert(op.data, { onConflict: "id" });
        } else if (op.type === "delete") {
          await supabase.from(op.table).delete().eq("id", op.id);
        } else if (op.type === "bulk_upsert") {
          await supabase.from(op.table).upsert(op.data, { onConflict: "id" });
        }
        removeFromQueue(0); // always remove first since we shift
      } catch (err) {
        console.warn("[sync] queue flush failed for", op.table, err.message);
        break; // stop on first failure, retry later
      }
    }
  } finally {
    flushingQueue = false;
  }
}

// Auto-flush when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setTimeout(flushSyncQueue, 2000);
  });
}

/**
 * TABLE_MAP: maps localStorage key → Supabase table name
 * Only keys listed here will sync to Supabase.
 * Others stay localStorage-only (theme, lang, UI prefs).
 */
export const TABLE_MAP = {
  bids:              "bids",
  projects:          "projects",
  contacts:          "contacts",
  callLog:           "call_log",
  invoices:          "invoices",
  changeOrders:      "change_orders",
  rfis:              "rfis",
  submittals:        "submittals",
  schedule:          "schedule_tasks",
  takeoffs:          "takeoffs",
  tmTickets:         "tm_tickets",
  dailyReports:      "daily_reports",
  jsas:              "jsas",
  employees:         "users",
  timeEntries:       "time_entries",
  materialRequests:  "material_requests",
  teamSchedule:      "crew_schedule",
  company:           "company",
  assemblies:        "assemblies",
  calendarEvents:    "calendar_events",
  ptoRequests:       "pto_requests",
  calEquipment:      "equipment",
  equipmentBookings: "equipment_bookings",
  certifications:    "certifications",
  companyLocations:  "company_locations",
  incidents:         "incidents",
  toolboxTalks:      "toolbox_talks",
  scope:             "scope_items",
  materials:         "materials",
  customAssemblies:  "custom_assemblies",
  incentiveProjects: "incentive_projects",
  projectDrawings:   "project_drawings",
  emailScans:        "email_scans",
};

/**
 * useSyncedState — drop-in replacement for useLocalStorage
 *
 * @param {string} key - localStorage key (camelCase, e.g. "projects")
 * @param {*} initialValue - fallback value
 * @returns [state, setState, { loading, error, refresh }]
 */
export function useSyncedState(key, initialValue) {
  const table = TABLE_MAP[key];
  const lsKey = "ebc_" + key;

  // 1. Initialize from localStorage (instant), dedup arrays by id
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(lsKey);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? dedup(parsed) : parsed;
    } catch { return initialValue; }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hydrated = useRef(false);
  const skipRealtimeUpdate = useRef(false);

  // 2. Hydrate from Supabase on first mount
  //    LOCAL data wins if it exists (user may have unsaved edits).
  //    Supabase only wins on a truly fresh browser (no localStorage).
  useEffect(() => {
    if (!table || !isSupabaseConfigured() || !supabase || hydrated.current) return;
    hydrated.current = true;

    // Check if we already have local data
    // An explicit empty array ("[]") counts as "has data" — the user intentionally cleared it.
    // Only treat missing key (null) as "no local data."
    const hasLocalData = (() => {
      try {
        const item = localStorage.getItem(lsKey);
        return item !== null;
      } catch { return false; }
    })();

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await supabase.from(table).select("*");
        if (err) throw err;

        if (data && data.length > 0) {
          const camelData = keysToCamel(data);

          if (hasLocalData) {
            // Local data exists — push local to Supabase (local wins),
            // but don't overwrite local state
            const localData = (() => {
              try { return JSON.parse(localStorage.getItem(lsKey)); } catch { return null; }
            })();
            if (localData) {
              pushToSupabase(table, localData, Array.isArray(initialValue)).catch(() => {});
            }
          } else {
            // No local data — Supabase is source of truth (first visit)
            if (!Array.isArray(initialValue)) {
              const val = camelData[0] || initialValue;
              setStored(val);
              try { localStorage.setItem(lsKey, JSON.stringify(val)); } catch {}
            } else {
              const dedupedData = dedup(camelData);
              setStored(dedupedData);
              try { localStorage.setItem(lsKey, JSON.stringify(dedupedData)); } catch {}
            }
          }
        }
        // Supabase empty but localStorage has data — push up
        else if (hasLocalData) {
          const localData = (() => {
            try { return JSON.parse(localStorage.getItem(lsKey)); } catch { return null; }
          })();
          if (localData) {
            await pushToSupabase(table, localData, Array.isArray(initialValue));
          }
        }
        // Both empty — seed initialValue to localStorage + Supabase
        else if (initialValue && (Array.isArray(initialValue) ? initialValue.length > 0 : true)) {
          try { localStorage.setItem(lsKey, JSON.stringify(initialValue)); } catch {}
          await pushToSupabase(table, initialValue, Array.isArray(initialValue));
        }
      } catch (err) {
        console.warn(`[sync] hydrate ${table} failed:`, err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, lsKey]);

  // 3. Real-time subscription
  useEffect(() => {
    if (!table || !isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel(`sync:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (skipRealtimeUpdate.current) return;
        const { eventType } = payload;
        const newRow = payload.new ? keysToCamel(payload.new) : null;
        const oldRow = payload.old ? keysToCamel(payload.old) : null;

        if (Array.isArray(initialValue)) {
          setStored((prev) => {
            let next;
            if (eventType === "INSERT") {
              // Don't duplicate if already exists
              if (prev.some(item => item.id === newRow.id)) return prev;
              next = [newRow, ...prev];
            } else if (eventType === "UPDATE") {
              next = prev.map((item) => item.id === newRow.id ? { ...item, ...newRow } : item);
            } else if (eventType === "DELETE") {
              next = prev.filter((item) => item.id !== (oldRow?.id || payload.old?.id));
            } else {
              return prev;
            }
            try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
            return next;
          });
        } else {
          // Singular object (company)
          if (newRow) {
            setStored(newRow);
            try { localStorage.setItem(lsKey, JSON.stringify(newRow)); } catch {}
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, lsKey]);

  // 4. setValue: write to localStorage + async push to Supabase
  const setValue = useCallback((value) => {
    setStored((prev) => {
      const next = typeof value === "function" ? value(prev) : value;

      // Save to localStorage immediately (cache)
      try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}

      // Async push to Supabase
      if (table && isSupabaseConfigured() && supabase) {
        skipRealtimeUpdate.current = true;
        setTimeout(() => { skipRealtimeUpdate.current = false; }, 3000);

        if (Array.isArray(next)) {
          // Diff: find what changed
          const prevIds = new Set((prev || []).map(item => item.id));
          const nextIds = new Set(next.map(item => item.id));

          // Deleted items
          const deleted = (prev || []).filter(item => !nextIds.has(item.id));
          // New or updated items
          const upserted = next.filter(item => {
            if (!prevIds.has(item.id)) return true; // new
            const old = (prev || []).find(p => p.id === item.id);
            return JSON.stringify(old) !== JSON.stringify(item); // changed
          });

          if (upserted.length > 0) {
            const cols = _columnCache[table]; // use cached columns if available
            const snakeData = upserted.map(row => stripUnknownColumns(keysToSnake(row), cols));
            supabase.from(table).upsert(snakeData, { onConflict: "id" })
              .then(({ error }) => {
                if (error) {
                  console.warn(`[sync] upsert ${table}:`, error.message);
                  addToQueue({ type: "bulk_upsert", table, data: snakeData });
                }
              });
          }

          for (const item of deleted) {
            supabase.from(table).delete().eq("id", item.id)
              .then(({ error }) => {
                if (error) {
                  console.warn(`[sync] delete ${table}:`, error.message);
                  addToQueue({ type: "delete", table, id: item.id });
                }
              });
          }
        } else {
          // Singular object
          const cols = _columnCache[table];
          const snakeData = stripUnknownColumns(keysToSnake(next), cols);
          supabase.from(table).upsert(snakeData, { onConflict: "id" })
            .then(({ error }) => {
              if (error) {
                console.warn(`[sync] upsert ${table}:`, error.message);
                addToQueue({ type: "upsert", table, data: snakeData });
              }
            });
        }
      }

      return next;
    });
  }, [key, table, lsKey]);

  // 5. Manual refresh from Supabase
  const refresh = useCallback(async () => {
    if (!table || !isSupabaseConfigured() || !supabase) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from(table).select("*");
      if (err) throw err;
      const camelData = keysToCamel(data || []);
      if (Array.isArray(initialValue)) {
        setStored(camelData);
        try { localStorage.setItem(lsKey, JSON.stringify(camelData)); } catch {}
      } else {
        const val = camelData[0] || initialValue;
        setStored(val);
        try { localStorage.setItem(lsKey, JSON.stringify(val)); } catch {}
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [table, lsKey, initialValue]);

  return [stored, setValue, { loading, error, refresh }];
}

// ── Column cache: only send fields that exist in the DB table ──
const _columnCache = {};
async function getTableColumns(table) {
  if (_columnCache[table]) return _columnCache[table];
  try {
    // Use RPC to query information_schema for column names
    const { data, error } = await supabase.rpc("get_table_columns", { tbl: table });
    if (!error && data && data.length > 0) {
      _columnCache[table] = new Set(data.map(r => r.column_name));
      return _columnCache[table];
    }
    // Fallback: fetch one row to discover columns
    const { data: rows } = await supabase.from(table).select("*").limit(1);
    if (rows && rows.length > 0) {
      _columnCache[table] = new Set(Object.keys(rows[0]));
      return _columnCache[table];
    }
    return null;
  } catch { return null; }
}

function stripUnknownColumns(row, columns) {
  if (!columns) return row;
  const filtered = {};
  for (const [k, v] of Object.entries(row)) {
    if (columns.has(k)) filtered[k] = v;
  }
  return filtered;
}

// ── Helper: push local data to Supabase ──
async function pushToSupabase(table, data, isArray) {
  if (!supabase) return;
  try {
    const cols = await getTableColumns(table);
    if (isArray && Array.isArray(data) && data.length > 0) {
      const snakeData = data.map(row => stripUnknownColumns(keysToSnake(row), cols));
      // Batch in chunks of 100
      for (let i = 0; i < snakeData.length; i += 100) {
        const chunk = snakeData.slice(i, i + 100);
        const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
        if (error) console.warn(`[sync] upsert ${table}:`, error.message);
      }
    } else if (!isArray && data) {
      const { error } = await supabase.from(table).upsert(stripUnknownColumns(keysToSnake(data), cols), { onConflict: "id" });
      if (error) console.warn(`[sync] upsert ${table}:`, error.message);
    }
  } catch (err) {
    console.warn(`[sync] initial push ${table}:`, err.message);
  }
}
