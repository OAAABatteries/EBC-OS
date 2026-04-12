// ═══════════════════════════════════════════════════════════════
//  EBC-OS · useDrawingCache — IndexedDB-first drawing cache hook
//  Primary: IndexedDB (persistent, large blobs, survives eviction)
//  Secondary: Cache API / SW (network interception layer)
//  Cloud: Supabase (backup — fetched only on miss or stale)
// ═══════════════════════════════════════════════════════════════
import {
  putDrawing,
  getDrawing,
  checkDrawing,
  removeDrawing,
  listDrawings,
  getDrawingStats,
  clearProjectDrawings,
  requestPersistentStorage,
} from "../lib/drawingStore";

export function useDrawingCache() {
  /**
   * Cache a drawing blob into IndexedDB
   * @param {string} projectId
   * @param {string} fileName
   * @param {Blob|ArrayBuffer} data
   * @param {object} meta — { storagePath, revision, updatedAt, size }
   */
  const cacheDrawing = async (projectId, fileName, data, meta = {}) => {
    try {
      await putDrawing(projectId, fileName, data, meta);
    } catch (err) {
      console.warn("[drawings] IndexedDB cache failed:", err.message);
    }
  };

  /**
   * Get a cached drawing as ArrayBuffer (for pdfjs)
   * @returns {Promise<{arrayBuffer: ArrayBuffer, meta: object}|null>}
   */
  const getCachedDrawing = async (projectId, fileName) => {
    try {
      return await getDrawing(projectId, fileName);
    } catch {
      return null;
    }
  };

  /**
   * Fast check: is this drawing cached, and is it stale?
   * @param {string} cloudUpdatedAt — ISO timestamp from cloud metadata
   */
  const checkCached = async (projectId, fileName, cloudUpdatedAt) => {
    try {
      return await checkDrawing(projectId, fileName, cloudUpdatedAt);
    } catch {
      return { cached: false, cachedAt: null, revision: null, isStale: false };
    }
  };

  /** Remove a single drawing from cache */
  const removeCachedDrawing = async (projectId, fileName) => {
    try {
      await removeDrawing(projectId, fileName);
    } catch {}
  };

  /** List all cached drawings for a project */
  const listCachedDrawings = async (projectId) => {
    try {
      return await listDrawings(projectId);
    } catch {
      return [];
    }
  };

  /** Get overall cache stats */
  const getCacheStats = async () => {
    try {
      return await getDrawingStats();
    } catch {
      return { count: 0, totalSize: 0, projectCount: 0 };
    }
  };

  /** Clear all drawings for a project */
  const clearProject = async (projectId) => {
    try {
      await clearProjectDrawings(projectId);
    } catch {}
  };

  /** Request persistent storage (call once at app start) */
  const requestPersistence = async () => {
    return await requestPersistentStorage();
  };

  return {
    cacheDrawing,
    getCachedDrawing,
    checkCached,
    removeCachedDrawing,
    listCachedDrawings,
    getCacheStats,
    clearProject,
    requestPersistence,
  };
}
