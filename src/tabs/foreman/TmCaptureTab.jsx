// ═══════════════════════════════════════════════════════════════
//  EBC-OS · TmCaptureTab — Foreman T&M ticket capture
//  Props: { tmTickets, setTmTickets, projects, employees,
//           projectId, areas, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronUp, FileText, DollarSign, Camera, Trash2, Pencil, Download } from "lucide-react";
import { queueMutation } from "../../lib/offlineQueue";
import { FieldCard } from "../../components/field/FieldCard";
import { FieldButton } from "../../components/field/FieldButton";
import { FieldInput } from "../../components/field/FieldInput";
import { FieldSelect } from "../../components/field/FieldSelect";
import { SearchableSelect } from "../../components/field/SearchableSelect";
import { StatusBadge } from "../../components/field/StatusBadge";
import { StatTile } from "../../components/field/StatTile";
import { PhotoCapture } from "../../components/field/PhotoCapture";
import { FieldSignaturePad } from "../../components/field/FieldSignaturePad";

const TM_STATUS_BADGE = { draft: "badge-muted", submitted: "badge-amber", approved: "badge-green", billed: "badge-blue" };
const DEFAULT_RATE = 65;

function nextTicketNum(tickets) {
  const nums = tickets.map((t) => {
    const m = (t.ticketNumber || "").match(/TM-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `TM-${String(max + 1).padStart(3, "0")}`;
}

function calcLaborTotal(entries) {
  return entries.reduce((sum, e) => sum + (e.hours || 0) * (e.rate || 0), 0);
}

function calcMaterialTotal(entries) {
  return entries.reduce((sum, e) => {
    const base = (e.qty || 0) * (e.unitCost || 0);
    const markup = base * ((e.markup || 0) / 100);
    return sum + base + markup;
  }, 0);
}

export function TmCaptureTab({ tmTickets = [], setTmTickets, projects = [], employees = [], projectId, areas = [], setAreas, foreman, t }) {
  const tr = t || ((k) => k);
  // Cost visibility policy (ADR: foreman trustedLead flag).
  // Default: foremen do NOT see $ amounts, rates, markup — only scope, hours, crew, qty.
  // When trustedLead === true on the employee record, full cost fields are unhidden.
  // Note: underlying ticket data still stores rates/costs so the PM/office view is unaffected.
  const showCost = !!foreman?.trustedLead;

  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [pendingSignature, setPendingSignature] = useState(null);
  const [showBulkCrew, setShowBulkCrew] = useState(false);
  const [bulkCrewSelected, setBulkCrewSelected] = useState({});

  // Form state
  const [formDesc, setFormDesc] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formPhotos, setFormPhotos] = useState([]);
  const [formLabor, setFormLabor] = useState([]);
  const [formMaterials, setFormMaterials] = useState([]);

  const projectAreas = useMemo(
    () => areas.filter((a) => String(a.projectId) === String(projectId)),
    [areas, projectId]
  );

  const projectTickets = useMemo(
    () => tmTickets.filter((t) => String(t.projectId) === String(projectId) && t.status !== "deleted").sort((a, b) => b.date.localeCompare(a.date)),
    [tmTickets, projectId]
  );

  // ── Labor row helpers ──
  const addLaborRow = () => {
    setFormLabor((prev) => [...prev, { id: crypto.randomUUID(), employeeName: "", hours: 0, rate: DEFAULT_RATE, description: "" }]);
  };
  const updateLaborRow = (id, field, value) => {
    setFormLabor((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const removeLaborRow = (id) => {
    setFormLabor((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Bulk crew add (multi-select) ──
  const openBulkCrew = () => {
    // Pre-select nothing — but exclude those already on the ticket
    setBulkCrewSelected({});
    setShowBulkCrew(true);
  };
  const confirmBulkCrew = () => {
    const existing = new Set(formLabor.map((r) => r.employeeName).filter(Boolean));
    const picks = (employees || [])
      .filter((e) => e.active && bulkCrewSelected[e.id] && !existing.has(e.name));
    if (picks.length > 0) {
      setFormLabor((prev) => [
        ...prev,
        ...picks.map((e) => ({ id: crypto.randomUUID(), employeeName: e.name, hours: 0, rate: DEFAULT_RATE, description: "" })),
      ]);
    }
    setShowBulkCrew(false);
    setBulkCrewSelected({});
  };

  // ── Material row helpers ──
  const addMaterialRow = () => {
    setFormMaterials((prev) => [...prev, { id: crypto.randomUUID(), item: "", qty: 0, unit: "EA", unitCost: 0, markup: 10 }]);
  };
  const updateMaterialRow = (id, field, value) => {
    setFormMaterials((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const removeMaterialRow = (id) => {
    setFormMaterials((prev) => prev.filter((r) => r.id !== id));
  };

  const resetForm = () => {
    setFormDesc("");
    setFormNotes("");
    setFormArea("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormPhotos([]);
    setFormLabor([]);
    setFormMaterials([]);
    setEditingId(null);
    setShowForm(false);
    setShowSignature(false);
    setPendingSignature(null);
    setShowBulkCrew(false);
    setBulkCrewSelected({});
  };

  const startEdit = (ticket) => {
    setFormDesc(ticket.description || "");
    setFormNotes(ticket.notes || "");
    setFormArea(ticket.areaId || "");
    setFormDate(ticket.date || new Date().toISOString().slice(0, 10));
    setFormPhotos(ticket.photos || []);
    setFormLabor(ticket.laborEntries || []);
    setFormMaterials(ticket.materialEntries || []);
    setEditingId(ticket.id);
    setShowForm(true);
  };

  const handleDelete = (ticket) => {
    if (ticket.status !== "draft") return;
    if (!window.confirm(tr("Delete this T&M ticket?"))) return;
    // Soft-delete: preserve record with audit trail
    setTmTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: foreman?.name || "Foreman" } : t));
    queueMutation("tm_tickets", "update", { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: foreman?.name || "Foreman" }, { column: "id", value: ticket.id });
  };

  const commitSave = (asDraft, gcSignatureData) => {
    const now = new Date().toISOString();
    const areaObj = projectAreas.find((a) => a.id === formArea);
    const signatureFields = gcSignatureData
      ? { gcSignature: gcSignatureData, gcSignedAt: now }
      : {};

    if (editingId) {
      // Update existing ticket
      setTmTickets((prev) =>
        prev.map((t) => {
          if (t.id !== editingId) return t;
          return {
            ...t,
            date: formDate,
            status: asDraft ? "draft" : "submitted",
            description: formDesc.trim(),
            notes: formNotes.trim(),
            areaId: formArea || null,
            areaName: areaObj ? `${areaObj.name} (F${areaObj.floor} Z${areaObj.zone})` : "",
            photos: formPhotos,
            laborEntries: formLabor,
            materialEntries: formMaterials,
            submittedDate: asDraft ? t.submittedDate : now,
            ...signatureFields,
            auditTrail: [
              ...(t.auditTrail || []),
              { action: "edited", actor: "Foreman", at: now },
              ...(asDraft ? [] : [{ action: "submitted", actor: "Foreman", at: now }]),
            ],
          };
        })
      );
      queueMutation("tm_tickets", "update", {
        date: formDate, status: asDraft ? "draft" : "submitted",
        description: formDesc.trim(), notes: formNotes.trim(),
        areaId: formArea || null,
        areaName: areaObj ? `${areaObj.name} (F${areaObj.floor} Z${areaObj.zone})` : "",
        photos: formPhotos, laborEntries: formLabor, materialEntries: formMaterials,
        submittedDate: asDraft ? null : now, ...signatureFields,
      }, { column: "id", value: editingId });
    } else {
      // Create new ticket
      const ticket = {
        id: crypto.randomUUID(),
        projectId: Number(projectId),
        ticketNumber: nextTicketNum(tmTickets),
        date: formDate,
        status: asDraft ? "draft" : "submitted",
        description: formDesc.trim(),
        notes: formNotes.trim(),
        areaId: formArea || null,
        areaName: areaObj ? `${areaObj.name} (F${areaObj.floor} Z${areaObj.zone})` : "",
        photos: formPhotos,
        laborEntries: formLabor,
        materialEntries: formMaterials,
        submittedDate: asDraft ? null : now,
        approvedDate: null,
        billedDate: null,
        ...signatureFields,
        auditTrail: [
          { action: "created", actor: "Foreman", at: now },
          ...(asDraft ? [] : [{ action: "submitted", actor: "Foreman", at: now }]),
        ],
      };
      setTmTickets((prev) => [...prev, ticket]);
      queueMutation("tm_tickets", "insert", ticket);
    }
    resetForm();
  };

  const handleSave = (asDraft) => {
    if (!formDesc.trim()) return;
    if (asDraft) {
      commitSave(true, null);
    } else {
      // Show signature step before submitting
      setShowSignature(true);
    }
  };

  const handleSignatureConfirm = () => {
    commitSave(false, pendingSignature);
  };

  const handleSkipSignature = () => {
    commitSave(false, null);
  };

  const laborTotal = calcLaborTotal(formLabor);
  const matTotal = calcMaterialTotal(formMaterials);
  const grandTotal = laborTotal + matTotal;

  return (
    <div className="flex-col gap-sp4">
      {/* ── Summary ── */}
      <div className="gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
        <StatTile label={tr("Total Tickets")} value={projectTickets.length} t={t} />
        <StatTile label={tr("Drafts")} value={projectTickets.filter((t) => t.status === "draft").length} color="var(--text2)" t={t} />
        <StatTile label={tr("Submitted")} value={projectTickets.filter((t) => t.status === "submitted").length} color="var(--amber)" t={t} />
        <StatTile label={tr("Approved")} value={projectTickets.filter((t) => t.status === "approved").length} color="var(--green)" t={t} />
      </div>

      {/* ── New T&M button ── */}
      <FieldButton onClick={() => setShowForm(!showForm)} t={t}>
        <Plus size={14} className="mr-sp1" />
        {tr("New T&M Ticket")}
      </FieldButton>

      {/* ── Create Form ── */}
      {showForm && (
        <FieldCard>
          <div className="flex-col gap-sp3">
            <div className="fs-label fw-bold c-text">{editingId ? tr("Edit T&M Ticket") : tr("New T&M Ticket")}</div>

            <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
              <div style={{ flex: "1 1 120px" }}>
                <FieldInput label={tr("Date")} type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} t={t} />
              </div>
              <div style={{ flex: "2 1 200px" }}>
                <SearchableSelect
                  label={tr("Area")}
                  value={formArea}
                  onChange={(v) => setFormArea(v)}
                  options={projectAreas.map((a) => ({
                    value: a.id,
                    label: a.name,
                    sublabel: a.floor ? `F${a.floor}${a.zone ? ` · Z${a.zone}` : ""}` : "",
                  }))}
                  placeholder={tr("Select Area")}
                  searchPlaceholder={tr("Search or type new area…")}
                  onAddNew={setAreas ? (name) => {
                    const newArea = {
                      id: crypto.randomUUID(),
                      projectId: Number(projectId),
                      name,
                      floor: "",
                      zone: "",
                      type: "",
                      status: "not-started",
                      assignedTo: null,
                      laborBudgetHours: 0,
                      notes: "Added from T&M ticket",
                      scopeItems: [],
                    };
                    setAreas((prev) => [...(prev || []), newArea]);
                    setFormArea(newArea.id);
                  } : undefined}
                  addNewLabel={tr("Add area")}
                  t={t}
                />
              </div>
            </div>

            <FieldInput label={tr("Description")} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} t={t} />
            <FieldInput label={tr("Notes")} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} t={t} />

            {/* ── Labor Entries ── */}
            <div>
              <div className="mb-sp2 gap-sp2 flex-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="fs-tab fw-bold uppercase c-text2">{tr("Labor")}</span>
                <div className="gap-sp2" style={{ display: "flex" }}>
                  <FieldButton variant="ghost" onClick={openBulkCrew} t={t} className="fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}>
                    <Plus size={12} className="mr-sp1" />{tr("Add Crew")}
                  </FieldButton>
                  <FieldButton variant="ghost" onClick={addLaborRow} t={t} className="fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}>
                    <Plus size={12} className="mr-sp1" />{tr("Add Row")}
                  </FieldButton>
                </div>
              </div>

              {/* Bulk crew picker — inline expanded panel */}
              {showBulkCrew && (() => {
                const existing = new Set(formLabor.map((r) => r.employeeName).filter(Boolean));
                const pool = (employees || [])
                  .filter((e) => e.active && !existing.has(e.name))
                  .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                const selectedCount = Object.values(bulkCrewSelected).filter(Boolean).length;
                return (
                  <div className="rounded-control mb-sp3 p-sp3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div className="fw-bold mb-sp2 fs-tab uppercase c-text3">
                      {tr("Select crew")} ({selectedCount})
                    </div>
                    {pool.length === 0 ? (
                      <div className="fs-tab p-sp2 c-text3">
                        {tr("All active employees are already on this ticket.")}
                      </div>
                    ) : (
                      <div className="flex-col gap-sp1" style={{ maxHeight: 240, overflowY: "auto" }}>
                        {pool.map((e) => (
                          <label key={e.id} className="flex fs-card p-sp2 gap-sp2 c-text cursor-pointer">
                            <input type="checkbox"
                              checked={!!bulkCrewSelected[e.id]}
                              onChange={(ev) => setBulkCrewSelected((prev) => ({ ...prev, [e.id]: ev.target.checked }))} />
                            <span>{e.name}</span>
                            {e.role && <span className="fs-xs c-text3">— {e.role}</span>}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="mt-sp3 gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <FieldButton variant="ghost" onClick={() => { setShowBulkCrew(false); setBulkCrewSelected({}); }} t={t} className="fs-tab" style={{ padding: "var(--space-2) var(--space-3)" }}>
                        {tr("Cancel")}
                      </FieldButton>
                      <FieldButton onClick={confirmBulkCrew} t={t} className="fs-tab" style={{ padding: "var(--space-2) var(--space-3)" }} disabled={selectedCount === 0}>
                        {tr("Add")} {selectedCount > 0 ? `(${selectedCount})` : ""}
                      </FieldButton>
                    </div>
                  </div>
                );
              })()}
              {formLabor.map((row) => (
                <div key={row.id} className="mb-sp2 gap-sp2 flex-wrap" style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 140px" }}>
                    <SearchableSelect
                      value={row.employeeName}
                      onChange={(v) => updateLaborRow(row.id, "employeeName", v)}
                      options={employees
                        .filter((e) => e.active)
                        .map((e) => ({
                          value: e.name,
                          label: e.name,
                          sublabel: e.role || "",
                        }))}
                      placeholder={tr("Employee")}
                      searchPlaceholder={tr("Search employees…")}
                      t={t}
                    />
                  </div>
                  <div style={{ flex: "0 0 70px" }}>
                    <FieldInput label={tr("Hours")} type="number" inputMode="decimal" value={row.hours || ""} onChange={(e) => updateLaborRow(row.id, "hours", parseFloat(e.target.value) || 0)} t={t} />
                  </div>
                  {showCost && (
                    <div style={{ flex: "0 0 70px" }}>
                      <FieldInput label={tr("Rate")} type="number" inputMode="decimal" value={row.rate || ""} onChange={(e) => updateLaborRow(row.id, "rate", parseFloat(e.target.value) || 0)} t={t} />
                    </div>
                  )}
                  <div style={{ flex: "2 1 140px" }}>
                    <FieldInput label={tr("Description")} value={row.description} onChange={(e) => updateLaborRow(row.id, "description", e.target.value)} t={t} />
                  </div>
                  <button onClick={() => removeLaborRow(row.id)} className="p-sp1 c-red cursor-pointer" style={{ background: "none", border: "none" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {formLabor.length > 0 && showCost && (
                <div className="fs-tab fw-bold c-text text-right">
                  {tr("Labor Total")}: ${laborTotal.toFixed(2)}
                </div>
              )}
              {formLabor.length > 0 && !showCost && (
                <div className="fs-tab fw-bold c-text2 text-right">
                  {tr("Total Hours")}: {formLabor.reduce((s, r) => s + (r.hours || 0), 0).toFixed(1)}h
                </div>
              )}
            </div>

            {/* ── Material Entries ── */}
            <div>
              <div className="mb-sp2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="fs-tab fw-bold uppercase c-text2">{tr("Materials")}</span>
                <FieldButton variant="ghost" onClick={addMaterialRow} t={t} className="fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}>
                  <Plus size={12} className="mr-sp1" />{tr("Add Row")}
                </FieldButton>
              </div>
              {formMaterials.map((row) => (
                <div key={row.id} className="mb-sp2 gap-sp2 flex-wrap" style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 140px" }}>
                    <FieldInput label={tr("Item")} value={row.item} onChange={(e) => updateMaterialRow(row.id, "item", e.target.value)} t={t} />
                  </div>
                  <div style={{ flex: "0 0 60px" }}>
                    <FieldInput label={tr("Qty")} type="number" inputMode="decimal" value={row.qty || ""} onChange={(e) => updateMaterialRow(row.id, "qty", parseFloat(e.target.value) || 0)} t={t} />
                  </div>
                  <div style={{ flex: "0 0 60px" }}>
                    <FieldSelect label={tr("Unit")} value={row.unit} onChange={(e) => updateMaterialRow(row.id, "unit", e.target.value)} t={t}>
                      {["EA", "LF", "SF", "SHT", "ROLL", "BAG", "BKT", "GAL", "BOX", "LOAD"].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </FieldSelect>
                  </div>
                  {showCost && (
                    <div style={{ flex: "0 0 70px" }}>
                      <FieldInput label={tr("$/Unit")} type="number" inputMode="decimal" value={row.unitCost || ""} onChange={(e) => updateMaterialRow(row.id, "unitCost", parseFloat(e.target.value) || 0)} t={t} />
                    </div>
                  )}
                  {showCost && (
                    <div style={{ flex: "0 0 60px" }}>
                      <FieldInput label={tr("Markup%")} type="number" inputMode="decimal" value={row.markup ?? ""} onChange={(e) => updateMaterialRow(row.id, "markup", parseFloat(e.target.value) || 0)} t={t} />
                    </div>
                  )}
                  <button onClick={() => removeMaterialRow(row.id)} className="p-sp1 c-red cursor-pointer" style={{ background: "none", border: "none" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {formMaterials.length > 0 && showCost && (
                <div className="fs-tab fw-bold c-text text-right">
                  {tr("Material Total")}: ${matTotal.toFixed(2)}
                </div>
              )}
            </div>

            <PhotoCapture photos={formPhotos} onPhotos={setFormPhotos} t={t} uploadContext={{ context: "tm", projectId }} />

            {/* ── Totals ── */}
            {showCost ? (
              <div className="fs-label fw-bold bg-bg3" style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm, 6px)", display: "flex", justifyContent: "space-between" }}>
                <span>{tr("Grand Total")}</span>
                <span className="c-amber">${grandTotal.toFixed(2)}</span>
              </div>
            ) : (
              <div className="fs-tab bg-bg3 c-text2" style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm, 6px)", fontStyle: "italic" }}>
                {tr("Office will price and finalize this ticket. Focus on capturing scope, hours, crew, and materials accurately.")}
              </div>
            )}

            {/* ── Actions ── */}
            {!showSignature && (
              <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
                <FieldButton variant="ghost" onClick={resetForm} t={t}>{tr("Cancel")}</FieldButton>
                <FieldButton variant="ghost" onClick={() => handleSave(true)} disabled={!formDesc.trim()} t={t}>{editingId ? tr("Update Draft") : tr("Save Draft")}</FieldButton>
                <FieldButton onClick={() => handleSave(false)} disabled={!formDesc.trim()} t={t}>{editingId ? tr("Update & Submit") : tr("Submit")}</FieldButton>
              </div>
            )}

            {/* ── GC Signature Step ── */}
            {showSignature && (
              <div className="flex-col p-sp3 bg-bg3 gap-sp3" style={{ borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--border)" }}>
                <div className="fs-label fw-bold c-text">{tr("GC Acknowledgment Signature")}</div>
                <div className="fs-tab c-text2">{tr("Have the GC sign below to acknowledge this T&M ticket, or skip if unavailable.")}</div>
                <FieldSignaturePad
                  onSignature={(dataUrl) => setPendingSignature(dataUrl)}
                  t={t}
                />
                <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <FieldButton variant="ghost" onClick={() => { setShowSignature(false); setPendingSignature(null); }} t={t}>{tr("Back")}</FieldButton>
                  <FieldButton variant="ghost" onClick={handleSkipSignature} t={t}>{tr("Submit Without GC Signature")}</FieldButton>
                  <FieldButton onClick={handleSignatureConfirm} disabled={!pendingSignature} t={t}>{tr("Confirm & Submit")}</FieldButton>
                </div>
              </div>
            )}
          </div>
        </FieldCard>
      )}

      {/* ── Existing Tickets ── */}
      {projectTickets.length === 0 && !showForm && (
        <FieldCard>
          <div className="p-sp6 c-text3 text-center">
            <FileText size={32} className="mb-sp2" style={{ opacity: 0.4 }} />
            <div>{tr("No T&M tickets yet")}</div>
          </div>
        </FieldCard>
      )}

      {projectTickets.map((ticket) => {
        const isExpanded = expandedId === ticket.id;
        const tLabor = calcLaborTotal(ticket.laborEntries || []);
        const tMat = calcMaterialTotal(ticket.materialEntries || []);

        return (
          <FieldCard key={ticket.id}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
              className="flex-between gap-sp2 cursor-pointer"
            >
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="flex gap-sp2 flex-wrap">
                  <span className="fs-label fw-bold c-text">{ticket.ticketNumber}</span>
                  <span className={`badge ${TM_STATUS_BADGE[ticket.status] || "badge-muted"}`}>{tr(ticket.status)}</span>
                </div>
                <div className="fs-tab mt-sp1 c-text2">
                  {ticket.date} &middot; {ticket.description.length > 60 ? ticket.description.slice(0, 60) + "..." : ticket.description}
                </div>
              </div>
              <div className="flex gap-sp2">
                {showCost ? (
                  <span className="fs-tab fw-bold c-amber">${(tLabor + tMat).toFixed(0)}</span>
                ) : (() => {
                    const hrs = (ticket.laborEntries || []).reduce((s, r) => s + (r.hours || 0), 0);
                    const mats = (ticket.materialEntries || []).length;
                    const parts = [];
                    if (hrs > 0) parts.push(`${hrs.toFixed(1)}h`);
                    if (mats > 0) parts.push(`${mats} ${mats === 1 ? tr("item") : tr("items")}`);
                    return (
                      <span className="fs-tab fw-bold c-text2">
                        {parts.length ? parts.join(" · ") : "—"}
                      </span>
                    );
                  })()}
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {isExpanded && (
              <div className="flex-col fs-tab mt-sp3 gap-sp2">
                <div className="c-text">{ticket.description}</div>
                {ticket.notes && <div className="c-text2" style={{ fontStyle: "italic" }}>{ticket.notes}</div>}

                {/* Labor */}
                {(ticket.laborEntries || []).length > 0 && (
                  <div>
                    <div className="fw-bold mb-sp1 uppercase c-text2">{tr("Labor")}</div>
                    {ticket.laborEntries.map((le, i) => (
                      <div key={i} className="border-b" style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-1) 0" }}>
                        <span>{le.employeeName} &middot; {le.description}</span>
                        {showCost ? (
                          <span>{le.hours}h x ${le.rate} = ${(le.hours * le.rate).toFixed(2)}</span>
                        ) : (
                          <span>{le.hours}h</span>
                        )}
                      </div>
                    ))}
                    {showCost ? (
                      <div className="fw-bold mt-sp1 text-right">{tr("Labor")}: ${tLabor.toFixed(2)}</div>
                    ) : (
                      <div className="fw-bold mt-sp1 c-text2 text-right">
                        {tr("Total Hours")}: {ticket.laborEntries.reduce((s, r) => s + (r.hours || 0), 0).toFixed(1)}h
                      </div>
                    )}
                  </div>
                )}

                {/* Materials */}
                {(ticket.materialEntries || []).length > 0 && (
                  <div>
                    <div className="fw-bold mb-sp1 uppercase c-text2">{tr("Materials")}</div>
                    {ticket.materialEntries.map((me, i) => {
                      const base = (me.qty || 0) * (me.unitCost || 0);
                      const mkup = base * ((me.markup || 0) / 100);
                      return (
                        <div key={i} className="border-b" style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-1) 0" }}>
                          <span>{me.item} ({me.qty} {me.unit})</span>
                          {showCost && (
                            <span>${(base + mkup).toFixed(2)}{me.markup ? ` (+${me.markup}%)` : ""}</span>
                          )}
                        </div>
                      );
                    })}
                    {showCost && (
                      <div className="fw-bold mt-sp1 text-right">{tr("Materials")}: ${tMat.toFixed(2)}</div>
                    )}
                  </div>
                )}

                {/* Grand total — only visible to trusted leads */}
                {showCost && (
                  <div className="fs-label fw-bold" style={{ padding: "var(--space-2) 0", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                    <span>{tr("Total")}</span>
                    <span className="c-amber">${(tLabor + tMat).toFixed(2)}</span>
                  </div>
                )}

                {/* Photos */}
                {(ticket.photos || []).length > 0 && (
                  <div className="gap-sp1 flex-wrap" style={{ display: "flex" }}>
                    {ticket.photos.map((p, i) => (
                      <div key={i} className="overflow-hidden" style={{ width: 48, height: 48, borderRadius: "var(--radius-sm, 4px)" }}>
                        <img src={p.data} alt={p.name || "photo"} className="h-full w-full" style={{ objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit / Delete actions (draft only) */}
                {ticket.status === "draft" && (
                  <div className="mt-sp1 gap-sp2" style={{ display: "flex" }}>
                    <FieldButton variant="ghost" onClick={() => startEdit(ticket)} t={t} className="fs-tab" style={{ padding: "var(--space-1) var(--space-3)" }}>
                      <Pencil size={12} className="mr-sp1" />{tr("Edit")}
                    </FieldButton>
                    <FieldButton variant="ghost" onClick={() => handleDelete(ticket)} t={t} className="fs-tab c-red" style={{ padding: "var(--space-1) var(--space-3)" }}>
                      <Trash2 size={12} className="mr-sp1" />{tr("Delete")}
                    </FieldButton>
                  </div>
                )}

                {/* Generate PDF (submitted/approved/billed) */}
                {ticket.status !== "draft" && (
                  <div className="mt-sp1">
                    <FieldButton variant="ghost" onClick={async () => {
                      const { generateTmTicketPdf } = await import("../../utils/tmTicketPdf");
                      const proj = projects.find(p => String(p.id) === String(ticket.projectId || projectId));
                      generateTmTicketPdf(ticket, proj);
                    }} t={t} className="fs-tab" style={{ padding: "var(--space-1) var(--space-3)" }}>
                      <Download size={12} className="mr-sp1" />{tr("Download PDF")}
                    </FieldButton>
                  </div>
                )}

                {/* GC Signature */}
                {ticket.gcSignature && (
                  <div className="mt-sp1">
                    <div className="fs-tab fw-bold mb-sp1 uppercase c-text2">{tr("GC Signature")}</div>
                    <img src={ticket.gcSignature} alt={tr("GC Signature")} style={{ maxWidth: 200, height: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm, 4px)" }} />
                    {ticket.gcSignedAt && (
                      <div className="mt-sp1 c-text3" style={{ fontSize: "var(--text-xs, 11px)" }}>{tr("Signed")}: {new Date(ticket.gcSignedAt).toLocaleString()}</div>
                    )}
                  </div>
                )}

                {/* Audit trail */}
                {(ticket.auditTrail || []).length > 0 && (
                  <div className="mt-sp1">
                    <div className="fw-bold mb-sp1 uppercase c-text2">{tr("Audit Trail")}</div>
                    {ticket.auditTrail.map((a, i) => (
                      <div key={i} className="c-text3" style={{ fontSize: "var(--text-xs, 11px)" }}>
                        {a.action} by {a.actor} &middot; {new Date(a.at).toLocaleString()}
                      </div>
                    ))}
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
