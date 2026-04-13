import { Calendar, ClipboardList, Clock as ClockIcon } from "lucide-react";
import { PremiumCard, StatTile, AlertCard, FieldButton } from "../../components/field";

export function DashboardTab({
  clockEntry, isClockedIn, setForemanTab, pctUsed, hoursUsed,
  teamForProject, teamClocks, foremanAlerts,
  openPunchCount, pendingTmCount, productionLogs, areas,
  selectedProjectId, projectMatRequests,
  calendarEvents, upcomingEventCount, teamSchedule, projects,
  lang, t,
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

      {/* 7.4 — Tomorrow Preview Card */}
      {(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = ['sun','mon','tue','wed','thu','fri','sat'][tomorrow.getDay()];
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
        const tomorrowCrew = (teamSchedule || []).filter(s => s.days?.[tomorrowKey] && String(s.projectId) === String(selectedProjectId));
        const tomorrowEvents = (calendarEvents || []).filter(e => e.date === tomorrowStr);
        if (tomorrowCrew.length === 0 && tomorrowEvents.length === 0) return null;
        const employees = (projects || []).length > 0 ? [] : []; // placeholder — crew names come from schedule
        return (
          <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-3)', borderLeft: '3px solid var(--accent, #3b82f6)' }}>
            <div style={{ fontSize: 'var(--text-label)', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-1)' }}>
              {t("Tomorrow")} — {tomorrow.toLocaleDateString(lang === 'es' ? 'es' : 'en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {tomorrowCrew.length > 0 && (
              <div style={{ fontSize: 'var(--text-secondary)', color: 'var(--text)', marginBottom: 'var(--space-1)' }}>
                {tomorrowCrew.length} {t("crew scheduled")}
              </div>
            )}
            {tomorrowEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-1) 0' }}>
                <span style={{ width: 4, height: 16, borderRadius: 2, background: ev.type === 'inspection' ? 'var(--red)' : ev.type === 'delivery' ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-label)', color: 'var(--text)' }}>{ev.title}</span>
                {ev.startTime && <span style={{ fontSize: 'var(--text-tab)', color: 'var(--text3)', marginLeft: 'auto' }}>{ev.startTime}</span>}
              </div>
            ))}
          </div>
        );
      })()}

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

      {/* Area Progress Summary */}
      {(() => {
        const projAreas = (areas || []).filter(a => String(a.projectId) === String(selectedProjectId));
        if (projAreas.length === 0) return null;
        const avgPct = Math.round(projAreas.reduce((sum, a) => {
          const items = a.scopeItems || [];
          let inst = 0, bud = 0;
          items.forEach(s => { inst += s.installedQty || 0; bud += s.budgetQty || 0; });
          return sum + (bud > 0 ? (inst / bud) * 100 : (a.progressPct || 0));
        }, 0) / projAreas.length);
        const complete = projAreas.filter(a => {
          const items = a.scopeItems || [];
          let inst = 0, bud = 0;
          items.forEach(s => { inst += s.installedQty || 0; bud += s.budgetQty || 0; });
          return bud > 0 ? inst >= bud : (a.progressPct || 0) >= 100;
        }).length;
        return (
          <div className="frm-mt-12" style={{ cursor: "pointer" }} onClick={() => setForemanTab("production")}>
            <div className="foreman-dashboard-section-label">{t("AREA PROGRESS")}</div>
            <div className="flex gap-sp3 mb-sp2">
              <div className="flex-1 rounded-control bg-bg3 p-sp3 text-center">
                <div className="fs-subtitle fw-bold c-amber">{avgPct}%</div>
                <div className="fs-tab c-text3">{t("Overall")}</div>
              </div>
              <div className="flex-1 rounded-control bg-bg3 p-sp3 text-center">
                <div className="fs-subtitle fw-bold c-green">{complete}/{projAreas.length}</div>
                <div className="fs-tab c-text3">{t("Complete")}</div>
              </div>
            </div>
            {/* Mini progress bars for top 4 areas */}
            {projAreas.slice(0, 4).map(a => {
              const items = a.scopeItems || [];
              let inst = 0, bud = 0;
              items.forEach(s => { inst += s.installedQty || 0; bud += s.budgetQty || 0; });
              const pct = bud > 0 ? Math.round((inst / bud) * 100) : (a.progressPct || 0);
              return (
                <div key={a.id} className="flex gap-sp2 mb-sp1" style={{ alignItems: "center" }}>
                  <span className="fs-tab c-text2 truncate" style={{ width: 90 }}>{a.name}</span>
                  <div className="flex-1 rounded-pill overflow-hidden" style={{ height: 5, background: "var(--bg4)" }}>
                    <div className="h-full rounded-pill" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "var(--green)" : "var(--amber)", transition: "width 0.3s" }} />
                  </div>
                  <span className="fs-tab fw-semi" style={{ minWidth: 32, textAlign: "right", color: pct >= 100 ? "var(--green)" : "var(--text2)" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Today's Activity Summary */}
      <div className="frm-mt-30">
        <div className="foreman-dashboard-section-label">{t("TODAY'S ACTIVITY")}</div>
        <div className="frm-activity-grid">
          <div className="frm-activity-tile">
            <div className="frm-activity-value c-red">{openPunchCount}</div>
            <div className="text-xs text-muted">{t("Open Punch")}</div>
          </div>
          <div className="frm-activity-tile">
            <div className="frm-activity-value frm-amber">{pendingTmCount}</div>
            <div className="text-xs text-muted">{t("Pending T&M")}</div>
          </div>
          <div className="frm-activity-tile">
            <div className="frm-activity-value c-green">
              {(productionLogs || []).filter(pl => String(pl.projectId) === String(selectedProjectId) && pl.status !== "deleted" && (pl.date === new Date().toISOString().slice(0,10) || (pl.createdAt && pl.createdAt.startsWith(new Date().toISOString().slice(0,10))))).length}
            </div>
            <div className="text-xs text-muted">{t("Production Today")}</div>
          </div>
          <div className="frm-activity-tile">
            <div className="frm-activity-value c-blue">
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
                <div key={i} className="text-xs frm-flex-between border-b" style={{ padding: "var(--space-1) 0" }}>
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
