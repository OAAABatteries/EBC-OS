// ═══════════════════════════════════════════════════════════════
//  EBC-OS · ProgressReportTab — Crew-facing area % done reporting
//  Lets crew members see and update completion for their assigned areas.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { FieldButton } from "../../components/field/FieldButton";
import { PhotoCapture } from "../../components/field/PhotoCapture";
import { CheckCircle, MapPin, TrendingUp } from "lucide-react";
import { queueMutation } from "../../lib/offlineQueue";

const PROGRESS_PRESETS = [0, 10, 25, 50, 75, 90, 100];

function computeAreaProgress(area) {
  const items = area.scopeItems || [];
  if (!items.length) return area.progressPct || 0;
  let installed = 0, budget = 0;
  items.forEach(s => { installed += s.installedQty || 0; budget += s.budgetQty || 0; });
  return budget > 0 ? Math.round((installed / budget) * 100) : (area.progressPct || 0);
}

export function ProgressReportTab({
  areas = [],
  setAreas,
  productionLogs = [],
  employeeId,
  employeeName,
  projectId,
  schedule,
  t,
}) {
  const tr = t || (k => k);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [pctValue, setPctValue] = useState(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saved, setSaved] = useState(false);

  // Areas for this project
  const projectAreas = useMemo(
    () => areas.filter(a => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  // Detect today's assigned areas from schedule
  const todayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  const assignedAreaIds = useMemo(() => {
    if (!schedule) return [];
    return schedule
      .filter(s => String(s.employeeId) === String(employeeId) && s.areaId && s.days?.[todayKey])
      .map(s => s.areaId);
  }, [schedule, employeeId, todayKey]);

  // Sort: assigned first, then by progress ascending (least done first)
  const sortedAreas = useMemo(() => {
    return [...projectAreas].sort((a, b) => {
      const aAssigned = assignedAreaIds.includes(a.id) ? 0 : 1;
      const bAssigned = assignedAreaIds.includes(b.id) ? 0 : 1;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      return computeAreaProgress(a) - computeAreaProgress(b);
    });
  }, [projectAreas, assignedAreaIds]);

  const selectedArea = projectAreas.find(a => a.id === selectedAreaId);
  const currentPct = selectedArea ? computeAreaProgress(selectedArea) : 0;

  const handleSubmit = () => {
    if (!selectedAreaId || pctValue === null) return;

    // Update area's progressPct
    setAreas(prev => prev.map(a =>
      a.id === selectedAreaId
        ? { ...a, progressPct: pctValue, lastProgressUpdate: new Date().toISOString(), lastProgressBy: employeeName }
        : a
    ));

    // Create a progress log entry
    const entry = {
      id: crypto.randomUUID(),
      type: "progress-report",
      areaId: selectedAreaId,
      areaName: selectedArea?.name || "",
      projectId,
      employeeId,
      employeeName: employeeName || "Unknown",
      previousPct: currentPct,
      newPct: pctValue,
      notes: notes.trim() || null,
      photos,
      loggedAt: new Date().toISOString(),
    };

    queueMutation("progress_reports", "insert", entry);

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelectedAreaId(null);
      setPctValue(null);
      setNotes("");
      setPhotos([]);
    }, 2500);
  };

  // Summary stats
  const areaStats = useMemo(() => {
    const total = projectAreas.length;
    const complete = projectAreas.filter(a => computeAreaProgress(a) >= 100).length;
    const avgPct = total > 0
      ? Math.round(projectAreas.reduce((sum, a) => sum + computeAreaProgress(a), 0) / total)
      : 0;
    return { total, complete, avgPct };
  }, [projectAreas]);

  if (!projectId) {
    return (
      <div className="flex-col gap-sp3 p-sp4 text-center">
        <MapPin size={32} className="c-text3" style={{ margin: "0 auto" }} />
        <div className="fs-secondary c-text3">{tr("No project assigned today")}</div>
      </div>
    );
  }

  return (
    <div className="flex-col gap-sp4">
      {/* Summary bar */}
      <div className="flex gap-sp3">
        <div className="flex-1 rounded-control bg-bg3 p-sp3 text-center">
          <div className="fs-stat fw-bold c-amber">{areaStats.avgPct}%</div>
          <div className="fs-tab c-text3 uppercase tracking-label mt-sp1">{tr("Avg Progress")}</div>
        </div>
        <div className="flex-1 rounded-control bg-bg3 p-sp3 text-center">
          <div className="fs-stat fw-bold c-green">{areaStats.complete}</div>
          <div className="fs-tab c-text3 uppercase tracking-label mt-sp1">{tr("Complete")}</div>
        </div>
        <div className="flex-1 rounded-control bg-bg3 p-sp3 text-center">
          <div className="fs-stat fw-bold c-text">{areaStats.total}</div>
          <div className="fs-tab c-text3 uppercase tracking-label mt-sp1">{tr("Areas")}</div>
        </div>
      </div>

      {/* Success banner */}
      {saved && (
        <div className="flex rounded-control gap-sp3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid var(--green)", padding: "var(--space-3) var(--space-4)" }}>
          <CheckCircle size={22} color="var(--green)" />
          <div className="fs-label fw-bold c-green">{tr("Progress updated!")}</div>
        </div>
      )}

      {/* Area list with progress bars */}
      <div>
        <label className="form-label mb-sp2 d-block">{tr("Select Area to Update")}</label>
        <div className="flex-col gap-sp2">
          {sortedAreas.map(area => {
            const pct = computeAreaProgress(area);
            const isAssigned = assignedAreaIds.includes(area.id);
            const isSelected = area.id === selectedAreaId;
            return (
              <button
                key={area.id}
                onClick={() => { setSelectedAreaId(area.id); setPctValue(pct); }}
                className="rounded-control text-left cursor-pointer"
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  border: isSelected ? "2px solid var(--amber)" : "1px solid var(--border)",
                  background: isSelected ? "var(--amber-bg-subtle)" : "var(--bg2)",
                }}
              >
                <div className="flex-between mb-sp1">
                  <div className="flex gap-sp2">
                    <span className="fs-label fw-semi c-text">{area.name}</span>
                    {isAssigned && (
                      <span className="badge badge-amber fs-tab">{tr("Assigned")}</span>
                    )}
                  </div>
                  <span className={`fs-label fw-bold ${pct >= 100 ? "c-green" : pct > 0 ? "c-amber" : "c-text3"}`}>
                    {pct}%
                  </span>
                </div>
                <div className="rounded-pill overflow-hidden" style={{ height: 6, background: "var(--bg4)" }}>
                  <div
                    className="rounded-pill h-full"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 100 ? "var(--green)" : "var(--amber)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div className="flex-between mt-sp1">
                  <span className="fs-tab c-text3">
                    F{area.floor || "?"} &middot; Z{area.zone || "?"}
                  </span>
                  {area.lastProgressUpdate && (
                    <span className="fs-tab c-text3">
                      {tr("Updated")} {new Date(area.lastProgressUpdate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {sortedAreas.length === 0 && (
            <div className="fs-secondary c-text3 text-center p-sp4">{tr("No areas defined for this project")}</div>
          )}
        </div>
      </div>

      {/* Progress update form */}
      {selectedArea && (
        <div className="rounded-card border p-sp4 flex-col gap-sp3" style={{ borderColor: "var(--amber)" }}>
          <div className="flex gap-sp2">
            <TrendingUp size={18} className="c-amber" />
            <span className="fs-secondary fw-semi c-text">{tr("Update Progress")}: {selectedArea.name}</span>
          </div>

          {/* Quick % presets */}
          <div>
            <label className="form-label mb-sp2 d-block">{tr("Area Completion")}</label>
            <div className="flex gap-sp2 flex-wrap">
              {PROGRESS_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setPctValue(p)}
                  className="rounded-control cursor-pointer text-center"
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    minWidth: 48,
                    border: pctValue === p ? "2px solid var(--amber)" : "1px solid var(--border)",
                    background: pctValue === p ? "var(--amber-bg-subtle)" : "var(--bg3)",
                    color: pctValue === p ? "var(--amber)" : "var(--text2)",
                    fontWeight: pctValue === p ? 700 : 500,
                    fontSize: "var(--text-secondary)",
                  }}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Custom slider */}
          <div className="flex gap-sp3">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={pctValue ?? 0}
              onChange={e => setPctValue(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "var(--amber)" }}
            />
            <span className="fs-subtitle fw-bold c-amber" style={{ minWidth: 52, textAlign: "right" }}>
              {pctValue ?? 0}%
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label mb-sp1 d-block">{tr("Notes")} ({tr("optional")})</label>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={tr("What was completed? Any blockers?")}
              style={{ resize: "vertical", fontSize: "var(--text-label)" }}
            />
          </div>

          {/* Photo */}
          <PhotoCapture
            photos={photos}
            onPhotos={setPhotos}
            label={tr("Photo (optional)")}
            t={tr}
          />

          {/* Submit */}
          <FieldButton
            onClick={handleSubmit}
            disabled={pctValue === null || pctValue === currentPct}
            className="fw-bold"
            style={{ fontSize: "var(--text-lg, 16px)", minHeight: 52 }}
            t={tr}
          >
            {pctValue !== null && pctValue !== currentPct
              ? `${tr("Update")} ${currentPct}% → ${pctValue}%`
              : tr("Select new progress")}
          </FieldButton>
        </div>
      )}
    </div>
  );
}
