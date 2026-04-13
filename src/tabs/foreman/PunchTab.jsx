// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PunchTab — Foreman-facing punch list (field mobile)
//  Props: { punchItems, setPunchItems, areas, employees,
//           projectId, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, CheckCircle, Clock, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { queueMutation } from "../../lib/offlineQueue";
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
    const now = new Date().toISOString();
    setPunchItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, status: next,
              ...(next === "complete" ? { completedAt: now } : {}),
              auditTrail: [...(p.auditTrail || []), { action: "status_changed", from: item.status, to: next, actor: foreman?.name || "Foreman", at: now }]
            }
          : p
      )
    );
    queueMutation("punch_items", "update", { status: next, ...(next === "complete" ? { completedAt: now } : {}) }, { column: "id", value: item.id });
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
    queueMutation("punch_items", "update", { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: foreman?.name || "Foreman" }, { column: "id", value: item.id });
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
      queueMutation("punch_items", "update", {
        description: formDesc.trim(), ...(location !== undefined ? { location } : {}),
        assignedTo: formAssignee || null, priority: formPriority, photos: formPhotos,
      }, { column: "id", value: editingId });
      resetForm();
      return;
    }

    const now = new Date().toISOString();
    const newItem = {
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      description: formDesc.trim(),
      location: areaObj ? `${areaObj.name}, Floor ${areaObj.floor}, Zone ${areaObj.zone}` : "",
      assignedTo: formAssignee || null,
      priority: formPriority,
      status: "open",
      photos: formPhotos,
      createdAt: now,
      completedAt: null,
      signedOffBy: null,
      signedOffAt: null,
      auditTrail: [{ action: "created", actor: foreman?.name || "Foreman", at: now }],
    };
    setPunchItems((prev) => [...prev, newItem]);
    queueMutation("punch_items", "insert", newItem);
    resetForm();
  };

  return (
    <div className="flex-col gap-sp3">
      {/* ── Open badge + Add button ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="flex gap-sp2">
          <span className="fw-bold c-text" style={{ fontSize: "var(--text-lg, 16px)" }}>{tr("Punch List")}</span>
          {openCount > 0 && (
            <span className="badge badge-red fs-tab">
              {openCount} {tr("open")}
            </span>
          )}
        </div>
        <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t} style={{ minHeight: 44 }}>
          <Plus size={16} className="mr-sp1" />
          {tr("Add")}
        </FieldButton>
      </div>

      {/* ── Filters ── */}
      <div className="gap-sp2" style={{ display: "flex" }}>
        <div className="flex-1">
          <FieldSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} t={t}>
            <option value="all">{tr("All Status")}</option>
            <option value="open">{tr("Open")}</option>
            <option value="in-progress">{tr("In Progress")}</option>
            <option value="complete">{tr("Complete")}</option>
          </FieldSelect>
        </div>
        <div className="flex-1">
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
          <div className="flex-col gap-sp3">
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
            <PhotoCapture photos={formPhotos} onPhotos={setFormPhotos} t={t} uploadContext={{ context: "punch", projectId }} />
            <div className="gap-sp2" style={{ display: "flex" }}>
              <FieldButton variant="ghost" onClick={resetForm} t={t} className="flex-1" style={{ minHeight: 48 }}>{tr("Cancel")}</FieldButton>
              <FieldButton onClick={handleAdd} disabled={!formDesc.trim()} t={t} className="flex-1" style={{ minHeight: 48 }}>{editingId ? tr("Update") : tr("Save")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Items (large touch targets) ── */}
      {filtered.length === 0 && (
        <div className="p-sp8 c-text3 text-center">
          <CheckCircle size={36} className="mb-sp2" style={{ opacity: 0.4 }} />
          <div className="fs-label">{tr("No punch items")}</div>
        </div>
      )}

      {filtered.map((item) => (
        <FieldCard key={item.id}>
          <div className="items-start gap-sp3" style={{ display: "flex" }}>
            {/* Tap to advance */}
            {item.status !== "complete" ? (
              <button
                onClick={() => advanceStatus(item)}
                style={{
                  flex: "0 0 48px", height: 48, borderRadius: "var(--radius-control)",
                  border: "2px solid var(--border2)", background: "var(--bg3)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: item.status === "open" ? "var(--red)" : "var(--amber)",
                }}
              >
                {item.status === "open" ? <Clock size={20} /> : <AlertTriangle size={20} />}
              </button>
            ) : (
              <div className="flex rounded-control justify-center" style={{ flex: "0 0 48px", height: 48,
                background: "var(--green-dim)" }}>
                <CheckCircle size={20} className="c-green" />
              </div>
            )}

            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="fs-label fw-semi c-text" style={{ lineHeight: 1.3 }}>
                {item.description}
              </div>
              <div className="mt-sp2 gap-sp2 flex-wrap" style={{ display: "flex" }}>
                <span className={`badge ${PRIORITY_BADGE[item.priority] || "badge-muted"}`}>{tr(item.priority)}</span>
                <span className={`badge ${STATUS_BADGE[item.status] || "badge-muted"}`}>{tr(item.status)}</span>
              </div>
              <div className="fs-tab mt-sp1 c-text2">
                {item.location && <span>{item.location} &middot; </span>}
                {item.assignedTo || tr("Unassigned")}
              </div>

              {/* Photo thumbnails */}
              {item.photos && item.photos.length > 0 && (
                <div className="mt-sp2 gap-sp1" style={{ display: "flex" }}>
                  {item.photos.slice(0, 4).map((p, i) => (
                    <div key={i} className="rounded-control overflow-hidden" style={{ width: 36, height: 36 }}>
                      <img src={p.data} alt="" className="h-full w-full" style={{ objectFit: "cover" }} />
                    </div>
                  ))}
                  {item.photos.length > 4 && (
                    <div className="flex rounded-control fw-bold bg-bg3 justify-center c-text2" style={{ width: 36, height: 36,
                      fontSize: "var(--text-xs, 11px)" }}>
                      +{item.photos.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Edit / Delete */}
              <div className="mt-sp2 gap-sp2" style={{ display: "flex" }}>
                <button
                  onClick={() => startEdit(item)}
                  className="flex rounded-control fs-tab bg-bg3 c-text2 gap-sp1 cursor-pointer" style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border)", minHeight: 36 }}
                >
                  <Pencil size={14} /> {tr("Edit")}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="flex rounded-control fs-tab bg-bg3 gap-sp1 c-red cursor-pointer" style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border)", minHeight: 36 }}
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
