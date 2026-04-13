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
      <div className="p-sp10 text-center">
        <div className="mb-sp3 justify-center" style={{ opacity: 0.3, display: "flex" }}><BarChart2 style={{ width: 48, height: 48 }} /></div>
        <div className="c-text2">No projects with schedule dates</div>
        <div className="fs-label mt-sp1 c-text3">Add start/end dates to projects to see the Gantt timeline</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Bar */}
      <div className="mb-sp4 gap-sp4 flex-wrap" style={{ display: "flex" }}>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div className="fs-tab uppercase c-text3" style={{ letterSpacing: 1 }}>Active Projects</div>
          <div className="fw-bold font-mono fs-title c-green">{stats.active}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div className="fs-tab uppercase c-text3" style={{ letterSpacing: 1 }}>Crew Deployed</div>
          <div className="fw-bold font-mono fs-title c-blue">{stats.totalCrew}</div>
        </div>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div className="fs-tab uppercase c-text3" style={{ letterSpacing: 1 }}>Backlog</div>
          <div className="fw-bold font-mono fs-title c-amber">{stats.backlogWeeks}<span className="fw-normal fs-label"> wks</span></div>
        </div>
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", flex: "1 1 120px", minWidth: 120 }}>
          <div className="fs-tab uppercase c-text3" style={{ letterSpacing: 1 }}>Scheduled</div>
          <div className="fw-bold font-mono fs-title c-text">{ganttProjects.length}<span className="fw-normal fs-label c-text3"> / {projects.length}</span></div>
        </div>
      </div>

      {/* Zoom Toggle + Legend */}
      <div className="mb-sp3 gap-sp2 flex-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="gap-sp1" style={{ display: "flex" }}>
          <button
            className={`btn btn-sm ${zoom === "month" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setZoom("month")}
          >Month</button>
          <button
            className={`btn btn-sm ${zoom === "week" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setZoom("week")}
          >Week</button>
        </div>
        <div className="fs-tab c-text2 gap-sp3 flex-wrap" style={{ display: "flex", alignItems: "center" }}>
          {Object.entries(STATUS_COLORS).map(([key, color]) => (
            <span key={key} className="flex gap-sp1">
              <span className="rounded-control" style={{ width: 10, height: 10, background: color, display: "inline-block" }} />
              {STATUS_LABELS[key]}
            </span>
          ))}
          <span className="flex gap-sp1">
            <span style={{ width: 2, height: 14, background: "var(--red)", display: "inline-block" }} />
            Today
          </span>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card relative overflow-hidden">
        {/* Header Row */}
        <div className="border-b" style={{ display: "flex" }}>
          {/* Label header */}
          <div className="fw-semi fs-tab uppercase bg-bg3 c-text2" style={{ minWidth: LABEL_WIDTH, maxWidth: LABEL_WIDTH, padding: "var(--space-2) var(--space-3)",
            letterSpacing: 1, borderRight: "1px solid var(--border)",
            position: "sticky", left: 0, zIndex: 3 }}>
            Project
          </div>
          {/* Timeline header */}
          <div
            ref={headerScrollRef}
            className="bg-bg3 overflow-hidden flex-1" style={{ display: "flex" }}
          >
            {columns.map((col, i) => (
              <div key={i} className="font-mono fs-tab c-text2 text-center" style={{ minWidth: colWidth, maxWidth: colWidth, padding: "var(--space-2) var(--space-2)",
                borderRight: "1px solid var(--border)" }}>
                {col.label}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          onScroll={handleBodyScroll}
          className="overflow-x-auto" style={{ display: "flex",
            maxHeight: "calc(100vh - 340px)",
            overflowY: "auto" }}
        >
          {/* Labels column */}
          <div className="bg-bg2" style={{ minWidth: LABEL_WIDTH, maxWidth: LABEL_WIDTH,
            position: "sticky", left: 0, zIndex: 2 }}>
            {ganttProjects.map((p, idx) => (
              <div key={p.id}>
                <div
                  className="flex-col border-b justify-center cursor-pointer" style={{ height: ROW_HEIGHT, padding: "var(--space-2) var(--space-3)",
                    borderRight: "1px solid var(--border)",
                    transition: "background 0.15s" }}
                  onClick={() => onProjectClick && onProjectClick(p)}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg3)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  <div className="fw-semi font-head fs-label c-text nowrap overflow-hidden" style={{ textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <div className="mt-sp1 fs-xs c-text3">
                    {p.gc} {p.contract ? `\u00B7 ${fmtK(p.contract)}` : ""}
                  </div>
                </div>
                {/* Crew row */}
                {p.teamSize > 0 && (
                  <div className="border-b flex fs-xs c-text3" style={{ height: CREW_ROW_HEIGHT, padding: "var(--space-1) var(--space-3)", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
                    <HardHat className="mr-sp1" style={{ width: 12, height: 12 }} /> {p.teamSize} team
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline area */}
          <div className="relative flex-1" style={{ minWidth: totalWidth }}>
            {/* Grid lines */}
            <div className="absolute" style={{ top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
              {columns.map((col, i) => (
                <div key={i} className="absolute opacity-50" style={{ left: i * colWidth,
                  top: 0, bottom: 0,
                  width: 1,
                  background: "var(--border)" }} />
              ))}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= totalWidth && (
              <div className="absolute" style={{ left: todayOffset,
                top: 0, bottom: 0,
                width: 2,
                background: "var(--red)",
                zIndex: 1,
                pointerEvents: "none" }}>
                <div className="rounded-control fw-bold fs-xs bg-bg2 nowrap absolute c-red" style={{ top: -2, left: -12, padding: "var(--space-1) var(--space-1)" }}>
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
                  <div className="border-b absolute" style={{ top: topOffset,
                    left: 0, right: 0,
                    height: ROW_HEIGHT }}>
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
                        <span className="fw-semi fs-xs c-text nowrap relative overflow-hidden" style={{ zIndex: 1,
                          padding: "0 6px",
                          textOverflow: "ellipsis" }}>
                          {p.progress || 0}%
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Crew allocation row */}
                  {p.teamSize > 0 && (
                    <div className="border-b absolute" style={{ top: topOffset + ROW_HEIGHT,
                      left: 0, right: 0,
                      height: CREW_ROW_HEIGHT,
                      background: "var(--bg)" }}>
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
        <div className="rounded-control bg-bg4" style={{ position: "fixed",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
          border: "1px solid var(--border2)",
          padding: "var(--space-2) var(--space-3)",
          zIndex: 1000,
          pointerEvents: "none",
          minWidth: 200,
          boxShadow: "var(--shadow)" }}>
          <div className="fw-bold mb-sp1 font-head fs-label c-text">
            {tooltip.project.name}
          </div>
          <div className="mb-sp1 fs-tab c-text2">{tooltip.project.gc}</div>
          <div className="mt-sp1 fs-xs c-text3 gap-sp3" style={{ display: "flex" }}>
            <span>{fmtDate(tooltip.project.startDate)} - {fmtDate(tooltip.project.endDate)}</span>
          </div>
          <div className="mt-sp1 fs-xs gap-sp3" style={{ display: "flex" }}>
            <span style={{ color: STATUS_COLORS[tooltip.project.ganttStatus] }}>{STATUS_LABELS[tooltip.project.ganttStatus]}</span>
            <span className="c-text2">{tooltip.project.progress || 0}% complete</span>
            {tooltip.project.teamSize > 0 && <span className="c-text2">{tooltip.project.teamSize} team</span>}
            {tooltip.project.contract > 0 && <span className="c-text2">{fmtK(tooltip.project.contract)}</span>}
          </div>
        </div>
      )}

      {/* Undated projects note */}
      {undatedCount > 0 && (
        <div className="fs-label mt-sp3 c-text3" style={{ fontStyle: "italic" }}>
          {undatedCount} project{undatedCount !== 1 ? "s" : ""} not shown (missing start date). Edit projects to add schedule dates.
        </div>
      )}
    </div>
  );
}
