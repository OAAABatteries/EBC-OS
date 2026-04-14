// ═══════════════════════════════════════════════════════════════
//  EBC-OS · AreasTab — Sprint 10: Full CRUD + Takeoff Import
//  Props: { areas, setAreas, productionLogs, employees, projectId,
//           t, takeoffs, bids, project, userRole }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, MapPin, Layers, BarChart3, AlertTriangle, Plus, Trash2, Edit3, Download, Check } from "lucide-react";
import { FieldCard } from "../components/field/FieldCard";
import { FieldSelect } from "../components/field/FieldSelect";
import { StatusBadge } from "../components/field/StatusBadge";
import { StatTile } from "../components/field/StatTile";

const STATUS_ORDER = { "not-started": 0, "in-progress": 1, punch: 2, complete: 3 };
const STATUS_CYCLE = { "not-started": "in-progress", "in-progress": "punch", punch: "complete", complete: "not-started" };
const STATUS_BADGE_MAP = { "not-started": "badge-muted", "in-progress": "badge-amber", punch: "badge-red", complete: "badge-green" };
const AREA_TYPES = ["Office", "Lab", "Corridor", "Utility", "Common", "Wet", "Retail", "Medical", "Storage", "Custom"];
const DEFAULT_TRADES = ["Metal Framing", "Drywall", "ACT Ceilings", "Tape & Finish", "Demo", "Insulation", "Doors & Hardware"];

function progressPct(scope) {
  if (!scope || !scope.length) return 0;
  let installed = 0, budget = 0;
  scope.forEach((s) => { installed += s.installedQty || 0; budget += s.budgetQty || 0; });
  return budget > 0 ? Math.round((installed / budget) * 100) : 0;
}

const EMPTY_AREA = { name: "", floor: "", zone: "", type: "Office", assignedTo: null, laborBudgetHours: 0, notes: "", scopeItems: [] };
const EMPTY_SCOPE_ITEM = { trade: "Metal Framing", unit: "LF", budgetQty: 0, installedQty: 0 };

