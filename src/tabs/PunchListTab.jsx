// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PunchListTab — PM-facing punch list management
//  Props: { punchItems, setPunchItems, areas, employees, projectId, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { Plus, AlertTriangle, CheckCircle, Clock, Filter, Pencil, Trash2, Lock, Upload } from "lucide-react";
import { FieldCard } from "../components/field/FieldCard";
import { FieldButton } from "../components/field/FieldButton";
import { FieldInput } from "../components/field/FieldInput";
import { FieldSelect } from "../components/field/FieldSelect";
import { StatTile } from "../components/field/StatTile";
import { PhotoCapture } from "../components/field/PhotoCapture";
import { ImportReviewModal } from "../components/ImportReviewModal.jsx";
import { parseGcPunchList } from "../utils/gcDocParser.js";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_BADGE = { high: "badge-red", medium: "badge-amber", low: "badge-muted" };
const STATUS_BADGE = { open: "badge-red", "in-progress": "badge-amber", complete: "badge-green" };
const STATUS_FLOW = { open: "in-progress", "in-progress": "complete" };

export function PunchListTab({ punchItems = [], setPunchItems, areas = [], employees = [], projectId, t }) {
  const tr = t || ((k) => k);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [signOffId, setSignOffId] = useState(null);
  const [signOffName, setSignOffName] = useState("");

  // Form state
  const [formDesc, setFormDesc] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formAssignee, setFormAssignee] = useState("");
  const [formPhotos, setFormPhotos] = useState([]);
  const [showImport, setShowImport] = useState(false);

  const projectAreas = useMemo(
    () => areas.filter((a) => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  const projectItems = useMemo(
    () => punchItems.filter((p) => String(p.projectId) === String(projectId)),
    [punchItems, projectId]
  );

  const filtered = useMemo(() => {
    let list = projectItems;
    if (filterStatus !== "all") list = list.filter((p) => p.status === filterStatus);
    if (filterArea !== "all") list = list.filter((p) => (p.location || "").includes(filterArea));
    return list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
  }, [projectItems, filterStatus, filterArea]);

  // Summary
  const stats = useMemo(() => {
    const total = projectItems.length;
    const open = projectItems.filter((p) => p.status === "open").length;
    const inProg = projectItems.filter((p) => p.status === "in-progress").length;
    const complete = projectItems.filter((p) => p.status === "complete").length;
    const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, open, inProg, complete, pct };
  }, [projectItems]);

  const advanceStatus = (item) => {
    const next = STATUS_FLOW[item.status];
    if (!next) return;
    if (next === "complete") {
      // Prompt for sign-off instead of immediately completing
      setSignOffId(item.id);
      setSignOffName("");
      return;
    }
    setPunchItems((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, status: next } : p
      )
    );
  };

  const confirmSignOff = (itemId) => {
    if (!signOffName.trim()) return;
    setPunchItems((prev) =>
      prev.map((p) =>
        p.id === itemId
          ? { ...p, status: "complete", completedAt: new Date().toISOString(), signedOffBy: signOffName.trim(), signedOffAt: new Date().toISOString() }
          : p
      )
    );
    setSignOffId(null);
    setSignOffName("");
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

  const handlePunchImport = useCallback((selectedItems) => {
    const now = new Date().toISOString();
    const newItems = selectedItems.map((item) => ({
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      description: item.description,
      location: item.location,
      assignedTo: null,
      priority: item.priority,
      status: "open",
      photos: [],
      createdAt: now,
      completedAt: null,
    }));
    setPunchItems((prev) => [...prev, ...newItems]);
  }, [projectId, setPunchItems]);

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
    setPunchItems((prev) => prev.filter((p) => p.id !== item.id));
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
    <div className="flex-col gap-sp4">
      {/* ── Summary Stats ── */}
      <div className="gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))" }}>
        <StatTile label={tr("Total")} value={stats.total} t={t} />
        <StatTile label={tr("Open")} value={stats.open} color="var(--red)" t={t} />
        <StatTile label={tr("In Progress")} value={stats.inProg} color="var(--amber)" t={t} />
        <StatTile label={tr("Complete")} value={stats.complete} color="var(--green)" t={t} />
        <StatTile label={tr("Resolved %")} value={`${stats.pct}%`} color="var(--blue)" t={t} />
      </div>

      {/* ── Filters + Add ── */}
      <div className="gap-sp2 flex-wrap" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 120px" }}>
          <FieldSelect label={tr("Status")} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} t={t}>
            <option value="all">{tr("All")}</option>
            <option value="open">{tr("Open")}</option>
            <option value="in-progress">{tr("In Progress")}</option>
            <option value="complete">{tr("Complete")}</option>
          </FieldSelect>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <FieldSelect label={tr("Area")} value={filterArea} onChange={(e) => setFilterArea(e.target.value)} t={t}>
            <option value="all">{tr("All Areas")}</option>
            {projectAreas.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </FieldSelect>
        </div>
        <div className="flex gap-8">
          <FieldButton onClick={() => setShowImport(true)} t={t}>
            <Upload size={14} className="mr-sp1" />
            {tr("Import GC Punch")}
          </FieldButton>
          <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t}>
            <Plus size={14} className="mr-sp1" />
            {tr("Add Punch Item")}
          </FieldButton>
        </div>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <FieldCard>
          <div className="flex-col gap-sp3">
            <div className="fs-label fw-bold c-text">{editingId ? tr("Edit Punch Item") : tr("New Punch Item")}</div>
            <FieldInput label={tr("Description")} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} t={t} />
            <FieldSelect label={tr("Area")} value={formArea} onChange={(e) => setFormArea(e.target.value)} t={t}>
              <option value="">{tr("Select Area")}</option>
              {projectAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.name} (F{a.floor} Z{a.zone})</option>
              ))}
            </FieldSelect>
            <FieldSelect label={tr("Priority")} value={formPriority} onChange={(e) => setFormPriority(e.target.value)} t={t}>
              <option value="high">{tr("High")}</option>
              <option value="medium">{tr("Medium")}</option>
              <option value="low">{tr("Low")}</option>
            </FieldSelect>
            <FieldSelect label={tr("Assigned To")} value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} t={t}>
              <option value="">{tr("Unassigned")}</option>
              {employees.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </FieldSelect>
            <PhotoCapture photos={formPhotos} onPhotos={setFormPhotos} t={t} />
            <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
              <FieldButton variant="ghost" onClick={resetForm} t={t}>{tr("Cancel")}</FieldButton>
              <FieldButton onClick={handleAdd} disabled={!formDesc.trim()} t={t}>{editingId ? tr("Update") : tr("Save")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Punch Items ── */}
      {filtered.length === 0 && (
        <FieldCard>
          <div className="p-sp6 c-text3 text-center">
            <CheckCircle size={32} className="mb-sp2" style={{ opacity: 0.4 }} />
            <div>{tr("No punch items found")}</div>
          </div>
        </FieldCard>
      )}

      {filtered.map((item) => (
        <FieldCard key={item.id}>
          <div className="items-start gap-sp2" style={{ display: "flex" }}>
            {/* Status advance button */}
            <div style={{ flex: "0 0 auto", paddingTop: "var(--space-1)" }}>
              {item.status !== "complete" ? (
                <button
                  onClick={() => advanceStatus(item)}
                  title={tr(`Advance to ${STATUS_FLOW[item.status]}`)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border2)",
                    background: "var(--bg3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    color: item.status === "open" ? "var(--red)" : "var(--amber)",
                  }}
                >
                  {item.status === "open" ? <Clock size={14} /> : <AlertTriangle size={14} />}
                </button>
              ) : (
                <div className="flex justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-dim)" }}>
                  <CheckCircle size={14} className="c-green" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="fs-label fw-semi c-text">{item.description}</div>
              <div className="mt-sp1 gap-sp2 flex-wrap" style={{ display: "flex" }}>
                <span className={`badge ${PRIORITY_BADGE[item.priority] || "badge-muted"}`}>{tr(item.priority)}</span>
                <span className={`badge ${STATUS_BADGE[item.status] || "badge-muted"}`}>{tr(item.status)}</span>
              </div>
              <div className="fs-tab mt-sp1 c-text2">
                {item.location && <span>{item.location} &middot; </span>}
                {item.assignedTo || tr("Unassigned")} &middot; {new Date(item.createdAt).toLocaleDateString()}
              </div>

              {/* Photos */}
              {item.photos && item.photos.length > 0 && (
                <div className="mt-sp2 gap-sp1 flex-wrap" style={{ display: "flex" }}>
                  {item.photos.map((p, i) => (
                    <div key={i} className="overflow-hidden" style={{ width: 40, height: 40, borderRadius: "var(--radius-sm, 4px)" }}>
                      <img src={p.data} alt={p.name || "photo"} className="h-full w-full" style={{ objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Sign-off inline form */}
              {signOffId === item.id && (
                <div className="mt-sp2 p-sp2 bg-bg3" style={{ borderRadius: "var(--radius-sm, 4px)", border: "1px solid var(--border)" }}>
                  <div className="fs-tab fw-semi mb-sp2 c-text">{tr("Sign Off to Complete")}</div>
                  <div className="gap-sp2" style={{ display: "flex", alignItems: "flex-end" }}>
                    <div className="flex-1">
                      <FieldInput label={tr("Signed Off By")} value={signOffName} onChange={(e) => setSignOffName(e.target.value)} placeholder={tr("Name of verifier")} t={t} />
                    </div>
                    <FieldButton onClick={() => confirmSignOff(item.id)} disabled={!signOffName.trim()} t={t}>{tr("Complete")}</FieldButton>
                    <FieldButton variant="ghost" onClick={() => { setSignOffId(null); setSignOffName(""); }} t={t}>{tr("Cancel")}</FieldButton>
                  </div>
                </div>
              )}

              {/* Sign-off info on completed items */}
              {item.status === "complete" && item.signedOffBy && (
                <div className="flex fs-tab mt-sp2 c-green gap-sp1">
                  <Lock size={10} />
                  {tr("Signed off by")} {item.signedOffBy} &middot; {new Date(item.signedOffAt).toLocaleDateString()}
                </div>
              )}

              {/* Edit / Delete */}
              <div className="mt-sp2 gap-sp2" style={{ display: "flex" }}>
                <button
                  onClick={() => startEdit(item)}
                  className="flex fs-tab bg-bg3 c-text2 gap-sp1 cursor-pointer" style={{ padding: "var(--space-1) var(--space-3)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm, 4px)" }}
                >
                  <Pencil size={12} /> {tr("Edit")}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="flex fs-tab bg-bg3 gap-sp1 c-red cursor-pointer" style={{ padding: "var(--space-1) var(--space-3)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm, 4px)" }}
                >
                  <Trash2 size={12} /> {tr("Delete")}
                </button>
              </div>
            </div>
          </div>
        </FieldCard>
      ))}
      {/* GC Punch Import Modal */}
      <ImportReviewModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import GC Punch List"
        loadingMessage="Scanning for EBC items..."
        emptyMessage="No items for Eagles Brothers found. Check that the document mentions EBC or your trade scopes."
        parseText={(text) => parseGcPunchList(text, projectItems)}
        onConfirm={handlePunchImport}
        renderItem={(item, i, update) => (
          <div>
            <div className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
              <input className="form-input flex-1 fs-label" value={item.description}
                onChange={(e) => update({ description: e.target.value })} />
            </div>
            <div className="flex gap-8" style={{ alignItems: "center" }}>
              <input className="form-input fs-label" value={item.location} placeholder="Location"
                onChange={(e) => update({ location: e.target.value })}
                style={{ width: 140 }} />
              <select className="form-input fs-label" value={item.priority}
                onChange={(e) => update({ priority: e.target.value })}
                style={{ width: 100 }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {item.isDuplicate && (
                <span className="text-xs" style={{ color: "var(--warning, #f5a623)" }}>
                  Possible duplicate
                </span>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
