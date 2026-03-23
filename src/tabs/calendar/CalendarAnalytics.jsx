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
    crewSchedule, employees, projects, timeEntries,
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
      const entries = (crewSchedule || []).filter(cs => cs.weekStart === weekStr);

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
        crewCount: empHours.length,
      });
    }
    return result;
  }, [monday, crewSchedule, employees]);

  // ── Project utilization ──
  const projectUtil = useMemo(() => {
    const weekStr = toStr(monday);
    const entries = (crewSchedule || []).filter(cs => cs.weekStart === weekStr);
    const byProject = {};
    for (const cs of entries) {
      if (!byProject[cs.projectId]) byProject[cs.projectId] = { hours: 0, crew: new Set() };
      const days = DAY_KEYS.filter(k => cs.days?.[k]).length;
      byProject[cs.projectId].hours += days * parseHours(cs.hours?.start, cs.hours?.end);
      byProject[cs.projectId].crew.add(cs.employeeId);
    }
    return Object.entries(byProject).map(([pid, data]) => {
      const proj = (projects || []).find(p => String(p.id) === String(pid));
      return {
        projectId: Number(pid),
        name: proj?.name || `#${pid}`,
        hours: data.hours,
        crew: data.crew.size,
        laborHours: proj?.laborHours || 0,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [monday, crewSchedule, projects]);

  // ── Crew availability ──
  const availability = useMemo(() => {
    const active = (employees || []).filter(e => e.active);
    const weekStr = toStr(monday);
    const scheduled = new Set();
    for (const cs of (crewSchedule || [])) {
      if (cs.weekStart === weekStr) scheduled.add(cs.employeeId);
    }
    return {
      total: active.length,
      scheduled: scheduled.size,
      available: active.length - scheduled.size,
      utilization: active.length > 0 ? Math.round((scheduled.size / active.length) * 100) : 0,
    };
  }, [employees, crewSchedule, monday]);

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
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
          <span>{label}</span>
          <span style={{ color: "var(--text3)" }}>{value.toFixed(0)}h</span>
        </div>
        <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      </div>
    );
  };

  return (
    <div className="cal-analytics">
      {/* Sub-nav */}
      <div className="cal-pto-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
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
        <button className="primary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={wfLoading ? undefined : () => showWf ? setShowWf(false) : wfResult ? setShowWf(true) : runWorkforceInsights()} disabled={wfLoading}>
          {wfLoading ? "Analyzing..." : "AI Insights"}
        </button>
      </div>

      {/* AI Workforce Insights Panel */}
      {showWf && wfResult && (
        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BarChart2 style={{ width: 22, height: 22 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Workforce Score: {wfResult.insightScore}/100 ({wfResult.grade})</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{wfResult.summary}</div>
              </div>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)" }} onClick={() => setShowWf(false)}>✕</button>
          </div>

          {wfResult.laborEfficiency && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 4 }}>Labor Efficiency</div>
              <div style={{ fontSize: 12, display: "flex", gap: 16 }}>
                <span>Score: <strong>{wfResult.laborEfficiency.score}</strong></span>
                <span>Trend: <strong style={{ color: wfResult.laborEfficiency.trend === "improving" ? "var(--green)" : wfResult.laborEfficiency.trend === "declining" ? "var(--red)" : "var(--text2)" }}>{wfResult.laborEfficiency.trend}</strong></span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{wfResult.laborEfficiency.insight}</div>
            </div>
          )}

          {wfResult.overtimeAnalysis && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 4 }}>Overtime Analysis</div>
              <div style={{ fontSize: 12 }}>
                This week: <strong>{wfResult.overtimeAnalysis.currentWeekOT}h</strong> · Monthly projected: <strong>{wfResult.overtimeAnalysis.projectedMonthOT}h</strong> · Impact: {wfResult.overtimeAnalysis.costImpact}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{wfResult.overtimeAnalysis.recommendation}</div>
            </div>
          )}

          {wfResult.staffingGaps?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 6 }}>Staffing Gaps</div>
              {wfResult.staffingGaps.map((g, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)", borderLeft: `3px solid ${g.urgency === "critical" ? "#ef4444" : g.urgency === "moderate" ? "#f59e0b" : "#6b7280"}` }}>
                  <span style={{ fontWeight: 500 }}>{g.area}:</span> {g.gap} — <em>{g.action}</em>
                </div>
              ))}
            </div>
          )}

          {wfResult.strategicRecommendations?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>Strategic Recommendations</div>
              {wfResult.strategicRecommendations.map((r, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
                  <span><strong>{r.title}:</strong> {r.detail}</span>
                  <span style={{ fontSize: 10, color: r.impact === "high" ? "var(--red)" : r.impact === "medium" ? "#f59e0b" : "var(--text3)", whiteSpace: "nowrap", marginLeft: 8 }}>{r.impact}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Overview ── */}
      {analyticsView === "overview" && (
        <div>
          <div className="cal-lookahead-kpis" style={{ marginBottom: 16 }}>
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
          <div className="cal-lookahead-section-title" style={{ marginTop: 16 }}>{t("4-Week Hours Trend")}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {weeklyData.map((w, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
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
                <div style={{ fontSize: 11, marginTop: 4, color: "var(--text2)" }}>{w.label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>{w.totalHours.toFixed(0)}h</div>
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
            <div key={wi} className="cal-lookahead-card" style={{ marginBottom: 12 }}>
              <div className="cal-lookahead-header">
                <div>
                  <div className="cal-lookahead-week-label">{w.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {w.crewCount} {t("crew")} · {w.totalHours.toFixed(0)} {t("total hrs")} · {w.totalOT.toFixed(0)} {t("OT hrs")}
                  </div>
                </div>
                {w.totalOT > 0 && <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>{w.totalOT.toFixed(0)}h OT</span>}
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
          <div className="cal-lookahead-kpis" style={{ marginBottom: 16 }}>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{availability.total}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Total Active")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val" style={{ color: "var(--accent)" }}>{availability.scheduled}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Scheduled")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val" style={{ color: "#10b981" }}>{availability.available}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Available")}</div>
            </div>
          </div>

          <div className="cal-lookahead-section-title" style={{ marginTop: 16 }}>{t("Equipment Capacity")}</div>
          <div className="cal-lookahead-kpis">
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val">{eqUtil.total}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Total")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val" style={{ color: "#0ea5e9" }}>{eqUtil.inUse}</div>
              <div className="cal-lookahead-kpi-lbl">{t("In Use")}</div>
            </div>
            <div className="cal-lookahead-kpi">
              <div className="cal-lookahead-kpi-val" style={{ color: "#10b981" }}>{eqUtil.available}</div>
              <div className="cal-lookahead-kpi-lbl">{t("Available")}</div>
            </div>
          </div>

          {/* Max capacity by week */}
          <div className="cal-lookahead-section-title" style={{ marginTop: 24 }}>{t("Weekly Capacity Allocation")}</div>
          {weeklyData.map((w, i) => {
            const maxHrs = availability.total * 40;
            const pct = maxHrs > 0 ? Math.round((w.totalHours / maxHrs) * 100) : 0;
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span>{w.label}</span>
                  <span style={{ color: pct > 90 ? "#ef4444" : "var(--text3)" }}>{pct}% ({w.totalHours.toFixed(0)}/{maxHrs}h)</span>
                </div>
                <div style={{ height: 8, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "var(--accent)", borderRadius: 4 }} />
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
            <div style={{ color: "var(--text3)", fontSize: 13, padding: 16 }}>{t("No crew scheduled this week")}</div>
          )}
          {projectUtil.map(p => (
            <div key={p.projectId} className="cal-lookahead-card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
                <span>{p.crew} {t("crew")}</span>
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
