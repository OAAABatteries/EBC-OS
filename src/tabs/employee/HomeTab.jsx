import { useMemo, useState, useEffect, useCallback } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { PremiumCard, StatTile, AlertCard, EmptyState, FieldButton } from '../../components/field';
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
export function HomeTab({ activeEmp, isClockedIn, activeEntry, now, weekTotal, mySchedule, myMatRequests, projects, areas, setEmpTab, setSelectedInfoProject, onReportProblem, drawingRevisionAlerts, t, lang }) {
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

  const loadCredentials = useCallback(async () => {
    if (!activeEmp?.id) return;
    try {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('employee_id', activeEmp.id);
      if (!error && data) setCredentials(data);
    } catch {}
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
    // Sort newest first
    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [credentials, myMatRequests, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="emp-content">
      {/* Greeting */}
      <div style={{padding: `0 0 var(--space-2)`}}>
        <span className="home-clock-elapsed">{greeting}, {activeEmp?.name?.split(' ')[0]}</span>
      </div>

      {/* 1. Clock status hero — per D-05, D-06, HOME-01 */}
      <PremiumCard variant="hero" className="home-clock-hero" onClick={() => setEmpTab("clock")}>
        <div className={`home-clock-status${isClockedIn ? ' active' : ''}`}>
          {isClockedIn ? t("ON CLOCK") : t("OFF CLOCK")}
        </div>
        <div className="home-clock-elapsed">
          {isClockedIn
            ? `${clockElapsed} ${t("on clock")}`
            : (activeEntry
              ? `${t("Last punch")}: ${new Date(activeEntry.clockOut || activeEntry.clockIn).toLocaleTimeString(lang === 'es' ? 'es' : 'en', {hour:'numeric', minute:'2-digit'})}`
              : '')}
        </div>
      </PremiumCard>

      {/* 2. Stat tiles row — per D-07, HOME-02 */}
      <div className="home-stat-row" style={{marginTop: 'var(--space-8)'}}>
        <StatTile label={t("Hours")} value={weekTotal.toFixed(1)} onTap={() => setEmpTab("log")} t={t} />
        <StatTile label={t("Tasks")} value={String(activeTaskCount)} onTap={() => setEmpTab("schedule")} t={t} />
        <StatTile label={t("Pending")} value={String(pendingCount)} onTap={() => setEmpTab("materials")} t={t} />
      </div>

      {/* 3. Active project card with task/area detail — per D-05, HOME-03 */}
      {assignedProject ? (
        <div style={{marginTop: 'var(--space-8)'}}>
          <div className="section-label">{t("TODAY'S WORK")}</div>
          <PremiumCard variant="info" className="home-project-card" onClick={() => setSelectedInfoProject(assignedProject.id)} style={{marginTop: 'var(--space-2)'}}>
            <div className="text-base font-bold">{assignedProject.name}</div>
            <div className="text-sm text-muted">{assignedProject.address || assignedProject.location || ''}</div>
            {/* Area/task/trade detail from schedule */}
            {todayWork.length > 0 && todayWork[0].task && (
              <div style={{marginTop: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8}}>
                {todayWork.map((w, i) => (
                  <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8, padding: i > 0 ? '6px 0 0' : 0, borderTop: i > 0 ? '1px solid var(--border)' : 'none'}}>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: 14, fontWeight: 700, color: 'var(--text)'}}>{w.task || w.areaName}</div>
                      <div style={{fontSize: 12, color: 'var(--text2)'}}>
                        {w.floor && `${t("Floor")} ${w.floor}`}{w.zone && `, ${t("Zone")} ${w.zone}`}
                        {w.areaName && w.task !== w.areaName && ` — ${w.areaName}`}
                      </div>
                    </div>
                    {w.trade && (
                      <span style={{fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--amber-dim, rgba(245,158,11,0.15))', color: 'var(--amber)', textTransform: 'uppercase'}}>{w.trade}</span>
                    )}
                  </div>
                ))}
                {/* Quick-log shortcut */}
                <FieldButton variant="ghost" onClick={(e) => { e.stopPropagation(); setEmpTab("production"); }} t={t}
                  style={{width: '100%', marginTop: 8, fontSize: 12, gap: 6, justifyContent: 'center', color: 'var(--green)', borderColor: 'var(--green)', border: '1px solid var(--green)', borderRadius: 6}}>
                  {t("Log Progress")}
                </FieldButton>
              </div>
            )}
          </PremiumCard>
        </div>
      ) : (
        <div style={{marginTop: 'var(--space-8)'}}>
          <div className="section-label">{t("TODAY'S WORK")}</div>
          <PremiumCard variant="info" style={{marginTop: 'var(--space-2)', textAlign: 'center', padding: 16, opacity: 0.7}}>
            <div className="text-sm text-muted">{t("No assignment today")}</div>
            <div className="text-xs text-dim" style={{marginTop: 4}}>{t("Check with your foreman")}</div>
          </PremiumCard>
        </div>
      )}

      {/* 3b. Report Problem FAB — 1-tap access from home */}
      {onReportProblem && (
        <div style={{marginTop: 'var(--space-8)'}}>
          <FieldButton variant="outline" onClick={onReportProblem} t={t}
            style={{width: '100%', gap: 8, justifyContent: 'center', color: 'var(--warning)', borderColor: 'var(--warning)'}}>
            <AlertTriangle size={16} /> {t("Report Problem")}
          </FieldButton>
        </div>
      )}

      {/* 4. Alerts feed — per D-08, HOME-04, HOME-05 */}
      <div className="home-alerts-section" style={{marginTop: 'var(--space-8)'}}>
        {homeAlerts.length > 0 ? (
          <>
            <div className="home-alerts-header">
              <span className="section-label">{t("ALERTS")}</span>
              {homeAlerts.length > 3 && !showAllAlerts && (
                <button className="view-all-link" onClick={() => setShowAllAlerts(true)}>{t("View All")}</button>
              )}
            </div>
            {(showAllAlerts ? homeAlerts : homeAlerts.slice(0, 3)).map(alert => (
              <AlertCard key={alert.id} type={alert.type} message={alert.message}
                timestamp={alert.timestamp} onTap={() => setEmpTab(alert.sourceTab)} t={t} />
            ))}
          </>
        ) : (
          <>
            <div className="section-label">{t("ALERTS")}</div>
            <EmptyState icon={Calendar} heading={t("No alerts right now")}
              action={<FieldButton variant="ghost" onClick={() => setEmpTab("schedule")} t={t}>{t("View Schedule")}</FieldButton>} t={t} />
          </>
        )}
      </div>

      {/* 5. Tomorrow preview — what's next */}
      {(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = ['sun','mon','tue','wed','thu','fri','sat'][tomorrow.getDay()];
        const tomorrowWork = mySchedule.filter(s => s.days?.[tomorrowKey] && s.projectId).map(s => {
          const proj = projects.find(p => p.id === s.projectId);
          const area = s.areaId ? (areas || []).find(a => String(a.id) === String(s.areaId)) : null;
          return { task: s.task || area?.name || proj?.name || "", trade: s.trade || "", floor: s.floor || area?.floor || "", zone: s.zone || area?.zone || "" };
        });
        if (tomorrowWork.length === 0) return null;
        return (
          <div style={{marginTop: 'var(--space-8)'}}>
            <div className="section-label">{t("TOMORROW")}</div>
            <div style={{marginTop: 'var(--space-2)', padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '3px solid var(--blue)'}}>
              {tomorrowWork.map((w, i) => (
                <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: i > 0 ? '4px 0 0' : 0}}>
                  <span className="text-sm">{w.task}{w.floor ? ` — ${t("Floor")} ${w.floor}` : ""}</span>
                  {w.trade && <span style={{fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--blue-dim, rgba(59,130,246,0.15))', color: 'var(--blue)'}}>{w.trade}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
