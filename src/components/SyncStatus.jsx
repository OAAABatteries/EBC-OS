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
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-4)",
  color: "#fff",
  fontSize: "var(--text-label)",
  borderRadius: "var(--radius-control)",
  margin: "0 0 8px 0",
};

const BTN = {
  background: "rgba(255,255,255,0.2)",
  border: "1px solid rgba(255,255,255,0.4)",
  color: "#fff",
  borderRadius: "var(--radius-control)",
  padding: "var(--space-1) var(--space-3)",
  cursor: "pointer",
  fontSize: "var(--text-label)",
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
      <div style={{ ...BAR, background: "var(--text3)" }}>
        <span style={{ fontSize: "var(--text-card)" }}>&#9676;</span>
        <span><strong>Offline</strong> &mdash; changes saved locally, will sync when connected</span>
        {pendingCount > 0 && (
          <span style={{
            background: "rgba(255,255,255,0.25)",
            borderRadius: "var(--radius-control)",
            padding: "var(--space-1) var(--space-2)",
            fontSize: "var(--text-tab)",
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
          <span style={{ opacity: 0.8, marginLeft: "auto", fontSize: "var(--text-tab)" }}>
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
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "var(--text-card)", padding: "0 4px" }}
        >
          &times;
        </button>
      </div>
    );
  }

  return null;
}
