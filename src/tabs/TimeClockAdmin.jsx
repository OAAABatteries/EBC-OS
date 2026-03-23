import { useState, useMemo } from "react";
import { Clock, ClipboardList, MapPin, AlertTriangle, Flame, DollarSign, Package } from "lucide-react";
import { FeatureGuide } from "../components/FeatureGuide";
import { NewHireWizard } from "../components/NewHireWizard";

// ═══════════════════════════════════════════════════════════════
//  Time Clock Admin — Crew scheduling, verification, labor mgmt
// ═══════════════════════════════════════════════════════════════

const SUB_TABS = ["Live Status", "Time Log", "Crew Schedule", "Verification", "Labor Backlog", "Overhead", "Material Requests", "Employees", "Locations"];

// ── week helpers ──
function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function fmtWeekDate(d) {
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
function toDateStr(d) {
  return d.toISOString().split("T")[0];
}
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDayDate(weekStart, dayIdx) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIdx);
  return d;
}

export function TimeClockAdmin({ app }) {
  const {
    employees, setEmployees, companyLocations, setCompanyLocations,
    timeEntries, setTimeEntries, projects, show, setModal, modal,
    crewSchedule, setCrewSchedule, materialRequests, setMaterialRequests
  } = app;
  const canManageHires = ["owner", "admin", "pm", "office_admin"].includes(app.auth?.role);

  const [sub, setSub] = useState("Live Status");
  const [editEmp, setEditEmp] = useState(null);
  const [showNewHire, setShowNewHire] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [matFilter, setMatFilter] = useState("All");

  // ── crew schedule state ──
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(() => {
    const ws = getWeekStart(new Date());
    ws.setDate(ws.getDate() + weekOffset * 7);
    return ws;
  }, [weekOffset]);
  const weekStr = toDateStr(currentWeekStart);
  const weekEnd = useMemo(() => {
    const e = new Date(currentWeekStart);
    e.setDate(e.getDate() + 4);
    return e;
  }, [currentWeekStart]);

  const [assignModal, setAssignModal] = useState(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [verifyDate, setVerifyDate] = useState(() => toDateStr(new Date()));

  // ── anomaly detector state ──
  const [anomalyResult, setAnomalyResult] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [showAnomaly, setShowAnomaly] = useState(false);

  // ── crew optimizer state ──
  const [crewOptResult, setCrewOptResult] = useState(null);
  const [crewOptLoading, setCrewOptLoading] = useState(false);
  const [showCrewOpt, setShowCrewOpt] = useState(false);

  // ── overhead projector state ──
  const [ohResult, setOhResult] = useState(null);
  const [ohLoading, setOhLoading] = useState(false);
  const [showOh, setShowOh] = useState(false);

  // ── attendance analyzer state ──
  const [attResult, setAttResult] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [showAtt, setShowAtt] = useState(false);

  // ── labor burn predictor state ──
  const [burnResult, setBurnResult] = useState(null);
  const [burnLoading, setBurnLoading] = useState(false);
  const [showBurn, setShowBurn] = useState(false);

  const runCrewOptimize = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setCrewOptLoading(true);
    setCrewOptResult(null);
    try {
      const { optimizeCrewSchedule } = await import("../utils/api.js");
      const res = await optimizeCrewSchedule(app.apiKey, weekSchedule, employees.slice(0, 15), projects.slice(0, 10), app.schedule?.slice(0, 15) || [], weekStr);
      setCrewOptResult(res);
      setShowCrewOpt(true);
      show("Crew optimization complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setCrewOptLoading(false);
    }
  };

  const runAnomalyScan = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setAnomalyLoading(true);
    setAnomalyResult(null);
    try {
      const { detectLaborAnomalies } = await import("../utils/api.js");
      const res = await detectLaborAnomalies(app.apiKey, timeEntries.slice(0, 50), employees, crewSchedule.slice(0, 30), projects.slice(0, 10));
      setAnomalyResult(res);
      setShowAnomaly(true);
      show("Anomaly scan complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setAnomalyLoading(false);
    }
  };

  // ── live clocked-in employees ──
  const liveEntries = useMemo(
    () => timeEntries.filter((e) => !e.clockOut),
    [timeEntries]
  );

  // ── all entries sorted ──
  const allEntries = useMemo(
    () => [...timeEntries].sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn)),
    [timeEntries]
  );

  // ── this week's schedule ──
  const weekSchedule = useMemo(
    () => crewSchedule.filter((s) => s.weekStart === weekStr),
    [crewSchedule, weekStr]
  );

  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  };
  const fmtDuration = (entry) => {
    if (entry.totalHours) return entry.totalHours.toFixed(2) + "h";
    if (!entry.clockOut) {
      const ms = Date.now() - new Date(entry.clockIn).getTime();
      return (ms / 3600000).toFixed(1) + "h (active)";
    }
    return "—";
  };

  // ── employee CRUD ──
  const handleSaveEmployee = (emp) => {
    if (emp.id) {
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
      show("Employee updated", "ok");
    } else {
      const newEmp = { ...emp, id: crypto.randomUUID() };
      setEmployees((prev) => [...prev, newEmp]);
      show("Employee added", "ok");
    }
    setEditEmp(null);
  };

  const handleSaveLocation = (loc) => {
    if (loc.id) {
      setCompanyLocations((prev) => prev.map((l) => (l.id === loc.id ? loc : l)));
      show("Location updated", "ok");
    } else {
      const newLoc = { ...loc, id: crypto.randomUUID() };
      setCompanyLocations((prev) => [...prev, newLoc]);
      show("Location added", "ok");
    }
    setEditLoc(null);
  };

  // ── crew schedule helpers ──
  const getAssignment = (empId, dayKey) => {
    return weekSchedule.find(
      (s) => s.employeeId === empId && s.days[dayKey]
    );
  };

  const handleAssign = (empId, dayKey, projectId) => {
    const existing = weekSchedule.find((s) => s.employeeId === empId && s.days[dayKey]);
    if (existing) {
      if (!projectId) {
        // Remove this day from existing
        const updatedDays = { ...existing.days, [dayKey]: false };
        const anyDay = Object.values(updatedDays).some(Boolean);
        if (!anyDay) {
          setCrewSchedule((prev) => prev.filter((s) => s.id !== existing.id));
        } else {
          setCrewSchedule((prev) => prev.map((s) => s.id === existing.id ? { ...s, days: updatedDays } : s));
        }
      } else {
        // Update project
        setCrewSchedule((prev) => prev.map((s) => s.id === existing.id ? { ...s, projectId, projectName: projects.find(p => String(p.id) === String(projectId))?.name || "" } : s));
      }
    } else if (projectId) {
      const emp = employees.find(e => String(e.id) === String(empId));
      const proj = projects.find(p => String(p.id) === String(projectId));
      const newEntry = {
        id: crypto.randomUUID(),
        employeeId: empId,
        projectId,
        projectName: proj?.name || "",
        weekStart: weekStr,
        days: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false, [dayKey]: true },
        hours: { start: emp?.schedule?.start || "06:30", end: emp?.schedule?.end || "15:00" },
      };
      setCrewSchedule((prev) => [...prev, newEntry]);
    }
    setAssignModal(null);
    show("Schedule updated", "ok");
  };

  const copyPreviousWeek = () => {
    const prevWS = new Date(currentWeekStart);
    prevWS.setDate(prevWS.getDate() - 7);
    const prevStr = toDateStr(prevWS);
    const prevSchedule = crewSchedule.filter((s) => s.weekStart === prevStr);
    if (prevSchedule.length === 0) {
      show("No schedule found for previous week", "err");
      return;
    }
    // Remove existing entries for current week
    const cleaned = crewSchedule.filter((s) => s.weekStart !== weekStr);
    const copied = prevSchedule.map((s, i) => ({
      ...s,
      id: crypto.randomUUID(),
      weekStart: weekStr,
    }));
    setCrewSchedule([...cleaned, ...copied]);
    show(`Copied ${copied.length} assignments from previous week`, "ok");
  };

  // ── verification data ──
  const verificationData = useMemo(() => {
    const dayOfWeek = new Date(verifyDate).getDay();
    const dayKey = dayOfWeek === 0 ? "sun" : DAY_KEYS[dayOfWeek - 1];
    const vWeekStart = toDateStr(getWeekStart(new Date(verifyDate)));

    const daySchedule = crewSchedule.filter(
      (s) => s.weekStart === vWeekStart && s.days[dayKey]
    );

    return daySchedule.map((sched) => {
      const emp = employees.find((e) => String(e.id) === String(sched.employeeId));
      const dayEntries = timeEntries.filter((te) => {
        if (te.employeeId !== sched.employeeId) return false;
        const teDate = new Date(te.clockIn).toISOString().split("T")[0];
        return teDate === verifyDate;
      });

      const entry = dayEntries[0];
      let status = "no-show";
      let detail = "Did not clock in";

      if (entry) {
        const scheduledStart = sched.hours?.start || "06:30";
        const [sh, sm] = scheduledStart.split(":").map(Number);
        const clockInDate = new Date(entry.clockIn);
        const clockInMins = clockInDate.getHours() * 60 + clockInDate.getMinutes();
        const scheduledMins = sh * 60 + sm;
        const diff = clockInMins - scheduledMins;

        if (diff <= 15) {
          status = "on-time";
          detail = `Clocked in at ${fmtTime(entry.clockIn)}`;
        } else {
          status = "late";
          detail = `${diff} min late (${fmtTime(entry.clockIn)})`;
        }

        if (entry.clockOut) {
          const scheduledEnd = sched.hours?.end || "15:00";
          const [eh, em] = scheduledEnd.split(":").map(Number);
          const clockOutDate = new Date(entry.clockOut);
          const clockOutMins = clockOutDate.getHours() * 60 + clockOutDate.getMinutes();
          const scheduledEndMins = eh * 60 + em;
          if (clockOutMins < scheduledEndMins - 15) {
            status = "early-out";
            detail += ` | Left early (${fmtTime(entry.clockOut)})`;
          }
        }
      }

      return {
        employee: emp,
        schedule: sched,
        entry,
        status,
        detail,
      };
    });
  }, [verifyDate, crewSchedule, timeEntries, employees]);

  const verifyCounts = useMemo(() => {
    const counts = { "on-time": 0, late: 0, "no-show": 0, "early-out": 0 };
    verificationData.forEach((v) => counts[v.status]++);
    return counts;
  }, [verificationData]);

  // ── labor backlog data ──
  const laborData = useMemo(() => {
    return projects.map((proj) => {
      const projEntries = timeEntries.filter((te) => te.projectId === proj.id && te.totalHours);
      let laborSpent = 0;
      projEntries.forEach((te) => {
        const emp = employees.find((e) => String(e.id) === String(te.employeeId));
        const rate = emp?.hourlyRate || 35;
        laborSpent += te.totalHours * rate;
      });
      const totalHours = projEntries.reduce((s, te) => s + (te.totalHours || 0), 0);
      const laborBudget = proj.laborBudget || 0;
      const laborRemaining = Math.max(0, laborBudget - laborSpent);
      const burnPct = laborBudget > 0 ? Math.min(100, Math.round((laborSpent / laborBudget) * 100)) : 0;

      // Estimate weeks remaining based on current crew weekly hours
      const weeklyCrewEntries = crewSchedule.filter((s) => s.projectId === proj.id);
      const weeklyHours = weeklyCrewEntries.reduce((sum, s) => {
        const daysCount = Object.values(s.days).filter(Boolean).length;
        const [sh, sm] = (s.hours?.start || "06:30").split(":").map(Number);
        const [eh, em] = (s.hours?.end || "15:00").split(":").map(Number);
        const hoursPerDay = (eh + em / 60) - (sh + sm / 60);
        return sum + daysCount * hoursPerDay;
      }, 0);

      const avgRate = weeklyCrewEntries.length > 0
        ? weeklyCrewEntries.reduce((sum, s) => {
            const emp = employees.find(e => String(e.id) === String(s.employeeId));
            return sum + (emp?.hourlyRate || 35);
          }, 0) / weeklyCrewEntries.length
        : 35;

      const weeklyCost = weeklyHours * avgRate;
      const weeksRemaining = weeklyCost > 0 ? Math.ceil(laborRemaining / weeklyCost) : null;

      return { ...proj, laborSpent: Math.round(laborSpent), totalHours: Math.round(totalHours * 10) / 10, laborRemaining: Math.round(laborRemaining), burnPct, weeksRemaining, weeklyCost: Math.round(weeklyCost) };
    });
  }, [projects, timeEntries, employees, crewSchedule]);

  // ── overhead data ──
  const overheadData = useMemo(() => {
    // Current week burn rate
    const currentSchedule = crewSchedule.filter((s) => s.weekStart === weekStr);
    let weeklyBurn = 0;
    currentSchedule.forEach((s) => {
      const emp = employees.find((e) => e.id === s.employeeId);
      const rate = emp?.hourlyRate || 35;
      const daysCount = Object.values(s.days).filter(Boolean).length;
      const [sh, sm] = (s.hours?.start || "06:30").split(":").map(Number);
      const [eh, em] = (s.hours?.end || "15:00").split(":").map(Number);
      const hoursPerDay = (eh + em / 60) - (sh + sm / 60);
      weeklyBurn += daysCount * hoursPerDay * rate;
    });

    const monthlyBurn = Math.round(weeklyBurn * 4.33);
    const totalLaborBudget = projects.reduce((s, p) => s + (p.laborBudget || 0), 0);
    const totalLaborSpent = laborData.reduce((s, p) => s + p.laborSpent, 0);
    const totalRemaining = totalLaborBudget - totalLaborSpent;

    // Per-project overhead
    const projectOverhead = laborData.filter(p => p.laborBudget > 0).map((p) => {
      const ratio = p.contract > 0 ? Math.round((p.laborSpent / p.contract) * 100) : 0;
      const projectedTotal = p.weeklyCost > 0 && p.weeksRemaining
        ? p.laborSpent + (p.weeklyCost * p.weeksRemaining)
        : p.laborSpent;
      const overBudget = projectedTotal > p.laborBudget;
      return { ...p, laborRatio: ratio, projectedTotal: Math.round(projectedTotal), overBudget };
    });

    return { weeklyBurn: Math.round(weeklyBurn), monthlyBurn, totalLaborBudget, totalLaborSpent: Math.round(totalLaborSpent), totalRemaining: Math.round(totalRemaining), projectOverhead };
  }, [crewSchedule, employees, projects, laborData, weekStr]);

  const runOverheadProject = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setOhLoading(true);
    setOhResult(null);
    try {
      const { projectOverheadCosts } = await import("../utils/api.js");
      const res = await projectOverheadCosts(app.apiKey, overheadData, projects.slice(0, 10), timeEntries?.slice(-20), crewSchedule?.slice(0, 20));
      setOhResult(res);
      setShowOh(true);
      show("Overhead projection complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setOhLoading(false);
    }
  };

  const runAttendanceAnalysis = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setAttLoading(true);
    setAttResult(null);
    try {
      const { analyzeAttendancePatterns } = await import("../utils/api.js");
      const res = await analyzeAttendancePatterns(app.apiKey, verificationData?.slice(0, 30), verifyCounts, employees?.slice(0, 20), projects?.slice(0, 10));
      setAttResult(res);
      setShowAtt(true);
      show("Attendance analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setAttLoading(false);
    }
  };

  const runBurnPredict = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setBurnLoading(true);
    setBurnResult(null);
    try {
      const { predictLaborBurn } = await import("../utils/api.js");
      const res = await predictLaborBurn(app.apiKey, laborData?.slice(0, 15), crewSchedule?.slice(0, 25), projects?.slice(0, 10));
      setBurnResult(res);
      setShowBurn(true);
      show("Burn prediction complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setBurnLoading(false);
    }
  };

  const fmt = app.fmt;

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Time Clock</div>
          <div className="section-sub">Employee time tracking, scheduling & labor management</div>
        </div>
        <div className="flex gap-8">
          <FeatureGuide guideKey="timeclock" />
          <button className="btn btn-ghost" onClick={() => { showAnomaly ? setShowAnomaly(false) : runAnomalyScan(); }} disabled={anomalyLoading}>
            {anomalyLoading ? "Scanning..." : "AI Anomaly Scan"}
          </button>
          <a href="#/employee" target="_blank" className="btn btn-ghost btn-sm">
            Open Employee Portal
          </a>
        </div>
      </div>

      <div className="tab-header">
        {SUB_TABS.map((t) => (
          <button key={t} className={`tab-btn${sub === t ? " active" : ""}`} onClick={() => setSub(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══ AI ANOMALY PANEL ═══ */}
      {showAnomaly && anomalyResult && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">AI Anomaly Scan Results</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAnomaly(false)}>Close</button>
          </div>

          <div className="text-sm text-muted mb-16">{anomalyResult.summary}</div>

          {/* Anomalies */}
          {anomalyResult.anomalies?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>Anomalies Detected ({anomalyResult.anomalies.length})</div>
              {anomalyResult.anomalies.map((a, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 6, background: a.severity === "critical" ? "rgba(239,68,68,0.08)" : "var(--bg3)", border: `1px solid ${a.severity === "critical" ? "rgba(239,68,68,0.2)" : "var(--border)"}` }}>
                  <div className="flex-between">
                    <span className="text-sm font-semi">{a.employee} — {a.date}</span>
                    <div className="flex gap-4">
                      <span className={`badge ${a.severity === "critical" ? "badge-red" : a.severity === "warning" ? "badge-amber" : "badge-muted"}`}>{a.severity}</span>
                      <span className="badge badge-muted">{a.type?.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted mt-2">{a.detail}</div>
                  <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{a.recommendation}</div>
                </div>
              ))}
            </div>
          )}

          {/* Overtime Risk */}
          {anomalyResult.overtimeRisk?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Overtime Risk</div>
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead><tr><th>Employee</th><th>Current Hrs</th><th>Projected Weekly</th><th>Alert</th></tr></thead>
                <tbody>
                  {anomalyResult.overtimeRisk.map((o, i) => (
                    <tr key={i}>
                      <td className="font-semi">{o.employee}</td>
                      <td>{o.currentHours}h</td>
                      <td style={{ color: o.projectedWeekly > 40 ? "var(--red)" : "var(--green)" }}>{o.projectedWeekly}h</td>
                      <td className="text-muted">{o.alert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Productivity */}
          {anomalyResult.productivity?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-sm font-semi mb-8">Productivity by Project</div>
              {anomalyResult.productivity.map((p, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm font-semi">{p.project}</span>
                    <span className={`badge ${p.efficiency === "high" ? "badge-green" : p.efficiency === "low" ? "badge-red" : "badge-muted"}`}>{p.efficiency}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">Avg {p.avgHoursPerDay}h/day · Crew: {p.crewSize} · {p.note}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {anomalyResult.recommendations?.length > 0 && (
            <div>
              <div className="text-sm font-semi mb-8">Recommendations</div>
              {anomalyResult.recommendations.map((r, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{r.action}</span>
                    <div className="flex gap-4">
                      <span className={`badge ${r.priority === "high" ? "badge-red" : r.priority === "medium" ? "badge-amber" : "badge-muted"}`}>{r.priority}</span>
                      <span className="badge badge-muted">{r.category}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted mt-2">{r.impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ LIVE STATUS ═══ */}
      {sub === "Live Status" && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label">Clocked In Now</div>
              <div className="kpi-value">{liveEntries.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Employees</div>
              <div className="kpi-value">{employees.filter((e) => e.active).length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Today's Entries</div>
              <div className="kpi-value">
                {timeEntries.filter((e) => {
                  const d = new Date(e.clockIn);
                  const today = new Date();
                  return d.toDateString() === today.toDateString();
                }).length}
              </div>
            </div>
          </div>

          {liveEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Clock style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">No one is currently clocked in</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Project</th>
                    <th>Clock In</th>
                    <th>Duration</th>
                    <th>Geofence</th>
                  </tr>
                </thead>
                <tbody>
                  {liveEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-semi">{entry.employeeName}</td>
                      <td>{entry.projectName}</td>
                      <td className="font-mono text-sm">{fmtTime(entry.clockIn)}</td>
                      <td className="font-mono text-sm text-amber">{fmtDuration(entry)}</td>
                      <td>
                        <span className={`badge ${entry.geofenceStatus === "inside" ? "badge-green" : entry.geofenceStatus === "override" ? "badge-amber" : "badge-red"}`}>
                          {entry.geofenceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ TIME LOG ═══ */}
      {sub === "Time Log" && (
        <div>
          {/* ── Payroll Export ── */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <span className="font-semi" style={{ fontSize: 13 }}>Payroll Export</span>
            <input type="date" value={toDateStr(currentWeekStart)}
              onChange={e => { const d = new Date(e.target.value); if (!isNaN(d)) setWeekOffset(Math.round((getWeekStart(d) - getWeekStart(new Date())) / 604800000)); }}
              style={{ padding: "4px 8px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 12 }} />
            <span className="text-sm text-dim">Week of {fmtWeekDate(currentWeekStart)} — {fmtWeekDate(weekEnd)}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const ws = currentWeekStart; const we = new Date(ws); we.setDate(we.getDate() + 7);
                const filtered = timeEntries.filter(e => { const d = new Date(e.clockIn); return d >= ws && d < we && e.clockOut; });
                const byEmp = {};
                filtered.forEach(e => {
                  if (!byEmp[e.employeeName]) byEmp[e.employeeName] = { total: 0, projects: {} };
                  const hrs = (new Date(e.clockOut) - new Date(e.clockIn)) / 3600000;
                  byEmp[e.employeeName].total += hrs;
                  byEmp[e.employeeName].projects[e.projectName] = (byEmp[e.employeeName].projects[e.projectName] || 0) + hrs;
                });
                const rows = [["Employee","Project","Regular Hours","OT Hours","Total Hours","Week Of"]];
                Object.entries(byEmp).forEach(([name, d]) => {
                  Object.entries(d.projects).forEach(([proj, hrs]) => {
                    rows.push([`"${name}"`, `"${proj}"`, Math.min(hrs, 40).toFixed(2), Math.max(hrs - 40, 0).toFixed(2), hrs.toFixed(2), toDateStr(ws)]);
                  });
                });
                const totH = Object.values(byEmp).reduce((s, d) => s + d.total, 0);
                rows.push(["TOTAL","",Math.min(totH, 40).toFixed(2), Math.max(totH - 40, 0).toFixed(2), totH.toFixed(2),""]);
                const csv = rows.map(r => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `EBC_Payroll_${toDateStr(ws)}.csv`; a.click();
                URL.revokeObjectURL(url);
                show("Payroll CSV exported");
              }}>Export CSV</button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                import("../utils/qbExport.js").then(({ generateTimeIIF, downloadIIF, validateTimeEntries }) => {
                  const ws = currentWeekStart; const we = new Date(ws); we.setDate(we.getDate() + 7);
                  const filtered = timeEntries.filter(e => { const d = new Date(e.clockIn); return d >= ws && d < we; });
                  if (filtered.length === 0) { show("No time entries for this week"); return; }
                  const warnings = validateTimeEntries(filtered);
                  if (warnings.length > 0 && !window.confirm("Warnings:\n• " + warnings.join("\n• ") + "\n\nContinue export?")) return;
                  const iif = generateTimeIIF(filtered);
                  const dateStr = ws.toISOString().slice(0, 10);
                  downloadIIF(iif, `EBC_QB_Time_${dateStr}.iif`);
                  show("QuickBooks IIF exported — import in QB Desktop via File > Utilities > Import > IIF Files");
                });
              }}>Export to QB</button>
            </div>
          </div>

          {/* Payroll summary for current week */}
          {(() => {
            const ws = currentWeekStart; const we = new Date(ws); we.setDate(we.getDate() + 7);
            const filtered = timeEntries.filter(e => { const d = new Date(e.clockIn); return d >= ws && d < we && e.clockOut; });
            const byEmp = {};
            filtered.forEach(e => {
              if (!byEmp[e.employeeName]) byEmp[e.employeeName] = { total: 0, projects: {} };
              const hrs = (new Date(e.clockOut) - new Date(e.clockIn)) / 3600000;
              byEmp[e.employeeName].total += hrs;
              byEmp[e.employeeName].projects[e.projectName] = (byEmp[e.employeeName].projects[e.projectName] || 0) + hrs;
            });
            const empList = Object.entries(byEmp).map(([name, d]) => ({ name, ...d, reg: Math.min(d.total, 40), ot: Math.max(d.total - 40, 0) }));
            if (empList.length === 0) return null;
            const totReg = empList.reduce((s, e) => s + e.reg, 0);
            const totOT = empList.reduce((s, e) => s + e.ot, 0);
            return (
              <div className="table-wrap" style={{ marginBottom: 16 }}>
                <table className="data-table">
                  <thead><tr><th>Employee</th><th>Projects</th><th style={{ textAlign: "right" }}>Regular</th><th style={{ textAlign: "right" }}>OT</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>
                    {empList.map(e => (
                      <tr key={e.name}>
                        <td className="font-semi">{e.name}</td>
                        <td className="text-sm text-dim">{Object.keys(e.projects).join(", ")}</td>
                        <td className="font-mono text-sm" style={{ textAlign: "right" }}>{e.reg.toFixed(1)}h</td>
                        <td className="font-mono text-sm" style={{ textAlign: "right", color: e.ot > 0 ? "var(--red)" : "var(--text3)" }}>{e.ot.toFixed(1)}h</td>
                        <td className="font-mono text-sm text-amber" style={{ textAlign: "right" }}>{e.total.toFixed(1)}h</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--amber)", fontWeight: 700 }}>
                      <td colSpan={2}>TOTAL</td>
                      <td className="font-mono" style={{ textAlign: "right" }}>{totReg.toFixed(1)}h</td>
                      <td className="font-mono" style={{ textAlign: "right", color: totOT > 0 ? "var(--red)" : "inherit" }}>{totOT.toFixed(1)}h</td>
                      <td className="font-mono text-amber" style={{ textAlign: "right" }}>{(totReg + totOT).toFixed(1)}h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          <div className="section-title" style={{ marginBottom: 8 }}>All Time Entries</div>
          {allEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ClipboardList style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">No time entries yet</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Project</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>T&M</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntries.slice(0, 50).map((entry) => (
                    <tr key={entry.id} style={{ background: entry.isTM ? "rgba(224,148,34,0.08)" : undefined }}>
                      <td className="font-mono text-sm">{fmtDate(entry.clockIn)}</td>
                      <td className="font-semi">{entry.employeeName}</td>
                      <td className="text-sm">{entry.projectName}</td>
                      <td className="font-mono text-sm">{fmtTime(entry.clockIn)}</td>
                      <td className="font-mono text-sm">{fmtTime(entry.clockOut)}</td>
                      <td className="font-mono text-sm text-amber">{fmtDuration(entry)}</td>
                      <td>
                        <span className={`badge ${entry.geofenceStatus === "inside" ? "badge-green" : entry.geofenceStatus === "override" ? "badge-amber" : "badge-red"}`}>
                          {entry.geofenceStatus}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`badge ${entry.isTM ? "badge-amber" : "badge-muted"}`}
                          style={{ cursor: "pointer", fontSize: 10, border: "none", padding: "2px 8px" }}
                          onClick={() => {
                            app.setTimeEntries(prev => prev.map(e => e.id === entry.id ? {
                              ...e, isTM: !e.isTM,
                              audit: [...(e.audit || []), { timestamp: new Date().toISOString(), userName: app.auth?.name || "System", field: "isTM", oldValue: String(!!e.isTM), newValue: String(!e.isTM) }],
                            } : e));
                            app.show(entry.isTM ? "Removed T&M flag" : "Flagged as T&M", "ok");
                          }}
                          title={entry.isTM ? "Click to remove T&M flag" : "Click to flag as T&M extra work"}
                        >
                          {entry.isTM ? "T&M ✓" : "—"}
                        </button>
                        {entry.tmTicketId && <span className="text-xs text-muted" style={{ display: "block", marginTop: 2 }}>#{entry.tmTicketId.slice(0, 6)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ CREW SCHEDULE ═══ */}
      {sub === "Crew Schedule" && (
        <div>
          <div className="flex-between mb-16">
            <div className="flex gap-12" style={{ alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o - 1)}>&#9664;</button>
              <span className="font-semi">
                Week of {fmtWeekDate(currentWeekStart)} — {fmtWeekDate(weekEnd)}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o + 1)}>&#9654;</button>
              {weekOffset !== 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>Today</button>
              )}
            </div>
            <div className="flex gap-8">
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--amber)" }} onClick={() => { showCrewOpt ? setShowCrewOpt(false) : runCrewOptimize(); }} disabled={crewOptLoading}>
                {crewOptLoading ? "Optimizing..." : "AI Optimize"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={copyPreviousWeek}>Copy Previous Week</button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayIdx = (tomorrow.getDay() + 6) % 7; // 0=Mon
                if (dayIdx > 4) { show("No dispatch needed — tomorrow is weekend"); return; }
                const dayKey = DAY_KEYS[dayIdx];
                const dayLabel = DAY_LABELS[dayIdx];
                const dayDate = getDayDate(currentWeekStart, dayIdx);

                const assignments = weekSchedule.filter(s => s.days?.[dayKey]);
                if (assignments.length === 0) { show("No crew scheduled for " + dayLabel); return; }

                const lines = [];
                const assignedEmps = new Set();
                assignments.forEach(a => {
                  const emp = employees.find(e => String(e.id) === String(a.employeeId));
                  if (!emp) return;
                  assignedEmps.add(emp.id);
                  const proj = projects.find(p => String(p.id) === String(a.projectId));
                  const addr = proj?.address || "";
                  const suite = proj?.suite ? ` (${proj.suite})` : "";
                  const parking = proj?.parking ? ` | Parking: ${proj.parking}` : "";
                  const time = a.hours ? `${a.hours.start}–${a.hours.end}` : "6:30–3:00";
                  lines.push(`${emp.name} → ${a.projectName}${suite}\n  @ ${addr}${parking}\n  ${time}`);
                });

                // Find unassigned
                const unassigned = employees.filter(e => e.active && !assignedEmps.has(e.id));
                if (unassigned.length > 0) {
                  lines.push("\nUNASSIGNED:\n" + unassigned.map(e => `  • ${e.name} (${e.role})`).join("\n"));
                }

                const dispatchMsg = `EBC CREW DISPATCH — ${dayLabel} ${fmtWeekDate(dayDate)}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;

                // Copy to clipboard for SMS/WhatsApp
                navigator.clipboard.writeText(dispatchMsg).then(() => {
                  show(`Dispatch copied — ${assignments.length} crew assigned for ${dayLabel}. Paste into group chat.`, "ok");
                }).catch(() => {
                  // Fallback: show in prompt
                  window.prompt("Copy this dispatch:", dispatchMsg);
                });
              }}><ClipboardList style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 4 }} />Send Dispatch</button>
            </div>
          </div>

          {/* AI Crew Optimizer Panel */}
          {showCrewOpt && crewOptResult && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="flex-between mb-12">
                <div className="text-sm font-semi">AI Crew Optimization</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCrewOpt(false)}>Close</button>
              </div>

              {/* Score + Grade */}
              <div className="flex gap-16 mb-12" style={{ alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div className="text-xs text-muted">Efficiency</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: crewOptResult.score >= 70 ? "var(--green)" : crewOptResult.score >= 40 ? "var(--amber)" : "var(--red)" }}>
                    {crewOptResult.score}/100
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="text-xs text-muted">Grade</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--amber)" }}>{crewOptResult.grade}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-sm text-muted">{crewOptResult.summary}</div>
                </div>
              </div>

              {/* Gaps */}
              {crewOptResult.gaps?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>Crew Gaps ({crewOptResult.gaps.length})</div>
                  {crewOptResult.gaps.map((g, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div className="flex-between">
                        <span className="text-sm font-semi">{g.project} — {g.day}</span>
                        <span className={`badge ${g.priority === "critical" ? "badge-red" : g.priority === "high" ? "badge-amber" : "badge-muted"}`}>{g.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">Need {g.crewNeeded}, have {g.currentCrew} (short {g.shortfall})</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Moves */}
              {crewOptResult.moves?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Suggested Reassignments</div>
                  {crewOptResult.moves.map((m, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <div className="text-sm font-semi">{m.employee}</div>
                      <div className="text-xs text-muted mt-2">{m.from} → {m.to} ({m.day})</div>
                      <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{m.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unassigned */}
              {crewOptResult.unassigned?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Unassigned Employees</div>
                  {crewOptResult.unassigned.map((u, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span className="text-sm font-semi">{u.employee}</span>
                      <span className="text-xs text-muted ml-8">Days: {(u.days || []).join(", ")}</span>
                      <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{u.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Balancing */}
              {crewOptResult.balancing?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Balancing Tips</div>
                  {crewOptResult.balancing.map((b, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div className="text-sm">{b.observation}</div>
                      <div className="text-xs text-muted mt-2">{b.suggestion} — {b.benefit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label">Scheduled This Week</div>
              <div className="kpi-value">
                {new Set(weekSchedule.map(s => s.employeeId)).size}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Unassigned</div>
              <div className="kpi-value" style={{ color: employees.filter(e => e.active && !weekSchedule.some(s => s.employeeId === e.id)).length > 0 ? "var(--red)" : "var(--green)" }}>
                {employees.filter(e => e.active && !weekSchedule.some(s => s.employeeId === e.id)).length}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Projects With Crew</div>
              <div className="kpi-value">
                {new Set(weekSchedule.map(s => s.projectId)).size}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Weekly Crew Hours</div>
              <div className="kpi-value">
                {(() => {
                  let hrs = 0;
                  weekSchedule.forEach(s => {
                    const daysOn = DAY_KEYS.slice(0, 5).filter(d => s.days?.[d]).length;
                    const daily = s.hours ? (parseFloat(s.hours.end) - parseFloat(s.hours.start)) : 8.5;
                    hrs += daysOn * daily;
                  });
                  return hrs.toFixed(0) + "h";
                })()}
              </div>
            </div>
          </div>

          {/* ── Backlog / Projected Overhead ── */}
          {(() => {
            const activeProjects = projects.filter(p => p.status === "in-progress");
            const totalContract = activeProjects.reduce((s, p) => s + (p.contract || 0), 0);
            const totalBilled = activeProjects.reduce((s, p) => s + (p.billed || 0), 0);
            const backlog = totalContract - totalBilled;
            const activeEmps = employees.filter(e => e.active);
            const avgRate = activeEmps.length > 0 ? activeEmps.reduce((s, e) => s + (e.hourlyRate || 30), 0) / activeEmps.length : 30;
            const weeklyOverhead = activeEmps.length * avgRate * 42.5; // 8.5hrs * 5days
            const weeksOfWork = weeklyOverhead > 0 ? backlog / weeklyOverhead : 0;

            return (
              <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <div className="text-sm font-semi mb-8">Backlog & Projected Overhead</div>
                <div className="flex gap-16 flex-wrap">
                  <div>
                    <span className="text-dim text-xs">ACTIVE CONTRACTS</span>
                    <div className="font-mono">${(totalContract / 1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <span className="text-dim text-xs">BILLED TO DATE</span>
                    <div className="font-mono">${(totalBilled / 1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <span className="text-dim text-xs">BACKLOG</span>
                    <div className="font-mono text-amber font-bold">${(backlog / 1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <span className="text-dim text-xs">WEEKLY LABOR COST</span>
                    <div className="font-mono">${(weeklyOverhead / 1000).toFixed(1)}K</div>
                  </div>
                  <div>
                    <span className="text-dim text-xs">WEEKS OF WORK</span>
                    <div className="font-mono" style={{ color: weeksOfWork > 8 ? "var(--green)" : weeksOfWork > 4 ? "var(--amber)" : "var(--red)" }}>
                      {weeksOfWork.toFixed(1)} wks
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  {DAY_LABELS.slice(0, 5).map((d, i) => (
                    <th key={d} style={{ textAlign: "center" }}>
                      {d}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>{fmtWeekDate(getDayDate(currentWeekStart, i))}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.filter(e => e.active).map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-semi" style={{ whiteSpace: "nowrap" }}>
                      {emp.name}
                      <div className="text-xs text-muted">{emp.role}</div>
                    </td>
                    {DAY_KEYS.slice(0, 5).map((dayKey) => {
                      const assignment = getAssignment(emp.id, dayKey);
                      return (
                        <td
                          key={dayKey}
                          className="crew-cell"
                          style={{ textAlign: "center", cursor: "pointer", minWidth: 100 }}
                          onClick={() => setAssignModal({ empId: emp.id, empName: emp.name, dayKey, current: assignment })}
                        >
                          {assignment ? (
                            <span className="badge badge-amber" style={{ fontSize: 10 }}>
                              {(assignment.projectName || "").slice(0, 18)}
                            </span>
                          ) : (
                            <span className="text-dim text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Assign Modal */}
          {assignModal && (
            <div className="modal-overlay" onClick={() => { setAssignModal(null); setProjectSearch(""); }}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">Assign {assignModal.empName} — {DAY_LABELS[DAY_KEYS.indexOf(assignModal.dayKey)]}</div>
                  <button className="modal-close" onClick={() => { setAssignModal(null); setProjectSearch(""); }}>x</button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  autoFocus
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ justifyContent: "flex-start" }}
                    onClick={() => handleAssign(assignModal.empId, assignModal.dayKey, null)}
                  >
                    Unassign (Day Off)
                  </button>
                  {projects
                    .filter((p) => {
                      if (!projectSearch) return true;
                      const q = projectSearch.toLowerCase();
                      return p.name.toLowerCase().includes(q) || (p.gc && p.gc.toLowerCase().includes(q));
                    })
                    .map((p) => (
                    <button
                      key={p.id}
                      className={`btn ${assignModal.current?.projectId === p.id ? "btn-primary" : "btn-ghost"}`}
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => handleAssign(assignModal.empId, assignModal.dayKey, p.id)}
                    >
                      {p.name} <span className="text-xs text-muted ml-auto">{p.gc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ VERIFICATION ═══ */}
      {sub === "Verification" && (
        <div>
          <div className="flex-between mb-16">
            <div className="flex gap-12" style={{ alignItems: "center" }}>
              <label className="form-label" style={{ margin: 0 }}>Date</label>
              <input
                type="date"
                className="form-input"
                value={verifyDate}
                onChange={(e) => setVerifyDate(e.target.value)}
                style={{ width: 180 }}
              />
            </div>
            <button className="primary" style={{ fontSize: 11, padding: "4px 12px" }} onClick={attLoading ? undefined : () => showAtt ? setShowAtt(false) : attResult ? setShowAtt(true) : runAttendanceAnalysis()} disabled={attLoading}>
              {attLoading ? "Analyzing..." : "AI Attendance"}
            </button>
          </div>

          {showAtt && attResult && (
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ClipboardList style={{ width: 22, height: 22 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Attendance: {attResult.attendanceScore}/100 ({attResult.grade})</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{attResult.summary}</div>
                  </div>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)" }} onClick={() => setShowAtt(false)}>✕</button>
              </div>

              {attResult.patterns?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 6 }}>Attendance Patterns</div>
                  {attResult.patterns.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
                      <span style={{ fontWeight: 500 }}>{p.pattern}:</span> {p.frequency} — Impact: {p.impact} — <em>{p.action}</em>
                    </div>
                  ))}
                </div>
              )}

              {attResult.atRiskEmployees?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>At-Risk Employees</div>
                  {attResult.atRiskEmployees.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--red)" }}>
                      <div style={{ fontWeight: 500 }}>{e.name} — {e.issue} ({e.occurrences})</div>
                      <div style={{ color: "var(--text3)", fontStyle: "italic" }}>{e.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {attResult.costOfAbsenteeism && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>Cost of Absenteeism</div>
                  <div style={{ fontSize: 12 }}>
                    Daily: <strong>{attResult.costOfAbsenteeism.dailyCost}</strong> · Weekly: <strong>{attResult.costOfAbsenteeism.weeklyCost}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{attResult.costOfAbsenteeism.recommendation}</div>
                </div>
              )}

              {attResult.improvements?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>Improvements</div>
                  {attResult.improvements.map((imp, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
                      <span>{imp.action} — {imp.expectedImprovement}</span>
                      <span style={{ fontSize: 10, color: imp.priority === "high" ? "var(--red)" : "#f59e0b", whiteSpace: "nowrap" }}>{imp.priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label">On Time</div>
              <div className="kpi-value" style={{ color: "var(--green)" }}>{verifyCounts["on-time"]}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Late</div>
              <div className="kpi-value" style={{ color: "var(--amber)" }}>{verifyCounts.late}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">No Shows</div>
              <div className="kpi-value" style={{ color: "var(--red)" }}>{verifyCounts["no-show"]}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Early Out</div>
              <div className="kpi-value" style={{ color: "var(--amber)" }}>{verifyCounts["early-out"]}</div>
            </div>
          </div>

          {verificationData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ClipboardList style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">No one was scheduled for this date</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Project</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationData.map((v, i) => (
                    <tr key={i}>
                      <td className="font-semi">{v.employee?.name || "Unknown"}</td>
                      <td className="text-sm">{v.schedule.projectName}</td>
                      <td className="font-mono text-sm">{v.schedule.hours?.start} — {v.schedule.hours?.end}</td>
                      <td>
                        <span className={`badge ${
                          v.status === "on-time" ? "badge-green" :
                          v.status === "late" ? "badge-amber" :
                          v.status === "early-out" ? "badge-amber" :
                          "badge-red"
                        }`}>
                          {v.status === "on-time" ? "On Time" :
                           v.status === "late" ? "Late" :
                           v.status === "early-out" ? "Early Out" :
                           "No Show"}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{v.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ LABOR BACKLOG ═══ */}
      {sub === "Labor Backlog" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="primary" style={{ fontSize: 11, padding: "4px 12px" }} onClick={burnLoading ? undefined : () => showBurn ? setShowBurn(false) : burnResult ? setShowBurn(true) : runBurnPredict()} disabled={burnLoading}>
              {burnLoading ? "Predicting..." : "AI Burn Predictor"}
            </button>
          </div>

          {showBurn && burnResult && (
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Flame style={{ width: 22, height: 22 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Backlog Health: {burnResult.backlogHealth}/100 ({burnResult.grade})</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{burnResult.summary}</div>
                  </div>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)" }} onClick={() => setShowBurn(false)}>✕</button>
              </div>

              {burnResult.criticalProjects?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Critical Projects</div>
                  {burnResult.criticalProjects.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--red)" }}>
                      <div style={{ fontWeight: 500 }}>{p.project} — {p.risk}</div>
                      <div style={{ color: "var(--text3)" }}>{p.weeksUntilCrisis}w until crisis · <em>{p.intervention}</em></div>
                    </div>
                  ))}
                </div>
              )}

              {burnResult.burnPredictions?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 6 }}>Burn Predictions</div>
                  <div className="table-wrap">
                    <table className="data-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Burn Rate</th>
                          <th>Completion</th>
                          <th>Outcome</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {burnResult.burnPredictions.map((b, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{b.project}</td>
                            <td className="font-mono">{b.currentBurnRate}</td>
                            <td>{b.predictedCompletion}</td>
                            <td><span className={`badge ${b.budgetOutcome === "over" ? "badge-red" : b.budgetOutcome === "under" ? "badge-green" : "badge-amber"}`}>{b.budgetOutcome} ({b.variance})</span></td>
                            <td style={{ color: "var(--text3)", fontSize: 11 }}>{b.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {burnResult.laborAllocation && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(139,92,246,0.08)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6", marginBottom: 4 }}>Labor Allocation Summary</div>
                  <div style={{ fontSize: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>Budgeted: <strong>${burnResult.laborAllocation.totalBudgeted?.toLocaleString()}</strong></span>
                    <span>Consumed: <strong>${burnResult.laborAllocation.totalConsumed?.toLocaleString()}</strong></span>
                    <span>Rate: <strong>{burnResult.laborAllocation.consumptionRate}</strong></span>
                    <span>Projected Finish: <strong>{burnResult.laborAllocation.projectedFinish}</strong></span>
                  </div>
                </div>
              )}

              {burnResult.efficiencyTips?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>Efficiency Tips</div>
                  {burnResult.efficiencyTips.map((t, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
                      <span>{t.tip} — {t.implementation}</span>
                      <span style={{ fontWeight: 600, color: "var(--green)", whiteSpace: "nowrap" }}>{t.savingsPotential}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label">Total Labor Budget</div>
              <div className="kpi-value">{fmt(laborData.reduce((s, p) => s + (p.laborBudget || 0), 0))}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Spent</div>
              <div className="kpi-value">{fmt(laborData.reduce((s, p) => s + p.laborSpent, 0))}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Remaining</div>
              <div className="kpi-value">{fmt(laborData.reduce((s, p) => s + p.laborRemaining, 0))}</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Labor Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Burn %</th>
                  <th>Hours Logged</th>
                  <th>Est. Weeks Left</th>
                </tr>
              </thead>
              <tbody>
                {laborData.filter(p => p.laborBudget > 0).map((p) => (
                  <tr key={p.id}>
                    <td className="font-semi">{p.name}</td>
                    <td className="font-mono text-sm">{fmt(p.laborBudget)}</td>
                    <td className="font-mono text-sm">{fmt(p.laborSpent)}</td>
                    <td className="font-mono text-sm">{fmt(p.laborRemaining)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div className="flex gap-8" style={{ alignItems: "center" }}>
                        <div className="progress-bar" style={{ flex: 1, height: 8 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: p.burnPct + "%",
                              background: p.burnPct > 90 ? "var(--red)" : p.burnPct > 70 ? "var(--amber)" : "var(--green)"
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs" style={{ width: 36 }}>{p.burnPct}%</span>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{p.totalHours}h</td>
                    <td className="font-mono text-sm">{p.weeksRemaining !== null ? p.weeksRemaining + "w" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ OVERHEAD ═══ */}
      {sub === "Overhead" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="primary" style={{ fontSize: 11, padding: "4px 12px" }} onClick={ohLoading ? undefined : () => showOh ? setShowOh(false) : ohResult ? setShowOh(true) : runOverheadProject()} disabled={ohLoading}>
              {ohLoading ? "Projecting..." : "AI Cost Projector"}
            </button>
          </div>

          {showOh && ohResult && (
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <DollarSign style={{ width: 22, height: 22 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Cost Health: {ohResult.healthScore}/100 ({ohResult.grade})</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{ohResult.summary}</div>
                  </div>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)" }} onClick={() => setShowOh(false)}>✕</button>
              </div>

              {ohResult.weeklyForecast?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 6 }}>4-Week Forecast</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                    {ohResult.weeklyForecast.map((w, i) => (
                      <div key={i} style={{ fontSize: 12, padding: "8px 10px", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)", textAlign: "center" }}>
                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{w.week}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>${w.projectedBurn?.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: w.trend === "up" ? "var(--red)" : w.trend === "down" ? "var(--green)" : "var(--text3)" }}>{w.trend === "up" ? "↑ Rising" : w.trend === "down" ? "↓ Falling" : "→ Stable"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ohResult.burnRateAlerts?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Burn Rate Alerts</div>
                  {ohResult.burnRateAlerts.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--red)" }}>
                      <div style={{ fontWeight: 500 }}>{a.project} — {a.burnRate}</div>
                      <div style={{ color: "var(--text3)" }}>{a.alert} · {a.weeksUntilBudgetExhausted}w until budget exhausted</div>
                      <div style={{ color: "var(--text2)", fontStyle: "italic" }}>{a.action}</div>
                    </div>
                  ))}
                </div>
              )}

              {ohResult.costOptimizations?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>Cost Optimizations</div>
                  {ohResult.costOptimizations.map((c, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{c.action}</span>
                      <span style={{ fontWeight: 600, color: "var(--green)", whiteSpace: "nowrap" }}>{c.potentialSaving} · {c.effort}</span>
                    </div>
                  ))}
                </div>
              )}

              {ohResult.quarterProjection && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6", marginBottom: 6 }}>Quarter Projection</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    <div style={{ fontSize: 12, padding: 8, background: "rgba(139,92,246,0.08)", borderRadius: "var(--radius)", textAlign: "center" }}>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>Spend</div>
                      <div style={{ fontWeight: 700 }}>${ohResult.quarterProjection.projectedSpend?.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: 12, padding: 8, background: "rgba(139,92,246,0.08)", borderRadius: "var(--radius)", textAlign: "center" }}>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>Revenue</div>
                      <div style={{ fontWeight: 700 }}>${ohResult.quarterProjection.projectedRevenue?.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: 12, padding: 8, background: "rgba(139,92,246,0.08)", borderRadius: "var(--radius)", textAlign: "center" }}>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>Profit</div>
                      <div style={{ fontWeight: 700, color: "var(--green)" }}>${ohResult.quarterProjection.projectedProfit?.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: 12, padding: 8, background: "rgba(139,92,246,0.08)", borderRadius: "var(--radius)", textAlign: "center" }}>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>Margin</div>
                      <div style={{ fontWeight: 700 }}>{ohResult.quarterProjection.profitMargin}</div>
                    </div>
                  </div>
                </div>
              )}

              {ohResult.profitRisks?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 6 }}>Profit Risks</div>
                  {ohResult.profitRisks.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)" }}>
                      <span style={{ fontWeight: 500 }}>{r.risk}:</span> {r.impact} — <em>{r.mitigation}</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="kpi-label">Weekly Burn Rate</div>
              <div className="kpi-value">{fmt(overheadData.weeklyBurn)}</div>
              <div className="kpi-sub">This week's scheduled labor cost</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Projected Monthly</div>
              <div className="kpi-value">{fmt(overheadData.monthlyBurn)}</div>
              <div className="kpi-sub">Weekly x 4.33</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Labor Budget</div>
              <div className="kpi-value">{fmt(overheadData.totalLaborBudget)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Remaining</div>
              <div className="kpi-value">{fmt(overheadData.totalRemaining)}</div>
            </div>
          </div>

          {overheadData.projectOverhead.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Contract</th>
                    <th>Labor Budget</th>
                    <th>Spent</th>
                    <th>Labor/Revenue %</th>
                    <th>Projected Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overheadData.projectOverhead.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semi">{p.name}</td>
                      <td className="font-mono text-sm">{fmt(p.contract)}</td>
                      <td className="font-mono text-sm">{fmt(p.laborBudget)}</td>
                      <td className="font-mono text-sm">{fmt(p.laborSpent)}</td>
                      <td className="font-mono text-sm">{p.laborRatio}%</td>
                      <td className="font-mono text-sm">{fmt(p.projectedTotal)}</td>
                      <td>
                        <span className={`badge ${p.overBudget ? "badge-red" : "badge-green"}`}>
                          {p.overBudget ? "Over Budget" : "On Track"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ MATERIAL REQUESTS ═══ */}
      {sub === "Material Requests" && (() => {
        const matReqs = materialRequests || [];
        const filtered = matFilter === "All" ? matReqs : matReqs.filter(r => r.status === matFilter.toLowerCase().replace(" ", "-"));
        const counts = { requested: 0, approved: 0, "in-transit": 0, delivered: 0 };
        matReqs.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
        const todayStr = new Date().toDateString();
        const deliveredToday = matReqs.filter(r => r.status === "delivered" && r.deliveredAt && new Date(r.deliveredAt).toDateString() === todayStr).length;

        return (
          <div>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card"><div className="kpi-label">Pending</div><div className="kpi-value" style={{ color: "var(--amber)" }}>{counts.requested}</div></div>
              <div className="kpi-card"><div className="kpi-label">Approved</div><div className="kpi-value" style={{ color: "var(--blue)" }}>{counts.approved}</div></div>
              <div className="kpi-card"><div className="kpi-label">In Transit</div><div className="kpi-value" style={{ color: "var(--amber)" }}>{counts["in-transit"]}</div></div>
              <div className="kpi-card"><div className="kpi-label">Delivered Today</div><div className="kpi-value" style={{ color: "var(--green)" }}>{deliveredToday}</div></div>
            </div>

            <div className="flex gap-8 mb-16">
              {["All", "Requested", "Approved", "Rejected", "In-Transit", "Delivered"].map(f => (
                <button key={f} className={`btn btn-sm ${matFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setMatFilter(f)}>
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Package style={{ width: 40, height: 40 }} /></div>
                <div className="empty-text">No material requests</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Project</th>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)).map(req => (
                      <tr key={req.id}>
                        <td className="font-semi">{req.employeeName}</td>
                        <td>{req.projectName}</td>
                        <td>{req.material}</td>
                        <td className="font-mono">{req.qty} {req.unit}</td>
                        <td>
                          <span className={`badge ${
                            req.status === "requested" ? "badge-amber" :
                            req.status === "approved" ? "badge-blue" :
                            req.status === "rejected" ? "badge-red" :
                            req.status === "in-transit" ? "badge-amber" :
                            "badge-green"
                          }`}>{req.status}</span>
                        </td>
                        <td className="text-sm text-muted">
                          {new Date(req.requestedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </td>
                        <td>
                          {req.status === "requested" && (
                            <div className="flex gap-4">
                              <button className="btn btn-sm btn-primary" onClick={() => setMaterialRequests(prev => prev.map(r =>
                                r.id === req.id ? { ...r, status: "approved", approvedAt: new Date().toISOString(), approvedBy: app.auth?.name || "Admin" } : r
                              ))}>Approve</button>
                              <button className="btn btn-sm" style={{ background: "var(--red-dim)", color: "var(--red)", border: "1px solid var(--red)" }} onClick={() => {
                                const reason = prompt("Rejection reason:");
                                if (reason !== null) setMaterialRequests(prev => prev.map(r =>
                                  r.id === req.id ? { ...r, status: "rejected", rejectedAt: new Date().toISOString(), rejectedBy: app.auth?.name || "Admin", rejectReason: reason } : r
                                ));
                              }}>Reject</button>
                            </div>
                          )}
                          {req.status === "approved" && req.approvedBy && (
                            <span className="text-xs text-dim">by {req.approvedBy}</span>
                          )}
                          {req.status === "rejected" && (
                            <div>
                              <span className="badge badge-red">Rejected</span>
                              {req.rejectedBy && <div className="text-xs text-dim mt-2">by {req.rejectedBy}</div>}
                              {req.rejectReason && <div className="text-xs text-dim">{req.rejectReason}</div>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ EMPLOYEES ═══ */}
      {sub === "Employees" && (
        <div>
          <div className="flex-between mb-16">
            <span className="text-sm text-muted">{employees.length} employees</span>
            <div style={{ display: "flex", gap: 8 }}>
              {canManageHires && (
                <button
                  className="btn btn-sm"
                  style={{ background: "rgba(224,148,34,0.12)", color: "#e09422", border: "1px solid rgba(224,148,34,0.3)" }}
                  onClick={() => setShowNewHire(true)}
                >
                  New Hire Onboarding
                </button>
              )}
              {canManageHires && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    setEditEmp({ name: "", role: "Journeyman", pin: "", phone: "", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 35, active: true })
                  }
                >
                  + Quick Add
                </button>
              )}
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>PIN</th>
                  <th>Rate</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-semi">{emp.name}</td>
                    <td>{emp.role}</td>
                    <td className="font-mono">{emp.pin}</td>
                    <td className="font-mono text-sm">${emp.hourlyRate || "—"}/hr</td>
                    <td className="font-mono text-sm">{emp.schedule?.start} — {emp.schedule?.end}</td>
                    <td>
                      <span className={`badge ${emp.active ? "badge-green" : "badge-muted"}`}>
                        {emp.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => setEditEmp({ ...emp })}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New Hire Onboarding Wizard */}
          {showNewHire && (
            <NewHireWizard
              onClose={() => setShowNewHire(false)}
              onSubmit={(emp) => {
                setEmployees((prev) => [...prev, emp]);
                setShowNewHire(false);
                show(`${emp.name} onboarded successfully (PIN: ${emp.pin})`, "ok");
              }}
            />
          )}

          {/* Edit Employee Modal */}
          {editEmp && (
            <div className="modal-overlay" onClick={() => setEditEmp(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{editEmp.id ? "Edit Employee" : "Add Employee"}</div>
                  <button className="modal-close" onClick={() => setEditEmp(null)}>x</button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={editEmp.name} onChange={(e) => setEditEmp({ ...editEmp, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={editEmp.role} onChange={(e) => setEditEmp({ ...editEmp, role: e.target.value })}>
                      <option>Foreman</option>
                      <option>Journeyman</option>
                      <option>Apprentice</option>
                      <option>Laborer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIN (4 digits)</label>
                    <input className="form-input" value={editEmp.pin} maxLength={4} onChange={(e) => setEditEmp({ ...editEmp, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hourly Rate ($)</label>
                    <input className="form-input" type="number" value={editEmp.hourlyRate || ""} onChange={(e) => setEditEmp({ ...editEmp, hourlyRate: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={editEmp.phone} onChange={(e) => setEditEmp({ ...editEmp, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input className="form-input" type="time" value={editEmp.schedule?.start || ""} onChange={(e) => setEditEmp({ ...editEmp, schedule: { ...editEmp.schedule, start: e.target.value } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input className="form-input" type="time" value={editEmp.schedule?.end || ""} onChange={(e) => setEditEmp({ ...editEmp, schedule: { ...editEmp.schedule, end: e.target.value } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input type="checkbox" checked={editEmp.active} onChange={(e) => setEditEmp({ ...editEmp, active: e.target.checked })} style={{ marginRight: 6 }} />
                      Active
                    </label>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => setEditEmp(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => handleSaveEmployee(editEmp)} disabled={!editEmp.name || editEmp.pin.length !== 4}>
                    {editEmp.id ? "Save" : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ LOCATIONS ═══ */}
      {sub === "Locations" && (
        <div>
          <div className="flex-between mb-16">
            <span className="text-sm text-muted">Company locations + project geofences</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setEditLoc({ name: "", lat: "", lng: "", radiusFt: 1000, type: "office" })}
            >
              + Add Location
            </button>
          </div>

          <div className="card-title mb-12">Company Locations</div>
          <div className="table-wrap mb-24">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Lat</th>
                  <th>Lng</th>
                  <th>Radius (ft)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companyLocations.map((loc) => (
                  <tr key={loc.id}>
                    <td className="font-semi">{loc.name}</td>
                    <td><span className="badge badge-blue">{loc.type}</span></td>
                    <td className="font-mono text-sm">{loc.lat}</td>
                    <td className="font-mono text-sm">{loc.lng}</td>
                    <td className="font-mono text-sm">{loc.radiusFt}</td>
                    <td>
                      <button className="btn-icon" onClick={() => setEditLoc({ ...loc })}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-title mb-12">Project Geofences</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>GC</th>
                  <th>Lat</th>
                  <th>Lng</th>
                  <th>Radius (ft)</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semi">{p.name}</td>
                    <td>{p.gc}</td>
                    <td className="font-mono text-sm">{p.lat || "—"}</td>
                    <td className="font-mono text-sm">{p.lng || "—"}</td>
                    <td className="font-mono text-sm">{p.radiusFt || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Location Modal */}
          {editLoc && (
            <div className="modal-overlay" onClick={() => setEditLoc(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{editLoc.id ? "Edit Location" : "Add Location"}</div>
                  <button className="modal-close" onClick={() => setEditLoc(null)}>x</button>
                </div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={editLoc.name} onChange={(e) => setEditLoc({ ...editLoc, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={editLoc.type} onChange={(e) => setEditLoc({ ...editLoc, type: e.target.value })}>
                      <option value="office">Office</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="yard">Yard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Radius (ft)</label>
                    <input className="form-input" type="number" value={editLoc.radiusFt} onChange={(e) => setEditLoc({ ...editLoc, radiusFt: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input className="form-input" type="number" step="0.0001" value={editLoc.lat} onChange={(e) => setEditLoc({ ...editLoc, lat: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input className="form-input" type="number" step="0.0001" value={editLoc.lng} onChange={(e) => setEditLoc({ ...editLoc, lng: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => setEditLoc(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => handleSaveLocation(editLoc)} disabled={!editLoc.name || !editLoc.lat || !editLoc.lng}>
                    {editLoc.id ? "Save" : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
