// ═══════════════════════════════════════════════════════════════
//  EBC-OS · TmCaptureTab — Foreman T&M ticket capture
//  Props: { tmTickets, setTmTickets, projects, employees,
//           projectId, areas, t }
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronUp, FileText, DollarSign, Camera, Trash2 } from "lucide-react";
import { FieldCard } from "../../components/field/FieldCard";
import { FieldButton } from "../../components/field/FieldButton";
import { FieldInput } from "../../components/field/FieldInput";
import { FieldSelect } from "../../components/field/FieldSelect";
import { StatusBadge } from "../../components/field/StatusBadge";
import { StatTile } from "../../components/field/StatTile";
import { PhotoCapture } from "../../components/field/PhotoCapture";

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

export function TmCaptureTab({ tmTickets = [], setTmTickets, projects = [], employees = [], projectId, areas = [], t }) {
  const tr = t || ((k) => k);

  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
    () => tmTickets.filter((t) => String(t.projectId) === String(projectId)).sort((a, b) => b.date.localeCompare(a.date)),
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
    setShowForm(false);
  };

  const handleSave = (asDraft) => {
    if (!formDesc.trim()) return;
    const now = new Date().toISOString();
    const ticket = {
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      ticketNumber: nextTicketNum(tmTickets),
      date: formDate,
      status: asDraft ? "draft" : "submitted",
      description: formDesc.trim(),
      notes: formNotes.trim(),
      photos: formPhotos,
      laborEntries: formLabor,
      materialEntries: formMaterials,
      submittedDate: asDraft ? null : now,
      approvedDate: null,
      billedDate: null,
      auditTrail: [
        { action: "created", actor: "Foreman", at: now },
        ...(asDraft ? [] : [{ action: "submitted", actor: "Foreman", at: now }]),
      ],
    };
    setTmTickets((prev) => [...prev, ticket]);
    resetForm();
  };

  const laborTotal = calcLaborTotal(formLabor);
  const matTotal = calcMaterialTotal(formMaterials);
  const grandTotal = laborTotal + matTotal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
        <StatTile label={tr("Total Tickets")} value={projectTickets.length} t={t} />
        <StatTile label={tr("Drafts")} value={projectTickets.filter((t) => t.status === "draft").length} color="var(--text2)" t={t} />
        <StatTile label={tr("Submitted")} value={projectTickets.filter((t) => t.status === "submitted").length} color="var(--amber)" t={t} />
        <StatTile label={tr("Approved")} value={projectTickets.filter((t) => t.status === "approved").length} color="var(--green)" t={t} />
      </div>

      {/* ── New T&M button ── */}
      <FieldButton onClick={() => setShowForm(!showForm)} t={t}>
        <Plus size={14} style={{ marginRight: 4 }} />
        {tr("New T&M Ticket")}
      </FieldButton>

      {/* ── Create Form ── */}
      {showForm && (
        <FieldCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{tr("New T&M Ticket")}</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 120px" }}>
                <FieldInput label={tr("Date")} type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} t={t} />
              </div>
              <div style={{ flex: "2 1 200px" }}>
                <FieldSelect label={tr("Area")} value={formArea} onChange={(e) => setFormArea(e.target.value)} t={t}>
                  <option value="">{tr("Select Area")}</option>
                  {projectAreas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} (F{a.floor})</option>
                  ))}
                </FieldSelect>
              </div>
            </div>

            <FieldInput label={tr("Description")} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} t={t} />
            <FieldInput label={tr("Notes")} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} t={t} />

            {/* ── Labor Entries ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: "var(--text-sm, 12px)", color: "var(--text2)", textTransform: "uppercase" }}>{tr("Labor")}</span>
                <FieldButton variant="ghost" onClick={addLaborRow} t={t} style={{ padding: "4px 8px", fontSize: "var(--text-sm, 12px)" }}>
                  <Plus size={12} style={{ marginRight: 2 }} />{tr("Add Row")}
                </FieldButton>
              </div>
              {formLabor.map((row) => (
                <div key={row.id} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 140px" }}>
                    <FieldSelect value={row.employeeName} onChange={(e) => updateLaborRow(row.id, "employeeName", e.target.value)} t={t}>
                      <option value="">{tr("Employee")}</option>
                      {employees.filter((e) => e.active).map((e) => (
                        <option key={e.id} value={e.name}>{e.name}</option>
                      ))}
                    </FieldSelect>
                  </div>
                  <div style={{ flex: "0 0 70px" }}>
                    <FieldInput label={tr("Hours")} type="number" inputMode="decimal" value={row.hours || ""} onChange={(e) => updateLaborRow(row.id, "hours", parseFloat(e.target.value) || 0)} t={t} />
                  </div>
                  <div style={{ flex: "0 0 70px" }}>
                    <FieldInput label={tr("Rate")} type="number" inputMode="decimal" value={row.rate || ""} onChange={(e) => updateLaborRow(row.id, "rate", parseFloat(e.target.value) || 0)} t={t} />
                  </div>
                  <div style={{ flex: "2 1 140px" }}>
                    <FieldInput label={tr("Description")} value={row.description} onChange={(e) => updateLaborRow(row.id, "description", e.target.value)} t={t} />
                  </div>
                  <button onClick={() => removeLaborRow(row.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {formLabor.length > 0 && (
                <div style={{ textAlign: "right", fontSize: "var(--text-sm, 12px)", fontWeight: 700, color: "var(--text)" }}>
                  {tr("Labor Total")}: ${laborTotal.toFixed(2)}
                </div>
              )}
            </div>

            {/* ── Material Entries ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: "var(--text-sm, 12px)", color: "var(--text2)", textTransform: "uppercase" }}>{tr("Materials")}</span>
                <FieldButton variant="ghost" onClick={addMaterialRow} t={t} style={{ padding: "4px 8px", fontSize: "var(--text-sm, 12px)" }}>
                  <Plus size={12} style={{ marginRight: 2 }} />{tr("Add Row")}
                </FieldButton>
              </div>
              {formMaterials.map((row) => (
                <div key={row.id} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
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
                  <div style={{ flex: "0 0 70px" }}>
                    <FieldInput label={tr("$/Unit")} type="number" inputMode="decimal" value={row.unitCost || ""} onChange={(e) => updateMaterialRow(row.id, "unitCost", parseFloat(e.target.value) || 0)} t={t} />
                  </div>
                  <div style={{ flex: "0 0 60px" }}>
                    <FieldInput label={tr("Markup%")} type="number" inputMode="decimal" value={row.markup ?? ""} onChange={(e) => updateMaterialRow(row.id, "markup", parseFloat(e.target.value) || 0)} t={t} />
                  </div>
                  <button onClick={() => removeMaterialRow(row.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {formMaterials.length > 0 && (
                <div style={{ textAlign: "right", fontSize: "var(--text-sm, 12px)", fontWeight: 700, color: "var(--text)" }}>
                  {tr("Material Total")}: ${matTotal.toFixed(2)}
                </div>
              )}
            </div>

            <PhotoCapture photos={formPhotos} onPhotos={setFormPhotos} t={t} />

            {/* ── Totals ── */}
            <div style={{ padding: "8px 12px", background: "var(--bg3)", borderRadius: "var(--radius-sm, 6px)", display: "flex", justifyContent: "space-between", fontSize: "var(--text-base, 14px)", fontWeight: 700 }}>
              <span>{tr("Grand Total")}</span>
              <span style={{ color: "var(--amber)" }}>${grandTotal.toFixed(2)}</span>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <FieldButton variant="ghost" onClick={resetForm} t={t}>{tr("Cancel")}</FieldButton>
              <FieldButton variant="ghost" onClick={() => handleSave(true)} disabled={!formDesc.trim()} t={t}>{tr("Save Draft")}</FieldButton>
              <FieldButton onClick={() => handleSave(false)} disabled={!formDesc.trim()} t={t}>{tr("Submit")}</FieldButton>
            </div>
          </div>
        </FieldCard>
      )}

      {/* ── Existing Tickets ── */}
      {projectTickets.length === 0 && !showForm && (
        <FieldCard>
          <div style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>
            <FileText size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
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
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "var(--text-base, 14px)", color: "var(--text)" }}>{ticket.ticketNumber}</span>
                  <span className={`badge ${TM_STATUS_BADGE[ticket.status] || "badge-muted"}`}>{tr(ticket.status)}</span>
                </div>
                <div style={{ fontSize: "var(--text-sm, 12px)", color: "var(--text2)", marginTop: 2 }}>
                  {ticket.date} &middot; {ticket.description.length > 60 ? ticket.description.slice(0, 60) + "..." : ticket.description}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-sm, 12px)", fontWeight: 700, color: "var(--amber)" }}>${(tLabor + tMat).toFixed(0)}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--text-sm, 12px)" }}>
                <div style={{ color: "var(--text)" }}>{ticket.description}</div>
                {ticket.notes && <div style={{ color: "var(--text2)", fontStyle: "italic" }}>{ticket.notes}</div>}

                {/* Labor */}
                {(ticket.laborEntries || []).length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", marginBottom: 4 }}>{tr("Labor")}</div>
                    {ticket.laborEntries.map((le, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid var(--border)" }}>
                        <span>{le.employeeName} &middot; {le.description}</span>
                        <span>{le.hours}h x ${le.rate} = ${(le.hours * le.rate).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ textAlign: "right", fontWeight: 700, marginTop: 2 }}>{tr("Labor")}: ${tLabor.toFixed(2)}</div>
                  </div>
                )}

                {/* Materials */}
                {(ticket.materialEntries || []).length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", marginBottom: 4 }}>{tr("Materials")}</div>
                    {ticket.materialEntries.map((me, i) => {
                      const base = (me.qty || 0) * (me.unitCost || 0);
                      const mkup = base * ((me.markup || 0) / 100);
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid var(--border)" }}>
                          <span>{me.item} ({me.qty} {me.unit})</span>
                          <span>${(base + mkup).toFixed(2)}{me.markup ? ` (+${me.markup}%)` : ""}</span>
                        </div>
                      );
                    })}
                    <div style={{ textAlign: "right", fontWeight: 700, marginTop: 2 }}>{tr("Materials")}: ${tMat.toFixed(2)}</div>
                  </div>
                )}

                {/* Grand total */}
                <div style={{ padding: "6px 0", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "var(--text-base, 14px)" }}>
                  <span>{tr("Total")}</span>
                  <span style={{ color: "var(--amber)" }}>${(tLabor + tMat).toFixed(2)}</span>
                </div>

                {/* Photos */}
                {(ticket.photos || []).length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ticket.photos.map((p, i) => (
                      <div key={i} style={{ width: 48, height: 48, borderRadius: "var(--radius-sm, 4px)", overflow: "hidden" }}>
                        <img src={p.data} alt={p.name || "photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Audit trail */}
                {(ticket.auditTrail || []).length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", marginBottom: 4 }}>{tr("Audit Trail")}</div>
                    {ticket.auditTrail.map((a, i) => (
                      <div key={i} style={{ color: "var(--text3)", fontSize: "var(--text-xs, 11px)" }}>
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
