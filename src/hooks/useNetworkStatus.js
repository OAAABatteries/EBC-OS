// ═══════════════════════════════════════════════════════════════
//  EBC-OS · useNetworkStatus Hook
//  Tracks online/offline state + pending sync queue count
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";

const QUEUE_KEY = "ebc_sync_queue";

function getQueueCount() {
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
    const goOnline = () => {
      setOnline(true);
      if (!navigator.onLine) return; // false positive guard
      setWasOffline(true);
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

  // Poll pending queue count + last sync every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getQueueCount());
      setLastSync(getLastSync());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const refreshPending = useCallback(() => {
    setPendingCount(getQueueCount());
    setLastSync(getLastSync());
  }, []);

  return { online, pendingCount, wasOffline, lastSync, refreshPending };
}
