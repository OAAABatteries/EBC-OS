import { useState } from "react";

export function Schedule({ app }) {
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", task: "", start: "", end: "", team: "", status: "not-started", milestone: false, predecessorId: "" });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTask, setEditTask] = useState({});
  const [laborResult, setLaborResult] = useState(null);
  const [laborLoading, setLaborLoading] = useState(false);
  const [showLabor, setShowLabor] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  const runConflictDetect = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setConflictLoading(true);
    setConflictResult(null);
    setShowConflict(true);
    try {
      const { detectScheduleConflicts } = await import("../../utils/api.js");
      const scheduleData = app.schedule.map(t => ({
        task: t.task, project: app.projects.find(p => p.id === t.projectId)?.name || "Unknown",
        start: t.start, end: t.end, team: t.team, status: t.status, milestone: t.milestone,
      }));
      const projectData = app.projects.map(p => ({ name: p.name || p.project, gc: p.gc, phase: p.phase, progress: p.progress, scope: p.scope }));
      const result = await detectScheduleConflicts(app.apiKey, scheduleData, projectData);
      setConflictResult(result);
      app.show("Conflict analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setConflictLoading(false);
    }
  };

  const runLaborForecast = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setLaborLoading(true);
    setLaborResult(null);
    setShowLabor(true);
    try {
      const { forecastLaborDemand } = await import("../../utils/api.js");
      const scheduleData = app.schedule.map(t => ({
        task: t.task,
        project: app.projects.find(p => p.id === t.projectId)?.name || "Unknown",
        start: t.start,
        end: t.end,
        team: t.team,
        status: t.status,
      }));
      const projectData = app.projects.map(p => ({
        name: p.name || p.project,
        gc: p.gc,
        contract: p.contract,
        progress: p.progress,
        phase: p.phase,
        scope: p.scope,
      }));
      const teamData = (app.teamSchedule || []).map(c => ({
        team: c.team || c.name,
        members: c.members || c.size,
        project: c.project,
        available: c.available,
      }));
      const result = await forecastLaborDemand(app.apiKey, scheduleData, projectData, teamData);
      setLaborResult(result);
      app.show("Labor forecast complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setLaborLoading(false);
    }
  };

  // Dynamic Gantt range — auto-calculate from task dates or use current year
  const allDates = app.schedule.flatMap(t => [t.start, t.end].filter(Boolean)).map(d => new Date(d));
  const now = new Date();
  const ganttStart = allDates.length > 0
    ? new Date(Math.min(...allDates.map(d => d.getTime()), now.getTime()))
    : new Date(now.getFullYear(), 0, 1);
  ganttStart.setDate(1); // snap to 1st of month
  const ganttEnd = allDates.length > 0
    ? new Date(Math.max(...allDates.map(d => d.getTime()), now.getTime() + 90 * 86400000))
    : new Date(now.getFullYear(), 11, 31);
  ganttEnd.setMonth(ganttEnd.getMonth() + 1); ganttEnd.setDate(1); // snap to end of month
  const totalDays = (ganttEnd - ganttStart) / 86400000;
  const months = [];
  const cursor = new Date(ganttStart);
  while (cursor < ganttEnd) {
    months.push(cursor.toLocaleString("en", { month: "short" }) + (cursor.getMonth() === 0 ? " " + cursor.getFullYear() : ""));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const filtered = filter === "all" ? app.schedule : app.schedule.filter(t => t.projectId === Number(filter));
  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";

  const barColor = (s) => s === "complete" ? "var(--green)" : s === "in-progress" ? "var(--amber)" : "var(--bg4)";

  const save = () => {
    if (!form.task || !form.start || !form.end) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      task: form.task,
      start: form.start,
      end: form.end,
      team: form.team,
      status: form.status,
      milestone: form.milestone,
      predecessorId: form.predecessorId ? Number(form.predecessorId) : null,
    };
    app.setSchedule(prev => [...prev, newItem]);
    app.show("Task added", "ok");
    setAdding(false);
    setForm({ projectId: "", task: "", start: "", end: "", team: "", status: "not-started", milestone: false, predecessorId: "" });
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="flex gap-8 items-center">
          <div className="section-title">Project Schedule</div>
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} className="w-auto">
            <option value="all">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={runConflictDetect} disabled={conflictLoading}>
            {conflictLoading ? "Detecting..." : "Conflict Scan"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={runLaborForecast} disabled={laborLoading}>
            {laborLoading ? "Forecasting..." : "Labor Forecast"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Task","Project","Crew","Start","End","Status","Milestone","Predecessor"];
            const rows = filtered.map(t => {
              const pred = t.predecessorId ? (app.schedule.find(s => s.id === t.predecessorId)?.task || "") : "";
              return [
                `"${(t.task||'').replace(/"/g,'""')}"`, `"${pName(t.projectId)}"`, t.team||'',
                t.start||'', t.end||'', t.status||'', t.milestone?"Y":"", `"${pred}"`
              ];
            });
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_schedule.csv'; a.click();
            URL.revokeObjectURL(url);
            app.show("Schedule CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Task</button>
        </div>
      </div>

      {/* Labor Forecast Panel */}
      {showLabor && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Labor Forecast</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowLabor(false); setLaborResult(null); }}>Close</button>
          </div>
          {laborLoading && <div className="text-sm text-muted more-empty-cell">Analyzing schedule and team data...</div>}
          {laborResult && (
            <div className="mt-8">
              {/* Summary */}
              <div className="more-detail-summary">
                {laborResult.summary}
              </div>

              {/* Weekly Forecast Table */}
              {laborResult.weeklyForecast?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">4-Week Outlook</div>
                  <table className="data-table fs-13">
                    <thead><tr><th>Week</th><th>Crews</th><th>Hours</th><th>Projects</th><th>Bottleneck</th></tr></thead>
                    <tbody>
                      {laborResult.weeklyForecast.map((w, i) => (
                        <tr key={i}>
                          <td className="font-semi">{w.week}</td>
                          <td className="fw-bold c-amber">{w.teamsNeeded}</td>
                          <td>{w.hoursEstimate}h</td>
                          <td className="fs-12">{(w.projects || []).join(", ")}</td>
                          <td style={{ fontSize: "var(--text-label)", color: w.bottleneck ? "var(--red)" : "var(--text3)" }}>{w.bottleneck || "None"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Crew Gaps */}
              {laborResult.teamGaps?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Crew Gaps</div>
                  {laborResult.teamGaps.map((g, i) => (
                    <div key={i} className="more-ranking-item more-ranking-item--red">
                      <div className="flex-between">
                        <span className="font-semi">{g.week}</span>
                        <span className="badge-red">-{g.shortfall} {g.trade}</span>
                      </div>
                      <div className="text-muted mt-4">{g.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Peak Week */}
              {laborResult.peakWeek && (
                <div className="more-info-card--amber">
                  <span className="font-semi">Peak Week: </span>{laborResult.peakWeek.week} — {laborResult.peakWeek.teamsNeeded} teams needed
                  <div className="text-xs text-muted mt-4">{laborResult.peakWeek.reason}</div>
                </div>
              )}

              {/* Overtime */}
              {laborResult.overtime && (
                <div className="more-info-card">
                  <span className="font-semi">Overtime Likelihood: </span>{laborResult.overtime.likelihood}
                  {laborResult.overtime.estimatedHours > 0 && <span> — ~{laborResult.overtime.estimatedHours}h estimated</span>}
                </div>
              )}

              {/* Recommendations */}
              {laborResult.recommendations?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Recommendations</div>
                  {laborResult.recommendations.map((r, i) => (
                    <div key={i} className="more-list-row">
                      <div className="flex-between">
                        <span>{r.action}</span>
                        <span className={r.priority === "high" ? "badge-red" : r.priority === "medium" ? "badge-amber" : "badge-blue"}>{r.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.impact}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Conflict Panel */}
      {showConflict && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Schedule Conflict Scan</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowConflict(false); setConflictResult(null); }}>Close</button>
          </div>
          {conflictLoading && <div className="text-sm text-muted more-empty-cell">Scanning schedule for conflicts...</div>}
          {conflictResult && (
            <div className="mt-8">
              <div className="more-detail-summary">{conflictResult.summary}</div>

              {conflictResult.conflicts?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Conflicts Detected</div>
                  {conflictResult.conflicts.map((c, i) => (
                    <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", borderLeft: `3px solid ${c.severity === "critical" ? "var(--red)" : c.severity === "warning" ? "var(--amber)" : "var(--blue)"}`, background: "var(--card)", fontSize: "var(--text-label)" }}>
                      <div className="flex-between">
                        <span className="font-semi">{c.type} — {(c.projects || []).join(", ")}</span>
                        <span className={c.severity === "critical" ? "badge-red" : c.severity === "warning" ? "badge-amber" : "badge-blue"}>{c.severity}</span>
                      </div>
                      <div className="text-muted mt-4 fs-12">{c.detail}</div>
                      <div className="text-xs mt-2 text-blue">Fix: {c.resolution}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.sequenceIssues?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Sequence Issues</div>
                  {conflictResult.sequenceIssues.map((s, i) => (
                    <div key={i} className="more-list-row">
                      <span className="font-semi">{s.project}</span>: {s.issue}
                      <div className="text-xs text-muted mt-2">Correct: {s.correctSequence}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.criticalPath?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Critical Path</div>
                  {conflictResult.criticalPath.map((c, i) => (
                    <div key={i} className="more-list-row">
                      <div className="flex-between">
                        <span className="font-semi">{c.project}</span>
                        <span style={{ color: c.slackDays <= 3 ? "var(--red)" : "var(--amber)", fontWeight: "var(--weight-semi)" }}>{c.slackDays}d slack</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{c.bottleneck} — {c.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.optimizations?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Optimizations</div>
                  {conflictResult.optimizations.map((o, i) => (
                    <div key={i} className="more-list-row">
                      <div className="flex-between">
                        <span>{o.suggestion}</span>
                        <span className={o.priority === "high" ? "badge-red" : o.priority === "medium" ? "badge-amber" : "badge-blue"}>{o.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{o.benefit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Task Name</label>
              <input className="form-input" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start</label>
              <input className="form-input" type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End</label>
              <input className="form-input" type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Crew</label>
              <input className="form-input" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Predecessor</label>
            <select className="form-select" value={form.predecessorId} onChange={e => setForm({ ...form, predecessorId: e.target.value })}>
              <option value="">None</option>
              {app.schedule.map(t => <option key={t.id} value={t.id}>{t.task} ({pName(t.projectId)})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label flex-center-gap-8">
              <input type="checkbox" checked={form.milestone} onChange={e => setForm({ ...form, milestone: e.target.checked })} />
              Milestone
            </label>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="gantt-wrap mt-16 overflow-x-auto">
        <div className="gantt-header more-gantt-header">
          <div className="more-gantt-task-col">Task</div>
          <div className="more-gantt-months">
            {months.map(m => (
              <div key={m} className="more-gantt-month">{m}</div>
            ))}
          </div>
        </div>
        {filtered.length === 0 && <div className="more-gantt-empty">No tasks</div>}
        {filtered.map(task => {
          const leftPct = (new Date(task.start) - ganttStart) / 86400000 / totalDays * 100;
          const widthPct = (new Date(task.end) - new Date(task.start)) / 86400000 / totalDays * 100;
          return (
            <div className="gantt-row more-gantt-row" key={task.id} >
              <div className="gantt-label more-gantt-label">
                {task.task}
              </div>
              <div className="gantt-track more-gantt-track">
                {task.milestone ? (
                  <div className="gantt-milestone" style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: 4,
                    width: 14,
                    height: 14,
                    background: "var(--amber)",
                    transform: "rotate(45deg)",
                    marginLeft: -7,
                  }} />
                ) : (
                  <div className="gantt-bar" style={{
                    position: "absolute",
                    left: `${Math.max(leftPct, 0)}%`,
                    width: `${Math.max(widthPct, 0.5)}%`,
                    height: 16,
                    top: 4,
                    borderRadius: "var(--radius-control)",
                    background: barColor(task.status),
                    opacity: task.status === "not-started" ? 0.5 : 1,
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task List Table */}
      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Task</th><th>Project</th><th>Crew</th><th>Start</th><th>End</th><th>Predecessor</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(task => {
              const pred = task.predecessorId ? app.schedule.find(s => s.id === task.predecessorId) : null;
              if (editTaskId === task.id) {
                return (
                  <tr key={task.id} className="bg-bg3">
                    <td><input className="form-input" value={editTask.task} onChange={e => setEditTask({ ...editTask, task: e.target.value })} className="more-edit-input" /></td>
                    <td>
                      <select className="form-select" value={editTask.projectId} onChange={e => setEditTask({ ...editTask, projectId: e.target.value })} className="more-edit-select">
                        {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td><input className="form-input" value={editTask.team} onChange={e => setEditTask({ ...editTask, team: e.target.value })} className="more-edit-input" /></td>
                    <td><input className="form-input" type="date" value={editTask.start} onChange={e => setEditTask({ ...editTask, start: e.target.value })} className="more-edit-select" /></td>
                    <td><input className="form-input" type="date" value={editTask.end} onChange={e => setEditTask({ ...editTask, end: e.target.value })} className="more-edit-select" /></td>
                    <td>
                      <select className="form-select" value={editTask.predecessorId || ""} onChange={e => setEditTask({ ...editTask, predecessorId: e.target.value ? Number(e.target.value) : null })} className="more-edit-select">
                        <option value="">None</option>
                        {app.schedule.filter(s => s.id !== task.id).map(s => <option key={s.id} value={s.id}>{s.task}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" value={editTask.status} onChange={e => setEditTask({ ...editTask, status: e.target.value })} className="more-edit-select">
                        <option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="complete">Complete</option>
                      </select>
                    </td>
                    <td className="more-edit-actions">
                      <button className="btn btn-primary btn-sm btn-table-save" onClick={() => { app.setSchedule(prev => prev.map(t => t.id === task.id ? { ...t, ...editTask, projectId: Number(editTask.projectId) } : t)); setEditTaskId(null); app.show("Task updated"); }}>Save</button>
                      <button className="btn btn-ghost btn-sm btn-table-save" onClick={() => setEditTaskId(null)}>Cancel</button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={task.id}>
                  <td>{task.milestone ? "\u25C6 " : ""}{task.task}</td>
                  <td>{pName(task.projectId)}</td>
                  <td>{task.team || "—"}</td>
                  <td>{task.start}</td>
                  <td>{task.end}</td>
                  <td className="fs-tab c-text2">{pred ? pred.task : "—"}</td>
                  <td><span className={task.status === "complete" ? "badge-green" : task.status === "in-progress" ? "badge-amber" : "badge-muted"}>{task.status}</span></td>
                  <td className="more-edit-actions">
                    <button className="btn btn-ghost btn-sm fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}
                      onClick={() => { setEditTaskId(task.id); setEditTask({ task: task.task, projectId: task.projectId, team: task.team || "", start: task.start, end: task.end, status: task.status, predecessorId: task.predecessorId || "" }); }}>✎</button>
                    <button className="btn btn-ghost btn-sm btn-table-delete"
                      onClick={() => { if (confirm("Delete this task?")) { app.setSchedule(prev => prev.filter(t => t.id !== task.id)); app.show("Task deleted"); } }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
