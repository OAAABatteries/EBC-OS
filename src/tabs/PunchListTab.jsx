// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PunchListTab — PM-facing punch list management
//  Props: { punchItems, setPunchItems, areas, employees, projectId, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, AlertTriangle, CheckCircle, Clock, Filter, Pencil, Trash2, Lock } from "lucide-react";
import { FieldCard } from "../components/field/FieldCard";
import { FieldButton } from "../components/field/FieldButton";
import { FieldInput } from "../components/field/FieldInput";
import { FieldSelect } from "../components/field/FieldSelect";
import { StatTile } from "../components/field/StatTile";
import { PhotoCapture } from "../components/field/PhotoCapture";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* ── Summary Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "var(--space-2)" }}>
        <StatTile label={tr("Total")} value={stats.total} t={t} />
        <StatTile label={tr("Open")} value={stats.open} color="var(--red)" t={t} />
        <StatTile label={tr("In Progress")} value={stats.inProg} color="var(--amber)" t={t} />
        <StatTile label={tr("Complete")} value={stats.complete} color="var(--green)" t={t} />
        <StatTile label={tr("Resolved %")} value={`${stats.pct}%`} color="var(--blue)" t={t} />
      </div>

      {/* ── Filters + Add ── */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "flex-end" }}>
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
        <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t}>
          <Plus size={14} style={{ marginRight: "var(--space-1)" }} />
          {tr("Add Punch Item")}
        </FieldButton>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <FieldCard>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{editingId ? tr("Edit Punch Item") : tr("New Punch Item")}</div>
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
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <FieldButton variant="ghost" onClick={resetForm} t={t}>{tr("Cancel")}</FieldButton>
              <FieldButton onClick={handleAdd} disabled={!formDesc.trim()} t={t}>{editingId ? tr("Update") : tr("Save")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Punch Items ── */}
      {filtered.length === 0 && (
        <FieldCard>
          <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text3)" }}>
            <CheckCircle size={32} style={{ marginBottom: "var(--space-2)", opacity: 0.4 }} />
            <div>{tr("No punch items found")}</div>
          </div>
        </FieldCard>
      )}

      {filtered.map((item) => (
        <FieldCard key={item.id}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={14} style={{ color: "var(--green)" }} />
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{item.description}</div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-1)" }}>
                <span className={`badge ${PRIORITY_BADGE[item.priority] || "badge-muted"}`}>{tr(item.priority)}</span>
                <span className={`badge ${STATUS_BADGE[item.status] || "badge-muted"}`}>{tr(item.status)}</span>
              </div>
              <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginTop: "var(--space-1)" }}>
                {item.location && <span>{item.location} &middot; </span>}
                {item.assignedTo || tr("Unassigned")} &middot; {new Date(item.createdAt).toLocaleDateString()}
              </div>

              {/* Photos */}
              {item.photos && item.photos.length > 0 && (
                <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                  {item.photos.map((p, i) => (
                    <div key={i} style={{ width: 40, height: 40, borderRadius: "var(--radius-sm, 4px)", overflow: "hidden" }}>
                      <img src={p.data} alt={p.name || "photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Sign-off inline form */}
              {signOffId === item.id && (
                <div style={{ marginTop: "var(--space-2)", padding: "var(--space-2)", background: "var(--bg3)", borderRadius: "var(--radius-sm, 4px)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "var(--text-sm, 12px)", fontWeight: "var(--weight-semi)", color: "var(--text)", marginBottom: "var(--space-2)" }}>{tr("Sign Off to Complete")}</div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <FieldInput label={tr("Signed Off By")} value={signOffName} onChange={(e) => setSignOffName(e.target.value)} placeholder={tr("Name of verifier")} t={t} />
                    </div>
                    <FieldButton onClick={() => confirmSignOff(item.id)} disabled={!signOffName.trim()} t={t}>{tr("Complete")}</FieldButton>
                    <FieldButton variant="ghost" onClick={() => { setSignOffId(null); setSignOffName(""); }} t={t}>{tr("Cancel")}</FieldButton>
                  </div>
                </div>
              )}

              {/* Sign-off info on completed items */}
              {item.status === "complete" && item.signedOffBy && (
                <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm, 12px)", color: "var(--green)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                  <Lock size={10} />
                  {tr("Signed off by")} {item.signedOffBy} &middot; {new Date(item.signedOffAt).toLocaleDateString()}
                </div>
              )}

              {/* Edit / Delete */}
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button
                  onClick={() => startEdit(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "var(--space-1) var(--space-3)",
                    fontSize: "var(--text-sm, 12px)", background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm, 4px)", color: "var(--text2)", cursor: "pointer",
                  }}
                >
                  <Pencil size={12} /> {tr("Edit")}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "var(--space-1) var(--space-3)",
                    fontSize: "var(--text-sm, 12px)", background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm, 4px)", color: "var(--red)", cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} /> {tr("Delete")}
                </button>
              </div>
            </div>
          </div>
        </FieldCard>
      ))}
    </div>
  );
}
