export function HoursTab({
  allocatedHours, hoursUsed, hoursRemaining, pctUsed, budgetColor,
  weeklyBurnHours, teamForProject, fmtHours, t,
}) {
  return (
    <div className="emp-content">
      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("Hours")}</div>
      </div>

      {/* Summary card */}
      <div className="foreman-kpi-card frm-mb-16">
        <div className="frm-flex-between frm-mb-8">
          <div>
            <div className="foreman-kpi-label">{t("Allocated Hours")}</div>
            <div className="foreman-kpi-value frm-font-20">{allocatedHours.toLocaleString()} {t("hrs")}</div>
          </div>
          <div className="frm-text-right">
            <div className="foreman-kpi-label">{t("Hours Used")}</div>
            <div className="foreman-kpi-value fs-subtitle" style={{ color: budgetColor }}>{hoursUsed.toFixed(1)} {t("hrs")}</div>
          </div>
        </div>
        <div className="foreman-budget-bar">
          <div className="foreman-budget-fill"
            style={{ width: `${Math.min(pctUsed, 100)}%`, background: budgetColor }} />
        </div>
        <div className="frm-flex-between">
          <span className="text-xs text-muted">{t("Hours Remaining")}: <b style={{ color: hoursRemaining < 0 ? "var(--red)" : "var(--green)" }}>{hoursRemaining.toFixed(1)} {t("hrs")}</b></span>
          <span className="text-xs text-muted">{t("Burn Rate")}: <b className="frm-amber">{weeklyBurnHours.toFixed(1)} {t("hrs")}</b> {t("per week")}</span>
        </div>
      </div>

      {/* Per-employee hours breakdown */}
      <div className="section-header mb-8">
        <div className="section-title frm-font-14">{t("Crew Members")}</div>
      </div>
      {teamForProject.length === 0 ? (
        <div className="text-sm text-muted">{t("No team assigned")}</div>
      ) : (
        <div className="foreman-kpi-card">
          <div className="foreman-cost-row foreman-table-header">
            <span className="foreman-cell--name">{t("Crew")}</span>
            <span className="foreman-cell">{t("Role")}</span>
            <span className="foreman-cell">{t("Hours Today")}</span>
            <span className="foreman-cell">{t("Hours This Week")}</span>
          </div>
          {teamForProject.map(c => (
            <div key={c.id} className="foreman-cost-row">
              <span className="foreman-cell--name">{c.name}</span>
              <span className="foreman-cell text-xs text-muted">{t(c.role)}</span>
              <span className="foreman-cell foreman-cell--mono">{fmtHours(c.todayHours)}</span>
              <span className="foreman-cell foreman-cell--accent">{fmtHours(c.weekHours)}</span>
            </div>
          ))}
          <div className="foreman-cost-row foreman-table-total">
            <span className="foreman-cell--name">Total</span>
            <span className="foreman-cell"></span>
            <span className="foreman-cell foreman-cell--mono">
              {fmtHours(teamForProject.reduce((s, c) => s + c.todayHours, 0))}
            </span>
            <span className="foreman-cell foreman-cell--accent">
              {fmtHours(teamForProject.reduce((s, c) => s + c.weekHours, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
