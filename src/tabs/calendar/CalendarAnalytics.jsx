import { useState, useMemo } from "react";
import { BarChart2 } from "lucide-react";
import { T } from "../../data/translations";

// ═══════════════════════════════════════════════════════════
//  CalendarAnalytics — Scheduling analytics & forecasts
//  Overtime forecast, capacity planning, utilization,
//  historical durations, burn rate
// ═══════════════════════════════════════════════════════════

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getMonday(d) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0, 0, 0, 0); return r;
}
function parseHours(start, end) {
  if (!start || !end) return 8;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CalendarAnalytics({ app, lang }) {
  const {
    teamSchedule, employees, projects, timeEntries,
    schedule, equipmentBookings, equipment, show,
  } = app;

  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);
  const [analyticsView, setAnalyticsView] = useState("overview");

  // ── AI Workforce Insights state ──
  const [wfResult, setWfResult] = useState(null);
  const [wfLoading, setWfLoading] = useState(false);
  const [showWf, setShowWf] = useState(false);

  const monday = getMonday(new Date());

  // ── Weekly hours per employee (next 4 weeks) ──
  const weeklyData = useMemo(() => {
    const result = [];
    for (let w = 0; w < 4; w++) {
      const weekStart = addDays(monday, w * 7);
      const weekStr = toStr(weekStart);
      const entries = (teamSchedule || []).filter(cs => cs.weekStart === weekStr);

      const byEmployee = {};
      for (const cs of entries) {
        if (!byEmployee[cs.employeeId]) byEmployee[cs.employeeId] = 0;
        const days = DAY_KEYS.filter(k => cs.days?.[k]).length;
        byEmployee[cs.employeeId] += days * parseHours(cs.hours?.start, cs.hours?.end);
      }

      const empHours = Object.entries(byEmployee).map(([id, hours]) => ({
        empId: Number(id),
        name: (employees || []).find(e => String(e.id) === String(id))?.name || `#${id}`,
        hours,
        overtime: Math.max(0, hours - 40),
      }));

      result.push({
        weekStr,
        label: `${MONTH_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}`,
        totalHours: empHours.reduce((s, e) => s + e.hours, 0),
        totalOT: empHours.reduce((s, e) => s + e.overtime, 0),
        empHours: empHours.sort((a, b) => b.hours - a.hours),
        teamSize: empHours.length,
      });
    }
    return result;
  }, [monday, teamSchedule, employees]);

  // ── Project utilization ──
  const projectUtil = useMemo(() => {
    const weekStr = toStr(monday);
    const entries = (teamSchedule || []).filter(cs => cs.weekStart === weekStr);
    const byProject = {};
    for (const cs of entries) {
      if (!byProject[cs.projectId]) byProject[cs.projectId] = { hours: 0, team: new Set() };
      const days = DAY_KEYS.filter(k => cs.days?.[k]).length;
      byProject[cs.projectId].hours += days * parseHours(cs.hours?.start, cs.hours?.end);
      byProject[cs.projectId].team.add(cs.employeeId);
    }
    return Object.entries(byProject).map(([pid, data]) => {
      const proj = (projects || []).find(p => String(p.id) === String(pid));
      return {
        projectId: Number(pid),
        name: proj?.name || `#${pid}`,
        hours: data.hours,
        team: data.team.size,
        laborHours: proj?.laborHours || 0,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [monday, teamSchedule, projects]);

  // ── Crew availability ──
  const availability = useMemo(() => {
    const active = (employees || []).filter(e => e.active);
    const weekStr = toStr(monday);
    const scheduled = new Set();
    for (const cs of (teamSchedule || [])) {
      if (cs.weekStart === weekStr) scheduled.add(cs.employeeId);
    }
    return {
      total: active.length,
      scheduled: scheduled.size,
      available: active.length - scheduled.size,
      utilization: active.length > 0 ? Math.round((scheduled.size / active.length) * 100) : 0,
    };
  }, [employees, teamSchedule, monday]);

  // ── Equipment utilization ──
  const eqUtil = useMemo(() => {
    const today = toStr(new Date());
    const total = (equipment || []).length;
    const inUse = (equipmentBookings || []).filter(b =>
      b.status === "confirmed" && b.startDate <= today && b.endDate >= today
    ).length;
    return { total, inUse, available: total - inUse, utilization: total > 0 ? Math.round((inUse / total) * 100) : 0 };
  }, [equipment, equipmentBookings]);

  const runWorkforceInsights = async () => {
    if (!app.apiKey) { show("Set API key in Settings first"); return; }
    setWfLoading(true);
    setWfResult(null);
    try {
      const { analyzeWorkforceMetrics } = await import("../../utils/api.js");
      const res = await analyzeWorkforceMetrics(app.apiKey, weeklyData, availability, projectUtil, eqUtil);
      setWfResult(res);
      setShowWf(true);
      show("Workforce analysis complete");
    } catch (e) {
      show(e.message);
    } finally {
      setWfLoading(false);
    }
  };

  // ── Simple bar renderer ──
  const Bar = ({ value, max, color, label }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
      <div className="mb-sp2">
        <div className="mb-sp1 fs-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{label}</span>
          <span className="c-text3">{value.toFixed(0)}h</span>
        </div>
        <div className="rounded-control bg-bg3 overflow-hidden" style={{ height: 6 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
        </div>
      </div>
    );
  };

  return (
    <div className="cal-analytics">
      {/* Sub-nav */}
      <div className="cal-pto-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="gap-sp1" style={{ display: "flex" }}>
          {[
            { key: "overview", label: "Overview" },
            { key: "overtime", label: "OT Forecast" },
            { key: "capacity", label: "Capacity" },
            { key: "projects", label: "By Project" },
          ].map(item => (
            <button key={item.key} className={`cal-nav-btn${analyticsView === item.key ? " active" : ""}`} onClick={() => setAnalyticsView(item.key)}>
              {t(item.label)}
            </button>
          ))}
        </div>
        <button className="primary fs-tab" style={{ padding: "var(--space-1) var(--space-3)" }} onClick={wfLoading ? undefined : () => showWf ? setShowWf(false) : wfResult ? setShowWf(true) : runWorkforceInsights()} disabled={wfLoading}>
          {wfLoading ? "Analyzing..." : "AI Insights"}
        </button>
      </div>

      {/* AI Workforce Insights Panel */}
      {showWf && wfResult && (
        <div className="mb-sp4 p-sp4" style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div className="mb-sp3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="flex gap-sp3">
              <BarChart2 style={{ width: 22, height: 22 }} />
              <div>
                <div className="fs-secondary fw-bold">Workforce Score: {wfResult.insightScore}/100 ({wfResult.grade})</div>
                <div className="fs-label c-text3">{wfResult.summary}</div>
              </div>
            </div>
            <button className="fs-card c-text3 cursor-pointer" style={{ background: "none", border: "none" }} onClick={() => setShowWf(false)}>✕</button>
          </div>

          {wfResult.laborEfficiency && (
            <div className="mb-sp3" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
              <div className="fw-semi mb-sp1 fs-label c-blue">Labor Efficiency</div>
              <div className="fs-label gap-sp4" style={{ display: "flex" }}>
                <span>Score: <strong>{wfResult.laborEfficiency.score}</strong></span>
                <span>Trend: <strong style={{ color: wfResult.laborEfficiency.trend === "improving" ? "var(--green)" : wfResult.laborEfficiency.trend === "declining" ? "var(--red)" : "var(--text2)" }}>{wfResult.laborEfficiency.trend}</strong></span>
              </div>
              <div className="fs-tab mt-sp1 c-text3">{wfResult.laborEfficiency.insight}</div>
            </div>
          )}

          {wfResult.overtimeAnalysis && (
            <div className="mb-sp3" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius)" }}>
              <div className="fw-semi mb-sp1 fs-label c-red">Overtime Analysis</div>
              <div className="fs-label">
                This week: <strong>{wfResult.overtimeAnalysis.currentWeekOT}h</strong> · Monthly projected: <strong>{wfResult.overtimeAnalysis.projectedMonthOT}h</strong> · Impact: {wfResult.overtimeAnalysis.costImpact}
              </div>
              <div className="fs-tab mt-sp1 c-text3">{wfResult.overtimeAnalysis.recommendation}</div>
            </div>
          )}

          {wfResult.staffingGaps?.length > 0 && (
            <div className="mb-sp3">
              <div className="fw-semi mb-sp2 fs-label c-amber">Staffing Gaps</div>
              {wfResult.staffingGaps.map((g, i) => (
                <div key={i} style={{ fontSize: "var(--text-label)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)", borderLeft: `3px solid ${g.urgency === "critical" ? "#ef4444" : g.urgency === "moderate" ? "#f59e0b" : "#6b7280"}` }}>
                  <span className="fw-medium">{g.area}:</span> {g.gap} — <em>{g.action}</em>
                </div>
              ))}
            </div>
          )}

          {wfResult.strategicRecommendations?.length > 0 && (
            <div>
              <div className="fw-semi mb-sp2 fs-label c-green">Strategic Recommendations</div>
              {wfResult.strategicRecommendations.map((r, i) => (
                <div key={i} className="mb-sp1 fs-label" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
                  <span><strong>{r.title}:</strong> {r.detail}</span>
                  <span style={{ fontSize: "var(--text-xs)", color: r.impact === "high" ? "var(--red)" : r.impact === "medium" ? "#f59e0b" : "var(--text3)", whiteSpace: "nowrap", marginLeft: "var(--space-2)" }}>{r.impact}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Overview ── */}
      {analyticsView === "overview" && (
        <div>
          <div className="cal-lookahead-kpis mb-sp4">
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{availability.utilization}%</div>
              <div className="cal-lookahead-kpi-lbl">{t("Crew Utilization")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{availability.available}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Available")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{eqUtil.utilization}%</div>
              <div className="cal-lookahead-kpi-lbl">{t("Equip. Util.")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val" style={{ color: weeklyData[0]?.totalOT > 0 ? "#ef4444" : "var(--text)" }}>
                {weeklyData[0]?.totalOT.toFixed(0) || 0}h
              </div>
              <div className="cal-lookahead-kpi-lbl">{t("OT This Week")}</div>
            </div>
          </div>

          {/* Weekly hours trend */}
          <div className="cal-lookahead-section-title mt-sp4">{t("4-Week Hours Trend")}</div>
          <div className="mt-sp2 gap-sp3" style={{ display: "flex" }}>
            {weeklyData.map((w, i) => (
              <div key={i} className="text-center flex-1">
                <div className="flex-col" style={{ height: 100, justifyContent: "flex-end", alignItems: "center" }}>
                  {w.totalOT > 0 && (
                    <div style={{
                      width: "60%", height: `${Math.min(80, w.totalOT / 2)}px`,
                      background: "rgba(239,68,68,0.4)", borderRadius: "4px 4px 0 0",
                    }} title={`OT: ${w.totalOT.toFixed(0)}h`} />
                  )}
                  <div style={{
                    width: "60%", height: `${Math.min(80, (w.totalHours - w.totalOT) / 4)}px`,
                    background: "var(--accent)", borderRadius: w.totalOT > 0 ? "0" : "4px 4px 0 0",
                    opacity: 0.7,
                  }} title={`Regular: ${(w.totalHours - w.totalOT).toFixed(0)}h`} />
                </div>
                <div className="fs-tab mt-sp1 c-text2">{w.label}</div>
                <div className="fs-xs c-text3">{w.totalHours.toFixed(0)}h</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── OT Forecast ── */}
      {analyticsView === "overtime" && (
        <div>
          <div className="cal-lookahead-section-title">{t("Overtime Forecast — Next 4 Weeks")}</div>
          {weeklyData.map((w, wi) => (
            <div key={wi} className="cal-lookahead-card mb-sp3">
              <div className="cal-lookahead-header">
                <div>
                  <div className="cal-lookahead-week-label">{w.label}</div>
                  <div className="fs-tab c-text3">
                    {w.teamSize} {t("team")} · {w.totalHours.toFixed(0)} {t("total hrs")} · {w.totalOT.toFixed(0)} {t("OT hrs")}
                  </div>
                </div>
                {w.totalOT > 0 && <span className="fw-semi fs-label c-red">{w.totalOT.toFixed(0)}h OT</span>}
              </div>
              {w.empHours.filter(e => e.hours > 0).map(e => (
                <Bar
                  key={e.empId}
                  value={e.hours}
                  max={50}
                  color={e.overtime > 0 ? "#ef4444" : "var(--accent)"}
                  label={e.name}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Capacity ── */}
      {analyticsView === "capacity" && (
        <div>
          <div className="cal-lookahead-section-title">{t("Crew Capacity")}</div>
          <div className="cal-lookahead-kpis mb-sp4">
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{availability.total}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Total Active")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val" style={{ color: "var(--accent)" }}>{availability.scheduled}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Scheduled")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val c-green">{availability.available}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Available")}</div>
            </div>
          </div>

          <div className="cal-lookahead-section-title mt-sp4">{t("Equipment Capacity")}</div>
          <div className="cal-lookahead-kpis">
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{eqUtil.total}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Total")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val c-cyan">{eqUtil.inUse}</div>
              <div className="cal-lookahead-kpi-lbl">{t("In Use")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val c-green">{eqUtil.available}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Available")}</div>
            </div>
          </div>

          {/* Max capacity by week */}
          <div className="cal-lookahead-section-title mt-sp6">{t("Weekly Capacity Allocation")}</div>
          {weeklyData.map((w, i) => {
            const maxHrs = availability.total * 40;
            const pct = maxHrs > 0 ? Math.round((w.totalHours / maxHrs) * 100) : 0;
            return (
              <div key={i} className="mb-sp2">
                <div className="mb-sp1 fs-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{w.label}</span>
                  <span style={{ color: pct > 90 ? "#ef4444" : "var(--text3)" }}>{pct}% ({w.totalHours.toFixed(0)}/{maxHrs}h)</span>
                </div>
                <div className="rounded-control bg-bg3 overflow-hidden" style={{ height: 8 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "var(--accent)", borderRadius: "var(--radius-control)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── By Project ── */}
      {analyticsView === "projects" && (
        <div>
          <div className="cal-lookahead-section-title">{t("Project Resource Allocation — This Week")}</div>
          {projectUtil.length === 0 && (
            <div className="fs-label p-sp4 c-text3">{t("No team scheduled this week")}</div>
          )}
          {projectUtil.map(p => (
            <div key={p.projectId} className="cal-lookahead-card mb-sp3">
              <div className="fw-semi mb-sp1 fs-label">{p.name}</div>
              <div className="mb-sp2 fs-label c-text3 gap-sp4" style={{ display: "flex" }}>
                <span>{p.team} {t("team")}</span>
                <span>{p.hours.toFixed(0)} {t("hrs this week")}</span>
                {p.laborHours > 0 && <span>{p.laborHours} {t("total allocated")}</span>}
              </div>
              {p.laborHours > 0 && (
                <Bar value={p.hours} max={p.laborHours} color="var(--accent)" label={`${Math.round((p.hours / p.laborHours) * 100)}% ${t("of total budget")}`} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
