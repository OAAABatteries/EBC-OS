import { useState, useMemo } from "react";
import { T } from "../../data/translations";
import { EVENT_TYPES } from "../../data/calendarConstants";

// ═══════════════════════════════════════════════════════════
//  CalendarLookahead — 3-6 week rolling lookahead
//  Shows upcoming crew, events, deliveries, inspections,
//  subs, and weather in a weekly column layout
// ═══════════════════════════════════════════════════════════

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getMonday(d) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0, 0, 0, 0); return r;
}
function inRange(ds, s, e) { return ds >= s && ds <= e; }
function getTypeColor(key) { return EVENT_TYPES.find(e => e.key === key)?.color || "#94a3b8"; }
function parseHours(start, end) {
  if (!start || !end) return 8;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CalendarLookahead({ app, lang }) {
  const {
    crewSchedule, schedule, calendarEvents, ptoRequests,
    equipmentBookings, equipment, subSchedule, weatherAlerts,
    materialRequests, employees, projects,
  } = app;

  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);
  const [weeks, setWeeks] = useState(6);
  const [filterProject, setFilterProject] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);

  // ── AI Lookahead state ──
  const [laResult, setLaResult] = useState(null);
  const [laLoading, setLaLoading] = useState(false);
  const [showLa, setShowLa] = useState(false);

  const monday = getMonday(new Date());

  // Build week data
  const weekData = useMemo(() => {
    const result = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(monday, w * 7);
      const weekEnd = addDays(weekStart, 6);
      const weekStr = toStr(weekStart);
      const endStr = toStr(weekEnd);

      // Crew assignments this week
      const crewEntries = (crewSchedule || []).filter(cs => cs.weekStart === weekStr);
      const crewByProject = {};
      for (const cs of crewEntries) {
        if (filterProject && cs.projectId !== filterProject) continue;
        if (!crewByProject[cs.projectId]) crewByProject[cs.projectId] = [];
        crewByProject[cs.projectId].push(cs);
      }

      // Man hours this week
      let totalHours = 0;
      for (const cs of crewEntries) {
        if (filterProject && cs.projectId !== filterProject) continue;
        const days = DAY_KEYS.filter(k => cs.days?.[k]).length;
        totalHours += days * parseHours(cs.hours?.start, cs.hours?.end);
      }

      // Calendar events
      const events = [];
      for (const ev of calendarEvents || []) {
        if (filterProject && ev.projectId && ev.projectId !== filterProject) continue;
        if (inRange(ev.date, weekStr, endStr)) events.push(ev);
      }

      // Gantt tasks active this week
      const ganttTasks = [];
      for (const task of schedule || []) {
        if (filterProject && task.projectId !== filterProject) continue;
        if (task.start && task.end) {
          if (task.start <= endStr && task.end >= weekStr) ganttTasks.push(task);
        }
      }

      // PTO
      const ptos = [];
      for (const pto of ptoRequests || []) {
        if (pto.status !== "approved") continue;
        if (pto.startDate <= endStr && pto.endDate >= weekStr) ptos.push(pto);
      }

      // Equipment bookings
      const eqBookings = [];
      for (const eb of equipmentBookings || []) {
        if (filterProject && eb.projectId !== filterProject) continue;
        if (eb.startDate <= endStr && eb.endDate >= weekStr) eqBookings.push(eb);
      }

      // Sub schedule
      const subs = [];
      for (const ss of subSchedule || []) {
        if (filterProject && ss.projectId !== filterProject) continue;
        if (ss.startDate <= endStr && ss.endDate >= weekStr) subs.push(ss);
      }

      // Weather
      const weather = [];
      for (const wa of weatherAlerts || []) {
        if (inRange(wa.date, weekStr, endStr)) weather.push(wa);
      }

      // Unique employees scheduled
      const uniqueEmps = new Set(crewEntries.map(cs => cs.employeeId));

      result.push({
        weekStart, weekEnd, weekStr, endStr,
        crewByProject, totalHours, events, ganttTasks,
        ptos, eqBookings, subs, weather,
        crewCount: uniqueEmps.size,
        projectCount: Object.keys(crewByProject).length,
      });
    }
    return result;
  }, [weeks, monday, crewSchedule, schedule, calendarEvents, ptoRequests, equipmentBookings, subSchedule, weatherAlerts, filterProject]);

  const projName = (id) => (projects || []).find(p => p.id === id)?.name || `#${id}`;
  const empName = (id) => (employees || []).find(e => e.id === id)?.name || `#${id}`;

  const runLaAnalysis = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setLaLoading(true);
    setLaResult(null);
    try {
      const { generateLookahead } = await import("../../utils/api.js");
      const summaryData = weekData.map(w => ({
        week: `${MONTH[w.weekStart.getMonth()]} ${w.weekStart.getDate()}`,
        crewCount: w.crewCount,
        projectCount: w.projectCount,
        totalHours: w.totalHours,
        events: w.events.length,
        ganttTasks: w.ganttTasks.length,
        ptos: w.ptos.length,
        weather: w.weather.length,
      }));
      const res = await generateLookahead(app.apiKey, summaryData, (projects || []).slice(0, 10), (employees || []).slice(0, 15));
      setLaResult(res);
      setShowLa(true);
      app.show("Lookahead analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setLaLoading(false);
    }
  };
  const eqName = (id) => (equipment || []).find(e => e.id === id)?.name || `#${id}`;

  return (
    <div className="cal-lookahead">
      {/* Controls */}
      <div className="cal-lookahead-controls">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text2)" }}>{t("Weeks")}:</label>
          {[3, 4, 6].map(n => (
            <button key={n} className={`cal-nav-btn${weeks === n ? " active" : ""}`} onClick={() => setWeeks(n)}>{n}</button>
          ))}
        </div>
        <select
          style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 10px", borderRadius: "var(--radius)", fontSize: 12 }}
          value={filterProject || ""}
          onChange={e => setFilterProject(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{t("All Projects")}</option>
          {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--amber)" }} onClick={() => { showLa ? setShowLa(false) : runLaAnalysis(); }} disabled={laLoading}>
          {laLoading ? "Analyzing..." : "AI Lookahead"}
        </button>
      </div>

      {/* AI Lookahead Panel */}
      {showLa && laResult && (
        <div className="card" style={{ padding: 20, marginBottom: 16, maxHeight: 450, overflow: "auto" }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">AI Lookahead Analysis</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLa(false)}>Close</button>
          </div>

          <div className="text-sm text-muted mb-12">{laResult.sixWeekOutlook}</div>

          {/* Critical Actions */}
          {laResult.criticalActions?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>Critical Actions</div>
              {laResult.criticalActions.map((a, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 6, background: a.priority === "critical" ? "rgba(239,68,68,0.08)" : "var(--bg3)", border: `1px solid ${a.priority === "critical" ? "rgba(239,68,68,0.2)" : "var(--border)"}` }}>
                  <div className="flex-between">
                    <span className="text-sm font-semi">{a.action}</span>
                    <span className={`badge ${a.priority === "critical" ? "badge-red" : a.priority === "high" ? "badge-amber" : "badge-muted"}`}>{a.priority}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{a.project} — Week of {a.week} — {a.reason}</div>
                </div>
              ))}
            </div>
          )}

          {/* Resource Peaks */}
          {laResult.resourcePeaks?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Resource Peaks</div>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead><tr><th>Week</th><th>Demand</th><th>Available</th><th>Gap</th><th>Solution</th></tr></thead>
                <tbody>
                  {laResult.resourcePeaks.map((r, i) => (
                    <tr key={i}>
                      <td className="font-semi">{r.week}</td>
                      <td>{r.demand}</td>
                      <td>{r.available}</td>
                      <td style={{ color: r.gap > 0 ? "var(--red)" : "var(--green)" }}>{r.gap > 0 ? `-${r.gap}` : "OK"}</td>
                      <td className="text-muted">{r.solution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Milestone Tracker */}
          {laResult.milestoneTracker?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8">Milestones</div>
              {laResult.milestoneTracker.map((m, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{m.milestone}</span>
                    <span className={`badge ${m.status === "on_track" ? "badge-green" : m.status === "at_risk" ? "badge-amber" : "badge-red"}`}>{m.status?.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{m.project} — Target: {m.targetWeek} — {m.action}</div>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted mt-8">{laResult.summary}</div>
        </div>
      )}

      {/* Week cards */}
      <div className="cal-lookahead-grid">
        {weekData.map((w, wi) => {
          const isExpanded = expandedWeek === wi;
          const label = `${MONTH[w.weekStart.getMonth()]} ${w.weekStart.getDate()} – ${MONTH[w.weekEnd.getMonth()]} ${w.weekEnd.getDate()}`;
          const hasIssues = w.weather.length > 0 || w.ptos.length > 0;

          return (
            <div key={wi} className={`cal-lookahead-card${wi === 0 ? " current" : ""}${isExpanded ? " expanded" : ""}`}>
              {/* Header */}
              <div className="cal-lookahead-header" onClick={() => setExpandedWeek(isExpanded ? null : wi)}>
                <div>
                  <div className="cal-lookahead-week-label">{wi === 0 ? t("This Week") : wi === 1 ? t("Next Week") : `${t("Week")} ${wi + 1}`}</div>
                  <div className="cal-lookahead-date-range">{label}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {hasIssues && <span style={{ color: "#ef4444", fontSize: 14 }}>!</span>}
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* KPI row */}
              <div className="cal-lookahead-kpis">
                <div className="cal-lookahead-kpi">
                  <div className="cal-lookahead-kpi-val">{w.crewCount}</div>
                  <div className="cal-lookahead-kpi-lbl">{t("Crew")}</div>
                </div>
                <div className="cal-lookahead-kpi">
                  <div className="cal-lookahead-kpi-val">{w.projectCount}</div>
                  <div className="cal-lookahead-kpi-lbl">{t("Projects")}</div>
                </div>
                <div className="cal-lookahead-kpi">
                  <div className="cal-lookahead-kpi-val">{w.totalHours.toFixed(0)}</div>
                  <div className="cal-lookahead-kpi-lbl">{t("Hours")}</div>
                </div>
                <div className="cal-lookahead-kpi">
                  <div className="cal-lookahead-kpi-val">{w.events.length + w.ganttTasks.length}</div>
                  <div className="cal-lookahead-kpi-lbl">{t("Events")}</div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="cal-lookahead-detail">
                  {/* Crew by project */}
                  {Object.entries(w.crewByProject).length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title">{t("Crew Assignments")}</div>
                      {Object.entries(w.crewByProject).map(([pid, entries]) => (
                        <div key={pid} className="cal-lookahead-item">
                          <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>{projName(Number(pid))}</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                            {entries.map(cs => (
                              <span key={cs.id} style={{ fontSize: 11, padding: "1px 6px", background: "var(--bg3)", borderRadius: 8, color: "var(--text2)" }}>
                                {empName(cs.employeeId)}
                                <span style={{ color: "var(--text3)", marginLeft: 4 }}>
                                  {DAY_KEYS.filter(k => cs.days?.[k]).map(k => k.charAt(0).toUpperCase()).join("")}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Events */}
                  {w.events.length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title">{t("Events")}</div>
                      {w.events.map(ev => (
                        <div key={ev.id} className="cal-lookahead-item" style={{ borderLeft: `3px solid ${getTypeColor(ev.type)}` }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{ev.date}{ev.startTime ? ` · ${ev.startTime}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gantt tasks */}
                  {w.ganttTasks.length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title">{t("Active Tasks")}</div>
                      {w.ganttTasks.map(task => (
                        <div key={task.id} className="cal-lookahead-item" style={{ borderLeft: `3px solid ${getTypeColor("gantt")}` }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{task.task || task.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{projName(task.projectId)} · {task.start} → {task.end}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Subs */}
                  {w.subs.length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title">{t("Subcontractors")}</div>
                      {w.subs.map(ss => (
                        <div key={ss.id} className="cal-lookahead-item" style={{ borderLeft: `3px solid ${getTypeColor("sub")}` }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{ss.subName} — {ss.trade}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{projName(ss.projectId)} · {ss.area}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Equipment */}
                  {w.eqBookings.length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title">{t("Equipment")}</div>
                      {w.eqBookings.map(eb => (
                        <div key={eb.id} className="cal-lookahead-item" style={{ borderLeft: `3px solid ${getTypeColor("equipment")}` }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{eqName(eb.equipmentId)}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{projName(eb.projectId)} · {eb.startDate} → {eb.endDate}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PTO */}
                  {w.ptos.length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title" style={{ color: "#64748b" }}>{t("PTO")}</div>
                      {w.ptos.map(pto => (
                        <div key={pto.id} className="cal-lookahead-item" style={{ borderLeft: `3px solid #64748b` }}>
                          <div style={{ fontSize: 12 }}>{empName(pto.employeeId)} — {pto.type}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{pto.startDate} → {pto.endDate}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Weather */}
                  {w.weather.length > 0 && (
                    <div className="cal-lookahead-section">
                      <div className="cal-lookahead-section-title" style={{ color: "#ef4444" }}>{t("Weather Alerts")}</div>
                      {w.weather.map(wa => (
                        <div key={wa.id} className="cal-lookahead-item" style={{ borderLeft: "3px solid #ef4444" }}>
                          <div style={{ fontSize: 12 }}>{wa.advisory}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{wa.date} · {wa.highTemp}°F</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
