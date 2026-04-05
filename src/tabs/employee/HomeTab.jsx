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
export function HomeTab({ activeEmp, isClockedIn, activeEntry, now, weekTotal, mySchedule, myMatRequests, projects, setEmpTab, setSelectedInfoProject, onReportProblem, t, lang }) {
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

  // --- Assigned project from today's schedule ---
  const assignedProject = useMemo(() => {
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const todayAssignment = mySchedule.find(s => s.days?.[todayKey] && s.projectId);
    if (!todayAssignment) return null;
    return projects.find(p => p.id === todayAssignment.projectId) || null;
  }, [mySchedule, projects]);

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

      {/* 3. Active project card — per D-05, HOME-03 */}
      {assignedProject && (
        <div style={{marginTop: 'var(--space-8)'}}>
          <div className="section-label">{t("ACTIVE PROJECT")}</div>
          <PremiumCard variant="info" className="home-project-card" onClick={() => setSelectedInfoProject(assignedProject.id)} style={{marginTop: 'var(--space-2)'}}>
            <div className="text-base font-bold">{assignedProject.name}</div>
            <div className="text-sm text-muted">{assignedProject.address || assignedProject.location || ''}</div>
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
    </div>
  );
}
