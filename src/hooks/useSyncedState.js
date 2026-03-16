// ═══════════════════════════════════════════════════════════════
//  EBC-OS · useSyncedState Hook
//  Syncs state to BOTH localStorage (instant) AND Supabase (async)
//  localStorage = cache for instant loads + offline resilience
//  Supabase = source of truth for multi-device / multi-user
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ── snake_case ↔ camelCase ──
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
  crewSchedule:      "crew_schedule",
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

  // 1. Initialize from localStorage (instant)
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(lsKey);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hydrated = useRef(false);
  const skipRealtimeUpdate = useRef(false);

  // 2. Hydrate from Supabase on first mount (async, Supabase wins)
  useEffect(() => {
    if (!table || !isSupabaseConfigured() || !supabase || hydrated.current) return;
    hydrated.current = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await supabase.from(table).select("*");
        if (err) throw err;
        if (data && data.length > 0) {
          const camelData = keysToCamel(data);
          // For singular objects (company), unwrap
          if (!Array.isArray(initialValue)) {
            const val = camelData[0] || initialValue;
            setStored(val);
            try { localStorage.setItem(lsKey, JSON.stringify(val)); } catch {}
          } else {
            setStored(camelData);
            try { localStorage.setItem(lsKey, JSON.stringify(camelData)); } catch {}
          }
        }
        // If Supabase is empty but localStorage has data, push localStorage → Supabase
        else {
          const localData = (() => {
            try {
              const item = localStorage.getItem(lsKey);
              return item ? JSON.parse(item) : null;
            } catch { return null; }
          })();
          if (localData && (Array.isArray(localData) ? localData.length > 0 : localData)) {
            await pushToSupabase(table, localData, Array.isArray(initialValue));
          }
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
            const snakeData = upserted.map(row => keysToSnake(row));
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
          const snakeData = keysToSnake(next);
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

// ── Helper: push local data to Supabase ──
async function pushToSupabase(table, data, isArray) {
  if (!supabase) return;
  try {
    if (isArray && Array.isArray(data) && data.length > 0) {
      const snakeData = data.map(row => keysToSnake(row));
      // Batch in chunks of 100
      for (let i = 0; i < snakeData.length; i += 100) {
        const chunk = snakeData.slice(i, i + 100);
        await supabase.from(table).upsert(chunk, { onConflict: "id" });
      }
    } else if (!isArray && data) {
      await supabase.from(table).upsert(keysToSnake(data), { onConflict: "id" });
    }
  } catch (err) {
    console.warn(`[sync] initial push ${table}:`, err.message);
  }
}
