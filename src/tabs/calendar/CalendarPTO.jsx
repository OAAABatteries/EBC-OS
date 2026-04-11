import { useState, useMemo } from "react";
import { Shield } from "lucide-react";
import { T } from "../../data/translations";
import { PTO_TYPES } from "../../data/calendarConstants";

// ═══════════════════════════════════════════════════════════
//  CalendarPTO — PTO / Availability Management
//  Request PTO, approve/deny, calendar view of who's out
// ═══════════════════════════════════════════════════════════

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getMonday(d) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0, 0, 0, 0); return r;
}
function daysBetween(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000) + 1; }

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const STATUS_COLORS = { pending: "#f59e0b", approved: "#10b981", denied: "#ef4444" };

export function CalendarPTO({ app, lang }) {
  const {
    ptoRequests, setPtoRequests, employees, teamSchedule, show,
  } = app;

  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);

  const [subView, setSubView] = useState("requests"); // requests | calendar | new
  const [form, setForm] = useState({ employeeId: "", type: "vacation", startDate: "", endDate: "", reason: "" });
  const [weekOffset, setWeekOffset] = useState(0);

  // ── PTO Impact Analyzer state ──
  const [ptoImpact, setPtoImpact] = useState(null);
  const [ptoImpactLoading, setPtoImpactLoading] = useState(false);
  const [showPtoImpact, setShowPtoImpact] = useState(false);

  const runPtoImpact = async () => {
    if (!app.apiKey) { show("Set API key in Settings first"); return; }
    setPtoImpactLoading(true);
    setPtoImpact(null);
    try {
      const { analyzePtoImpact } = await import("../../utils/api.js");
      const res = await analyzePtoImpact(app.apiKey, ptoRequests?.slice(0, 20), (employees || []).filter(e => e.active).slice(0, 20), teamSchedule?.slice(0, 30), app.projects?.slice(0, 10));
      setPtoImpact(res);
      setShowPtoImpact(true);
      show("PTO impact analysis complete");
    } catch (e) {
      show(e.message);
    } finally {
      setPtoImpactLoading(false);
    }
  };

  const empName = (id) => (employees || []).find(e => e.id === id)?.name || `#${id}`;

  // Stats
  const pending = useMemo(() => (ptoRequests || []).filter(p => p.status === "pending"), [ptoRequests]);
  const approved = useMemo(() => (ptoRequests || []).filter(p => p.status === "approved"), [ptoRequests]);

  // PTO calendar — 2-week view
  const monday = addDays(getMonday(new Date()), weekOffset * 7);
  const calDays = Array.from({ length: 10 }, (_, i) => addDays(monday, i < 5 ? i : i + 2)); // Mon-Fri x2

  const ptoForDay = (dateStr) => {
    return (ptoRequests || []).filter(p =>
      p.status === "approved" && dateStr >= p.startDate && dateStr <= p.endDate
    );
  };

  // Approve / Deny
  const reviewPto = (id, status) => {
    setPtoRequests(prev => prev.map(p =>
      p.id === id ? { ...p, status, reviewedBy: "admin", reviewedAt: new Date().toISOString() } : p
    ));
    show(`PTO ${status}`);
  };

  // Submit new request
  const submitPto = () => {
    if (!form.employeeId || !form.startDate || !form.endDate) return;
    const newPto = {
      id: crypto.randomUUID(),
      employeeId: Number(form.employeeId),
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      status: "pending",
      reason: form.reason,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    };
    setPtoRequests(prev => [...prev, newPto]);
    setForm({ employeeId: "", type: "vacation", startDate: "", endDate: "", reason: "" });
    setSubView("requests");
    show("PTO request submitted");
  };

  // Check team schedule conflicts
  const hasCrewConflict = (empId, startDate, endDate) => {
    const start = toDate(startDate);
    const end = toDate(endDate);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const mon = getMonday(d);
      const weekStr = toStr(mon);
      const dayIdx = (d.getDay() + 6) % 7;
      const dayKey = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][dayIdx];
      const assigned = (teamSchedule || []).filter(cs =>
        cs.weekStart === weekStr && cs.employeeId === empId && cs.days?.[dayKey]
      );
      if (assigned.length > 0) return true;
    }
    return false;
  };

  return (
    <div className="cal-pto">
      {/* Sub-nav */}
      <div className="cal-pto-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "var(--space-1)" }}>
          {[
            { key: "requests", label: "Requests" },
            { key: "calendar", label: "Availability" },
            { key: "new", label: "+ New Request" },
          ].map(item => (
            <button key={item.key} className={`cal-nav-btn${subView === item.key ? " active" : ""}`} onClick={() => setSubView(item.key)}>
              {t(item.label)}
              {item.key === "requests" && pending.length > 0 && (
                <span className="cal-conflict-badge">{pending.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className="primary" style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-3)" }} onClick={ptoImpactLoading ? undefined : () => showPtoImpact ? setShowPtoImpact(false) : ptoImpact ? setShowPtoImpact(true) : runPtoImpact()} disabled={ptoImpactLoading}>
          {ptoImpactLoading ? "Analyzing..." : "AI Coverage"}
        </button>
      </div>

      {/* AI PTO Impact Panel */}
      {showPtoImpact && ptoImpact && (
        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Shield style={{ width: 22, height: 22 }} />
              <div>
                <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-secondary)" }}>Coverage Score: {ptoImpact.coverageScore}/100 ({ptoImpact.grade})</div>
                <div style={{ fontSize: "var(--text-label)", color: "var(--text3)" }}>{ptoImpact.summary}</div>
              </div>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-card)", color: "var(--text3)" }} onClick={() => setShowPtoImpact(false)}>✕</button>
          </div>

          {ptoImpact.coverageGaps?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--red)", marginBottom: "var(--space-2)" }}>Coverage Gaps ({ptoImpact.coverageGaps.length})</div>
              {ptoImpact.coverageGaps.map((g, i) => (
                <div key={i} style={{ fontSize: "var(--text-label)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius)", borderLeft: `3px solid ${g.severity === "critical" ? "#ef4444" : g.severity === "moderate" ? "#f59e0b" : "#6b7280"}` }}>
                  <div style={{ fontWeight: "var(--weight-medium)" }}>{g.date} — {g.project}</div>
                  <div style={{ color: "var(--text3)" }}>{g.missingRole} · {g.suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {ptoImpact.conflictAlerts?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--amber)", marginBottom: "var(--space-2)" }}>Conflict Alerts</div>
              {ptoImpact.conflictAlerts.map((c, i) => (
                <div key={i} style={{ fontSize: "var(--text-label)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)" }}>
                  <span style={{ fontWeight: "var(--weight-medium)" }}>{c.employee}:</span> {c.issue} — <em>{c.recommendation}</em>
                </div>
              ))}
            </div>
          )}

          {ptoImpact.upcomingRisks?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--blue)", marginBottom: "var(--space-2)" }}>Upcoming Risks</div>
              {ptoImpact.upcomingRisks.map((r, i) => (
                <div key={i} style={{ fontSize: "var(--text-label)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
                  <span style={{ fontWeight: "var(--weight-medium)" }}>{r.period}:</span> {r.risk} — <em>{r.mitigation}</em>
                </div>
              ))}
            </div>
          )}

          {ptoImpact.recommendations?.length > 0 && (
            <div>
              <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--green)", marginBottom: "var(--space-2)" }}>Recommendations</div>
              {ptoImpact.recommendations.map((r, i) => (
                <div key={i} style={{ fontSize: "var(--text-label)", color: "var(--text2)", paddingLeft: "var(--space-2)", marginBottom: "var(--space-1)" }}>• {r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Requests List ── */}
      {subView === "requests" && (
        <div className="cal-pto-list">
          {/* Pending first */}
          {pending.length > 0 && (
            <>
              <div className="cal-lookahead-section-title" style={{ color: "var(--amber)" }}>{t("Pending Approval")} ({pending.length})</div>
              {pending.map(pto => {
                const conflict = hasCrewConflict(pto.employeeId, pto.startDate, pto.endDate);
                return (
                  <div key={pto.id} className="cal-pto-card">
                    <div className="cal-pto-card-top">
                      <div>
                        <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-label)" }}>{empName(pto.employeeId)}</div>
                        <div style={{ fontSize: "var(--text-label)", color: "var(--text3)" }}>
                          {pto.type} · {pto.startDate} → {pto.endDate} ({daysBetween(pto.startDate, pto.endDate)}d)
                        </div>
                        {pto.reason && <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", marginTop: "var(--space-1)" }}>{pto.reason}</div>}
                      </div>
                      {conflict && (
                        <span style={{ fontSize: "var(--text-tab)", color: "var(--red)", fontWeight: "var(--weight-medium)" }}>{t("Crew conflict")}</span>
                      )}
                    </div>
                    <div className="cal-pto-actions">
                      <button className="cal-pto-btn approve" onClick={() => reviewPto(pto.id, "approved")}>{t("Approve")}</button>
                      <button className="cal-pto-btn deny" onClick={() => reviewPto(pto.id, "denied")}>{t("Deny")}</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <>
              <div className="cal-lookahead-section-title" style={{ color: "var(--green)", marginTop: "var(--space-4)" }}>{t("Approved")} ({approved.length})</div>
              {approved.map(pto => (
                <div key={pto.id} className="cal-pto-card" style={{ borderLeft: "3px solid #10b981" }}>
                  <div style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-label)" }}>{empName(pto.employeeId)}</div>
                  <div style={{ fontSize: "var(--text-label)", color: "var(--text3)" }}>
                    {pto.type} · {pto.startDate} → {pto.endDate} ({daysBetween(pto.startDate, pto.endDate)}d)
                  </div>
                </div>
              ))}
            </>
          )}

          {pending.length === 0 && approved.length === 0 && (
            <div style={{ color: "var(--text3)", fontSize: "var(--text-label)", padding: "var(--space-4)" }}>{t("No PTO requests")}</div>
          )}
        </div>
      )}

      {/* ── Availability Calendar ── */}
      {subView === "calendar" && (
        <div className="cal-pto-calendar">
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", alignItems: "center" }}>
            <button className="cal-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>←</button>
            <button className="cal-nav-btn today" onClick={() => setWeekOffset(0)}>{t("Today")}</button>
            <button className="cal-nav-btn" onClick={() => setWeekOffset(w => w + 1)}>→</button>
          </div>
          <div className="cal-pto-matrix">
            {/* Header */}
            <div className="cal-pto-matrix-header">
              <div className="cal-pto-matrix-name">{t("Employee")}</div>
              {calDays.map((d, i) => (
                <div key={i} className="cal-pto-matrix-day">
                  <div>{["M", "T", "W", "T", "F"][i % 5]}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text3)" }}>{d.getDate()}</div>
                </div>
              ))}
            </div>
            {/* Rows */}
            {(employees || []).filter(e => e.active).map(emp => (
              <div key={emp.id} className="cal-pto-matrix-row">
                <div className="cal-pto-matrix-name">{emp.name}</div>
                {calDays.map((d, i) => {
                  const ds = toStr(d);
                  const ptos = ptoForDay(ds).filter(p => p.employeeId === emp.id);
                  const isOff = ptos.length > 0;
                  return (
                    <div key={i} className={`cal-pto-matrix-cell${isOff ? " off" : ""}`} title={isOff ? ptos[0].type : ""}>
                      {isOff ? "×" : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New Request ── */}
      {subView === "new" && (
        <div className="cal-pto-form">
          <div className="cal-lookahead-section-title">{t("New PTO Request")}</div>
          <div className="cal-event-form">
            <div>
              <label>{t("Employee")}</label>
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">{t("Select...")}</option>
                {(employees || []).filter(e => e.active).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>{t("Type")}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {PTO_TYPES.map(pt => (
                  <option key={pt.key} value={pt.key}>{lang === "es" ? pt.labelEs : pt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div>
                <label>{t("Start Date")}</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label>{t("End Date")}</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label>{t("Reason")}</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("Optional...")} />
            </div>

            {/* Conflict warning */}
            {form.employeeId && form.startDate && form.endDate && hasCrewConflict(Number(form.employeeId), form.startDate, form.endDate) && (
              <div style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", color: "var(--red)", fontSize: "var(--text-label)" }}>
                {t("Warning: This employee is on the team schedule during this period")}
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button className="secondary" onClick={() => setSubView("requests")}>{t("Cancel")}</button>
              <button className="primary" onClick={submitPto}>{t("Submit Request")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
