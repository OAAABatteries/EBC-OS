import { useState, useMemo } from "react";
import { Wrench, AlertTriangle } from "lucide-react";
import { T } from "../../data/translations";
import { EQUIPMENT_TYPES } from "../../data/calendarConstants";

// ═══════════════════════════════════════════════════════════
//  CalendarEquipment — Equipment scheduling & booking
//  Equipment inventory, bookings, availability matrix
// ═══════════════════════════════════════════════════════════

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getMonday(d) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0, 0, 0, 0); return r;
}

export function CalendarEquipment({ app, lang }) {
  const {
    equipment, setEquipment, equipmentBookings, setEquipmentBookings,
    projects, show,
  } = app;

  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);

  const [subView, setSubView] = useState("bookings"); // bookings | availability | newBooking | inventory
  const [form, setForm] = useState({ equipmentId: "", projectId: "", startDate: "", endDate: "", notes: "" });
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Equipment Optimizer state ──
  const [eqOptResult, setEqOptResult] = useState(null);
  const [eqOptLoading, setEqOptLoading] = useState(false);
  const [showEqOpt, setShowEqOpt] = useState(false);

  const runEqOptimize = async () => {
    if (!app.apiKey) { show("Set API key in Settings first"); return; }
    setEqOptLoading(true);
    setEqOptResult(null);
    try {
      const { optimizeEquipmentUtil } = await import("../../utils/api.js");
      const res = await optimizeEquipmentUtil(app.apiKey, equipment, equipmentBookings?.slice(0, 25), projects?.slice(0, 10));
      setEqOptResult(res);
      setShowEqOpt(true);
      show("Equipment analysis complete");
    } catch (e) {
      show(e.message);
    } finally {
      setEqOptLoading(false);
    }
  };

  const projName = (id) => (projects || []).find(p => String(p.id) === String(id))?.name || `#${id}`;

  // Active bookings
  const activeBookings = useMemo(() =>
    (equipmentBookings || []).filter(b => b.status === "confirmed").sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [equipmentBookings]
  );

  // Availability matrix — 2 weeks
  const monday = addDays(getMonday(new Date()), weekOffset * 7);
  const days = Array.from({ length: 14 }, (_, i) => addDays(monday, i));

  const isBooked = (eqId, dateStr) => {
    return activeBookings.some(b => b.equipmentId === eqId && dateStr >= b.startDate && dateStr <= b.endDate);
  };

  const getBooking = (eqId, dateStr) => {
    return activeBookings.find(b => b.equipmentId === eqId && dateStr >= b.startDate && dateStr <= b.endDate);
  };

  // Check for conflicts
  const hasConflict = (eqId, startDate, endDate) => {
    return activeBookings.some(b =>
      b.equipmentId === eqId && b.startDate <= endDate && b.endDate >= startDate
    );
  };

  // Book equipment
  const bookEquipment = () => {
    if (!form.equipmentId || !form.projectId || !form.startDate || !form.endDate) return;
    if (hasConflict(form.equipmentId, form.startDate, form.endDate)) {
      show("Conflict: equipment already booked for those dates");
      return;
    }
    const newBooking = {
      id: crypto.randomUUID(),
      equipmentId: form.equipmentId,
      projectId: Number(form.projectId),
      startDate: form.startDate,
      endDate: form.endDate,
      status: "confirmed",
      bookedBy: "admin",
      bookedAt: new Date().toISOString(),
      notes: form.notes,
    };
    setEquipmentBookings(prev => [...prev, newBooking]);
    setForm({ equipmentId: "", projectId: "", startDate: "", endDate: "", notes: "" });
    setSubView("bookings");
    show("Equipment booked");
  };

  // Cancel booking
  const cancelBooking = (id) => {
    setEquipmentBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    show("Booking cancelled");
  };

  return (
    <div className="cal-equipment">
      {/* Sub-nav */}
      <div className="cal-pto-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="gap-sp1" style={{ display: "flex" }}>
          {[
            { key: "bookings", label: "Bookings" },
            { key: "availability", label: "Availability" },
            { key: "newBooking", label: "+ Book Equipment" },
            { key: "inventory", label: "Inventory" },
          ].map(item => (
            <button key={item.key} className={`cal-nav-btn${subView === item.key ? " active" : ""}`} onClick={() => setSubView(item.key)}>
              {t(item.label)}
            </button>
          ))}
        </div>
        <button className="primary fs-tab" style={{ padding: "var(--space-1) var(--space-3)" }} onClick={eqOptLoading ? undefined : () => showEqOpt ? setShowEqOpt(false) : eqOptResult ? setShowEqOpt(true) : runEqOptimize()} disabled={eqOptLoading}>
          {eqOptLoading ? "Analyzing..." : "AI Optimize"}
        </button>
      </div>

      {/* AI Equipment Optimizer Panel */}
      {showEqOpt && eqOptResult && (
        <div className="mb-sp4 p-sp4" style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div className="mb-sp3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="flex gap-sp3">
              <Wrench style={{ width: 22, height: 22 }} />
              <div>
                <div className="fs-secondary fw-bold">Utilization: {eqOptResult.utilizationScore}/100 ({eqOptResult.grade})</div>
                <div className="fs-label c-text3">{eqOptResult.summary}</div>
              </div>
            </div>
            <button className="fs-card c-text3 cursor-pointer" style={{ background: "none", border: "none" }} onClick={() => setShowEqOpt(false)}>✕</button>
          </div>

          {eqOptResult.underutilized?.length > 0 && (
            <div className="mb-sp3">
              <div className="fw-semi mb-sp2 fs-label c-amber">Underutilized Equipment</div>
              {eqOptResult.underutilized.map((u, i) => (
                <div key={i} className="mb-sp1 fs-label" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)" }}>
                  <span className="fw-medium">{u.equipment}:</span> {u.currentUsage} — <em>{u.suggestion}</em>
                </div>
              ))}
            </div>
          )}

          {eqOptResult.bookingSuggestions?.length > 0 && (
            <div className="mb-sp3">
              <div className="fw-semi mb-sp2 fs-label c-blue">Booking Suggestions</div>
              {eqOptResult.bookingSuggestions.map((b, i) => (
                <div key={i} className="mb-sp1 fs-label" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
                  <span className="fw-medium">{b.equipment} → {b.project}</span> ({b.dates}) — {b.reason}
                </div>
              ))}
            </div>
          )}

          {eqOptResult.costSavings?.length > 0 && (
            <div className="mb-sp3">
              <div className="fw-semi mb-sp2 fs-label c-green">Cost Savings</div>
              {eqOptResult.costSavings.map((c, i) => (
                <div key={i} className="mb-sp1 fs-label" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
                  <span>{c.action}</span>
                  <span className="fw-semi c-green">{c.estimatedSaving}</span>
                </div>
              ))}
            </div>
          )}

          {eqOptResult.maintenanceAlerts?.length > 0 && (
            <div>
              <div className="fw-semi mb-sp2 fs-label c-red">Maintenance Alerts</div>
              {eqOptResult.maintenanceAlerts.map((m, i) => (
                <div key={i} className="flex mb-sp1 fs-label c-text2 gap-sp1" style={{ paddingLeft: "var(--space-2)" }}><AlertTriangle className="c-amber" style={{ width: 14, height: 14 }} /> <strong>{m.equipment}:</strong> {m.alert}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bookings List ── */}
      {subView === "bookings" && (
        <div className="cal-pto-list">
          {activeBookings.length === 0 && (
            <div className="fs-label p-sp4 c-text3">{t("No active bookings")}</div>
          )}
          {activeBookings.map(b => {
            const eq = (equipment || []).find(e => String(e.id) === String(b.equipmentId));
            return (
              <div key={b.id} className="cal-pto-card" style={{ borderLeft: "3px solid #0ea5e9" }}>
                <div className="cal-pto-card-top">
                  <div>
                    <div className="fw-semi fs-label">{eq?.name || b.equipmentId}</div>
                    <div className="fs-label c-text3">
                      {projName(b.projectId)} · {b.startDate} → {b.endDate}
                    </div>
                    {b.notes && <div className="fs-tab mt-sp1 c-text3">{b.notes}</div>}
                  </div>
                  <button className="cal-pto-btn deny fs-tab" onClick={() => cancelBooking(b.id)}>{t("Cancel")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Availability Matrix ── */}
      {subView === "availability" && (
        <div className="cal-pto-calendar">
          <div className="mb-sp3 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
            <button className="cal-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>←</button>
            <button className="cal-nav-btn today" onClick={() => setWeekOffset(0)}>{t("Today")}</button>
            <button className="cal-nav-btn" onClick={() => setWeekOffset(w => w + 1)}>→</button>
          </div>
          <div className="cal-pto-matrix" style={{ gridTemplateColumns: `140px repeat(${days.length}, 1fr)` }}>
            <div className="cal-pto-matrix-header">
              <div className="cal-pto-matrix-name">{t("Equipment")}</div>
              {days.map((d, i) => (
                <div key={i} className="cal-pto-matrix-day">
                  <div>{["M", "T", "W", "T", "F", "S", "S"][d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                  <div className="fs-xs c-text3">{d.getDate()}</div>
                </div>
              ))}
            </div>
            {(equipment || []).map(eq => (
              <div key={eq.id} className="cal-pto-matrix-row">
                <div className="cal-pto-matrix-name fs-tab">{eq.name}</div>
                {days.map((d, i) => {
                  const ds = toStr(d);
                  const booked = isBooked(eq.id, ds);
                  const booking = booked ? getBooking(eq.id, ds) : null;
                  return (
                    <div
                      key={i}
                      className={`cal-pto-matrix-cell${booked ? " off" : ""}`}
                      style={booked ? { background: "rgba(14,165,233,0.2)", color: "var(--cyan)" } : {}}
                      title={booked ? projName(booking.projectId) : t("Available")}
                    >
                      {booked ? "■" : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New Booking ── */}
      {subView === "newBooking" && (
        <div className="cal-pto-form">
          <div className="cal-lookahead-section-title">{t("Book Equipment")}</div>
          <div className="cal-event-form">
            <div>
              <label>{t("Equipment")}</label>
              <select value={form.equipmentId} onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))}>
                <option value="">{t("Select...")}</option>
                {(equipment || []).map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label>{t("Project")}</label>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">{t("Select...")}</option>
                {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div>
                <label>{t("Start Date")}</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label>{t("End Date")}</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label>{t("Notes")}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t("Optional...")} />
            </div>

            {form.equipmentId && form.startDate && form.endDate && hasConflict(form.equipmentId, form.startDate, form.endDate) && (
              <div className="fs-label c-red" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)" }}>
                {t("Conflict: equipment already booked for those dates")}
              </div>
            )}

            <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="secondary" onClick={() => setSubView("bookings")}>{t("Cancel")}</button>
              <button className="primary" onClick={bookEquipment}>{t("Book")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory ── */}
      {subView === "inventory" && (
        <div className="cal-pto-list">
          <div className="cal-lookahead-section-title">{t("Equipment Inventory")}</div>
          {(equipment || []).map(eq => {
            const currentBooking = activeBookings.find(b => b.equipmentId === eq.id && b.startDate <= toStr(new Date()) && b.endDate >= toStr(new Date()));
            return (
              <div key={eq.id} className="cal-pto-card" style={{ borderLeft: `3px solid ${currentBooking ? "#0ea5e9" : "#10b981"}` }}>
                <div className="fw-semi fs-label">{eq.name}</div>
                <div className="fs-label c-text3">
                  {t("Type")}: {eq.type} · {t("Status")}: {currentBooking ? `${t("In use")} @ ${projName(currentBooking.projectId)}` : t("Available")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
