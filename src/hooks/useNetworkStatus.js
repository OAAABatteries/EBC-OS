// ═══════════════════════════════════════════════════════════════
//  EBC-OS · useNetworkStatus Hook
//  Tracks online/offline state + pending sync queue count
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { getPendingCount, replayQueue } from "../lib/offlineQueue";

const QUEUE_KEY = "ebc_sync_queue";

function getLegacyQueueCount() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(q) ? q.length : 0;
  } catch { return 0; }
}

function getLastSync() {
  try { return Number(localStorage.getItem("ebc_last_sync") || "0"); } catch { return 0; }
}

export function useNetworkStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(getQueueCount);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastSync, setLastSync] = useState(getLastSync);

  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      if (!navigator.onLine) return; // false positive guard
      setWasOffline(true);
      // Auto-replay offline queue on reconnect
      try {
        const { synced, failed } = await replayQueue();
        if (synced > 0) {
          console.log(`[sync] Replayed ${synced} queued mutations (${failed} failed)`);
          refreshPendingAsync();
        }
      } catch {}
      // Clear wasOffline flag after 5s (gives time for toast)
      setTimeout(() => setWasOffline(false), 5000);
    };
    const goOffline = () => {
      setOnline(false);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Poll pending queue count (IndexedDB + legacy localStorage) every 3s
  useEffect(() => {
    const poll = async () => {
      const idbCount = await getPendingCount();
      const legacyCount = getLegacyQueueCount();
      setPendingCount(idbCount + legacyCount);
      setLastSync(getLastSync());
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  const refreshPendingAsync = useCallback(async () => {
    const idbCount = await getPendingCount();
    const legacyCount = getLegacyQueueCount();
    setPendingCount(idbCount + legacyCount);
    setLastSync(getLastSync());
  }, []);

  const refreshPending = useCallback(() => { refreshPendingAsync(); }, [refreshPendingAsync]);

  return { online, isOnline: online, pendingCount, wasOffline, lastSync, refreshPending };
}
