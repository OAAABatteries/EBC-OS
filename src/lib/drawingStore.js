// ═══════════════════════════════════════════════════════════════
//  EBC-OS · IndexedDB Drawing Store — LOCAL-FIRST plan storage
//  Drawings are stored as blobs in IndexedDB (persistent, large).
//  Cloud (Supabase) is the backup; local is the source of truth
//  for read speed.  Syncs in background when online.
// ═══════════════════════════════════════════════════════════════

const DB_NAME = "ebc_drawings";
const DB_VERSION = 1;
const STORE_NAME = "drawings";

/** Open (or create) the IndexedDB database */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("cachedAt", "cachedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Build a deterministic cache key from project + file */
function makeKey(projectId, fileName) {
  return `${projectId}::${fileName}`;
}

/**
 * Store a drawing blob in IndexedDB
 * @param {string} projectId
 * @param {string} fileName
 * @param {Blob|ArrayBuffer} data — the PDF bytes
 * @param {object} meta — { storagePath, size, revision, updatedAt, ... }
 */
export async function putDrawing(projectId, fileName, data, meta = {}) {
  const db = await openDB();
  const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      key: makeKey(projectId, fileName),
      projectId,
      fileName,
      blob,
      size: blob.size,
      cachedAt: new Date().toISOString(),
      revision: meta.revision || null,
      updatedAt: meta.updatedAt || null,
      storagePath: meta.storagePath || null,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a drawing as ArrayBuffer (ready for pdfjs)
 * @returns {Promise<{arrayBuffer: ArrayBuffer, meta: object}|null>}
 */
export async function getDrawing(projectId, fileName) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(makeKey(projectId, fileName));
    req.onsuccess = async () => {
      const record = req.result;
      if (!record?.blob) return resolve(null);
      try {
        const arrayBuffer = await record.blob.arrayBuffer();
        resolve({
          arrayBuffer,
          meta: {
            cachedAt: record.cachedAt,
            size: record.size,
            revision: record.revision,
            updatedAt: record.updatedAt,
            storagePath: record.storagePath,
          },
        });
      } catch {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

/**
 * Check if a drawing exists locally (fast metadata check)
 * @returns {Promise<{cached: boolean, cachedAt: string|null, revision: number|null, isStale: boolean}>}
 */
export async function checkDrawing(projectId, fileName, cloudUpdatedAt) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(makeKey(projectId, fileName));
    req.onsuccess = () => {
      const r = req.result;
      if (!r) return resolve({ cached: false, cachedAt: null, revision: null, isStale: false });
      const localTime = r.cachedAt ? new Date(r.cachedAt) : null;
      const cloudTime = cloudUpdatedAt ? new Date(cloudUpdatedAt) : null;
      const isStale = !!(localTime && cloudTime && cloudTime > localTime);
      resolve({ cached: true, cachedAt: r.cachedAt, revision: r.revision, isStale });
    };
    req.onerror = () => resolve({ cached: false, cachedAt: null, revision: null, isStale: false });
  });
}

/**
 * List all cached drawings for a project
 * @returns {Promise<Array<{fileName, size, cachedAt, revision}>>}
 */
export async function listDrawings(projectId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("projectId");
    const req = idx.getAll(projectId);
    req.onsuccess = () => {
      resolve(
        (req.result || []).map((r) => ({
          fileName: r.fileName,
          size: r.size,
          cachedAt: r.cachedAt,
          revision: r.revision,
          updatedAt: r.updatedAt,
          storagePath: r.storagePath,
        }))
      );
    };
    req.onerror = () => resolve([]);
  });
}

/** Remove a single cached drawing */
export async function removeDrawing(projectId, fileName) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(makeKey(projectId, fileName));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Clear all cached drawings for a project */
export async function clearProjectDrawings(projectId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("projectId");
    const req = idx.openCursor(projectId);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Get cache statistics */
export async function getDrawingStats() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      let totalSize = 0;
      const projects = new Set();
      for (const r of all) {
        totalSize += r.size || 0;
        if (r.projectId) projects.add(r.projectId);
      }
      resolve({ count: all.length, totalSize, projectCount: projects.size });
    };
    req.onerror = () => resolve({ count: 0, totalSize: 0, projectCount: 0 });
  });
}

/** Request persistent storage so the browser won't evict our data */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      const granted = await navigator.storage.persist();
      return granted;
    }
  } catch {}
  return false;
}
