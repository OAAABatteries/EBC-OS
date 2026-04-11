import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart2, HardHat } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Gantt Schedule View
//  Pure CSS/JS timeline for project scheduling
// ═══════════════════════════════════════════════════════════════

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

function startOfWeek(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
  return dt;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function fmtMonth(d) {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fmtWeek(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtK(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

function getProjectStatus(p) {
  const now = new Date();
  const start = p.start ? new Date(p.start) : null;
  const end = p.end ? new Date(p.end) : null;

  if ((p.progress || 0) >= 100 || p.status === "completed") return "completed";
  if (p.status === "on-hold") return "on-hold";

  if (end && start && !isNaN(end) && !isNaN(start)) {
    if (now > end) return "behind";
    const totalDays = (end - start) / DAY_MS;
    const elapsed = (now - start) / DAY_MS;
    const expected = totalDays > 0 ? Math.min(100, (elapsed / totalDays) * 100) : 0;
    if ((p.progress || 0) < expected - 15) return "behind";
  }

  if (start && now < start) return "upcoming";
  return "in-progress";
}

const STATUS_COLORS = {
  "in-progress": "#10b981",
  "upcoming": "#f59e0b",
  "completed": "#6b7280",
  "behind": "#ef4444",
  "on-hold": "#8b5cf6",
};

const STATUS_LABELS = {
  "in-progress": "In Progress",
  "upcoming": "Upcoming",
  "completed": "Completed",
  "behind": "Behind Schedule",
  "on-hold": "On Hold",
};

const ROW_HEIGHT = 52;
const CREW_ROW_HEIGHT = 20;
const LABEL_WIDTH = 240;

export function GanttScheduleView({ projects, onProjectClick }) {
  const [zoom, setZoom] = useState("month"); // "month" | "week"
  const scrollRef = useRef(null);
  const headerScrollRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Filter to projects with dates, sort by start
  const ganttProjects = useMemo(() => {
    return projects
      .filter(p => p.start)
      .map(p => ({
        ...p,
        startDate: new Date(p.start),
        endDate: p.end ? new Date(p.end) : (() => {
          const d = new Date(p.start);
          d.setDate(d.getDate() + 60);
          return d;
        })(),
        ganttStatus: getProjectStatus(p),
      }))
      .sort((a, b) => a.startDate - b.startDate);
  }, [projects]);

  // Timeline range: earliest start - 2 weeks to latest end + 4 weeks
  const { timelineStart, timelineEnd, columns, colWidth, totalWidth } = useMemo(() => {
    if (ganttProjects.length === 0) return { timelineStart: new Date(), timelineEnd: new Date(), columns: [], colWidth: 0, totalWidth: 0 };

    const earliest = new Date(Math.min(...ganttProjects.map(p => p.startDate.getTime())));
    const latest = new Date(Math.max(...ganttProjects.map(p => p.endDate.getTime())));

    let tlStart, tlEnd, cols;
    const cw = zoom === "month" ? 120 : 80;

    if (zoom === "month") {
      tlStart = startOfMonth(new Date(earliest.getFullYear(), earliest.getMonth() - 1, 1));
      tlEnd = addMonths(startOfMonth(latest), 3);
      cols = [];
      let cur = new Date(tlStart);
      while (cur < tlEnd) {
        cols.push({ date: new Date(cur), label: fmtMonth(cur) });
        cur = addMonths(cur, 1);
      }
    } else {
      tlStart = startOfWeek(new Date(earliest.getTime() - 2 * WEEK_MS));
      tlEnd = new Date(latest.getTime() + 4 * WEEK_MS);
      cols = [];
      let cur = new Date(tlStart);
      while (cur < tlEnd) {
        cols.push({ date: new Date(cur), label: fmtWeek(cur) });
        cur = new Date(cur.getTime() + WEEK_MS);
      }
    }

    return {
      timelineStart: tlStart,
      timelineEnd: tlEnd,
      columns: cols,
      colWidth: cw,
      totalWidth: cols.length * cw,
    };
  }, [ganttProjects, zoom]);

  // Today marker position
  const todayOffset = useMemo(() => {
    const now = new Date();
    if (totalWidth === 0) return -1;
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const elapsed = now.getTime() - timelineStart.getTime();
    return (elapsed / totalMs) * totalWidth;
  }, [timelineStart, timelineEnd, totalWidth]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 300);
    }
  }, [todayOffset, zoom]);

  // Sync header scroll with body
  const handleBodyScroll = (e) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Mini stats
  const stats = useMemo(() => {
    const now = new Date();
    const active = ganttProjects.filter(p => p.ganttStatus === "in-progress" || p.ganttStatus === "behind").length;
    const totalCrew = ganttProjects
      .filter(p => p.ganttStatus === "in-progress" || p.ganttStatus === "behind")
      .reduce((sum, p) => sum + (p.teamSize || 0), 0);
    // Weeks of backlog = sum of remaining weeks across upcoming + in-progress
    const backlogWeeks = ganttProjects
      .filter(p => p.ganttStatus !== "completed")
      .reduce((sum, p) => {
        const remaining = Math.max(0, p.endDate.getTime() - Math.max(now.getTime(), p.startDate.getTime()));
        return sum + remaining / WEEK_MS;
      }, 0);
    return { active, totalCrew, backlogWeeks: Math.round(backlogWeeks) };
  }, [ganttProjects]);

  // Projects without dates
  const undatedCount = projects.filter(p => !p.start).length;

  if (ganttProjects.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-10)" }}>
        <div style={{ marginBottom: "var(--space-3)", opacity: 0.3, display: "flex", justifyContent: "center" }}><BarChart2 style={{ width: 48, height: 48 }} /></div>
        <div style={{ color: "var(--text2)" }}>No projects with schedule dates</div>
        <div style={{ color: "var(--text3)", fontSize: "var(--text-label)", marginTop: "var(--space-1)" }}>Add start/end dates to projects to see the Gantt timeline</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Active Projects</div>
          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: "var(--green)", fontFamily: "var(--font-mono)" }}>{stats.active}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Crew Deployed</div>
          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: "var(--blue)", fontFamily: "var(--font-mono)" }}>{stats.totalCrew}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Backlog</div>
          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: "var(--amber)", fontFamily: "var(--font-mono)" }}>{stats.backlogWeeks}<span style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-normal)" }}> wks</span></div>
        </div>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Scheduled</div>
          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: "var(--text)", fontFamily: "var(--font-mono)" }}>{ganttProjects.length}<span style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-normal)", color: "var(--text3)" }}> / {projects.length}</span></div>
        </div>
      </div>

      {/* Zoom Toggle + Legend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <div style={{ display: "flex", gap: "var(--space-1)" }}>
          <button
            className={`btn btn-sm ${zoom === "month" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setZoom("month")}
          >Month</button>
          <button
            className={`btn btn-sm ${zoom === "week" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setZoom("week")}
          >Week</button>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-tab)", color: "var(--text2)", alignItems: "center", flexWrap: "wrap" }}>
          {Object.entries(STATUS_COLORS).map(([key, color]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "var(--radius-control)", background: color, display: "inline-block" }} />
              {STATUS_LABELS[key]}
            </span>
          ))}
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <span style={{ width: 2, height: 14, background: "var(--red)", display: "inline-block" }} />
            Today
          </span>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card" style={{ overflow: "hidden", position: "relative" }}>
        {/* Header Row */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {/* Label header */}
          <div style={{
            minWidth: LABEL_WIDTH, maxWidth: LABEL_WIDTH, padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--text-tab)", fontWeight: "var(--weight-semi)", color: "var(--text2)", textTransform: "uppercase",
            letterSpacing: 1, borderRight: "1px solid var(--border)", background: "var(--bg3)",
            position: "sticky", left: 0, zIndex: 3,
          }}>
            Project
          </div>
          {/* Timeline header */}
          <div
            ref={headerScrollRef}
            style={{
              flex: 1, display: "flex", overflow: "hidden", background: "var(--bg3)",
            }}
          >
            {columns.map((col, i) => (
              <div key={i} style={{
                minWidth: colWidth, maxWidth: colWidth, padding: "var(--space-2) var(--space-2)",
                fontSize: "var(--text-tab)", color: "var(--text2)", textAlign: "center",
                borderRight: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
              }}>
                {col.label}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          onScroll={handleBodyScroll}
          style={{
            display: "flex",
            maxHeight: "calc(100vh - 340px)",
            overflowY: "auto",
            overflowX: "auto",
          }}
        >
          {/* Labels column */}
          <div style={{
            minWidth: LABEL_WIDTH, maxWidth: LABEL_WIDTH,
            position: "sticky", left: 0, zIndex: 2, background: "var(--bg2)",
          }}>
            {ganttProjects.map((p, idx) => (
              <div key={p.id}>
                <div
                  style={{
                    height: ROW_HEIGHT, padding: "var(--space-2) var(--space-3)", display: "flex", flexDirection: "column",
                    justifyContent: "center", borderBottom: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onClick={() => onProjectClick && onProjectClick(p)}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg3)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  <div style={{
                    fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--text)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    fontFamily: "var(--font-head)",
                  }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text3)", marginTop: "var(--space-1)" }}>
                    {p.gc} {p.contract ? `\u00B7 ${fmtK(p.contract)}` : ""}
                  </div>
                </div>
                {/* Crew row */}
                {p.teamSize > 0 && (
                  <div style={{
                    height: CREW_ROW_HEIGHT, padding: "var(--space-1) var(--space-3)",
                    borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)",
                    display: "flex", alignItems: "center",
                    fontSize: "var(--text-xs)", color: "var(--text3)", background: "var(--bg)",
                  }}>
                    <HardHat style={{ width: 12, height: 12, marginRight: "var(--space-1)" }} /> {p.teamSize} team
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline area */}
          <div style={{ flex: 1, position: "relative", minWidth: totalWidth }}>
            {/* Grid lines */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
              {columns.map((col, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: i * colWidth,
                  top: 0, bottom: 0,
                  width: 1,
                  background: "var(--border)",
                  opacity: 0.5,
                }} />
              ))}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= totalWidth && (
              <div style={{
                position: "absolute",
                left: todayOffset,
                top: 0, bottom: 0,
                width: 2,
                background: "var(--red)",
                zIndex: 1,
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", top: -2, left: -12,
                  fontSize: "var(--text-xs)", color: "var(--red)", fontWeight: "var(--weight-bold)",
                  background: "var(--bg2)", padding: "var(--space-1) var(--space-1)", borderRadius: "var(--radius-control)",
                  whiteSpace: "nowrap",
                }}>
                  TODAY
                </div>
              </div>
            )}

            {/* Project bars */}
            {ganttProjects.map((p, idx) => {
              const totalMs = timelineEnd.getTime() - timelineStart.getTime();
              const barLeft = ((p.startDate.getTime() - timelineStart.getTime()) / totalMs) * totalWidth;
              const barWidth = Math.max(8, ((p.endDate.getTime() - p.startDate.getTime()) / totalMs) * totalWidth);
              const color = STATUS_COLORS[p.ganttStatus] || STATUS_COLORS["in-progress"];

              // Calculate top offset accounting for team rows of previous projects
              let topOffset = 0;
              for (let i = 0; i < idx; i++) {
                topOffset += ROW_HEIGHT;
                if (ganttProjects[i].teamSize > 0) topOffset += CREW_ROW_HEIGHT;
              }

              return (
                <div key={p.id}>
                  {/* Main bar row */}
                  <div style={{
                    position: "absolute",
                    top: topOffset,
                    left: 0, right: 0,
                    height: ROW_HEIGHT,
                    borderBottom: "1px solid var(--border)",
                  }}>
                    {/* Bar */}
                    <div
                      style={{
                        position: "absolute",
                        left: barLeft,
                        top: 8,
                        width: barWidth,
                        height: ROW_HEIGHT - 18,
                        background: `${color}22`,
                        border: `1.5px solid ${color}`,
                        borderRadius: "var(--radius-control)",
                        cursor: "pointer",
                        overflow: "hidden",
                        transition: "filter 0.15s",
                        display: "flex",
                        alignItems: "center",
                      }}
                      onClick={() => onProjectClick && onProjectClick(p)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(1.2)";
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                          project: p,
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "";
                        setTooltip(null);
                      }}
                    >
                      {/* Progress fill */}
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${p.progress || 0}%`,
                        background: `${color}44`,
                        borderRadius: "2px 0 0 2px",
                      }} />
                      {/* Label inside bar */}
                      {barWidth > 60 && (
                        <span style={{
                          position: "relative", zIndex: 1,
                          fontSize: "var(--text-xs)", fontWeight: "var(--weight-semi)", color: "var(--text)",
                          padding: "0 6px", whiteSpace: "nowrap", overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {p.progress || 0}%
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Crew allocation row */}
                  {p.teamSize > 0 && (
                    <div style={{
                      position: "absolute",
                      top: topOffset + ROW_HEIGHT,
                      left: 0, right: 0,
                      height: CREW_ROW_HEIGHT,
                      borderBottom: "1px solid var(--border)",
                      background: "var(--bg)",
                    }}>
                      <div style={{
                        position: "absolute",
                        left: barLeft,
                        top: 3,
                        width: barWidth,
                        height: CREW_ROW_HEIGHT - 6,
                        background: `${color}11`,
                        border: `1px dashed ${color}55`,
                        borderRadius: "var(--radius-control)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "var(--text-xs)", color: "var(--text3)",
                      }}>
                        {p.teamSize} team
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Spacer to ensure scrollable height */}
            <div style={{
              height: ganttProjects.reduce((h, p) => h + ROW_HEIGHT + (p.teamSize > 0 ? CREW_ROW_HEIGHT : 0), 0),
              pointerEvents: "none",
            }} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
          background: "var(--bg4)",
          border: "1px solid var(--border2)",
          borderRadius: "var(--radius-control)",
          padding: "var(--space-2) var(--space-3)",
          zIndex: 1000,
          pointerEvents: "none",
          minWidth: 200,
          boxShadow: "var(--shadow)",
        }}>
          <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-bold)", color: "var(--text)", marginBottom: "var(--space-1)", fontFamily: "var(--font-head)" }}>
            {tooltip.project.name}
          </div>
          <div style={{ fontSize: "var(--text-tab)", color: "var(--text2)", marginBottom: "var(--space-1)" }}>{tooltip.project.gc}</div>
          <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text3)", marginTop: "var(--space-1)" }}>
            <span>{fmtDate(tooltip.project.startDate)} - {fmtDate(tooltip.project.endDate)}</span>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>
            <span style={{ color: STATUS_COLORS[tooltip.project.ganttStatus] }}>{STATUS_LABELS[tooltip.project.ganttStatus]}</span>
            <span style={{ color: "var(--text2)" }}>{tooltip.project.progress || 0}% complete</span>
            {tooltip.project.teamSize > 0 && <span style={{ color: "var(--text2)" }}>{tooltip.project.teamSize} team</span>}
            {tooltip.project.contract > 0 && <span style={{ color: "var(--text2)" }}>{fmtK(tooltip.project.contract)}</span>}
          </div>
        </div>
      )}

      {/* Undated projects note */}
      {undatedCount > 0 && (
        <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-label)", color: "var(--text3)", fontStyle: "italic" }}>
          {undatedCount} project{undatedCount !== 1 ? "s" : ""} not shown (missing start date). Edit projects to add schedule dates.
        </div>
      )}
    </div>
  );
}
