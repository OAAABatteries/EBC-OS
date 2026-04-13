import { useState, Fragment } from "react";
import { BarChart2, Building2, HardHat, Bell, CheckCircle, Award, Mail, AlertTriangle, Edit, Clipboard, TrendingDown, FileText, DollarSign, Package, Clock } from "lucide-react";

const ALERT_ICONS = {
  award: <Award size={16} />,
  mail: <Mail size={16} />,
  alert: <AlertTriangle size={16} />,
  edit: <Edit size={16} />,
  clipboard: <Clipboard size={16} />,
  "trending-down": <TrendingDown size={16} />,
  file: <FileText size={16} />,
  dollar: <DollarSign size={16} />,
  package: <Package size={16} />,
  clock: <Clock size={16} />,
};

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
  team: { label: "Crew / HR", icon: <HardHat size={14} /> },
};

const CATEGORY_ORDER = ["bids", "projects", "team"];

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
      className="rounded-control bg-bg2" style={{ position: "fixed", top: 54, right: 8,
        width: Math.min(400, window.innerWidth - 16),
        maxHeight: "calc(100vh - 70px)",
        overflowY: "auto",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        zIndex: 9999,
        padding: 0 }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div className="border-b bg-bg2" style={{ padding: "var(--space-4) var(--space-4)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 1 }}>
        <div className="flex gap-sp2">
          <span className="fs-secondary fw-bold">Alerts</span>
          {totalAlerts > 0 && (
            <span className="rounded-control fw-bold fs-tab c-white" style={{ background: "var(--red)",
              padding: "var(--space-1) var(--space-2)" }}>{totalAlerts}</span>
          )}
        </div>
        <div className="gap-sp2" style={{ display: "flex" }}>
          {hasAlerts && (
            <button
              className="btn btn-ghost fs-xs" style={{ padding: "var(--space-1) var(--space-2)" }}
              onClick={dismissAll}
            >Dismiss All</button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!hasAlerts && (
        <div className="p-sp10 text-center">
          <div className="justify-center" style={{ display: "flex" }}><CheckCircle size={36} className="c-green" /></div>
          <div className="text-sm fw-semi mt-sp2">All caught up!</div>
          <div className="text-xs text-muted mt-sp1">No alerts need your attention right now.</div>
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
              className="border-b bg-bg3 cursor-pointer" style={{ padding: "var(--space-3) var(--space-4)",
                display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
              onClick={() => toggleCategory(cat)}
            >
              <div className="flex gap-sp2">
                <span className="fs-secondary">{info.icon}</span>
                <span className="fw-semi fs-label uppercase" style={{ letterSpacing: 0.5 }}>{info.label}</span>
                <span className="badge fs-xs" style={{ background: "var(--bg)", padding: "var(--space-1) var(--space-2)" }}>{items.length}</span>
                {critCount > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />}
                {warnCount > 0 && critCount === 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />}
              </div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>{"\u25BC"}</span>
            </div>

            {/* Alert items */}
            {!isCollapsed && items.map(alert => {
              const colors = URGENCY_COLORS[alert.urgency] || URGENCY_COLORS.info;
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${colors.border}`,
                    background: colors.bg,
                    display: "flex", gap: "var(--space-3)", alignItems: "flex-start",
                  }}
                >
                  <span className="mt-sp1 flex-shrink-0">{ALERT_ICONS[alert.icon] || <Bell size={16} />}</span>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div
                      className="fw-semi fs-label cursor-pointer" style={{ lineHeight: 1.3 }}
                      onClick={() => handleNav(alert)}
                    >
                      {alert.title}
                    </div>
                    <div className="text-xs text-muted mt-sp1" style={{ lineHeight: 1.3 }}>{alert.message}</div>
                    {/* Action buttons */}
                    <div className="mt-sp2 gap-sp2 flex-wrap" style={{ display: "flex" }}>
                      {alert.action && (
                        <button
                          className="btn btn-sm rounded-control fs-xs c-white" style={{ padding: "var(--space-1) var(--space-2)",
                            background: colors.dot, border: "none" }}
                          onClick={(e) => handleAction(alert, e)}
                        >
                          {alert.action.label}
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm fs-xs" style={{ padding: "var(--space-1) var(--space-2)", color: "var(--text-muted)" }}
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
