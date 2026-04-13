import { useState, useMemo } from "react";
import { T } from "../../data/translations";

// ═══════════════════════════════════════════════════════════
//  CalendarConflicts — Conflict Detection Dashboard
//  Shows all detected scheduling conflicts with severity,
//  filtering, and resolution tracking
// ═══════════════════════════════════════════════════════════

const SEVERITY_COLORS = { error: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };
const SEVERITY_LABELS = { error: "Critical", warning: "Warning", info: "Info" };

const TYPE_LABELS = {
  double_book: "Double Booking",
  equipment_double_book: "Equipment Conflict",
  cert_expiring: "Certification",
  ot_threshold: "Overtime",
  fatigue: "Fatigue",
  ratio_violation: "Ratio Violation",
  phase_overlap: "Phase Overlap",
  permit_expiring: "Permit",
  sub_conflict: "Sub Conflict",
  capacity_exceeded: "Overloaded",
  pto_conflict: "PTO Conflict",
};

const TYPE_LABELS_ES = {
  double_book: "Doble Asignación",
  equipment_double_book: "Conflicto de Equipo",
  cert_expiring: "Certificación",
  ot_threshold: "Horas Extra",
  fatigue: "Fatiga",
  ratio_violation: "Violación de Ratio",
  phase_overlap: "Traslape de Fase",
  permit_expiring: "Permiso",
  sub_conflict: "Conflicto de Sub",
  capacity_exceeded: "Sobrecargado",
  pto_conflict: "Conflicto PTO",
};

