// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PunchListTab — PM-facing punch list management
//  Props: { punchItems, setPunchItems, areas, employees, projectId, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, AlertTriangle, CheckCircle, Clock, Filter } from "lucide-react";
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
    setPunchItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, status: next, ...(next === "complete" ? { completedAt: new Date().toISOString() } : {}) }
          : p
      )
    );
  };

  const handleAdd = () => {
    if (!formDesc.trim()) return;
    const areaObj = projectAreas.find((a) => a.id === formArea);
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
    setFormDesc("");
    setFormArea("");
    setFormPriority("medium");
    setFormAssignee("");
    setFormPhotos([]);
    setShowForm(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Summary Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
        <StatTile label={tr("Total")} value={stats.total} t={t} />
        <StatTile label={tr("Open")} value={stats.open} color="var(--red)" t={t} />
        <StatTile label={tr("In Progress")} value={stats.inProg} color="var(--amber)" t={t} />
        <StatTile label={tr("Complete")} value={stats.complete} color="var(--green)" t={t} />
        <StatTile label={tr("Resolved %")} value={`${stats.pct}%`} color="var(--blue)" t={t} />
      </div>

      {/* ── Filters + Add ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
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
        <FieldButton onClick={() => setShowForm(!showForm)} t={t}>
          <Plus size={14} style={{ marginRight: 4 }} />
          {tr("Add Punch Item")}
        </FieldButton>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <FieldCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{tr("New Punch Item")}</div>
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
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <FieldButton variant="ghost" onClick={() => setShowForm(false)} t={t}>{tr("Cancel")}</FieldButton>
              <FieldButton onClick={handleAdd} disabled={!formDesc.trim()} t={t}>{tr("Save")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Punch Items ── */}
      {filtered.length === 0 && (
        <FieldCard>
          <div style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>
            <CheckCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>{tr("No punch items found")}</div>
          </div>
        </FieldCard>
      )}

      {filtered.map((item) => (
        <FieldCard key={item.id}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            {/* Status advance button */}
            <div style={{ flex: "0 0 auto", paddingTop: 2 }}>
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
              <div style={{ fontWeight: 600, fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{item.description}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <span className={`badge ${PRIORITY_BADGE[item.priority] || "badge-muted"}`}>{tr(item.priority)}</span>
                <span className={`badge ${STATUS_BADGE[item.status] || "badge-muted"}`}>{tr(item.status)}</span>
              </div>
              <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginTop: 4 }}>
                {item.location && <span>{item.location} &middot; </span>}
                {item.assignedTo || tr("Unassigned")} &middot; {new Date(item.createdAt).toLocaleDateString()}
              </div>

              {/* Photos */}
              {item.photos && item.photos.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  {item.photos.map((p, i) => (
                    <div key={i} style={{ width: 40, height: 40, borderRadius: "var(--radius-sm, 4px)", overflow: "hidden" }}>
                      <img src={p.data} alt={p.name || "photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FieldCard>
      ))}
    </div>
  );
}
