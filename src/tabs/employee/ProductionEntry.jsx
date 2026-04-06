// ═══════════════════════════════════════════════════════════════
//  EBC-OS · ProductionEntry — Simplified crew production logging
//  Phone-optimized: large text, large buttons, minimal fields
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { PhotoCapture } from "../../components/field/PhotoCapture";
import { FieldInput } from "../../components/field/FieldInput";
import { FieldButton } from "../../components/field/FieldButton";
import { FieldSelect } from "../../components/field/FieldSelect";
import { CheckCircle } from "lucide-react";

export function ProductionEntry({
  productionLogs,
  setProductionLogs,
  areas,
  schedule,
  employeeId,
  employeeName,
  projectId,
  t,
}) {
  const tr = t || ((k) => k);

  const [selectedScopeIdx, setSelectedScopeIdx] = useState(null);
  const [qty, setQty] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [manualAreaId, setManualAreaId] = useState("");

  // Auto-detect assigned area from today's schedule
  const todayStr = new Date().toISOString().slice(0, 10);
  const assignedEntry = useMemo(() => {
    if (!schedule || !Array.isArray(schedule)) return null;
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    return schedule.find(
      (s) =>
        String(s.employeeId) === String(employeeId) &&
        s.areaId &&
        (s.days?.[todayKey] || s.date?.slice(0, 10) === todayStr)
    );
  }, [schedule, employeeId, todayStr]);

  const currentArea = useMemo(() => {
    const areaId = assignedEntry?.areaId || manualAreaId;
    if (!areaId || !areas) return null;
    return areas.find((a) => a.id === areaId);
  }, [assignedEntry, manualAreaId, areas]);

  // Areas available for manual selection (filtered to employee's project)
  const projectAreas = useMemo(() => {
    if (!areas) return [];
    return areas.filter((a) => String(a.projectId) === String(projectId));
  }, [areas, projectId]);

  const scopeItems = currentArea?.scopeItems || [];

  // Today's logs for this employee
  const todaysLogs = useMemo(() => {
    if (!productionLogs) return [];
    return productionLogs.filter(
      (log) =>
        log.employeeId === employeeId &&
        log.loggedAt?.slice(0, 10) === todayStr
    );
  }, [productionLogs, employeeId, todayStr]);

  const handleSubmit = () => {
    if (selectedScopeIdx === null || !qty || Number(qty) <= 0) return;
    setSaving(true);

    const scopeItem = scopeItems[selectedScopeIdx];
    const entry = {
      id: crypto.randomUUID(),
      employeeId,
      employeeName: employeeName || "Unknown",
      projectId: projectId || currentArea?.projectId || null,
      areaId: currentArea?.id || null,
      areaName: currentArea?.name || "",
      scopeItem: scopeItem?.name || "",
      unit: scopeItem?.unit || "ea",
      qtyInstalled: Number(qty),
      budgetQty: scopeItem?.budgetQty || null,
      photos,
      loggedAt: new Date().toISOString(),
    };

    setProductionLogs((prev) => [...prev, entry]);

    // Calculate running total for this scope item
    const priorQty = todaysLogs
      .filter((l) => l.scopeItem === scopeItem?.name)
      .reduce((sum, l) => sum + (l.qtyInstalled || 0), 0);
    const totalInstalled = priorQty + Number(qty);

    setConfirmation({
      scopeItem: scopeItem?.name,
      qty: Number(qty),
      unit: scopeItem?.unit || "ea",
      totalInstalled,
      budgetQty: scopeItem?.budgetQty || null,
    });

    // Reset form — keep last scope item selected for repeat entries
    // setSelectedScopeIdx(null); // intentionally NOT reset — crew often logs same item multiple times
    setQty("");
    setPhotos([]);
    setSaving(false);

    // Clear confirmation after 4 seconds
    setTimeout(() => setConfirmation(null), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Area header */}
      {currentArea ? (
        <div
          style={{
            background: "var(--bg3)",
            borderRadius: 12,
            padding: "14px 16px",
            borderLeft: "4px solid var(--accent, #3b82f6)",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-lg, 16px)",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {currentArea.name}
          </div>
          <div
            style={{
              fontSize: "var(--text-sm, 12px)",
              color: "var(--text2)",
              marginTop: 2,
            }}
          >
            {tr("Floor")} {currentArea.floor} &middot; {tr("Zone")}{" "}
            {currentArea.zone}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg3)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ color: "var(--text2)", fontSize: "var(--text-sm, 12px)", marginBottom: 8 }}>
            {tr("No area assigned for today")}
          </div>
          <FieldSelect
            label={tr("Select your area")}
            value={manualAreaId}
            onChange={(e) => { setManualAreaId(e.target.value); setSelectedScopeIdx(null); }}
            t={tr}
          >
            <option value="">{tr("Select Area")}</option>
            {projectAreas.map((a) => (
              <option key={a.id} value={a.id}>{a.name} (F{a.floor} Z{a.zone})</option>
            ))}
          </FieldSelect>
        </div>
      )}

      {/* Confirmation banner */}
      {confirmation && (
        <div
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid var(--green, #22c55e)",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CheckCircle size={22} color="var(--green, #22c55e)" />
          <div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--green, #22c55e)",
                fontSize: "var(--text-base, 14px)",
              }}
            >
              {tr("Logged!")} {confirmation.qty} {confirmation.unit}
            </div>
            <div
              style={{
                fontSize: "var(--text-sm, 12px)",
                color: "var(--text2)",
                marginTop: 2,
              }}
            >
              {confirmation.scopeItem} &mdash; {confirmation.totalInstalled}
              {confirmation.budgetQty
                ? ` / ${confirmation.budgetQty}`
                : ""}{" "}
              {confirmation.unit} {tr("total")}
            </div>
          </div>
        </div>
      )}

      {/* Scope item selector (buttons) */}
      {scopeItems.length > 0 && (
        <div>
          <label
            className="form-label"
            style={{ marginBottom: 8, display: "block" }}
          >
            {tr("What did you install?")}
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {scopeItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedScopeIdx(idx)}
                style={{
                  padding: "14px 10px",
                  borderRadius: 10,
                  border:
                    selectedScopeIdx === idx
                      ? "2px solid var(--accent, #3b82f6)"
                      : "2px solid var(--border)",
                  background:
                    selectedScopeIdx === idx
                      ? "rgba(59,130,246,0.12)"
                      : "var(--bg3)",
                  color:
                    selectedScopeIdx === idx
                      ? "var(--accent, #3b82f6)"
                      : "var(--text2)",
                  fontWeight: selectedScopeIdx === idx ? 700 : 500,
                  fontSize: "var(--text-base, 14px)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {tr(item.name)}
                {item.unit && (
                  <div
                    style={{
                      fontSize: "var(--text-xs, 11px)",
                      color: "var(--text3)",
                      marginTop: 2,
                    }}
                  >
                    {item.unit}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Qty input */}
      <FieldInput
        label={tr("Qty Installed")}
        type="number"
        inputMode="numeric"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="0"
        min="0"
        style={{ fontSize: "var(--text-lg, 16px)", minHeight: 60 }}
        t={tr}
      />

      {/* Photo capture */}
      <PhotoCapture
        photos={photos}
        onPhotos={setPhotos}
        label={tr("Photo (optional)")}
        t={tr}
      />

      {/* Submit */}
      <FieldButton
        onClick={handleSubmit}
        disabled={selectedScopeIdx === null || !qty || Number(qty) <= 0}
        loading={saving}
        style={{
          fontSize: "var(--text-lg, 16px)",
          minHeight: 56,
          fontWeight: 700,
        }}
        t={tr}
      >
        {tr("Log Production")}
      </FieldButton>

      {/* Today's entries */}
      {todaysLogs.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <label
            className="form-label"
            style={{ marginBottom: 8, display: "block" }}
          >
            {tr("Today's Entries")}
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todaysLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: "var(--bg3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "var(--text-base, 14px)",
                      color: "var(--text)",
                    }}
                  >
                    {log.scopeItem}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-sm, 12px)",
                      color: "var(--text3)",
                    }}
                  >
                    {log.areaName} &middot;{" "}
                    {new Date(log.loggedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "var(--text-lg, 16px)",
                    color: "var(--accent, #3b82f6)",
                  }}
                >
                  {log.qtyInstalled} {log.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
