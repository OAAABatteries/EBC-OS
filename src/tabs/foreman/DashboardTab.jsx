import { Calendar, ClipboardList, Clock as ClockIcon } from "lucide-react";
import { PremiumCard, StatTile, AlertCard, FieldButton } from "../../components/field";

export function DashboardTab({
  clockEntry, isClockedIn, setForemanTab, pctUsed, hoursUsed,
  teamForProject, teamClocks, foremanAlerts,
  openPunchCount, pendingTmCount, productionLogs, areas,
  selectedProjectId, projectMatRequests,
  calendarEvents, upcomingEventCount, lang, t,
  setShowLaborEntry, setBulkLaborSelected,
}) {
  return (
    <div className="emp-content">
      {/* Clock status hero */}
      <PremiumCard
        variant="hero"
        className={`foreman-dashboard-clock-hero${isClockedIn ? " foreman-dashboard-clock-hero--active" : ""}`}
        onClick={() => setForemanTab("clock")}
        role="button"
        tabIndex={0}
      >
        <div className="foreman-dashboard-clock-status" style={{ color: isClockedIn ? "var(--green)" : "var(--text3)" }}>
          {isClockedIn ? t("ON CLOCK") : t("OFF CLOCK")}
        </div>
        <div className="foreman-dashboard-clock-value">
          {isClockedIn && clockEntry
            ? (() => { const ms = Date.now() - new Date(clockEntry.clockIn).getTime(); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m`; })()
            : "\u2014"}
        </div>
        <div className="foreman-dashboard-clock-hint">{t("TAP TO CLOCK IN/OUT")}</div>
      </PremiumCard>

      {/* KPI tiles row */}
      <div className="foreman-dashboard-stats">
        <StatTile label="BUDGET" value={pctUsed != null ? `${pctUsed}%` : "\u2014"} color={pctUsed > 90 ? "var(--accent)" : "var(--green)"} onTap={() => setForemanTab("hours")} t={t} />
        <StatTile label="HOURS" value={hoursUsed != null ? hoursUsed.toFixed(1) : "\u2014"} color="var(--text)" onTap={() => setForemanTab("hours")} t={t} />
        <StatTile label="CREW" value={teamForProject.length} color="var(--green)" onTap={() => setForemanTab("team")} t={t} />
      </div>

      {/* Quick Actions */}
      <div className="foreman-dashboard-actions">
        <FieldButton variant="primary" className="flex-1 foreman-action-btn foreman-action-btn--amber" onClick={() => {
            setForemanTab("team");
            setShowLaborEntry(true);
            const autoSelected = {};
            Object.keys(teamClocks).forEach(id => { autoSelected[id] = true; });
            if (Object.keys(autoSelected).length > 0) setBulkLaborSelected(autoSelected);
          }} t={t}>
          <ClockIcon size={16} /> {t("Enter Labor")}
        </FieldButton>
        <FieldButton variant="primary" className="flex-1 foreman-action-btn foreman-action-btn--blue" onClick={() => setForemanTab("reports")} t={t}>
          <ClipboardList size={16} /> {t("Daily Report")}
        </FieldButton>
      </div>
      <FieldButton variant="ghost" className="foreman-action-btn foreman-action-btn--full" onClick={() => setForemanTab("lookahead")} t={t}>
        <Calendar size={15} /> {t("Look-Ahead")} {upcomingEventCount > 0 && <span className="foreman-action-badge">{upcomingEventCount}</span>}
      </FieldButton>

      {/* Alerts feed */}
      {foremanAlerts.length > 0 && (
        <div className="foreman-dashboard-alerts">
          <div className="foreman-dashboard-section-label">{t("ALERTS")}</div>
          <div className="foreman-dashboard-alerts-list">
            {foremanAlerts.slice(0, 3).map((alert, i) => (
              <AlertCard key={i} type={alert.type} message={alert.message} timestamp={alert.timestamp} onTap={() => setForemanTab(alert.navigateTo || "team")} t={t} />
            ))}
          </div>
          {foremanAlerts.length > 3 && (
            <button className="foreman-dashboard-view-all" onClick={() => setForemanTab("team")}>
              {t("View All")}
            </button>
          )}
        </div>
      )}

      {/* Today's Activity Summary */}
      <div className="frm-mt-30">
        <div className="foreman-dashboard-section-label">{t("TODAY'S ACTIVITY")}</div>
        <div className="frm-activity-grid">
          <div className="frm-activity-tile">
            <div className="frm-activity-value" style={{ color: "var(--red)" }}>{openPunchCount}</div>
            <div className="text-xs text-muted">{t("Open Punch")}</div>
          </div>
          <div className="frm-activity-tile">
            <div className="frm-activity-value frm-amber">{pendingTmCount}</div>
            <div className="text-xs text-muted">{t("Pending T&M")}</div>
          </div>
          <div className="frm-activity-tile">
            <div className="frm-activity-value" style={{ color: "var(--green)" }}>
              {(productionLogs || []).filter(pl => String(pl.projectId) === String(selectedProjectId) && pl.status !== "deleted" && (pl.date === new Date().toISOString().slice(0,10) || (pl.createdAt && pl.createdAt.startsWith(new Date().toISOString().slice(0,10))))).length}
            </div>
            <div className="text-xs text-muted">{t("Production Today")}</div>
          </div>
          <div className="frm-activity-tile">
            <div className="frm-activity-value" style={{ color: "var(--blue)" }}>
              {projectMatRequests.filter(r => r.status === "approved" || r.status === "in-transit").length}
            </div>
            <div className="text-xs text-muted">{t("Deliveries Pending")}</div>
          </div>
        </div>
        {/* Look-ahead preview */}
        {(() => {
          const upcoming = (calendarEvents || [])
            .filter(ev => {
              const evDate = new Date(ev.date || ev.start);
              const today = new Date(); today.setHours(0,0,0,0);
              const inThreeDays = new Date(today); inThreeDays.setDate(inThreeDays.getDate() + 3);
              return evDate >= today && evDate < inThreeDays && (!ev.projectId || String(ev.projectId) === String(selectedProjectId));
            })
            .slice(0, 4);
          if (upcoming.length === 0) return null;
          return (
            <div className="frm-mt-12">
              <div className="text-xs font-bold mb-4">{t("Upcoming")}</div>
              {upcoming.map((ev, i) => (
                <div key={i} className="text-xs frm-flex-between" style={{ padding: "var(--space-1) 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{ev.title || ev.type}</span>
                  <span className="text-muted">{new Date(ev.date || ev.start).toLocaleDateString(lang === "es" ? "es" : "en", { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
