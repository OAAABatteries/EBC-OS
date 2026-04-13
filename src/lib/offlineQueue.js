// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Offline Mutation Queue
//  Queues data mutations (labor entries, production logs, material
//  requests, etc.) in IndexedDB when offline. Replays them to
//  Supabase when connectivity returns.
//
//  Architecture:
//    1. Every write operation calls queueMutation() instead of
//       directly writing to Supabase.
//    2. If online → immediate Supabase write + local state update.
//    3. If offline → store in IndexedDB queue + local state update.
//    4. On reconnect → replay queue in order, remove on success.
// ═══════════════════════════════════════════════════════════════

const DB_NAME = "ebc-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Queue a mutation for offline replay
 * @param {string} table - Supabase table name
 * @param {string} action - "insert" | "update" | "upsert" | "delete"
 * @param {object} data - the row data
 * @param {object} [filter] - for update/delete: { column, value }
 */
export async function queueMutation(table, action, data, filter = null) {
  try {
    // Stamp updatedAt for conflict detection on replay
    const stamped = { ...data };
    if (action === "update" || action === "upsert") {
      stamped._localUpdatedAt = new Date().toISOString();
    }
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      table,
      action,
      data: stamped,
      filter,
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("[offline-queue] Failed to queue mutation:", err.message);
  }
}

/**
 * Get the count of pending mutations
 */
export async function getPendingCount() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const count = await new Promise((resolve) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}

// Conflict store — mutations that failed due to server-side changes
let _conflicts = [];
export function getConflicts() { return _conflicts; }
export function clearConflicts() { _conflicts = []; }
export function resolveConflict(mutId, resolution) {
  // resolution: "local" = retry with force, "server" = discard local
  _conflicts = _conflicts.filter(c => c.id !== mutId);
  return resolution;
}

/**
 * Replay all pending mutations to Supabase
 * @returns {{ synced: number, failed: number, conflicts: number }}
 */
export async function replayQueue() {
  try {
    const { supabase } = await import("./supabase");
    if (!supabase) return { synced: 0, failed: 0, conflicts: 0 };

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const mutations = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (mutations.length === 0) { db.close(); return { synced: 0, failed: 0, conflicts: 0 }; }

    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const mut of mutations) {
      try {
        // Conflict detection: for updates, check if server row changed since we queued
        if ((mut.action === "update" || mut.action === "upsert") && mut.filter && mut.data._localUpdatedAt) {
          const { data: serverRow } = await supabase
            .from(mut.table)
            .select("updated_at")
            .eq(mut.filter.column, mut.filter.value)
            .maybeSingle();

          if (serverRow?.updated_at && serverRow.updated_at > mut.data._localUpdatedAt) {
            // Server has a newer version — flag as conflict
            _conflicts.push({
              id: mut.id,
              table: mut.table,
              filter: mut.filter,
              localData: mut.data,
              localTime: mut.data._localUpdatedAt,
              serverTime: serverRow.updated_at,
              queuedAt: mut.createdAt,
            });
            conflicts++;
            continue; // Skip this mutation, leave in queue for manual resolution
          }
        }

        // Strip internal tracking field before sending to Supabase
        const cleanData = { ...mut.data };
        delete cleanData._localUpdatedAt;

        let query;
        switch (mut.action) {
          case "insert":
            query = supabase.from(mut.table).insert(cleanData);
            break;
          case "update":
            query = supabase.from(mut.table).update(cleanData);
            if (mut.filter) query = query.eq(mut.filter.column, mut.filter.value);
            break;
          case "upsert":
            query = supabase.from(mut.table).upsert(cleanData);
            break;
          case "delete":
            query = supabase.from(mut.table).delete();
            if (mut.filter) query = query.eq(mut.filter.column, mut.filter.value);
            break;
          default:
            continue;
        }

        const { error } = await query;
        if (error) throw error;

        // Remove from queue on success
        const delTx = db.transaction(STORE_NAME, "readwrite");
        delTx.objectStore(STORE_NAME).delete(mut.id);
        await new Promise((r) => { delTx.oncomplete = r; });
        synced++;
      } catch (err) {
        console.warn(`[offline-queue] Failed to sync mutation ${mut.id}:`, err.message);
        // Increment retry count
        const retryTx = db.transaction(STORE_NAME, "readwrite");
        retryTx.objectStore(STORE_NAME).put({ ...mut, retries: (mut.retries || 0) + 1 });
        await new Promise((r) => { retryTx.oncomplete = r; });
        failed++;
      }
    }

    db.close();
    return { synced, failed, conflicts };
  } catch (err) {
    console.warn("[offline-queue] Replay failed:", err.message);
    return { synced: 0, failed: 0, conflicts: 0 };
  }
}

/**
 * Clear the entire queue (e.g., after manual resolution)
 */
export async function clearQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
  } catch {}
}
