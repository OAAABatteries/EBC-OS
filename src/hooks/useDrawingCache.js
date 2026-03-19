const CACHE_NAME = "ebc-drawings-v1";

export function useDrawingCache() {
  const cacheDrawing = async (path, blob) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(blob, { headers: { "Content-Type": "application/pdf" } });
      await cache.put(path, response);
      // Also save metadata in localStorage for fast UI rendering
      const meta = JSON.parse(localStorage.getItem("ebc_downloadedDrawings") || "{}");
      meta[path] = { cachedAt: new Date().toISOString(), size: blob.size };
      localStorage.setItem("ebc_downloadedDrawings", JSON.stringify(meta));
    } catch (err) {
      console.warn("[drawings] cache failed:", err.message);
    }
  };

  const getCachedDrawing = async (path) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(path);
      if (!response) return null;
      return await response.arrayBuffer();
    } catch { return null; }
  };

  const removeCachedDrawing = async (path) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(path);
      const meta = JSON.parse(localStorage.getItem("ebc_downloadedDrawings") || "{}");
      delete meta[path];
      localStorage.setItem("ebc_downloadedDrawings", JSON.stringify(meta));
    } catch {}
  };

  const isCached = (path) => {
    try {
      const meta = JSON.parse(localStorage.getItem("ebc_downloadedDrawings") || "{}");
      return !!meta[path];
    } catch { return false; }
  };

  /** Ask the service worker to pre-cache a drawing URL (network fetch + store) */
  const requestSwCache = (url) => {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CACHE_DRAWING", url });
      }
    } catch {}
  };

  /** Ask the service worker to clear the entire drawings cache */
  const clearAllCached = async () => {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_DRAWING_CACHE" });
      }
      await caches.delete(CACHE_NAME);
      localStorage.removeItem("ebc_downloadedDrawings");
    } catch {}
  };

  /** Check if a specific drawing URL is in the Cache API */
  const isUrlCached = async (url) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(url);
      return !!match;
    } catch { return false; }
  };

  /** Get cache stats: count of cached drawings + approximate total size */
  const getCacheStats = async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      const count = keys.length;
      // Use localStorage metadata for fast size estimate
      const meta = JSON.parse(localStorage.getItem("ebc_downloadedDrawings") || "{}");
      let totalSize = 0;
      for (const info of Object.values(meta)) {
        totalSize += info.size || 0;
      }
      return { count, totalSize };
    } catch {
      return { count: 0, totalSize: 0 };
    }
  };

  return {
    cacheDrawing,
    getCachedDrawing,
    removeCachedDrawing,
    isCached,
    requestSwCache,
    clearAllCached,
    isUrlCached,
    getCacheStats,
  };
}
