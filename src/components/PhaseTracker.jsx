// ═══════════════════════════════════════════════════════════════
//  PhaseTracker — Construction Phase Timeline
//  Drywall/Framing subcontractor workflow: Layout → Framing →
//  Drywall → Finish → Touch Up Pt 1 → Touch Up Pt 2 → Final
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";

// ── Phase definitions (ordered) ─────────────────────────────────
export const CONSTRUCTION_PHASES = [
  { key: "layout",       name: "Layout" },
  { key: "framing",      name: "Framing" },
  { key: "drywall",      name: "Drywall" },
  { key: "finish",       name: "Finish" },
  { key: "touchup1",     name: "Touch Up Pt 1" },
  { key: "touchup2",     name: "Touch Up Pt 2" },
  { key: "finalTouchUp", name: "Final Touch Up" },
];

const STATUSES = ["not started", "in progress", "completed"];

/**
 * Generate default phases based on project size.
 * Small jobs skip Touch Up Pt 2; jobs without finish work skip finish phases.
 */
export function getDefaultPhases(project) {
  const contract = project?.contract || 0;
  const scope = project?.scope || [];
  const hasFinish = scope.some(s => s.includes("Tape") || s.includes("Finish"));

  let keys;
  if (!hasFinish && contract < 30000) {
    // Small scope-only job (demo, metal framing, no finish)
    keys = ["layout", "framing", "drywall"];
  } else if (contract < 100000) {
    // Medium job — skip Touch Up Pt 2
    keys = ["layout", "framing", "drywall", "finish", "touchup1", "finalTouchUp"];
  } else {
    // Large job — all 7 phases
    keys = ["layout", "framing", "drywall", "finish", "touchup1", "touchup2", "finalTouchUp"];
  }

  return keys.map(key => ({
    key,
    name: CONSTRUCTION_PHASES.find(p => p.key === key).name,
    status: "not started",
    startDate: "",
    completedDate: "",
    assignedForeman: "",
    notes: "",
  }));
}

// ── Inline SVG Icons (no external dependency) ───────────────────
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcoPlay = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IcoDash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcoPencil = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcoUser = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IcoCalendar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────────
function dotConfig(status) {
  if (status === "completed")  return { cls: "phase-dot-done",    icon: <IcoCheck /> };
  if (status === "in progress") return { cls: "phase-dot-active", icon: <IcoPlay />  };
  return { cls: "phase-dot-pending", icon: <IcoDash /> };
}

function connectorClass(leftStatus, rightStatus) {
  if (leftStatus === "completed") return "phase-connector-done";
  if (leftStatus === "in progress") return "phase-connector-active";
  return "phase-connector-pending";
}

function statusBadgeClass(status) {
  if (status === "completed")   return "badge badge-green";
  if (status === "in progress") return "badge badge-amber";
  return "badge badge-muted";
}

// ── PhaseTracker ─────────────────────────────────────────────────
/**
 * @param {Object[]} phases       - Phase objects (from project.phases or getDefaultPhases)
 * @param {Object[]} employees    - All employees (for foreman dropdown)
 * @param {Function} onUpdate     - Called with updated phases array when saved
 * @param {boolean}  readOnly     - If true, show info only (no edit controls)
 * @param {string}   foremanName  - Pre-fill foreman name (ForemanView usage)
 */
