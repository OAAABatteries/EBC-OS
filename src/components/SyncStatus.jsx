// ═══════════════════════════════════════════════════════════════
//  EBC-OS · SyncStatus Component
//  Offline banner, sync progress, error retry, pending queue
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { flushSyncQueue } from "../hooks/useSyncedState";

const BAR = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 14px",
  color: "#fff",
  fontSize: 13,
  borderRadius: 6,
  margin: "0 0 8px 0",
};

const BTN = {
  background: "rgba(255,255,255,0.2)",
  border: "1px solid rgba(255,255,255,0.4)",
  color: "#fff",
  borderRadius: 4,
  padding: "2px 10px",
  cursor: "pointer",
  fontSize: 12,
};

export function SyncStatus({ syncStatus, network }) {
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  if (!isSupabaseConfigured()) return null;

  const { loading, errors, refreshAll } = syncStatus || {};
  const { online, pendingCount } = network || {};
  const hasErrors = errors && errors.length > 0;

  // ── Offline banner (highest priority) ──
  if (online === false) {
    return (
      <div style={{ ...BAR, background: "#6b7280" }}>
        <span style={{ fontSize: 16 }}>&#9676;</span>
        <span><strong>Offline</strong> &mdash; changes saved locally, will sync when connected</span>
        {pendingCount > 0 && (
          <span style={{
            background: "rgba(255,255,255,0.25)",
            borderRadius: 10,
            padding: "1px 8px",
            fontSize: 11,
            marginLeft: "auto",
          }}>
            {pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  // ── Syncing in progress ──
  if (loading || syncing) {
    return (
      <div style={{ ...BAR, background: "var(--primary, #3b82f6)", opacity: 0.92 }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>&#8635;</span>
        <span>Syncing data...</span>
        {pendingCount > 0 && (
          <span style={{ opacity: 0.8, marginLeft: "auto", fontSize: 11 }}>
            {pendingCount} queued
          </span>
        )}
      </div>
    );
  }

  // ── Pending queue (online but items waiting) ──
  if (pendingCount > 0) {
    return (
      <div style={{ ...BAR, background: "var(--amber, #f59e0b)", opacity: 0.92 }}>
        <span>&#9888;</span>
        <span>{pendingCount} change{pendingCount !== 1 ? "s" : ""} waiting to sync</span>
        <button
          onClick={async () => {
            setSyncing(true);
            await flushSyncQueue();
            if (refreshAll) refreshAll();
            setSyncing(false);
          }}
          style={{ ...BTN, marginLeft: "auto" }}
        >
          Sync Now
        </button>
      </div>
    );
  }

  // ── Sync errors ──
  if (hasErrors && !dismissed) {
    return (
      <div style={{ ...BAR, background: "var(--danger, #ef4444)", opacity: 0.92 }}>
        <span>&#9888;</span>
        <span>Sync error &mdash; some data may not be saved to cloud</span>
        <button
          onClick={() => { setDismissed(false); refreshAll(); }}
          style={{ ...BTN, marginLeft: "auto" }}
        >
          Retry
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
        >
          &times;
        </button>
      </div>
    );
  }

  return null;
}