export function CalendarConflicts({ app, lang, conflicts }) {
  const { employees, projects, show, scheduleConflicts, setScheduleConflicts, auth } = app;
  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);

  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveAction, setResolveAction] = useState("dismiss");
  const [resolveNote, setResolveNote] = useState("");

  const handleResolve = (conflict) => {
    setResolveModal(conflict);
    setResolveAction("dismiss");
    setResolveNote("");
  };

  const confirmResolve = () => {
    if (!resolveModal) return;
    const resolution = {
      id: resolveModal.id,
      resolved: true,
      resolvedBy: auth?.name || "Admin",
      resolvedAt: new Date().toISOString(),
      resolution: resolveAction,
      resolveNote,
    };
    // Store resolution in scheduleConflicts state
    if (setScheduleConflicts) {
      setScheduleConflicts(prev => {
        const existing = prev.find(r => r.id === resolveModal.id);
        if (existing) return prev.map(r => r.id === resolveModal.id ? { ...r, ...resolution } : r);
        return [...prev, resolution];
      });
    }
    // Also mark the conflict object as resolved (local mutation for immediate UI update)
    resolveModal.resolved = true;
    resolveModal.resolvedBy = resolution.resolvedBy;
    resolveModal.resolvedAt = resolution.resolvedAt;
    resolveModal.resolution = resolveAction;
    resolveModal.resolveNote = resolveNote;
    setResolveModal(null);
    show?.(t("Conflict resolved"));
  };

  // Stats
  const stats = useMemo(() => {
    const s = { error: 0, warning: 0, info: 0, resolved: 0, total: 0 };
    for (const c of conflicts) {
      s.total++;
      if (c.resolved) s.resolved++;
      else s[c.severity] = (s[c.severity] || 0) + 1;
    }
    return s;
  }, [conflicts]);

  // Filtered
  const filtered = useMemo(() => {
    return conflicts.filter(c => {
      if (!showResolved && c.resolved) return false;
      if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
      if (filterType !== "all" && c.type !== filterType) return false;
      return true;
    });
  }, [conflicts, filterSeverity, filterType, showResolved]);

  // Unique types
  const uniqueTypes = useMemo(() => [...new Set(conflicts.map(c => c.type))], [conflicts]);

  const typeLabel = (type) => lang === "es" ? (TYPE_LABELS_ES[type] || type) : (TYPE_LABELS[type] || type);

  return (
    <div className="cal-conflicts">
      {/* Stats */}
      <div className="cal-lookahead-kpis mb-sp4">
        <div className="cal-lookahead-kpi" onClick={() => setFilterSeverity("error")} className="cursor-pointer">
          <div className="cal-lookahead-kpi-val c-red">{stats.error}</div>
          <div className="cal-lookahead-kpi-lbl">{t("Critical")}</div>
        </div>
        <div className="cal-lookahead-kpi" onClick={() => setFilterSeverity("warning")} className="cursor-pointer">
          <div className="cal-lookahead-kpi-val c-amber">{stats.warning}</div>
          <div className="cal-lookahead-kpi-lbl">{t("Warnings")}</div>
        </div>
        <div className="cal-lookahead-kpi" onClick={() => setFilterSeverity("info")} className="cursor-pointer">
          <div className="cal-lookahead-kpi-val c-blue">{stats.info}</div>
          <div className="cal-lookahead-kpi-lbl">{t("Info")}</div>
        </div>
        <div className="cal-lookahead-kpi" onClick={() => { setFilterSeverity("all"); setShowResolved(false); }} className="cursor-pointer">
          <div className="cal-lookahead-kpi-val">{stats.total - stats.resolved}</div>
          <div className="cal-lookahead-kpi-lbl">{t("Unresolved")}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-sp3 gap-sp2 flex-wrap" style={{ display: "flex", alignItems: "center" }}>
        <select
          className="fs-label bg-bg3 c-text" style={{ border: "1px solid var(--border)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius)" }}
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
        >
          <option value="all">{t("All Severities")}</option>
          <option value="error">{t("Critical")}</option>
          <option value="warning">{t("Warning")}</option>
          <option value="info">{t("Info")}</option>
        </select>
        <select
          className="fs-label bg-bg3 c-text" style={{ border: "1px solid var(--border)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius)" }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">{t("All Types")}</option>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{typeLabel(type)}</option>
          ))}
        </select>
        <label className="flex fs-label c-text2 gap-sp1">
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          {t("Show resolved")}
        </label>
      </div>

      {/* Conflict list */}
      <div className="cal-pto-list">
        {filtered.length === 0 && (
          <div className="fs-label p-sp4 c-text3">
            {stats.total === 0 ? t("No conflicts detected") : t("No conflicts match filters")}
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} className="cal-pto-card" style={{ borderLeft: `3px solid ${SEVERITY_COLORS[c.severity] || "#94a3b8"}` }}>
            <div className="cal-pto-card-top">
              <div className="flex-1">
                <div className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                  <span className="rounded-control fw-semi fs-xs uppercase" style={{ padding: "var(--space-1) var(--space-2)",
                    background: SEVERITY_COLORS[c.severity] + "22",
                    color: SEVERITY_COLORS[c.severity] }}>
                    {SEVERITY_LABELS[c.severity]}
                  </span>
                  <span className="fs-tab c-text3">{typeLabel(c.type)}</span>
                </div>
                <div className="fw-medium mb-sp1 fs-label">{c.description}</div>
                <div className="fs-tab c-text3">{c.date}</div>
                {c.resolved && (
                  <div className="fs-tab mt-sp1 c-green">
                    Resolved by {c.resolvedBy} — {c.resolution === "reassign" ? "Reassigned" : c.resolution === "override" ? "Override approved" : "Dismissed"}
                    {c.resolveNote && <span className="c-text3"> — {c.resolveNote}</span>}
                  </div>
                )}
              </div>
              {!c.resolved && (
                <button onClick={() => handleResolve(c)} className="rounded-control fw-semi fs-tab c-amber nowrap cursor-pointer" style={{ padding: "var(--space-1) var(--space-3)", background: "var(--amber-dim)", border: "1px solid var(--amber)", alignSelf: "flex-start" }}>
                  {t("Resolve")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="flex justify-center" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999 }} onClick={() => setResolveModal(null)}>
          <div onClick={e => e.stopPropagation()} className="rounded-control p-sp6 bg-bg3" style={{ border: "1px solid var(--border)", width: "95%", maxWidth: 420 }}>
            <h3 className="c-amber" style={{ margin: "0 0 4px" }}>{t("Resolve Conflict")}</h3>
            <div className="mb-sp4 fs-label c-text2">{resolveModal.description}</div>

            <label className="mb-sp1 fs-label c-text2 d-block">{t("Resolution Action")}</label>
            <select value={resolveAction} onChange={e => setResolveAction(e.target.value)} className="rounded-control mb-sp3 p-sp2 bg-bg2 c-text w-full" style={{ border: "1px solid var(--border)" }}>
              <option value="dismiss">{t("Dismiss — Not applicable")}</option>
              <option value="reassign">{t("Reassign team / equipment")}</option>
              <option value="override">{t("Approve override")}</option>
            </select>

            <label className="mb-sp1 fs-label c-text2 d-block">{t("Notes (optional)")}</label>
            <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={2} placeholder={t("Add context for this resolution...")} className="rounded-control mb-sp4 p-sp2 bg-bg2 c-text w-full" style={{ border: "1px solid var(--border)", resize: "vertical" }} />

            <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setResolveModal(null)} className="rounded-control bg-bg2 c-text2 cursor-pointer" style={{ padding: "var(--space-2) var(--space-4)", border: "1px solid var(--border)" }}>{t("Cancel")}</button>
              <button onClick={confirmResolve} className="rounded-control fw-semi cursor-pointer" style={{ padding: "var(--space-2) var(--space-5)", background: "var(--amber)", border: "none", color: "#000" }}>{t("Confirm")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