export function AreasTab({ areas = [], setAreas, productionLogs = [], employees = [], projectId, t, takeoffs, bids, project, userRole }) {
  const tr = t || ((k) => k);
  const canSeeFinancials = !userRole || ["owner","admin","pm","estimator","office_admin","accounting"].includes(userRole);

  const [filterFloor, setFilterFloor] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_AREA });

  // Filter areas to this project
  const projectAreas = useMemo(
    () => areas.filter((a) => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  const floors = useMemo(() => [...new Set(projectAreas.map((a) => a.floor).filter(Boolean))].sort(), [projectAreas]);
  const zones = useMemo(() => [...new Set(projectAreas.map((a) => a.zone).filter(Boolean))].sort(), [projectAreas]);

  const filtered = useMemo(() => {
    let list = projectAreas;
    if (filterFloor !== "all") list = list.filter((a) => a.floor === filterFloor);
    if (filterZone !== "all") list = list.filter((a) => a.zone === filterZone);
    return list.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  }, [projectAreas, filterFloor, filterZone]);

  // Actual labor hours per area from production logs
  const laborByArea = useMemo(() => {
    const map = {};
    productionLogs
      .filter((l) => String(l.projectId) === String(projectId))
      .forEach((l) => { map[l.areaId] = (map[l.areaId] || 0) + (l.laborHours || 0); });
    return map;
  }, [productionLogs, projectId]);

  // Summary stats
  const stats = useMemo(() => {
    const total = projectAreas.length;
    const complete = projectAreas.filter((a) => a.status === "complete").length;
    const inProgress = projectAreas.filter((a) => a.status === "in-progress").length;
    let installed = 0, budget = 0;
    projectAreas.forEach((a) =>
      (a.scopeItems || []).forEach((s) => { installed += s.installedQty || 0; budget += s.budgetQty || 0; })
    );
    const pct = budget > 0 ? Math.round((installed / budget) * 100) : 0;
    let totalBudgetHrs = 0, totalActualHrs = 0;
    projectAreas.forEach((a) => {
      totalBudgetHrs += a.laborBudgetHours || 0;
      totalActualHrs += laborByArea[a.id] || 0;
    });
    const laborPct = totalBudgetHrs > 0 ? Math.round((totalActualHrs / totalBudgetHrs) * 100) : 0;
    return { total, complete, inProgress, pct, laborPct, totalBudgetHrs, totalActualHrs };
  }, [projectAreas, laborByArea]);

  const empName = (id) => {
    if (!id) return tr("Unassigned");
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : tr("Unassigned");
  };

  const logsForArea = (areaId) =>
    productionLogs.filter((l) => l.areaId === areaId).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // ── CRUD operations ──
  const saveArea = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setAreas(prev => prev.map(a => a.id === editId ? { ...a, ...form } : a));
      setEditId(null);
    } else {
      const newArea = { ...form, id: crypto.randomUUID(), projectId, status: "not-started" };
      setAreas(prev => [...prev, newArea]);
    }
    setForm({ ...EMPTY_AREA });
    setShowAddForm(false);
  };

  const deleteArea = (id) => {
    if (!confirm(tr("Delete this area?"))) return;
    setAreas(prev => prev.filter(a => a.id !== id));
  };

  const startEdit = (area) => {
    setForm({ name: area.name, floor: area.floor || "", zone: area.zone || "", type: area.type || "Office", assignedTo: area.assignedTo, laborBudgetHours: area.laborBudgetHours || 0, notes: area.notes || "", scopeItems: [...(area.scopeItems || [])] });
    setEditId(area.id);
    setShowAddForm(true);
  };

  const cycleStatus = (area) => {
    const next = STATUS_CYCLE[area.status] || "not-started";
    setAreas(prev => prev.map(a => a.id === area.id ? { ...a, status: next } : a));
  };

  // ── Installed qty update (10.4) ──
  const updateInstalled = (areaId, scopeIdx, newQty) => {
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a;
      const items = [...(a.scopeItems || [])];
      items[scopeIdx] = { ...items[scopeIdx], installedQty: Number(newQty) || 0 };
      return { ...a, scopeItems: items };
    }));
  };

  // ── Scope item CRUD ──
  const addScopeItem = () => setForm(f => ({ ...f, scopeItems: [...f.scopeItems, { ...EMPTY_SCOPE_ITEM }] }));
  const removeScopeItem = (idx) => setForm(f => ({ ...f, scopeItems: f.scopeItems.filter((_, i) => i !== idx) }));
  const updateScopeField = (idx, field, value) => {
    setForm(f => {
      const items = [...f.scopeItems];
      items[idx] = { ...items[idx], [field]: field === "budgetQty" || field === "installedQty" ? (Number(value) || 0) : value };
      return { ...f, scopeItems: items };
    });
  };

  // ── Import from Takeoff (10.3) ──
  const linkedBid = project?.bidId ? (bids || []).find(b => b.id === project.bidId) : null;
  const linkedTakeoff = project?.bidId ? (takeoffs || []).find(tk => tk.bidId === project.bidId) : null;

  const importFromTakeoff = () => {
    if (!linkedTakeoff?.rooms?.length) return;
    const newAreas = linkedTakeoff.rooms.map((room, idx) => ({
      id: crypto.randomUUID(),
      projectId,
      name: room.name || `Area ${idx + 1}`,
      floor: "",
      zone: "",
      type: "Office",
      status: "not-started",
      assignedTo: null,
      laborBudgetHours: 0,
      notes: `Imported from estimate: ${linkedBid?.name || ""}`,
      scopeItems: (room.items || []).map(item => ({
        trade: item.assembly || item.name || "Unknown",
        unit: item.unit || "SF",
        budgetQty: Math.round(item.qty || item.totalSF || 0),
        installedQty: 0,
      })),
    }));
    setAreas(prev => [...prev, ...newAreas]);
  };

  return (
    <div className="flex-col gap-sp4">
      {/* ── Summary Stats ── */}
      {projectAreas.length > 0 && (
        <div className="gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
          <StatTile label={tr("Total Areas")} value={stats.total} t={t} />
          <StatTile label={tr("Complete")} value={stats.complete} color="var(--green)" t={t} />
          <StatTile label={tr("In Progress")} value={stats.inProgress} color="var(--amber)" t={t} />
          <StatTile label={tr("Overall %")} value={`${stats.pct}%`} color="var(--blue)" t={t} />
          {canSeeFinancials && stats.totalBudgetHrs > 0 && (
            <StatTile label={tr("Labor Burn")} value={`${stats.laborPct}%`} color={stats.laborPct > stats.pct ? "var(--red)" : "var(--green)"} t={t} />
          )}
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex gap-sp2 flex-wrap">
        <button className="btn btn-primary btn-sm flex gap-sp1" onClick={() => { setForm({ ...EMPTY_AREA }); setEditId(null); setShowAddForm(!showAddForm); }}>
          <Plus size={14} /> {tr("Add Area")}
        </button>
        {linkedTakeoff?.rooms?.length > 0 && projectAreas.length === 0 && (
          <button className="btn btn-ghost btn-sm flex gap-sp1" onClick={importFromTakeoff}>
            <Download size={14} /> {tr("Import from Estimate")} ({linkedTakeoff.rooms.length} rooms)
          </button>
        )}
        {/* Filters */}
        {projectAreas.length > 0 && (
          <>
            <div style={{ flex: "0 1 140px" }}>
              <FieldSelect label="" value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)} t={t}>
                <option value="all">{tr("All Floors")}</option>
                {floors.map((f) => <option key={f} value={f}>{tr("Fl")} {f}</option>)}
              </FieldSelect>
            </div>
            <div style={{ flex: "0 1 140px" }}>
              <FieldSelect label="" value={filterZone} onChange={(e) => setFilterZone(e.target.value)} t={t}>
                <option value="all">{tr("All Zones")}</option>
                {zones.map((z) => <option key={z} value={z}>{tr("Zone")} {z}</option>)}
              </FieldSelect>
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Form ── */}
      {showAddForm && (
        <FieldCard>
          <div className="fw-semi fs-label mb-sp2">{editId ? tr("Edit Area") : tr("New Area")}</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{tr("Area Name")} *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Suite 200, Main Lab" />
            </div>
            <div className="form-group">
              <label className="form-label">{tr("Type")}</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{tr("Floor")}</label>
              <input className="form-input" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="1, 2, B1..." />
            </div>
            <div className="form-group">
              <label className="form-label">{tr("Zone")}</label>
              <input className="form-input" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="A, B, North..." />
            </div>
            <div className="form-group">
              <label className="form-label">{tr("Assigned To")}</label>
              <select className="form-select" value={form.assignedTo || ""} onChange={e => setForm({ ...form, assignedTo: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{tr("Unassigned")}</option>
                {employees.filter(e => e.role === "Foreman").map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            {canSeeFinancials && (
              <div className="form-group">
                <label className="form-label">{tr("Labor Budget (hrs)")}</label>
                <input className="form-input" type="number" min="0" value={form.laborBudgetHours} onChange={e => setForm({ ...form, laborBudgetHours: Number(e.target.value) || 0 })} />
              </div>
            )}
            <div className="form-group full">
              <label className="form-label">{tr("Notes")}</label>
              <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={tr("Area notes...")} />
            </div>
          </div>

          {/* Scope Items */}
          <div className="mt-sp3">
            <div className="flex-between mb-sp2">
              <span className="fs-tab fw-bold uppercase c-text2">{tr("Scope Items")}</span>
              <button className="btn btn-ghost btn-sm fs-10" onClick={addScopeItem}><Plus size={12} /> {tr("Add Item")}</button>
            </div>
            {form.scopeItems.length === 0 && (
              <div className="fs-tab c-text3 text-center py-sp2">{tr("No scope items — add trades to track quantities")}</div>
            )}
            {form.scopeItems.map((si, idx) => (
              <div key={idx} className="flex gap-sp2 mb-sp1 items-end">
                <div style={{ flex: "1 1 120px" }}>
                  <select className="form-select fs-tab" value={si.trade} onChange={e => updateScopeField(idx, "trade", e.target.value)}>
                    {DEFAULT_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                    {!DEFAULT_TRADES.includes(si.trade) && <option value={si.trade}>{si.trade}</option>}
                  </select>
                </div>
                <div style={{ flex: "0 0 60px" }}>
                  <select className="form-select fs-tab" value={si.unit} onChange={e => updateScopeField(idx, "unit", e.target.value)}>
                    <option value="LF">LF</option><option value="SF">SF</option><option value="EA">EA</option><option value="SY">SY</option>
                  </select>
                </div>
                <div style={{ flex: "0 0 80px" }}>
                  <input className="form-input fs-tab" type="number" min="0" value={si.budgetQty} onChange={e => updateScopeField(idx, "budgetQty", e.target.value)} placeholder={tr("Budget")} />
                </div>
                <button className="btn-bare c-red fs-tab" style={{ padding: "var(--space-1)" }} onClick={() => removeScopeItem(idx)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-sp2 mt-sp3">
            <button className="btn btn-primary btn-sm" onClick={saveArea} disabled={!form.name.trim()}>{editId ? tr("Update") : tr("Add")}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddForm(false); setEditId(null); }}>{tr("Cancel")}</button>
          </div>
        </FieldCard>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && !showAddForm && (
        <FieldCard>
          <div className="p-sp6 c-text3 text-center">
            <MapPin size={32} className="mb-sp2" style={{ opacity: 0.4 }} />
            <div className="fw-semi mb-sp1">{tr("No areas yet")}</div>
            <div className="fs-tab">{tr("Add areas to break down scope by room, floor, or zone")}</div>
            {linkedTakeoff?.rooms?.length > 0 && (
              <button className="btn btn-ghost btn-sm mt-sp3 flex gap-sp1 mx-auto" onClick={importFromTakeoff}>
                <Download size={14} /> {tr("Import")} {linkedTakeoff.rooms.length} {tr("rooms from estimate")}
              </button>
            )}
          </div>
        </FieldCard>
      )}

      {/* ── Area Cards ── */}
      {filtered.map((area) => {
        const pct = progressPct(area.scopeItems);
        const actualHrs = laborByArea[area.id] || 0;
        const budgetHrs = area.laborBudgetHours || 0;
        const laborBurnPct = budgetHrs > 0 ? Math.round((actualHrs / budgetHrs) * 100) : 0;
        const isOverBurning = budgetHrs > 0 && laborBurnPct > pct;
        const isExpanded = expandedId === area.id;
        const logs = isExpanded ? logsForArea(area.id) : [];

        return (
          <FieldCard key={area.id}>
            {/* Header row */}
            <div onClick={() => setExpandedId(isExpanded ? null : area.id)} className="flex-between gap-sp2 cursor-pointer">
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="flex gap-sp2 flex-wrap">
                  <span className="fs-label fw-bold c-text">{area.name}</span>
                  <span className={`badge ${STATUS_BADGE_MAP[area.status] || "badge-muted"} cursor-pointer`}
                    onClick={(e) => { e.stopPropagation(); cycleStatus(area); }} title={tr("Tap to change status")}>
                    {tr(area.status)}
                  </span>
                </div>
                <div className="fs-tab mt-sp1 c-text2">
                  {area.floor ? `${tr("Fl")} ${area.floor}` : ""}{area.floor && area.zone ? " · " : ""}{area.zone ? `${tr("Zone")} ${area.zone}` : ""}{(area.floor || area.zone) ? " · " : ""}{empName(area.assignedTo)}
                </div>
              </div>
              <div className="flex gap-sp2 items-center">
                <button className="btn-bare c-text3" onClick={(e) => { e.stopPropagation(); startEdit(area); }} title={tr("Edit")}>
                  <Edit3 size={14} />
                </button>
                <span style={{ fontSize: "var(--text-sm, 12px)", fontWeight: "var(--weight-bold)", color: pct >= 100 ? "var(--green)" : "var(--text)" }}>
                  {pct}%
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="rounded-control mt-sp2 bg-bg3 overflow-hidden" style={{ height: 4 }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "var(--green)" : "var(--amber)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
            </div>

            {/* Labor burn rate (10.5 — visible to PM/owner only) */}
            {canSeeFinancials && budgetHrs > 0 && (
              <div className="flex mt-sp2 gap-sp2">
                <span className="fs-tab c-text2" style={{ minWidth: 70 }}>{tr("Labor")}: {actualHrs}/{budgetHrs}h</span>
                <div className="rounded-control bg-bg3 overflow-hidden flex-1" style={{ height: 4 }}>
                  <div style={{ height: "100%", width: `${Math.min(laborBurnPct, 100)}%`, background: isOverBurning ? "var(--red)" : "var(--green)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: "var(--text-sm, 12px)", fontWeight: "var(--weight-semi)", color: isOverBurning ? "var(--red)" : "var(--text2)", minWidth: 36, textAlign: "right" }}>
                  {laborBurnPct}%
                </span>
                {isOverBurning && <AlertTriangle size={12} className="c-red flex-shrink-0" title={tr("Labor burn exceeds production")} />}
              </div>
            )}

            {/* Expanded: Scope Items with editable installed qty (10.4) */}
            {isExpanded && (
              <div className="flex-col mt-sp3 gap-sp2">
                <div className="fs-tab fw-bold uppercase c-text2" style={{ letterSpacing: "0.05em" }}>
                  <Layers size={12} className="mr-sp1" style={{ verticalAlign: "middle" }} />
                  {tr("Scope Items")}
                </div>
                {(area.scopeItems || []).length === 0 && (
                  <div className="fs-tab c-text3">{tr("No scope items defined — edit this area to add trades")}</div>
                )}
                {(area.scopeItems || []).map((si, idx) => {
                  const siPct = si.budgetQty > 0 ? Math.round(((si.installedQty || 0) / si.budgetQty) * 100) : 0;
                  return (
                    <div key={idx} className="flex gap-sp2 items-center">
                      <span className="fs-tab c-text" style={{ flex: "0 0 100px" }}>{si.trade}</span>
                      <div className="rounded-control bg-bg3 overflow-hidden flex-1" style={{ height: 6 }}>
                        <div style={{ height: "100%", width: `${Math.min(siPct, 100)}%`, background: siPct >= 100 ? "var(--green)" : "var(--blue)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
                      </div>
                      <input
                        className="form-input fs-tab text-right"
                        type="number" min="0" max={si.budgetQty * 2}
                        value={si.installedQty || 0}
                        onChange={e => updateInstalled(area.id, idx, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 56, padding: "var(--space-1) var(--space-2)" }}
                        title={tr("Installed qty")}
                      />
                      <span className="fs-tab c-text2" style={{ flex: "0 0 60px", textAlign: "right" }}>
                        / {si.budgetQty} {si.unit}
                      </span>
                    </div>
                  );
                })}

                {/* Production log entries */}
                {logs.length > 0 && (
                  <>
                    <div className="fs-tab fw-bold mt-sp2 uppercase c-text2" style={{ letterSpacing: "0.05em" }}>
                      <BarChart3 size={12} className="mr-sp1" style={{ verticalAlign: "middle" }} />
                      {tr("Production Log")}
                    </div>
                    {logs.map((log) => (
                      <div key={log.id} className="border-b fs-tab" style={{ padding: "var(--space-2) 0" }}>
                        <div className="c-text" style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{log.date} · {log.trade}</span>
                          <span className="fw-semi">{log.qtyInstalled} {log.unit}</span>
                        </div>
                        <div className="mt-sp1 c-text3">{log.laborHours}h · {log.crewSize} crew · {log.enteredBy}</div>
                        {log.notes && <div className="mt-sp1 c-text2" style={{ fontStyle: "italic" }}>{log.notes}</div>}
                      </div>
                    ))}
                  </>
                )}

                {/* Area notes + delete */}
                <div className="flex-between mt-sp2">
                  {area.notes ? <div className="fs-tab c-text2 flex-1" style={{ fontStyle: "italic" }}>{area.notes}</div> : <div />}
                  <button className="btn-bare c-red fs-tab" onClick={(e) => { e.stopPropagation(); deleteArea(area.id); }} title={tr("Delete area")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </FieldCard>
        );
      })}
    </div>
  );
}
