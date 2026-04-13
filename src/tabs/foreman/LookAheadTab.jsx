import { useState } from "react";

export function LookAheadTab({ lookAheadEvents, onUpdateEvent, lang, t }) {
  // 7.9 — Inspection pass/fail logging state
  const [inspectionNotes, setInspectionNotes] = useState({});
  const [showInspectionForm, setShowInspectionForm] = useState(null);

  const handleInspectionResult = (ev, result) => {
    const notes = inspectionNotes[ev.id] || "";
    const updated = {
      ...ev,
      status: result,
      inspectionResult: result,
      inspectionNotes: notes,
      inspectionAt: new Date().toISOString(),
    };
    if (onUpdateEvent) onUpdateEvent(updated);
    setShowInspectionForm(null);
    setInspectionNotes(prev => ({ ...prev, [ev.id]: "" }));
  };

  return (
    <div className="emp-content">
      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("14-Day Look-Ahead")}</div>
      </div>
      <div className="text-xs text-muted frm-mb-12">
        {t("Upcoming milestones, inspections, and deadlines for this project.")}
        {" "}{t("Tap inspections to log pass/fail.")}
      </div>

      {lookAheadEvents.length === 0 ? (
        <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
          <div className="empty-text">{t("No events in the next 14 days")}</div>
          <div className="text-xs text-muted frm-mt-8">{t("The PM will add milestones, inspections, and deadlines here.")}</div>
        </div>
      ) : (
        <div className="frm-flex-col-6">
          {(() => {
            const groups = {};
            lookAheadEvents.forEach(e => {
              const d = e.date || "unknown";
              if (!groups[d]) groups[d] = [];
              groups[d].push(e);
            });
            const todayStr = new Date().toISOString().slice(0, 10);
            const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
            return Object.entries(groups).map(([date, events]) => {
              const isToday = date === todayStr;
              const isTomorrow = date === tomorrowStr;
              const dayLabel = isToday ? t("Today") : isTomorrow ? t("Tomorrow") : new Date(date + "T12:00:00").toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={date}>
                  <div style={{
                    fontSize: "var(--text-label)", fontWeight: "var(--weight-bold)", padding: "var(--space-2) 0", marginTop: "var(--space-2)",
                    color: isToday ? "var(--amber, #f59e0b)" : isTomorrow ? "var(--accent)" : "var(--text2)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {dayLabel}
                  </div>
                  {events.map(ev => {
                    const typeColors = {
                      inspection: "var(--red)", milestone: "var(--green, #22c55e)",
                      delivery: "var(--accent)", meeting: "var(--purple, #8b5cf6)",
                      task: "var(--text2)", deadline: "var(--red)",
                    };
                    const color = typeColors[ev.type] || "var(--text2)";
                    return (
                      <div key={ev.id} className="card frm-mt-4" style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <div className="frm-flex-row-center gap-sp3">
                          <div className="rounded-control flex-shrink-0" style={{ width: 4, height: 32, background: color }} />
                          <div className="frm-flex-1">
                            <div className="text-sm font-semi frm-truncate">
                              {ev.title}
                            </div>
                            <div className="text-xs text-muted">
                              {ev.type && <span className="capitalize">{t(ev.type)}</span>}
                              {ev.startTime ? ` · ${ev.startTime}` : ""}
                              {ev.start_time ? ` · ${ev.start_time}` : ""}
                              {ev.location ? ` · ${ev.location}` : ""}
                            </div>
                            {ev.notes && <div className="text-xs text-dim frm-mt-2">{ev.notes.length > 80 ? ev.notes.slice(0, 80) + "..." : ev.notes}</div>}
                          </div>
                          {ev.status && ev.status !== "scheduled" && (
                            <span className={`badge ${ev.status === "passed" ? "badge-green" : ev.status === "failed" ? "badge-red" : ev.status === "completed" ? "badge-green" : "badge-amber"} fs-xs`}>
                              {ev.status === "passed" ? t("PASS") : ev.status === "failed" ? t("FAIL") : t(ev.status)}
                            </span>
                          )}
                        </div>
                        {/* 7.9 — Inspection pass/fail logging */}
                        {ev.type === "inspection" && !ev.inspectionResult && (
                          showInspectionForm === ev.id ? (
                            <div style={{ marginTop: "var(--space-2)", padding: "var(--space-2) 0" }}>
                              <textarea
                                placeholder={t("Inspector notes (optional)...")}
                                value={inspectionNotes[ev.id] || ""}
                                onChange={e => setInspectionNotes(prev => ({ ...prev, [ev.id]: e.target.value }))}
                                style={{
                                  width: "100%", minHeight: 60, padding: "var(--space-2)",
                                  fontSize: "var(--text-label)", background: "var(--bg3)",
                                  border: "1px solid var(--border)", borderRadius: "var(--radius-control)",
                                  color: "var(--text)", resize: "vertical", marginBottom: "var(--space-2)",
                                }}
                              />
                              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                                <button className="btn btn-sm" style={{ flex: 1, background: "var(--green)", color: "#fff", border: "none", height: "var(--control-secondary)" }}
                                  onClick={() => handleInspectionResult(ev, "passed")}>
                                  {"\u2713"} {t("Pass")}
                                </button>
                                <button className="btn btn-sm" style={{ flex: 1, background: "var(--red)", color: "#fff", border: "none", height: "var(--control-secondary)" }}
                                  onClick={() => handleInspectionResult(ev, "failed")}>
                                  {"\u2717"} {t("Fail")}
                                </button>
                                <button className="btn btn-sm btn-ghost" style={{ height: "var(--control-secondary)" }}
                                  onClick={() => setShowInspectionForm(null)}>
                                  {t("Cancel")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              style={{
                                marginTop: "var(--space-2)", width: "100%", padding: "var(--space-2)",
                                fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)",
                                background: "var(--amber-bg-subtle)", border: "1px solid var(--amber-border-subtle)",
                                borderRadius: "var(--radius-control)", color: "var(--amber)", cursor: "pointer",
                                height: "var(--control-secondary)",
                              }}
                              onClick={() => setShowInspectionForm(ev.id)}>
                              {t("Log Inspection Result")}
                            </button>
                          )
                        )}
                        {ev.inspectionResult && ev.inspectionNotes && (
                          <div style={{ marginTop: "var(--space-1)", fontSize: "var(--text-tab)", color: "var(--text3)", fontStyle: "italic" }}>
                            {ev.inspectionNotes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
