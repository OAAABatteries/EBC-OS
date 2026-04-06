// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PunchTab — Foreman-facing punch list (field mobile)
//  Props: { punchItems, setPunchItems, areas, employees,
//           projectId, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, CheckCircle, Clock, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { FieldCard } from "../../components/field/FieldCard";
import { FieldButton } from "../../components/field/FieldButton";
import { FieldInput } from "../../components/field/FieldInput";
import { FieldSelect } from "../../components/field/FieldSelect";
import { PhotoCapture } from "../../components/field/PhotoCapture";

const PRIORITY_BADGE = { high: "badge-red", medium: "badge-amber", low: "badge-muted" };
const STATUS_BADGE = { open: "badge-red", "in-progress": "badge-amber", complete: "badge-green" };
const STATUS_FLOW = { open: "in-progress", "in-progress": "complete" };

export function PunchTab({ punchItems = [], setPunchItems, areas = [], employees = [], projectId, foreman, t }) {
  const tr = t || ((k) => k);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form
  const [formDesc, setFormDesc] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formAssignee, setFormAssignee] = useState("");
  const [formPhotos, setFormPhotos] = useState([]);

  const projectAreas = useMemo(
    () => areas.filter((a) => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  const projectItems = useMemo(
    () => punchItems.filter((p) => String(p.projectId) === String(projectId) && p.status !== "deleted"),
    [punchItems, projectId]
  );

  const openCount = useMemo(
    () => projectItems.filter((p) => p.status === "open").length,
    [projectItems]
  );

  const filtered = useMemo(() => {
    let list = projectItems;
    if (filterStatus !== "all") list = list.filter((p) => p.status === filterStatus);
    if (filterArea !== "all") list = list.filter((p) => (p.location || "").includes(filterArea));
    return list.sort((a, b) => {
      const po = { high: 0, medium: 1, low: 2 };
      return (po[a.priority] ?? 9) - (po[b.priority] ?? 9);
    });
  }, [projectItems, filterStatus, filterArea]);

  const advanceStatus = (item) => {
    const next = STATUS_FLOW[item.status];
    if (!next) return;
    setPunchItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, status: next, ...(next === "complete" ? { completedAt: new Date().toISOString() } : {}) }
          : p
      )
    );
  };

  const resetForm = () => {
    setFormDesc("");
    setFormArea("");
    setFormPriority("medium");
    setFormAssignee("");
    setFormPhotos([]);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (item) => {
    setFormDesc(item.description || "");
    setFormArea("");
    setFormPriority(item.priority || "medium");
    setFormAssignee(item.assignedTo || "");
    setFormPhotos(item.photos || []);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (item) => {
    if (!window.confirm(tr("Delete this punch item?"))) return;
    setPunchItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: foreman?.name || "Foreman" } : p));
  };

  const handleAdd = () => {
    if (!formDesc.trim()) return;
    const areaObj = projectAreas.find((a) => a.id === formArea);

    if (editingId) {
      const location = areaObj ? `${areaObj.name}, Floor ${areaObj.floor}, Zone ${areaObj.zone}` : undefined;
      setPunchItems((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                description: formDesc.trim(),
                ...(location !== undefined ? { location } : {}),
                assignedTo: formAssignee || null,
                priority: formPriority,
                photos: formPhotos,
              }
            : p
        )
      );
      resetForm();
      return;
    }

    const newItem = {
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      description: formDesc.trim(),
      location: areaObj ? `${areaObj.name}, Floor ${areaObj.floor}, Zone ${areaObj.zone}` : "",
      assignedTo: formAssignee || null,
      priority: formPriority,
      status: "open",
      photos: formPhotos,
      createdAt: new Date().toISOString(),
      completedAt: null,
      signedOffBy: null,
      signedOffAt: null,
    };
    setPunchItems((prev) => [...prev, newItem]);
    resetForm();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Open badge + Add button ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: "var(--text-lg, 16px)", color: "var(--text)" }}>{tr("Punch List")}</span>
          {openCount > 0 && (
            <span className="badge badge-red" style={{ fontSize: "var(--text-sm, 12px)" }}>
              {openCount} {tr("open")}
            </span>
          )}
        </div>
        <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t} style={{ minHeight: 44 }}>
          <Plus size={16} style={{ marginRight: 4 }} />
          {tr("Add")}
        </FieldButton>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <FieldSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} t={t}>
            <option value="all">{tr("All Status")}</option>
            <option value="open">{tr("Open")}</option>
            <option value="in-progress">{tr("In Progress")}</option>
            <option value="complete">{tr("Complete")}</option>
          </FieldSelect>
        </div>
        <div style={{ flex: 1 }}>
          <FieldSelect value={filterArea} onChange={(e) => setFilterArea(e.target.value)} t={t}>
            <option value="all">{tr("All Areas")}</option>
            {projectAreas.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </FieldSelect>
        </div>
      </div>

      {/* ── Add Form (mobile-optimized) ── */}
      {showForm && (
        <FieldCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FieldInput label={tr("Description")} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} t={t} />
            <FieldSelect label={tr("Area")} value={formArea} onChange={(e) => setFormArea(e.target.value)} t={t}>
              <option value="">{tr("Select Area")}</option>
              {projectAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </FieldSelect>
            <FieldSelect label={tr("Priority")} value={formPriority} onChange={(e) => setFormPriority(e.target.value)} t={t}>
              <option value="high">{tr("High")}</option>
              <option value="medium">{tr("Medium")}</option>
              <option value="low">{tr("Low")}</option>
            </FieldSelect>
            <FieldSelect label={tr("Assign To")} value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} t={t}>
              <option value="">{tr("Unassigned")}</option>
              {employees.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </FieldSelect>
            <PhotoCapture photos={formPhotos} onPhotos={setFormPhotos} t={t} />
            <div style={{ display: "flex", gap: 8 }}>
              <FieldButton variant="ghost" onClick={resetForm} t={t} style={{ flex: 1, minHeight: 48 }}>{tr("Cancel")}</FieldButton>
              <FieldButton onClick={handleAdd} disabled={!formDesc.trim()} t={t} style={{ flex: 1, minHeight: 48 }}>{editingId ? tr("Update") : tr("Save")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Items (large touch targets) ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
          <CheckCircle size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-base, 14px)" }}>{tr("No punch items")}</div>
        </div>
      )}

      {filtered.map((item) => (
        <FieldCard key={item.id}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {/* Tap to advance */}
            {item.status !== "complete" ? (
              <button
                onClick={() => advanceStatus(item)}
                style={{
                  flex: "0 0 48px", height: 48, borderRadius: 8,
                  border: "2px solid var(--border2)", background: "var(--bg3)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: item.status === "open" ? "var(--red)" : "var(--amber)",
                }}
              >
                {item.status === "open" ? <Clock size={20} /> : <AlertTriangle size={20} />}
              </button>
            ) : (
              <div style={{
                flex: "0 0 48px", height: 48, borderRadius: 8,
                background: "var(--green-dim)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle size={20} style={{ color: "var(--green)" }} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--text-base, 14px)", color: "var(--text)", lineHeight: 1.3 }}>
                {item.description}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <span className={`badge ${PRIORITY_BADGE[item.priority] || "badge-muted"}`}>{tr(item.priority)}</span>
                <span className={`badge ${STATUS_BADGE[item.status] || "badge-muted"}`}>{tr(item.status)}</span>
              </div>
              <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginTop: 4 }}>
                {item.location && <span>{item.location} &middot; </span>}
                {item.assignedTo || tr("Unassigned")}
              </div>

              {/* Photo thumbnails */}
              {item.photos && item.photos.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  {item.photos.slice(0, 4).map((p, i) => (
                    <div key={i} style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden" }}>
                      <img src={p.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                  {item.photos.length > 4 && (
                    <div style={{
                      width: 36, height: 36, borderRadius: 4, background: "var(--bg3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "var(--text-xs, 11px)", color: "var(--text2)", fontWeight: 700,
                    }}>
                      +{item.photos.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Edit / Delete */}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => startEdit(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                    fontSize: "var(--text-sm, 12px)", background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: 6, color: "var(--text2)", cursor: "pointer", minHeight: 36,
                  }}
                >
                  <Pencil size={14} /> {tr("Edit")}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                    fontSize: "var(--text-sm, 12px)", background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: 6, color: "var(--red)", cursor: "pointer", minHeight: 36,
                  }}
                >
                  <Trash2 size={14} /> {tr("Delete")}
                </button>
              </div>
            </div>
          </div>
        </FieldCard>
      ))}
    </div>
  );
}
