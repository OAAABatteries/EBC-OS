import { useState, Fragment } from "react";
import { BarChart2, Building2, HardHat, Bell, CheckCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Smart Notification Panel
//  Grouped, actionable alerts with urgency color-coding
// ═══════════════════════════════════════════════════════════════

const URGENCY_COLORS = {
  critical: { bg: "rgba(220,38,38,0.10)", border: "var(--red)", dot: "#dc2626" },
  warning: { bg: "rgba(245,158,11,0.10)", border: "var(--amber)", dot: "#f59e0b" },
  info: { bg: "rgba(59,130,246,0.08)", border: "var(--blue)", dot: "#3b82f6" },
};

const CATEGORY_INFO = {
  bids: { label: "Bid Pipeline", icon: <BarChart2 size={14} /> },
  projects: { label: "Project Management", icon: <Building2 size={14} /> },
  crew: { label: "Crew / HR", icon: <HardHat size={14} /> },
};

const CATEGORY_ORDER = ["bids", "projects", "crew"];

export function NotificationPanel({ grouped, badgeCount, dismissAlert, dismissAll, onClose, onNav }) {
  const [collapsed, setCollapsed] = useState({});

  const toggleCategory = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  const handleAction = (alert, e) => {
    if (e) e.stopPropagation();
    if (alert.action?.type === "mailto" && alert.action?.url) {
      window.open(alert.action.url, "_blank");
    } else {
      // For non-mailto actions, navigate to the target
      handleNav(alert);
    }
  };

  const handleNav = (alert) => {
    if (alert.nav && onNav) {
      onNav(alert.nav);
    }
    if (onClose) onClose();
  };

  const totalAlerts = badgeCount;
  const hasAlerts = totalAlerts > 0;

  return (
    <div
      style={{
        position: "fixed", top: 54, right: 8,
        width: Math.min(400, window.innerWidth - 16),
        maxHeight: "calc(100vh - 70px)",
        overflowY: "auto",
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        zIndex: 9999,
        padding: 0,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, background: "var(--bg2)", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Alerts</span>
          {totalAlerts > 0 && (
            <span style={{
              background: "var(--red)", color: "#fff", borderRadius: 10,
              padding: "1px 7px", fontSize: 11, fontWeight: 700,
            }}>{totalAlerts}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {hasAlerts && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 10, padding: "3px 8px" }}
              onClick={dismissAll}
            >Dismiss All</button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!hasAlerts && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><CheckCircle size={36} style={{ color: "#10b981" }} /></div>
          <div className="text-sm" style={{ marginTop: 8, fontWeight: 600 }}>All caught up!</div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>No alerts need your attention right now.</div>
        </div>
      )}

      {/* ── Grouped alerts ── */}
      {hasAlerts && CATEGORY_ORDER.map(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return null;
        const info = CATEGORY_INFO[cat] || { label: cat, icon: <Bell size={14} /> };
        const isCollapsed = collapsed[cat];
        const critCount = items.filter(a => a.urgency === "critical").length;
        const warnCount = items.filter(a => a.urgency === "warning").length;

        return (
          <Fragment key={cat}>
            {/* Category header */}
            <div
              style={{
                padding: "10px 16px",
                background: "var(--bg3)",
                borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", userSelect: "none",
              }}
              onClick={() => toggleCategory(cat)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{info.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{info.label}</span>
                <span className="badge" style={{ fontSize: 10, background: "var(--bg)", padding: "1px 6px" }}>{items.length}</span>
                {critCount > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />}
                {warnCount > 0 && critCount === 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />}
              </div>
              <span style={{ fontSize: 10, color: "var(--text-muted)", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>{"\u25BC"}</span>
            </div>

            {/* Alert items */}
            {!isCollapsed && items.map(alert => {
              const colors = URGENCY_COLORS[alert.urgency] || URGENCY_COLORS.info;
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${colors.border}`,
                    background: colors.bg,
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{alert.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 12, cursor: "pointer", lineHeight: 1.3 }}
                      onClick={() => handleNav(alert)}
                    >
                      {alert.title}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2, lineHeight: 1.3 }}>{alert.message}</div>
                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {alert.action && (
                        <button
                          className="btn btn-sm"
                          style={{
                            fontSize: 10, padding: "2px 8px",
                            background: colors.dot, color: "#fff", border: "none", borderRadius: 4,
                          }}
                          onClick={(e) => handleAction(alert, e)}
                        >
                          {alert.action.label}
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: "2px 8px", color: "var(--text-muted)" }}
                        onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
