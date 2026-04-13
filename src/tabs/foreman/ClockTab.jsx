import { Clock, StopCircle, MapPin, AlertTriangle } from "lucide-react";
import { FieldButton } from "../../components/field";

export function ClockTab({
  clockEntry, isClockedIn, handleClockIn, handleClockOut,
  selectedProjectId, setSelectedProjectId, clockProjectSearch, setClockProjectSearch,
  myProjects, projects, selectedProject, gpsStatus,
  myTodayEntries, myTodayHours, lang, t,
  setShowReportProblem,
}) {
  return (
    <div className="emp-content">
      <div className="frm-text-center" style={{ padding: "var(--space-8) var(--space-5)" }}>
        {/* Big clock display */}
        <div className="frm-clock-big">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-sm text-muted frm-mb-24">
          {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>

        {gpsStatus && <div className="text-xs text-muted frm-mb-10">{gpsStatus}</div>}

        {/* Project Lookup for Clock-In */}
        {!isClockedIn && (
          <div className="frm-project-search-wrap">
            <label className="form-label frm-text-center mb-sp2 d-block">{t("Select Project")}</label>
            <input
              className="form-input frm-text-center frm-mb-6"
              type="text"
              placeholder={t("Search project name or address...")}
              value={clockProjectSearch}
              onChange={(e) => setClockProjectSearch(e.target.value)}
            />
            <div className="frm-project-list">
              {(myProjects || projects)
                .filter(p => {
                  if (!clockProjectSearch.trim()) return true;
                  const q = clockProjectSearch.toLowerCase();
                  return (p.name || "").toLowerCase().includes(q) ||
                         (p.address || "").toLowerCase().includes(q) ||
                         (p.gc || "").toLowerCase().includes(q);
                })
                .slice(0, 10)
                .map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setClockProjectSearch(""); }}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--glass-border)",
                      background: selectedProjectId === p.id ? "var(--accent-dim)" : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div className="text-sm font-semi">{p.name}</div>
                      <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                    </div>
                    {selectedProjectId === p.id && <span className="fs-section c-green">✓</span>}
                  </div>
                ))}
            </div>
            {selectedProject && (
              <div className="text-sm font-semi frm-selected-project">
                <MapPin size={14} />{selectedProject.name}
              </div>
            )}
          </div>
        )}

        {!isClockedIn ? (
          <button
            className="btn btn-primary frm-clock-btn"
            onClick={handleClockIn}
            disabled={!selectedProjectId}
          >
            <Clock size={40} />
            {t("CLOCK IN")}
          </button>
        ) : (
          <>
            <div className="frm-mb-16">
              <div className="text-xs text-muted">{t("Clocked in at")}</div>
              <div className="frm-font-20 c-green">
                {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs text-muted frm-mt-4">
                {(() => {
                  const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                  const hrs = Math.floor(elapsed / 3600000);
                  const mins = Math.floor((elapsed % 3600000) / 60000);
                  return `${hrs}h ${mins}m ${t("elapsed")}`;
                })()}
              </div>
            </div>
            <button
              className="btn frm-clock-out-btn"
              onClick={handleClockOut}
            >
              <StopCircle size={40} />
              {t("CLOCK OUT")}
            </button>
          </>
        )}

        {/* Today's entries */}
        {myTodayEntries.length > 0 && (
          <div className="frm-mt-30">
            <div className="section-title frm-font-14 frm-mb-8">{t("Today's Time Log")}</div>
            {myTodayEntries.map((te, i) => (
              <div key={i} className="foreman-team-row mb-sp1" style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div>
                  <div className="text-sm font-semi">
                    {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-xs text-muted">
                    {projects.find(p => String(p.id) === String(te.projectId))?.name || t("General")}
                  </div>
                </div>
                <div className="foreman-team-hours">{te.totalHours}h</div>
              </div>
            ))}
            <div className="text-sm font-semi frm-text-right frm-mt-8 frm-amber">
              {t("Total")}: {myTodayHours.toFixed(1)}h
            </div>
          </div>
        )}

        {/* Report Problem button */}
        <div className="frm-mt-30">
          <FieldButton variant="warning" className="foreman-report-problem-btn" onClick={() => setShowReportProblem(true)} t={t}>
            <AlertTriangle size={18} /> {t("Report a Problem")}
          </FieldButton>
        </div>
      </div>
    </div>
  );
}
