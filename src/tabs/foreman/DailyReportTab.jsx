import { ClipboardList } from "lucide-react";
import { PhotoCapture } from "../../components/field";
import { queueMutation } from "../../lib/offlineQueue";

const QUICK_TASKS = ["Framing", "Hanging board", "Taping", "Sanding", "ACT grid", "ACT tile", "Demo", "Cleanup"];
const WEATHER_CONDITIONS = ["Clear", "Cloudy", "Rain", "Wind", "Snow"];

export function DailyReportTab({
  dailyReports, setDailyReports,
  reportForm, setReportForm, showReportForm, setShowReportForm,
  editingReportId, setEditingReportId,
  selectedProjectId, selectedProject, activeForeman,
  teamForProject, todayHoursForProject,
  employees, areas, productionLogs, tmTickets, punchItems, timeEntries,
  myProjectIds, projects,
  expandedReportId, setExpandedReportId,
  clearReportDraft, fillFromYesterday,
  reportCrewAdding, setReportCrewAdding,
  show, t, lang,
}) {
  const EMPTY_REPORT_FORM = {
    date: new Date().toISOString().slice(0, 10),
    isOutdoor: false,
    temperature: "",
    weatherCondition: "Clear",
    teamPresent: [],
    quickTasks: [],
    workPerformed: "",
    materialsReceived: "",
    equipmentOnSite: "",
    visitors: "",
    safetyIncident: false,
    safetyDescription: "",
    photos: [],
    issues: "",
    tomorrowPlan: "",
  };

  return (
    <div className="emp-content">
      <div className="section-header frm-flex-between">
        <div className="section-title frm-section-title-md">{t("Daily Reports")}</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowReportForm(!showReportForm); setEditingReportId(null); if (!showReportForm) setReportForm({ ...EMPTY_REPORT_FORM, date: new Date().toISOString().slice(0, 10) }); }}>
          {showReportForm ? t("Cancel") : `+ ${t("New Report")}`}
        </button>
      </div>

      {/* Auto-aggregated summary from today's entries */}
      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        const todayProd = (productionLogs || []).filter(l => l.date === today && String(l.projectId) === String(selectedProjectId) && l.status !== "deleted");
        const todayTm = (tmTickets || []).filter(t2 => t2.date === today && String(t2.projectId) === String(selectedProjectId) && t2.status !== "deleted");
        const todayPunch = (punchItems || []).filter(p => String(p.projectId) === String(selectedProjectId) && (p.createdAt || "").startsWith(today) && p.status !== "deleted");
        const todayTime = (timeEntries || []).filter(te => String(te.projectId) === String(selectedProjectId) && (te.clockIn || "").startsWith(today));
        const totalHours = todayTime.reduce((s, te) => s + (te.totalHours || 0), 0);

        if (todayProd.length === 0 && todayTm.length === 0 && todayPunch.length === 0 && todayTime.length === 0) return null;

        return (
          <div style={{ padding: "var(--space-3)", background: "var(--bg3)", borderRadius: "var(--radius-control)", marginBottom: "var(--space-4)", marginTop: "var(--space-3)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", textTransform: "uppercase", fontWeight: "var(--weight-bold)", marginBottom: "var(--space-2)" }}>{t("Today's Activity")} ({t("Auto-Populated")})</div>

            {todayTime.length > 0 && (
              <div className="frm-font-13 frm-mb-6" style={{ color: "var(--text)" }}>
                <strong>{todayTime.length} {t("crew")}</strong> {t("on site")} · <strong>{totalHours.toFixed(1)}h</strong> {t("total")}
              </div>
            )}

            {todayProd.length > 0 && (
              <div className="frm-mb-6">
                <div className="frm-font-12" style={{ color: "var(--text2)" }}>{t("Production")}:</div>
                {todayProd.map(p => (
                  <div key={p.id} className="frm-font-12" style={{ color: "var(--text)", paddingLeft: "var(--space-2)" }}>
                    {"\u2022"} {p.trade}: {p.qtyInstalled} {p.unit} {t("in")} {(areas || []).find(a => a.id === p.areaId)?.name || "\u2014"}
                  </div>
                ))}
              </div>
            )}

            {todayTm.length > 0 && (
              <div className="frm-mb-6">
                <div className="frm-font-12" style={{ color: "var(--text2)" }}>{t("T&M")} {t("Tickets")}:</div>
                {todayTm.map(tk => (
                  <div key={tk.id} className="frm-font-12" style={{ color: "var(--text)", paddingLeft: "var(--space-2)" }}>
                    {"\u2022"} {tk.ticketNumber}: {(tk.description || "").slice(0, 60)}
                  </div>
                ))}
              </div>
            )}

            {todayPunch.length > 0 && (
              <div>
                <div className="frm-font-12" style={{ color: "var(--text2)" }}>{t("Punch List")}:</div>
                <div className="frm-font-12" style={{ color: "var(--text)", paddingLeft: "var(--space-2)" }}>
                  {todayPunch.length} {t("new")} {t("item")}{todayPunch.length !== 1 ? "s" : ""} {t("logged")}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Report Creation / Edit Form */}
      {showReportForm && (
        <div className="card frm-report-card frm-mt-12 frm-p-16">

          {/* Quick-fill from yesterday */}
          {!editingReportId && (
            <div className="frm-flex-row frm-mb-12">
              <button className="btn btn-sm" style={{ fontSize: "var(--text-tab)", background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                onClick={fillFromYesterday}>
                {t("Quick-fill from yesterday")}
              </button>
            </div>
          )}

          {/* Date + Project */}
          <div className="frm-grid-2-10">
            <div>
              <label className="form-label">{t("Date")}</label>
              <input type="date" className="form-input" value={reportForm.date}
                onChange={e => setReportForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">{t("Project")}</label>
              <input type="text" className="form-input" value={selectedProject?.name || ""} disabled style={{ opacity: 0.7 }} />
            </div>
          </div>

          {/* Outdoor toggle */}
          <div className="frm-mt-10" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-label)", color: "var(--text2)" }}>
              <input type="checkbox"
                checked={!!reportForm.isOutdoor}
                onChange={e => setReportForm(f => ({ ...f, isOutdoor: e.target.checked, ...(e.target.checked ? {} : { temperature: "", weatherCondition: "Clear" }) }))} />
              <span>{t("Outdoor work today")}</span>
            </label>
          </div>

          {/* Weather (outdoor only) */}
          {reportForm.isOutdoor && (
            <div className="frm-grid-2-10 frm-mt-10">
              <div>
                <label className="form-label">{t("Temperature")} ({"\u00B0"}F)</label>
                <input type="number" className="form-input" placeholder="e.g. 85" value={reportForm.temperature}
                  onChange={e => setReportForm(f => ({ ...f, temperature: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{t("Conditions")}</label>
                <select className="form-input" value={reportForm.weatherCondition}
                  onChange={e => setReportForm(f => ({ ...f, weatherCondition: e.target.value }))}>
                  {WEATHER_CONDITIONS.map(w => (
                    <option key={w} value={w}>{t(w)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Crew on Site */}
          {(() => {
            const scheduledIds = new Set(teamForProject.map(c => c.id));
            const present = reportForm.teamPresent || [];
            const extraCrew = present
              .map(cp => {
                const id = typeof cp === "string" ? cp : cp.id;
                if (scheduledIds.has(id)) return null;
                const emp = (employees || []).find(e => String(e.id) === String(id));
                return emp ? { id: emp.id, name: emp.name, role: emp.role || "Crew" } : { id, name: (typeof cp === "object" ? cp.name : "") || "Unknown", role: "Crew" };
              })
              .filter(Boolean);
            const combined = [...teamForProject, ...extraCrew];
            const combinedIds = new Set(combined.map(c => c.id));
            const availableEmployees = (employees || [])
              .filter(e => e.active !== false && !combinedIds.has(e.id))
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            const isChecked = (id) => present.some(cp => (typeof cp === "string" ? cp : cp.id) === id);
            const toggle = (c, checked) => {
              setReportForm(f => {
                const p = f.teamPresent || [];
                if (checked) return { ...f, teamPresent: [...p, { id: c.id, name: c.name }] };
                return { ...f, teamPresent: p.filter(cp => (typeof cp === "string" ? cp : cp.id) !== c.id) };
              });
            };
            return (
              <div className="frm-mt-12">
                <label className="form-label">{t("Crew on Site")} ({present.length})</label>
                <div className="frm-report-crew-list">
                  {combined.length > 0 ? combined.map(c => (
                    <label key={c.id} className="frm-report-crew-label">
                      <input type="checkbox"
                        checked={isChecked(c.id)}
                        onChange={e => toggle(c, e.target.checked)} />
                      <span>{c.name}</span>
                      {c.todayHours > 0 && <span className="text-xs text-muted">({c.todayHours.toFixed(1)}h)</span>}
                      {!scheduledIds.has(c.id) && <span className="text-xs text-muted">({t("added")})</span>}
                    </label>
                  )) : (
                    <div className="text-xs text-muted" style={{ padding: "var(--space-2)" }}>{t("No team assigned to this project this week")}</div>
                  )}
                </div>
                {/* Manual add */}
                {availableEmployees.length > 0 && (
                  reportCrewAdding ? (
                    <select className="form-select frm-mt-8" autoFocus
                      onChange={e => {
                        if (!e.target.value) { setReportCrewAdding(false); return; }
                        const emp = (employees || []).find(em => String(em.id) === String(e.target.value));
                        if (emp) {
                          setReportForm(f => ({ ...f, teamPresent: [...(f.teamPresent || []), { id: emp.id, name: emp.name }] }));
                        }
                        setReportCrewAdding(false);
                      }} onBlur={() => setReportCrewAdding(false)}>
                      <option value="">{t("Select employee...")}</option>
                      {availableEmployees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}{e.role ? ` \u2014 ${e.role}` : ""}</option>
                      ))}
                    </select>
                  ) : (
                    <button className="btn btn-sm frm-mt-8"
                      style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)", fontSize: "var(--text-tab)" }}
                      onClick={() => setReportCrewAdding(true)}>
                      + {t("Add employee")}
                    </button>
                  )
                )}
              </div>
            );
          })()}

          {/* Work Performed */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Work Performed Today")} *</label>
            <div className="frm-flex-wrap frm-mb-8" style={{ gap: "var(--space-2)" }}>
              {QUICK_TASKS.map(task => {
                const isActive = (reportForm.quickTasks || []).includes(task);
                return (
                  <button key={task} className="btn btn-sm"
                    style={{
                      fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-card)",
                      background: isActive ? "var(--accent)" : "var(--surface2)",
                      color: isActive ? "#fff" : "var(--text2)",
                      border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                    }}
                    onClick={() => {
                      setReportForm(f => {
                        const tasks = f.quickTasks || [];
                        const newTasks = isActive ? tasks.filter(t2 => t2 !== task) : [...tasks, task];
                        const taskStr = newTasks.join(", ");
                        const existing = f.workPerformed.replace(/^Tasks: [^\n]*\n?/, "");
                        return { ...f, quickTasks: newTasks, workPerformed: newTasks.length > 0 ? `Tasks: ${taskStr}\n${existing}` : existing };
                      });
                    }}>
                    {isActive ? "\u2713 " : ""}{t(task)}
                  </button>
                );
              })}
            </div>
            <textarea className="form-input frm-resize-v" rows={4} placeholder={t("Describe work completed...")}
              value={reportForm.workPerformed}
              onChange={e => setReportForm(f => ({ ...f, workPerformed: e.target.value }))} />
          </div>

          {/* Materials Received */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Materials Received")}</label>
            <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Materials delivered/received today...")}
              value={reportForm.materialsReceived}
              onChange={e => setReportForm(f => ({ ...f, materialsReceived: e.target.value }))} />
          </div>

          {/* Equipment on Site */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Equipment on Site")}</label>
            <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Lifts, scaffolding, tools...")}
              value={reportForm.equipmentOnSite}
              onChange={e => setReportForm(f => ({ ...f, equipmentOnSite: e.target.value }))} />
          </div>

          {/* Visitors / Inspections */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Visitors / Inspections")}</label>
            <textarea className="form-input frm-resize-v" rows={2} placeholder={t("GC walkthroughs, inspector visits...")}
              value={reportForm.visitors}
              onChange={e => setReportForm(f => ({ ...f, visitors: e.target.value }))} />
          </div>

          {/* Safety Incidents */}
          <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: reportForm.safetyIncident ? "rgba(239,68,68,0.08)" : "var(--surface1)", borderRadius: "var(--radius-control)", border: reportForm.safetyIncident ? "1px solid var(--red)" : "1px solid var(--border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer", fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)" }}>
              <span>{t("Safety Incident")}</span>
              <button
                style={{
                  width: 44, height: 24, borderRadius: "var(--radius-control)", border: "none", cursor: "pointer",
                  background: reportForm.safetyIncident ? "var(--red)" : "var(--border)",
                  position: "relative", transition: "background 0.2s",
                }}
                onClick={() => setReportForm(f => ({ ...f, safetyIncident: !f.safetyIncident }))}>
                <span style={{
                  position: "absolute", top: 2, left: reportForm.safetyIncident ? 22 : 2,
                  width: 20, height: 20, borderRadius: "var(--radius-control)", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
              <span style={{ fontSize: "var(--text-label)", color: reportForm.safetyIncident ? "var(--red)" : "var(--text3)" }}>
                {reportForm.safetyIncident ? t("YES") : t("No")}
              </span>
            </label>
            {reportForm.safetyIncident && (
              <textarea className="form-input" rows={3} placeholder={t("Describe the safety incident...")}
                value={reportForm.safetyDescription}
                onChange={e => setReportForm(f => ({ ...f, safetyDescription: e.target.value }))}
                style={{ resize: "vertical", marginTop: "var(--space-2)" }} />
            )}
          </div>

          {/* Photos */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Photos")} ({(reportForm.photos || []).length})</label>
            <PhotoCapture
              photos={reportForm.photos || []}
              onPhotos={(photos) => setReportForm(f => ({ ...f, photos }))}
              multiple={true}
              t={t}
            />
          </div>

          {/* Issues / Delays */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Issues / Delays")}</label>
            <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Any issues or delays...")}
              value={reportForm.issues}
              onChange={e => setReportForm(f => ({ ...f, issues: e.target.value }))} />
          </div>

          {/* Tomorrow's Plan */}
          <div className="frm-mt-12">
            <label className="form-label">{t("Tomorrow's Plan")}</label>
            <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Planned work for tomorrow...")}
              value={reportForm.tomorrowPlan}
              onChange={e => setReportForm(f => ({ ...f, tomorrowPlan: e.target.value }))} />
          </div>

          {/* Hours Worked */}
          <div className="frm-report-hours-row frm-mt-10">
            <span className="form-label" style={{ margin: "0" }}>{t("Hours Worked (from time entries)")}</span>
            <span className="frm-report-hours-value">{todayHoursForProject.toFixed(1)} hrs</span>
          </div>

          {/* Submit / Update */}
          <button className="btn btn-primary frm-w-full" style={{ marginTop: "var(--space-4)" }}
            onClick={() => {
              if (!reportForm.workPerformed.trim()) { show(t("Describe work performed"), "warn"); return; }
              const report = {
                id: editingReportId || ("dr-" + Date.now()),
                projectId: selectedProjectId,
                projectName: selectedProject?.name || "",
                foremanId: activeForeman?.id,
                foremanName: activeForeman?.name,
                date: reportForm.date,
                isOutdoor: !!reportForm.isOutdoor,
                temperature: reportForm.isOutdoor ? reportForm.temperature : "",
                weatherCondition: reportForm.isOutdoor ? reportForm.weatherCondition : "",
                weather: reportForm.isOutdoor ? reportForm.weatherCondition : "",
                teamPresent: reportForm.teamPresent || [],
                teamSize: (reportForm.teamPresent || []).length,
                quickTasks: reportForm.quickTasks || [],
                workPerformed: reportForm.workPerformed,
                materialsReceived: reportForm.materialsReceived,
                equipmentOnSite: reportForm.equipmentOnSite,
                visitors: reportForm.visitors,
                safetyIncident: reportForm.safetyIncident,
                safetyDescription: reportForm.safetyDescription,
                photos: reportForm.photos || [],
                issues: reportForm.issues,
                tomorrowPlan: reportForm.tomorrowPlan,
                hoursWorked: todayHoursForProject.toFixed(1),
                createdAt: editingReportId
                  ? (dailyReports || []).find(r => r.id === editingReportId)?.createdAt || new Date().toISOString()
                  : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              if (editingReportId) {
                setDailyReports(prev => prev.map(r => r.id === editingReportId ? report : r));
                queueMutation("daily_reports", "upsert", report);
              } else {
                setDailyReports(prev => [...prev, report]);
                queueMutation("daily_reports", "insert", report);
              }
              clearReportDraft();
              setShowReportForm(false);
              setEditingReportId(null);
              show(editingReportId ? t("Report updated") : t("Daily report submitted"));
            }}>
            {editingReportId ? t("Update Report") : t("Submit Report")}
          </button>
        </div>
      )}

      {/* Report List */}
      <div className="frm-mt-16">
        {(dailyReports || [])
          .filter(r => myProjectIds.has(r.projectId) && r.status !== "deleted")
          .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
          .map(r => {
            const isExpanded = expandedReportId === r.id;
            const isOutdoorReport = r.isOutdoor === true || (r.isOutdoor === undefined && ((r.temperature && r.temperature !== "") || (r.weatherCondition && r.weatherCondition !== "" && r.weatherCondition !== "Clear")));
            const weatherIcon = isOutdoorReport ? ({ Clear: "Clear", Cloudy: "Cloudy", Rain: "Rain", Storm: "Storm", Wind: "Windy", Snow: "Snow", Hot: "Hot", Cold: "Cold" }[r.weatherCondition || r.weather] || (r.weatherCondition || r.weather || "")) : "";
            const tempClean = String(r.temperature || "").replace(/\u00B0F/gi, "").trim();
            const teamN = (r.teamPresent || []).length || r.teamSize || 0;
            return (
              <div key={r.id} className="card frm-report-card" style={{ cursor: "pointer" }}
                onClick={() => setExpandedReportId(isExpanded ? null : r.id)}>
                <div className="frm-flex-between">
                  <div>
                    <div className="text-sm font-semi">{r.date}{isOutdoorReport && (weatherIcon || tempClean) ? ` ${weatherIcon}${tempClean ? ` ${tempClean}\u00B0F` : ""}` : ""}</div>
                    <div className="text-xs text-muted">{r.projectName || t("Project")} · {teamN} {t("team")} · {r.foremanName || ""}</div>
                    {r.hoursWorked && <div className="text-xs text-muted">{r.hoursWorked} hrs logged</div>}
                  </div>
                  <div className="frm-flex-row-center" style={{ gap: "var(--space-2)" }}>
                    {r.safetyIncident && <span style={{ fontSize: "var(--text-xs)", background: "var(--red)", color: "#fff", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)" }}>Safety</span>}
                    {r.photos && r.photos.length > 0 && <span className="text-xs text-muted">{r.photos.length} pic</span>}
                    <span className="frm-font-12" style={{ color: "var(--text3)" }}>{isExpanded ? "\u25BE" : "\u25B8"}</span>
                  </div>
                </div>
                {!isExpanded && (
                  <div className="text-xs text-muted frm-mt-4 frm-truncate">
                    {(r.quickTasks || []).length > 0 && <span style={{ color: "var(--accent)", marginRight: "var(--space-1)" }}>{r.quickTasks.join(", ")}</span>}
                    {r.workPerformed?.replace(/^Tasks: [^\n]*\n?/, "").slice(0, 80)}
                  </div>
                )}
                {isExpanded && (
                  <div className="frm-mt-10" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "var(--space-3)" }}
                    onClick={e => e.stopPropagation()}>

                    {/* Crew Present */}
                    {(r.teamPresent || []).length > 0 && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Crew on Site")}</div>
                        <div className="frm-flex-wrap">
                          {r.teamPresent.map((c, i) => (
                            <span key={i} className="badge badge-blue frm-font-10">{typeof c === "string" ? c : c.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Tasks */}
                    {(r.quickTasks || []).length > 0 && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: "var(--space-1)" }}>{t("Tasks")}</div>
                        <div className="frm-flex-wrap">
                          {r.quickTasks.map((tk, i) => (
                            <span key={i} style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--accent)", color: "#fff" }}>{tk}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-8">
                      <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: "var(--space-1)" }}>{t("Work Performed")}</div>
                      <div className="text-sm frm-pre-wrap">{r.workPerformed}</div>
                    </div>

                    {r.materialsReceived && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Materials Received")}</div>
                        <div className="text-sm frm-pre-wrap">{r.materialsReceived}</div>
                      </div>
                    )}
                    {r.equipmentOnSite && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Equipment on Site")}</div>
                        <div className="text-sm frm-pre-wrap">{r.equipmentOnSite}</div>
                      </div>
                    )}
                    {r.visitors && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Visitors / Inspections")}</div>
                        <div className="text-sm frm-pre-wrap">{r.visitors}</div>
                      </div>
                    )}

                    {/* Safety */}
                    <div style={{ marginBottom: "var(--space-2)", padding: "var(--space-2)", borderRadius: "var(--radius-control)", background: r.safetyIncident ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)" }}>
                      <div className="text-xs font-semi" style={{ color: r.safetyIncident ? "var(--red)" : "var(--green)", marginBottom: "var(--space-1)" }}>
                        {r.safetyIncident ? t("SAFETY INCIDENT") : t("No Safety Incidents")}
                      </div>
                      {r.safetyIncident && r.safetyDescription && (
                        <div className="text-sm frm-pre-wrap">{r.safetyDescription}</div>
                      )}
                    </div>

                    {r.issues && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--amber)", marginBottom: "var(--space-1)" }}>{t("Issues / Delays")}</div>
                        <div className="text-sm frm-pre-wrap">{r.issues}</div>
                      </div>
                    )}
                    {r.tomorrowPlan && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: "var(--space-1)" }}>{t("Tomorrow's Plan")}</div>
                        <div className="text-sm frm-pre-wrap">{r.tomorrowPlan}</div>
                      </div>
                    )}

                    {/* Photos */}
                    {r.photos && r.photos.length > 0 && (
                      <div className="mb-8">
                        <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Photos")} ({r.photos.length})</div>
                        <div className="frm-flex-wrap" style={{ gap: "var(--space-2)" }}>
                          {r.photos.map((p, i) => (
                            <img key={i} src={p.data || p} alt={`Photo ${i + 1}`}
                              className="frm-report-photo" style={{ cursor: "pointer" }}
                              onClick={() => window.open(p.data || p, "_blank")} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted frm-mt-8">
                      {t("Submitted")}: {new Date(r.createdAt).toLocaleString()}
                      {r.updatedAt && r.updatedAt !== r.createdAt && ` · ${t("Updated")}: ${new Date(r.updatedAt).toLocaleString()}`}
                    </div>

                    {/* Action Buttons */}
                    <div className="frm-flex-row frm-mt-10">
                      <button className="btn btn-sm frm-font-11"
                        onClick={() => {
                          setEditingReportId(r.id);
                          setReportForm({
                            date: r.date || new Date().toISOString().slice(0, 10),
                            temperature: r.temperature || "",
                            weatherCondition: r.weatherCondition || r.weather || "Clear",
                            teamPresent: r.teamPresent || [],
                            quickTasks: r.quickTasks || [],
                            workPerformed: r.workPerformed || "",
                            materialsReceived: r.materialsReceived || "",
                            equipmentOnSite: r.equipmentOnSite || "",
                            visitors: r.visitors || "",
                            safetyIncident: !!r.safetyIncident,
                            safetyDescription: r.safetyDescription || "",
                            photos: r.photos || [],
                            issues: r.issues || "",
                            tomorrowPlan: r.tomorrowPlan || "",
                          });
                          setShowReportForm(true);
                          setExpandedReportId(null);
                        }}>
                        {t("Edit")}
                      </button>
                      <button className="btn btn-sm frm-font-11"
                        onClick={async () => {
                          try {
                            const { generateDailyReportPdf } = await import("../../utils/dailyReportPdf.js");
                            generateDailyReportPdf(r, selectedProject);
                            show(t("PDF downloaded"));
                          } catch (err) {
                            console.error("PDF generation error:", err);
                            show(t("Failed to generate PDF"), "err");
                          }
                        }}>
                        {t("Export PDF")}
                      </button>
                      <button className="btn btn-sm frm-font-11"
                        onClick={() => {
                          const proj = projects.find(p => p.id === r.projectId);
                          const reportText = [
                            `DAILY REPORT \u2014 ${proj?.name || "Project"} \u2014 ${r.date}`,
                            `Foreman: ${r.foremanName || activeForeman?.name}`,
                            `Crew: ${(r.teamPresent || []).length} on site | ${r.totalHours || 0}h total`,
                            `Weather: ${r.weatherCondition || r.weather || ""} ${r.temperature || ""}`,
                            ``,
                            `WORK PERFORMED:`,
                            r.workPerformed || "\u2014",
                            r.materialsReceived ? `\nMATERIALS: ${r.materialsReceived}` : "",
                            r.equipmentOnSite ? `EQUIPMENT: ${r.equipmentOnSite}` : "",
                            r.visitors ? `VISITORS: ${r.visitors}` : "",
                            r.issues ? `\nISSUES: ${r.issues}` : "",
                            r.tomorrowPlan ? `\nTOMORROW: ${r.tomorrowPlan}` : "",
                            r.safetyIncident ? `\nSAFETY INCIDENT: ${r.safetyDescription || "Yes"}` : "",
                            `\n--- EBC Construction | ${new Date(r.createdAt || r.submittedAt).toLocaleString()} ---`,
                          ].filter(Boolean).join("\n");
                          navigator.clipboard.writeText(reportText).then(() => show(t("Report copied"))).catch(() => window.prompt("Copy:", reportText));
                        }}>
                        {t("Copy to Clipboard")}
                      </button>
                      <button className="btn btn-sm" style={{ fontSize: "var(--text-tab)", color: "var(--red)" }}
                        onClick={() => {
                          if (confirm(t("Delete this daily report?"))) {
                            setDailyReports(prev => prev.map(rp => rp.id === r.id ? { ...rp, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: activeForeman?.name || "Foreman" } : rp));
                            queueMutation("daily_reports", "update", { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: activeForeman?.name || "Foreman" }, { column: "id", value: r.id });
                            setExpandedReportId(null);
                            show(t("Report deleted"));
                          }
                        }}>
                        {t("Delete")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        {(dailyReports || []).filter(r => myProjectIds.has(r.projectId) && r.status !== "deleted").length === 0 && !showReportForm && (
          <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
            <div className="empty-icon"><ClipboardList size={32} /></div>
            <div className="empty-text">{t("No daily reports yet")}</div>
            <div className="text-xs text-muted">{t("Tap + New Report to get started")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
