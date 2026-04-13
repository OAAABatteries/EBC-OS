// ═══════════════════════════════════════════════════════════════
//  EBC-OS · ProductionTab — Foreman daily production entry
//  Props: { productionLogs, setProductionLogs, areas,
//           projectId, employees, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, BarChart3, TrendingUp, Save, Trash2 } from "lucide-react";
import { queueMutation } from "../../lib/offlineQueue";
import { FieldCard } from "../../components/field/FieldCard";
import { FieldButton } from "../../components/field/FieldButton";
import { FieldInput } from "../../components/field/FieldInput";
import { FieldSelect } from "../../components/field/FieldSelect";
import { StatTile } from "../../components/field/StatTile";
import { PhotoCapture } from "../../components/field/PhotoCapture";

export function ProductionTab({ productionLogs = [], setProductionLogs, areas = [], setAreas, projectId, employees = [], foreman, t }) {
  const tr = t || ((k) => k);

  // Entry form state
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("");
  const [qtyInstalled, setQtyInstalled] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [crewSize, setCrewSize] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [formPhotos, setFormPhotos] = useState([]);

  // Project areas
  const projectAreas = useMemo(
    () => areas.filter((a) => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  // Selected area object
  const selectedArea = useMemo(
    () => projectAreas.find((a) => a.id === selectedAreaId) || null,
    [projectAreas, selectedAreaId]
  );

  // Scope items for selected area
  const scopeItems = useMemo(
    () => (selectedArea ? selectedArea.scopeItems || [] : []),
    [selectedArea]
  );

  // Selected scope item
  const selectedScope = useMemo(
    () => scopeItems.find((s) => s.trade === selectedTrade) || null,
    [scopeItems, selectedTrade]
  );

  // Productivity rate
  const productivityRate = useMemo(() => {
    const qty = parseFloat(qtyInstalled) || 0;
    const hrs = parseFloat(laborHours) || 0;
    return hrs > 0 ? (qty / hrs).toFixed(2) : "—";
  }, [qtyInstalled, laborHours]);

  // Running totals for selected scope
  const runningTotal = useMemo(() => {
    if (!selectedScope) return { installed: 0, budget: 0 };
    return { installed: selectedScope.installedQty || 0, budget: selectedScope.budgetQty || 0 };
  }, [selectedScope]);

  // Production logs for selected area (last 5)
  const areaLogs = useMemo(() => {
    if (!selectedAreaId) return [];
    return productionLogs
      .filter((l) => l.areaId === selectedAreaId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [productionLogs, selectedAreaId]);

  // Project logs for this project
  const projectLogs = useMemo(
    () => productionLogs.filter((l) => String(l.projectId) === String(projectId) && l.status !== "deleted"),
    [productionLogs, projectId]
  );

  // Overall progress per area
  const areaSummaries = useMemo(() => {
    return projectAreas.map((area) => {
      let installed = 0, budget = 0;
      (area.scopeItems || []).forEach((s) => {
        installed += s.installedQty || 0;
        budget += s.budgetQty || 0;
      });
      const pct = budget > 0 ? Math.round((installed / budget) * 100) : 0;
      return { id: area.id, name: area.name, floor: area.floor, zone: area.zone, pct, status: area.status };
    });
  }, [projectAreas]);

  const handleSave = () => {
    const qty = parseFloat(qtyInstalled) || 0;
    const hrs = parseFloat(laborHours) || 0;
    const crew = parseInt(crewSize, 10) || 1;
    if (!selectedAreaId || !selectedTrade || qty <= 0) return;

    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      areaId: selectedAreaId,
      date: new Date().toISOString().slice(0, 10),
      trade: selectedTrade,
      unit: selectedScope?.unit || "EA",
      qtyInstalled: qty,
      laborHours: hrs,
      crewSize: crew,
      enteredBy: "Foreman",
      enteredAt: now,
      notes: entryNotes.trim(),
      photos: formPhotos,
    };

    setProductionLogs((prev) => [...prev, entry]);
    queueMutation("production_logs", "insert", entry);

    // Update area scope installedQty so progress bars reflect reality
    if (setAreas) {
      setAreas((prev) =>
        prev.map((area) => {
          if (area.id !== selectedAreaId) return area;
          return {
            ...area,
            scopeItems: (area.scopeItems || []).map((si) => {
              if (si.trade !== selectedTrade) return si;
              return { ...si, installedQty: (si.installedQty || 0) + qty };
            }),
          };
        })
      );
    }

    // Clear form
    setQtyInstalled("");
    setLaborHours("");
    setCrewSize("");
    setEntryNotes("");
    setFormPhotos([]);
    setSaveMsg(tr("Saved!"));
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleDeleteEntry = (log) => {
    if (!window.confirm(tr("Delete this production entry?"))) return;
    // Soft-delete: preserve record with audit trail
    setProductionLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: foreman?.name || "Foreman" } : l));
    queueMutation("production_logs", "update", { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: foreman?.name || "Foreman" }, { column: "id", value: log.id });
    // Reverse the installedQty on the area scope
    if (setAreas) {
      setAreas((prev) =>
        prev.map((area) => {
          if (area.id !== log.areaId) return area;
          return {
            ...area,
            scopeItems: (area.scopeItems || []).map((si) => {
              if (si.trade !== log.trade) return si;
              return { ...si, installedQty: Math.max(0, (si.installedQty || 0) - log.qtyInstalled) };
            }),
          };
        })
      );
    }
  };

  // Overall project stats
  const projectStats = useMemo(() => {
    let totalInstalled = 0, totalBudget = 0;
    projectAreas.forEach((area) =>
      (area.scopeItems || []).forEach((s) => {
        totalInstalled += s.installedQty || 0;
        totalBudget += s.budgetQty || 0;
      })
    );
    const pct = totalBudget > 0 ? Math.round((totalInstalled / totalBudget) * 100) : 0;
    const todayEntries = projectLogs.filter((l) => l.date === new Date().toISOString().slice(0, 10)).length;
    return { pct, todayEntries, totalAreas: projectAreas.length };
  }, [projectAreas, projectLogs]);

  return (
    <div className="flex-col gap-sp4">
      {/* ── Summary ── */}
      <div className="gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
        <StatTile label={tr("Overall %")} value={`${projectStats.pct}%`} color="var(--blue)" t={t} />
        <StatTile label={tr("Areas")} value={projectStats.totalAreas} t={t} />
        <StatTile label={tr("Today's Entries")} value={projectStats.todayEntries} color="var(--green)" t={t} />
      </div>

      {/* ── New Entry Toggle ── */}
      <FieldButton onClick={() => setShowForm(!showForm)} t={t}>
        <Plus size={14} className="mr-sp1" />
        {tr("Log Production")}
      </FieldButton>

      {/* ── Entry Form ── */}
      {showForm && (
        <FieldCard>
          <div className="flex-col gap-sp3">
            <div className="fs-label fw-bold c-text">
              <TrendingUp size={14} className="mr-sp1" style={{ verticalAlign: "middle" }} />
              {tr("Daily Production Entry")}
            </div>

            <FieldSelect label={tr("Area")} value={selectedAreaId} onChange={(e) => { setSelectedAreaId(e.target.value); setSelectedTrade(""); }} t={t}>
              <option value="">{tr("Select Area")}</option>
              {projectAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.name} (F{a.floor} Z{a.zone})</option>
              ))}
            </FieldSelect>

            {selectedArea && (
              <FieldSelect label={tr("Trade / Scope Item")} value={selectedTrade} onChange={(e) => setSelectedTrade(e.target.value)} t={t}>
                <option value="">{tr("Select Trade")}</option>
                {scopeItems.map((s, i) => (
                  <option key={i} value={s.trade}>{s.trade} ({s.installedQty}/{s.budgetQty} {s.unit})</option>
                ))}
              </FieldSelect>
            )}

            {selectedTrade && (
              <>
                {/* Running total bar */}
                <div>
                  <div className="fs-tab mb-sp1 c-text2" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{tr("Installed-to-Date")}</span>
                    <span>{runningTotal.installed} / {runningTotal.budget} {selectedScope?.unit || ""}</span>
                  </div>
                  <div className="rounded-control bg-bg3 overflow-hidden" style={{ height: 8 }}>
                    <div style={{
                      height: "100%",
                      width: `${runningTotal.budget > 0 ? Math.min(Math.round((runningTotal.installed / runningTotal.budget) * 100), 100) : 0}%`,
                      background: runningTotal.installed >= runningTotal.budget ? "var(--green)" : "var(--blue)",
                      borderRadius: "var(--radius-control)", transition: "width 0.3s",
                    }} />
                  </div>
                </div>

                <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
                  <div style={{ flex: "1 1 100px" }}>
                    <FieldInput
                      label={`${tr("Qty Installed")} (${selectedScope?.unit || ""})`}
                      type="number" inputMode="decimal"
                      value={qtyInstalled}
                      onChange={(e) => setQtyInstalled(e.target.value)}
                      t={t}
                    />
                  </div>
                  <div style={{ flex: "1 1 100px" }}>
                    <FieldInput label={tr("Labor Hours")} type="number" inputMode="decimal" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} t={t} />
                  </div>
                  <div style={{ flex: "1 1 80px" }}>
                    <FieldInput label={tr("Crew Size")} type="number" inputMode="numeric" value={crewSize} onChange={(e) => setCrewSize(e.target.value)} t={t} />
                  </div>
                </div>

                {/* Productivity rate */}
                <div className="fs-tab bg-bg3" style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm, 6px)", display: "flex", justifyContent: "space-between" }}>
                  <span className="c-text2">{tr("Productivity Rate")}</span>
                  <span className="fw-bold c-amber">{productivityRate} {selectedScope?.unit || ""}/hr</span>
                </div>

                <FieldInput label={tr("Notes")} value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} t={t} />

                <PhotoCapture photos={formPhotos} onPhotos={setFormPhotos} t={tr} uploadContext={{ context: "production", projectId }} />

                <div className="gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                  <FieldButton onClick={handleSave} disabled={!(parseFloat(qtyInstalled) > 0)} t={t} className="flex-1" style={{ minHeight: 48 }}>
                    <Save size={14} className="mr-sp1" />
                    {tr("Save Entry")}
                  </FieldButton>
                  {saveMsg && (
                    <span className="fs-tab fw-bold c-green">{saveMsg}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </FieldCard>
      )}

      {/* ── Recent logs for selected area ── */}
      {selectedAreaId && areaLogs.length > 0 && (
        <FieldCard>
          <div className="fs-tab fw-bold mb-sp2 uppercase c-text2">
            <BarChart3 size={12} className="mr-sp1" style={{ verticalAlign: "middle" }} />
            {tr("Recent Entries")} &middot; {selectedArea?.name}
          </div>
          {areaLogs.map((log) => (
            <div key={log.id} className="border-b fs-tab" style={{ padding: "var(--space-2) 0" }}>
              <div className="c-text" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{log.date} &middot; {log.trade}</span>
                <div className="flex gap-sp2">
                  <span className="fw-semi">{log.qtyInstalled} {log.unit}</span>
                  {log.date === todayStr && (
                    <button
                      onClick={() => handleDeleteEntry(log)}
                      title={tr("Delete")}
                      className="flex rounded-control bg-bg3 justify-center c-red cursor-pointer" style={{ width: 24, height: 24, padding: 0, border: "1px solid var(--border)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-sp1 c-text3">
                {log.laborHours}h &middot; {log.crewSize} crew &middot; Rate: {log.laborHours > 0 ? (log.qtyInstalled / log.laborHours).toFixed(1) : "—"}/{tr("hr")}
              </div>
              {log.notes && <div className="mt-sp1 c-text2" style={{ fontStyle: "italic" }}>{log.notes}</div>}
              {log.photos && log.photos.length > 0 && (
                <div className="mt-sp1 gap-sp1" style={{ display: "flex" }}>
                  {log.photos.map((p, i) => (
                    <div key={i} className="rounded-control overflow-hidden" style={{ width: 36, height: 36 }}>
                      <img src={p.data} alt={p.name || "photo"} className="h-full w-full" style={{ objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </FieldCard>
      )}

      {/* ── All Areas Summary ── */}
      <FieldCard>
        <div className="fs-tab fw-bold mb-sp3 uppercase c-text2">
          {tr("All Areas Progress")}
        </div>
        {areaSummaries.length === 0 && (
          <div className="fs-tab p-sp4 c-text3 text-center">
            {tr("No areas for this project")}
          </div>
        )}
        {areaSummaries.map((a) => (
          <div
            key={a.id}
            className="mb-sp3 cursor-pointer"
            onClick={() => { setSelectedAreaId(a.id); setSelectedTrade(""); setShowForm(true); }}
          >
            <div className="fs-tab mb-sp1" style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="fw-semi c-text">
                {a.name}
                <span className="fw-normal ml-sp1 c-text3">F{a.floor} Z{a.zone}</span>
              </span>
              <span style={{ fontWeight: "var(--weight-bold)", color: a.pct >= 100 ? "var(--green)" : "var(--text)" }}>{a.pct}%</span>
            </div>
            <div className="rounded-control bg-bg3 overflow-hidden" style={{ height: 6 }}>
              <div style={{
                height: "100%",
                width: `${Math.min(a.pct, 100)}%`,
                background: a.pct >= 100 ? "var(--green)" : a.pct > 0 ? "var(--amber)" : "var(--bg4)",
                borderRadius: "var(--radius-control)", transition: "width 0.3s",
              }} />
            </div>
          </div>
        ))}
      </FieldCard>
    </div>
  );
}
