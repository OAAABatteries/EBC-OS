import { useRef, useEffect, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { polygonAreaSqFt } from "../utils/geofence.js";

// ═══════════════════════════════════════════════════════════════
//  Perimeter Map Modal — draw polygon job-site boundary on map
// ═══════════════════════════════════════════════════════════════

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function vertexIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;
      background:#1d4ed8;
      border:2px solid #60a5fa;
      border-radius:50%;
      cursor:grab;
      box-shadow:0 0 0 3px rgba(96,165,250,0.25),0 2px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function fmtArea(sqFt) {
  if (sqFt > 43560) return `${(sqFt / 43560).toFixed(2)} acres`;
  return `${Math.round(sqFt).toLocaleString()} sq ft`;
}

export function PerimeterMapModal({ project, onSave, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileRef = useRef(null);
  // pointsRef is the live source of truth (mutated imperatively)
  const pointsRef = useRef(
    project.perimeter && project.perimeter.length >= 3
      ? project.perimeter.map(p => [...p])
      : []
  );
  const markersRef = useRef([]);
  const polygonRef = useRef(null);
  const centerMarkerRef = useRef(null);

  // React state only for UI info panel
  const [info, setInfo] = useState({
    count: pointsRef.current.length,
    area: polygonAreaSqFt(pointsRef.current),
  });
  const [mapStyle, setMapStyle] = useState("dark");

  // ── Update polygon layer from pointsRef ──
  const updatePolygon = useCallback(() => {
    if (!mapInstance.current) return;
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    const pts = pointsRef.current;
    if (pts.length >= 2) {
      polygonRef.current = L.polygon(pts, {
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: pts.length >= 3 ? 0.18 : 0,
        weight: 2,
        dashArray: pts.length < 3 ? "6 4" : null,
      }).addTo(mapInstance.current);
    }
    const count = pts.length;
    setInfo({ count, area: polygonAreaSqFt(pts) });
  }, []);

  // ── Rebuild all draggable vertex markers ──
  const rebuildMarkers = useCallback(() => {
    if (!mapInstance.current) return;
    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    pointsRef.current.forEach((pt, i) => {
      const marker = L.marker(pt, {
        draggable: true,
        icon: vertexIcon(),
        zIndexOffset: 100,
      });

      // Live polygon update during drag
      marker.on("drag", (e) => {
        pointsRef.current[i] = [e.latlng.lat, e.latlng.lng];
        updatePolygon();
      });

      marker.addTo(mapInstance.current);
      markersRef.current.push(marker);
    });

    updatePolygon();
  }, [updatePolygon]);

  // ── Init map once ──
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const lat = project.lat || 29.76;
    const lng = project.lng || -95.40;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 18,
      zoomControl: true,
      attributionControl: false,
      tap: true, // Leaflet mobile touch
    });

    tileRef.current = L.tileLayer(DARK_TILES, { maxZoom: 22 }).addTo(map);
    mapInstance.current = map;

    // Center pin for project location
    if (project.lat && project.lng) {
      centerMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 5,
        color: "#e09422",
        fillColor: "#e09422",
        fillOpacity: 1,
        weight: 2,
        zIndexOffset: -10,
      }).bindTooltip(project.name || "Project center", { permanent: false, direction: "top" })
        .addTo(map);
    }

    // Click to add vertex
    map.on("click", (e) => {
      pointsRef.current.push([e.latlng.lat, e.latlng.lng]);
      rebuildMarkers();
    });

    // Draw existing perimeter if any
    if (pointsRef.current.length > 0) {
      rebuildMarkers();
      if (pointsRef.current.length >= 3) {
        const group = L.featureGroup(markersRef.current);
        try { map.fitBounds(group.getBounds().pad(0.3)); } catch (_) {}
      }
    }

    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Swap tile layer on style change ──
  useEffect(() => {
    if (!mapInstance.current || !tileRef.current) return;
    tileRef.current.setUrl(mapStyle === "satellite" ? SATELLITE_TILES : DARK_TILES);
  }, [mapStyle]);

  const handleUndo = () => {
    if (pointsRef.current.length === 0) return;
    pointsRef.current.pop();
    rebuildMarkers();
  };

  const handleClear = () => {
    pointsRef.current = [];
    rebuildMarkers();
  };

  const handleSave = () => {
    const pts = pointsRef.current;
    onSave(pts.length >= 3 ? pts.map(p => [p[0], p[1]]) : []);
  };

  const canSave = info.count === 0 || info.count >= 3;
  const statusMsg = (() => {
    if (info.count === 0) return "Tap the map to place boundary points";
    if (info.count === 1) return "1 point — keep tapping to draw boundary";
    if (info.count === 2) return "2 points — one more to close the polygon";
    return `${info.count} points · ${fmtArea(info.area)}`;
  })();

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 9999 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(96vw, 740px)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg2, #1a1f2e)",
          borderRadius: 12,
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
              Set Job Site Perimeter
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)", marginTop: 2 }}>
              {project.name}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: mapStyle === "dark" ? "#1d4ed8" : "transparent",
                color: mapStyle === "dark" ? "#fff" : "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onClick={() => setMapStyle("dark")}
            >Dark</button>
            <button
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: mapStyle === "satellite" ? "#1d4ed8" : "transparent",
                color: mapStyle === "satellite" ? "#fff" : "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onClick={() => setMapStyle("satellite")}
            >Satellite</button>
            <button
              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", lineHeight: 1 }}
              onClick={onClose}
            >✕</button>
          </div>
        </div>

        {/* ── Instruction strip ── */}
        <div style={{
          padding: "8px 18px",
          background: "rgba(59,130,246,0.08)",
          borderBottom: "1px solid rgba(59,130,246,0.15)",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: "#93c5fd" }}>
            Tap/click to place points · Drag blue dots to adjust · Orange dot = project center
          </div>
        </div>

        {/* ── Map ── */}
        <div ref={mapRef} style={{ flex: 1, minHeight: 380 }} />

        {/* ── Controls ── */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          flexShrink: 0,
          background: "var(--bg3, #111827)",
        }}>
          <div style={{ flex: 1, minWidth: 140, fontSize: 12, color: "var(--text-muted, #9ca3af)" }}>
            {statusMsg}
          </div>
          <button
            style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)",
              background: "transparent", color: info.count === 0 ? "var(--text-dim, #4b5563)" : "var(--text-muted)",
              fontSize: 13, cursor: info.count === 0 ? "not-allowed" : "pointer",
            }}
            disabled={info.count === 0}
            onClick={handleUndo}
          >
            Undo
          </button>
          <button
            style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)",
              background: "transparent", color: info.count === 0 ? "var(--text-dim, #4b5563)" : "#f87171",
              fontSize: 13, cursor: info.count === 0 ? "not-allowed" : "pointer",
            }}
            disabled={info.count === 0}
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            style={{
              padding: "6px 16px", borderRadius: 6, border: "none",
              background: canSave ? "#1d4ed8" : "#374151",
              color: canSave ? "#fff" : "#6b7280",
              fontSize: 13, fontWeight: 600, cursor: canSave ? "pointer" : "not-allowed",
            }}
            disabled={!canSave}
            onClick={handleSave}
          >
            {info.count === 0 ? "Remove Perimeter" : "Save Perimeter"}
          </button>
        </div>
      </div>
    </div>
  );
}
