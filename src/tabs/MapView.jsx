import { useRef, useEffect, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ═══════════════════════════════════════════════════════════════
//  Map View — GTA-style project map with PM filtering
// ═══════════════════════════════════════════════════════════════

const PHASE_COLORS = {
  "Pre-Construction": "#3b82f6",
  "Estimating": "#e09422",
  "Active": "#10b981",
  "In-Progress": "#10b981",
  "Complete": "#6b7280",
};

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const STREET_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function makeMarkerIcon(project) {
  const color = PHASE_COLORS[project.phase] || "#e09422";
  return L.divIcon({
    className: "map-marker-wrap",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div class="map-marker" style="
      --marker-color: ${color};
      background: ${color};
      box-shadow: 0 0 12px ${color}80, 0 0 24px ${color}40;
    "></div>`,
  });
}

function fmtContract(n) {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n;
}

export function MapView({ app }) {
  const { projects, teamSchedule, employees, timeEntries = [], materialRequests = [] } = app;
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const teamLayerRef = useRef(null);
  const deliveryLayerRef = useRef(null);
  const [viewMode, setViewMode] = useState("ebc");
  const [mapStyle, setMapStyle] = useState("dark");
  const [showGeofences, setShowGeofences] = useState(false);
  const [showCrew, setShowCrew] = useState(true);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── AI Route state ──
  const [routeResult, setRouteResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  const runRouteOptimize = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setRouteLoading(true);
    setRouteResult(null);
    try {
      const { optimizeProjectRoutes } = await import("../utils/api.js");
      const res = await optimizeProjectRoutes(app.apiKey, projects.slice(0, 15), (teamSchedule || []).slice(0, 30), (employees || []).slice(0, 15));
      setRouteResult(res);
      setShowRoute(true);
      app.show("Route analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setRouteLoading(false);
    }
  };
  const tileLayerRef = useRef(null);

  // Extract unique PMs
  const pmList = useMemo(() => {
    return [...new Set(projects.map((p) => p.pm).filter(Boolean))];
  }, [projects]);

  // Filtered projects
  const filtered = useMemo(() => {
    if (viewMode === "ebc") return projects;
    return projects.filter((p) => p.pm === viewMode);
  }, [projects, viewMode]);

  // Get team count per project
  const teamSizes = useMemo(() => {
    const counts = {};
    teamSchedule.forEach((s) => {
      if (!counts[s.projectId]) counts[s.projectId] = new Set();
      counts[s.projectId].add(s.employeeId);
    });
    const result = {};
    Object.entries(counts).forEach(([id, set]) => { result[id] = set.size; });
    return result;
  }, [teamSchedule]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [29.76, -95.40],
      zoom: 9,
      zoomControl: true,
      attributionControl: false,
    });

    tileLayerRef.current = L.tileLayer(DARK_TILES, { maxZoom: 22 }).addTo(map);
    mapInstance.current = map;

    // Fix Leaflet sizing issue
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update tile layer
  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return;
    const urls = { dark: DARK_TILES, satellite: SATELLITE_TILES, street: STREET_TILES };
    tileLayerRef.current.setUrl(urls[mapStyle] || DARK_TILES);
  }, [mapStyle]);

  // Update markers when filter changes
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear old markers and circles
    markersRef.current.forEach((m) => m.remove());
    circlesRef.current.forEach((c) => c.remove());
    markersRef.current = [];
    circlesRef.current = [];

    const fmt = app.fmt;

    filtered.forEach((p) => {
      if (!p.lat || !p.lng) return;

      const marker = L.marker([p.lat, p.lng], { icon: makeMarkerIcon(p) });
      const color = PHASE_COLORS[p.phase] || "#e09422";
      const teamList = teamSizes[p.id] || 0;

      marker.bindPopup(`
        <div class="map-popup-content">
          <div class="map-popup-title">${p.name}</div>
          <div class="map-popup-row"><span class="map-popup-label">GC</span> ${p.gc}</div>
          <div class="map-popup-row"><span class="map-popup-label">Contract</span> ${fmt(p.contract)}</div>
          <div class="map-popup-row"><span class="map-popup-label">Phase</span> <span style="color:${color}">${p.phase}</span></div>
          <div class="map-popup-row"><span class="map-popup-label">PM</span> ${p.pm || "—"}</div>
          ${team > 0 ? `<div class="map-popup-row"><span class="map-popup-label">Crew</span> ${team} assigned</div>` : ""}
          <div class="map-popup-row"><span class="map-popup-label">Geofence</span> ${p.perimeter && p.perimeter.length >= 3 ? `Polygon (${p.perimeter.length} pts)` : `${p.radiusFt || 1000}ft radius`}</div>
        </div>
      `, { className: "map-popup", maxWidth: 260 });

      marker.addTo(mapInstance.current);
      markersRef.current.push(marker);

      // Geofence: polygon if perimeter exists, else circle
      if (showGeofences) {
        if (p.perimeter && p.perimeter.length >= 3) {
          const poly = L.polygon(p.perimeter, {
            color: color,
            fillColor: color,
            fillOpacity: 0.1,
            weight: 1.5,
            opacity: 0.5,
          }).addTo(mapInstance.current);
          circlesRef.current.push(poly);
        } else {
          const circle = L.circle([p.lat, p.lng], {
            radius: p.radiusFt * 0.3048, // ft to meters
            color: color,
            fillColor: color,
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.3,
          }).addTo(mapInstance.current);
          circlesRef.current.push(circle);
        }
      }
    });

    // Fit bounds if we have markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [filtered, showGeofences, teamSizes, app.fmt]);

  // ── Crew position markers ──
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear previous team layer
    if (teamLayerRef.current) {
      teamLayerRef.current.clearLayers();
      mapInstance.current.removeLayer(teamLayerRef.current);
      teamLayerRef.current = null;
    }

    if (!showCrew) return;

    const teamGroup = L.layerGroup();
    const activeClockins = timeEntries.filter(
      (e) => e.clockIn && !e.clockOut && e.clockInLat && e.clockInLng
    );

    activeClockins.forEach((entry) => {
      const emp = employees.find((e) => e.id === entry.employeeId);
      const proj = projects.find((p) => p.id === entry.projectId);
      const empName = emp ? emp.name : "Unknown";
      const projName = proj ? proj.name : "Unknown";
      const clockTime = new Date(entry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const marker = L.circleMarker([entry.clockInLat, entry.clockInLng], {
        radius: 6,
        color: "var(--blue)",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
        weight: 2,
        opacity: 1,
      });

      marker.bindPopup(`
        <div class="map-popup-content">
          <div class="map-popup-title">${empName}</div>
          <div class="map-popup-row"><span class="map-popup-label">Project</span> ${projName}</div>
          <div class="map-popup-row"><span class="map-popup-label">Clocked in since</span> ${clockTime}</div>
        </div>
      `, { className: "map-popup", maxWidth: 240 });

      marker.addTo(teamGroup);
    });

    teamGroup.addTo(mapInstance.current);
    teamLayerRef.current = teamGroup;
  }, [showCrew, timeEntries, employees, projects]);

  // ── Delivery route markers ──
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear previous delivery layer
    if (deliveryLayerRef.current) {
      deliveryLayerRef.current.clearLayers();
      mapInstance.current.removeLayer(deliveryLayerRef.current);
      deliveryLayerRef.current = null;
    }

    if (!showDeliveries) return;

    const deliveryGroup = L.layerGroup();
    const inTransit = materialRequests.filter((r) => r.status === "in-transit");

    inTransit.forEach((req) => {
      const proj = projects.find((p) => p.id === req.projectId);
      if (!proj || !proj.lat || !proj.lng) return;

      const marker = L.circleMarker([proj.lat, proj.lng], {
        radius: 8,
        color: "var(--amber)",
        fillColor: "#f59e0b",
        fillOpacity: 0.85,
        weight: 2,
        opacity: 1,
      });

      marker.bindPopup(`
        <div class="map-popup-content">
          <div class="map-popup-title" style="color:#f59e0b">Delivery In-Transit</div>
          <div class="map-popup-row"><span class="map-popup-label">Material</span> ${req.material || req.item || "—"}</div>
          <div class="map-popup-row"><span class="map-popup-label">Qty</span> ${req.qty || req.quantity || "—"}</div>
          <div class="map-popup-row"><span class="map-popup-label">Driver</span> ${req.driver || "—"}</div>
          <div class="map-popup-row"><span class="map-popup-label">Destination</span> ${proj.name}</div>
        </div>
      `, { className: "map-popup", maxWidth: 260 });

      marker.addTo(deliveryGroup);
    });

    deliveryGroup.addTo(mapInstance.current);
    deliveryLayerRef.current = deliveryGroup;
  }, [showDeliveries, materialRequests, projects]);

  const toggleFullscreen = () => {
    setIsFullscreen(f => !f);
    // Let DOM reflow before telling Leaflet about the new container size
    setTimeout(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); }, 150);
  };

  return (
    <div style={isFullscreen ? { position: "fixed", inset: 0, zIndex: 9998, background: "var(--bg)", display: "flex", flexDirection: "column" } : undefined}>
      <div className="section-header">
        <div>
          <div className="section-title">Project Map</div>
          {!isFullscreen && (
            <div className="section-sub">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""} — {fmtContract(filtered.reduce((s, p) => s + (p.contract || 0), 0))} total
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-ghost" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? "✕ Exit" : "⛶ Fullscreen"}
          </button>
          <button className="btn btn-ghost" onClick={() => { showRoute ? setShowRoute(false) : runRouteOptimize(); }} disabled={routeLoading}>
            {routeLoading ? "Analyzing..." : "AI Route Plan"}
          </button>
        </div>
      </div>

      {/* AI Route Plan Panel */}
      {showRoute && routeResult && (
        <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)", maxHeight: 400, overflow: "auto" }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">AI Route & Logistics Plan</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowRoute(false)}>Close</button>
          </div>

          <div className="text-sm text-muted mb-12">{routeResult.summary}</div>

          {/* Travel Metrics */}
          {routeResult.travelMetrics && (
            <div className="flex gap-16 mb-12 flex-wrap">
              <div><span className="text-xs text-muted">Avg Daily Miles:</span> <span className="font-semi">{routeResult.travelMetrics.avgDailyMiles}</span></div>
              <div><span className="text-xs text-muted">Peak Travel Day:</span> <span className="font-semi">{routeResult.travelMetrics.peakTravelDay}</span></div>
              <div><span className="text-xs text-muted">Weekly Cost:</span> <span className="font-semi">{routeResult.travelMetrics.estimatedWeeklyCost}</span></div>
            </div>
          )}

          {/* Clusters */}
          {routeResult.clusterAnalysis?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semi mb-8">Project Clusters</div>
              {routeResult.clusterAnalysis.map((c, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="text-sm font-semi">{c.cluster} — {c.area}</div>
                  <div className="text-xs text-muted mt-2">Projects: {(c.projects || []).join(", ")} · Crew: {c.teamSize}</div>
                  <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{c.recommendation}</div>
                </div>
              ))}
            </div>
          )}

          {/* Material Delivery */}
          {routeResult.materialDelivery?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Delivery Consolidation</div>
              {routeResult.materialDelivery.map((m, i) => (
                <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="text-sm">{m.suggestion}</div>
                  <div className="text-xs text-muted mt-2">{(m.projects || []).join(", ")} — {m.benefit}</div>
                </div>
              ))}
            </div>
          )}

          {/* Hub Recommendation */}
          {routeResult.hubRecommendation && (
            <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semi">Staging Hub</div>
              <div className="text-xs text-muted mt-4">{routeResult.hubRecommendation}</div>
            </div>
          )}

          {/* Logistics Alerts */}
          {routeResult.logisticsAlerts?.length > 0 && (
            <div>
              <div className="text-sm font-semi mb-8">Logistics Alerts</div>
              {routeResult.logisticsAlerts.map((a, i) => (
                <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{a.alert}</span>
                    <span className={`badge ${a.severity === "critical" ? "badge-red" : a.severity === "warning" ? "badge-amber" : "badge-muted"}`}>{a.severity}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{a.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="map-controls">
        <div className="map-pm-toggle">
          <button
            className={`btn btn-sm ${viewMode === "ebc" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setViewMode("ebc")}
          >
            EBC View
          </button>
          {pmList.map((pm) => (
            <button
              key={pm}
              className={`btn btn-sm ${viewMode === pm ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode(pm)}
            >
              {pm.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="map-pm-toggle">
          <button
            className={`btn btn-sm ${mapStyle === "dark" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMapStyle("dark")}
          >
            Dark
          </button>
          <button
            className={`btn btn-sm ${mapStyle === "satellite" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMapStyle("satellite")}
          >
            Satellite
          </button>
          <button
            className={`btn btn-sm ${mapStyle === "street" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMapStyle("street")}
          >
            Street
          </button>
          <button
            className={`btn btn-sm ${showGeofences ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setShowGeofences(!showGeofences)}
          >
            Geofences
          </button>
          <button
            className={`btn btn-sm ${showCrew ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setShowCrew(!showCrew)}
          >
            Crew
          </button>
          <button
            className={`btn btn-sm ${showDeliveries ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setShowDeliveries(!showDeliveries)}
          >
            Deliveries
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="map-legend">
        {Object.entries(PHASE_COLORS).filter(([k]) => k !== "In-Progress").map(([phase, color]) => (
          <div key={phase} className="map-legend-item">
            <span className="map-legend-dot" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
            <span>{phase}</span>
          </div>
        ))}
        {showCrew && (
          <div className="map-legend-item">
            <span className="map-legend-dot" style={{ background: "var(--blue)", boxShadow: "0 0 6px #3b82f680", width: 8, height: 8 }} />
            <span>Crew</span>
          </div>
        )}
        {showDeliveries && (
          <div className="map-legend-item">
            <span className="map-legend-dot" style={{ background: "var(--amber)", boxShadow: "0 0 6px #f59e0b80", width: 8, height: 8 }} />
            <span>Delivery</span>
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="map-container" ref={mapRef} style={isFullscreen ? { flex: 1, height: "auto", minHeight: 0 } : undefined} />
    </div>
  );
}
