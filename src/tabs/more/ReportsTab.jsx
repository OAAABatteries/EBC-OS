import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { filterActive } from "../../utils/financialValidation";
import { SubTabs } from "./moreShared";
import { IncidentsTab, ToolboxTalksTab, DailyReportsTab } from "./SafetyTab";

const REPORT_COLORS = { estimating: "#e09422", submitted: "#3b82f6", awarded: "#10b981", lost: "#ef4444" };

export function Reports({ app }) {
  const userRole = app.auth?.role || "owner";
  const isBizRole = ["owner", "admin", "pm", "office_admin"].includes(userRole);
  const bids = app.bids || [];
  const projects = app.projects || [];
  const [reportSummary, setReportSummary] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [reportSub, setReportSub] = useState("Incidents");

  const runForecast = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setForecastLoading(true);
    setForecastResult(null);
    try {
      const { forecastBusinessTrends } = await import("../../utils/api.js");
      const res = await forecastBusinessTrends(app.apiKey, bids.slice(0, 30), projects.slice(0, 15), (app.invoices || []).slice(0, 30), (app.changeOrders || []).slice(0, 20));
      setForecastResult(res);
      setShowForecast(true);
      app.show("Forecast complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setForecastLoading(false);
    }
  };

  const runReportSummary = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setReportLoading(true);
    setReportSummary(null);
    try {
      const { generateReportSummary } = await import("../../utils/api.js");
      const awarded = bids.filter(b => b.status === "awarded").length;
      const lost = bids.filter(b => b.status === "lost").length;
      const decided = awarded + lost;
      const reportData = {
        totalBids: bids.length,
        pipeline: bids.reduce((s, b) => s + (b.value || 0), 0),
        byStatus: { estimating: bids.filter(b => b.status === "estimating").length, submitted: bids.filter(b => b.status === "submitted").length, awarded, lost },
        winRate: decided > 0 ? Math.round((awarded / decided) * 100) : 0,
        avgBidSize: bids.length > 0 ? Math.round(bids.reduce((s, b) => s + (b.value || 0), 0) / bids.length) : 0,
        projects: projects.map(p => ({ name: p.project || p.name, gc: p.gc, contract: p.contract, billed: p.billed, margin: p.margin, progress: p.progress, phase: p.phase })),
        topGCs: Object.entries(bids.reduce((m, b) => { m[b.gc] = (m[b.gc] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([gc, count]) => ({ gc, totalBids: count, awarded: bids.filter(b => b.gc === gc && b.status === "awarded").length })),
        changeOrders: { total: (app.changeOrders || []).length, totalValue: (app.changeOrders || []).reduce((s, c) => s + (c.amount || 0), 0) },
      };
      const result = await generateReportSummary(app.apiKey, reportData);
      setReportSummary(result);
      app.show("Report summary generated", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setReportLoading(false);
    }
  };

  // ── Win Rate ──
  const awarded = bids.filter(b => b.status === "awarded").length;
  const lost = bids.filter(b => b.status === "lost").length;
  const decided = awarded + lost;
  const winRate = decided > 0 ? Math.round((awarded / decided) * 100) : null;

  // Win rate by GC
  const gcMap = {};
  bids.forEach(b => {
    if (!gcMap[b.gc]) gcMap[b.gc] = { awarded: 0, lost: 0, total: 0 };
    gcMap[b.gc].total++;
    if (b.status === "awarded") gcMap[b.gc].awarded++;
    if (b.status === "lost") gcMap[b.gc].lost++;
  });

  const gcWinData = Object.entries(gcMap).map(([gc, d]) => {
    const dec = d.awarded + d.lost;
    return { name: gc.length > 18 ? gc.slice(0, 16) + "..." : gc, rate: dec > 0 ? Math.round((d.awarded / dec) * 100) : 0, bids: d.total, awarded: d.awarded };
  }).sort((a, b) => b.bids - a.bids).slice(0, 10);

  // ── Pipeline by Status ──
  const statuses = ["estimating", "submitted", "awarded", "lost"];
  const pipelineData = statuses.map(s => {
    const items = bids.filter(b => b.status === s);
    return { name: s, count: items.length, value: items.reduce((sum, b) => sum + (b.value || 0), 0) };
  });

  // ── KPI Summary ──
  const totalPipeline = bids.reduce((s, b) => s + (b.value || 0), 0);
  const avgBidSize = bids.length > 0 ? Math.round(totalPipeline / bids.length) : 0;
  const gcCounts = {};
  bids.forEach(b => { gcCounts[b.gc] = (gcCounts[b.gc] || 0) + 1; });
  const mostActiveGC = Object.entries(gcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const inProgress = projects.filter(p => p.progress > 0 && p.progress < 100).length;

  // ── Phase breakdown ──
  const phaseMap = {};
  bids.forEach(b => { if (b.phase) phaseMap[b.phase] = (phaseMap[b.phase] || 0) + 1; });
  const phaseData = Object.entries(phaseMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const PHASE_COLORS = ["#3b82f6", "#10b981", "#e09422", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#ec4899"];

  const tooltipStyle = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", color: "var(--text)" };

  // Non-business roles (safety, foreman, etc.) see a simplified reports view
  if (!isBizRole) {
    return (
      <div className="mt-16">
        <div className="section-title">Reports</div>
        <div className="text-sm text-muted mb-16">
          {userRole === "safety" ? "Safety reports, incidents, and daily logs." :
           userRole === "foreman" ? "Field reports and daily logs." :
           "Reports available for your role."}
        </div>
        <SubTabs tabs={["Incidents", "Toolbox Talks", "Daily Reports"]} active={reportSub} onChange={setReportSub} />
        {reportSub === "Incidents" && <IncidentsTab app={app} />}
        {reportSub === "Toolbox Talks" && <ToolboxTalksTab app={app} />}
        {reportSub === "Daily Reports" && <DailyReportsTab app={app} />}
      </div>
    );
  }

  return (
    <div className="mt-16">
      {/* KPI Summary */}
      <div className="section-title">KPI Summary</div>
      <div className="flex gap-8 mt-16 flex-wrap">
        <div className="kpi-card"><span className="text2">Total Pipeline</span><strong>{app.fmtK(totalPipeline)}</strong></div>
        <div className="kpi-card"><span className="text2">Avg Bid Size</span><strong>{app.fmtK(avgBidSize)}</strong></div>
        <div className="kpi-card"><span className="text2">Total Bids</span><strong>{bids.length}</strong></div>
        <div className="kpi-card"><span className="text2">Most Active GC</span><strong className="fs-14">{mostActiveGC}</strong></div>
        <div className="kpi-card"><span className="text2">Win Rate</span><strong>{winRate !== null ? `${winRate}%` : "—"}</strong></div>
        <div className="kpi-card"><span className="text2">Projects In Progress</span><strong>{inProgress}</strong></div>
      </div>

      {/* AI Business Forecast */}
      <div className="card mt-16">
        <div className="card-header flex-between">
          <div className="card-title font-head">AI Business Forecast</div>
          <button className="btn btn-ghost btn-sm text-amber" onClick={() => { showForecast ? setShowForecast(false) : runForecast(); }} disabled={forecastLoading}>
            {forecastLoading ? "Forecasting..." : "AI Forecast"}
          </button>
        </div>
        {!showForecast && !forecastLoading && (
          <div className="text-sm text-muted py-8">AI-powered quarterly forecast — revenue projections, market trends, and growth opportunities.</div>
        )}
        {showForecast && forecastResult && (
          <div className="max-h-500 overflow-auto">
            <div className="text-sm text-muted mb-12">{forecastResult.summary}</div>

            {/* KPI Forecasts */}
            {forecastResult.kpiForecasts && (
              <div className="flex gap-12 mb-16 flex-wrap">
                <div className="kpi-card kpi-min-lg">
                  <span className="text2">Win Rate</span>
                  <strong>{forecastResult.kpiForecasts.winRate?.current}% → {forecastResult.kpiForecasts.winRate?.projected}%</strong>
                </div>
                <div className="kpi-card kpi-min-lg">
                  <span className="text2">Avg Margin</span>
                  <strong>{forecastResult.kpiForecasts.avgMargin?.current}% → {forecastResult.kpiForecasts.avgMargin?.projected}%</strong>
                </div>
                <div className="kpi-card kpi-min-lg">
                  <span className="text2">Backlog</span>
                  <strong>{forecastResult.kpiForecasts.backlog?.projected}</strong>
                </div>
              </div>
            )}

            {/* Revenue Forecast */}
            {forecastResult.revenueforecast && (
              <div className="more-detail-summary">
                <div className="text-sm font-semi mb-4">Revenue Forecast</div>
                <div className="flex gap-16">
                  <div><span className="text-xs text-muted">This Quarter:</span> <span className="font-semi">${(forecastResult.revenueforecast.currentQuarter || 0).toLocaleString()}</span></div>
                  <div><span className="text-xs text-muted">Next Quarter:</span> <span className="font-semi">${(forecastResult.revenueforecast.nextQuarter || 0).toLocaleString()}</span></div>
                  <span className={`badge ${forecastResult.revenueforecast.trend === "up" ? "badge-green" : forecastResult.revenueforecast.trend === "down" ? "badge-red" : "badge-muted"}`}>{forecastResult.revenueforecast.trend}</span>
                </div>
                <div className="text-xs text-muted mt-4">{(forecastResult.revenueforecast.drivers || []).join(" · ")}</div>
              </div>
            )}

            {/* Cash Flow */}
            {forecastResult.cashFlowProjection?.length > 0 && (
              <div className="mb-12">
                <div className="text-sm font-semi mb-8">Cash Flow Projection</div>
                <table className="data-table fs-12">
                  <thead><tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Risk</th></tr></thead>
                  <tbody>
                    {forecastResult.cashFlowProjection.map((c, i) => (
                      <tr key={i}>
                        <td className="font-semi">{c.month}</td>
                        <td className="text-green">${(c.expectedInflow || 0).toLocaleString()}</td>
                        <td className="text-red">${(c.expectedOutflow || 0).toLocaleString()}</td>
                        <td className="font-semi">{c.netPosition}</td>
                        <td className="text-muted">{c.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Growth Opportunities */}
            {forecastResult.growthOpportunities?.length > 0 && (
              <div className="mb-12">
                <div className="text-sm font-semi mb-8 text-green">Growth Opportunities</div>
                {forecastResult.growthOpportunities.map((g, i) => (
                  <div key={i} className="more-list-row">
                    <div className="flex-between">
                      <span className="text-sm">{g.opportunity}</span>
                      <span className={`badge ${g.probability === "high" ? "badge-green" : g.probability === "medium" ? "badge-amber" : "badge-muted"}`}>{g.probability}</span>
                    </div>
                    <div className="text-xs text-muted mt-2">Value: {g.potentialValue} · {g.action}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Market Trends */}
            {forecastResult.marketTrends?.length > 0 && (
              <div className="mb-12">
                <div className="text-sm font-semi mb-8">Market Trends</div>
                {forecastResult.marketTrends.map((t, i) => (
                  <div key={i} className="more-list-row">
                    <div className="flex-between">
                      <span className="text-sm">{t.trend}</span>
                      <span className={`badge ${t.impact === "positive" ? "badge-green" : t.impact === "negative" ? "badge-red" : "badge-muted"}`}>{t.impact}</span>
                    </div>
                    <div className="text-xs text-muted mt-2">{t.recommendation} · {t.timeframe}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Quarterly Goals */}
            {forecastResult.quarterlyGoals?.length > 0 && (
              <div>
                <div className="text-sm font-semi mb-8 text-amber">Quarterly Goals</div>
                {forecastResult.quarterlyGoals.map((g, i) => (
                  <div key={i} className="more-list-row">
                    <div className="text-sm font-semi">{g.goal}</div>
                    <div className="text-xs text-muted mt-2">{g.metric}: Target {g.target} · Current pace: {g.currentPace}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Executive Summary */}
      <div className="card mt-16">
        <div className="card-header flex-between">
          <div className="card-title font-head">AI Executive Summary</div>
          <button className="btn btn-primary btn-sm" onClick={runReportSummary} disabled={reportLoading}>
            {reportLoading ? "Generating..." : "Generate Summary"}
          </button>
        </div>
        {!reportSummary && !reportLoading && (
          <div className="text-sm text-muted py-8">AI-powered executive brief of your business performance, GC relationships, and growth opportunities.</div>
        )}
        {reportLoading && <div className="text-sm text-muted more-empty-cell">Analyzing {bids.length} bids and {projects.length} projects...</div>}
        {reportSummary && (
          <div className="mt-8">
            {/* Executive Overview */}
            <div className="more-detail-summary--lg">
              {reportSummary.executive}
            </div>

            {/* Strengths + Concerns */}
            <div className="more-grid-2-gap12">
              {reportSummary.strengths?.length > 0 && (
                <div className="more-info-card--green">
                  <div className="text-sm font-semi mb-8 text-green">Strengths</div>
                  {reportSummary.strengths.map((s, i) => <div key={i} className="fs-label" style={{ padding: "var(--space-1) 0" }}>{s}</div>)}
                </div>
              )}
              {reportSummary.concerns?.length > 0 && (
                <div className="more-info-card--red">
                  <div className="text-sm font-semi mb-8 text-red">Concerns</div>
                  {reportSummary.concerns.map((c, i) => <div key={i} className="fs-label" style={{ padding: "var(--space-1) 0" }}>{c}</div>)}
                </div>
              )}
            </div>

            {/* GC Analysis */}
            {reportSummary.gcAnalysis && (
              <div className="more-info-card">
                <div className="font-semi mb-4 text-blue">GC Relationship Analysis</div>
                {reportSummary.gcAnalysis}
              </div>
            )}

            {/* Opportunities */}
            {reportSummary.opportunities?.length > 0 && (
              <div className="mb-12">
                <div className="text-sm font-semi mb-8 text-amber">Growth Opportunities</div>
                {reportSummary.opportunities.map((o, i) => (
                  <div key={i} className="more-list-row--plain">{o}</div>
                ))}
              </div>
            )}

            {/* Forecast */}
            {reportSummary.forecast && (
              <div className="rounded-control mb-sp3 fs-label p-sp3 bg-bg3">
                <div className="font-semi mb-4">Near-Term Forecast</div>
                {reportSummary.forecast}
              </div>
            )}

            {/* Action Items */}
            {reportSummary.actionItems?.length > 0 && (
              <div>
                <div className="text-sm font-semi mb-8">Action Items</div>
                {reportSummary.actionItems.map((a, i) => (
                  <div key={i} className="more-list-row">
                    <div className="flex-between">
                      <span>{a.action}</span>
                      <span className={`badge ${a.priority === "high" ? "badge-red" : a.priority === "medium" ? "badge-amber" : "badge-blue"}`}>{a.priority}</span>
                    </div>
                    {a.owner && <div className="text-xs text-muted mt-2">Owner: {a.owner}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly Field Summary PDF — Sprint 9.3 */}
      {projects.length > 0 && (
        <div className="card mt-16">
          <div className="card-header flex-between">
            <div className="card-title font-head">Weekly Field Summary</div>
          </div>
          <div className="text-sm text-muted mb-8">Export a weekly PDF aggregating daily reports, hours, materials, and RFIs for any project.</div>
          <div className="flex gap-8 flex-wrap">
            {projects.map(proj => (
              <button key={proj.id} className="btn btn-sm"
                onClick={async () => {
                  const { generateWeeklyFieldSummaryPdf } = await import("../../utils/weeklyFieldSummaryPdf");
                  const today = new Date();
                  const monday = new Date(today);
                  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
                  const weekStart = monday.toISOString().slice(0, 10);
                  const weekEnd = new Date(monday);
                  weekEnd.setDate(weekEnd.getDate() + 6);
                  const weekEndStr = weekEnd.toISOString().slice(0, 10);
                  const weekReports = (app.dailyReports || []).filter(r => r.projectId === proj.id && r.date >= weekStart && r.date <= weekEndStr);
                  const weekEntries = (app.timeEntries || []).filter(e => String(e.projectId) === String(proj.id) && e.clockIn >= weekStart);
                  const weekMats = (app.materialRequests || []).filter(m => String(m.projectId) === String(proj.id) && (m.createdAt || m.date || "") >= weekStart);
                  const projRfis = (app.rfis || []).filter(r => String(r.projectId) === String(proj.id));
                  const weekIncidents = (app.incidents || []).filter(i => String(i.projectId) === String(proj.id) && (i.date || "") >= weekStart && (i.date || "") <= weekEndStr);
                  generateWeeklyFieldSummaryPdf({
                    project: proj, dailyReports: weekReports, timeEntries: weekEntries,
                    materialRequests: weekMats, rfis: projRfis, incidents: weekIncidents,
                    weekStart, preparedBy: app.auth?.name,
                  });
                  app.show("PDF downloaded", "ok");
                }}
              >{proj.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="flex gap-16 mt-24 flex-wrap">
        {/* Pipeline by Status Pie */}
        <div className="card" style={{ flex: "1 1 280px", minWidth: 280 }}>
          <div className="card-header"><div className="card-title font-head">Pipeline by Status</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pipelineData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, count }) => `${name} (${count})`}>
                {pipelineData.map((d) => <Cell key={d.name} fill={REPORT_COLORS[d.name] || "#888"} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(val, name, props) => [`${val} bids / ${app.fmtK(props.payload.value)}`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Phase Breakdown Pie */}
        <div className="card" style={{ flex: "1 1 280px", minWidth: 280 }}>
          <div className="card-header"><div className="card-title font-head">Bids by Phase</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={phaseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, value }) => `${name} (${value})`}>
                {phaseData.map((_, i) => <Cell key={i} fill={PHASE_COLORS[i % PHASE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win Rate by GC - Bar Chart */}
      <div className="card mt-16">
        <div className="card-header"><div className="card-title font-head">Win Rate by GC</div></div>
        {winRate !== null && (
          <div className="flex-between mb-16">
            <span className="text-sm">Overall: <strong>{winRate}%</strong></span>
            <span className="text-sm text-dim">{awarded} awarded / {decided} decided</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={Math.max(gcWinData.length * 32, 160)}>
          <BarChart data={gcWinData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} unit="%" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val, name, props) => [`${val}% (${props.payload.awarded}/${props.payload.bids})`, "Win Rate"]} />
            <Bar dataKey="rate" fill="var(--green)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline Value by Status - Bar Chart */}
      <div className="card mt-16">
        <div className="card-header"><div className="card-title font-head">Pipeline Value by Status</div></div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pipelineData} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="name" tick={{ fill: "var(--text2)", fontSize: "var(--text-label)", textTransform: "capitalize" }} />
            <YAxis tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`$${Number(val).toLocaleString()}`, "Value"]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {pipelineData.map((d) => <Cell key={d.name} fill={REPORT_COLORS[d.name] || "#888"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project Profitability */}
      <div className="section-title mt-16">Project Profitability</div>
      <div className="card mt-16">
        {projects.length === 0 && <div className="text2">No projects</div>}
        {projects.map(proj => {
          const billed = filterActive(app.invoices).filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
          const remaining = proj.contract - billed;
          const pct = proj.contract > 0 ? Math.round((billed / proj.contract) * 100) : 0;
          return (
            <div key={proj.id} className="bar-row mb-16">
              <div className="flex-between fs-13">
                <span className="bar-label">{proj.name}</span>
                <span className="bar-value text2">{app.fmt(billed)} / {app.fmt(proj.contract)} ({app.fmt(remaining)} remaining)</span>
              </div>
              <div className="bar-track rounded-control mt-sp1 bg-bg4" style={{ height: 14 }}>
                <div className="bar-fill" style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "var(--amber)", borderRadius: "var(--radius-control)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
