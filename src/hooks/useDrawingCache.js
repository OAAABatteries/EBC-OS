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

  return { cacheDrawing, getCachedDrawing, removeCachedDrawing, isCached };
}