export function PhaseTracker({ phases = [], employees = [], onUpdate, readOnly = false, foremanName = "" }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const [form, setForm]               = useState({});

  const foremen = employees.filter(e => e.role && e.role.toLowerCase() === "foreman");

  const toggle = (key) => {
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    const ph = phases.find(p => p.key === key) || {};
    setForm({ ...ph });
    setExpandedKey(key);
  };

  const save = () => {
    if (!onUpdate) return;
    onUpdate(phases.map(p => String(p.key) === String(form.key) ? { ...p, ...form } : p));
    setExpandedKey(null);
  };

  const setStatus = (s) => {
    const now = new Date().toISOString().slice(0, 10);
    setForm(f => ({
      ...f,
      status: s,
      assignedForeman: f.assignedForeman || foremanName || "",
      startDate:     (s === "in progress" || s === "completed") && !f.startDate ? now : f.startDate,
      completedDate: s === "completed" && !f.completedDate ? now : f.completedDate,
    }));
  };

  if (!phases.length) return null;

  const currentPhaseIdx = (() => {
    // Last non-"not started" phase
    let last = -1;
    phases.forEach((p, i) => { if (p.status !== "not started") last = i; });
    return last;
  })();

  return (
    <div>
      {/* ── Timeline ── */}
      <div className="phase-timeline">
        {phases.flatMap((phase, idx) => {
          const { cls, icon } = dotConfig(phase.status);
          const isExpanded = expandedKey === phase.key;
          const isActive   = phase.status === "in progress";
          const isDone     = phase.status === "completed";
          const items = [
            <div key={phase.key} className="phase-node-wrap flex-col" style={{ alignItems: "center", minWidth: 80 }}>
              <button
                className={`phase-dot ${cls}${isExpanded ? " phase-dot-open" : ""}`}
                onClick={() => toggle(phase.key)}
                title={`${phase.name} — ${phase.status}`}
                aria-label={phase.name}
              >
                {icon}
              </button>
              <div
                className={`phase-node-label${isDone ? " phase-label-done" : isActive ? " phase-label-active" : ""}`}
                onClick={() => toggle(phase.key)}
              >
                {phase.name}
              </div>
              {(phase.startDate || phase.completedDate) && (
                <div className="phase-node-date">
                  {phase.completedDate || phase.startDate}
                </div>
              )}
            </div>,
          ];

          if (idx < phases.length - 1) {
            items.push(
              <div
                key={`conn-${idx}`}
                className={`phase-connector ${connectorClass(phase.status, phases[idx + 1]?.status)}`}
              />
            );
          }
          return items;
        })}
      </div>

      {/* ── Expanded Panel ── */}
      {expandedKey && (() => {
        const phase = phases.find(p => p.key === expandedKey);
        if (!phase) return null;
        return (
          <div className="phase-detail-panel">
            {/* Header */}
            <div className="flex-between mb-8">
              <div className="flex gap-sp2">
                <span className="fw-semi fs-label c-text">{phase.name}</span>
                <span className={`statusBadgeClass(phase.status) fs-xs`}>{phase.status}</span>
              </div>
              <button
                className="fs-card c-text3 cursor-pointer" style={{ background: "none", border: "none", lineHeight: 1 }}
                onClick={() => setExpandedKey(null)}
              >
                ✕
              </button>
            </div>

            {readOnly ? (
              /* ── Read-only detail view ── */
              <div className="flex-col fs-label gap-sp2">
                {phase.assignedForeman && (
                  <div className="flex gap-sp2">
                    <span className="c-text3"><IcoUser /></span>
                    <span className="c-text2">{phase.assignedForeman}</span>
                  </div>
                )}
                {phase.startDate && (
                  <div className="flex gap-sp2">
                    <span className="c-text3"><IcoCalendar /></span>
                    <span className="text-dim text-xs mr-sp1">STARTED</span>
                    <span className="font-mono fs-label c-text2">{phase.startDate}</span>
                    {phase.completedDate && (
                      <>
                        <span className="text-dim text-xs mr-sp1 ml-sp2">DONE</span>
                        <span className="font-mono fs-label c-green">{phase.completedDate}</span>
                      </>
                    )}
                  </div>
                )}
                {phase.notes && (
                  <div className="fs-label c-text2" style={{ borderLeft: "2px solid var(--border2)", paddingLeft: "var(--space-2)" }}>
                    {phase.notes}
                  </div>
                )}
                {!phase.assignedForeman && !phase.startDate && !phase.notes && (
                  <div className="fs-label c-text3">No details recorded yet.</div>
                )}
                {!readOnly && (
                  <button className="btn btn-ghost btn-sm mt-sp1" style={{ alignSelf: "flex-start" }}
                    onClick={() => { /* switch to edit */ }}>
                    <IcoPencil /> Edit
                  </button>
                )}
              </div>
            ) : (
              /* ── Edit view ── */
              <div className="flex-col gap-sp3">
                {/* Status buttons */}
                <div>
                  <div className="form-label mb-sp2">Status</div>
                  <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
                    {STATUSES.map(s => {
                      const isSelected = form.status === s;
                      const color = s === "completed" ? "var(--green)" : s === "in progress" ? "var(--amber)" : "var(--text3)";
                      const bg    = s === "completed" ? "rgba(16,185,129,0.14)" : s === "in progress" ? "var(--amber-dim)" : "var(--bg4)";
                      return (
                        <button
                          key={s}
                          onClick={() => setStatus(s)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "var(--space-1)",
                            padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-sm)",
                            border: isSelected ? `1px solid ${color}` : "1px solid var(--border)",
                            background: isSelected ? bg : "transparent",
                            color: isSelected ? color : "var(--text3)",
                            cursor: "pointer", fontSize: "var(--text-label)", fontWeight: isSelected ? 600 : 400,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {s === "completed"   && <IcoCheck />}
                          {s === "in progress" && <IcoPlay />}
                          {s === "not started" && <IcoDash />}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Foreman + Dates row */}
                <div className="gap-sp3 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="form-group">
                    <label className="form-label">Assigned Foreman</label>
                    {foremen.length > 0 ? (
                      <select
                        className="form-select"
                        value={form.assignedForeman || ""}
                        onChange={e => setForm(f => ({ ...f, assignedForeman: e.target.value }))}
                      >
                        <option value="">— None —</option>
                        {foremen.map(e => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        value={form.assignedForeman || ""}
                        onChange={e => setForm(f => ({ ...f, assignedForeman: e.target.value }))}
                        placeholder="Foreman name"
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date" className="form-input"
                      value={form.startDate || ""}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  {(form.status === "completed" || form.completedDate) && (
                    <div className="form-group">
                      <label className="form-label">Completed Date</label>
                      <input
                        type="date" className="form-input"
                        value={form.completedDate || ""}
                        onChange={e => setForm(f => ({ ...f, completedDate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: 56 }}
                    value={form.notes || ""}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Field notes, issues, observations…"
                  />
                </div>

                {/* Actions */}
                <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpandedKey(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={save}>
                    Save Phase
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
