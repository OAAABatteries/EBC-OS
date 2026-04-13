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
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      table,
      action,
      data,
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

/**
 * Replay all pending mutations to Supabase
 * @returns {{ synced: number, failed: number }}
 */
export async function replayQueue() {
  try {
    const { supabase } = await import("./supabase");
    if (!supabase) return { synced: 0, failed: 0 };

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const mutations = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (mutations.length === 0) { db.close(); return { synced: 0, failed: 0 }; }

    let synced = 0;
    let failed = 0;

    for (const mut of mutations) {
      try {
        let query;
        switch (mut.action) {
          case "insert":
            query = supabase.from(mut.table).insert(mut.data);
            break;
          case "update":
            query = supabase.from(mut.table).update(mut.data);
            if (mut.filter) query = query.eq(mut.filter.column, mut.filter.value);
            break;
          case "upsert":
            query = supabase.from(mut.table).upsert(mut.data);
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
    return { synced, failed };
  } catch (err) {
    console.warn("[offline-queue] Replay failed:", err.message);
    return { synced: 0, failed: 0 };
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
