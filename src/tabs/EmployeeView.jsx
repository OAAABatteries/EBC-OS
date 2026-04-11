import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, MapPin, Calendar, Clock, AlertTriangle, Shield, Package, ClipboardList, FileText, PenLine, Settings, Home, ShieldCheck, BarChart3, Binoculars } from "lucide-react";
import { PortalHeader, PortalTabBar, FieldButton, FieldInput, FieldSelect, EmptyState, StatusBadge, DrawingsTab, PhotoCapture, LanguageToggle } from "../components/field";
import { HomeTab } from './employee/HomeTab';
import { ProductionEntry } from './employee/ProductionEntry';
import { ScheduleTab } from './employee/ScheduleTab';
import { CredentialsTab } from './employee/CredentialsTab';
import { ReportProblemModal } from "../components/ReportProblemModal";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNotifications } from "../hooks/useNotifications";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useFormDraft } from "../hooks/useFormDraft";
import { useDrawingCache } from "../hooks/useDrawingCache";
import { getDrawingsByProject, downloadFile } from "../lib/supabase";
import { findNearestGeofence, getLocationsInRange, pointInPolygon, polygonAreaSqFt } from "../utils/geofence";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import {
  PPE_ITEMS, riskColor, HAZARD_CATEGORIES, CONTROL_HIERARCHY, TRADE_LABELS,
} from "../data/jsaConstants";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_SETS = { map: OSM_TILES, satellite: SATELLITE_TILES };
const MAP_STYLE_LABELS = { map: "Map", satellite: "Satellite" };
const PHASE_COLORS = {
  "Pre-Construction": "var(--amber)",
  "Estimating": "var(--blue)",
  "Active": "var(--green)",
  "Complete": "var(--text3)",
};

// ═══════════════════════════════════════════════════════════════
//  Employee View — Time Clock + Schedule + Materials + Field Access
//  Email/password login → Role-aware tabs → i18n (EN/ES)
// ═══════════════════════════════════════════════════════════════

