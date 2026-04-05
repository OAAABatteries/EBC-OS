// ═══════════════════════════════════════════════════════════════
//  EBC-OS · ProductionTab — Foreman daily production entry
//  Props: { productionLogs, setProductionLogs, areas,
//           projectId, employees, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, BarChart3, TrendingUp, Save } from "lucide-react";
import { FieldCard } from "../../components/field/FieldCard";
import { FieldButton } from "../../components/field/FieldButton";
import { FieldInput } from "../../components/field/FieldInput";
import { FieldSelect } from "../../components/field/FieldSelect";
import { StatTile } from "../../components/field/StatTile";

export function ProductionTab({ productionLogs = [], setProductionLogs, areas = [], projectId, employees = [], t }) {
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
    () => productionLogs.filter((l) => String(l.projectId) === String(projectId)),
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
    };

    setProductionLogs((prev) => [...prev, entry]);

    // Clear form
    setQtyInstalled("");
    setLaborHours("");
    setCrewSize("");
    setEntryNotes("");
    setSaveMsg(tr("Saved!"));
    setTimeout(() => setSaveMsg(""), 2000);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
        <StatTile label={tr("Overall %")} value={`${projectStats.pct}%`} color="var(--blue)" t={t} />
        <StatTile label={tr("Areas")} value={projectStats.totalAreas} t={t} />
        <StatTile label={tr("Today's Entries")} value={projectStats.todayEntries} color="var(--green)" t={t} />
      </div>

      {/* ── New Entry Toggle ── */}
      <FieldButton onClick={() => setShowForm(!showForm)} t={t}>
        <Plus size={14} style={{ marginRight: 4 }} />
        {tr("Log Production")}
      </FieldButton>

      {/* ── Entry Form ── */}
      {showForm && (
        <FieldCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>
              <TrendingUp size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginBottom: 4 }}>
                    <span>{tr("Installed-to-Date")}</span>
                    <span>{runningTotal.installed} / {runningTotal.budget} {selectedScope?.unit || ""}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${runningTotal.budget > 0 ? Math.min(Math.round((runningTotal.installed / runningTotal.budget) * 100), 100) : 0}%`,
                      background: runningTotal.installed >= runningTotal.budget ? "var(--green)" : "var(--blue)",
                      borderRadius: 4, transition: "width 0.3s",
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                <div style={{ padding: "6px 12px", background: "var(--bg3)", borderRadius: "var(--radius-sm, 6px)", display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm, 12px)" }}>
                  <span style={{ color: "var(--text2)" }}>{tr("Productivity Rate")}</span>
                  <span style={{ fontWeight: 700, color: "var(--amber)" }}>{productivityRate} {selectedScope?.unit || ""}/hr</span>
                </div>

                <FieldInput label={tr("Notes")} value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} t={t} />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <FieldButton onClick={handleSave} disabled={!(parseFloat(qtyInstalled) > 0)} t={t} style={{ flex: 1, minHeight: 48 }}>
                    <Save size={14} style={{ marginRight: 4 }} />
                    {tr("Save Entry")}
                  </FieldButton>
                  {saveMsg && (
                    <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "var(--text-sm, 12px)" }}>{saveMsg}</span>
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
          <div style={{ fontWeight: 700, fontSize: "var(--text-sm, 12px)", color: "var(--text2)", textTransform: "uppercase", marginBottom: 8 }}>
            <BarChart3 size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {tr("Recent Entries")} &middot; {selectedArea?.name}
          </div>
          {areaLogs.map((log) => (
            <div key={log.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-sm, 12px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text)" }}>
                <span>{log.date} &middot; {log.trade}</span>
                <span style={{ fontWeight: 600 }}>{log.qtyInstalled} {log.unit}</span>
              </div>
              <div style={{ color: "var(--text3)", marginTop: 2 }}>
                {log.laborHours}h &middot; {log.crewSize} crew &middot; Rate: {log.laborHours > 0 ? (log.qtyInstalled / log.laborHours).toFixed(1) : "—"}/{tr("hr")}
              </div>
              {log.notes && <div style={{ color: "var(--text2)", fontStyle: "italic", marginTop: 2 }}>{log.notes}</div>}
            </div>
          ))}
        </FieldCard>
      )}

      {/* ── All Areas Summary ── */}
      <FieldCard>
        <div style={{ fontWeight: 700, fontSize: "var(--text-sm, 12px)", color: "var(--text2)", textTransform: "uppercase", marginBottom: 10 }}>
          {tr("All Areas Progress")}
        </div>
        {areaSummaries.length === 0 && (
          <div style={{ color: "var(--text3)", fontSize: "var(--text-sm, 12px)", textAlign: "center", padding: 16 }}>
            {tr("No areas for this project")}
          </div>
        )}
        {areaSummaries.map((a) => (
          <div
            key={a.id}
            style={{ marginBottom: 10, cursor: "pointer" }}
            onClick={() => { setSelectedAreaId(a.id); setSelectedTrade(""); setShowForm(true); }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm, 12px)", marginBottom: 2 }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {a.name}
                <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 4 }}>F{a.floor} Z{a.zone}</span>
              </span>
              <span style={{ fontWeight: 700, color: a.pct >= 100 ? "var(--green)" : "var(--text)" }}>{a.pct}%</span>
            </div>
            <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(a.pct, 100)}%`,
                background: a.pct >= 100 ? "var(--green)" : a.pct > 0 ? "var(--amber)" : "var(--bg4)",
                borderRadius: 3, transition: "width 0.3s",
              }} />
            </div>
          </div>
        ))}
      </FieldCard>
    </div>
  );
}
