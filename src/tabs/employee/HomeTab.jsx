import { useMemo, useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * HomeTab — Employee home dashboard (clock hero, stat tiles, project card, alerts)
 *
 * Props:
 *   activeEmp        — logged-in employee object
 *   isClockedIn      — boolean clock status
 *   activeEntry      — current time entry or null
 *   now              — Date ticker (updated every second)
 *   weekTotal        — number, hours this week
 *   mySchedule       — array of schedule assignments
 *   myMatRequests    — array of material requests
 *   projects         — array of all projects
 *   setEmpTab        — function to switch tabs
 *   setSelectedInfoProject — function to select project detail
 *   t                — translation function
 *   lang             — 'en' | 'es'
 */
export function HomeTab({ activeEmp, isClockedIn, activeEntry, now, weekTotal, mySchedule, myMatRequests, projects, areas, setEmpTab, setSelectedInfoProject, onReportProblem, drawingRevisionAlerts, scheduleChangeAlerts, t, lang }) {
  // --- Greeting (time-of-day based) ---
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("Good Morning");
    if (hour < 17) return t("Good Afternoon");
    return t("Good Evening");
  }, [now, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Clock elapsed display ---
  const clockElapsed = useMemo(() => {
    if (!activeEntry) return null;
    const start = new Date(activeEntry.clockIn);
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }, [activeEntry, now]);

  // --- Assigned project + area/task from today's schedule ---
  const todayAssignments = useMemo(() => {
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    return mySchedule.filter(s => s.days?.[todayKey] && s.projectId);
  }, [mySchedule]);

  const assignedProject = useMemo(() => {
    if (todayAssignments.length === 0) return null;
    return projects.find(p => p.id === todayAssignments[0].projectId) || null;
  }, [todayAssignments, projects]);

  // Derive area/task/trade/floor/zone from schedule + areas data
  const todayWork = useMemo(() => {
    return todayAssignments.map(s => {
      const proj = projects.find(p => p.id === s.projectId);
      const area = s.areaId ? (areas || []).find(a => String(a.id) === String(s.areaId)) : null;
      return {
        projectName: proj?.name || "Unknown",
        task: s.task || area?.name || "",
        trade: s.trade || "",
        floor: s.floor || area?.floor || "",
        zone: s.zone || area?.zone || "",
        areaName: area?.name || "",
        areaNotes: area?.notes || "",
      };
    });
  }, [todayAssignments, projects, areas]);

  // --- Stat counts ---
  const activeTaskCount = useMemo(() => {
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    return mySchedule.filter(s => s.days?.[todayKey] && s.projectId).length;
  }, [mySchedule]);

  const pendingCount = useMemo(() => {
    return (myMatRequests || []).filter(r => r.status === "requested").length;
  }, [myMatRequests]);

  // --- Credential expiry alerts (CRED-03) ---
  const [credentials, setCredentials] = useState([]);
  const [credLoading, setCredLoading] = useState(true);

  const loadCredentials = useCallback(async () => {
    if (!activeEmp?.id) { setCredLoading(false); return; }
    setCredLoading(true);
    try {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('employee_id', activeEmp.id);
      if (!error && data) setCredentials(data);
    } catch {}
    setCredLoading(false);
  }, [activeEmp?.id]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  // --- Alert derivation (credential expiry + material approvals) ---
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const homeAlerts = useMemo(() => {
    const alerts = [];
    // Credential expiry alerts (CRED-03)
    credentials.forEach(cert => {
      if (!cert.expiry_date) return;
      const days = Math.ceil((new Date(cert.expiry_date) - new Date()) / 86400000);
      if (days <= 30) {
        alerts.push({
          id: `cred-${cert.id}`,
          type: days <= 0 ? 'error' : 'warning',
          message: days <= 0
            ? `${cert.cert_type} ${t("expired")}`
            : `${cert.cert_type} — ${days} ${t("days until expiry")}`,
          timestamp: cert.expiry_date,
          sourceTab: 'credentials',
        });
      }
    });
    // Material approval alerts
    (myMatRequests || []).filter(r => r.status === 'approved').forEach(r => {
      alerts.push({
        id: `mat-${r.id}`,
        type: 'success',
        message: `${r.material} ${t("approved")}`,
        timestamp: r.approvedAt || r.requestedAt,
        sourceTab: 'materials',
      });
    });
    // Drawing revision alerts (from parent — auto-detected revision changes)
    (drawingRevisionAlerts || []).forEach((d, i) => {
      alerts.push({
        id: `drawing-rev-${i}`,
        type: 'error',
        message: `${t("New drawing")}: ${d.drawing} — ${d.revLabel}`,
        timestamp: new Date().toISOString(),
        sourceTab: 'drawings',
      });
    });
    // 7.1 — Schedule change alerts
    (scheduleChangeAlerts || []).forEach((c, i) => {
      let msg = '';
      if (c.type === 'added') msg = `${t("New assignment")}: ${c.project}`;
      else if (c.type === 'removed') msg = `${t("Removed")}: ${c.project}`;
      else if (c.type === 'added_day') msg = `${c.project} — ${t("added")} ${c.day.toUpperCase()}`;
      else if (c.type === 'removed_day') msg = `${c.project} — ${c.day.toUpperCase()} ${t("removed")}`;
      else if (c.type === 'time_change') msg = `${c.project} — ${t("time changed")} ${c.newStart || '?'}–${c.newEnd || '?'}`;
      if (msg) {
        alerts.push({
          id: `sched-change-${i}`,
          type: c.type === 'removed' || c.type === 'removed_day' ? 'warning' : 'info',
          message: msg,
          timestamp: new Date().toISOString(),
          sourceTab: 'schedule',
        });
      }
    });
    // Sort newest first
    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [credentials, myMatRequests, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Derive foreman name from schedule if available ---
  const foremanName = useMemo(() => {
    if (todayAssignments.length === 0) return null;
    const s = todayAssignments[0];
    return s.foremanName || s.foreman || null;
  }, [todayAssignments]);

  // --- Derive status state ---
  const statusState = useMemo(() => {
    if (isClockedIn) return 'on-clock';
    if (assignedProject && !isClockedIn) return 'ready';
    return 'off-clock';
  }, [isClockedIn, assignedProject]);

  // --- Issue count ---
  const issueCount = homeAlerts.filter(a => a.type === 'error' || a.type === 'warning').length;

  // --- Has drawings for assigned project ---
  const hasDrawings = assignedProject ? true : false; // placeholder — will be refined

  return (
    <div className="emp-content">

      {/* ═══ A. STATUS PANEL — the hero. One block. Owns the screen. ═══ */}
      <div className={`hs-panel hs-panel--${statusState}`}>

        {/* Status label */}
        <div className="hs-status-label">{t("Current Status")}</div>

        {/* Status state — the largest text on screen */}
        <div className="hs-status-state">
          {statusState === 'on-clock' && t("On Clock")}
          {statusState === 'ready' && t("Ready to Check In")}
          {statusState === 'off-clock' && t("Off Clock")}
        </div>

        {/* Status explanation — specific, not generic */}
        <div className="hs-status-explain">
          {statusState === 'on-clock' && assignedProject && (
            <>{t("Working at")} {assignedProject.name}. {clockElapsed} {t("elapsed")}.</>
          )}
          {statusState === 'on-clock' && !assignedProject && (
            <>{clockElapsed} {t("elapsed")}. {t("No project assigned to this punch.")}</>
          )}
          {statusState === 'ready' && (
            <>{t("You are assigned to")} {assignedProject.name}.</>
          )}
          {statusState === 'off-clock' && !assignedProject && (
            <>{t("No assignment has been posted for your crew today.")}</>
          )}
          {statusState === 'off-clock' && assignedProject && (
            <>{t("Assigned to")} {assignedProject.name}. {t("Not clocked in.")}</>
          )}
        </div>

        {/* Context row — crew, foreman, time */}
        <div className="hs-context">
          {foremanName && <span>{t("Foreman")}: {foremanName}</span>}
          {assignedProject && todayWork.length > 0 && todayWork[0].floor && (
            <span>{t("Area")}: {todayWork[0].task || todayWork[0].areaName}{todayWork[0].floor ? `, ${t("Fl")} ${todayWork[0].floor}` : ''}</span>
          )}
          {isClockedIn && activeEntry && (
            <span>{t("Since")} {new Date(activeEntry.clockIn).toLocaleTimeString(lang === 'es' ? 'es' : 'en', {hour:'numeric', minute:'2-digit'})}</span>
          )}
        </div>

        {/* Primary action */}
        <button className="hs-action" onClick={() => setEmpTab("clock")}>
          {statusState === 'on-clock' && t("View Punch")}
          {statusState === 'ready' && t("Check In")}
          {statusState === 'off-clock' && t("View Schedule")}
        </button>

        {/* Secondary: report issue — inline, not a separate element */}
        {onReportProblem && (
          <button className="hs-report" onClick={(e) => { e.stopPropagation(); onReportProblem(); }}>
            {t("Report issue")}
          </button>
        )}
      </div>

      {/* ═══ B. TODAY'S WORK — subordinate to status, only if real data ═══ */}
      {assignedProject && todayWork.length > 0 && todayWork[0].task && (
        <div className="hs-today" onClick={() => setSelectedInfoProject(assignedProject.id)}>
          <div className="hs-today-label">{t("Today's Work")}</div>
          {todayWork.map((w, i) => (
            <div key={i} className="hs-today-row">
              <div className="hs-today-task">{w.task || w.areaName}</div>
              <div className="hs-today-meta">
                {w.floor && <span>{t("Fl")} {w.floor}{w.zone ? ` / ${w.zone}` : ''}</span>}
                {w.trade && <span className="hs-trade">{w.trade}</span>}
              </div>
            </div>
          ))}
          <button className="hs-today-action" onClick={(e) => { e.stopPropagation(); setEmpTab("production"); }}>
            {t("Log Progress")} &rsaquo;
          </button>
        </div>
      )}

      {/* ═══ B2. TOMORROW PREVIEW — 7.4 ═══ */}
      {(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = ['sun','mon','tue','wed','thu','fri','sat'][tomorrow.getDay()];
        const tomorrowAssignments = mySchedule.filter(s => s.days?.[tomorrowKey] && s.projectId);
        if (tomorrowAssignments.length === 0) return null;
        return (
          <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-3)', borderLeft: '3px solid var(--accent, #3b82f6)' }}>
            <div style={{ fontSize: 'var(--text-label)', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 'var(--space-1)', fontWeight: 'var(--weight-semi)' }}>
              {t("Tomorrow")} — {tomorrow.toLocaleDateString(lang === 'es' ? 'es' : 'en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {tomorrowAssignments.map((s, i) => {
              const proj = projects.find(p => p.id === s.projectId);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-1) 0' }}>
                  <span style={{ fontSize: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                    {proj?.name || t("Project")}
                  </span>
                  <span style={{ fontSize: 'var(--text-label)', color: 'var(--text2)' }}>
                    {s.hours?.start || '06:30'} — {s.hours?.end || '15:00'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ═══ C. QUICK INFO — one dense row, not three cards ═══ */}
      <div className="hs-quick">
        <button className="hs-quick-item" onClick={() => setEmpTab("log")}>
          <span className="hs-quick-val">{weekTotal.toFixed(1)}h</span>
          <span className="hs-quick-lbl">{t("this week")}</span>
        </button>
        <button className="hs-quick-item" onClick={() => setEmpTab("drawings")}>
          <span className="hs-quick-val">{hasDrawings ? t("Available") : t("None")}</span>
          <span className="hs-quick-lbl">{t("drawings")}</span>
        </button>
        <button className="hs-quick-item" onClick={() => issueCount > 0 ? setEmpTab("credentials") : null}>
          <span className={`hs-quick-val${issueCount > 0 ? ' hs-quick-val--alert' : ''}`}>{issueCount}</span>
          <span className="hs-quick-lbl">{issueCount === 1 ? t("issue") : t("issues")}</span>
        </button>
      </div>

      {/* ═══ D. ALERTS — only if real alerts exist. No empty card. ═══ */}
      {!credLoading && homeAlerts.length > 0 && (
        <div className="hs-alerts">
          {(showAllAlerts ? homeAlerts : homeAlerts.slice(0, 3)).map(alert => (
            <button key={alert.id} className={`hs-alert hs-alert--${alert.type}`} onClick={() => setEmpTab(alert.sourceTab)}>
              <span className="hs-alert-dot" />
              <span className="hs-alert-text">{alert.message}</span>
              <span className="hs-alert-arrow">&rsaquo;</span>
            </button>
          ))}
          {homeAlerts.length > 3 && !showAllAlerts && (
            <button className="hs-alerts-more" onClick={() => setShowAllAlerts(true)}>
              {t("View all")} {homeAlerts.length} {t("alerts")}
            </button>
          )}
        </div>
      )}

      {/* ═══ E. TOOLS — quiet operational shortcuts ═══ */}
      <div className="hs-tools">
        <button className="hs-tool" onClick={() => setEmpTab("drawings")}>{t("Drawings")}</button>
        <button className="hs-tool" onClick={() => setEmpTab("production")}>{t("Log Work")}</button>
        <button className="hs-tool" onClick={() => setEmpTab("schedule")}>{t("Schedule")}</button>
      </div>
    </div>
  );
}
