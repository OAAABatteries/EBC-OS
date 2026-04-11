// ═══════════════════════════════════════════════════════════════
//  EBC-OS · InstallPrompt + UpdateBanner
//  PWA install prompt and service worker update notification
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";

/* ── Install Prompt ─────────────────────────────────────────── */

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    // Check if user dismissed recently (24h cooldown)
    const dismissedAt = localStorage.getItem("ebc_install_dismissed");
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (isInstalled || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("ebc_install_dismissed", String(Date.now()));
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)", margin: "0 0 8px 0",
      background: "linear-gradient(135deg, rgba(224,148,34,0.12), rgba(224,148,34,0.04))",
      border: "1px solid rgba(224,148,34,0.25)",
      borderRadius: "var(--radius-control)", fontSize: "var(--text-label)",
    }}>
      <span style={{ fontSize: "var(--text-subtitle)" }}>&#9881;</span>
      <div style={{ flex: 1 }}>
        <strong style={{ color: "var(--gold, #e09422)" }}>Install EBC</strong>
        <div style={{ fontSize: "var(--text-tab)", color: "var(--text2)", marginTop: "var(--space-1)" }}>
          Works offline, launches instantly, feels like a native app
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: "var(--gold, #e09422)", color: "#000",
          border: "none", borderRadius: "var(--radius-control)", padding: "var(--space-2) var(--space-4)",
          fontWeight: "var(--weight-bold)", fontSize: "var(--text-label)", cursor: "pointer",
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "none", border: "none",
          color: "var(--text3)", cursor: "pointer", fontSize: "var(--text-card)", padding: "0 4px",
        }}
      >
        &times;
      </button>
    </div>
  );
}

/* ── Update Banner ──────────────────────────────────────────── */

export function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Listen for SW update message
    const handler = (event) => {
      if (event.data?.type === "SW_UPDATED") {
        setHasUpdate(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);

    // Also check on SW controllerchange
    const controllerChange = () => setHasUpdate(true);
    navigator.serviceWorker?.addEventListener("controllerchange", controllerChange);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
      navigator.serviceWorker?.removeEventListener("controllerchange", controllerChange);
    };
  }, []);

  if (!hasUpdate) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)", margin: "0 0 8px 0",
      background: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.3)",
      borderRadius: "var(--radius-control)", fontSize: "var(--text-label)",
    }}>
      <span style={{ fontSize: "var(--text-card)" }}>&#8635;</span>
      <span style={{ flex: 1 }}>
        <strong>Update available</strong> — a new version of EBC is ready
      </span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "var(--primary, #3b82f6)", color: "#fff",
          border: "none", borderRadius: "var(--radius-control)", padding: "var(--space-2) var(--space-4)",
          fontWeight: "var(--weight-bold)", fontSize: "var(--text-label)", cursor: "pointer",
        }}
      >
        Reload
      </button>
      <button
        onClick={() => setHasUpdate(false)}
        style={{
          background: "none", border: "none",
          color: "var(--text3)", cursor: "pointer", fontSize: "var(--text-card)", padding: "0 4px",
        }}
      >
        &times;
      </button>
    </div>
  );
}
