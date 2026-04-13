import { HardHat, AlertTriangle, CheckSquare, Square } from "lucide-react";

export function SiteTab({
  todayLog, LOGISTICS_ITEMS, logCheckedCount, criticalUnchecked,
  siteLogistics, saveSiteLogistics, projLogKey, today,
  selectedProjectId, show, t,
}) {
  return (
    <div className="emp-content">
      <div className="section-header frm-mb-12">
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <HardHat size={18} className="frm-amber" />
          <div>
            <div className="section-title frm-section-title-md">{t("Site Logistics")}</div>
            <div className="text-xs text-muted">{t("Daily checklist")} · {today}</div>
          </div>
        </div>
        <span className={`badge ${logCheckedCount === LOGISTICS_ITEMS.length ? "badge-green" : logCheckedCount > 0 ? "badge-amber" : "badge-red"} frm-font-11`}>
          {logCheckedCount}/{LOGISTICS_ITEMS.length}
        </span>
      </div>

      {criticalUnchecked.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)", borderRadius: "var(--radius-control)", padding: "var(--space-3) var(--space-3)", marginBottom: "var(--space-3)" }}>
          <div className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
            <AlertTriangle size={14} style={{ color: "var(--red)" }} />
            <span className="text-sm font-semi" style={{ color: "var(--red)" }}>{t("Critical items need attention — PM notified")}</span>
          </div>
          {criticalUnchecked.map(i => (
            <div key={i.id} className="text-xs text-muted" style={{ marginLeft: 22 }}>{"\u2022"} {i.label}</div>
          ))}
        </div>
      )}

      <div className="flex-col gap-6">
        {LOGISTICS_ITEMS.map(item => {
          const checked = !!todayLog[item.id];
          return (
            <div key={item.id} style={{ background: checked ? "rgba(16,185,129,0.07)" : item.critical && !checked ? "rgba(239,68,68,0.04)" : "var(--card)", border: `1px solid ${checked ? "var(--green)" : item.critical && !checked ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-control)", padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}
              onClick={() => {
                const updated = {
                  ...siteLogistics,
                  [projLogKey]: { ...todayLog, [item.id]: !checked, date: today, projectId: selectedProjectId },
                };
                saveSiteLogistics(updated);
                if (item.critical && checked) {
                  show(`\u26A0\uFE0F ${item.label} — unchecked. PM alerted.`, "warn");
                } else if (!checked) {
                  show(`\u2713 ${item.label}`, "ok");
                }
              }}
            >
              {checked ? <CheckSquare size={20} style={{ color: "var(--green)", flexShrink: 0 }} /> : <Square size={20} style={{ color: "var(--text3)", flexShrink: 0 }} />}
              <span className="frm-font-20">{item.icon}</span>
              <div className="frm-flex-1">
                <span className="text-sm" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{item.label}</span>
                {item.critical && !checked && (
                  <span className="badge badge-red" style={{ fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>Critical</span>
                )}
              </div>
              <span className={`badge ${checked ? "badge-green" : item.critical ? "badge-red" : "badge-muted"} frm-font-10`}>
                {checked ? "OK" : item.critical ? "Needed" : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
