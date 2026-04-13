export function LookAheadTab({ lookAheadEvents, lang, t }) {
  return (
    <div className="emp-content">
      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("14-Day Look-Ahead")}</div>
      </div>
      <div className="text-xs text-muted frm-mb-12">
        {t("Upcoming milestones, inspections, and deadlines for this project. Read-only — contact PM for changes.")}
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
                            <span className={`badge ${ev.status === "completed" ? "badge-green" : "badge-amber"} fs-xs`}>
                              {t(ev.status)}
                            </span>
                          )}
                        </div>
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
