// ═══════════════════════════════════════════════════════════════
//  EBC-OS · AreasTab — PM-facing area progress for project detail
//  Props: { areas, productionLogs, employees, projectId, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, MapPin, Layers, BarChart3 } from "lucide-react";
import { FieldCard } from "../components/field/FieldCard";
import { FieldSelect } from "../components/field/FieldSelect";
import { StatusBadge } from "../components/field/StatusBadge";
import { StatTile } from "../components/field/StatTile";

const STATUS_ORDER = { "not-started": 0, "in-progress": 1, punch: 2, complete: 3 };

const STATUS_BADGE_MAP = {
  "not-started": "badge-muted",
  "in-progress": "badge-amber",
  punch: "badge-red",
  complete: "badge-green",
};

const PRIORITY_BADGE = { high: "badge-red", medium: "badge-amber", low: "badge-muted" };

function progressPct(scope) {
  if (!scope || !scope.length) return 0;
  let installed = 0, budget = 0;
  scope.forEach((s) => { installed += s.installedQty || 0; budget += s.budgetQty || 0; });
  return budget > 0 ? Math.round((installed / budget) * 100) : 0;
}

export function AreasTab({ areas = [], productionLogs = [], employees = [], projectId, t }) {
  const tr = t || ((k) => k);

  const [filterFloor, setFilterFloor] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  // Filter areas to this project
  const projectAreas = useMemo(
    () => areas.filter((a) => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  // Unique floors / zones
  const floors = useMemo(() => [...new Set(projectAreas.map((a) => a.floor).filter(Boolean))].sort(), [projectAreas]);
  const zones = useMemo(() => [...new Set(projectAreas.map((a) => a.zone).filter(Boolean))].sort(), [projectAreas]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = projectAreas;
    if (filterFloor !== "all") list = list.filter((a) => a.floor === filterFloor);
    if (filterZone !== "all") list = list.filter((a) => a.zone === filterZone);
    return list.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  }, [projectAreas, filterFloor, filterZone]);

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
    return { total, complete, inProgress, pct };
  }, [projectAreas]);

  // Resolve employee name
  const empName = (id) => {
    if (!id) return tr("Unassigned");
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : tr("Unassigned");
  };

  // Production logs for a given area
  const logsForArea = (areaId) =>
    productionLogs
      .filter((l) => l.areaId === areaId)
      .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Summary Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
        <StatTile label={tr("Total Areas")} value={stats.total} t={t} />
        <StatTile label={tr("Complete")} value={stats.complete} color="var(--green)" t={t} />
        <StatTile label={tr("In Progress")} value={stats.inProgress} color="var(--amber)" t={t} />
        <StatTile label={tr("Overall %")} value={`${stats.pct}%`} color="var(--blue)" t={t} />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px" }}>
          <FieldSelect label={tr("Floor")} value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)} t={t}>
            <option value="all">{tr("All Floors")}</option>
            {floors.map((f) => (
              <option key={f} value={f}>{tr("Floor")} {f}</option>
            ))}
          </FieldSelect>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <FieldSelect label={tr("Zone")} value={filterZone} onChange={(e) => setFilterZone(e.target.value)} t={t}>
            <option value="all">{tr("All Zones")}</option>
            {zones.map((z) => (
              <option key={z} value={z}>{tr("Zone")} {z}</option>
            ))}
          </FieldSelect>
        </div>
      </div>

      {/* ── Area Cards ── */}
      {filtered.length === 0 && (
        <FieldCard>
          <div style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>
            <MapPin size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>{tr("No areas found for this project")}</div>
          </div>
        </FieldCard>
      )}

      {filtered.map((area) => {
        const pct = progressPct(area.scopeItems);
        const isExpanded = expandedId === area.id;
        const logs = isExpanded ? logsForArea(area.id) : [];

        return (
          <FieldCard key={area.id}>
            {/* Header row */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : area.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{area.name}</span>
                  <span className={`badge ${STATUS_BADGE_MAP[area.status] || "badge-muted"}`}>
                    {tr(area.status)}
                  </span>
                </div>
                <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginTop: 2 }}>
                  {tr("Floor")} {area.floor || "—"} &middot; {tr("Zone")} {area.zone || "—"} &middot; {empName(area.assignedTo)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-sm, 12px)", fontWeight: 700, color: pct >= 100 ? "var(--green)" : "var(--text)" }}>
                  {pct}%
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "var(--green)" : "var(--amber)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>

            {/* Expanded: Scope Items */}
            {isExpanded && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Scope items */}
                <div style={{ fontSize: "var(--text-sm, 12px)", fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <Layers size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  {tr("Scope Items")}
                </div>
                {(area.scopeItems || []).map((si, idx) => {
                  const siPct = si.budgetQty > 0 ? Math.round((si.installedQty / si.budgetQty) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: "0 0 120px", fontSize: "var(--text-sm, 12px)", color: "var(--text)" }}>{si.trade}</span>
                      <div style={{ flex: 1, height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(siPct, 100)}%`, background: siPct >= 100 ? "var(--green)" : "var(--blue)", borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ flex: "0 0 80px", fontSize: "var(--text-sm, 12px)", color: "var(--text2)", textAlign: "right" }}>
                        {si.installedQty}/{si.budgetQty} {si.unit}
                      </span>
                    </div>
                  );
                })}

                {/* Production log entries */}
                {logs.length > 0 && (
                  <>
                    <div style={{ fontSize: "var(--text-sm, 12px)", fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>
                      <BarChart3 size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {tr("Production Log")}
                    </div>
                    {logs.map((log) => (
                      <div key={log.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-sm, 12px)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text)" }}>
                          <span>{log.date} &middot; {log.trade}</span>
                          <span style={{ fontWeight: 600 }}>{log.qtyInstalled} {log.unit}</span>
                        </div>
                        <div style={{ color: "var(--text3)", marginTop: 2 }}>
                          {log.laborHours}h &middot; {log.crewSize} crew &middot; {log.enteredBy}
                        </div>
                        {log.notes && <div style={{ color: "var(--text2)", marginTop: 2, fontStyle: "italic" }}>{log.notes}</div>}
                      </div>
                    ))}
                  </>
                )}

                {/* Area notes */}
                {area.notes && (
                  <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", fontStyle: "italic", marginTop: 4 }}>
                    {area.notes}
                  </div>
                )}
              </div>
            )}
          </FieldCard>
        );
      })}
    </div>
  );
}
