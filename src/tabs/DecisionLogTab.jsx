// ═══════════════════════════════════════════════════════════════
//  EBC-OS · DecisionLogTab — PM-facing decision/communication log
//  Props: { decisionLog, setDecisionLog, projectId, employees, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, Lock, FileText, Filter, Pencil, Trash2 } from "lucide-react";
import { FieldCard } from "../components/field/FieldCard";
import { FieldButton } from "../components/field/FieldButton";
import { FieldInput } from "../components/field/FieldInput";
import { FieldSelect } from "../components/field/FieldSelect";

const TYPE_BADGE = {
  "gc-directive": "badge-red",
  decision: "badge-blue",
  commitment: "badge-amber",
  verbal: "badge-muted",
};

const TYPE_LABELS = {
  "gc-directive": "GC Directive",
  decision: "Decision",
  commitment: "Commitment",
  verbal: "Verbal",
};

const IMMUTABLE_HOURS = 24;

function isImmutable(recordedAt) {
  if (!recordedAt) return false;
  const recorded = new Date(recordedAt).getTime();
  const now = Date.now();
  return now - recorded > IMMUTABLE_HOURS * 60 * 60 * 1000;
}

export function DecisionLogTab({ decisionLog = [], setDecisionLog, projectId, employees = [], t }) {
  const tr = t || ((k) => k);

  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formType, setFormType] = useState("decision");
  const [formDesc, setFormDesc] = useState("");
  const [formAttributed, setFormAttributed] = useState("");
  const [formRecordedBy, setFormRecordedBy] = useState("");

  const projectEntries = useMemo(
    () => decisionLog.filter((d) => String(d.projectId) === String(projectId)),
    [decisionLog, projectId]
  );

  const filtered = useMemo(() => {
    let list = projectEntries;
    if (filterType !== "all") list = list.filter((d) => d.type === filterType);
    return list.sort((a, b) => (b.recordedAt || b.date || "").localeCompare(a.recordedAt || a.date || ""));
  }, [projectEntries, filterType]);

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormType("decision");
    setFormDesc("");
    setFormAttributed("");
    setFormRecordedBy("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (entry) => {
    setFormDate(entry.date || new Date().toISOString().slice(0, 10));
    setFormType(entry.type || "decision");
    setFormDesc(entry.description || "");
    setFormAttributed(entry.attributedTo || "");
    setFormRecordedBy(entry.recordedBy || "");
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (entry) => {
    if (isImmutable(entry.recordedAt)) {
      window.alert(tr("This entry is locked (older than 24 hours) and cannot be deleted."));
      return;
    }
    if (!window.confirm(tr("Delete this log entry?"))) return;
    setDecisionLog((prev) => prev.filter((d) => d.id !== entry.id));
  };

  const handleAdd = () => {
    if (!formDesc.trim()) return;

    if (editingId) {
      setDecisionLog((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                date: formDate,
                type: formType,
                description: formDesc.trim(),
                attributedTo: formAttributed.trim(),
                recordedBy: formRecordedBy.trim(),
              }
            : d
        )
      );
      resetForm();
      return;
    }

    const newEntry = {
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      date: formDate,
      type: formType,
      description: formDesc.trim(),
      attributedTo: formAttributed.trim(),
      recordedBy: formRecordedBy.trim(),
      recordedAt: new Date().toISOString(),
    };
    setDecisionLog((prev) => [...prev, newEntry]);
    resetForm();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* ── Header + Filters ── */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 140px" }}>
          <FieldSelect label={tr("Type")} value={filterType} onChange={(e) => setFilterType(e.target.value)} t={t}>
            <option value="all">{tr("All Types")}</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{tr(v)}</option>
            ))}
          </FieldSelect>
        </div>
        <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t}>
          <Plus size={14} style={{ marginRight: "var(--space-1)" }} />
          {tr("Add Entry")}
        </FieldButton>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <FieldCard>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{editingId ? tr("Edit Log Entry") : tr("New Log Entry")}</div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <FieldInput label={tr("Date")} type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} t={t} />
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <FieldSelect label={tr("Type")} value={formType} onChange={(e) => setFormType(e.target.value)} t={t}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{tr(v)}</option>
                  ))}
                </FieldSelect>
              </div>
            </div>
            <FieldInput label={tr("Description")} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} t={t} />
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}>
                <FieldInput label={tr("Attributed To")} value={formAttributed} onChange={(e) => setFormAttributed(e.target.value)} placeholder={tr("Who said/decided this")} t={t} />
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <FieldInput label={tr("Recorded By")} value={formRecordedBy} onChange={(e) => setFormRecordedBy(e.target.value)} placeholder={tr("Who documented it")} t={t} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <FieldButton variant="ghost" onClick={resetForm} t={t}>{tr("Cancel")}</FieldButton>
              <FieldButton onClick={handleAdd} disabled={!formDesc.trim()} t={t}>{editingId ? tr("Update") : tr("Save")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Entries ── */}
      {filtered.length === 0 && (
        <FieldCard>
          <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text3)" }}>
            <FileText size={32} style={{ marginBottom: "var(--space-2)", opacity: 0.4 }} />
            <div>{tr("No log entries found")}</div>
          </div>
        </FieldCard>
      )}

      {filtered.map((entry) => {
        const locked = isImmutable(entry.recordedAt);
        return (
          <FieldCard key={entry.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              {/* Lock / type icon */}
              <div style={{ flex: "0 0 auto", paddingTop: "var(--space-1)" }}>
                {locked ? (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Lock size={12} style={{ color: "var(--text3)" }} />
                  </div>
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--blue-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={12} style={{ color: "var(--blue)" }} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span className={`badge ${TYPE_BADGE[entry.type] || "badge-muted"}`}>
                    {tr(TYPE_LABELS[entry.type] || entry.type)}
                  </span>
                  <span style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)" }}>{entry.date}</span>
                  {locked && <span style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text3)" }}>{tr("Locked")}</span>}
                </div>
                <div style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-base, 14px)", color: "var(--text)", marginTop: "var(--space-1)" }}>
                  {entry.description}
                </div>
                <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginTop: "var(--space-1)" }}>
                  {entry.attributedTo && <span>{tr("From")}: {entry.attributedTo} &middot; </span>}
                  {entry.recordedBy && <span>{tr("Recorded by")}: {entry.recordedBy}</span>}
                  {entry.recordedAt && (
                    <span> &middot; {new Date(entry.recordedAt).toLocaleString()}</span>
                  )}
                </div>

                {/* Edit / Delete — only for mutable entries */}
                {!locked && (
                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                    <button
                      onClick={() => startEdit(entry)}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "var(--space-1) var(--space-3)",
                        fontSize: "var(--text-sm, 12px)", background: "var(--bg3)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm, 4px)", color: "var(--text2)", cursor: "pointer",
                      }}
                    >
                      <Pencil size={12} /> {tr("Edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(entry)}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "var(--space-1) var(--space-3)",
                        fontSize: "var(--text-sm, 12px)", background: "var(--bg3)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm, 4px)", color: "var(--red)", cursor: "pointer",
                      }}
                    >
                      <Trash2 size={12} /> {tr("Delete")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </FieldCard>
        );
      })}
    </div>
  );
}