const EMP_SESSION_KEY = "ebc_activeEmployee";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const UNITS = ["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT"];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export function EmployeeView({ app }) {
  const {
    employees, projects, setProjects, companyLocations,
    timeEntries, setTimeEntries,
    changeOrders, rfis, submittals, teamSchedule,
    materialRequests, setMaterialRequests,
    jsas, setJsas,
    problems, setProblems,
    areas, productionLogs, setProductionLogs,
    theme, setTheme, show
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;

  // ── network status ──
  const network = useNetworkStatus();

  // ── session — use main auth if available ──
  const mainAuth = app.auth;
  const [activeEmp, setActiveEmp] = useState(() => {
    if (mainAuth && mainAuth.role === "employee") {
      return { id: mainAuth.id, name: mainAuth.name, email: mainAuth.email, role: "Crew", active: true, phone: "", notifications: { schedule: true, materials: true, deliveries: true }, schedule: { start: "06:00", end: "14:30" } };
    }
    try {
      const saved = localStorage.getItem(EMP_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ── login form state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [empTab, setEmpTab] = useState("home");
  const [credBadgeCount, setCredBadgeCount] = useState(0);
  const [showReportProblem, setShowReportProblem] = useState(false);
  const [now, setNow] = useState(new Date());
  const [activeJsaId, setActiveJsaId] = useState(null);

  // ── geolocation ──
  const { position, error: geoError, loading: geoLoading, getPosition } = useGeolocation();
  const [geoStatus, setGeoStatus] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  // ── notifications ──
  const { requestPermission, scheduleClockReminder, getNextScheduledTime, sendNotification } = useNotifications();
  // Request notification permission on first mount
  const notifRequested = useRef(false);
  useEffect(() => {
    if (!notifRequested.current && activeEmp) {
      notifRequested.current = true;
      requestPermission();
    }
  }, [activeEmp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch material request status changes → notify on approval/delivery
  const prevMatStatuses = useRef({});
  useEffect(() => {
    if (!activeEmp) return;
    const myMats = materialRequests.filter(r => r.employeeId === activeEmp.id);
    myMats.forEach(r => {
      const prev = prevMatStatuses.current[r.id];
      if (prev && prev !== r.status && (r.status === "approved" || r.status === "delivered")) {
        sendNotification({
          title: `EBC · ${r.status === "approved" ? "Material Approved" : "Material Delivered"}`,
          body: `${r.material}${r.projectName ? " — " + r.projectName : ""}`,
          tag: `mat-${r.id}-${r.status}`,
        });
      }
      prevMatStatuses.current[r.id] = r.status;
    });
  }, [materialRequests, activeEmp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── schedule/project info state ──
  const [selectedInfoProject, setSelectedInfoProject] = useState(null);
  const [openSections, setOpenSections] = useState({});

  // ── project search for clock-in ──
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectSearch, setShowProjectSearch] = useState(false);

  // ── material request state ──
  const [matForm, setMatForm, { clearDraft: clearMatDraft, hasDraft: hasMatDraft }] = useFormDraft(
    `mat_request_${activeEmp?.id || "anon"}`,
    { material: "", qty: "", unit: "EA", notes: "", photo: null, photos: [] }
  );
  const [matProjectId, setMatProjectId] = useState(() => {
    // Auto-select today's assigned project
    const todayDay = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const todayEntry = (teamSchedule || []).find(s => String(s.employeeId) === String(activeEmp?.id) && s.days?.[todayDay] && s.projectId);
    return todayEntry?.projectId || null;
  });

  // ── clock map ──
  const clockMapRef = useRef(null);
  const clockMapInstance = useRef(null);
  const clockMarkersRef = useRef([]);
  // projectId → marker index so we can pan/zoom + open the popup for the
  // currently-selected project without re-scanning the marker array.
  const markersByProjectIdRef = useRef(new Map());
  const tileLayerRef = useRef(null);
  // Default to satellite. Map/Satellite are the only basemaps now —
  // street-level "look around" is a separate FAB that opens Google Street View.
  const [mapStyle, setMapStyle] = useState("satellite");

  // ── perimeter drawing ──
  const [drawingPerimeter, setDrawingPerimeter] = useState(false);
  const [perimeterPoints, setPerimeterPoints] = useState([]);
  const [perimeterProjectId, setPerimeterProjectId] = useState(null);
  const perimeterLayersRef = useRef([]);
  const drawingPolylineRef = useRef(null);
  const drawingMarkersRef = useRef([]);

  // ── clock tick ──
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── persist session ──
  useEffect(() => {
    if (activeEmp) {
      localStorage.setItem(EMP_SESSION_KEY, JSON.stringify(activeEmp));
    } else {
      localStorage.removeItem(EMP_SESSION_KEY);
    }
  }, [activeEmp]);

  // ── request notification permission on login ──
  useEffect(() => {
    if (activeEmp) {
      requestPermission().then((perm) => {
        if (perm === "granted" && activeEmp.schedule?.start) {
          const nextTime = getNextScheduledTime(activeEmp.schedule.start);
          if (nextTime) {
            scheduleClockReminder({
              employeeId: activeEmp.id,
              employeeName: activeEmp.name,
              scheduledTime: nextTime,
              projectName: "",
            });
          }
        }
      });
    }
  }, [activeEmp]);

  // ── login handler ──
  const handleLogin = async () => {
    setLoginError("");
    const { verifyPassword } = await import("../utils/passwordHash");
    let emp = null;
    for (const e of employees) {
      if (e.email === email.trim().toLowerCase() && e.active && e.role !== "Driver") {
        if (await verifyPassword(password, e.password)) { emp = e; break; }
      }
    }
    if (emp) {
      setActiveEmp(emp);
      setEmail("");
      setPassword("");
    } else {
      setLoginError(t("Invalid credentials"));
    }
  };

  // ── detect active clock-in ──
  const activeEntry = useMemo(() => {
    if (!activeEmp) return null;
    return timeEntries.find((e) => e.employeeId === activeEmp.id && !e.clockOut);
  }, [activeEmp, timeEntries]);

  const isClockedIn = !!activeEntry;

  // ── elapsed time for active entry ──
  const elapsed = useMemo(() => {
    if (!activeEntry) return "";
    const ms = now - new Date(activeEntry.clockIn);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }, [activeEntry, now]);

  const handleLogout = () => {
    setActiveEmp(null);
    setEmail("");
    setPassword("");
    setEmpTab("home");
    setGeoStatus(null);
    setSelectedProject(null);
    setSelectedInfoProject(null);
    if (app.onLogout) app.onLogout();
  };

  // ── geolocation check ──
  const checkLocation = useCallback(async () => {
    try {
      const pos = await getPosition();
      const nearest = findNearestGeofence(pos.lat, pos.lng, projects, companyLocations);
      const inRange = getLocationsInRange(pos.lat, pos.lng, projects, companyLocations);
      setGeoStatus({ nearest, locationsInRange: inRange });
      if (inRange.length > 0 && !selectedProject) {
        setSelectedProject(inRange[0]);
      }
      return { pos, nearest, inRange };
    } catch (err) {
      show("Location error: " + err, "err");
      return null;
    }
  }, [getPosition, projects, companyLocations, selectedProject, show]);

  // ── auto-detect location when clock tab is active and not clocked in ──
  useEffect(() => {
    if (activeEmp && empTab === "clock" && !isClockedIn && !geoStatus) {
      checkLocation();
    }
  }, [activeEmp, empTab, isClockedIn]);

  // ── clock map: init, markers, cleanup ──
  const [clockMapReady, setClockMapReady] = useState(false);

  useEffect(() => {
    if (!activeEmp || empTab !== "clock") return;
    const timer = setTimeout(() => {
      if (!clockMapRef.current) return;
      // If old map instance exists but its container was unmounted, clean up
      if (clockMapInstance.current) {
        if (clockMapInstance.current.getContainer() === clockMapRef.current) return; // still valid
        try { clockMapInstance.current.remove(); } catch {}
        clockMapInstance.current = null;
        clockMarkersRef.current = [];
        setClockMapReady(false);
      }
      const map = L.map(clockMapRef.current, {
        center: [29.76, -95.40],
        zoom: 9,
        attributionControl: false,
        zoomControl: true,
      });
      tileLayerRef.current = L.tileLayer(TILE_SETS[mapStyle], { maxZoom: 22 }).addTo(map);
      clockMapInstance.current = map;
      setTimeout(() => { map.invalidateSize(); setClockMapReady(true); }, 120);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeEmp, empTab]);

  // Switch tile layer when mapStyle changes
  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map || !tileLayerRef.current) return;
    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_SETS[mapStyle], { maxZoom: 22 }).addTo(map);
  }, [mapStyle]);

  // Google Street View "look around" href — GPS > selected project > map center.
  // Rendered as an <a href target="_blank"> so mobile Safari/Chrome treat it as
  // a real link (no popup-blocker, long-press works, etc.). Re-computes when
  // GPS or selected project changes; map-center fallback is set on FAB click.
  const streetViewHref = useMemo(() => {
    let lat = null, lng = null;
    if (position?.lat && position?.lng) { lat = position.lat; lng = position.lng; }
    else if (selectedProject?.lat && selectedProject?.lng) { lat = selectedProject.lat; lng = selectedProject.lng; }
    else if (clockMapInstance.current) {
      const c = clockMapInstance.current.getCenter();
      lat = c.lat; lng = c.lng;
    } else {
      lat = 29.76; lng = -95.40; // Houston fallback
    }
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  }, [position, selectedProject, clockMapReady, mapStyle]);

  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map || !clockMapReady) return;
    // clear old markers
    clockMarkersRef.current.forEach(m => map.removeLayer(m));
    clockMarkersRef.current = [];
    markersByProjectIdRef.current.clear();
    // add project markers
    projects.forEach(p => {
      if (!p.lat || !p.lng) return;
      const color = PHASE_COLORS[p.phase] || "var(--amber)";
      const icon = L.divIcon({
        className: "map-marker-wrap",
        html: `<div class="map-marker" style="background:${color};box-shadow:0 0 8px ${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      const suiteHtml = p.suite ? `<br/>Suite/Area: <b>${p.suite}</b>` : "";
      const parkingHtml = p.parking ? `<br/>Parking: ${p.parking}` : "";
      const navLink = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
      marker.bindPopup(`<div style="font-size:12px;min-width:180px"><b style="color:${color}">${p.name}</b><br/>${p.gc} · ${p.phase}<br/>${p.address || ""}${suiteHtml}${parkingHtml}<br/><a href="${navLink}" target="_blank" style="color:#3b82f6;text-decoration:underline;font-size:11px">Navigate</a></div>`);
      clockMarkersRef.current.push(marker);
      markersByProjectIdRef.current.set(String(p.id), marker);
    });
    // add user position marker
    if (position) {
      const userIcon = L.divIcon({
        className: "map-marker-wrap",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 12px rgba(59,130,246,0.6)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const userMarker = L.marker([position.lat, position.lng], { icon: userIcon }).addTo(map);
      userMarker.bindPopup(`<div style="font-size:12px"><b>You</b></div>`);
      clockMarkersRef.current.push(userMarker);
      // fit bounds to show user + nearby projects
      const bounds = L.latLngBounds([[position.lat, position.lng]]);
      projects.forEach(p => { if (p.lat && p.lng) bounds.extend([p.lat, p.lng]); });
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
    }
  }, [clockMapReady, projects, position]);

  // cleanup map on unmount or tab change
  useEffect(() => {
    return () => {
      if (clockMapInstance.current) {
        clockMapInstance.current.remove();
        clockMapInstance.current = null;
        setClockMapReady(false);
      }
    };
  }, []);

  // ── sync map to the currently-selected project ──
  // When a worker picks a jobsite from the geofence dropdown or the manual
  // search list, fly the map to that project and open its popup so the
  // "Navigate" link is immediately tappable. Falls back to fit-all when no
  // project is selected.
  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map || !clockMapReady) return;
    if (!selectedProject?.id) return;
    const marker = markersByProjectIdRef.current.get(String(selectedProject.id));
    if (!marker) return;
    const latlng = marker.getLatLng();
    // flyTo gives a smooth transition; fallback to setView for safety
    try {
      map.flyTo(latlng, 17, { duration: 0.6 });
    } catch {
      map.setView(latlng, 17);
    }
    // open popup once the pan finishes so it's anchored correctly
    const t = setTimeout(() => { try { marker.openPopup(); } catch {} }, 650);
    return () => clearTimeout(t);
  }, [selectedProject?.id, clockMapReady]);

  // ── render saved perimeters on map ──
  const PERIMETER_COLORS = ["#3b82f6", "#10b981", "#e09422", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899"];
  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map || !clockMapReady) return;
    // clear old perimeter layers
    perimeterLayersRef.current.forEach(layer => { try { map.removeLayer(layer); } catch {} });
    perimeterLayersRef.current = [];
    // draw saved perimeters
    projects.forEach((p, idx) => {
      if (!p.perimeter || p.perimeter.length < 3) return;
      const color = PERIMETER_COLORS[idx % PERIMETER_COLORS.length];
      const polygon = L.polygon(p.perimeter, {
        color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: "6 3",
      }).addTo(map);
      const areaSqFt = polygonAreaSqFt(p.perimeter);
      const areaLabel = areaSqFt >= 43560
        ? `${(areaSqFt / 43560).toFixed(2)} acres`
        : `${Math.round(areaSqFt).toLocaleString()} sq ft`;
      const insideText = position ? (pointInPolygon(position.lat, position.lng, p.perimeter)
        ? '<br/><span style="color:#10b981">&#x2713; You are inside this perimeter</span>'
        : '<br/><span style="color:#ef4444">&#x2717; You are outside this perimeter</span>') : '';
      polygon.bindPopup(`<div style="font-size:12px"><b style="color:${color}">${p.name}</b><br/>Area: ${areaLabel}${insideText}</div>`);
      perimeterLayersRef.current.push(polygon);
    });
  }, [clockMapReady, projects, position]);

  // ── invalidate map size when drawing mode changes ──
  useEffect(() => {
    const map = clockMapInstance.current;
    if (map) setTimeout(() => map.invalidateSize(), 350);
  }, [drawingPerimeter]);

  // ── perimeter drawing: update polyline preview ──
  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map) return;
    // clear old drawing preview
    if (drawingPolylineRef.current) { try { map.removeLayer(drawingPolylineRef.current); } catch {} drawingPolylineRef.current = null; }
    drawingMarkersRef.current.forEach(m => { try { map.removeLayer(m); } catch {} });
    drawingMarkersRef.current = [];
    if (!drawingPerimeter || perimeterPoints.length === 0) return;
    // draw polyline of current points
    const latlngs = perimeterPoints.map(pt => [pt[0], pt[1]]);
    if (latlngs.length >= 2) {
      // Close the polygon preview if 3+ points
      const previewPts = latlngs.length >= 3 ? [...latlngs, latlngs[0]] : latlngs;
      drawingPolylineRef.current = L.polyline(previewPts, { color: "var(--amber)", weight: 3, dashArray: "8 4" }).addTo(map);
    }
    // draw vertex markers
    latlngs.forEach((pt, i) => {
      const m = L.circleMarker(pt, {
        radius: 6, color: "var(--amber)", fillColor: i === 0 ? "#10b981" : "#f59e0b", fillOpacity: 1, weight: 2,
      }).addTo(map);
      m.bindTooltip(`Point ${i + 1}`, { permanent: false, direction: "top", offset: [0, -8] });
      drawingMarkersRef.current.push(m);
    });
  }, [drawingPerimeter, perimeterPoints]);

  // ── perimeter drawing: map click handler ──
  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map) return;
    const onClick = (e) => {
      if (!drawingPerimeter) return;
      setPerimeterPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    };
    map.on("click", onClick);
    return () => { map.off("click", onClick); };
  }, [drawingPerimeter, clockMapReady]);

  // ── perimeter drawing handlers ──
  const startDrawPerimeter = (projectId) => {
    setPerimeterProjectId(projectId);
    setPerimeterPoints([]);
    setDrawingPerimeter(true);
    show("Tap the map to place perimeter points", "ok");
  };

  const finishPerimeter = () => {
    if (perimeterPoints.length < 3) {
      show("Need at least 3 points to define a perimeter", "err");
      return;
    }
    setProjects(prev => prev.map(p =>
      p.id === perimeterProjectId ? { ...p, perimeter: perimeterPoints } : p
    ));
    setDrawingPerimeter(false);
    setPerimeterPoints([]);
    setPerimeterProjectId(null);
    show("Perimeter saved", "ok");
  };

  const cancelPerimeter = () => {
    setDrawingPerimeter(false);
    setPerimeterPoints([]);
    setPerimeterProjectId(null);
  };

  const clearPerimeter = (projectId) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, perimeter: null } : p
    ));
    show("Perimeter cleared", "ok");
  };

  const undoLastPoint = () => {
    setPerimeterPoints(prev => prev.slice(0, -1));
  };

  // ── clock in ──
  const handleClockIn = async () => {
    // refresh location right before clocking in
    const result = await checkLocation();
    if (!result) return;
    const { pos, inRange } = result;
    const target = selectedProject || (inRange.length > 0 ? inRange[0] : null);
    if (!target || !target.withinGeofence) {
      setShowOverride(true);
      return;
    }
    doClockIn(pos, target, "inside");
  };

  const doClockIn = (pos, target, status, reason) => {
    // Guard: auto-close any open entry to prevent overlaps (multi-tab, slow sync)
    if (activeEntry) {
      const clockIn = new Date(activeEntry.clockIn);
      const clockOut = new Date();
      const diffMs = clockOut - clockIn;
      const totalHours = +(diffMs / 3600000).toFixed(2);
      setTimeEntries((prev) =>
        prev.map((e) =>
          e.id === activeEntry.id
            ? { ...e, clockOut: clockOut.toISOString(), totalHours, notes: e.notes ? e.notes + " [auto-closed]" : "[auto-closed]" }
            : e
        )
      );
    }
    const entry = {
      id: crypto.randomUUID(),
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      projectId: target?.id || null,
      projectName: target?.name || "Unknown Location",
      clockIn: new Date().toISOString(),
      clockOut: null,
      clockInLat: pos.lat,
      clockInLng: pos.lng,
      clockOutLat: null,
      clockOutLng: null,
      geofenceStatus: status,
      overrideReason: reason || null,
      totalHours: null,
      notes: "",
      // Phase 2C: photo verification (captured in ForemanView; nullable for employees)
      photoUrl: null,
      captureStatus: null,
    };
    setTimeEntries((prev) => [entry, ...prev]);
    setShowOverride(false);
    setOverrideReason("");
    show("Clocked in — " + (target?.name || ""), "ok");
  };

  const handleOverrideClockIn = async () => {
    if (!overrideReason.trim()) return;
    const pos = position || (await getPosition());
    const nearest = geoStatus?.nearest || { name: "Off-site" };
    doClockIn(
      { lat: pos.lat, lng: pos.lng },
      nearest,
      "override",
      overrideReason.trim()
    );
  };

  // ── clock out ──
  const handleClockOut = async () => {
    if (!activeEntry) return;
    let outLat = null, outLng = null;
    try {
      const pos = await getPosition();
      outLat = pos.lat;
      outLng = pos.lng;
    } catch {}
    const clockIn = new Date(activeEntry.clockIn);
    const clockOut = new Date();
    const rawHours = (clockOut - clockIn) / 3600000;
    // Auto-deduct 30-min unpaid lunch for shifts over 6 hours
    const lunchDeducted = rawHours >= 6 ? 0.5 : 0;
    const totalHours = Math.round((rawHours - lunchDeducted) * 100) / 100;
    setTimeEntries((prev) =>
      prev.map((e) =>
        e.id === activeEntry.id
          ? { ...e, clockOut: clockOut.toISOString(), clockOutLat: outLat, clockOutLng: outLng, totalHours, lunchDeducted }
          : e
      )
    );
    const lunchNote = lunchDeducted > 0 ? ` (${rawHours.toFixed(1)}h - 30m ${t("lunch")} = ${totalHours.toFixed(2)}h)` : "";
    show(`${t("Clocked out")} — ${totalHours.toFixed(2)} ${t("hours")}${lunchNote}`, "ok");
  };

  // ── employee's time log (current week) ──
  const weekEntries = useMemo(() => {
    if (!activeEmp) return [];
    const monday = getWeekStart(new Date());
    return timeEntries
      .filter((e) => e.employeeId === activeEmp.id && new Date(e.clockIn) >= monday)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));
  }, [activeEmp, timeEntries]);

  const weekTotal = useMemo(
    () => weekEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
    [weekEntries]
  );

  // ── employee's projects (from time entries) ──
  const myProjectIds = useMemo(() => {
    if (!activeEmp) return new Set();
    return new Set(timeEntries.filter((e) => e.employeeId === activeEmp.id).map((e) => e.projectId));
  }, [activeEmp, timeEntries]);

  const myCOs = useMemo(
    () => changeOrders.filter((co) => myProjectIds.has(co.projectId)),
    [changeOrders, myProjectIds]
  );

  const myRFIs = useMemo(
    () => rfis.filter((r) => myProjectIds.has(r.projectId)),
    [rfis, myProjectIds]
  );

  // ── my team schedule this week ──
  const mySchedule = useMemo(() => {
    if (!activeEmp) return [];
    const weekStr = toDateStr(getWeekStart(new Date()));
    return teamSchedule.filter(s => s.employeeId === activeEmp.id && s.weekStart === weekStr);
  }, [activeEmp, teamSchedule]);

  // ── my assigned project IDs (from schedule) ──
  const myScheduledProjectIds = useMemo(() => {
    const ids = new Set();
    mySchedule.forEach(s => { if (s.projectId) ids.add(s.projectId); });
    return ids;
  }, [mySchedule]);

  // ── today's assigned project (for Drawings filter) ──
  const assignedProject = useMemo(() => {
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const todayAssignment = mySchedule.find(s => s.days?.[todayKey] && s.projectId);
    if (!todayAssignment) return null;
    return projects.find(p => p.id === todayAssignment.projectId) || null;
  }, [mySchedule, projects]);

  // ── Auto-cache assigned project drawings for offline use ──
  const { cacheDrawing, isCached } = useDrawingCache();
  const [drawingRevisionAlerts, setDrawingRevisionAlerts] = useState([]);

  useEffect(() => {
    if (!assignedProject || !network.online) return;
    let cancelled = false;

    (async () => {
      try {
        const drawings = await getDrawingsByProject(assignedProject.id);
        if (cancelled || !drawings?.length) return;

        // Check for revision changes → generate alerts
        const cachedMeta = JSON.parse(localStorage.getItem("ebc_downloadedDrawings") || "{}");
        const lastSeenRevisions = JSON.parse(localStorage.getItem("ebc_drawing_revisions") || "{}");
        const alerts = [];

        for (const d of drawings) {
          const path = d.storagePath || `drawings/project-${assignedProject.id}/${d.fileName}`;
          const prevRev = lastSeenRevisions[path];
          if (prevRev && d.revision && d.revision > prevRev) {
            alerts.push({ drawing: d.fileName?.replace(".pdf", "").replace(/_/g, " ") || "Drawing", oldRev: prevRev, newRev: d.revision, revLabel: d.revisionLabel || `Rev ${d.revision}` });
          }
          // Update seen revisions
          if (d.revision) lastSeenRevisions[path] = d.revision;

          // Auto-cache current drawings that aren't cached yet (or are stale)
          if (d.isCurrent !== false) {
            const meta = cachedMeta[path];
            const isStale = meta?.cachedAt && d.updatedAt && new Date(d.updatedAt) > new Date(meta.cachedAt);
            if (!meta || isStale) {
              try {
                const blob = await downloadFile(path);
                if (!cancelled) await cacheDrawing(path, blob);
              } catch {} // silently skip — drawing will load from network when needed
            }
          }
        }

        localStorage.setItem("ebc_drawing_revisions", JSON.stringify(lastSeenRevisions));
        if (alerts.length > 0 && !cancelled) setDrawingRevisionAlerts(alerts);
      } catch {} // no-op — drawings are optional
    })();

    return () => { cancelled = true; };
  }, [assignedProject?.id, network.online]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── my material requests ──
  const myMatRequests = useMemo(() => {
    if (!activeEmp) return [];
    return materialRequests
      .filter(r => r.employeeId === activeEmp.id)
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [activeEmp, materialRequests]);

  // ── format helpers ──
  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  // ── language toggle for PortalHeader ──
  const langToggle = <LanguageToggle lang={lang} onChange={setLang} />;

  // ── role-aware tabs ──
  const tabs = useMemo(() => {
    const base = [
      { key: "clock", label: t("Clock") },
      { key: "schedule", label: t("Schedule") },
      { key: "materials", label: t("Materials") },
      { key: "settings", label: t("Settings") },
    ];
    return base;
  }, [activeEmp, lang, isClockedIn]);

  // ── portal tab bar definition ──
  const isCrewRole = !!activeEmp && (activeEmp.role === "Crew" || activeEmp.role === "Employee");
  const portalTabs = [
    // ── Primary (4 + More) — frequency-driven: Home, Clock, Log Work, Drawings ──
    { id: "home", label: t("Home"), icon: Home, badge: false },
    { id: "clock", label: t("Clock"), icon: Clock, badge: isClockedIn },
    { id: "production", label: t("Log Work"), icon: BarChart3, badge: false },
    { id: "drawings", label: t("Drawings"), icon: FileText, badge: false },
    // ── More overflow (ranked by crew use frequency) ──
    { id: "schedule", label: t("Schedule"), icon: Calendar, badge: false },
    { id: "materials", label: t("Materials"), icon: Package, badge: myMatRequests?.some(r => r.status === "requested") },
    { id: "jsa", label: t("JSA"), icon: ShieldCheck, badge: false },
    { id: "log", label: t("My Hours"), icon: ClipboardList, badge: false },
    ...(!isCrewRole ? [
      { id: "cos", label: t("Change Orders"), icon: FileText, badge: false },
      { id: "rfis", label: t("RFIs"), icon: FileText, badge: false },
    ] : []),
    { id: "credentials", label: t("Credentials"), icon: Shield, badge: credBadgeCount > 0 ? credBadgeCount : false },
    { id: "settings", label: t("Settings"), icon: Settings, badge: false },
  ];

  // ── material request submit ──
  const handleMatSubmit = () => {
    if (!matProjectId || !matForm.material.trim() || !matForm.qty) return;
    const proj = projects.find(p => String(p.id) === String(matProjectId));
    const photos = matForm.photos || [];
    const photoUrl = photos.length > 0 ? photos[0] : (matForm.photo ? URL.createObjectURL(matForm.photo) : null);
    const newReq = {
      id: crypto.randomUUID(),
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      projectId: matProjectId,
      projectName: proj?.name || "",
      material: matForm.material.trim(),
      qty: Number(matForm.qty),
      unit: matForm.unit,
      notes: matForm.notes.trim(),
      photoUrl,
      status: "requested",
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      deliveredAt: null,
      driverId: null,
    };
    setMaterialRequests(prev => [newReq, ...prev]);
    clearMatDraft();
    show(t("Request Material") + " — " + newReq.material, "ok");
  };

  // ── toggle section ──
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── status label helper ──
  const statusLabel = (s) => {
    const map = { requested: t("Requested"), approved: t("Approved"), "in-transit": t("In Transit"), delivered: t("Delivered") };
    return map[s] || s;
  };
  const statusClass = (s) => {
    const map = { requested: "mat-status-requested", approved: "mat-status-approved", "in-transit": "mat-status-in-transit", delivered: "mat-status-delivered" };
    return "badge " + (map[s] || "badge-muted");
  };

  // ── notification toggle helper ──
  const handleNotificationToggle = (key) => {
    const updated = { ...activeEmp, notifications: { ...activeEmp.notifications, [key]: !activeEmp.notifications?.[key] } };
    setActiveEmp(updated);
  };

  // ── initials for avatar ──
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!activeEmp) {
    return (
      <div className="employee-app">
        <PortalHeader variant="employee" languageToggle={langToggle} t={t} />
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted emp-settings-center">{t("Employee Portal")}</div>
            <div className="login-form">
              <input
                type="email"
                className="login-input"
                placeholder={t("Email")}
                value={email}
                onChange={e => { setEmail(e.target.value); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <input
                type="password"
                className="login-input"
                placeholder={t("Password")}
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              {loginError && <div className="login-error">{loginError}</div>}
              <button className="login-btn" onClick={handleLogin}>{t("Sign In")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT INFO PANEL (drill-down from Schedule)
  // ═══════════════════════════════════════════════════════════════
  if (selectedInfoProject) {
    const proj = projects.find(p => String(p.id) === String(selectedInfoProject));
    if (!proj) { setSelectedInfoProject(null); return null; }
    const projSubs = (submittals || []).filter(s => s.projectId === proj.id);
    const projCOs = changeOrders.filter(co => co.projectId === proj.id);
    const projRFIs = rfis.filter(r => r.projectId === proj.id);
    const isForeman = activeEmp.role === "Foreman";

    return (
      <div className="employee-app">
        <PortalHeader
          variant="employee"
          userName={activeEmp.name}
          languageToggle={langToggle}
          settingsAction={() => { setSelectedInfoProject(null); setEmpTab("settings"); }}
          t={t}
          network={network}
        />
        <div className="employee-body emp-content-pad">
          <div className="project-info">
            <button className="project-info-back" onClick={() => setSelectedInfoProject(null)}>
              ← {t("Back to Schedule")}
            </button>
            <div className="clock-card emp-clock-card-left">
              <div className="text-lg font-bold text-amber mb-8">{proj.name}</div>

              <div className="project-info-field">
                <span className="project-info-label">{t("General Contractor")}</span>
                <span className="project-info-value">{proj.gc}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Superintendent")}</span>
                <span className="project-info-value">{proj.superintendent || "—"}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Project Manager")}</span>
                <span className="project-info-value">{proj.pm || "—"}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Address")}</span>
                <span className="project-info-value">{proj.address || "—"}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Phase")}</span>
                <span className="project-info-value">{proj.phase}</span>
              </div>

              <div className="emp-project-progress-bar">
                <div className="flex-between mb-4">
                  <span className="text-xs text-dim">{t("Progress")}</span>
                  <span className="text-xs font-mono text-amber">{proj.progress}%</span>
                </div>
                <div className="project-progress-bar">
                  <div className="project-progress-fill" style={{ width: `${proj.progress}%` }} />
                </div>
              </div>

              {proj.emergencyContact && (
                <div className="emp-emergency-box">
                  <div className="text-xs font-semi text-red mb-4">{t("Emergency Contact")}</div>
                  <div className="text-sm">{proj.emergencyContact.name} — {proj.emergencyContact.role}</div>
                  <a href={`tel:${proj.emergencyContact.phone}`} className="text-sm text-amber emp-emergency-link">
                    {proj.emergencyContact.phone}
                  </a>
                </div>
              )}
            </div>

            {/* ── Foreman-only document sections ── */}
            {isForeman && (
              <div className="emp-info-section">
                {/* Submittals */}
                <div className="clock-card emp-info-card emp-clock-card-left">
                  <div className="project-section-header" onClick={() => toggleSection("subs")}>
                    <span>{t("Submittals")} ({projSubs.length})</span>
                    <span>{openSections.subs ? "▾" : "▸"}</span>
                  </div>
                  {openSections.subs && (
                    projSubs.length === 0 ? (
                      <div className="text-xs text-muted mt-8">{t("No submittals")}</div>
                    ) : (
                      <div className="emp-list-col">
                        {projSubs.map(s => (
                          <div key={s.id} className="flex-between emp-list-row">
                            <div>
                              <div className="text-sm font-semi">{s.number}</div>
                              <div className="text-xs text-muted">{s.desc}</div>
                            </div>
                            <span className={`badge ${s.status === "approved" ? "badge-green" : s.status === "submitted" ? "badge-amber" : "badge-muted"}`}>
                              {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Change Orders */}
                <div className="clock-card emp-info-card emp-clock-card-left">
                  <div className="project-section-header" onClick={() => toggleSection("cos")}>
                    <span>{t("Change Orders")} ({projCOs.length})</span>
                    <span>{openSections.cos ? "▾" : "▸"}</span>
                  </div>
                  {openSections.cos && (
                    projCOs.length === 0 ? (
                      <div className="text-xs text-muted mt-8">{t("No change orders")}</div>
                    ) : (
                      <div className="emp-list-col">
                        {projCOs.map(co => (
                          <div key={co.id} className="flex-between emp-list-row">
                            <div>
                              <div className="text-sm font-semi">{co.number}</div>
                              <div className="text-xs text-muted">{co.desc}</div>
                            </div>
                            <span className="text-sm font-mono text-amber">${Number(co.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* RFIs */}
                <div className="clock-card emp-clock-card-left">
                  <div className="project-section-header" onClick={() => toggleSection("rfis")}>
                    <span>{t("RFIs")} ({projRFIs.length})</span>
                    <span>{openSections.rfis ? "▾" : "▸"}</span>
                  </div>
                  {openSections.rfis && (
                    projRFIs.length === 0 ? (
                      <div className="text-xs text-muted mt-8">{t("No RFIs")}</div>
                    ) : (
                      <div className="emp-list-col">
                        {projRFIs.map(rfi => (
                          <div key={rfi.id} className="emp-list-row">
                            <div className="flex-between mb-4">
                              <span className="text-sm font-semi">{rfi.number}</span>
                              <span className={`badge ${rfi.status === "answered" ? "badge-green" : "badge-amber"}`}>
                                {rfi.status}
                              </span>
                            </div>
                            <div className="text-xs text-muted">{rfi.subject}</div>
                            {rfi.response && (
                              <div className="text-xs text-green mt-4">{t("Response")}: {rfi.response}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAIN EMPLOYEE VIEW (logged in)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="employee-app crew-view">
      {/* Report Problem Modal */}
      {showReportProblem && (
        <ReportProblemModal
          reporter={activeEmp.name}
          projects={projects}
          defaultProjectId={selectedProject?.id}
          areas={areas}
          t={t}
          onSave={(problem) => {
            setProblems(prev => [problem, ...(prev || [])]);
            setShowReportProblem(false);
            show("Problem reported", "ok");
          }}
          onClose={() => setShowReportProblem(false)}
        />
      )}

      <PortalHeader
        variant="employee"
        userName={activeEmp.name}
        languageToggle={langToggle}
        settingsAction={() => setEmpTab("settings")}
        t={t}
        network={network}
      />

      <div className="employee-body emp-content-pad">
        {/* Offline status chip — visible across all tabs */}
        {!network.online && (
          <div className="offline-status-chip">
            <span className="offline-pulse-dot" />
            {t("Offline Mode")} — {t("saved locally")}
            {network.lastSync > 0 && <span className="offline-last-sync">{t("Last synced")}: {(() => { const m = Math.round((Date.now() - network.lastSync) / 60000); return m < 1 ? t("just now") : `${m}m ago`; })()}</span>}
          </div>
        )}

        {/* ═══ HOME TAB ═══ */}
        {empTab === "home" && (<>
          {/* Today's Work is rendered inside HomeTab — no duplicate inline card */}
          <HomeTab
            activeEmp={activeEmp}
            isClockedIn={isClockedIn}
            activeEntry={activeEntry}
            now={now}
            weekTotal={weekTotal}
            mySchedule={mySchedule}
            myMatRequests={myMatRequests}
            projects={projects}
            setEmpTab={setEmpTab}
            setSelectedInfoProject={setSelectedInfoProject}
            onReportProblem={() => setShowReportProblem(true)}
            areas={areas}
            schedule={teamSchedule}
            drawingRevisionAlerts={drawingRevisionAlerts}
            t={t}
            lang={lang}
          />
        </>)}

        {/* ═══ CLOCK TAB ═══ */}
        {empTab === "clock" && (
          <div className="emp-content">
            {/* Quick Clock In — big button when scheduled assignment exists, not clocked in */}
            {!isClockedIn && assignedProject && (
              <div className="clock-in-hero">
                <div className="text-xs text-muted mb-4">{t("Scheduled today")}</div>
                <div className="text-base font-bold mb-8" style={{ color: "var(--green)" }}>{assignedProject.name}</div>
                <FieldButton
                  variant="primary"
                  className="clock-in-cta"
                  onClick={() => {
                    setSelectedProject({ id: assignedProject.id, name: assignedProject.name, withinGeofence: true });
                    handleClockIn();
                  }}
                  t={t}
                >
                  {t("CLOCK IN")}
                </FieldButton>
                <div className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>{t("GPS check runs in background")}</div>
              </div>
            )}

            <div className="clock-card">
              <div className={`clock-status ${isClockedIn ? "in" : "out"}`}>
                {isClockedIn ? t("Clocked In") : t("Clocked Out")}
              </div>
              <div className="clock-time">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              {isClockedIn && (
                <>
                  <div className="clock-project">{activeEntry.projectName}</div>
                  <div className="text-sm text-amber mb-16 emp-font-mono">
                    {elapsed}
                  </div>
                </>
              )}

              {/* Geo status — only show a specific project callout when we're
                  genuinely near one (<=2000 ft). Far-away "Outside — 35,000 ft"
                  messages were noise and have been suppressed in favor of a
                  neutral muted hint. */}
              {geoStatus?.nearest && geoStatus.nearest.withinGeofence && (
                <div className="geo-status inside">
                  <span className="geo-dot" />
                  Inside — {geoStatus.nearest.name} ({geoStatus.nearest.distance} ft)
                </div>
              )}
              {geoStatus?.nearest && !geoStatus.nearest.withinGeofence && geoStatus.nearest.distance <= 2000 && (
                <div className="geo-status outside">
                  <span className="geo-dot" />
                  Outside — {geoStatus.nearest.name} ({geoStatus.nearest.distance} ft)
                </div>
              )}
              {geoStatus?.nearest && !geoStatus.nearest.withinGeofence && geoStatus.nearest.distance > 2000 && (
                <div className="text-xs text-muted" style={{ textAlign: "center", marginBottom: "var(--space-3)" }}>
                  No nearby jobsites — search manually below
                </div>
              )}
              {geoLoading && (
                <div className="geo-status inside">
                  <span className="geo-dot" /> {t("Getting location...")}
                </div>
              )}
              {geoError && !geoLoading && (
                <div className="geo-status outside">
                  <span className="geo-dot" /> {geoError}
                </div>
              )}

              {!isClockedIn && geoStatus?.locationsInRange?.length > 1 && !showProjectSearch && (
                <div className="form-group mb-16">
                  <label className="form-label">{t("Job Site")} (GPS)</label>
                  <select
                    className="form-select"
                    value={selectedProject?.id || ""}
                    onChange={(e) => {
                      const loc = geoStatus.locationsInRange.find(
                        (l) => String(l.id) === e.target.value
                      );
                      setSelectedProject(loc);
                    }}
                  >
                    {geoStatus.locationsInRange.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.distance} ft)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Project Search / Lookup ── */}
              {!isClockedIn && (
                <div className="form-group mb-16">
                  {!showProjectSearch ? (
                    <FieldButton
                      variant="ghost"
                      className="emp-search-btn"
                      onClick={() => setShowProjectSearch(true)}
                    >
                      <Search size={14} />{t("Search project manually")}
                    </FieldButton>
                  ) : (
                    <>
                      <label className="form-label">{t("Search Project")}</label>
                      <input
                        className="form-input mb-8"
                        type="text"
                        placeholder={t("Type project name or address...")}
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        autoFocus
                      />
                      <div className="emp-search-results">
                        {projects
                          .filter(p => {
                            if (!projectSearch.trim()) return true;
                            const q = projectSearch.toLowerCase();
                            return (p.name || "").toLowerCase().includes(q) ||
                                   (p.address || "").toLowerCase().includes(q) ||
                                   (p.gc || "").toLowerCase().includes(q);
                          })
                          .slice(0, 8)
                          .map(p => (
                            <button
                              key={p.id}
                              className={`emp-search-item${selectedProject?.id === p.id ? " active" : ""}`}
                              onClick={() => {
                                setSelectedProject({ id: p.id, name: p.name, withinGeofence: true });
                                setShowProjectSearch(false);
                                setProjectSearch("");
                              }}
                            >
                              <div className="text-sm font-semi">{p.name}</div>
                              <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                            </button>
                          ))}
                      </div>
                      <FieldButton
                        variant="ghost"
                        className="emp-search-btn mt-8"
                        onClick={() => { setShowProjectSearch(false); setProjectSearch(""); }}
                      >
                        {t("Cancel")}
                      </FieldButton>
                    </>
                  )}
                </div>
              )}

              {/* Show selected project */}
              {!isClockedIn && selectedProject && (
                <div className="text-sm font-semi emp-accent-label">
                  <MapPin size={14} />{selectedProject.name}
                </div>
              )}

              {isClockedIn ? (
                <FieldButton className="clock-btn clock-out" onClick={handleClockOut}>
                  {t("Clock Out")}
                </FieldButton>
              ) : geoLoading ? (
                <FieldButton className="clock-btn clock-in" disabled>
                  {t("Getting location...")}
                </FieldButton>
              ) : !geoStatus ? (
                <FieldButton className="clock-btn clock-in" disabled>
                  {t("Getting location...")}
                </FieldButton>
              ) : (
                <FieldButton className="clock-btn clock-in" onClick={handleClockIn}>
                  {t("Clock In")}
                </FieldButton>
              )}
            </div>

            {showOverride && (
              <div className="clock-card emp-override-card">
                <div className="text-sm text-amber font-semi mb-8">
                  {t("You are outside the geofence. Enter a reason to override:")}
                </div>
                <textarea
                  className="form-textarea w-full mb-12"
                  placeholder="e.g., Parking lot across street..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                />
                <div className="btn-group emp-override-actions">
                  <FieldButton variant="ghost" onClick={() => { setShowOverride(false); setOverrideReason(""); }}>
                    {t("Cancel")}
                  </FieldButton>
                  <FieldButton
                    variant="primary"
                    onClick={handleOverrideClockIn}
                    disabled={!overrideReason.trim()}
                  >
                    {t("Override & Clock In")}
                  </FieldButton>
                </div>
              </div>
            )}

            {/* ── Map ── */}
            <div className="clock-card emp-clock-map-card">
              <div ref={clockMapRef} className="emp-clock-map" style={{ height: drawingPerimeter ? 380 : 280, cursor: drawingPerimeter ? "crosshair" : "" }} />
              {/* Tile switcher — Map (OSM streets) / Satellite */}
              <div className="emp-map-tile-bar">
                {Object.keys(TILE_SETS).map(key => (
                  <button
                    key={key}
                    className={`emp-map-tile-btn${mapStyle === key ? " active" : ""}`}
                    onClick={() => setMapStyle(key)}
                  >
                    {MAP_STYLE_LABELS[key]}
                  </button>
                ))}
              </div>
              {/* Street View "look around" — real <a> so mobile browsers treat it as a link */}
              {!drawingPerimeter && (
                <a
                  href={streetViewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="emp-map-street-fab"
                  aria-label="Open Google Street View"
                  title="Street View"
                >
                  <Binoculars size={20} />
                </a>
              )}
              {/* Drawing mode controls */}
              {drawingPerimeter && (
                <div className="emp-perimeter-bar">
                  <span className="emp-perimeter-label">
                    {perimeterPoints.length} {perimeterPoints.length === 1 ? "point" : "points"}
                  </span>
                  <button className="emp-perimeter-btn" onClick={undoLastPoint} disabled={perimeterPoints.length === 0}>
                    Undo
                  </button>
                  <button className={`emp-perimeter-btn emp-perimeter-btn--save${perimeterPoints.length < 3 ? " disabled" : ""}`} onClick={finishPerimeter} disabled={perimeterPoints.length < 3}>
                    Finish
                  </button>
                  <button className="emp-perimeter-btn emp-perimeter-btn--cancel" onClick={cancelPerimeter}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* ── Perimeter controls per project ── */}
            {!drawingPerimeter && (
              <div className="clock-card emp-info-section emp-log-entry">
                <div className="text-xs text-dim mb-8 emp-project-list-header">
                  Project Perimeters
                </div>
                <div className="emp-log-list">
                  {projects.filter(p => p.lat && p.lng).slice(0, 8).map((p, idx) => {
                    const hasPerimeter = p.perimeter && p.perimeter.length >= 3;
                    const color = PERIMETER_COLORS[idx % PERIMETER_COLORS.length];
                    const areaSqFt = hasPerimeter ? polygonAreaSqFt(p.perimeter) : 0;
                    const areaLabel = areaSqFt >= 43560
                      ? `${(areaSqFt / 43560).toFixed(2)} acres`
                      : `${Math.round(areaSqFt).toLocaleString()} sq ft`;
                    const isInside = hasPerimeter && position ? pointInPolygon(position.lat, position.lng, p.perimeter) : false;
                    return (
                      <div key={p.id} className="emp-project-row">
                        <div className="emp-project-dot" style={{ background: color }} />
                        <div className="emp-project-name-col">
                          <div className="emp-project-name">{p.name}</div>
                          {hasPerimeter && (
                            <div className="emp-project-meta">
                              {areaLabel} &middot; {p.perimeter.length} pts
                              {position && (
                                <span style={{ marginLeft: "var(--space-2)", color: isInside ? "var(--green)" : "var(--red)" }}>
                                  {isInside ? "Inside" : "Outside"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Perimeter controls: restricted to foreman/PM/admin/super only */}
                        {!isCrewRole && (
                          <div className="emp-project-actions">
                            {hasPerimeter ? (
                              <button className="emp-project-action-btn emp-project-action-btn--delete" onClick={() => clearPerimeter(p.id)}>
                                Clear
                              </button>
                            ) : null}
                            <button className="emp-project-action-btn emp-project-action-btn--draw" onClick={() => startDrawPerimeter(p.id)} style={{ background: hasPerimeter ? "var(--surface-alt)" : color, color: hasPerimeter ? "var(--text-muted)" : "#fff" }}>
                              {hasPerimeter ? "Redraw" : "Draw Perimeter"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="clock-card emp-info-section">
              <div className="text-xs text-dim mb-8 emp-project-list-header">
                {t("This Week")}
              </div>
              <div className="flex-between">
                <span className="text-sm text-muted">{weekEntries.length} {t("entries")}</span>
                <span className="text-md font-bold text-amber">{weekTotal.toFixed(1)}h</span>
              </div>
            </div>

            {/* Report Problem button */}
            <FieldButton
              variant="ghost"
              className="emp-report-problem-btn"
              onClick={() => setShowReportProblem(true)}
            >
              <AlertTriangle size={22} />
              {t("Report a Problem")}
            </FieldButton>
          </div>
        )}

        {/* ═══ SCHEDULE TAB ═══ */}
        {empTab === "schedule" && (
          <ScheduleTab
            activeEmp={activeEmp}
            mySchedule={mySchedule}
            projects={projects}
            setEmpTab={setEmpTab}
            t={t}
            lang={lang}
            isOnline={network.isOnline}
            show={show}
          />
        )}

        {/* ═══ TIME LOG TAB — daily grouped with totals ═══ */}
        {empTab === "log" && (() => {
          // Group entries by date
          const dayGroups = {};
          weekEntries.forEach(entry => {
            const day = new Date(entry.clockIn).toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "short", month: "short", day: "numeric" });
            if (!dayGroups[day]) dayGroups[day] = [];
            dayGroups[day].push(entry);
          });
          return (
            <div className="emp-content">
              <div className="section-header">
                <div>
                  <div className="section-title emp-section-title">{t("My Hours")}</div>
                  <div className="section-sub">{t("This Week")} — <strong>{weekTotal.toFixed(1)}h</strong></div>
                </div>
              </div>
              {weekEntries.length === 0 ? (
                <EmptyState icon={Clock} heading={t("No entries this week")} t={t} />
              ) : (
                <div className="emp-log-list">
                  {Object.entries(dayGroups).map(([dayLabel, entries]) => {
                    const dayTotal = entries.reduce((s, e) => s + (e.totalHours || 0), 0);
                    return (
                      <div key={dayLabel}>
                        {/* Day header with total */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0 var(--space-1)", borderBottom: "2px solid var(--border)" }}>
                          <span className="text-sm font-bold">{dayLabel}</span>
                          <span className="text-sm font-bold" style={{ color: "var(--amber)" }}>{dayTotal.toFixed(1)}h</span>
                        </div>
                        {entries.map((entry) => (
                          <div key={entry.id} className="card emp-log-entry" style={{ marginTop: "var(--space-1)" }}>
                            <div className="flex-between mb-4">
                              <span className="text-xs text-muted">{entry.projectName}</span>
                              <span className={`badge ${entry.geofenceStatus === "inside" ? "badge-green" : entry.geofenceStatus === "override" ? "badge-amber" : "badge-red"}`}>
                                {entry.geofenceStatus}
                              </span>
                            </div>
                            <div className="flex-between">
                              <span className="text-xs font-mono text-muted">
                                {fmtTime(entry.clockIn)} — {fmtTime(entry.clockOut)}
                              </span>
                              <span className="text-sm font-bold text-amber">
                                {entry.totalHours ? entry.totalHours.toFixed(2) + "h" : t("Active")}
                              </span>
                            </div>
                            {entry.lunchDeducted > 0 && (
                              <div className="text-xs text-dim mt-2">
                                {(entry.totalHours + entry.lunchDeducted).toFixed(1)}h {t("worked")} - 30m {t("lunch")} = {entry.totalHours.toFixed(1)}h {t("paid")}
                              </div>
                            )}
                            {entry.overrideReason && (
                              <div className="text-xs text-dim mt-2">{t("Override")}: {entry.overrideReason}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ JSA TAB ═══ */}
        {empTab === "jsa" && (() => {
          // JSAs for my projects
          const allMyProjectIds = new Set([...myProjectIds, ...myScheduledProjectIds]);
          const myJsaList = (jsas || []).filter(j => allMyProjectIds.has(j.projectId) && (j.status === "active" || j.status === "draft"))
            .sort((a, b) => b.date.localeCompare(a.date));

          // Detail view
          if (activeJsaId) {
            const jsa = (jsas || []).find(j => j.id === activeJsaId);
            if (!jsa) { setActiveJsaId(null); return null; }
            const allHazards = jsa.steps.flatMap(s => s.hazards || []);
            const maxRisk = Math.max(0, ...allHazards.map(h => (h.likelihood || 1) * (h.severity || 1)));
            const rc = riskColor(maxRisk);
            const alreadySigned = (jsa.teamSignOn || []).some(c => c.employeeId === activeEmp.id);
            const proj = projects.find(p => p.id === jsa.projectId);

            return (
              <div className="emp-content">
                <button className="cal-nav-btn emp-jsa-back-btn" onClick={() => setActiveJsaId(null)}>{t("← Back")}</button>

                <div className="emp-jsa-badges">
                  <StatusBadge status={jsa.status === "active" ? "approved" : "pending"} t={() => jsa.status.toUpperCase()} />
                  <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label} Risk</span>
                </div>

                <h3 className="emp-jsa-title">{jsa.title}</h3>
                <div className="emp-jsa-meta">
                  {proj?.name} · {jsa.date} · {jsa.supervisor}
                </div>

                {/* Sign-On with Signature Pad */}
                {jsa.status === "active" && !alreadySigned && (() => {
                  const sigCanvasRef = React.createRef();
                  let sigDrawing = false;
                  let sigHasStrokes = false;
                  return (
                    <div className="emp-jsa-sign-section">
                      {/* Hazard acknowledgment header */}
                      <div className="emp-jsa-sign-banner">
                        <div className="emp-jsa-sign-banner-title"><AlertTriangle size={16} />{t("Review & Sign")}</div>
                        <div className="emp-jsa-sign-banner-sub">
                          {lang === "es" ? "Revise los peligros abajo y firme para reconocer" : "Review hazards below and sign to acknowledge"}
                        </div>
                      </div>

                      {/* Signature pad */}
                      <div className="mb-8">
                        <div className="emp-jsa-sign-label">{t("Sign below")}</div>
                        <canvas ref={sigCanvasRef}
                          className="emp-jsa-canvas"
                          onMouseDown={(e) => { e.preventDefault(); const ctx = sigCanvasRef.current.getContext("2d"); const rect = sigCanvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top); sigDrawing = true; }}
                          onMouseMove={(e) => { if (!sigDrawing) return; e.preventDefault(); const ctx = sigCanvasRef.current.getContext("2d"); const rect = sigCanvasRef.current.getBoundingClientRect(); ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke(); sigHasStrokes = true; }}
                          onMouseUp={(e) => { if (e) e.preventDefault(); sigDrawing = false; }}
                          onMouseLeave={() => { sigDrawing = false; }}
                          onTouchStart={(e) => { e.preventDefault(); const ctx = sigCanvasRef.current.getContext("2d"); const rect = sigCanvasRef.current.getBoundingClientRect(); const touch = e.touches[0]; ctx.beginPath(); ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top); sigDrawing = true; }}
                          onTouchMove={(e) => { if (!sigDrawing) return; e.preventDefault(); const ctx = sigCanvasRef.current.getContext("2d"); const rect = sigCanvasRef.current.getBoundingClientRect(); const touch = e.touches[0]; ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top); ctx.stroke(); sigHasStrokes = true; }}
                          onTouchEnd={(e) => { if (e) e.preventDefault(); sigDrawing = false; }}
                          ref={(canvas) => {
                            if (!canvas || canvas._init) return;
                            canvas._init = true;
                            const ctx = canvas.getContext("2d");
                            const rect = canvas.getBoundingClientRect();
                            canvas.width = rect.width * (window.devicePixelRatio || 1);
                            canvas.height = rect.height * (window.devicePixelRatio || 1);
                            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
                            ctx.strokeStyle = "#1e2d3b";
                            ctx.lineWidth = 3;
                            ctx.lineCap = "round";
                            ctx.lineJoin = "round";
                            sigCanvasRef.current = canvas;
                          }}
                        />
                      </div>

                      <FieldButton variant="primary" className="emp-jsa-submit-btn"
                        onClick={() => {
                          const canvas = sigCanvasRef.current;
                          if (!canvas) return;
                          const sigData = canvas.toDataURL("image/png");
                          setJsas(prev => prev.map(j => j.id === jsa.id ? {
                            ...j, teamSignOn: [...(j.teamSignOn || []), { employeeId: activeEmp.id, name: activeEmp.name, signedAt: new Date().toISOString(), signature: sigData }]
                          } : j));
                          show(t("You have signed the JSA"), "ok");
                        }}>
                        <PenLine size={16} />{t("I Acknowledge & Sign")}
                      </FieldButton>
                    </div>
                  );
                })()}
                {alreadySigned && (
                  <div className="emp-jsa-signed-notice">
                    ✓ {t("You have signed this JSA")}
                  </div>
                )}

                {/* PPE */}
                <div className="emp-jsa-ppe-section">
                  <div className="emp-jsa-ppe-label">{t("Required PPE")}</div>
                  <div className="emp-jsa-ppe-grid">
                    {(jsa.ppe || []).map(k => {
                      const item = PPE_ITEMS.find(p => p.key === k);
                      return item ? (
                        <div key={k} className="emp-jsa-ppe-item">
                          <div className="emp-jsa-ppe-icon">{item.icon}</div>
                          <div className="emp-jsa-ppe-name">{lang === "es" ? item.labelEs : item.label}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Steps & Hazards */}
                <div className="emp-jsa-steps-section">
                  <div className="emp-jsa-ppe-label">{t("Job Steps & Hazards")}</div>
                  {(jsa.steps || []).map((step, idx) => (
                    <div key={step.id} className="card emp-jsa-step-card">
                      <div className="emp-jsa-step-header">
                        <span className="emp-jsa-step-number">{idx + 1}</span>
                        <span className="emp-jsa-step-name">{step.step}</span>
                      </div>
                      {(step.hazards || []).map((h, hi) => {
                        const score = (h.likelihood || 1) * (h.severity || 1);
                        const hrc = riskColor(score);
                        return (
                          <div key={hi} className="emp-jsa-hazard-row">
                            <div className="emp-jsa-hazard-header">
                              <span className="emp-jsa-hazard-score" style={{ background: hrc.bg }}>{score}</span>
                              <span className="emp-jsa-hazard-name">{h.hazard}</span>
                            </div>
                            {h.hazardEs && <div className="emp-jsa-hazard-es">{h.hazardEs}</div>}
                            <div className="emp-jsa-hazard-control">
                              {(h.controls || []).map((c, ci) => <span key={ci}>✓ {c}{ci < h.controls.length - 1 ? " · " : ""}</span>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Crew who signed */}
                <div className="emp-jsa-crew-section">
                  <div className="emp-jsa-ppe-label">{t("Crew Signed")} ({(jsa.teamSignOn || []).length})</div>
                  {(jsa.teamSignOn || []).map((c, i) => (
                    <div key={i} className="emp-jsa-crew-row">
                      <span className={c.employeeId === activeEmp.id ? "emp-jsa-crew-name emp-jsa-crew-name--self" : "emp-jsa-crew-name"}>
                        {c.name} {c.employeeId === activeEmp.id ? "(You)" : ""}
                      </span>
                      <span className="emp-jsa-crew-time">✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // List view
          const unsignedJsas = myJsaList.filter(j => j.status === "active" && !(j.teamSignOn || []).some(c => c.employeeId === activeEmp.id));
          return (
            <div className="emp-content">
              <div className="section-title emp-section-title">{t("Job Safety Analysis")}</div>

              {/* Unsigned JSA notification */}
              {unsignedJsas.length > 0 && (
                <div className="emp-jsa-unsigned-banner" onClick={() => setActiveJsaId(unsignedJsas[0].id)}>
                  <div className="emp-jsa-unsigned-row">
                    <AlertTriangle size={24} className="text-amber" />
                    <div>
                      <div className="emp-jsa-unsigned-title">{t("You have an unsigned safety briefing")}</div>
                      <div className="emp-jsa-unsigned-sub">{unsignedJsas[0].title} — {t("Tap to review & sign")}</div>
                    </div>
                  </div>
                </div>
              )}

              {myJsaList.length === 0 ? (
                <EmptyState icon={Shield} heading={t("No active JSAs for your projects")} t={t} />
              ) : myJsaList.map(j => {
                const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
                const rc = riskColor(maxRisk);
                const signed = (j.teamSignOn || []).some(c => c.employeeId === activeEmp.id);
                const proj = projects.find(p => p.id === j.projectId);
                return (
                  <div key={j.id} className={signed ? "card emp-jsa-list-card emp-jsa-list-card--signed" : "card emp-jsa-list-card emp-jsa-list-card--unsigned"}
                    onClick={() => setActiveJsaId(j.id)}>
                    <div className="flex-between mb-4">
                      <div className="emp-jsa-list-badges">
                        <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label}</span>
                        {signed
                          ? <span className="emp-jsa-crew-time">✓ {t("Signed")}</span>
                          : <span className="text-amber text-xs font-semi">⚠ {t("Not Signed")}</span>
                        }
                      </div>
                      <span className="emp-jsa-list-date">{j.date}</span>
                    </div>
                    <div className="emp-jsa-list-title">{j.title}</div>
                    <div className="emp-jsa-list-meta">{proj?.name} · {j.supervisor}</div>
                    <div className="emp-jsa-list-ppe">
                      {(j.ppe || []).slice(0, 6).map(k => {
                        const item = PPE_ITEMS.find(p => p.key === k);
                        return item ? <span key={k} className="emp-jsa-list-ppe-icon">{item.icon}</span> : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ═══ MATERIALS TAB ═══ */}
        {empTab === "materials" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title emp-section-title">{t("Request Material")}</div>
            </div>

            {/* Request form */}
            <div className="clock-card emp-clock-card-left mb-16">
              <div className="mb-12">
                <FieldSelect
                  label={t("Project")}
                  value={matProjectId || ""}
                  onChange={(e) => setMatProjectId(Number(e.target.value) || null)}
                  t={t}
                >
                  <option value="">{t("Select project")}</option>
                  {projects.filter(p => myScheduledProjectIds.has(p.id) || myProjectIds.has(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </FieldSelect>
              </div>
              <div className="mb-12">
                <label className="form-label" style={{ fontSize: "var(--text-tab)", fontWeight: "var(--weight-semi)", marginBottom: "var(--space-2)" }}>{t("Material")}</label>
                {/* Common materials quick-select */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginBottom: "var(--space-2)" }}>
                  {['5/8" GWB', '1/2" GWB', '3-5/8" Studs', '1-5/8" Track', 'Screws', 'Tape', 'Mud/JDL', 'Corner Bead', 'ACT Tile', 'Grid Wire', 'Insulation', 'Other'].map(item => (
                    <button key={item} type="button"
                      style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)", fontWeight: matForm.material === item ? 700 : 500, borderRadius: "var(--radius-control)", border: matForm.material === item ? "2px solid var(--accent)" : "1px solid var(--border)", background: matForm.material === item ? "var(--accent)" : "var(--bg3)", color: matForm.material === item ? "#fff" : "var(--text)", cursor: "pointer", minHeight: 36 }}
                      onClick={() => setMatForm(f => ({ ...f, material: item === "Other" ? "" : item }))}>
                      {item}
                    </button>
                  ))}
                </div>
                <FieldInput
                  inputMode="text"
                  placeholder={t("or type custom material name")}
                  value={matForm.material}
                  onChange={(e) => setMatForm(f => ({ ...f, material: e.target.value }))}
                  t={t}
                />
              </div>
              <div className="emp-mat-form-row mb-12">
                <div className="emp-mat-form-col">
                  <FieldInput
                    label={t("Quantity")}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={matForm.qty}
                    onChange={(e) => setMatForm(f => ({ ...f, qty: e.target.value }))}
                    t={t}
                  />
                </div>
                <div className="emp-mat-form-col">
                  <FieldSelect
                    label={t("Unit")}
                    value={matForm.unit}
                    onChange={(e) => setMatForm(f => ({ ...f, unit: e.target.value }))}
                    t={t}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </FieldSelect>
                </div>
              </div>
              <div className="form-group mb-12">
                <label className="form-label">{t("Notes")}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={matForm.notes}
                  onChange={(e) => setMatForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="form-group mb-12">
                <label className="form-label">{t("Photo (optional)")}</label>
                <PhotoCapture
                  photos={matForm.photos || []}
                  onPhotos={(photos) => setMatForm(f => ({ ...f, photos, photo: photos.length > 0 ? photos[0] : null }))}
                  multiple={true}
                  t={t}
                />
              </div>
              <FieldButton
                variant="primary"
                className="w-full"
                onClick={handleMatSubmit}
                disabled={!matProjectId || !matForm.material.trim() || !matForm.qty}
              >
                {t("Submit Request")}
              </FieldButton>
            </div>

            {/* My requests list */}
            <div className="section-header">
              <div className="section-title emp-mat-section-title">{t("My Requests")}</div>
            </div>
            {myMatRequests.length === 0 ? (
              <EmptyState icon={Package} heading={t("No material requests yet")} t={t} />
            ) : (
              <div className="emp-mat-list">
                {myMatRequests.map(req => (
                  <div key={req.id} className="mat-request-card">
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className={statusClass(req.status)}>{statusLabel(req.status)}</span>
                    </div>
                    <div className="text-xs text-muted mb-4">
                      {req.projectName} — {req.qty} {req.unit}
                    </div>
                    <div className="text-xs text-dim">
                      {fmtDate(req.requestedAt)} {fmtTime(req.requestedAt)}
                    </div>
                    {req.notes && <div className="text-xs text-dim mt-4">{req.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CREDENTIALS TAB ═══ */}
        {empTab === "credentials" && (
          <CredentialsTab
            activeEmp={activeEmp}
            t={t}
            lang={lang}
            show={show}
            onBadgeUpdate={setCredBadgeCount}
          />
        )}

        {/* ═══ DRAWINGS TAB (PLAN-01) ═══ */}
        {empTab === "drawings" && (
          <div className="emp-content">
            <DrawingsTab readOnly={true} projectFilter={assignedProject?.id || null} t={t} />
          </div>
        )}

        {/* ═══ PRODUCTION TAB ═══ */}
        {empTab === "production" && (
          <ProductionEntry
            productionLogs={productionLogs}
            setProductionLogs={setProductionLogs}
            areas={areas}
            schedule={teamSchedule}
            employeeId={activeEmp?.id}
            employeeName={activeEmp?.name}
            projectId={assignedProject?.id}
            t={t}
          />
        )}

        {/* ═══ CHANGE ORDERS TAB (Foreman only) ═══ */}
        {empTab === "cos" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title emp-section-title">{t("Change Orders")}</div>
            </div>
            {myCOs.length === 0 ? (
              <EmptyState icon={ClipboardList} heading={t("No change orders for your projects")} t={t} />
            ) : (
              <div className="emp-cos-list">
                {myCOs.map((co) => (
                  <div key={co.id} className="card emp-cos-entry">
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{co.number}</span>
                      <span className={`badge ${co.status === "approved" ? "badge-green" : "badge-amber"}`}>
                        {co.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted">{co.desc}</div>
                    <div className="text-sm font-mono text-amber mt-4">
                      ${Number(co.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ RFIs TAB (Foreman only) ═══ */}
        {empTab === "rfis" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title emp-section-title">{t("RFIs")}</div>
            </div>
            {myRFIs.length === 0 ? (
              <EmptyState icon={FileText} heading={t("No RFIs for your projects")} t={t} />
            ) : (
              <div className="emp-rfi-list">
                {myRFIs.map((rfi) => (
                  <div key={rfi.id} className="card emp-rfi-entry">
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{rfi.number}</span>
                      <span className={`badge ${rfi.status === "answered" ? "badge-green" : "badge-amber"}`}>
                        {rfi.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted">{rfi.subject}</div>
                    {rfi.response && (
                      <div className="text-xs text-green mt-4">{t("Response")}: {rfi.response}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {empTab === "settings" && (
          <div className="settings-wrap">
            {/* Back button */}
            <FieldButton variant="ghost" className="emp-settings-back-btn" onClick={() => setEmpTab("home")}>&#9664; {t("Back")}</FieldButton>
            {/* Profile */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeEmp.name)}</div>
              <div className="emp-settings-center">
                <div className="text-md font-semi">{activeEmp.name}</div>
                <div className="text-xs text-muted">{activeEmp.role} · {activeEmp.phone}</div>
                <div className="text-xs text-dim">{activeEmp.email}</div>
              </div>
            </div>

            {/* Appearance */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Appearance")}</div>
              <div className="theme-card-grid">
                {Object.entries(THEMES).map(([key, th]) => (
                  <div key={key} className={`theme-card${theme === key ? " active" : ""}`}
                    onClick={() => setTheme(key)}>
                    <div>{th.icon}</div>
                    <div className="theme-card-label">{th.label}</div>
                  </div>
                ))}
              </div>
              <div className="settings-row emp-settings-row-mt">
                <span className="settings-label">{t("Language")}</span>
                <div className="lang-toggle">
                  <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
                  <button className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Notifications")}</div>
              <div className="settings-row">
                <span className="settings-label">{t("Schedule changes")}</span>
                <div className={`settings-toggle${activeEmp.notifications?.schedule ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("schedule")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Material updates")}</span>
                <div className={`settings-toggle${activeEmp.notifications?.materials ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("materials")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Delivery updates")}</span>
                <div className={`settings-toggle${activeEmp.notifications?.deliveries ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("deliveries")} />
              </div>
            </div>

            {/* Preferences */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Preferences")}</div>
              <div className="settings-row">
                <span className="settings-label">{t("Default Project")}</span>
                <select className="settings-select emp-settings-select-auto"
                  value={activeEmp.defaultProjectId || ""}
                  onChange={e => setActiveEmp({ ...activeEmp, defaultProjectId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{t("None")}</option>
                  {projects.filter(p => myScheduledProjectIds.has(p.id) || myProjectIds.has(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Account */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Account")}</div>
              <button className="settings-logout" onClick={handleLogout}>{t("Logout")}</button>
            </div>
          </div>
        )}
      </div>

      <PortalTabBar
        tabs={portalTabs}
        activeTab={empTab}
        onTabChange={setEmpTab}
        maxPrimary={4}
        t={t}
      />
    </div>
  );
}
