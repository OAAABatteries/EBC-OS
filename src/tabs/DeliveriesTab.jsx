import { useState, useMemo, useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ═══════════════════════════════════════════════════════════════
//  Deliveries Tab — Delivery queue, in-transit, completed + Map
//  Used by drivers (and visible to anyone with "deliveries" access)
// ═══════════════════════════════════════════════════════════════

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const STREET_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const STATUS_COLORS = {
  approved:    "#f59e0b", // amber — queued
  "in-transit": "#3b82f6", // blue — en route
  delivered:   "#10b981", // green — done
  project:     "#8b5cf6", // purple — active project
  office:      "#6b7280", // gray — company location
};

function makeIcon(color, symbol) {
  return L.divIcon({
    className: "map-marker-wrap",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};
      box-shadow:0 0 10px ${color}80,0 0 20px ${color}40;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;color:#fff;font-weight:600;
      border:2px solid rgba(255,255,255,0.3);
    ">${symbol}</div>`,
  });
}

// ── Delivery Map sub-component ──
function DeliveryMap({ projects, materialRequests, companyLocations, auth, t }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [mapStyle, setMapStyle] = useState("dark");
  const tileLayerRef = useRef(null);
  const [showProjects, setShowProjects] = useState(true);
  const [showOffice, setShowOffice] = useState(true);

  // Delivery items with locations
  const deliveryPoints = useMemo(() => {
    const active = materialRequests.filter(r =>
      r.status === "approved" || r.status === "in-transit"
    );
    return active.map(r => {
      const proj = projects.find(p => String(p.id) === String(r.projectId));
      return { ...r, lat: proj?.lat, lng: proj?.lng, address: proj?.address };
    }).filter(r => r.lat && r.lng);
  }, [materialRequests, projects]);

  // Active projects with locations
  const activeProjects = useMemo(() =>
    projects.filter(p => p.lat && p.lng && p.phase !== "Complete"),
    [projects]
  );

  // Company locations
  const offices = useMemo(() =>
    (companyLocations || []).filter(l => l.lat && l.lng),
    [companyLocations]
  );

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [29.76, -95.40],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });
    tileLayerRef.current = L.tileLayer(DARK_TILES, { maxZoom: 19 }).addTo(map);
    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Toggle tile style
  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(mapStyle === "dark" ? DARK_TILES : STREET_TILES);
  }, [mapStyle]);

  // Update markers
  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const allPoints = [];

    // Company locations (office/warehouse)
    if (showOffice) {
      offices.forEach(loc => {
        const m = L.marker([loc.lat, loc.lng], {
          icon: makeIcon(STATUS_COLORS.office, loc.type === "warehouse" ? "W" : "H"),
        });
        m.bindPopup(`
          <div class="map-popup-content">
            <div class="map-popup-title">${loc.name}</div>
            <div class="map-popup-row"><span class="map-popup-label">Type</span> ${loc.type}</div>
            ${loc.address ? `<div class="map-popup-row"><span class="map-popup-label">Address</span> ${loc.address}</div>` : ""}
          </div>
        `, { className: "map-popup", maxWidth: 240 });
        m.addTo(mapInstance.current);
        markersRef.current.push(m);
        allPoints.push([loc.lat, loc.lng]);
      });
    }

    // Active projects
    if (showProjects) {
      activeProjects.forEach(p => {
        const m = L.marker([p.lat, p.lng], {
          icon: makeIcon(STATUS_COLORS.project, "P"),
        });
        m.bindPopup(`
          <div class="map-popup-content">
            <div class="map-popup-title">${p.name}</div>
            <div class="map-popup-row"><span class="map-popup-label">GC</span> ${p.gc || "—"}</div>
            <div class="map-popup-row"><span class="map-popup-label">Phase</span> ${p.phase || "—"}</div>
            ${p.address ? `<div class="map-popup-row"><span class="map-popup-label">Address</span> ${p.address}</div>` : ""}
          </div>
        `, { className: "map-popup", maxWidth: 240 });
        m.addTo(mapInstance.current);
        markersRef.current.push(m);
        allPoints.push([p.lat, p.lng]);
      });
    }

    // Delivery points (highest priority — on top)
    deliveryPoints.forEach(d => {
      const color = STATUS_COLORS[d.status] || STATUS_COLORS.approved;
      const symbol = d.status === "in-transit" ? "🚛" : "📦";
      const m = L.marker([d.lat, d.lng], {
        icon: makeIcon(color, symbol),
        zIndexOffset: 1000,
      });
      m.bindPopup(`
        <div class="map-popup-content">
          <div class="map-popup-title">${d.projectName || "Delivery"}</div>
          <div class="map-popup-row"><span class="map-popup-label">Material</span> ${d.material}</div>
          <div class="map-popup-row"><span class="map-popup-label">Qty</span> ${d.qty} ${d.unit}</div>
          <div class="map-popup-row"><span class="map-popup-label">Status</span> <span style="color:${color}">${d.status}</span></div>
          ${d.address ? `<div class="map-popup-row"><span class="map-popup-label">Address</span> ${d.address}</div>` : ""}
          ${d.notes ? `<div class="map-popup-row"><span class="map-popup-label">Notes</span> ${d.notes}</div>` : ""}
        </div>
      `, { className: "map-popup", maxWidth: 260 });
      m.addTo(mapInstance.current);
      markersRef.current.push(m);
      allPoints.push([d.lat, d.lng]);
    });

    // Fit bounds
    if (allPoints.length > 0) {
      mapInstance.current.fitBounds(allPoints, { padding: [40, 40], maxZoom: 13 });
    }
  }, [deliveryPoints, activeProjects, offices, showProjects, showOffice]);

  const deliveryCount = deliveryPoints.length;
  const projectCount = activeProjects.length;

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: STATUS_COLORS.approved, fontSize: 16 }}>📦</span>
          <span className="text-sm">{deliveryCount} {t("delivery stop")}{deliveryCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="card" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: STATUS_COLORS.project, fontSize: 16 }}>🏗</span>
          <span className="text-sm">{projectCount} {t("active project")}{projectCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className={`btn btn-sm ${mapStyle === "dark" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMapStyle("dark")}
        >Dark</button>
        <button
          className={`btn btn-sm ${mapStyle === "street" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMapStyle("street")}
        >Street</button>
        <span style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
        <button
          className={`btn btn-sm ${showProjects ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setShowProjects(!showProjects)}
        >Projects</button>
        <button
          className={`btn btn-sm ${showOffice ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setShowOffice(!showOffice)}
        >Offices</button>
      </div>

      {/* Legend */}
      <div className="map-legend" style={{ marginBottom: 8 }}>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: STATUS_COLORS.approved }} /> Queued
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: STATUS_COLORS["in-transit"] }} /> In Transit
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: STATUS_COLORS.project }} /> Project
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: STATUS_COLORS.office }} /> Office
        </div>
      </div>

      {/* Map */}
      <div className="map-container" ref={mapRef} />
    </div>
  );
}

