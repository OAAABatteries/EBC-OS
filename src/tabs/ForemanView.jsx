import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { UserPlus, X, Search, CheckSquare, Square, Send, FileQuestion, ChevronDown, ChevronUp, MapPin, Clock, StopCircle, Package, Shield, AlertTriangle, CheckCircle, FileText, Ruler, Building2, ClipboardList } from "lucide-react";
import { FeatureGuide } from "../components/FeatureGuide";
import { ReportProblemModal } from "../components/ReportProblemModal";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import { PhaseTracker, getDefaultPhases } from "../components/PhaseTracker";
import { listFiles, getFileUrl, downloadFile } from "../lib/supabase";

const PdfViewer = lazy(() => import("../components/PdfViewer").then(m => ({ default: m.PdfViewer })));
import {
  PPE_ITEMS, RISK_LIKELIHOOD, RISK_SEVERITY, riskColor,
  HAZARD_CATEGORIES, CONTROL_HIERARCHY, PERMIT_TYPES,
  HAZARD_LIBRARY, TRADE_LABELS, JSA_TEMPLATES, WEATHER_HAZARD_MAP,
  TRADE_CARDS, WEATHER_QUICK,
} from "../data/jsaConstants";
// ═══════════════════════════════════════════════════════════════
//  Signature Pad — Touch-to-Sign canvas (field-optimized)
// ═══════════════════════════════════════════════════════════════
function FieldSignaturePad({ onSave, onClear, label, t }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.strokeStyle = "#1e2d3b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); setDrawing(true); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); setHasStrokes(true); };
  const endDraw = (e) => { if (e) e.preventDefault(); setDrawing(false); };
  const handleClear = () => { const canvas = canvasRef.current; const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height); setHasStrokes(false); if (onClear) onClear(); };
  const handleSave = () => { if (!hasStrokes) return null; return canvasRef.current.toDataURL("image/png"); };

  // Expose save via ref-like callback
  useEffect(() => { if (onSave) onSave({ getSig: handleSave, clear: handleClear }); }, [hasStrokes]);

  return (
    <div>
      {label && <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>{label}</div>}
      <canvas ref={canvasRef}
        style={{ width: "100%", height: 120, background: "#f8f9fb", border: "2px solid var(--border)", borderRadius: 8, cursor: "crosshair", touchAction: "none" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button className="cal-nav-btn" style={{ fontSize: 12 }} onClick={handleClear}>{t ? t("Clear") : "Clear"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Foreman View — Hours Budget, Crew & Project Management Portal
//  Email/password login (Foreman role only)
//  Tabs: Dashboard / Crew / Hours / Materials / Documents / Settings
// ═══════════════════════════════════════════════════════════════

const FOREMAN_SESSION_KEY = "ebc_activeForeman";
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];

function getWeekStart(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
  return dt.toISOString().slice(0, 10);
}

export function ForemanView({ app }) {
  const {
    employees, projects, setProjects, crewSchedule, timeEntries, setTimeEntries,
    materialRequests, setMaterialRequests,
    changeOrders, rfis, setRfis, submittals,
    jsas, setJsas,
    dailyReports, setDailyReports,
    problems, setProblems,
    theme, setTheme, show
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;

  // ── session — use main auth if available ──
  const mainAuth = app.auth;
  const [activeForeman, setActiveForeman] = useState(() => {
    if (mainAuth && mainAuth.role === "foreman") {
      return { id: mainAuth.id, name: mainAuth.name, email: mainAuth.email, role: "Foreman", title: mainAuth.title, active: true, phone: "", notifications: { schedule: true, materials: true, deliveries: true } };
    }
    try {
      const saved = localStorage.getItem(FOREMAN_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ── login form state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [foremanTab, setForemanTab] = useState("clock");
  const [showReportProblem, setShowReportProblem] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [clockEntry, setClockEntry] = useState(null); // { clockIn, lat, lng, projectId }
  const [gpsStatus, setGpsStatus] = useState("");
  const [clockProjectSearch, setClockProjectSearch] = useState("");
  const [crewClocks, setCrewClocks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_crewClocks") || "{}"); } catch { return {}; }
  });
  const [drawingZoom, setDrawingZoom] = useState(1);
  const [activeDrawingId, setActiveDrawingId] = useState(null);
  const [activeDrawingPath, setActiveDrawingPath] = useState(null);
  const [activeDrawingData, setActiveDrawingData] = useState(null);
  const [activeDrawingName, setActiveDrawingName] = useState("");
  const [cloudDrawings, setCloudDrawings] = useState([]);
  const [drawingsLoading, setDrawingsLoading] = useState(false);
  const [downloadedDrawings, setDownloadedDrawings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_downloadedDrawings") || "{}"); } catch { return {}; }
  });
  const [jsaView, setJsaView] = useState("list"); // list | detail | create
  const [activeJsaId, setActiveJsaId] = useState(null);
  const [jsaForm, setJsaForm] = useState({
    projectId: "", trade: "framing", templateId: "", title: "",
    location: "", supervisor: "", competentPerson: "",
    date: new Date().toISOString().slice(0, 10),
    shift: "day", weather: "clear",
    steps: [], ppe: [], permits: [],
  });
  const updJsaForm = (k, v) => setJsaForm(f => ({ ...f, [k]: v }));

  // ── Pre-Task Safety Roll Call state ──
  const [rcStep, setRcStep] = useState("pick"); // pick | crew | sign | supervisor | done
  const [rcJsaId, setRcJsaId] = useState(null);
  const [rcWeather, setRcWeather] = useState("clear");
  const [rcSignIdx, setRcSignIdx] = useState(0);
  const [rcQueue, setRcQueue] = useState([]); // [{employeeId, name, signed: false}]
  const [rcSelected, setRcSelected] = useState({}); // {employeeId: true/false}
  const [rcAddingCrew, setRcAddingCrew] = useState(false);
  const sigRef = useRef(null);

  // ── Crew tab: add member ──
  const [showCrewAdd, setShowCrewAdd] = useState(false);
  const [crewAddSearch, setCrewAddSearch] = useState("");
  const [extraCrewIds, setExtraCrewIds] = useState([]);
  const crewAddRef = useRef(null);

  // ── Pre-task safety: indoor/outdoor + hazard multi-select ──
  const [rcIndoorOutdoor, setRcIndoorOutdoor] = useState("indoor");
  const [rcPendingCard, setRcPendingCard] = useState(null);
  const [rcSelectedHazardIdxs, setRcSelectedHazardIdxs] = useState({});

  // ── Submit RFI modal ──
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiFormData, setRfiFormData] = useState({ subject: "", description: "", drawingRef: "" });

  // ── daily report form state ──
  const EMPTY_REPORT_FORM = {
    date: new Date().toISOString().slice(0, 10),
    temperature: "",
    weatherCondition: "Clear",
    crewPresent: [],
    quickTasks: [],
    workPerformed: "",
    materialsReceived: "",
    equipmentOnSite: "",
    visitors: "",
    safetyIncident: false,
    safetyDescription: "",
    photos: [],
    issues: "",
    tomorrowPlan: "",
  };
  const [reportForm, setReportForm] = useState({ ...EMPTY_REPORT_FORM });
  const [showReportForm, setShowReportForm] = useState(false);
  const [crewSearch, setCrewSearch] = useState("");
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);

  const QUICK_TASKS = ["Framing", "Hanging board", "Taping", "Sanding", "ACT grid", "ACT tile", "Demo", "Cleanup"];
  const WEATHER_CONDITIONS = ["Clear", "Cloudy", "Rain", "Wind", "Snow"];

  // Auto-calc hours from time entries for today
  const todayHoursForProject = useMemo(() => {
    if (!selectedProjectId) return 0;
    const today = new Date().toDateString();
    return (timeEntries || [])
      .filter(te => String(te.projectId) === String(selectedProjectId) && new Date(te.clockIn).toDateString() === today && te.totalHours)
      .reduce((sum, te) => sum + te.totalHours, 0);
  }, [timeEntries, selectedProjectId]);

  // Fill from yesterday helper
  const fillFromYesterday = useCallback(() => {
    const myReports = (dailyReports || [])
      .filter(r => r.projectId === selectedProjectId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const yesterday = myReports[0];
    if (!yesterday) { show(t("No previous report to copy from"), "warn"); return; }
    setReportForm(f => ({
      ...f,
      crewPresent: yesterday.crewPresent || [],
      equipmentOnSite: yesterday.equipmentOnSite || "",
    }));
    show(t("Copied crew & equipment from last report"));
  }, [dailyReports, selectedProjectId, show, t]);

  // ── persist session ──
  useEffect(() => {
    if (activeForeman) {
      localStorage.setItem(FOREMAN_SESSION_KEY, JSON.stringify(activeForeman));
    } else {
      localStorage.removeItem(FOREMAN_SESSION_KEY);
    }
  }, [activeForeman]);

  // ── login handler ──
  const handleLogin = async () => {
    setLoginError("");
    const { verifyPassword } = await import("../utils/passwordHash");
    let emp = null;
    for (const e of employees) {
      if (e.email === email.trim().toLowerCase() && e.active && e.role.toLowerCase() === "foreman") {
        if (await verifyPassword(password, e.password)) { emp = e; break; }
      }
    }
    if (emp) {
      setActiveForeman(emp);
      setEmail("");
      setPassword("");
    } else {
      setLoginError(t("Invalid credentials"));
    }
  };

  const handleLogout = () => {
    setActiveForeman(null);
    setEmail("");
    setPassword("");
    setForemanTab("dashboard");
    setSelectedProjectId(null);
    if (app.onLogout) app.onLogout();
  };

  // ── clock-in/out helpers ──
  const CLOCK_KEY = `ebc_foremanClock_${activeForeman?.id || "x"}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLOCK_KEY);
      if (saved) setClockEntry(JSON.parse(saved));
    } catch {}
  }, [CLOCK_KEY]);

  const isClockedIn = !!clockEntry;

  const getLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      setGpsStatus(t("Getting location…"));
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGpsStatus(""); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => { setGpsStatus(""); resolve(null); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  const handleClockIn = async () => {
    const loc = await getLocation();
    const entry = {
      clockIn: new Date().toISOString(),
      lat: loc?.lat || null,
      lng: loc?.lng || null,
      projectId: selectedProjectId,
    };
    setClockEntry(entry);
    localStorage.setItem(CLOCK_KEY, JSON.stringify(entry));
    show?.(`${t("Clocked in")} ✓`);
  };

  const handleClockOut = async () => {
    if (!clockEntry) return;
    const loc = await getLocation();
    const totalMs = Date.now() - new Date(clockEntry.clockIn).getTime();
    const rawHours = totalMs / 3600000;
    // Auto-deduct 30-min unpaid lunch for shifts over 6 hours
    const totalHours = +(rawHours >= 6 ? rawHours - 0.5 : rawHours).toFixed(2);
    const proj = projects.find(p => String(p.id) === String(clockEntry.projectId || selectedProjectId));
    const newEntry = {
      id: crypto.randomUUID(),
      employeeId: activeForeman.id,
      employeeName: activeForeman.name,
      projectId: clockEntry.projectId || selectedProjectId,
      projectName: proj?.name || "Unknown",
      clockIn: clockEntry.clockIn,
      clockInLat: clockEntry.lat,
      clockInLng: clockEntry.lng,
      clockOut: new Date().toISOString(),
      clockOutLat: loc?.lat || null,
      clockOutLng: loc?.lng || null,
      totalHours,
      geofenceStatus: "inside",
    };
    if (setTimeEntries) {
      setTimeEntries(prev => [...prev, newEntry]);
    }
    setClockEntry(null);
    localStorage.removeItem(CLOCK_KEY);
    show?.(`${t("Clocked out")} · ${totalHours}h ✓`);
  };

  // ── crew clock-in/out ──
  const persistCrewClocks = (updated) => {
    setCrewClocks(updated);
    localStorage.setItem("ebc_crewClocks", JSON.stringify(updated));
  };

  const handleCrewClockIn = async (empId) => {
    const loc = await getLocation();
    const entry = { clockIn: new Date().toISOString(), lat: loc?.lat || null, lng: loc?.lng || null, projectId: selectedProjectId };
    persistCrewClocks({ ...crewClocks, [empId]: entry });
    const emp = employees.find(e => e.id === empId);
    show?.(`${emp?.name || "Crew"} ${t("clocked in")} ✓`);
  };

  const handleCrewClockOut = async (empId) => {
    const entry = crewClocks[empId];
    if (!entry) return;
    const loc = await getLocation();
    const totalMs = Date.now() - new Date(entry.clockIn).getTime();
    const rawHours = totalMs / 3600000;
    // Auto-deduct 30-min unpaid lunch for shifts over 6 hours
    const totalHours = +(rawHours >= 6 ? rawHours - 0.5 : rawHours).toFixed(2);
    const emp = employees.find(e => e.id === empId);
    const proj = projects.find(p => String(p.id) === String(entry.projectId || selectedProjectId));
    const newEntry = {
      id: crypto.randomUUID(),
      employeeId: empId,
      employeeName: emp?.name || "Unknown",
      projectId: entry.projectId || selectedProjectId,
      projectName: proj?.name || "Unknown",
      clockIn: entry.clockIn,
      clockInLat: entry.lat, clockInLng: entry.lng,
      clockOut: new Date().toISOString(),
      clockOutLat: loc?.lat || null, clockOutLng: loc?.lng || null,
      totalHours,
      geofenceStatus: "inside",
    };
    if (setTimeEntries) setTimeEntries(prev => [...prev, newEntry]);
    const updated = { ...crewClocks };
    delete updated[empId];
    persistCrewClocks(updated);
    show?.(`${emp?.name || "Crew"} ${t("clocked out")} · ${totalHours}h ✓`);
  };

  // ── today's time entries for this foreman ──
  const todayStr = new Date().toDateString();
  const myTodayEntries = useMemo(() =>
    timeEntries.filter(te => String(te.employeeId) === String(activeForeman?.id) && new Date(te.clockIn).toDateString() === todayStr && te.totalHours),
    [timeEntries, activeForeman, todayStr]
  );
  const myTodayHours = myTodayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);

  // ── load cloud drawings for selected project ──
  const loadCloudDrawings = useCallback(async () => {
    if (!selectedProjectId) return;
    setDrawingsLoading(true);
    try {
      const folder = `drawings/project-${selectedProjectId}`;
      const files = await listFiles(folder);
      const drawings = (files || []).filter(f => f.name?.endsWith(".pdf")).map(f => ({
        id: f.id || f.name,
        name: f.name.replace(".pdf", "").replace(/_/g, " "),
        fileName: f.name,
        path: `${folder}/${f.name}`,
        size: f.metadata?.size || 0,
        uploadedAt: f.created_at || f.updated_at || "",
        cached: !!downloadedDrawings[`${folder}/${f.name}`],
      }));
      setCloudDrawings(drawings);
    } catch {
      // Supabase not configured or no files — use fallback
      setCloudDrawings([]);
    }
    setDrawingsLoading(false);
  }, [selectedProjectId, downloadedDrawings]);

  useEffect(() => {
    if (foremanTab === "drawings") loadCloudDrawings();
  }, [foremanTab, selectedProjectId]);

  const handleViewDrawing = async (drawing) => {
    try {
      // Check cache first
      const { useDrawingCache } = await import("../hooks/useDrawingCache");
      const { getCachedDrawing, cacheDrawing } = useDrawingCache();
      const cached = await getCachedDrawing(drawing.path);
      if (cached) {
        setActiveDrawingData(cached);
        setActiveDrawingName(drawing.name);
        setActiveDrawingId(drawing.id);
        setActiveDrawingPath(drawing.path);
        return;
      }
      // Download from Supabase
      show?.(t("Loading drawing..."));
      const blob = await downloadFile(drawing.path);
      const arrayBuffer = await blob.arrayBuffer();
      setActiveDrawingData(arrayBuffer);
      setActiveDrawingName(drawing.name);
      setActiveDrawingId(drawing.id);
      setActiveDrawingPath(drawing.path);
      // Auto-cache viewed drawing for offline access
      cacheDrawing(drawing.path, blob).then(() => {
        const updated = { ...downloadedDrawings, [drawing.path]: { cachedAt: new Date().toISOString(), size: blob.size } };
        setDownloadedDrawings(updated);
        localStorage.setItem("ebc_downloadedDrawings", JSON.stringify(updated));
      }).catch(() => {});
    } catch {
      show?.(t("Failed to load drawing — check connection"), "err");
    }
  };

  const handleDownloadDrawing = async (drawing) => {
    try {
      show?.(t("Downloading for offline..."));
      const blob = await downloadFile(drawing.path);
      // Cache in service worker Cache API
      const { useDrawingCache } = await import("../hooks/useDrawingCache");
      const { cacheDrawing } = useDrawingCache();
      await cacheDrawing(drawing.path, blob);
      const updated = { ...downloadedDrawings, [drawing.path]: { cachedAt: new Date().toISOString(), size: blob.size } };
      setDownloadedDrawings(updated);
      localStorage.setItem("ebc_downloadedDrawings", JSON.stringify(updated));
      show?.(`${drawing.name} ${t("saved for offline")} ✓`);
    } catch {
      show?.(t("Download failed — check connection"), "err");
    }
  };

  // ── computed: my projects ──
  const weekStart = useMemo(() => getWeekStart(), []);

  const myProjects = useMemo(() => {
    if (!activeForeman) return [];
    const fId = String(activeForeman.id);
    const mySchedule = crewSchedule.filter(
      s => String(s.employeeId) === fId && s.weekStart === weekStart
    );
    const projectIds = [...new Set(mySchedule.map(s => String(s.projectId)))];
    const scheduled = projects.filter(p => projectIds.includes(String(p.id)));
    // Also include projects directly assigned to this foreman by PM
    const assigned = projects.filter(p => p.assignedForeman != null && String(p.assignedForeman) === fId);
    // Combine, deduplicate by id
    const combined = [...new Map([...scheduled, ...assigned].map(p => [String(p.id), p])).values()];
    // Fallback: if no crew schedule entries and no direct assignment, show all active projects
    if (combined.length === 0) {
      return projects.filter(p => p.status === "in-progress" || p.status === "active");
    }
    return combined;
  }, [activeForeman, crewSchedule, projects, weekStart]);

  // auto-select first project
  useEffect(() => {
    if (myProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(myProjects[0].id);
    }
  }, [myProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find(p => String(p.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId]
  );

  // ── computed: crew for selected project ──
  const crewForProject = useMemo(() => {
    if (!selectedProjectId) return [];
    const pId = String(selectedProjectId);
    const entries = crewSchedule.filter(
      s => String(s.projectId) === pId && s.weekStart === weekStart
    );
    return entries.map(s => {
      const emp = employees.find(e => String(e.id) === String(s.employeeId));
      if (!emp) return null;
      const today = new Date().toDateString();
      const empEntries = timeEntries.filter(te => String(te.employeeId) === String(emp.id) && String(te.projectId) === String(selectedProjectId));
      const todayHours = empEntries
        .filter(te => new Date(te.clockIn).toDateString() === today && te.totalHours)
        .reduce((sum, te) => sum + te.totalHours, 0);
      const weekHours = empEntries
        .filter(te => te.totalHours)
        .reduce((sum, te) => sum + te.totalHours, 0);
      return { ...emp, days: s.days, todayHours, weekHours, scheduleHours: s.hours };
    }).filter(Boolean);
  }, [selectedProjectId, crewSchedule, employees, timeEntries, weekStart]);

  // ── computed: hours used (from time entries) ──
  const hoursUsed = useMemo(() => {
    if (!selectedProjectId) return 0;
    return crewForProject.reduce((sum, c) => sum + c.weekHours, 0);
  }, [crewForProject, selectedProjectId]);

  // ── computed: material requests for project ──
  const projectMatRequests = useMemo(() => {
    if (!selectedProjectId) return materialRequests;
    return materialRequests.filter(r => String(r.projectId) === String(selectedProjectId));
  }, [materialRequests, selectedProjectId]);

  // ── computed: documents for project ──
  const projectSubmittals = useMemo(() => {
    if (!selectedProjectId) return [];
    return (submittals || []).filter(s => String(s.projectId) === String(selectedProjectId));
  }, [submittals, selectedProjectId]);

  const projectCOs = useMemo(() => {
    if (!selectedProjectId) return [];
    return (changeOrders || []).filter(c => String(c.projectId) === String(selectedProjectId));
  }, [changeOrders, selectedProjectId]);

  const projectRFIs = useMemo(() => {
    if (!selectedProjectId) return [];
    return (rfis || []).filter(r => String(r.projectId) === String(selectedProjectId));
  }, [rfis, selectedProjectId]);

  // weekly burn rate in hours: sum of scheduled hours per crew member this week
  const weeklyBurnHours = useMemo(() => {
    return crewForProject.reduce((sum, c) => {
      const daysThisWeek = DAY_KEYS.filter(d => c.days?.[d]).length;
      const hrs = c.scheduleHours || {};
      const startH = parseFloat(hrs.start || hrs.startDate || "0");
      const endH = parseFloat(hrs.end || hrs.endDate || "0");
      const dailyHours = (startH && endH && endH > startH)
        ? (endH - startH)
        : 8;
      return sum + (daysThisWeek * dailyHours);
    }, 0);
  }, [crewForProject]);

  // ── actions ──
  const handleApprove = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "approved", approvedAt: new Date().toISOString() } : r
    ));
    show(t("Approved"), "ok");
  };

  // ── format helpers ──
  const fmt = (n) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtHours = (h) => h ? h.toFixed(1) + "h" : "0.0h";

  // ── documents toggle ──
  const [openSections, setOpenSections] = useState({});
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── material request form ──
  const [matForm, setMatForm] = useState({ material: "", qty: "", unit: "EA", notes: "" });
  const handleMatSubmit = () => {
    if (!selectedProjectId || !matForm.material || !matForm.qty) return;
    const proj = projects.find(p => String(p.id) === String(selectedProjectId));
    const newReq = {
      id: crypto.randomUUID(),
      employeeId: activeForeman.id,
      employeeName: activeForeman.name,
      projectId: selectedProjectId,
      projectName: proj?.name || "",
      material: matForm.material,
      qty: Number(matForm.qty),
      unit: matForm.unit,
      notes: matForm.notes,
      status: "requested",
      requestedAt: new Date().toISOString(),
    };
    setMaterialRequests(prev => [newReq, ...prev]);
    setMatForm({ material: "", qty: "", unit: "EA", notes: "" });
    show(t("Request Material"), "ok");
  };

  // ── notification toggle helper ──
  const handleNotificationToggle = (key) => {
    const updated = { ...activeForeman, notifications: { ...activeForeman.notifications, [key]: !activeForeman.notifications?.[key] } };
    setActiveForeman(updated);
  };

  // ── initials for avatar ──
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // ── JSAs for my projects (must be before early return to preserve hook order) ──
  const myProjectIds = useMemo(() => new Set(myProjects.map(p => p.id)), [myProjects]);
  const myJsas = useMemo(() => (jsas || []).filter(j => myProjectIds.has(j.projectId)), [jsas, myProjectIds]);
  const activeJsaCount = myJsas.filter(j => j.status === "active" || j.status === "draft").length;

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!activeForeman) {
    return (
      <div className="employee-app">
        <header className="employee-header">
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/ebc-eagle-white.png" alt="EBC" style={{ height: 28, width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /></div>
          <span className="text-sm text-muted">{t("Foreman Portal")}</span>
        </header>
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted" style={{ textAlign: "center", marginTop: -12 }}>{t("Foreman Portal")}</div>
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
  //  MAIN FOREMAN VIEW (logged in)
  // ═══════════════════════════════════════════════════════════════

  // hours-based budget
  const allocatedHours = selectedProject?.laborHours || 0;
  const hoursRemaining = allocatedHours - hoursUsed;
  const pctUsed = allocatedHours > 0 ? Math.round((hoursUsed / allocatedHours) * 100) : 0;
  const budgetColor = pctUsed > 90 ? "var(--red)" : pctUsed > 70 ? "var(--yellow)" : "var(--green)";

  const tabDefs = [
    { key: "clock", label: t("Clock") },
    { key: "dashboard", label: t("Dashboard") },
    { key: "crew", label: t("Crew"), count: crewForProject.length },
    { key: "hours", label: t("Hours") },
    { key: "jsa", label: t("JSA"), count: activeJsaCount },
    { key: "materials", label: t("Materials"), count: projectMatRequests.filter(r => r.status === "requested" || r.status === "pending").length },
    { key: "drawings", label: t("Drawings") },
    { key: "reports", label: t("Daily Report"), count: (dailyReports || []).filter(r => r.projectId === selectedProjectId && r.date === new Date().toISOString().slice(0, 10)).length },
    { key: "documents", label: t("Documents") },
    { key: "settings", label: t("Settings") },
  ];

  return (
    <div className="employee-app">
      {/* Report Problem Modal */}
      {showReportProblem && (
        <ReportProblemModal
          reporter={activeForeman.name}
          projects={myProjects.length > 0 ? myProjects : projects}
          defaultProjectId={selectedProjectId}
          t={t}
          onSave={(problem) => {
            setProblems(prev => [problem, ...(prev || [])]);
            setShowReportProblem(false);
            show("Problem reported", "ok");
          }}
          onClose={() => setShowReportProblem(false)}
        />
      )}

      {/* PDF Viewer overlay */}
      {activeDrawingData && (
        <Suspense fallback={null}>
          <PdfViewer
            pdfData={activeDrawingData}
            fileName={activeDrawingName}
            onClose={() => { setActiveDrawingData(null); setActiveDrawingId(null); setActiveDrawingPath(null); setActiveDrawingName(""); }}
            isCachedOffline={!!activeDrawingPath && !!downloadedDrawings[activeDrawingPath]}
          />
        </Suspense>
      )}
      <header className="employee-header">
        <div>
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/ebc-eagle-white.png" alt="EBC" style={{ height: 28, width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /></div>
          <span className="text-xs text-muted">{activeForeman.name} · {t("Foreman Portal")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FeatureGuide guideKey="foreman" />
          <button className="settings-gear" onClick={() => setForemanTab("settings")} title={t("Settings")}>
            &#9881;
          </button>
        </div>
      </header>

      <div className="employee-body">
        {/* ── Project selector ── */}
        {myProjects.length > 1 && (
          <select
            className="foreman-project-select"
            value={selectedProjectId || ""}
            onChange={e => {
              const val = e.target.value;
              setSelectedProjectId(isNaN(val) ? val : Number(val));
            }}
          >
            {myProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {myProjects.length === 0 && foremanTab !== "settings" && (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-icon"><ClipboardList size={32} /></div>
            <div className="empty-text">{t("No projects assigned")}</div>
          </div>
        )}

        {/* Tab bar */}
        <div className="emp-tabs">
          {tabDefs.map((tab) => (
            <button
              key={tab.key}
              className={`emp-tab${foremanTab === tab.key ? " active" : ""}`}
              onClick={() => setForemanTab(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && <span className="driver-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* ═══ SETTINGS TAB ═══ */}
        {foremanTab === "settings" && (
          <div className="settings-wrap">
            {/* Back button */}
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setForemanTab("clock")}>&#9664; {t("Back")}</button>
            {/* Profile */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeForeman.name)}</div>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div className="text-md font-semi">{activeForeman.name}</div>
                <div className="text-xs text-muted">{activeForeman.role} · {activeForeman.phone}</div>
                <div className="text-xs text-dim">{activeForeman.email}</div>
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
              <div className="settings-row" style={{ marginTop: 12 }}>
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
                <div className={`settings-toggle${activeForeman.notifications?.schedule ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("schedule")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Material updates")}</span>
                <div className={`settings-toggle${activeForeman.notifications?.materials ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("materials")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Delivery updates")}</span>
                <div className={`settings-toggle${activeForeman.notifications?.deliveries ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("deliveries")} />
              </div>
            </div>

            {/* Preferences */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Preferences")}</div>
              <div className="settings-row">
                <span className="settings-label">{t("Default Project")}</span>
                <select className="settings-select" style={{ width: "auto", maxWidth: 180 }}
                  value={activeForeman.defaultProjectId || ""}
                  onChange={e => setActiveForeman({ ...activeForeman, defaultProjectId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{t("None")}</option>
                  {myProjects.map(p => (
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

        {selectedProject && foremanTab !== "settings" && (
          <>
            {/* ═══ CLOCK TAB ═══ */}
            {foremanTab === "clock" && (
              <div className="emp-content">
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  {/* Big clock display */}
                  <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 6, fontFamily: "monospace" }}>
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-muted" style={{ marginBottom: 24 }}>
                    {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  {gpsStatus && <div className="text-xs text-muted" style={{ marginBottom: 10 }}>{gpsStatus}</div>}

                  {/* ── Project Lookup for Clock-In ── */}
                  {!isClockedIn && (
                    <div style={{ marginBottom: 20, textAlign: "left", maxWidth: 400, margin: "0 auto 20px" }}>
                      <label className="form-label" style={{ textAlign: "center", display: "block", marginBottom: 8 }}>{t("Select Project")}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={t("Search project name or address...")}
                        value={clockProjectSearch}
                        onChange={(e) => setClockProjectSearch(e.target.value)}
                        style={{ marginBottom: 6, textAlign: "center" }}
                      />
                      <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 8, background: "var(--glass-bg)" }}>
                        {(myProjects || projects)
                          .filter(p => {
                            if (!clockProjectSearch.trim()) return true;
                            const q = clockProjectSearch.toLowerCase();
                            return (p.name || "").toLowerCase().includes(q) ||
                                   (p.address || "").toLowerCase().includes(q) ||
                                   (p.gc || "").toLowerCase().includes(q);
                          })
                          .slice(0, 10)
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => { setSelectedProjectId(p.id); setClockProjectSearch(""); }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--glass-border)",
                                background: selectedProjectId === p.id ? "var(--accent-dim)" : "transparent",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div className="text-sm font-semi">{p.name}</div>
                                <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                              </div>
                              {selectedProjectId === p.id && <span style={{ color: "var(--green)", fontSize: 18 }}>✓</span>}
                            </div>
                          ))}
                      </div>
                      {selectedProject && (
                        <div className="text-sm font-semi" style={{ textAlign: "center", marginTop: 10, color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <MapPin size={14} />{selectedProject.name}
                        </div>
                      )}
                    </div>
                  )}

                  {!isClockedIn ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: 200, height: 200, borderRadius: "50%", fontSize: 22, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto" }}
                      onClick={handleClockIn}
                      disabled={!selectedProjectId}
                    >
                      <Clock size={40} />
                      {t("CLOCK IN")}
                    </button>
                  ) : (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <div className="text-xs text-muted">{t("Clocked in at")}</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--green)" }}>
                          {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                          {(() => {
                            const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                            const hrs = Math.floor(elapsed / 3600000);
                            const mins = Math.floor((elapsed % 3600000) / 60000);
                            return `${hrs}h ${mins}m ${t("elapsed")}`;
                          })()}
                        </div>
                      </div>
                      <button
                        className="btn"
                        style={{ width: 200, height: 200, borderRadius: "50%", fontSize: 22, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto", background: "var(--red)", color: "#fff" }}
                        onClick={handleClockOut}
                      >
                        <StopCircle size={40} />
                        {t("CLOCK OUT")}
                      </button>
                    </>
                  )}

                  {/* Today's entries */}
                  {myTodayEntries.length > 0 && (
                    <div style={{ marginTop: 30, textAlign: "left" }}>
                      <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>{t("Today's Time Log")}</div>
                      {myTodayEntries.map((te, i) => (
                        <div key={i} className="foreman-crew-row" style={{ padding: "8px 12px", marginBottom: 4 }}>
                          <div>
                            <div className="text-sm font-semi">
                              {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-muted">
                              {projects.find(p => p.id === te.projectId)?.name || t("General")}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--accent)" }}>{te.totalHours}h</div>
                        </div>
                      ))}
                      <div className="text-sm font-semi" style={{ textAlign: "right", marginTop: 8, color: "var(--accent)" }}>
                        {t("Total")}: {myTodayHours.toFixed(1)}h
                      </div>
                    </div>
                  )}

                  {/* Report Problem button */}
                  <div style={{ marginTop: 32 }}>
                    <button
                      onClick={() => setShowReportProblem(true)}
                      style={{
                        width: "100%",
                        maxWidth: 320,
                        padding: "16px 20px",
                        borderRadius: 12,
                        background: "rgba(245,158,11,0.10)",
                        border: "2px solid rgba(245,158,11,0.35)",
                        color: "var(--amber, #f59e0b)",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      {t("Report a Problem")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ DASHBOARD TAB ═══ */}
            {foremanTab === "dashboard" && (
              <div className="emp-content">
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  {/* Big clock display */}
                  <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 6, fontFamily: "monospace" }}>
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-muted" style={{ marginBottom: 24 }}>
                    {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  {gpsStatus && <div className="text-xs text-muted" style={{ marginBottom: 10 }}>{gpsStatus}</div>}

                  {/* ── Project Lookup for Clock-In ── */}
                  {!isClockedIn && (
                    <div style={{ marginBottom: 20, textAlign: "left", maxWidth: 400, margin: "0 auto 20px" }}>
                      <label className="form-label" style={{ textAlign: "center", display: "block", marginBottom: 8 }}>{t("Select Project")}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={t("Search project name or address...")}
                        value={clockProjectSearch}
                        onChange={(e) => setClockProjectSearch(e.target.value)}
                        style={{ marginBottom: 6, textAlign: "center" }}
                      />
                      <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 8, background: "var(--glass-bg)" }}>
                        {(myProjects || projects)
                          .filter(p => {
                            if (!clockProjectSearch.trim()) return true;
                            const q = clockProjectSearch.toLowerCase();
                            return (p.name || "").toLowerCase().includes(q) ||
                                   (p.address || "").toLowerCase().includes(q) ||
                                   (p.gc || "").toLowerCase().includes(q);
                          })
                          .slice(0, 10)
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => { setSelectedProjectId(p.id); setClockProjectSearch(""); }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--glass-border)",
                                background: selectedProjectId === p.id ? "var(--accent-dim)" : "transparent",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div className="text-sm font-semi">{p.name}</div>
                                <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                              </div>
                              {selectedProjectId === p.id && <span style={{ color: "var(--green)", fontSize: 18 }}>✓</span>}
                            </div>
                          ))}
                      </div>
                      {selectedProject && (
                        <div className="text-sm font-semi" style={{ textAlign: "center", marginTop: 10, color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <MapPin size={14} />{selectedProject.name}
                        </div>
                      )}
                    </div>
                  )}

                  {!isClockedIn ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: 200, height: 200, borderRadius: "50%", fontSize: 22, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto" }}
                      onClick={handleClockIn}
                      disabled={!selectedProjectId}
                    >
                      <Clock size={40} />
                      {t("CLOCK IN")}
                    </button>
                  ) : (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <div className="text-xs text-muted">{t("Clocked in at")}</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--green)" }}>
                          {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                          {(() => {
                            const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                            const hrs = Math.floor(elapsed / 3600000);
                            const mins = Math.floor((elapsed % 3600000) / 60000);
                            return `${hrs}h ${mins}m ${t("elapsed")}`;
                          })()}
                        </div>
                      </div>
                      <button
                        className="btn"
                        style={{ width: 200, height: 200, borderRadius: "50%", fontSize: 22, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto", background: "var(--red)", color: "#fff" }}
                        onClick={handleClockOut}
                      >
                        <StopCircle size={40} />
                        {t("CLOCK OUT")}
                      </button>
                    </>
                  )}

                  {/* Today's entries */}
                  {myTodayEntries.length > 0 && (
                    <div style={{ marginTop: 30, textAlign: "left" }}>
                      <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>{t("Today's Time Log")}</div>
                      {myTodayEntries.map((te, i) => (
                        <div key={i} className="foreman-crew-row" style={{ padding: "8px 12px", marginBottom: 4 }}>
                          <div>
                            <div className="text-sm font-semi">
                              {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-muted">
                              {projects.find(p => String(p.id) === String(te.projectId))?.name || t("General")}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--accent)" }}>{te.totalHours}h</div>
                        </div>
                      ))}
                      <div className="text-sm font-semi" style={{ textAlign: "right", marginTop: 8, color: "var(--accent)" }}>
                        {t("Total")}: {myTodayHours.toFixed(1)}h
                      </div>
                    </div>
                  )}

                  {/* ── Crew Clock-In/Out ── */}
                  <div style={{ marginTop: 30, textAlign: "left" }}>
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>{t("Crew Time Clock")}</div>

                    {/* Add crew member — searchable dropdown */}
                    <div style={{ position: "relative", marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, position: "relative" }}>
                          <input
                            type="text"
                            placeholder={t("Search or select crew member...")}
                            value={crewSearch || ""}
                            onChange={e => setCrewSearch(e.target.value)}
                            onFocus={() => setCrewSearch(crewSearch || "")}
                            style={{ width: "100%", padding: "10px 14px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}
                          />
                          {/* Dropdown list */}
                          {crewSearch !== null && crewSearch !== undefined && (() => {
                            const q = (crewSearch || "").toLowerCase().trim();
                            const allEmp = employees.filter(e => e.id !== activeForeman?.id);
                            const filtered = q.length > 0
                              ? allEmp.filter(e => e.name.toLowerCase().includes(q))
                              : allEmp;
                            if (filtered.length === 0 && q.length > 0) return (
                              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "0 0 8px 8px", padding: "10px 14px" }}>
                                <span className="text-sm text-muted">{t("No employees found")}</span>
                              </div>
                            );
                            if (q.length === 0 && !document.activeElement?.matches?.('input[placeholder*="Search"]')) return null;
                            return (
                              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "0 0 8px 8px", maxHeight: 260, overflowY: "auto" }}>
                                {filtered.slice(0, 15).map(c => {
                                  const isIn = !!crewClocks[c.id];
                                  const isAssigned = crewForProject.some(cp => cp.id === c.id);
                                  return (
                                    <div key={c.id}
                                      style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={() => {
                                        if (!isIn) { handleCrewClockIn(c.id); }
                                        else { handleCrewClockOut(c.id); }
                                        setCrewSearch(null);
                                      }}
                                    >
                                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: isIn ? "var(--green)" : "var(--bg4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isIn ? "#fff" : "var(--text3)", flexShrink: 0 }}>
                                        {c.name.split(" ").map(n => n[0]).join("")}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="text-sm font-semi">{c.name}</div>
                                        <div className="text-xs text-muted">
                                          {c.role || c.title || ""}
                                          {isAssigned && <span style={{ color: "var(--amber)", marginLeft: 4 }}>· {t("Assigned")}</span>}
                                        </div>
                                      </div>
                                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: isIn ? "var(--red)" : "var(--amber)", color: isIn ? "#fff" : "#000", whiteSpace: "nowrap" }}>
                                        {isIn ? t("Clock Out") : t("Clock In")}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Currently clocked-in crew */}
                    {(() => {
                      const clockedInIds = Object.keys(crewClocks).map(Number);
                      const clockedIn = clockedInIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
                      if (clockedIn.length === 0) return null;
                      return (
                        <div style={{ marginBottom: 16 }}>
                          <div className="text-xs text-muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("Clocked In")} ({clockedIn.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                            {clockedIn.map(c => {
                              const clockData = crewClocks[c.id];
                              const isAssigned = crewForProject.some(cp => cp.id === c.id);
                              const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                              const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                              return (
                                <div key={c.id} className="foreman-crew-row" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, borderLeft: "3px solid var(--green)" }}>
                                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                    {c.name.split(" ").map(n => n[0]).join("")}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm font-semi">{c.name}</div>
                                    <div className="text-xs text-muted">
                                      {c.role || c.title || ""}{!isAssigned && <span style={{ color: "var(--amber)" }}> · {t("Other crew")}</span>}
                                      {todayTotal > 0 ? ` · ${todayTotal.toFixed(1)}h ${t("today")}` : ""}
                                    </div>
                                    {clockData && (
                                      <div className="text-xs" style={{ color: "var(--green)", marginTop: 2 }}>
                                        {t("In since")} {new Date(clockData.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        {" · "}{(() => { const m = Math.floor((Date.now() - new Date(clockData.clockIn).getTime()) / 60000); return `${Math.floor(m/60)}h ${m%60}m`; })()}
                                      </div>
                                    )}
                                  </div>
                                  <button className="btn btn-sm" style={{ minWidth: 80, fontSize: 12, padding: "8px 12px", background: "var(--red)", color: "#fff" }}
                                    onClick={() => handleCrewClockOut(c.id)}>
                                    {t("Clock Out")}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Assigned crew not yet clocked in */}
                    {(() => {
                      const notIn = crewForProject.filter(c => c.id !== activeForeman?.id && !crewClocks[c.id]);
                      if (notIn.length === 0) return null;
                      return (
                        <div>
                          <div className="text-xs text-muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("Not Clocked In")} ({notIn.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                            {notIn.map(c => {
                              const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                              const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                              return (
                                <div key={c.id} className="foreman-crew-row" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
                                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--text3)", flexShrink: 0 }}>
                                    {c.name.split(" ").map(n => n[0]).join("")}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm font-semi">{c.name}</div>
                                    <div className="text-xs text-muted">{t(c.role)}{todayTotal > 0 ? ` · ${todayTotal.toFixed(1)}h ${t("today")}` : ""}</div>
                                  </div>
                                  <button className="btn btn-primary btn-sm" style={{ minWidth: 80, fontSize: 12, padding: "8px 12px" }}
                                    onClick={() => handleCrewClockIn(c.id)}>
                                    {t("Clock In")}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ DASHBOARD TAB ═══ */}
            {foremanTab === "dashboard" && (() => {
              const liveProject = projects.find(p => String(p.id) === String(selectedProjectId)) || selectedProject;
              const projPhases = liveProject.phases || getDefaultPhases(liveProject);
              const updateForemanPhases = (newPhases) => {
                setProjects(prev => prev.map(p => String(p.id) === String(liveProject.id) ? { ...p, phases: newPhases } : p));
              };
              const activePhase = projPhases.find(ph => ph.status === "in progress");
              const completedCount = projPhases.filter(ph => ph.status === "completed").length;
              return (
                <div className="emp-content">
                  <div className="section-header">
                    <div className="section-title" style={{ fontSize: 16 }}>{selectedProject.name}</div>
                  </div>
                  <div className="text-xs text-muted mb-8">
                    {selectedProject.gc} · {selectedProject.phase} · {selectedProject.address}
                  </div>

                  <div className="foreman-kpi-grid">
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Allocated Hours")}</div>
                      <div className="foreman-kpi-value">{allocatedHours.toLocaleString()}</div>
                      <div className="foreman-kpi-sub">{t("hrs")}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value" style={{ color: budgetColor }}>{hoursUsed.toFixed(1)}</div>
                      <div className="foreman-kpi-sub">{t("hrs")}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Hours Remaining")}</div>
                      <div className="foreman-kpi-value" style={{ color: hoursRemaining < 0 ? "var(--red)" : "var(--green)" }}>
                        {hoursRemaining.toFixed(1)}
                      </div>
                      <div className="foreman-kpi-sub">{t("hrs")}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value">{pctUsed}%</div>
                      <div className="foreman-budget-bar">
                        <div className="foreman-budget-fill"
                          style={{ width: `${Math.min(pctUsed, 100)}%`, background: budgetColor }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div className="foreman-kpi-card" style={{ flex: 1 }}>
                      <div className="foreman-kpi-label">{t("Crew Members")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: 18 }}>{crewForProject.length}</div>
                    </div>
                    <div className="foreman-kpi-card" style={{ flex: 1 }}>
                      <div className="foreman-kpi-label">{t("Materials")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: 18 }}>{projectMatRequests.length}</div>
                    </div>
                    <div className="foreman-kpi-card" style={{ flex: 1 }}>
                      <div className="foreman-kpi-label">{t("Progress")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: 18 }}>{selectedProject.progress}%</div>
                    </div>
                  </div>

                  <div className="foreman-kpi-card" style={{ marginBottom: 12 }}>
                    <div className="foreman-kpi-label">{t("Progress")}</div>
                    <div className="project-progress-bar" style={{ marginTop: 8 }}>
                      <div className="project-progress-fill"
                        style={{ width: `${selectedProject.progress}%` }} />
                    </div>
                  </div>

                  {/* ── Phase Tracker ── */}
                  <div className="foreman-kpi-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div className="foreman-kpi-label">{t("Construction Phases")}</div>
                        <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                          {completedCount}/{projPhases.length} {t("complete")}
                          {activePhase ? ` · ${activePhase.name}` : ""}
                        </div>
                      </div>
                      {activePhase && (
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>{activePhase.name}</span>
                      )}
                    </div>
                    <PhaseTracker
                      phases={projPhases}
                      employees={employees}
                      onUpdate={updateForemanPhases}
                      readOnly={false}
                      foremanName={activeForeman?.name || ""}
                    />
                  </div>
                </div>
              );
            })()}

            {/* ═══ CREW TAB ═══ */}
            {foremanTab === "crew" && (() => {
              const scheduledIds = new Set(crewForProject.map(c => String(c.id)));
              const extraCrew = extraCrewIds
                .map(id => employees.find(e => String(e.id) === String(id)))
                .filter(Boolean);
              const allDisplayCrew = [...crewForProject, ...extraCrew];

              const crewAddFiltered = (() => {
                const q = crewAddSearch.toLowerCase().trim();
                return (employees || [])
                  .filter(e => e.active !== false && !scheduledIds.has(String(e.id)) && !extraCrewIds.some(id => String(id) === String(e.id)))
                  .filter(e => !q || e.name.toLowerCase().includes(q))
                  .slice(0, 12);
              })();

              return (
                <div className="emp-content">
                  <div className="section-header" style={{ alignItems: "center" }}>
                    <div className="section-title" style={{ fontSize: 16 }}>{t("Crew Members")}</div>
                    <button
                      className="btn btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: "var(--accent)", color: "#fff", padding: "8px 14px", borderRadius: 8 }}
                      onClick={() => { setShowCrewAdd(v => !v); setCrewAddSearch(""); }}
                    >
                      <UserPlus size={15} />
                      {t("Add Crew")}
                    </button>
                  </div>

                  {/* Add crew member dropdown */}
                  {showCrewAdd && (
                    <div style={{ marginBottom: 14, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                        <Search size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
                        <input
                          ref={crewAddRef}
                          autoFocus
                          type="text"
                          placeholder={t("Search employees...")}
                          value={crewAddSearch}
                          onChange={e => setCrewAddSearch(e.target.value)}
                          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 14 }}
                        />
                        <button onClick={() => setShowCrewAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 2 }}>
                          <X size={14} />
                        </button>
                      </div>
                      {crewAddFiltered.length === 0 ? (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text3)" }}>{t("No employees found")}</div>
                      ) : (
                        crewAddFiltered.map(emp => (
                          <div
                            key={emp.id}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setExtraCrewIds(prev => [...prev, emp.id]);
                              setCrewAddSearch("");
                            }}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {emp.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>{emp.role || ""}</div>
                            </div>
                            <UserPlus size={14} style={{ color: "var(--accent)" }} />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {allDisplayCrew.length === 0 ? (
                    <div className="empty-state" style={{ padding: "30px 20px" }}>
                      <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}><UserPlus size={36} /></div>
                      <div className="empty-text">{t("No crew assigned")}</div>
                      <div className="text-xs text-muted" style={{ marginTop: 6 }}>{t("Tap Add Crew to add members")}</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {crewForProject.map(c => (
                        <div key={c.id} className="foreman-crew-row">
                          <div>
                            <div className="foreman-crew-name">{c.name}</div>
                            <div className="foreman-crew-role">{t(c.role)}</div>
                            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                              {DAY_KEYS.filter(d => c.days?.[d]).map(d => t(d.charAt(0).toUpperCase() + d.slice(1))).join(", ")}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div className="foreman-crew-hours">{fmtHours(c.todayHours)}</div>
                            <div className="text-xs text-muted">{t("Hours Today")}</div>
                            <div className="text-xs text-dim" style={{ marginTop: 2 }}>
                              {fmtHours(c.weekHours)} {t("This Week").toLowerCase()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {extraCrew.map(c => (
                        <div key={c.id} className="foreman-crew-row" style={{ borderLeft: "3px solid var(--amber)" }}>
                          <div>
                            <div className="foreman-crew-name">{c.name}</div>
                            <div className="foreman-crew-role">{t(c.role)}</div>
                            <div className="text-xs" style={{ color: "var(--amber)", marginTop: 2 }}>+ {t("Added today")}</div>
                          </div>
                          <button
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 6 }}
                            onClick={() => setExtraCrewIds(prev => prev.filter(id => String(id) !== String(c.id)))}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ HOURS TAB (was Budget) ═══ */}
            {foremanTab === "hours" && (
              <div className="emp-content">
                <div className="section-header">
                  <div className="section-title" style={{ fontSize: 16 }}>{t("Hours")}</div>
                </div>

                {/* Summary card */}
                <div className="foreman-kpi-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div className="foreman-kpi-label">{t("Allocated Hours")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: 20 }}>{allocatedHours.toLocaleString()} {t("hrs")}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: 20, color: budgetColor }}>{hoursUsed.toFixed(1)} {t("hrs")}</div>
                    </div>
                  </div>
                  <div className="foreman-budget-bar">
                    <div className="foreman-budget-fill"
                      style={{ width: `${Math.min(pctUsed, 100)}%`, background: budgetColor }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-xs text-muted">{t("Hours Remaining")}: <b style={{ color: hoursRemaining < 0 ? "var(--red)" : "var(--green)" }}>{hoursRemaining.toFixed(1)} {t("hrs")}</b></span>
                    <span className="text-xs text-muted">{t("Burn Rate")}: <b style={{ color: "var(--amber)" }}>{weeklyBurnHours.toFixed(1)} {t("hrs")}</b> {t("per week")}</span>
                  </div>
                </div>

                {/* Per-employee hours breakdown */}
                <div className="section-header" style={{ marginBottom: 8 }}>
                  <div className="section-title" style={{ fontSize: 14 }}>{t("Crew Members")}</div>
                </div>
                {crewForProject.length === 0 ? (
                  <div className="text-sm text-muted">{t("No crew assigned")}</div>
                ) : (
                  <div className="foreman-kpi-card">
                    <div className="foreman-cost-row" style={{ fontWeight: 600, fontSize: 10, textTransform: "uppercase", color: "var(--text3)" }}>
                      <span style={{ flex: 2 }}>{t("Crew")}</span>
                      <span style={{ flex: 1, textAlign: "right" }}>{t("Role")}</span>
                      <span style={{ flex: 1, textAlign: "right" }}>{t("Hours Today")}</span>
                      <span style={{ flex: 1, textAlign: "right" }}>{t("Hours This Week")}</span>
                    </div>
                    {crewForProject.map(c => (
                      <div key={c.id} className="foreman-cost-row">
                        <span style={{ flex: 2 }}>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>{c.name}</span>
                        </span>
                        <span style={{ flex: 1, textAlign: "right", color: "var(--text2)", fontSize: 12 }}>{t(c.role)}</span>
                        <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text2)" }}>{fmtHours(c.todayHours)}</span>
                        <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>{fmtHours(c.weekHours)}</span>
                      </div>
                    ))}
                    <div className="foreman-cost-row" style={{ fontWeight: 600, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                      <span style={{ flex: 2, color: "var(--text)" }}>Total</span>
                      <span style={{ flex: 1 }}></span>
                      <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text2)" }}>
                        {fmtHours(crewForProject.reduce((s, c) => s + c.todayHours, 0))}
                      </span>
                      <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                        {fmtHours(crewForProject.reduce((s, c) => s + c.weekHours, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ MATERIALS TAB ═══ */}
            {foremanTab === "materials" && (
              <div className="emp-content">
                <div className="section-header">
                  <div className="section-title" style={{ fontSize: 16 }}>{t("Request Material")}</div>
                </div>
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Material")}</label>
                      <input type="text" className="login-input" placeholder='e.g., 5/8" Type X GWB'
                        value={matForm.material} onChange={e => setMatForm(f => ({ ...f, material: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Quantity")}</label>
                        <input type="number" className="login-input" min="1"
                          value={matForm.qty} onChange={e => setMatForm(f => ({ ...f, qty: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Unit")}</label>
                        <select className="settings-select" value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))}>
                          {["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Notes")}</label>
                      <textarea className="login-input" rows={2} style={{ resize: "vertical", minHeight: 60 }}
                        value={matForm.notes} onChange={e => setMatForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleMatSubmit}>{t("Submit Request")}</button>
                  </div>
                </div>

                <div className="section-header">
                  <div className="section-title" style={{ fontSize: 14 }}>{t("Material Requests")}</div>
                </div>
                {projectMatRequests.length === 0 ? (
                  <div className="empty-state" style={{ padding: "20px" }}>
                    <div className="empty-icon"><Package size={32} /></div>
                    <div className="empty-text">{t("No material requests yet")}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {projectMatRequests.map(req => (
                      <div key={req.id} className="mat-request-card">
                        <div className="flex-between mb-4">
                          <span className="text-sm font-semi">{req.material}</span>
                          <span className={`badge mat-status-${req.status}`}>{t(req.status.charAt(0).toUpperCase() + req.status.slice(1))}</span>
                        </div>
                        <div className="text-xs text-muted mb-4">
                          {req.qty} {req.unit} · {t("Requester")}: {req.employeeName}
                        </div>
                        {req.notes && <div className="text-xs text-dim mb-4">{req.notes}</div>}
                        {req.status === "requested" && (
                          <button className="btn btn-primary btn-sm" style={{ background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                            onClick={() => handleApprove(req.id)}>
                            {t("Approve")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ JSA TAB ═══ */}
            {foremanTab === "jsa" && (
              <div className="emp-content">
                {/* ── JSA LIST VIEW ── */}
                {jsaView === "list" && (
                  <div>
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <div className="section-title" style={{ fontSize: 16 }}>{t("Job Safety Analysis")}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setJsaView("rollcall");
                          setRcStep("pick");
                          setRcWeather("clear");
                          setRcJsaId(null);
                        }}>{t("Pre-Task Safety")}</button>
                        <button className="cal-nav-btn" style={{ fontSize: 11 }} onClick={() => {
                          setJsaForm(f => ({ ...f, projectId: String(selectedProjectId || ""), supervisor: activeForeman.name, competentPerson: activeForeman.name }));
                          setJsaView("create");
                        }}>+</button>
                      </div>
                    </div>

                    {myJsas.length === 0 ? (
                      <div className="empty-state" style={{ padding: "30px 20px" }}>
                        <div className="empty-icon"><Shield size={32} /></div>
                        <div className="empty-text">{t("No JSAs yet. Create one for today's work.")}</div>
                      </div>
                    ) : myJsas.sort((a, b) => b.date.localeCompare(a.date)).map(j => {
                      const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
                      const rc = riskColor(maxRisk);
                      const statusClr = j.status === "active" ? "#10b981" : j.status === "draft" ? "#f59e0b" : "var(--text3)";
                      const proj = projects.find(p => String(p.id) === String(j.projectId));
                      return (
                        <div key={j.id} className="card" style={{ padding: 12, marginBottom: 8, cursor: "pointer" }} onClick={() => { setActiveJsaId(j.id); setJsaView("detail"); }}>
                          <div className="flex-between" style={{ marginBottom: 4 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr, fontSize: 10 }}>{j.status.toUpperCase()}</span>
                              <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg, fontSize: 10 }}>{rc.label}</span>
                            </div>
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{(j.crewSignOn || []).length} {t("signed")}</span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{j.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{proj?.name} · {j.date}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                            {(j.ppe || []).slice(0, 6).map(k => {
                              const item = PPE_ITEMS.find(p => p.key === k);
                              return item ? <span key={k} style={{ fontSize: 14 }}>{item.icon}</span> : null;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── PRE-TASK SAFETY ROLL CALL ── */}
                {jsaView === "rollcall" && (() => {
                  const rcJsa = rcJsaId ? (jsas || []).find(j => j.id === rcJsaId) : null;
                  const updateRcJsa = (patch) => setJsas(prev => prev.map(j => j.id === rcJsaId ? { ...j, ...patch } : j));
                  const proj = selectedProject;

                  // ── STEP 1: PICK THE TASK ──
                  if (rcStep === "pick") {
                    return (
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
                          <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("← Back")}</button>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("Pre-Task Safety")}</span>
                        </div>

                        {!selectedProjectId && (
                          <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--amber)" }}>
                            {t("Select a project first")}
                          </div>
                        )}

                        {selectedProjectId && (
                          <>
                            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>{proj?.name || "Project"}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{t("Pick today's task")}</div>

                            {/* Indoor / Outdoor toggle */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Work Environment")}</div>
                              <div style={{ display: "flex", gap: 8 }}>
                                {[{ key: "indoor", label: t("Indoor"), labelEs: "Interior" }, { key: "outdoor", label: t("Outdoor"), labelEs: "Exterior" }].map(opt => (
                                  <button
                                    key={opt.key}
                                    onClick={() => setRcIndoorOutdoor(opt.key)}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "2px solid",
                                      borderColor: rcIndoorOutdoor === opt.key ? "var(--accent)" : "var(--border)",
                                      background: rcIndoorOutdoor === opt.key ? "var(--accent)" : "var(--bg2)",
                                      color: rcIndoorOutdoor === opt.key ? "#fff" : "var(--text2)",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {lang === "es" ? opt.labelEs : opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Trade cards - 2 column grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                              {TRADE_CARDS.map(card => {
                                const tmpl = JSA_TEMPLATES.find(t => t.id === card.templateId);
                                if (!tmpl) return null;
                                const tradeLabel = lang === "es"
                                  ? (TRADE_LABELS[card.trade]?.labelEs || card.trade) + (card.suffixEs ? " — " + card.suffixEs : "")
                                  : (TRADE_LABELS[card.trade]?.label || card.trade) + (card.suffix ? " — " + card.suffix : "");
                                return (
                                  <div key={card.templateId} className="card" style={{
                                    padding: 16, cursor: "pointer", borderLeft: `4px solid ${card.color}`,
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                                    textAlign: "center", transition: "transform 0.15s",
                                  }} onClick={() => {
                                    // Go to hazard selection step first
                                    const trade = tmpl.trade;
                                    const lib = HAZARD_LIBRARY[trade] || [];
                                    // Pre-select all hazards by default
                                    const sel = {};
                                    lib.forEach((_, idx) => { sel[idx] = true; });
                                    setRcSelectedHazardIdxs(sel);
                                    setRcPendingCard(card);
                                    setRcStep("hazards");
                                  }}>
                                    <span style={{ fontSize: 28 }}>{card.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: card.color }}>{tradeLabel}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Weather quick-select — only for outdoor jobs */}
                            {rcIndoorOutdoor === "outdoor" && (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>{t("Weather")}</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {WEATHER_QUICK.map(w => (
                                    <button key={w.key} className={rcWeather === w.key ? "btn btn-primary btn-sm" : "cal-nav-btn"}
                                      style={{ fontSize: 12, padding: "6px 10px" }}
                                      onClick={() => setRcWeather(w.key)}>
                                      {w.icon} {lang === "es" ? w.labelEs : w.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }

                  // ── STEP 1b: HAZARD MULTI-SELECT ──
                  if (rcStep === "hazards" && rcPendingCard) {
                    const tmpl = JSA_TEMPLATES.find(t => t.id === rcPendingCard.templateId);
                    const trade = tmpl?.trade || rcPendingCard.trade;
                    const lib = HAZARD_LIBRARY[trade] || [];
                    const selectedCount = Object.values(rcSelectedHazardIdxs).filter(Boolean).length;
                    return (
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                          <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); setRcPendingCard(null); }}>{t("← Back")}</button>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("Select Hazards")}</span>
                        </div>

                        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>{proj?.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
                          {t("Pick as many as apply")} · {TRADE_LABELS[trade]?.label || trade}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                          {lib.map((h, idx) => {
                            const isChecked = !!rcSelectedHazardIdxs[idx];
                            const catInfo = HAZARD_CATEGORIES.find(c => c.key === h.category);
                            return (
                              <div
                                key={idx}
                                onClick={() => setRcSelectedHazardIdxs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                style={{
                                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                                  background: isChecked ? "var(--bg2)" : "var(--bg3)",
                                  border: `1.5px solid ${isChecked ? (catInfo?.color || "var(--accent)") : "var(--border)"}`,
                                  borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                                }}
                              >
                                <div style={{ flexShrink: 0, marginTop: 1, color: isChecked ? (catInfo?.color || "var(--accent)") : "var(--text3)" }}>
                                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: isChecked ? "var(--text)" : "var(--text3)" }}>{h.hazard}</div>
                                  {h.hazardEs && <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>{h.hazardEs}</div>}
                                  {isChecked && (
                                    <div style={{ marginTop: 4 }}>
                                      {h.controls.slice(0, 2).map((c, ci) => (
                                        <div key={ci} style={{ fontSize: 11, color: "var(--text2)" }}>✓ {c}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {catInfo && (
                                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: catInfo.color + "22", color: catInfo.color, fontWeight: 700, flexShrink: 0 }}>
                                    {catInfo.label}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {/* Weather hazard — only for outdoor */}
                          {rcIndoorOutdoor === "outdoor" && rcWeather !== "clear" && WEATHER_HAZARD_MAP[rcWeather] && (() => {
                            const wh = WEATHER_HAZARD_MAP[rcWeather];
                            const isChecked = !!rcSelectedHazardIdxs["weather"];
                            return (
                              <div
                                onClick={() => setRcSelectedHazardIdxs(prev => ({ ...prev, weather: !prev["weather"] }))}
                                style={{
                                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                                  background: isChecked ? "var(--bg2)" : "var(--bg3)",
                                  border: `1.5px solid ${isChecked ? "#eab308" : "var(--border)"}`,
                                  borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                                }}
                              >
                                <div style={{ flexShrink: 0, marginTop: 1, color: isChecked ? "#eab308" : "var(--text3)" }}>
                                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: isChecked ? "var(--text)" : "var(--text3)" }}>{wh.hazard}</div>
                                  {wh.hazardEs && <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>{wh.hazardEs}</div>}
                                </div>
                                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#eab30822", color: "#eab308", fontWeight: 700, flexShrink: 0 }}>
                                  Weather
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <button
                          className="btn btn-primary"
                          style={{ width: "100%", padding: "14px", fontSize: 16 }}
                          disabled={selectedCount === 0}
                          onClick={() => {
                            if (!tmpl) return;
                            const libHazards = HAZARD_LIBRARY[trade] || [];
                            // Build steps with only selected hazards
                            const steps = tmpl.steps.map((s, i) => ({
                              id: "s_" + Date.now() + "_" + i,
                              step: s.step, stepEs: s.stepEs,
                              hazards: (s.hazards || []).map(hIdx => {
                                if (!rcSelectedHazardIdxs[hIdx]) return null;
                                const h = libHazards[hIdx];
                                if (!h) return null;
                                return { hazard: h.hazard, hazardEs: h.hazardEs, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType, ppe: h.ppe ? [...h.ppe] : [] };
                              }).filter(Boolean),
                            }));
                            // Add weather hazard if outdoor + selected
                            if (rcIndoorOutdoor === "outdoor" && rcWeather !== "clear" && rcSelectedHazardIdxs["weather"]) {
                              const wh = WEATHER_HAZARD_MAP[rcWeather];
                              if (wh) steps.push({ id: "s_weather_" + Date.now(), step: "Weather precautions", stepEs: "Precauciones climáticas",
                                hazards: [{ hazard: wh.hazard, hazardEs: wh.hazardEs, category: wh.category, likelihood: 3, severity: 3, controls: ["Monitor conditions", "Take breaks as needed"], controlType: "administrative", ppe: wh.ppe || [] }],
                              });
                            }
                            const newJsa = {
                              id: crypto.randomUUID(),
                              projectId: selectedProjectId,
                              templateId: rcPendingCard.templateId,
                              trade, title: tmpl.title, titleEs: tmpl.titleEs,
                              location: proj?.address || "",
                              date: new Date().toISOString().slice(0, 10),
                              shift: new Date().getHours() < 14 ? "day" : "night",
                              weather: rcIndoorOutdoor === "outdoor" ? rcWeather : "indoor",
                              indoorOutdoor: rcIndoorOutdoor,
                              supervisor: activeForeman.name,
                              competentPerson: activeForeman.name,
                              status: "draft",
                              steps, ppe: [...tmpl.ppe], permits: [...tmpl.permits],
                              crewSignOn: [], nearMisses: [],
                              toolboxTalk: { topic: "", notes: "", discussed: false },
                              createdAt: new Date().toISOString(),
                              createdBy: activeForeman.name, audit: [],
                            };
                            setJsas(prev => [...prev, newJsa]);
                            setRcJsaId(newJsa.id);
                            const sel = {};
                            crewForProject.forEach(c => { sel[c.id] = true; });
                            setRcSelected(sel);
                            setRcStep("crew");
                          }}
                        >
                          {t("Proceed")} ({selectedCount} {t("hazards selected")})
                        </button>
                      </div>
                    );
                  }

                  // ── STEP 2: CREW ROLL CALL ──
                  if (rcStep === "crew") {
                    const allCrew = [...crewForProject];
                    // Include any employees not in crewForProject that were manually added
                    const crewIds = new Set(allCrew.map(c => c.id));
                    return (
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                          <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); }}>{t("← Back")}</button>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("Crew Roll Call")}</span>
                        </div>

                        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>{proj?.name} · {rcJsa?.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
                          {new Date().toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </div>

                        {/* Crew list */}
                        {allCrew.length === 0 ? (
                          <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--text3)" }}>
                            {t("No crew scheduled. Add crew members below.")}
                          </div>
                        ) : allCrew.map(c => (
                          <div key={c.id} className="card" style={{
                            padding: 12, marginBottom: 6, display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                            borderLeft: rcSelected[c.id] ? "4px solid #10b981" : "4px solid var(--border)",
                            opacity: rcSelected[c.id] ? 1 : 0.5,
                          }} onClick={() => setRcSelected(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                            <span style={{ width: 28, display: "flex", justifyContent: "center" }}>{rcSelected[c.id] ? <CheckCircle size={20} style={{ color: "#10b981" }} /> : <Square size={20} style={{ color: "var(--text3)" }} />}</span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.role || "Crew"}</div>
                            </div>
                          </div>
                        ))}

                        {/* Add crew */}
                        {rcAddingCrew ? (
                          <select className="form-select" style={{ fontSize: 12, marginTop: 8 }} autoFocus
                            onChange={e => {
                              if (!e.target.value) return;
                              const emp = employees.find(em => em.id === Number(e.target.value));
                              if (!emp || crewIds.has(emp.id)) return;
                              crewForProject.push({ id: emp.id, name: emp.name, role: emp.role || "Crew" });
                              setRcSelected(prev => ({ ...prev, [emp.id]: true }));
                              setRcAddingCrew(false);
                            }} onBlur={() => setRcAddingCrew(false)}>
                            <option value="">{t("Select employee...")}</option>
                            {(employees || []).filter(e => !crewIds.has(e.id) && e.active !== false).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        ) : (
                          <button className="cal-nav-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setRcAddingCrew(true)}>
                            + {t("Add Crew")}
                          </button>
                        )}

                        {/* Start Sign-On */}
                        <button className="btn btn-primary" style={{ width: "100%", marginTop: 20, padding: "14px", fontSize: 16 }}
                          disabled={Object.values(rcSelected).filter(Boolean).length === 0}
                          onClick={() => {
                            const queue = crewForProject.filter(c => rcSelected[c.id]).map(c => ({ employeeId: c.id, name: c.name }));
                            setRcQueue(queue);
                            setRcSignIdx(0);
                            setRcStep("sign");
                          }}>
                          {t("Start Sign-On")} ({Object.values(rcSelected).filter(Boolean).length})
                        </button>
                      </div>
                    );
                  }

                  // ── STEP 3: PASS & SIGN ──
                  if (rcStep === "sign" && rcQueue.length > 0) {
                    const current = rcQueue[rcSignIdx];
                    const allHazards = (rcJsa?.steps || []).flatMap(s => s.hazards || []);
                    const progress = rcSignIdx + 1;
                    const total = rcQueue.length;
                    return (
                      <div>
                        {/* Progress */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
                            <span>{progress} {t("of")} {total}</span>
                            <span>{t("Pass device to next person")}</span>
                          </div>
                          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(progress / total) * 100}%`, background: "#10b981", borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                        </div>

                        {/* Name banner */}
                        <div style={{ textAlign: "center", padding: "16px 0", marginBottom: 12 }}>
                          <div style={{ fontSize: 28, fontWeight: 700 }}>{current.name}</div>
                          <div style={{ fontSize: 13, color: "var(--text3)" }}>{proj?.name}</div>
                        </div>

                        {/* Hazard cards */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", marginBottom: 8 }}>{t("Hazards")}</div>
                          {allHazards.map((h, i) => {
                            const score = (h.likelihood || 1) * (h.severity || 1);
                            const hrc = riskColor(score);
                            const catInfo = HAZARD_CATEGORIES[h.category];
                            return (
                              <div key={i} className="card" style={{ padding: 10, marginBottom: 6, borderLeft: `3px solid ${catInfo?.color || "var(--amber)"}` }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                                  <span style={{ background: hrc.bg, color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{score}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{h.hazard}</span>
                                </div>
                                {h.hazardEs && <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, fontStyle: "italic" }}>{h.hazardEs}</div>}
                                <div style={{ fontSize: 11, color: "var(--text2)" }}>
                                  {(h.controls || []).map((c, ci) => <div key={ci}>✓ {c}</div>)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* PPE */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Required PPE")}</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {(rcJsa?.ppe || []).map(k => {
                              const item = PPE_ITEMS.find(p => p.key === k);
                              return item ? (
                                <div key={k} style={{ textAlign: "center" }}>
                                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                                  <div style={{ fontSize: 10, color: "var(--text2)" }}>{item.label}</div>
                                  <div style={{ fontSize: 9, color: "var(--text3)" }}>{item.labelEs}</div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>

                        {/* Signature pad */}
                        <div style={{ marginBottom: 12 }}>
                          <FieldSignaturePad
                            key={rcSignIdx}
                            label={t("Sign below")}
                            t={t}
                            onSave={(ref) => { sigRef.current = ref; }}
                          />
                        </div>

                        {/* Sign & Next button */}
                        <button className="btn btn-primary" style={{ width: "100%", padding: "14px", fontSize: 16 }}
                          onClick={() => {
                            const sigData = sigRef.current?.getSig?.();
                            if (!sigData) { show(t("Please sign first"), "err"); return; }
                            // Add signature to JSA
                            updateRcJsa({
                              crewSignOn: [...(rcJsa?.crewSignOn || []), {
                                employeeId: current.employeeId,
                                name: current.name,
                                signedAt: new Date().toISOString(),
                                signature: sigData,
                              }],
                            });
                            if (rcSignIdx < rcQueue.length - 1) {
                              setRcSignIdx(rcSignIdx + 1);
                              sigRef.current = null;
                            } else {
                              // All crew signed — move to supervisor sign-off
                              setRcStep("supervisor");
                              sigRef.current = null;
                            }
                          }}>
                          {rcSignIdx < rcQueue.length - 1 ? t("Sign & Next") : t("Sign & Finish")}
                        </button>
                      </div>
                    );
                  }

                  // ── STEP 3b: SUPERVISOR SIGN-OFF ──
                  if (rcStep === "supervisor") {
                    return (
                      <div>
                        <div style={{ textAlign: "center", padding: "24px 0", marginBottom: 16 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--amber)" }}>{t("Supervisor Sign-Off")}</div>
                          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{activeForeman.name}</div>
                          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
                            {(rcJsa?.crewSignOn || []).length} {t("crew members signed")}
                          </div>
                        </div>

                        <FieldSignaturePad
                          key="supervisor"
                          label={t("Supervisor signature")}
                          t={t}
                          onSave={(ref) => { sigRef.current = ref; }}
                        />

                        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16, padding: "14px", fontSize: 16 }}
                          onClick={() => {
                            const sigData = sigRef.current?.getSig?.();
                            if (!sigData) { show(t("Please sign first"), "err"); return; }
                            updateRcJsa({ supervisorSignature: sigData, status: "active" });
                            setRcStep("done");
                            show(t("Pre-Task Safety Complete"), "ok");
                          }}>
                          {t("Activate JSA")}
                        </button>
                      </div>
                    );
                  }

                  // ── STEP 4: CONFIRMATION ──
                  if (rcStep === "done") {
                    const finalJsa = (jsas || []).find(j => j.id === rcJsaId);
                    return (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><CheckCircle size={48} style={{ color: "#10b981" }} /></div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t("Pre-Task Safety Complete")}</div>
                        <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>
                          {(finalJsa?.crewSignOn || []).length} {t("crew members signed")} · {finalJsa?.title}
                        </div>

                        {/* Signed crew list */}
                        <div style={{ textAlign: "left", marginBottom: 20 }}>
                          {(finalJsa?.crewSignOn || []).map((c, i) => (
                            <div key={i} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                              <span style={{ fontSize: 11, color: "#10b981" }}>✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="cal-nav-btn" style={{ flex: 1, padding: 12 }} onClick={async () => {
                            try {
                              const { generateJsaPdf } = await import("../utils/jsaPdf");
                              const p = projects.find(pr => pr.id === finalJsa?.projectId);
                              await generateJsaPdf({ ...finalJsa, projectName: p?.name || "Project" });
                              show(t("PDF exported"), "ok");
                            } catch (e) { show("PDF error: " + e.message, "err"); }
                          }}>{t("Export PDF")}</button>
                          <button className="btn btn-primary" style={{ flex: 1, padding: 12 }} onClick={() => {
                            setJsaView("list");
                            setRcJsaId(null);
                            setRcStep("pick");
                          }}>{t("Done")}</button>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* ── JSA DETAIL VIEW ── */}
                {jsaView === "detail" && (() => {
                  const jsa = (jsas || []).find(j => j.id === activeJsaId);
                  if (!jsa) { setJsaView("list"); return null; }
                  const updateJsa = (patch) => setJsas(prev => prev.map(j => j.id === jsa.id ? { ...j, ...patch } : j));
                  const allHazards = jsa.steps.flatMap(s => s.hazards || []);
                  const maxRisk = Math.max(0, ...allHazards.map(h => (h.likelihood || 1) * (h.severity || 1)));
                  const rc = riskColor(maxRisk);
                  const statusClr = jsa.status === "active" ? "#10b981" : jsa.status === "draft" ? "#f59e0b" : "var(--text3)";
                  return (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("← Back")}</button>
                        <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr }}>{jsa.status.toUpperCase()}</span>
                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                          {jsa.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateJsa({ status: "active" })}>{t("Activate")}</button>}
                          {jsa.status === "active" && <button className="cal-nav-btn" onClick={() => updateJsa({ status: "closed" })}>{t("Close JSA")}</button>}
                        </div>
                      </div>

                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{jsa.title}</h3>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
                        {jsa.date} · {jsa.location} · {lang === "es" ? TRADE_LABELS[jsa.trade]?.labelEs : TRADE_LABELS[jsa.trade]?.label}
                      </div>

                      {/* Risk summary */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                        <div className="card" style={{ padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: rc.bg }}>{maxRisk}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>{t("Highest Risk")}</div>
                        </div>
                        <div className="card" style={{ padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700 }}>{allHazards.length}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>{t("Hazards")}</div>
                        </div>
                        <div className="card" style={{ padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{(jsa.crewSignOn || []).length}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>{t("Crew Signed")}</div>
                        </div>
                      </div>

                      {/* PPE */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Required PPE")}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(jsa.ppe || []).map(k => {
                            const item = PPE_ITEMS.find(p => p.key === k);
                            return item ? (
                              <div key={k} style={{ textAlign: "center", fontSize: 11 }}>
                                <div style={{ fontSize: 20 }}>{item.icon}</div>
                                <div style={{ color: "var(--text3)" }}>{lang === "es" ? item.labelEs : item.label}</div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {/* Steps & Hazards */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Job Steps & Hazards")}</div>
                        {(jsa.steps || []).map((step, idx) => (
                          <div key={step.id} className="card" style={{ padding: 10, marginBottom: 6 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--amber)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{step.step}</span>
                            </div>
                            {(step.hazards || []).map((h, hi) => {
                              const score = (h.likelihood || 1) * (h.severity || 1);
                              const hrc = riskColor(score);
                              return (
                                <div key={hi} style={{ marginLeft: 30, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                                    <span className="jsa-risk-score" style={{ background: hrc.bg, color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{score}</span>
                                    <span style={{ fontSize: 12, fontWeight: 500 }}>{h.hazard}</span>
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                                    {(h.controls || []).map((c, ci) => <span key={ci}>✓ {c}{ci < h.controls.length - 1 ? " · " : ""}</span>)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Crew Sign-On */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Crew Sign-On")} ({(jsa.crewSignOn || []).length})</div>
                        {(jsa.crewSignOn || []).map((c, i) => (
                          <div key={i} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: "#10b981" }}>✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        ))}
                        {jsa.status === "active" && (
                          <select className="form-select" style={{ fontSize: 12, marginTop: 8 }}
                            onChange={e => {
                              if (!e.target.value) return;
                              const emp = (employees || []).find(em => em.id === Number(e.target.value));
                              if (!emp) return;
                              if ((jsa.crewSignOn || []).some(c => c.employeeId === emp.id)) { show(t("Already signed on")); return; }
                              updateJsa({ crewSignOn: [...(jsa.crewSignOn || []), { employeeId: emp.id, name: emp.name, signedAt: new Date().toISOString() }] });
                              show(t("Crew member signed on"));
                              e.target.value = "";
                            }}>
                            <option value="">{t("+ Add crew member...")}</option>
                            {crewForProject.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Near Misses */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Near Misses")}</div>
                        {(jsa.nearMisses || []).length === 0 ? (
                          <div style={{ fontSize: 12, color: "var(--text3)" }}>{t("None reported")}</div>
                        ) : (jsa.nearMisses || []).map((nm, i) => (
                          <div key={i} className="card" style={{ padding: 8, marginBottom: 4, fontSize: 12 }}>
                            {nm.description} — {nm.reportedBy} ({nm.date})
                          </div>
                        ))}
                        {jsa.status === "active" && (
                          <button className="cal-nav-btn" style={{ marginTop: 6, fontSize: 11 }} onClick={() => {
                            const desc = prompt(lang === "es" ? "Describe el casi-accidente:" : "Describe the near miss:");
                            if (!desc) return;
                            updateJsa({ nearMisses: [...(jsa.nearMisses || []), { description: desc, reportedBy: activeForeman.name, date: new Date().toISOString().slice(0, 10) }] });
                            show(t("Near miss recorded"));
                          }}>{t("+ Report Near Miss")}</button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── JSA CREATE VIEW ── */}
                {jsaView === "create" && (() => {
                  const applyTemplate = (tmplId) => {
                    const tmpl = JSA_TEMPLATES.find(t => t.id === tmplId);
                    if (!tmpl) return;
                    const trade = tmpl.trade;
                    const lib = HAZARD_LIBRARY[trade] || [];
                    const steps = tmpl.steps.map((s, i) => ({
                      id: "s_" + Date.now() + "_" + i,
                      step: lang === "es" ? s.stepEs : s.step,
                      hazards: (s.hazards || []).map(hIdx => {
                        const h = lib[hIdx];
                        if (!h) return null;
                        return { hazard: lang === "es" ? h.hazardEs : h.hazard, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType };
                      }).filter(Boolean),
                    }));
                    setJsaForm(f => ({ ...f, templateId: tmplId, trade, title: lang === "es" ? tmpl.titleEs : tmpl.title, steps, ppe: [...tmpl.ppe], permits: [...tmpl.permits] }));
                  };

                  const saveJsa = () => {
                    if (!jsaForm.projectId) { show(t("Select a project"), "err"); return; }
                    if (!jsaForm.title) { show(t("Title required"), "err"); return; }
                    if (jsaForm.steps.length === 0) { show(t("Add at least one step"), "err"); return; }
                    const newJsa = {
                      id: crypto.randomUUID(),
                      ...jsaForm,
                      projectId: Number(jsaForm.projectId),
                      status: "draft",
                      crewSignOn: [],
                      toolboxTalk: { topic: "", notes: "", discussed: false },
                      nearMisses: [],
                      createdAt: new Date().toISOString(),
                      createdBy: activeForeman.name,
                      audit: [],
                    };
                    setJsas(prev => [...prev, newJsa]);
                    show(t("JSA created"));
                    setJsaForm({ projectId: "", trade: "framing", templateId: "", title: "", location: "", supervisor: activeForeman.name, competentPerson: activeForeman.name, date: new Date().toISOString().slice(0, 10), shift: "day", weather: "clear", steps: [], ppe: [], permits: [] });
                    setActiveJsaId(newJsa.id);
                    setJsaView("detail");
                  };

                  const weatherHazard = WEATHER_HAZARD_MAP[jsaForm.weather];

                  return (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                        <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("← Back")}</button>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{t("Create New JSA")}</span>
                      </div>

                      {/* Template */}
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">{t("Start from Template")}</label>
                        <select className="form-select" value={jsaForm.templateId} onChange={e => applyTemplate(e.target.value)}>
                          <option value="">{t("— Blank JSA —")}</option>
                          {JSA_TEMPLATES.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{lang === "es" ? tmpl.titleEs : tmpl.title}</option>)}
                        </select>
                      </div>

                      {/* Basic fields */}
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">{t("Project")}</label>
                        <select className="form-select" value={jsaForm.projectId} onChange={e => updJsaForm("projectId", e.target.value)}>
                          <option value="">{t("Select...")}</option>
                          {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">{t("Trade")}</label>
                        <select className="form-select" value={jsaForm.trade} onChange={e => updJsaForm("trade", e.target.value)}>
                          {Object.entries(TRADE_LABELS).map(([k, v]) => <option key={k} value={k}>{lang === "es" ? v.labelEs : v.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">{t("JSA Title")}</label>
                        <input className="form-input" value={jsaForm.title} onChange={e => updJsaForm("title", e.target.value)} placeholder={t("e.g. Metal Stud Framing — Level 2")} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">{t("Location on Site")}</label>
                        <input className="form-input" value={jsaForm.location} onChange={e => updJsaForm("location", e.target.value)} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">{t("Date")}</label>
                        <input className="form-input" type="date" value={jsaForm.date} onChange={e => updJsaForm("date", e.target.value)} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">{t("Weather")}</label>
                        <select className="form-select" value={jsaForm.weather} onChange={e => updJsaForm("weather", e.target.value)}>
                          <option value="clear">{t("Clear")}</option>
                          <option value="rain">{t("Rain")}</option>
                          <option value="thunderstorm">{t("Thunderstorm")}</option>
                          <option value="heat">{t("Heat Advisory")}</option>
                          <option value="freeze">{t("Freeze/Cold")}</option>
                          <option value="wind">{t("High Wind")}</option>
                        </select>
                      </div>

                      {weatherHazard && jsaForm.weather !== "clear" && (
                        <div className="jsa-weather-warn" style={{ marginBottom: 12 }}>
                          <AlertTriangle size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />{lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
                        </div>
                      )}

                      {/* PPE */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Required PPE")}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {PPE_ITEMS.map(item => {
                            const active = jsaForm.ppe.includes(item.key);
                            return (
                              <div key={item.key} className={`jsa-ppe-pick${active ? " active" : ""}`}
                                onClick={() => updJsaForm("ppe", active ? jsaForm.ppe.filter(k => k !== item.key) : [...jsaForm.ppe, item.key])}
                                style={{ padding: "4px 8px", textAlign: "center", cursor: "pointer" }}>
                                <div style={{ fontSize: 18 }}>{item.icon}</div>
                                <div style={{ fontSize: 9 }}>{lang === "es" ? item.labelEs : item.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Permits */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Permits Required")}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {PERMIT_TYPES.map(p => {
                            const active = jsaForm.permits.includes(p.key);
                            return (
                              <button key={p.key} className={`cal-nav-btn${active ? " active" : ""}`}
                                style={active ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)", fontSize: 11 } : { fontSize: 11 }}
                                onClick={() => updJsaForm("permits", active ? jsaForm.permits.filter(k => k !== p.key) : [...jsaForm.permits, p.key])}>
                                {lang === "es" ? p.labelEs : p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Steps */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Job Steps & Hazards")}</div>
                        {jsaForm.steps.map((step, idx) => (
                          <div key={step.id} className="card" style={{ padding: 10, marginBottom: 6 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--amber)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                              <input className="form-input" style={{ flex: 1, fontSize: 12 }} value={step.step}
                                onChange={e => updJsaForm("steps", jsaForm.steps.map((s, i) => i === idx ? { ...s, step: e.target.value } : s))}
                                placeholder={t("Describe this step...")} />
                              <button style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14 }}
                                onClick={() => updJsaForm("steps", jsaForm.steps.filter((_, i) => i !== idx))}>✕</button>
                            </div>
                            {(step.hazards || []).map((h, hi) => {
                              const score = (h.likelihood || 1) * (h.severity || 1);
                              const hrc = riskColor(score);
                              return (
                                <div key={hi} style={{ marginLeft: 26, padding: "4px 0", display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid var(--border)" }}>
                                  <span className="jsa-risk-score" style={{ background: hrc.bg, color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 4 }}>{score}</span>
                                  <span style={{ fontSize: 11, flex: 1 }}>{h.hazard}</span>
                                  <button style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 12 }}
                                    onClick={() => {
                                      const steps = [...jsaForm.steps];
                                      steps[idx] = { ...steps[idx], hazards: steps[idx].hazards.filter((_, i) => i !== hi) };
                                      updJsaForm("steps", steps);
                                    }}>✕</button>
                                </div>
                              );
                            })}
                            <select className="form-select" style={{ fontSize: 11, marginTop: 4, marginLeft: 26 }}
                              onChange={e => {
                                if (!e.target.value) return;
                                const [trade, hIdx] = e.target.value.split("|");
                                const h = (HAZARD_LIBRARY[trade] || [])[Number(hIdx)];
                                if (!h) return;
                                const steps = [...jsaForm.steps];
                                steps[idx] = { ...steps[idx], hazards: [...(steps[idx].hazards || []), { hazard: lang === "es" ? h.hazardEs : h.hazard, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType }] };
                                updJsaForm("steps", steps);
                                e.target.value = "";
                              }}>
                              <option value="">{t("+ Add hazard...")}</option>
                              {Object.entries(HAZARD_LIBRARY).map(([trade, hazards]) => (
                                <optgroup key={trade} label={lang === "es" ? TRADE_LABELS[trade]?.labelEs : TRADE_LABELS[trade]?.label}>
                                  {hazards.map((h, i) => <option key={i} value={`${trade}|${i}`}>{lang === "es" ? h.hazardEs : h.hazard}</option>)}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        ))}
                        <button className="cal-nav-btn" style={{ fontSize: 12 }}
                          onClick={() => updJsaForm("steps", [...jsaForm.steps, { id: "s_" + Date.now(), step: "", hazards: [] }])}>
                          {t("+ Add Step")}
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("Cancel")}</button>
                        <button className="btn btn-primary" onClick={saveJsa}>{t("Create JSA")}</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══ DRAWINGS TAB ═══ */}
            {foremanTab === "drawings" && (
              <div className="emp-content">
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div className="section-title" style={{ fontSize: 16 }}>{t("Project Drawings")}</div>
                  <button className="cal-nav-btn" style={{ fontSize: 11 }} onClick={loadCloudDrawings}>
                    {drawingsLoading ? "..." : t("Refresh")}
                  </button>
                </div>

                {/* Cloud drawings from Supabase Storage */}
                {cloudDrawings.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: 16 }}>
                    {cloudDrawings.map(d => (
                      <div key={d.id} className="card" style={{ padding: 14 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <FileText size={28} style={{ color: "var(--text2)", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="text-sm font-semi" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                            <div className="text-xs text-muted">
                              {d.size > 0 ? `${(d.size / 1048576).toFixed(1)} MB` : ""}{d.uploadedAt ? ` · ${d.uploadedAt.slice(0, 10)}` : ""}
                            </div>
                            {d.cached && <div className="text-xs" style={{ color: "var(--green)" }}>{t("Saved offline")}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "6px 10px" }}
                              onClick={() => handleViewDrawing(d)}>
                              {t("View")}
                            </button>
                            {!d.cached && (
                              <button className="btn btn-sm" style={{ fontSize: 11, padding: "6px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                                onClick={() => handleDownloadDrawing(d)}>
                                {t("Save")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {drawingsLoading ? (
                      <div className="empty-state" style={{ padding: "30px 20px" }}>
                        <div className="empty-text">{t("Loading drawings...")}</div>
                      </div>
                    ) : (
                      <>
                        {/* Default drawing sets (placeholder when cloud is empty) */}
                        {(() => {
                          const defaultSets = [
                            { id: "d1", name: t("Architectural Plans"), Icon: Ruler, desc: t("Floor plans, elevations, sections") },
                            { id: "d2", name: t("Structural Framing Plans"), Icon: Building2, desc: t("Framing layouts, details") },
                            { id: "d3", name: t("Reflected Ceiling Plan"), Icon: Ruler, desc: t("Ceiling grid, fixtures") },
                            { id: "d4", name: t("Wall Type Details"), Icon: Search, desc: t("Assembly details, fire ratings") },
                            { id: "d5", name: t("Door & Hardware Schedule"), Icon: ClipboardList, desc: t("Door types, hardware sets") },
                          ];
                          return (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                              {defaultSets.map(d => (
                                <div key={d.id} className="card" style={{ padding: 14, opacity: 0.6 }}>
                                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <d.Icon size={28} style={{ color: "var(--text2)", flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                      <div className="text-sm font-semi">{d.name}</div>
                                      <div className="text-xs text-muted">{d.desc}</div>
                                    </div>
                                    <span className="text-xs text-dim">{t("Not uploaded")}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </>
                )}

                {/* Downloaded files cache info */}
                {Object.keys(downloadedDrawings).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="section-title" style={{ fontSize: 13, marginBottom: 8 }}>{t("Downloaded for Offline")}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(downloadedDrawings).map(([path, info]) => (
                        <div key={path} className="foreman-crew-row" style={{ padding: "8px 12px" }}>
                          <div>
                            <div className="text-sm font-semi">{path.split("/").pop().replace(".pdf", "").replace(/_/g, " ")}</div>
                            <div className="text-xs text-muted">{t("Cached")} {new Date(info.cachedAt).toLocaleDateString()}{info.size ? ` · ${(info.size / 1048576).toFixed(1)} MB` : ""}</div>
                          </div>
                          <button className="cal-nav-btn" style={{ fontSize: 10, color: "var(--red)" }}
                            onClick={() => {
                              const updated = { ...downloadedDrawings };
                              delete updated[path];
                              setDownloadedDrawings(updated);
                              localStorage.setItem("ebc_downloadedDrawings", JSON.stringify(updated));
                              show?.(t("Cache cleared"));
                            }}>
                            {t("Remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, padding: 16, background: "var(--glass-bg)", borderRadius: 10, textAlign: "center" }}>
                  <div className="text-sm text-muted">{t("Drawings are stored in the cloud")}</div>
                  <div className="text-xs text-dim" style={{ marginTop: 4 }}>{t("Download files for offline use on the jobsite. Ask the PM to upload new drawing sets.")}</div>
                </div>
              </div>
            )}

            {/* ═══ DAILY REPORT TAB ═══ */}
            {foremanTab === "reports" && (
              <div className="emp-content">
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="section-title" style={{ fontSize: 16 }}>{t("Daily Reports")}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowReportForm(!showReportForm); setEditingReportId(null); if (!showReportForm) setReportForm({ ...EMPTY_REPORT_FORM, date: new Date().toISOString().slice(0, 10) }); }}>
                    {showReportForm ? t("Cancel") : `+ ${t("New Report")}`}
                  </button>
                </div>

                {/* ── Report Creation / Edit Form ── */}
                {showReportForm && (
                  <div className="card" style={{ padding: 16, marginTop: 12, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10 }}>

                    {/* Quick-fill from yesterday */}
                    {!editingReportId && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <button className="btn btn-sm" style={{ fontSize: 11, background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                          onClick={fillFromYesterday}>
                          {t("Quick-fill from yesterday")}
                        </button>
                      </div>
                    )}

                    {/* Date + Project */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label className="form-label">{t("Date")}</label>
                        <input type="date" className="form-input" value={reportForm.date}
                          onChange={e => setReportForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label">{t("Project")}</label>
                        <input type="text" className="form-input" value={selectedProject?.name || ""} disabled style={{ opacity: 0.7 }} />
                      </div>
                    </div>

                    {/* Weather: Temperature + Conditions */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                      <div>
                        <label className="form-label">{t("Temperature")} (°F)</label>
                        <input type="number" className="form-input" placeholder="e.g. 85" value={reportForm.temperature}
                          onChange={e => setReportForm(f => ({ ...f, temperature: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label">{t("Conditions")}</label>
                        <select className="form-input" value={reportForm.weatherCondition}
                          onChange={e => setReportForm(f => ({ ...f, weatherCondition: e.target.value }))}>
                          {WEATHER_CONDITIONS.map(w => (
                            <option key={w} value={w}>{t(w)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Crew on Site — checkboxes */}
                    <div style={{ marginTop: 12 }}>
                      <label className="form-label">{t("Crew on Site")} ({(reportForm.crewPresent || []).length})</label>
                      <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8, background: "var(--surface1)" }}>
                        {crewForProject.length > 0 ? crewForProject.map(c => (
                          <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox"
                              checked={(reportForm.crewPresent || []).some(cp => (typeof cp === "string" ? cp : cp.id) === c.id)}
                              onChange={e => {
                                setReportForm(f => {
                                  const present = f.crewPresent || [];
                                  if (e.target.checked) {
                                    return { ...f, crewPresent: [...present, { id: c.id, name: c.name }] };
                                  } else {
                                    return { ...f, crewPresent: present.filter(cp => (typeof cp === "string" ? cp : cp.id) !== c.id) };
                                  }
                                });
                              }} />
                            <span>{c.name}</span>
                            {c.todayHours > 0 && <span className="text-xs text-muted">({c.todayHours.toFixed(1)}h)</span>}
                          </label>
                        )) : (
                          <div className="text-xs text-muted" style={{ padding: 8 }}>{t("No crew assigned to this project this week")}</div>
                        )}
                      </div>
                    </div>

                    {/* Work Performed — quick-add tasks + textarea */}
                    <div style={{ marginTop: 12 }}>
                      <label className="form-label">{t("Work Performed Today")} *</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {QUICK_TASKS.map(task => {
                          const isActive = (reportForm.quickTasks || []).includes(task);
                          return (
                            <button key={task} className="btn btn-sm"
                              style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 14,
                                background: isActive ? "var(--accent)" : "var(--surface2)",
                                color: isActive ? "#fff" : "var(--text2)",
                                border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                              }}
                              onClick={() => {
                                setReportForm(f => {
                                  const tasks = f.quickTasks || [];
                                  const newTasks = isActive ? tasks.filter(t2 => t2 !== task) : [...tasks, task];
                                  // Auto-append to textarea
                                  const taskStr = newTasks.join(", ");
                                  const existing = f.workPerformed.replace(/^Tasks: [^\n]*\n?/, "");
                                  return { ...f, quickTasks: newTasks, workPerformed: newTasks.length > 0 ? `Tasks: ${taskStr}\n${existing}` : existing };
                                });
                              }}>
                              {isActive ? "\u2713 " : ""}{t(task)}
                            </button>
                          );
                        })}
                      </div>
                      <textarea className="form-input" rows={4} placeholder={t("Describe work completed...")}
                        value={reportForm.workPerformed}
                        onChange={e => setReportForm(f => ({ ...f, workPerformed: e.target.value }))}
                        style={{ resize: "vertical" }} />
                    </div>

                    {/* Materials Received */}
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label">{t("Materials Received")}</label>
                      <textarea className="form-input" rows={2} placeholder={t("Materials delivered/received today...")}
                        value={reportForm.materialsReceived}
                        onChange={e => setReportForm(f => ({ ...f, materialsReceived: e.target.value }))}
                        style={{ resize: "vertical" }} />
                    </div>

                    {/* Equipment on Site */}
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label">{t("Equipment on Site")}</label>
                      <textarea className="form-input" rows={2} placeholder={t("Lifts, scaffolding, tools...")}
                        value={reportForm.equipmentOnSite}
                        onChange={e => setReportForm(f => ({ ...f, equipmentOnSite: e.target.value }))}
                        style={{ resize: "vertical" }} />
                    </div>

                    {/* Visitors / Inspections */}
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label">{t("Visitors / Inspections")}</label>
                      <textarea className="form-input" rows={2} placeholder={t("GC walkthroughs, inspector visits...")}
                        value={reportForm.visitors}
                        onChange={e => setReportForm(f => ({ ...f, visitors: e.target.value }))}
                        style={{ resize: "vertical" }} />
                    </div>

                    {/* Safety Incidents */}
                    <div style={{ marginTop: 10, padding: 12, background: reportForm.safetyIncident ? "rgba(239,68,68,0.08)" : "var(--surface1)", borderRadius: 8, border: reportForm.safetyIncident ? "1px solid var(--red)" : "1px solid var(--border)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        <span>{t("Safety Incident")}</span>
                        <button
                          style={{
                            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                            background: reportForm.safetyIncident ? "var(--red)" : "var(--border)",
                            position: "relative", transition: "background 0.2s",
                          }}
                          onClick={() => setReportForm(f => ({ ...f, safetyIncident: !f.safetyIncident }))}>
                          <span style={{
                            position: "absolute", top: 2, left: reportForm.safetyIncident ? 22 : 2,
                            width: 20, height: 20, borderRadius: 10, background: "#fff",
                            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }} />
                        </button>
                        <span style={{ fontSize: 12, color: reportForm.safetyIncident ? "var(--red)" : "var(--text3)" }}>
                          {reportForm.safetyIncident ? t("YES") : t("No")}
                        </span>
                      </label>
                      {reportForm.safetyIncident && (
                        <textarea className="form-input" rows={3} placeholder={t("Describe the safety incident...")}
                          value={reportForm.safetyDescription}
                          onChange={e => setReportForm(f => ({ ...f, safetyDescription: e.target.value }))}
                          style={{ resize: "vertical", marginTop: 8 }} />
                      )}
                    </div>

                    {/* Photos */}
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label">{t("Photos")} ({(reportForm.photos || []).length})</label>
                      <input type="file" accept="image/*" multiple
                        style={{ fontSize: 12 }}
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setReportForm(f => ({
                                ...f,
                                photos: [...(f.photos || []), { data: ev.target.result, name: file.name, caption: "" }]
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }} />
                      {(reportForm.photos || []).length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {reportForm.photos.map((p, i) => (
                            <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                              <img src={p.data} alt={p.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                              <button style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, background: "var(--red)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", lineHeight: "18px", textAlign: "center" }}
                                onClick={() => setReportForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}>
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Issues / Delays */}
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label">{t("Issues / Delays")}</label>
                      <textarea className="form-input" rows={2} placeholder={t("Any issues or delays...")}
                        value={reportForm.issues}
                        onChange={e => setReportForm(f => ({ ...f, issues: e.target.value }))}
                        style={{ resize: "vertical" }} />
                    </div>

                    {/* Tomorrow's Plan */}
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label">{t("Tomorrow's Plan")}</label>
                      <textarea className="form-input" rows={2} placeholder={t("Planned work for tomorrow...")}
                        value={reportForm.tomorrowPlan}
                        onChange={e => setReportForm(f => ({ ...f, tomorrowPlan: e.target.value }))}
                        style={{ resize: "vertical" }} />
                    </div>

                    {/* Hours Worked (auto-calculated) */}
                    <div style={{ marginTop: 10, padding: 10, background: "var(--surface1)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="form-label" style={{ margin: 0 }}>{t("Hours Worked (from time entries)")}</span>
                      <span style={{ fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>{todayHoursForProject.toFixed(1)} hrs</span>
                    </div>

                    {/* Submit / Update */}
                    <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }}
                      onClick={() => {
                        if (!reportForm.workPerformed.trim()) { show(t("Describe work performed"), "warn"); return; }
                        const report = {
                          id: editingReportId || ("dr-" + Date.now()),
                          projectId: selectedProjectId,
                          projectName: selectedProject?.name || "",
                          foremanId: activeForeman?.id,
                          foremanName: activeForeman?.name,
                          date: reportForm.date,
                          temperature: reportForm.temperature,
                          weatherCondition: reportForm.weatherCondition,
                          weather: reportForm.weatherCondition,
                          crewPresent: reportForm.crewPresent || [],
                          crewCount: (reportForm.crewPresent || []).length,
                          quickTasks: reportForm.quickTasks || [],
                          workPerformed: reportForm.workPerformed,
                          materialsReceived: reportForm.materialsReceived,
                          equipmentOnSite: reportForm.equipmentOnSite,
                          visitors: reportForm.visitors,
                          safetyIncident: reportForm.safetyIncident,
                          safetyDescription: reportForm.safetyDescription,
                          photos: reportForm.photos || [],
                          issues: reportForm.issues,
                          tomorrowPlan: reportForm.tomorrowPlan,
                          hoursWorked: todayHoursForProject.toFixed(1),
                          createdAt: editingReportId
                            ? (dailyReports || []).find(r => r.id === editingReportId)?.createdAt || new Date().toISOString()
                            : new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        if (editingReportId) {
                          setDailyReports(prev => prev.map(r => r.id === editingReportId ? report : r));
                        } else {
                          setDailyReports(prev => [...prev, report]);
                        }
                        setReportForm({ ...EMPTY_REPORT_FORM, date: new Date().toISOString().slice(0, 10) });
                        setShowReportForm(false);
                        setEditingReportId(null);
                        show(editingReportId ? t("Report updated") : t("Daily report submitted"));
                      }}>
                      {editingReportId ? t("Update Report") : t("Submit Report")}
                    </button>
                  </div>
                )}

                {/* ── Report List ── */}
                <div style={{ marginTop: 16 }}>
                  {(dailyReports || [])
                    .filter(r => myProjectIds.has(r.projectId))
                    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
                    .map(r => {
                      const isExpanded = expandedReportId === r.id;
                      const weatherIcon = { Clear: "Clear", Cloudy: "Cloudy", Rain: "Rain", Storm: "Storm", Wind: "Windy", Snow: "Snow", Hot: "Hot", Cold: "Cold" }[r.weatherCondition || r.weather] || (r.weatherCondition || r.weather || "");
                      const crewN = (r.crewPresent || []).length || r.crewCount || 0;
                      return (
                        <div key={r.id} className="card" style={{ padding: "12px 14px", marginBottom: 8, cursor: "pointer", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10 }}
                          onClick={() => setExpandedReportId(isExpanded ? null : r.id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div className="text-sm font-semi">{r.date} {weatherIcon} {r.temperature ? `${r.temperature}°F` : ""}</div>
                              <div className="text-xs text-muted">{r.projectName || t("Project")} · {crewN} {t("crew")} · {r.foremanName || ""}</div>
                              {r.hoursWorked && <div className="text-xs text-muted">{r.hoursWorked} hrs logged</div>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {r.safetyIncident && <span style={{ fontSize: 10, background: "var(--red)", color: "#fff", padding: "1px 6px", borderRadius: 8 }}>Safety</span>}
                              {r.photos && r.photos.length > 0 && <span className="text-xs text-muted">{r.photos.length} pic</span>}
                              <span style={{ fontSize: 12, color: "var(--text3)" }}>{isExpanded ? "\u25BE" : "\u25B8"}</span>
                            </div>
                          </div>
                          {!isExpanded && (
                            <div className="text-xs text-muted" style={{ marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {(r.quickTasks || []).length > 0 && <span style={{ color: "var(--accent)", marginRight: 4 }}>{r.quickTasks.join(", ")}</span>}
                              {r.workPerformed?.replace(/^Tasks: [^\n]*\n?/, "").slice(0, 80)}
                            </div>
                          )}
                          {isExpanded && (
                            <div style={{ marginTop: 10, borderTop: "1px solid var(--glass-border)", paddingTop: 10 }}
                              onClick={e => e.stopPropagation()}>

                              {/* Crew Present */}
                              {(r.crewPresent || []).length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: 2 }}>{t("Crew on Site")}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {r.crewPresent.map((c, i) => (
                                      <span key={i} className="badge badge-blue" style={{ fontSize: 10 }}>{typeof c === "string" ? c : c.name}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Quick Tasks */}
                              {(r.quickTasks || []).length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: 2 }}>{t("Tasks")}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {r.quickTasks.map((tk, i) => (
                                      <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--accent)", color: "#fff" }}>{tk}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div style={{ marginBottom: 8 }}>
                                <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: 2 }}>{t("Work Performed")}</div>
                                <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.workPerformed}</div>
                              </div>

                              {r.materialsReceived && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: 2 }}>{t("Materials Received")}</div>
                                  <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.materialsReceived}</div>
                                </div>
                              )}
                              {r.equipmentOnSite && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: 2 }}>{t("Equipment on Site")}</div>
                                  <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.equipmentOnSite}</div>
                                </div>
                              )}
                              {r.visitors && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: 2 }}>{t("Visitors / Inspections")}</div>
                                  <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.visitors}</div>
                                </div>
                              )}

                              {/* Safety */}
                              <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: r.safetyIncident ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)" }}>
                                <div className="text-xs font-semi" style={{ color: r.safetyIncident ? "var(--red)" : "var(--green)", marginBottom: 2 }}>
                                  {r.safetyIncident ? t("SAFETY INCIDENT") : t("No Safety Incidents")}
                                </div>
                                {r.safetyIncident && r.safetyDescription && (
                                  <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.safetyDescription}</div>
                                )}
                              </div>

                              {r.issues && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--amber)", marginBottom: 2 }}>{t("Issues / Delays")}</div>
                                  <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.issues}</div>
                                </div>
                              )}
                              {r.tomorrowPlan && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: 2 }}>{t("Tomorrow's Plan")}</div>
                                  <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{r.tomorrowPlan}</div>
                                </div>
                              )}

                              {/* Photos */}
                              {r.photos && r.photos.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: 4 }}>{t("Photos")} ({r.photos.length})</div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {r.photos.map((p, i) => (
                                      <img key={i} src={p.data || p} alt={`Photo ${i + 1}`}
                                        style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }}
                                        onClick={() => window.open(p.data || p, "_blank")} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                                {t("Submitted")}: {new Date(r.createdAt).toLocaleString()}
                                {r.updatedAt && r.updatedAt !== r.createdAt && ` · ${t("Updated")}: ${new Date(r.updatedAt).toLocaleString()}`}
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button className="btn btn-sm" style={{ fontSize: 11 }}
                                  onClick={() => {
                                    setEditingReportId(r.id);
                                    setReportForm({
                                      date: r.date || new Date().toISOString().slice(0, 10),
                                      temperature: r.temperature || "",
                                      weatherCondition: r.weatherCondition || r.weather || "Clear",
                                      crewPresent: r.crewPresent || [],
                                      quickTasks: r.quickTasks || [],
                                      workPerformed: r.workPerformed || "",
                                      materialsReceived: r.materialsReceived || "",
                                      equipmentOnSite: r.equipmentOnSite || "",
                                      visitors: r.visitors || "",
                                      safetyIncident: !!r.safetyIncident,
                                      safetyDescription: r.safetyDescription || "",
                                      photos: r.photos || [],
                                      issues: r.issues || "",
                                      tomorrowPlan: r.tomorrowPlan || "",
                                    });
                                    setShowReportForm(true);
                                    setExpandedReportId(null);
                                  }}>
                                  {t("Edit")}
                                </button>
                                <button className="btn btn-sm" style={{ fontSize: 11 }}
                                  onClick={async () => {
                                    try {
                                      const { generateDailyReportPdf } = await import("../utils/dailyReportPdf.js");
                                      generateDailyReportPdf(r, selectedProject);
                                      show(t("PDF downloaded"));
                                    } catch (err) {
                                      console.error("PDF generation error:", err);
                                      show(t("Failed to generate PDF"), "err");
                                    }
                                  }}>
                                  {t("Export PDF")}
                                </button>
                                <button className="btn btn-sm" style={{ fontSize: 11, color: "var(--red)" }}
                                  onClick={() => {
                                    if (confirm(t("Delete this daily report?"))) {
                                      setDailyReports(prev => prev.filter(rp => rp.id !== r.id));
                                      setExpandedReportId(null);
                                      show(t("Report deleted"));
                                    }
                                  }}>
                                  {t("Delete")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {(dailyReports || []).filter(r => myProjectIds.has(r.projectId)).length === 0 && !showReportForm && (
                    <div className="empty-state" style={{ padding: "30px 20px" }}>
                      <div className="empty-icon"><ClipboardList size={32} /></div>
                      <div className="empty-text">{t("No daily reports yet")}</div>
                      <div className="text-xs text-muted">{t("Tap + New Report to get started")}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ DOCUMENTS TAB ═══ */}
            {foremanTab === "documents" && (
              <div className="emp-content">
                <div className="section-header">
                  <div className="section-title" style={{ fontSize: 16 }}>{t("Documents")}</div>
                </div>

                {/* Submittals */}
                <div className="project-section">
                  <div className="project-section-header" onClick={() => toggleSection("submittals")}>
                    <span>{t("Submittals")} ({projectSubmittals.length})</span>
                    <span>{openSections.submittals ? "▾" : "▸"}</span>
                  </div>
                  {openSections.submittals && (
                    projectSubmittals.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "8px 0" }}>{t("No submittals")}</div>
                      : projectSubmittals.map(s => (
                        <div key={s.id} className="card" style={{ padding: 10, marginTop: 6 }}>
                          <div className="flex-between">
                            <span className="text-sm font-semi">{s.name || s.title}</span>
                            <span className={`badge ${s.status === "approved" ? "badge-green" : "badge-amber"}`}>{s.status}</span>
                          </div>
                          {s.description && <div className="text-xs text-muted mt-4">{s.description}</div>}
                        </div>
                      ))
                  )}
                </div>

                {/* Change Orders */}
                <div className="project-section">
                  <div className="project-section-header" onClick={() => toggleSection("cos")}>
                    <span>{t("Change Orders")} ({projectCOs.length})</span>
                    <span>{openSections.cos ? "▾" : "▸"}</span>
                  </div>
                  {openSections.cos && (
                    projectCOs.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "8px 0" }}>{t("No change orders")}</div>
                      : projectCOs.map(c => (
                        <div key={c.id} className="card" style={{ padding: 10, marginTop: 6 }}>
                          <div className="flex-between">
                            <span className="text-sm font-semi">{c.title || c.description}</span>
                            <span className="text-sm font-mono" style={{ color: "var(--amber)" }}>{fmt(c.amount)}</span>
                          </div>
                          <div className="text-xs text-muted mt-4">{c.status}</div>
                        </div>
                      ))
                  )}
                </div>

                {/* RFIs */}
                <div className="project-section">
                  <div className="project-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }} onClick={() => toggleSection("rfis")}>
                      <span>{t("RFIs")} ({projectRFIs.length})</span>
                      <span>{openSections.rfis ? "▾" : "▸"}</span>
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, background: "var(--accent)", color: "#fff", padding: "6px 12px", borderRadius: 7 }}
                      onClick={() => { setShowRfiModal(true); setRfiFormData({ subject: "", description: "", drawingRef: "" }); }}
                    >
                      <FileQuestion size={13} />
                      {t("Submit RFI")}
                    </button>
                  </div>
                  {openSections.rfis && (
                    projectRFIs.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "8px 0" }}>{t("No RFIs")}</div>
                      : projectRFIs.map(r => (
                        <div key={r.id} className="card" style={{ padding: 10, marginTop: 6 }}>
                          <div className="flex-between">
                            <span className="text-sm font-semi">{r.subject || r.title || r.question}</span>
                            <span className={`badge ${r.status === "answered" ? "badge-green" : r.status === "submitted" ? "badge-blue" : "badge-amber"}`}>{r.status}</span>
                          </div>
                          {r.drawingRef && <div className="text-xs text-muted mt-4">Ref: {r.drawingRef}</div>}
                          {r.response && <div className="text-xs text-muted mt-4">{t("Response")}: {r.response}</div>}
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ SUBMIT RFI MODAL ═══ */}
      {showRfiModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRfiModal(false); }}>
          <div className="modal-content" style={{ maxWidth: 480, width: "100%", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileQuestion size={20} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 17, fontWeight: 700 }}>{t("Submit RFI")}</span>
              </div>
              <button onClick={() => setShowRfiModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
              {selectedProject?.name} · {t("Assigned to PM")}: {selectedProject?.pm || "PM"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text2)", display: "block", marginBottom: 6 }}>
                  {t("Subject")} *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t("e.g., Clarification needed on wall type at Grid A")}
                  value={rfiFormData.subject}
                  onChange={e => setRfiFormData(f => ({ ...f, subject: e.target.value }))}
                  style={{ width: "100%", fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text2)", display: "block", marginBottom: 6 }}>
                  {t("Description")} *
                </label>
                <textarea
                  className="form-input"
                  placeholder={t("Describe the question or issue in detail...")}
                  value={rfiFormData.description}
                  onChange={e => setRfiFormData(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  style={{ width: "100%", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text2)", display: "block", marginBottom: 6 }}>
                  {t("Drawing / Spec Reference")} ({t("optional")})
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t("e.g., A-201, Spec 09 21 16")}
                  value={rfiFormData.drawingRef}
                  onChange={e => setRfiFormData(f => ({ ...f, drawingRef: e.target.value }))}
                  style={{ width: "100%", fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn" style={{ flex: 1, fontSize: 14 }} onClick={() => setShowRfiModal(false)}>
                {t("Cancel")}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                disabled={!rfiFormData.subject.trim() || !rfiFormData.description.trim()}
                onClick={() => {
                  if (!rfiFormData.subject.trim() || !rfiFormData.description.trim()) return;
                  const proj = selectedProject;
                  const existingNums = (rfis || []).filter(r => String(r.projectId) === String(selectedProjectId)).length;
                  const rfiNum = `RFI-${String(existingNums + 1).padStart(3, "0")}`;
                  const newRfi = {
                    id: crypto.randomUUID(),
                    projectId: selectedProjectId,
                    projectName: proj?.name || "",
                    number: rfiNum,
                    subject: rfiFormData.subject.trim(),
                    question: rfiFormData.description.trim(),
                    drawingRef: rfiFormData.drawingRef.trim(),
                    specRef: rfiFormData.drawingRef.trim(),
                    status: "submitted",
                    priority: "normal",
                    assigned: proj?.pm || "PM",
                    submittedBy: activeForeman.name,
                    dateSubmitted: new Date().toISOString().slice(0, 10),
                    submitted: new Date().toISOString().slice(0, 10),
                    createdAt: new Date().toISOString(),
                  };
                  if (setRfis) setRfis(prev => [...prev, newRfi]);
                  setShowRfiModal(false);
                  setRfiFormData({ subject: "", description: "", drawingRef: "" });
                  show(`${t("RFI submitted")} · ${rfiNum}`, "ok");
                  setOpenSections(prev => ({ ...prev, rfis: true }));
                }}
              >
                <Send size={15} />
                {t("Submit RFI")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
