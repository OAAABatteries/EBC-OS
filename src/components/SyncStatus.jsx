// ═══════════════════════════════════════════════════════════════
//  EBC-OS · SyncStatus Component
//  Shows a small banner when data is syncing or if sync errors occur
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";

export function SyncStatus({ syncStatus }) {
  const [dismissed, setDismissed] = useState(false);

  if (!isSupabaseConfigured() || !syncStatus) return null;

  const { loading, errors, refreshAll } = syncStatus;
  const hasErrors = errors && errors.length > 0;

  // Nothing to show
  if (!loading && !hasErrors) return null;
  if (dismissed && !loading) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 14px",
      background: hasErrors ? "var(--danger, #ef4444)" : "var(--primary, #3b82f6)",
      color: "#fff",
      fontSize: 13,
      borderRadius: 6,
      margin: "0 0 8px 0",
      opacity: 0.92,
    }}>
      {loading && (
        <>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>&#8635;</span>
          <span>Syncing data...</span>
        </>
      )}
      {!loading && hasErrors && (
        <>
          <span>&#9888;</span>
          <span>Sync error &mdash; some data may not be saved to cloud</span>
          <button
            onClick={() => { setDismissed(false); refreshAll(); }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff",
              borderRadius: 4,
              padding: "2px 10px",
              cursor: "pointer",
              fontSize: 12,
              marginLeft: "auto",
            }}
          >
            Retry
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 16,
              padding: "0 4px",
            }}
          >
            &times;
          </button>
        </>
      )}
    </div>
  );
}
