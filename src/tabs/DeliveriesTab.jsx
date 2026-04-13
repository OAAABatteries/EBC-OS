import { useState, useMemo, useRef, useEffect } from "react";
import { Package, Truck, Building2, CheckCircle } from "lucide-react";
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
    tileLayerRef.current = L.tileLayer(DARK_TILES, { maxZoom: 22 }).addTo(map);
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
      const symbol = d.status === "in-transit" ? "T" : "P";
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
      mapInstance.current.fitBounds(allPoints, { padding: [40, 40], maxZoom: 18 });
    }
  }, [deliveryPoints, activeProjects, offices, showProjects, showOffice]);

  const deliveryCount = deliveryPoints.length;
  const projectCount = activeProjects.length;

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-sp3 gap-sp3 flex-wrap" style={{ display: "flex" }}>
        <div className="card flex gap-sp2" style={{ padding: "var(--space-2) var(--space-4)" }}>
          <Package style={{ width: 16, height: 16, color: STATUS_COLORS.approved }} />
          <span className="text-sm">{deliveryCount} {t("delivery stop")}{deliveryCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="card flex gap-sp2" style={{ padding: "var(--space-2) var(--space-4)" }}>
          <Building2 style={{ width: 16, height: 16, color: STATUS_COLORS.project }} />
          <span className="text-sm">{projectCount} {t("active project")}{projectCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-sp3 gap-sp2 flex-wrap" style={{ display: "flex" }}>
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
      <div className="map-legend mb-sp2">
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
      <canvas ref={canvasRef} className="rounded-control bg-bg2 w-full" style={{ height: 120, border: "1px solid var(--border)", touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button type="button" onClick={clear} className="fs-tab mt-sp1 c-text3 cursor-pointer" style={{ background: "none", border: "none" }}>Clear Signature</button>
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
      <div className="emp-tabs mb-sp4">
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
            <div className="empty-state" style={{ padding: "var(--space-10) var(--space-5)" }}>
              <div className="empty-icon mb-sp2"><Package style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">{t("No pending deliveries")}</div>
            </div>
          ) : (
            <div className="flex-col gap-sp3">
              {queueItems.map(req => {
                const navLink = getNavLink(req.projectId);
                const address = getProjectAddress(req.projectId);
                return (
                  <div key={req.id} className="card p-sp4">
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
                        className="btn btn-primary btn-sm flex-1"
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
            <div className="empty-state" style={{ padding: "var(--space-10) var(--space-5)" }}>
              <div className="empty-icon mb-sp2"><Truck style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">{t("No active deliveries")}</div>
            </div>
          ) : (
            <div className="flex-col gap-sp3">
              {inTransitItems.map(req => {
                const navLink = getNavLink(req.projectId);
                const address = getProjectAddress(req.projectId);
                return (
                  <div key={req.id} className="card p-sp4" style={{ borderLeft: "3px solid var(--amber)" }}>
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
                        className="btn btn-primary btn-sm flex-1" style={{ background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
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
            <div className="empty-state" style={{ padding: "var(--space-10) var(--space-5)" }}>
              <div className="empty-icon mb-sp2"><CheckCircle style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">{t("No deliveries completed today")}</div>
            </div>
          ) : (
            <div className="flex-col gap-sp2">
              {todayDelivered.map(req => (
                <div key={req.id} className="card p-sp4">
                  <div className="flex-between mb-4">
                    <span className="text-sm font-semi">{req.material}</span>
                    <span className="badge badge-green">{t("Delivered")}</span>
                  </div>
                  <div className="text-xs text-muted mb-4">{req.projectName} — {req.qty} {req.unit}</div>
                  <div className="text-xs text-dim">
                    {t("Delivered")} {fmtTime(req.deliveredAt)}
                  </div>
                  {req.podRecipientName && (
                    <div className="mt-sp2">
                      <button
                        onClick={() => setExpandedPod(expandedPod === req.id ? null : req.id)}
                        className="fs-label c-amber cursor-pointer" style={{ background: "none", border: "none", padding: 0 }}
                      >
                        POD: {t("Received by")} {req.podRecipientName}, {req.podCondition === "intact" ? "Good Condition" : req.podCondition === "partial" ? "Partial" : "Damaged"}
                        {expandedPod === req.id ? " ▲" : " ▼"}
                      </button>
                      {expandedPod === req.id && (
                        <div className="rounded-control mt-sp2 p-sp3 bg-bg2" style={{ border: "1px solid var(--border)" }}>
                          {req.podNotes && (
                            <div className="text-xs text-muted mb-sp2">
                              <strong>{t("Notes")}:</strong> {req.podNotes}
                            </div>
                          )}
                          {req.podSignature && (
                            <div>
                              <div className="text-xs text-dim mb-sp1">{t("Signature")}:</div>
                              <img src={req.podSignature} alt="Signature" className="rounded-control bg-bg3" style={{ maxWidth: "100%", height: 80, border: "1px solid var(--border)" }} />
                            </div>
                          )}
                          <div className="text-xs text-dim mt-sp2">
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
        <div className="flex justify-center" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999 }} onClick={() => setPodModal(null)}>
          <div onClick={e => e.stopPropagation()} className="rounded-control p-sp6 bg-bg3" style={{ border: "1px solid var(--border)", width: "95%", maxWidth: 480 }}>
            <h3 className="c-amber" style={{ margin: "0 0 4px" }}>Proof of Delivery</h3>
            <div className="mb-sp4 fs-label c-text2">{podModal.material} — {podModal.qty} {podModal.unit}</div>

            <label className="mb-sp1 fs-label c-text2 d-block">Recipient Name</label>
            <input value={podForm.recipientName} onChange={e => setPodForm(f => ({...f, recipientName: e.target.value}))} placeholder="Who received the delivery?" className="rounded-control mb-sp3 p-sp2 bg-bg2 c-text w-full" style={{ border: "1px solid var(--border)", boxSizing: "border-box" }} />

            <label className="mb-sp1 fs-label c-text2 d-block">Condition</label>
            <select value={podForm.condition} onChange={e => setPodForm(f => ({...f, condition: e.target.value}))} className="rounded-control mb-sp3 p-sp2 bg-bg2 c-text w-full" style={{ border: "1px solid var(--border)", boxSizing: "border-box" }}>
              <option value="intact">Intact - Good Condition</option>
              <option value="partial">Partial - Missing Items</option>
              <option value="damaged">Damaged</option>
            </select>

            <label className="mb-sp1 fs-label c-text2 d-block">Delivery Notes</label>
            <textarea value={podForm.notes} onChange={e => setPodForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Any notes about the delivery..." className="rounded-control mb-sp3 p-sp2 bg-bg2 c-text w-full" style={{ border: "1px solid var(--border)", resize: "vertical", boxSizing: "border-box" }} />

            <label className="mb-sp1 fs-label c-text2 d-block">Recipient Signature</label>
            <PodSignaturePad onSave={setPodSignature} />

            <div className="mt-sp4 gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setPodModal(null); setPodForm({ recipientName: "", condition: "intact", notes: "" }); setPodSignature(null); }} className="rounded-control bg-bg2 c-text2 cursor-pointer" style={{ padding: "var(--space-2) var(--space-4)", border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={() => confirmDelivery()} className="rounded-control fw-semi cursor-pointer" style={{ padding: "var(--space-2) var(--space-5)", background: "var(--amber)", border: "none", color: "#000" }}>Confirm Delivery</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