// ── Signature Pad for Proof of Delivery ──
function PodSignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#d4dae6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { drawing.current = false; if (onSave) onSave(canvasRef.current.toDataURL("image/png")); };
  const clear = () => { const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height); if (onSave) onSave(null); };

  return (
    <div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 120, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button type="button" onClick={clear} style={{ marginTop: 4, fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>Clear Signature</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main DeliveriesTab
// ═══════════════════════════════════════════════════════════════

export function DeliveriesTab({ app }) {
  const {
    auth, projects, materialRequests, setMaterialRequests, companyLocations, show, t,
  } = app;

  const [subTab, setSubTab] = useState("map");
  const [podModal, setPodModal] = useState(null); // holds the request being delivered
  const [podForm, setPodForm] = useState({ recipientName: "", condition: "intact", notes: "" });
  const [podSignature, setPodSignature] = useState(null);
  const [expandedPod, setExpandedPod] = useState(null); // track which completed item's POD is expanded

  // ── delivery lists ──
  const queueItems = useMemo(
    () => materialRequests.filter(r => r.status === "approved"),
    [materialRequests]
  );

  const inTransitItems = useMemo(
    () => materialRequests.filter(r => r.status === "in-transit" && r.driverId === auth?.id),
    [materialRequests, auth]
  );

  const todayDelivered = useMemo(() => {
    const today = new Date().toDateString();
    return materialRequests.filter(
      r => r.status === "delivered" && r.driverId === auth?.id &&
        r.deliveredAt && new Date(r.deliveredAt).toDateString() === today
    );
  }, [materialRequests, auth]);

  // ── actions ──
  const handleStartDelivery = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "in-transit", driverId: auth.id } : r
    ));
    show(t("Delivery started"), "ok");
  };

  const handleMarkDelivered = (req) => {
    setPodModal(req);
  };

  const confirmDelivery = () => {
    if (!podModal) return;
    const now = new Date().toISOString();
    setMaterialRequests(prev => prev.map(r =>
      r.id === podModal.id ? {
        ...r,
        status: "delivered",
        deliveredAt: now,
        podRecipientName: podForm.recipientName,
        podCondition: podForm.condition,
        podNotes: podForm.notes,
        podSignature: podSignature,
        podTimestamp: now,
      } : r
    ));
    show(t("Marked as delivered"), "ok");
    setPodModal(null);
    setPodForm({ recipientName: "", condition: "intact", notes: "" });
    setPodSignature(null);
  };

  // ── format helpers ──
  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  // ── project helpers ──
  const getNavLink = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj?.lat || !proj?.lng) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${proj.lat},${proj.lng}`;
  };

  const getProjectAddress = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    return proj?.address || "";
  };

  const tabs = [
    { key: "map", label: t("Map") },
    { key: "queue", label: t("Queue"), count: queueItems.length },
    { key: "transit", label: t("In Transit"), count: inTransitItems.length },
    { key: "completed", label: t("Completed"), count: todayDelivered.length },
  ];

  return (
    <div>
      <div className="section-header">
        <div className="section-title font-head">{t("Deliveries")}</div>
      </div>

      {/* Sub-tabs */}
      <div className="emp-tabs" style={{ marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`emp-tab${subTab === tab.key ? " active" : ""}`}
            onClick={() => setSubTab(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span className="driver-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ MAP ═══ */}
      {subTab === "map" && (
        <DeliveryMap
          projects={projects}
          materialRequests={materialRequests}
          companyLocations={companyLocations}
          auth={auth}
          t={t}
        />
      )}

      {/* ═══ QUEUE ═══ */}
      {subTab === "queue" && (
        <div>
          {queueItems.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
              <div className="empty-text">{t("No pending deliveries")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {queueItems.map(req => {
                const navLink = getNavLink(req.projectId);
                const address = getProjectAddress(req.projectId);
                return (
                  <div key={req.id} className="card" style={{ padding: 16 }}>
                    <div className="text-sm font-bold text-amber mb-4">{req.projectName}</div>
                    {address && <div className="text-xs text-muted mb-8">{address}</div>}
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className="text-sm font-mono">{req.qty} {req.unit}</span>
                    </div>
                    <div className="text-xs text-muted mb-8">
                      {t("Requester")}: {req.employeeName} · {fmtDate(req.requestedAt)}
                    </div>
                    {req.notes && <div className="text-xs text-dim mb-8">{req.notes}</div>}
                    <div className="flex gap-8">
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleStartDelivery(req.id)}
                      >
                        {t("Start Delivery")}
                      </button>
                      {navLink && (
                        <a
                          href={navLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          {t("Navigate")} →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ IN TRANSIT ═══ */}
      {subTab === "transit" && (
        <div>
          {inTransitItems.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ fontSize: 40, marginBottom: 8 }}>🚛</div>
              <div className="empty-text">{t("No active deliveries")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inTransitItems.map(req => {
                const navLink = getNavLink(req.projectId);
                const address = getProjectAddress(req.projectId);
                return (
                  <div key={req.id} className="card" style={{ padding: 16, borderLeft: "3px solid var(--amber)" }}>
                    <div className="text-sm font-bold text-amber mb-4">{req.projectName}</div>
                    {address && <div className="text-xs text-muted mb-8">{address}</div>}
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className="text-sm font-mono">{req.qty} {req.unit}</span>
                    </div>
                    <div className="text-xs text-muted mb-8">
                      {t("Requester")}: {req.employeeName}
                    </div>
                    <div className="flex gap-8">
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                        onClick={() => handleMarkDelivered(req)}
                      >
                        {t("Mark Delivered")}
                      </button>
                      {navLink && (
                        <a
                          href={navLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          {t("Navigate")} →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPLETED ═══ */}
      {subTab === "completed" && (
        <div>
          {todayDelivered.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div className="empty-text">{t("No deliveries completed today")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayDelivered.map(req => (
                <div key={req.id} className="card" style={{ padding: 14 }}>
                  <div className="flex-between mb-4">
                    <span className="text-sm font-semi">{req.material}</span>
                    <span className="badge badge-green">{t("Delivered")}</span>
                  </div>
                  <div className="text-xs text-muted mb-4">{req.projectName} — {req.qty} {req.unit}</div>
                  <div className="text-xs text-dim">
                    {t("Delivered")} {fmtTime(req.deliveredAt)}
                  </div>
                  {req.podRecipientName && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => setExpandedPod(expandedPod === req.id ? null : req.id)}
                        style={{ fontSize: 12, color: "var(--amber)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        POD: {t("Received by")} {req.podRecipientName}, {req.podCondition === "intact" ? "Good Condition" : req.podCondition === "partial" ? "Partial" : "Damaged"}
                        {expandedPod === req.id ? " ▲" : " ▼"}
                      </button>
                      {expandedPod === req.id && (
                        <div style={{ marginTop: 8, padding: 10, background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                          {req.podNotes && (
                            <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
                              <strong>{t("Notes")}:</strong> {req.podNotes}
                            </div>
                          )}
                          {req.podSignature && (
                            <div>
                              <div className="text-xs text-dim" style={{ marginBottom: 4 }}>{t("Signature")}:</div>
                              <img src={req.podSignature} alt="Signature" style={{ maxWidth: "100%", height: 80, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }} />
                            </div>
                          )}
                          <div className="text-xs text-dim" style={{ marginTop: 6 }}>
                            {t("Confirmed")} {fmtTime(req.podTimestamp)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ POD MODAL ═══ */}
      {podModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPodModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, width: "95%", maxWidth: 480 }}>
            <h3 style={{ margin: "0 0 4px", color: "var(--amber)" }}>Proof of Delivery</h3>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>{podModal.material} — {podModal.qty} {podModal.unit}</div>

            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>Recipient Name</label>
            <input value={podForm.recipientName} onChange={e => setPodForm(f => ({...f, recipientName: e.target.value}))} placeholder="Who received the delivery?" style={{ width: "100%", padding: 8, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", marginBottom: 12, boxSizing: "border-box" }} />

            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>Condition</label>
            <select value={podForm.condition} onChange={e => setPodForm(f => ({...f, condition: e.target.value}))} style={{ width: "100%", padding: 8, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", marginBottom: 12, boxSizing: "border-box" }}>
              <option value="intact">Intact - Good Condition</option>
              <option value="partial">Partial - Missing Items</option>
              <option value="damaged">Damaged</option>
            </select>

            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>Delivery Notes</label>
            <textarea value={podForm.notes} onChange={e => setPodForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Any notes about the delivery..." style={{ width: "100%", padding: 8, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", marginBottom: 12, resize: "vertical", boxSizing: "border-box" }} />

            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>Recipient Signature</label>
            <PodSignaturePad onSave={setPodSignature} />

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setPodModal(null); setPodForm({ recipientName: "", condition: "intact", notes: "" }); setPodSignature(null); }} style={{ padding: "8px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text2)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => confirmDelivery()} style={{ padding: "8px 20px", background: "var(--amber)", border: "none", borderRadius: 6, color: "#000", fontWeight: 600, cursor: "pointer" }}>Confirm Delivery</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
