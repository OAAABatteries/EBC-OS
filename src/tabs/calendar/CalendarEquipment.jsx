import { useState, useMemo } from "react";
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

  const projName = (id) => (projects || []).find(p => p.id === id)?.name || `#${id}`;

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
      id: "eb_" + Date.now(),
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
        <div style={{ display: "flex", gap: 4 }}>
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
        <button className="primary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={eqOptLoading ? undefined : () => showEqOpt ? setShowEqOpt(false) : eqOptResult ? setShowEqOpt(true) : runEqOptimize()} disabled={eqOptLoading}>
          {eqOptLoading ? "Analyzing..." : "AI Optimize"}
        </button>
      </div>

      {/* AI Equipment Optimizer Panel */}
      {showEqOpt && eqOptResult && (
        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🔧</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Utilization: {eqOptResult.utilizationScore}/100 ({eqOptResult.grade})</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{eqOptResult.summary}</div>
              </div>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)" }} onClick={() => setShowEqOpt(false)}>✕</button>
          </div>

          {eqOptResult.underutilized?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 6 }}>Underutilized Equipment</div>
              {eqOptResult.underutilized.map((u, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius)" }}>
                  <span style={{ fontWeight: 500 }}>{u.equipment}:</span> {u.currentUsage} — <em>{u.suggestion}</em>
                </div>
              ))}
            </div>
          )}

          {eqOptResult.bookingSuggestions?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 6 }}>Booking Suggestions</div>
              {eqOptResult.bookingSuggestions.map((b, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
                  <span style={{ fontWeight: 500 }}>{b.equipment} → {b.project}</span> ({b.dates}) — {b.reason}
                </div>
              ))}
            </div>
          )}

          {eqOptResult.costSavings?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", marginBottom: 6 }}>Cost Savings</div>
              {eqOptResult.costSavings.map((c, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 4, background: "rgba(16,185,129,0.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
                  <span>{c.action}</span>
                  <span style={{ fontWeight: 600, color: "var(--green)" }}>{c.estimatedSaving}</span>
                </div>
              ))}
            </div>
          )}

          {eqOptResult.maintenanceAlerts?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Maintenance Alerts</div>
              {eqOptResult.maintenanceAlerts.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text2)", paddingLeft: 8, marginBottom: 3 }}>⚠️ <strong>{m.equipment}:</strong> {m.alert}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bookings List ── */}
      {subView === "bookings" && (
        <div className="cal-pto-list">
          {activeBookings.length === 0 && (
            <div style={{ color: "var(--text3)", fontSize: 13, padding: 16 }}>{t("No active bookings")}</div>
          )}
          {activeBookings.map(b => {
            const eq = (equipment || []).find(e => e.id === b.equipmentId);
            return (
              <div key={b.id} className="cal-pto-card" style={{ borderLeft: "3px solid #0ea5e9" }}>
                <div className="cal-pto-card-top">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{eq?.name || b.equipmentId}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>
                      {projName(b.projectId)} · {b.startDate} → {b.endDate}
                    </div>
                    {b.notes && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{b.notes}</div>}
                  </div>
                  <button className="cal-pto-btn deny" style={{ fontSize: 11 }} onClick={() => cancelBooking(b.id)}>{t("Cancel")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Availability Matrix ── */}
      {subView === "availability" && (
        <div className="cal-pto-calendar">
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
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
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>{d.getDate()}</div>
                </div>
              ))}
            </div>
            {(equipment || []).map(eq => (
              <div key={eq.id} className="cal-pto-matrix-row">
                <div className="cal-pto-matrix-name" style={{ fontSize: 11 }}>{eq.name}</div>
                {days.map((d, i) => {
                  const ds = toStr(d);
                  const booked = isBooked(eq.id, ds);
                  const booking = booked ? getBooking(eq.id, ds) : null;
                  return (
                    <div
                      key={i}
                      className={`cal-pto-matrix-cell${booked ? " off" : ""}`}
                      style={booked ? { background: "rgba(14,165,233,0.2)", color: "#0ea5e9" } : {}}
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
              <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", color: "#ef4444", fontSize: 12 }}>
                {t("Conflict: equipment already booked for those dates")}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
                <div style={{ fontWeight: 600, fontSize: 13 }}>{eq.name}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
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
