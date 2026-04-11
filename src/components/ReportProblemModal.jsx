import { useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { PhotoCapture } from "./field/PhotoCapture";

const CATEGORIES = [
  "Safety Hazard",
  "Equipment Issue",
  "Material Defect",
  "Schedule Conflict",
  "Quality Concern",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const PRIORITY_COLOR = {
  Low: "var(--green)",
  Medium: "var(--amber)",
  High: "var(--red)",
  Urgent: "#dc2626",
};

// Inline AlertTriangle SVG (Lucide style)
function AlertTriangleIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ReportProblemModal({ reporter, projects, defaultProjectId, areas, onSave, onClose, t }) {
  const tr = t || ((k) => k);

  const [category, setCategory] = useState("Safety Hazard");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [projectId, setProjectId] = useState(defaultProjectId || (projects?.[0]?.id ?? ""));
  const [gpsStatus, setGpsStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [areaId, setAreaId] = useState("");

  const { getPosition, loading: gpsLoading } = useGeolocation();

  const selectedProject = projects?.find((p) => String(p.id) === String(projectId));
  const projectAreas = (areas || []).filter((a) => String(a.projectId) === String(projectId));

  const handleSubmit = async () => {
    if (!description.trim() && photos.length === 0) return;
    setSaving(true);

    let gps = null;
    try {
      setGpsStatus("Getting location...");
      gps = await getPosition();
      setGpsStatus("Location captured");
    } catch {
      setGpsStatus("Location unavailable");
    }

    const selectedArea = projectAreas.find((a) => a.id === areaId);
    const problem = {
      id: crypto.randomUUID(),
      category,
      description: description.trim(),
      priority,
      reporter: reporter || "Unknown",
      projectId: projectId || null,
      projectName: selectedProject?.name || "",
      areaId: areaId || null,
      areaName: selectedArea ? `${selectedArea.name}, Floor ${selectedArea.floor}, Zone ${selectedArea.zone}` : "",
      photos,
      reportedAt: new Date().toISOString(),
      gps,
      status: "open",
    };

    onSave(problem);
    setSaving(false);
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchEnd={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content" style={{ maxWidth: 480, width: "100%", background: "var(--card)", borderRadius: "var(--radius-card)", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "var(--navy, #0f1f2e)", padding: "var(--space-5) var(--space-5) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <AlertTriangleIcon size={24} color="var(--amber, #f59e0b)" />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)" }}>{tr("Report a Problem")}</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "var(--text-label)" }}>{reporter}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "var(--radius-control)", width: 44, height: 44, cursor: "pointer", fontSize: "var(--text-card)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Project */}
          {projects && projects.length > 0 && (
            <div>
              <label className="form-label" style={{ marginBottom: "var(--space-2)", display: "block" }}>{tr("Project")}</label>
              <select
                className="form-select"
                value={String(projectId)}
                onChange={(e) => setProjectId(e.target.value)}
                style={{ fontSize: "var(--text-secondary)" }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="form-label" style={{ marginBottom: "var(--space-2)", display: "block" }}>{tr("Category")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "var(--space-3) var(--space-2)",
                    borderRadius: "var(--radius-control)",
                    border: category === cat ? "2px solid var(--amber, #f59e0b)" : "2px solid var(--border)",
                    background: category === cat ? "rgba(245,158,11,0.12)" : "var(--bg3)",
                    color: category === cat ? "var(--amber, #f59e0b)" : "var(--text2)",
                    fontWeight: category === cat ? 700 : 500,
                    fontSize: "var(--text-base, 13px)",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {tr(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="form-label" style={{ marginBottom: "var(--space-2)", display: "block" }}>{tr("Priority")}</label>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    flex: 1,
                    padding: "var(--space-3) var(--space-1)",
                    borderRadius: "var(--radius-control)",
                    border: priority === p ? `2px solid ${PRIORITY_COLOR[p]}` : "2px solid var(--border)",
                    background: priority === p ? `${PRIORITY_COLOR[p]}1a` : "var(--bg3)",
                    color: priority === p ? PRIORITY_COLOR[p] : "var(--text2)",
                    fontWeight: priority === p ? 700 : 500,
                    fontSize: "var(--text-sm, 12px)",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {tr(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Area / Location */}
          {projectAreas.length > 0 && (
            <div>
              <label className="form-label" style={{ marginBottom: "var(--space-2)", display: "block" }}>{tr("Location")}</label>
              <select
                className="form-select"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                style={{ fontSize: "var(--text-secondary)" }}
              >
                <option value="">{tr("Select area...")}</option>
                {projectAreas.map((a) => (
                  <option key={a.id} value={a.id}>{`${a.name} — Floor ${a.floor}, Zone ${a.zone}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="form-label" style={{ marginBottom: "var(--space-2)", display: "block" }}>{tr("Description (optional with photo)")}</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("Quick note (optional if photo attached)...")}
              rows={2}
              style={{ width: "100%", resize: "vertical", fontSize: "var(--text-secondary)", minHeight: 60 }}
            />
          </div>

          {/* Photo Capture */}
          <PhotoCapture photos={photos} onPhotos={setPhotos} t={tr} />

          {gpsStatus && (
            <div style={{ fontSize: "var(--text-label)", color: "var(--text3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: gpsStatus.includes("captured") ? "var(--green)" : "var(--amber)", display: "inline-block" }} />
              {gpsStatus}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "var(--space-3) var(--space-5) var(--space-5)", display: "flex", gap: "var(--space-3)" }}>
          <button
            className="btn"
            onClick={onClose}
            style={{ flex: 1, padding: "var(--space-4)", fontSize: "var(--text-secondary)", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            {tr("Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!description.trim() && photos.length === 0) || saving || gpsLoading}
            style={{
              flex: 2,
              padding: "var(--space-4)",
              fontSize: "var(--text-secondary)",
              fontWeight: "var(--weight-bold)",
              background: (!description.trim() && photos.length === 0) ? "var(--bg3)" : "var(--amber, #f59e0b)",
              color: (!description.trim() && photos.length === 0) ? "var(--text3)" : "#0f1f2e",
              border: "none",
              borderRadius: "var(--radius-control)",
              cursor: (!description.trim() && photos.length === 0) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            <AlertTriangleIcon size={18} color={(!description.trim() && photos.length === 0) ? "var(--text3)" : "#0f1f2e"} />
            {saving ? tr("Submitting...") : tr("Submit Report")}
          </button>
        </div>
      </div>
    </div>
  );
}
