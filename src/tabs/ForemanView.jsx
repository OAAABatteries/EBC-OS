import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { UserPlus, X, Search, CheckSquare, Square, Send, FileQuestion, ChevronDown, ChevronUp, MapPin, Clock, StopCircle, Package, Shield, AlertTriangle, CheckCircle, FileText, Ruler, Building2, ClipboardList, HardHat, MessageSquare, Pin, PinOff, LayoutDashboard, Settings } from "lucide-react";
import { FeatureGuide } from "../components/FeatureGuide";
import { ReportProblemModal } from "../components/ReportProblemModal";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import { PhaseTracker, getDefaultPhases } from "../components/PhaseTracker";
import { listFiles, getFileUrl, downloadFile, getDrawingsByProject } from "../lib/supabase";
import {
  PortalHeader, PortalTabBar, FieldButton, FieldInput, FieldSelect,
  FieldCard, StatusBadge, EmptyState, AsyncState, LoadingSpinner,
  Skeleton, FieldSignaturePad, MaterialRequestCard
} from "../components/field";

const PdfViewer = lazy(() => import("../components/PdfViewer").then(m => ({ default: m.PdfViewer })));
import {
  PPE_ITEMS, RISK_LIKELIHOOD, RISK_SEVERITY, riskColor,
  HAZARD_CATEGORIES, CONTROL_HIERARCHY, PERMIT_TYPES,
  HAZARD_LIBRARY, TRADE_LABELS, JSA_TEMPLATES, WEATHER_HAZARD_MAP,
  TRADE_CARDS, WEATHER_QUICK,
} from "../data/jsaConstants";

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
    employees, projects, setProjects, teamSchedule, timeEntries, setTimeEntries,
    materialRequests, setMaterialRequests,
    changeOrders, rfis, setRfis, submittals,
    calendarEvents,
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

  const [foremanTab, setForemanTab] = useState("dashboard");
  const [showReportProblem, setShowReportProblem] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [clockEntry, setClockEntry] = useState(null); // { clockIn, lat, lng, projectId }
  const [gpsStatus, setGpsStatus] = useState("");
  const [clockProjectSearch, setClockProjectSearch] = useState("");
  const [teamClocks, setCrewClocks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_teamClocks") || "{}"); } catch { return {}; }
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
  const [rcStep, setRcStep] = useState("pick"); // pick | team | sign | supervisor | done
  const [rcJsaId, setRcJsaId] = useState(null);
  const [rcWeather, setRcWeather] = useState("clear");
  const [rcSignIdx, setRcSignIdx] = useState(0);
  const [rcQueue, setRcQueue] = useState([]); // [{employeeId, name, signed: false}]
  const [rcSelected, setRcSelected] = useState({}); // {employeeId: true/false}
  const [rcAddingCrew, setRcAddingCrew] = useState(false);
  const sigRef = useRef(null);

  // ── Crew tab: add member ──
  const [showCrewAdd, setShowCrewAdd] = useState(false);
  const [teamAddSearch, setCrewAddSearch] = useState("");
  const [extraCrewIds, setExtraCrewIds] = useState([]);
  const teamAddRef = useRef(null);

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
    teamPresent: [],
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
  const [teamSearch, setCrewSearch] = useState("");
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
      teamPresent: yesterday.teamPresent || [],
      equipmentOnSite: yesterday.equipmentOnSite || "",
    }));
    show(t("Copied team & equipment from last report"));
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

  // Phase 2C: photo capture state
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoStream, setPhotoStream] = useState(null);
  const photoVideoRef = useRef(null);
  const photoCanvasRef = useRef(null);

  const handleClockIn = async () => {
    // Phase 2C: prompt for photo before clock-in
    setShowPhotoCapture(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      setPhotoStream(stream);
    } catch {
      // Camera failed — allow clock-in with flag
      completeClockIn(null, "camera_failed");
    }
  };

  const captureAndClockIn = () => {
    const video = photoVideoRef.current;
    const canvas = photoCanvasRef.current;
    if (!video || !canvas) { completeClockIn(null, "capture_failed"); return; }
    canvas.width = 480; canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 480, 480);
    canvas.toBlob(async (blob) => {
      // Stop camera
      if (photoStream) photoStream.getTracks().forEach(t => t.stop());
      setPhotoStream(null);
      setShowPhotoCapture(false);
      if (!blob) { completeClockIn(null, "capture_failed"); return; }
      // Upload to Supabase Storage
      const fileName = `clockin_${activeForeman.id}_${Date.now()}.jpg`;
      try {
        const { uploadFile, getSignedFileUrl } = await import("../lib/supabase");
        await uploadFile(`clock-in-photos/${fileName}`, blob, "clock-in-photos");
        // Use signed URL for private bucket (1 hour expiry — photo is evidence, not display)
        const url = await getSignedFileUrl(`clock-in-photos/${fileName}`, "clock-in-photos", 86400) || `clock-in-photos/${fileName}`;
        completeClockIn(url, "ok");
      } catch {
        // Storage failed — store as data URL fallback
        const reader = new FileReader();
        reader.onload = () => completeClockIn(reader.result?.slice(0, 500) + "...[truncated]", "upload_failed");
        reader.readAsDataURL(blob);
      }
    }, "image/jpeg", 0.7);
  };

  const skipPhoto = (reason) => {
    if (photoStream) photoStream.getTracks().forEach(t => t.stop());
    setPhotoStream(null);
    setShowPhotoCapture(false);
    completeClockIn(null, reason || "skipped");
  };

  const completeClockIn = async (photoUrl, captureStatus) => {
    const loc = await getLocation();
    const entry = {
      clockIn: new Date().toISOString(),
      lat: loc?.lat || null,
      lng: loc?.lng || null,
      projectId: selectedProjectId,
      photoUrl: photoUrl || null,
      captureStatus: captureStatus || "ok",
    };
    setClockEntry(entry);
    localStorage.setItem(CLOCK_KEY, JSON.stringify(entry));
    show?.(`${t("Clocked in")} ${captureStatus === "ok" ? "📸" : "⚠️"} ✓`);
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
      // Phase 2C: photo verification
      photoUrl: clockEntry.photoUrl || null,
      captureStatus: clockEntry.captureStatus || null,
    };
    if (setTimeEntries) {
      setTimeEntries(prev => [...prev, newEntry]);
    }
    setClockEntry(null);
    localStorage.removeItem(CLOCK_KEY);
    show?.(`${t("Clocked out")} · ${totalHours}h ✓`);
  };

  // ── team clock-in/out ──
  const persistTeamClocks = (updated) => {
    setCrewClocks(updated);
    localStorage.setItem("ebc_teamClocks", JSON.stringify(updated));
  };

  const handleCrewClockIn = async (empId) => {
    const loc = await getLocation();
    const entry = { clockIn: new Date().toISOString(), lat: loc?.lat || null, lng: loc?.lng || null, projectId: selectedProjectId };
    persistTeamClocks({ ...teamClocks, [empId]: entry });
    const emp = employees.find(e => e.id === empId);
    show?.(`${emp?.name || "Crew"} ${t("clocked in")} ✓`);
  };

  const handleCrewClockOut = async (empId) => {
    const entry = teamClocks[empId];
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
    const updated = { ...teamClocks };
    delete updated[empId];
    persistTeamClocks(updated);
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
      // ── Primary: load from project_drawings table (has revision metadata) ──
      const dbDrawings = await getDrawingsByProject(selectedProjectId);
      if (dbDrawings && dbDrawings.length > 0) {
        const drawings = dbDrawings.map(d => {
          const path = d.storagePath || `drawings/project-${selectedProjectId}/${d.fileName}`;
          const cachedMeta = downloadedDrawings[path];
          const cachedAt = cachedMeta?.cachedAt ? new Date(cachedMeta.cachedAt) : null;
          const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
          const isStale = cachedAt && updatedAt && updatedAt > cachedAt;
          return {
            id: d.id,
            name: (d.fileName || "").replace(".pdf", "").replace(/_/g, " "),
            fileName: d.fileName,
            path,
            size: d.fileSize || 0,
            uploadedAt: d.createdAt || "",
            updatedAt: d.updatedAt || "",
            cached: !!cachedMeta,
            isStale,
            // ── Revision metadata (P0 field safety) ──
            revision: d.revision || 1,
            revisionLabel: d.revisionLabel || "",
            isCurrent: d.isCurrent !== false,
            discipline: d.discipline || "general",
            notes: d.notes || "",
          };
        });
        setCloudDrawings(drawings);
        setDrawingsLoading(false);
        return;
      }
      // ── Fallback: raw storage listing (no metadata table rows yet) ──
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
        // No revision metadata available from storage listing
        revision: null,
        revisionLabel: "",
        isCurrent: true,
        discipline: "general",
        isStale: false,
        notes: "",
      }));
      setCloudDrawings(drawings);
    } catch {
      setCloudDrawings([]);
    }
    setDrawingsLoading(false);
  }, [selectedProjectId, downloadedDrawings]);

  useEffect(() => {
    if (foremanTab === "drawings") loadCloudDrawings();
  }, [foremanTab, selectedProjectId]);

  const handleViewDrawing = async (drawing) => {
    try {
      // Check cache first — but skip if stale (newer revision exists)
      const { useDrawingCache } = await import("../hooks/useDrawingCache");
      const { getCachedDrawing, cacheDrawing, removeCachedDrawing } = useDrawingCache();
      if (drawing.isStale) {
        // Stale cache: remove old version, force re-download
        await removeCachedDrawing(drawing.path);
        show?.(t("Downloading latest revision..."));
      }
      const cached = !drawing.isStale ? await getCachedDrawing(drawing.path) : null;
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
    const mySchedule = teamSchedule.filter(
      s => String(s.employeeId) === fId && s.weekStart === weekStart
    );
    const projectIds = [...new Set(mySchedule.map(s => String(s.projectId)))];
    const scheduled = projects.filter(p => projectIds.includes(String(p.id)));
    // Also include projects directly assigned to this foreman by PM
    const assigned = projects.filter(p => p.assignedForeman != null && String(p.assignedForeman) === fId);
    // Combine, deduplicate by id
    const combined = [...new Map([...scheduled, ...assigned].map(p => [String(p.id), p])).values()];
    // Fallback: if no team schedule entries and no direct assignment, show all active projects
    if (combined.length === 0) {
      return projects.filter(p => p.status === "in-progress" || p.status === "active");
    }
    return combined;
  }, [activeForeman, teamSchedule, projects, weekStart]);

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

  // ── computed: team for selected project ──
  const teamForProject = useMemo(() => {
    if (!selectedProjectId) return [];
    const pId = String(selectedProjectId);
    const entries = teamSchedule.filter(
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
  }, [selectedProjectId, teamSchedule, employees, timeEntries, weekStart]);

  // ── computed: hours used (from time entries) ──
  const hoursUsed = useMemo(() => {
    if (!selectedProjectId) return 0;
    return teamForProject.reduce((sum, c) => sum + c.weekHours, 0);
  }, [teamForProject, selectedProjectId]);

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

  // ── computed: RFIs needing field attention (open or recently answered) ──
  const rfiAlerts = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    return projectRFIs.filter(r => {
      if (r.status === "open" || r.status === "submitted") return true;
      // Show recently answered RFIs so foreman sees the resolution
      if ((r.status === "answered" || r.status === "closed") && r.responseDate && r.responseDate >= sevenDaysAgo) return true;
      if ((r.status === "answered" || r.status === "closed") && r.response_date && r.response_date >= sevenDaysAgo) return true;
      return false;
    });
  }, [projectRFIs]);

  // ── computed: 14-day look-ahead (calendar events for this project) ──
  const lookAheadEvents = useMemo(() => {
    if (!selectedProjectId) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    const endStr = endDate.toISOString().slice(0, 10);
    return (calendarEvents || [])
      .filter(e => {
        const matchProject = String(e.projectId || e.project_id) === String(selectedProjectId) || !e.projectId;
        const inRange = e.date >= todayStr && e.date <= endStr;
        return matchProject && inRange;
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [calendarEvents, selectedProjectId]);

  // weekly burn rate in hours: sum of scheduled hours per team member this week
  const weeklyBurnHours = useMemo(() => {
    return teamForProject.reduce((sum, c) => {
      const daysThisWeek = DAY_KEYS.filter(d => c.days?.[d]).length;
      const hrs = c.scheduleHours || {};
      const startH = parseFloat(hrs.start || hrs.startDate || "0");
      const endH = parseFloat(hrs.end || hrs.endDate || "0");
      const dailyHours = (startH && endH && endH > startH)
        ? (endH - startH)
        : 8;
      return sum + (daysThisWeek * dailyHours);
    }, 0);
  }, [teamForProject]);

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
  const [matForm, setMatForm] = useState({ material: "", qty: "", unit: "EA", notes: "", urgency: "normal", neededBy: "" });
  const handleMatSubmit = () => {
    if (!selectedProjectId || !matForm.material || !matForm.qty) return;
    const proj = projects.find(p => String(p.id) === String(selectedProjectId));
    const now = new Date().toISOString();
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
      urgency: matForm.urgency || "normal",
      neededBy: matForm.neededBy || null,
      status: "requested",
      requestedAt: now,
      approvedBy: null, approvedAt: null, rejectedReason: null,
      fulfillmentType: null, driverId: null, deliveredAt: null,
      confirmedBy: null, confirmedAt: null,
      auditTrail: [{ action: "submitted", actor: activeForeman.name, actorId: activeForeman.id, timestamp: now }],
    };
    setMaterialRequests(prev => [newReq, ...prev]);
    setMatForm({ material: "", qty: "", unit: "EA", notes: "", urgency: "normal", neededBy: "" });
    show(t("Request Material"), "ok");
  };
  // Phase 2A: foreman confirms receipt
  const handleForemanConfirm = (reqId, exceptions) => {
    const now = new Date().toISOString();
    setMaterialRequests(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const trail = [...(r.auditTrail || []), { action: "confirmed", actor: activeForeman?.name, actorId: activeForeman?.id, timestamp: now, notes: exceptions || "" }];
      return { ...r, status: "confirmed", confirmedBy: activeForeman?.id, confirmedAt: now, auditTrail: trail };
    }));
    show(t("Receipt confirmed") + " ✓", "ok");
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
          <div className="employee-logo"><img src="/ebc-eagle-white.png" alt="EBC" className="portal-header-logo" onError={(e) => e.target.style.display = "none"} /></div>
          <span className="text-sm text-muted">{t("Foreman Portal")}</span>
        </header>
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted frm-section-sub">{t("Foreman Portal")}</div>
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

  // ── Site Logistics state ──
  const [siteLogistics, setSiteLogistics] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_siteLogistics") || "{}"); } catch { return {}; }
  });
  const saveSiteLogistics = (log) => {
    localStorage.setItem("ebc_siteLogistics", JSON.stringify(log));
    setSiteLogistics(log);
  };

  // ── Project Notes state ──
  const [projectNotes, setProjectNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_projectNotes") || "[]"); } catch { return []; }
  });
  const [foremanNoteText, setForemanNoteText] = useState("");
  const [foremanNotesFilter, setForemanNotesFilter] = useState("all");
  const saveProjectNotes = (notes) => {
    localStorage.setItem("ebc_projectNotes", JSON.stringify(notes));
    setProjectNotes(notes);
  };

  const today = new Date().toISOString().slice(0, 10);
  const projLogKey = `${selectedProjectId}_${today}`;
  const todayLog = siteLogistics[projLogKey] || {};
  const LOGISTICS_ITEMS = [
    { id: "dumpster", label: t("Dumpster doors accessible and able to open"), critical: true, icon: "🗑️" },
    { id: "porta_potty", label: t("Porta-potty on site and serviced"), critical: false, icon: "🚽" },
    { id: "staging_clear", label: t("Material staging area clear and organized"), critical: false, icon: "📦" },
    { id: "safety_signage", label: t("Safety signage posted at all entry points"), critical: false, icon: "⚠️" },
    { id: "fire_exit", label: t("Fire exits unobstructed"), critical: true, icon: "🚪" },
    { id: "first_aid", label: t("First aid kit accessible and stocked"), critical: false, icon: "🩺" },
    { id: "temp_power", label: t("Temporary power / lighting operational"), critical: false, icon: "💡" },
    { id: "deliveries_clear", label: t("Delivery access path clear"), critical: false, icon: "🚚" },
  ];
  const logCheckedCount = LOGISTICS_ITEMS.filter(i => todayLog[i.id]).length;
  const criticalUnchecked = LOGISTICS_ITEMS.filter(i => i.critical && !todayLog[i.id]);

  const projNotesCount = (projectNotes || []).filter(n => String(n.projectId) === String(selectedProjectId)).length;

  const projectJsas = useMemo(() => (jsas || []).filter(j => String(j.projectId) === String(selectedProjectId)), [jsas, selectedProjectId]);

  const FOREMAN_TABS = [
    { id: "dashboard", label: t("Dashboard"), icon: LayoutDashboard, badge: false },
    { id: "materials", label: t("Materials"), icon: Package, badge: (projectMatRequests || []).filter(r => r.status === "pending").length > 0 },
    { id: "jsa",       label: t("JSA"),       icon: Shield, badge: (projectJsas || []).length === 0 },
    { id: "reports",   label: t("Reports"),   icon: FileText, badge: false },
    { id: "settings",  label: t("Settings"),  icon: Settings, badge: false },
    { id: "clock",     label: t("Clock"),     icon: Clock, badge: false },
    { id: "team",      label: t("Team"),      icon: HardHat, badge: false },
    { id: "hours",     label: t("Hours"),     icon: Ruler, badge: false },
    { id: "drawings",  label: t("Drawings"),  icon: Building2, badge: false },
    { id: "lookahead", label: t("Lookahead"), icon: ClipboardList, badge: false },
    { id: "documents", label: t("Documents"), icon: FileText, badge: false },
    { id: "site",      label: t("Site"),      icon: MapPin, badge: false },
    { id: "notes",     label: t("Notes"),     icon: MessageSquare, badge: false },
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
      <PortalHeader
        variant="foreman"
        title={selectedProject?.name || t("Foreman Portal")}
        userName={activeForeman.name}
        languageToggle={
          <div className="lang-toggle">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button>
          </div>
        }
        logoutAction={<FieldButton variant="ghost" onClick={handleLogout} t={t}>{t("Logout")}</FieldButton>}
        projectSelector={myProjects.length > 1 ? (
          <select className="foreman-project-select" value={selectedProjectId || ""} onChange={e => {
            const val = e.target.value;
            setSelectedProjectId(isNaN(val) ? val : Number(val));
          }}>
            {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : null}
        t={t}
      />

      <div className="employee-body">

        {myProjects.length === 0 && foremanTab !== "settings" && (
          <EmptyState
            icon={ClipboardList}
            heading={t("No Active Project")}
            message={t("Select a project to view dashboard data.")}
            t={t}
          />
        )}

        <div className="frm-content-pad">

        {/* ═══ SETTINGS TAB ═══ */}
        {foremanTab === "settings" && (
          <div className="settings-wrap">
            {/* Back button */}
            <FieldButton variant="ghost" onClick={() => setForemanTab("dashboard")} t={t}>&#9664; {t("Back")}</FieldButton>
            {/* Profile */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeForeman.name)}</div>
              <div className="frm-settings-section">
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
              <div className="settings-row">
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
                <select className="settings-select"
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
                <div className="frm-clock-status">
                  {/* Big clock display */}
                  <div className="frm-clock-time">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-muted">
                    {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  {gpsStatus && <div className="text-xs text-muted">{gpsStatus}</div>}

                  {/* ── Project Lookup for Clock-In ── */}
                  {!isClockedIn && (
                    <div className="frm-clock-project-search">
                      <label className="form-label">{t("Select Project")}</label>
                      <FieldInput
                        type="text"
                        placeholder={t("Search project name or address...")}
                        value={clockProjectSearch}
                        onChange={(e) => setClockProjectSearch(e.target.value)}
                        t={t}
                      />
                      <div className="frm-clock-project-list">
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
                              className={`frm-clock-project-item${selectedProjectId === p.id ? " selected" : ""}`}
                              onClick={() => { setSelectedProjectId(p.id); setClockProjectSearch(""); }}
                            >
                              <div>
                                <div className="text-sm font-semi">{p.name}</div>
                                <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                              </div>
                              {selectedProjectId === p.id && <span className="frm-amber">✓</span>}
                            </div>
                          ))}
                      </div>
                      {selectedProject && (
                        <div className="text-sm font-semi frm-amber frm-flex-gap">
                          <MapPin size={14} />{selectedProject.name}
                        </div>
                      )}
                    </div>
                  )}

                  {!isClockedIn ? (
                    <FieldButton
                      variant="primary"
                      onClick={handleClockIn}
                      disabled={!selectedProjectId}
                      t={t}
                    >
                      <Clock size={40} />
                      {t("CLOCK IN")}
                    </FieldButton>
                  ) : (
                    <>
                      <div className="frm-section-sub">
                        <div className="text-xs text-muted">{t("Clocked in at")}</div>
                        <div className="frm-hours-value">
                          {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted">
                          {(() => {
                            const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                            const hrs = Math.floor(elapsed / 3600000);
                            const mins = Math.floor((elapsed % 3600000) / 60000);
                            return `${hrs}h ${mins}m ${t("elapsed")}`;
                          })()}
                        </div>
                      </div>
                      <FieldButton
                        variant="danger"
                        onClick={handleClockOut}
                        t={t}
                      >
                        <StopCircle size={40} />
                        {t("CLOCK OUT")}
                      </FieldButton>
                    </>
                  )}

                  {/* Today's entries */}
                  {myTodayEntries.length > 0 && (
                    <div className="frm-hours-grid">
                      <div className="frm-section-title">{t("Today's Time Log")}</div>
                      {myTodayEntries.map((te, i) => (
                        <div key={i} className="foreman-team-row">
                          <div>
                            <div className="text-sm font-semi">
                              {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-muted">
                              {projects.find(p => p.id === te.projectId)?.name || t("General")}
                            </div>
                          </div>
                          <div className="frm-hours-value frm-amber">{te.totalHours}h</div>
                        </div>
                      ))}
                      <div className="text-sm font-semi frm-amber">
                        {t("Total")}: {myTodayHours.toFixed(1)}h
                      </div>
                    </div>
                  )}

                  {/* Report Problem button */}
                  <FieldButton
                    variant="ghost"
                    onClick={() => setShowReportProblem(true)}
                    t={t}
                  >
                    <AlertTriangle size={22} />
                    {t("Report a Problem")}
                  </FieldButton>
                </div>
              </div>
            )}

            {/* ═══ DASHBOARD TAB — Clock-in + Crew section ═══ */}
            {foremanTab === "dashboard" && (
              <div className="emp-content">
                <div className="frm-clock-status">
                  {/* Big clock display */}
                  <div className="frm-clock-time">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-muted">
                    {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  {gpsStatus && <div className="text-xs text-muted">{gpsStatus}</div>}

                  {/* ── Project Lookup for Clock-In ── */}
                  {!isClockedIn && (
                    <div className="frm-clock-project-search">
                      <label className="form-label">{t("Select Project")}</label>
                      <FieldInput
                        type="text"
                        placeholder={t("Search project name or address...")}
                        value={clockProjectSearch}
                        onChange={(e) => setClockProjectSearch(e.target.value)}
                        t={t}
                      />
                      <div className="frm-clock-project-list">
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
                              className={`frm-clock-project-item${selectedProjectId === p.id ? " selected" : ""}`}
                              onClick={() => { setSelectedProjectId(p.id); setClockProjectSearch(""); }}
                            >
                              <div>
                                <div className="text-sm font-semi">{p.name}</div>
                                <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                              </div>
                              {selectedProjectId === p.id && <span className="frm-amber">✓</span>}
                            </div>
                          ))}
                      </div>
                      {selectedProject && (
                        <div className="text-sm font-semi frm-amber frm-flex-gap">
                          <MapPin size={14} />{selectedProject.name}
                        </div>
                      )}
                    </div>
                  )}

                  {!isClockedIn ? (
                    <FieldButton
                      variant="primary"
                      onClick={handleClockIn}
                      disabled={!selectedProjectId}
                      t={t}
                    >
                      <Clock size={40} />
                      {t("CLOCK IN")}
                    </FieldButton>
                  ) : (
                    <>
                      <div className="frm-section-sub">
                        <div className="text-xs text-muted">{t("Clocked in at")}</div>
                        <div className="frm-hours-value">
                          {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted">
                          {(() => {
                            const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                            const hrs = Math.floor(elapsed / 3600000);
                            const mins = Math.floor((elapsed % 3600000) / 60000);
                            return `${hrs}h ${mins}m ${t("elapsed")}`;
                          })()}
                        </div>
                      </div>
                      <FieldButton
                        variant="danger"
                        onClick={handleClockOut}
                        t={t}
                      >
                        <StopCircle size={40} />
                        {t("CLOCK OUT")}
                      </FieldButton>
                    </>
                  )}

                  {/* Today's entries */}
                  {myTodayEntries.length > 0 && (
                    <div className="frm-hours-grid">
                      <div className="frm-section-title">{t("Today's Time Log")}</div>
                      {myTodayEntries.map((te, i) => (
                        <div key={i} className="foreman-team-row">
                          <div>
                            <div className="text-sm font-semi">
                              {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-muted">
                              {projects.find(p => String(p.id) === String(te.projectId))?.name || t("General")}
                            </div>
                          </div>
                          <div className="frm-hours-value frm-amber">{te.totalHours}h</div>
                        </div>
                      ))}
                      <div className="text-sm font-semi frm-amber">
                        {t("Total")}: {myTodayHours.toFixed(1)}h
                      </div>
                    </div>
                  )}

                  {/* ── Crew Clock-In/Out ── */}
                  <div className="frm-team-section">
                    <div className="frm-team-header">{t("Crew Time Clock")}</div>

                    {/* Add team member — searchable dropdown */}
                    <div className="frm-search-bar">
                      <div className="frm-flex-gap" style={/* dynamic: relative positioning for dropdown */ { flex: 1, position: "relative" }}>
                        <FieldInput
                          type="text"
                          placeholder={t("Search or select team member...")}
                          value={teamSearch || ""}
                          onChange={e => setCrewSearch(e.target.value)}
                          onFocus={() => setCrewSearch(teamSearch || "")}
                          t={t}
                        />
                        {/* Dropdown list */}
                        {teamSearch !== null && teamSearch !== undefined && (() => {
                          const q = (teamSearch || "").toLowerCase().trim();
                          const allEmp = employees.filter(e => e.id !== activeForeman?.id);
                          const filtered = q.length > 0
                            ? allEmp.filter(e => e.name.toLowerCase().includes(q))
                            : allEmp;
                          if (filtered.length === 0 && q.length > 0) return (
                            <div className="frm-section-sub" style={/* dynamic: absolute dropdown */ { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50 }}>
                              <span className="text-sm text-muted">{t("No employees found")}</span>
                            </div>
                          );
                          if (q.length === 0 && !document.activeElement?.matches?.('input[placeholder*="Search"]')) return null;
                          return (
                            <div className="frm-clock-project-list" style={/* dynamic: absolute dropdown */ { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, maxHeight: 260, overflowY: "auto" }}>
                              {filtered.slice(0, 15).map(c => {
                                const isIn = !!teamClocks[c.id];
                                const isAssigned = teamForProject.some(cp => cp.id === c.id);
                                return (
                                  <div key={c.id}
                                    className="frm-clock-project-item"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      if (!isIn) { handleCrewClockIn(c.id); }
                                      else { handleCrewClockOut(c.id); }
                                      setCrewSearch(null);
                                    }}
                                  >
                                    <div className="foreman-team-name">{c.name}</div>
                                    <div className="text-xs text-muted">
                                      {c.role || c.title || ""}
                                      {isAssigned && <span className="frm-amber"> · {t("Assigned")}</span>}
                                    </div>
                                    <span className={`frm-team-status ${isIn ? "frm-phase-active" : "frm-muted"}`}>
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

                    {/* Currently clocked-in team */}
                    {(() => {
                      const clockedInIds = Object.keys(teamClocks).map(Number);
                      const clockedIn = clockedInIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
                      if (clockedIn.length === 0) return null;
                      return (
                        <div className="frm-team-section">
                          <div className="frm-muted text-xs font-semi">{t("Clocked In")} ({clockedIn.length})</div>
                          {clockedIn.map(c => {
                            const clockData = teamClocks[c.id];
                            const isAssigned = teamForProject.some(cp => cp.id === c.id);
                            const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                            const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                            return (
                              <div key={c.id} className="foreman-team-row">
                                <div className="frm-flex-gap">
                                  <div className="foreman-team-name">{c.name}</div>
                                  <div className="text-xs text-muted">
                                    {c.role || c.title || ""}{!isAssigned && <span className="frm-amber"> · {t("Other team")}</span>}
                                    {todayTotal > 0 ? ` · ${todayTotal.toFixed(1)}h ${t("today")}` : ""}
                                  </div>
                                  {clockData && (
                                    <div className="text-xs frm-phase-active">
                                      {t("In since")} {new Date(clockData.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      {" · "}{(() => { const m = Math.floor((Date.now() - new Date(clockData.clockIn).getTime()) / 60000); return `${Math.floor(m/60)}h ${m%60}m`; })()}
                                    </div>
                                  )}
                                </div>
                                <FieldButton variant="danger" onClick={() => handleCrewClockOut(c.id)} t={t}>
                                  {t("Clock Out")}
                                </FieldButton>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Assigned team not yet clocked in */}
                    {(() => {
                      const notIn = teamForProject.filter(c => c.id !== activeForeman?.id && !teamClocks[c.id]);
                      if (notIn.length === 0) return null;
                      return (
                        <div className="frm-team-section">
                          <div className="frm-muted text-xs font-semi">{t("Not Clocked In")} ({notIn.length})</div>
                          {notIn.map(c => {
                            const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                            const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                            return (
                              <div key={c.id} className="foreman-team-row">
                                <div>
                                  <div className="foreman-team-name">{c.name}</div>
                                  <div className="text-xs text-muted">{t(c.role)}{todayTotal > 0 ? ` · ${todayTotal.toFixed(1)}h ${t("today")}` : ""}</div>
                                </div>
                                <FieldButton variant="primary" onClick={() => handleCrewClockIn(c.id)} t={t}>
                                  {t("Clock In")}
                                </FieldButton>
                              </div>
                            );
                          })}
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
                  <div className="frm-flex-between">
                    <div className="frm-section-title">{selectedProject.name}</div>
                  </div>
                  <div className="text-xs text-muted frm-section-sub">
                    {selectedProject.gc} · {selectedProject.phase} · {selectedProject.address}
                  </div>

                  {/* Phase 2B: Construction Stage with advance */}
                  <div className="frm-flex-gap foreman-kpi-card">
                    <span className="text-xs text-muted">{t("Stage")}:</span>
                    {(() => {
                      const STAGES = [
                        { key: "pre-con", label: "Pre-Con", color: "var(--phase-pre-construction)", progress: 5 },
                        { key: "mobilize", label: "Mobilize", color: "var(--phase-estimating)", progress: 10 },
                        { key: "demo", label: "Demo", color: "var(--red)", progress: 20 },
                        { key: "framing", label: "Framing", color: "var(--amber)", progress: 40 },
                        { key: "board", label: "Board", color: "var(--phase-in-progress)", progress: 60 },
                        { key: "tape", label: "Tape/Finish", color: "var(--phase-active)", progress: 80 },
                        { key: "punch", label: "Punch", color: "var(--blue)", progress: 90 },
                        { key: "closeout", label: "Closeout", color: "var(--phase-completed)", progress: 100 },
                      ];
                      const currentIdx = STAGES.findIndex(s => s.key === selectedProject.constructionStage);
                      const current = currentIdx >= 0 ? STAGES[currentIdx] : null;
                      const next = currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
                      return (
                        <>
                          {STAGES.map((s, i) => (
                            <div key={s.key} className="frm-phase-dot"
                              style={/* dynamic: stage progress computed at runtime */ {
                                width: 24, height: 6, borderRadius: 3,
                                background: i <= currentIdx ? s.color : "rgba(255,255,255,0.1)"
                              }} title={s.label} />
                          ))}
                          <span className="frm-amber font-semi">{current?.label || t("Not Set")}</span>
                          {next && (
                            <FieldButton variant="ghost" onClick={() => {
                              const now = new Date().toISOString();
                              const entry = { from: selectedProject.constructionStage || null, to: next.key, changedBy: activeForeman.name, changedById: activeForeman.id, changedAt: now };
                              const history = [...(selectedProject.stageHistory || []), entry];
                              setProjects(prev => prev.map(p => String(p.id) === String(selectedProjectId) ? { ...p, constructionStage: next.key, stageHistory: history, stageUpdatedAt: now, stageUpdatedBy: activeForeman.name, progress: next.progress || p.progress } : p));
                              show(`${t("Stage")} → ${next.label}`, "ok");
                            }} t={t}>
                              → {next.label}
                            </FieldButton>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="foreman-kpi-grid">
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Allocated Hours")}</div>
                      <div className="foreman-kpi-value">{allocatedHours.toLocaleString()}</div>
                      <div className="foreman-kpi-sub">{t("hrs")}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value"
                        style={/* dynamic: budget color computed at runtime */ { color: budgetColor }}>
                        {hoursUsed.toFixed(1)}
                      </div>
                      <div className="foreman-kpi-sub">{t("hrs")}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Hours Remaining")}</div>
                      <div className="foreman-kpi-value"
                        style={/* dynamic: threshold-based color */ { color: hoursRemaining < 0 ? "var(--red)" : "var(--green)" }}>
                        {hoursRemaining.toFixed(1)}
                      </div>
                      <div className="foreman-kpi-sub">{t("hrs")}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value">{pctUsed}%</div>
                      <div className="foreman-budget-bar">
                        <div className="foreman-budget-fill"
                          style={/* dynamic: budget % computed at runtime */ { width: `${Math.min(pctUsed, 100)}%`, background: budgetColor }} />
                      </div>
                    </div>
                  </div>

                  <div className="foreman-kpi-grid">
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Crew Members")}</div>
                      <div className="foreman-kpi-value">{teamForProject.length}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Materials")}</div>
                      <div className="foreman-kpi-value">{projectMatRequests.length}</div>
                    </div>
                    <div className="foreman-kpi-card">
                      <div className="foreman-kpi-label">{t("Progress")}</div>
                      <div className="foreman-kpi-value">{selectedProject.progress}%</div>
                    </div>
                  </div>

                  <div className="foreman-kpi-card">
                    <div className="foreman-kpi-label">{t("Progress")}</div>
                    <div className="project-progress-bar">
                      <div className="project-progress-fill"
                        style={/* dynamic: progress % computed at runtime */ { width: `${selectedProject.progress}%` }} />
                    </div>
                  </div>

                  {/* ── Phase Tracker ── */}
                  <div className="foreman-kpi-card">
                    <div className="frm-flex-between">
                      <div>
                        <div className="foreman-kpi-label">{t("Construction Phases")}</div>
                        <div className="text-xs frm-muted">
                          {completedCount}/{projPhases.length} {t("complete")}
                          {activePhase ? ` · ${activePhase.name}` : ""}
                        </div>
                      </div>
                      {activePhase && (
                        <span className="badge badge-amber">{activePhase.name}</span>
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

                  {/* ── RFI Alerts (read-only, field visibility) ── */}
                  {rfiAlerts.length > 0 && (
                    <div className="foreman-kpi-card">
                      <div className="frm-flex-gap">
                        <FileQuestion size={16} className="frm-amber" />
                        <div className="foreman-kpi-label">
                          {t("RFIs Needing Attention")} ({rfiAlerts.length})
                        </div>
                      </div>
                      <div className="frm-doc-list">
                        {rfiAlerts.slice(0, 5).map(r => (
                          <div key={r.id} className="frm-doc-item">
                            <div className="frm-flex-between" style={/* dynamic: status-based color */ { flex: 1 }}>
                              <div className="text-sm font-semi frm-doc-name">
                                {r.number ? `${r.number}: ` : ""}{r.subject || r.title || r.question}
                              </div>
                              <StatusBadge
                                status={r.status === "answered" || r.status === "closed" ? "answered" : "open"}
                                t={t}
                              />
                            </div>
                            {(r.status === "answered" || r.status === "closed") && r.response && (
                              <div className="text-xs frm-phase-active">
                                {t("Response")}: {r.response.length > 120 ? r.response.slice(0, 120) + "..." : r.response}
                              </div>
                            )}
                            {r.drawingRef && (
                              <div className="text-xs text-muted">
                                {t("Drawing ref")}: {r.drawingRef}
                              </div>
                            )}
                          </div>
                        ))}
                        {rfiAlerts.length > 5 && (
                          <FieldButton variant="ghost" onClick={() => setForemanTab("documents")} t={t}>
                            {t("View all")} {rfiAlerts.length} {t("RFIs")} →
                          </FieldButton>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ CREW TAB ═══ */}
            {foremanTab === "team" && (() => {
              const scheduledIds = new Set(teamForProject.map(c => String(c.id)));
              const extraCrew = extraCrewIds
                .map(id => employees.find(e => String(e.id) === String(id)))
                .filter(Boolean);
              const allDisplayCrew = [...teamForProject, ...extraCrew];

              const teamAddFiltered = (() => {
                const q = teamAddSearch.toLowerCase().trim();
                return (employees || [])
                  .filter(e => e.active !== false && !scheduledIds.has(String(e.id)) && !extraCrewIds.some(id => String(id) === String(e.id)))
                  .filter(e => !q || e.name.toLowerCase().includes(q))
                  .slice(0, 12);
              })();

              return (
                <div className="emp-content">
                  <div className="frm-flex-between">
                    <div className="frm-section-title">{t("Crew Members")}</div>
                    <FieldButton
                      variant="primary"
                      onClick={() => { setShowCrewAdd(v => !v); setCrewAddSearch(""); }}
                      t={t}
                    >
                      <UserPlus size={15} />
                      {t("Add Crew")}
                    </FieldButton>
                  </div>

                  {/* Add team member dropdown */}
                  {showCrewAdd && (
                    <div className="foreman-kpi-card">
                      <div className="frm-flex-gap">
                        <Search size={14} className="frm-muted" />
                        <FieldInput
                          ref={teamAddRef}
                          autoFocus
                          type="text"
                          placeholder={t("Search employees...")}
                          value={teamAddSearch}
                          onChange={e => setCrewAddSearch(e.target.value)}
                          t={t}
                        />
                        <FieldButton variant="ghost" onClick={() => setShowCrewAdd(false)} t={t}>
                          <X size={14} />
                        </FieldButton>
                      </div>
                      {teamAddFiltered.length === 0 ? (
                        <div className="text-sm frm-muted">{t("No employees found")}</div>
                      ) : (
                        teamAddFiltered.map(emp => (
                          <div
                            key={emp.id}
                            className="frm-team-row frm-clock-project-item"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setExtraCrewIds(prev => [...prev, emp.id]);
                              setCrewAddSearch("");
                            }}
                          >
                            <div className="foreman-team-name">{emp.name}</div>
                            <div className="text-xs frm-muted">{emp.role || ""}</div>
                            <UserPlus size={14} className="frm-amber" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {allDisplayCrew.length === 0 ? (
                    <EmptyState
                      icon={UserPlus}
                      heading={t("No Crew Clocked In")}
                      message={t("No crew members are clocked in on this project.")}
                      t={t}
                    />
                  ) : (
                    <div className="frm-hours-grid">
                      {teamForProject.map(c => (
                        <div key={c.id} className="foreman-team-row">
                          <div>
                            <div className="foreman-team-name">{c.name}</div>
                            <div className="foreman-team-role">{t(c.role)}</div>
                            <div className="text-xs text-muted">
                              {DAY_KEYS.filter(d => c.days?.[d]).map(d => t(d.charAt(0).toUpperCase() + d.slice(1))).join(", ")}
                            </div>
                          </div>
                          <div>
                            <div className="foreman-team-hours">{fmtHours(c.todayHours)}</div>
                            <div className="text-xs text-muted">{t("Hours Today")}</div>
                            <div className="text-xs text-dim">
                              {fmtHours(c.weekHours)} {t("This Week").toLowerCase()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {extraCrew.map(c => (
                        <div key={c.id} className="foreman-team-row frm-notes-pinned">
                          <div>
                            <div className="foreman-team-name">{c.name}</div>
                            <div className="foreman-team-role">{t(c.role)}</div>
                            <div className="text-xs frm-amber">+ {t("Added today")}</div>
                          </div>
                          <FieldButton
                            variant="ghost"
                            onClick={() => setExtraCrewIds(prev => prev.filter(id => String(id) !== String(c.id)))}
                            t={t}
                          >
                            <X size={16} />
                          </FieldButton>
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
                <div className="frm-section-title">{t("Hours")}</div>

                {/* Summary card */}
                <div className="foreman-kpi-card">
                  <div className="frm-flex-between">
                    <div>
                      <div className="foreman-kpi-label">{t("Allocated Hours")}</div>
                      <div className="foreman-kpi-value">{allocatedHours.toLocaleString()} {t("hrs")}</div>
                    </div>
                    <div>
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value"
                        style={/* dynamic: budget color computed at runtime */ { color: budgetColor }}>
                        {hoursUsed.toFixed(1)} {t("hrs")}
                      </div>
                    </div>
                  </div>
                  <div className="foreman-budget-bar">
                    <div className="foreman-budget-fill"
                      style={/* dynamic: budget % computed at runtime */ { width: `${Math.min(pctUsed, 100)}%`, background: budgetColor }} />
                  </div>
                  <div className="frm-flex-between">
                    <span className="text-xs text-muted">{t("Hours Remaining")}: <b style={/* dynamic: threshold-based color */ { color: hoursRemaining < 0 ? "var(--red)" : "var(--green)" }}>{hoursRemaining.toFixed(1)} {t("hrs")}</b></span>
                    <span className="text-xs text-muted">{t("Burn Rate")}: <b className="frm-amber">{weeklyBurnHours.toFixed(1)} {t("hrs")}</b> {t("per week")}</span>
                  </div>
                </div>

                {/* Per-employee hours breakdown */}
                <div className="frm-section-title">{t("Crew Members")}</div>
                {teamForProject.length === 0 ? (
                  <div className="text-sm text-muted">{t("No team assigned")}</div>
                ) : (
                  <div className="foreman-kpi-card">
                    <div className="foreman-cost-row frm-muted">
                      <span className="frm-hours-name">{t("Crew")}</span>
                      <span className="frm-hours-day">{t("Role")}</span>
                      <span className="frm-hours-day">{t("Hours Today")}</span>
                      <span className="frm-hours-day">{t("Hours This Week")}</span>
                    </div>
                    {teamForProject.map(c => (
                      <div key={c.id} className="foreman-cost-row">
                        <span className="frm-hours-name">{c.name}</span>
                        <span className="frm-hours-day frm-muted">{t(c.role)}</span>
                        <span className="frm-hours-day frm-mono frm-muted">{fmtHours(c.todayHours)}</span>
                        <span className="frm-hours-day frm-mono frm-amber">{fmtHours(c.weekHours)}</span>
                      </div>
                    ))}
                    <div className="foreman-cost-row frm-divider">
                      <span className="frm-hours-name">{t("Total")}</span>
                      <span className="frm-hours-day"></span>
                      <span className="frm-hours-day frm-mono frm-muted">
                        {fmtHours(teamForProject.reduce((s, c) => s + c.todayHours, 0))}
                      </span>
                      <span className="frm-hours-day frm-mono frm-amber">
                        {fmtHours(teamForProject.reduce((s, c) => s + c.weekHours, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ MATERIALS TAB ═══ */}
            {foremanTab === "materials" && (
              <div className="emp-content frm-content-pad">
                <div className="section-header">
                  <div className="frm-section-title">{t("Request Material")}</div>
                </div>
                <FieldCard className="mb-4">
                  <div className="frm-mat-form">
                    <FieldInput
                      label={t("Material")}
                      value={matForm.material}
                      onChange={e => setMatForm(f => ({ ...f, material: e.target.value }))}
                      placeholder='e.g., 5/8" Type X GWB'
                      t={t}
                    />
                    <div className="frm-mat-qty-row">
                      <div className="frm-mat-qty-field">
                        <FieldInput
                          label={t("Quantity")}
                          value={matForm.qty}
                          onChange={e => setMatForm(f => ({ ...f, qty: e.target.value }))}
                          inputMode="numeric"
                          t={t}
                        />
                      </div>
                      <div className="frm-mat-unit-field">
                        <FieldSelect
                          label={t("Unit")}
                          value={matForm.unit}
                          onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))}
                          options={["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT"].map(u => ({ value: u, label: u }))}
                          t={t}
                        />
                      </div>
                    </div>
                    <FieldInput
                      label={t("Notes")}
                      value={matForm.notes}
                      onChange={e => setMatForm(f => ({ ...f, notes: e.target.value }))}
                      t={t}
                    />
                    <div className="frm-mat-priority-row">
                      <div className="frm-mat-priority-field">
                        <FieldSelect
                          label={t("Priority")}
                          value={matForm.urgency}
                          onChange={e => setMatForm(f => ({ ...f, urgency: e.target.value }))}
                          options={[
                            { value: "normal", label: t("Normal") },
                            { value: "urgent", label: "⚡ " + t("Urgent") },
                            { value: "emergency", label: "🚨 " + t("Emergency") },
                          ]}
                          t={t}
                        />
                      </div>
                      <div className="frm-mat-date-field">
                        <FieldInput
                          label={t("Needed By")}
                          value={matForm.neededBy}
                          onChange={e => setMatForm(f => ({ ...f, neededBy: e.target.value }))}
                          t={t}
                        />
                      </div>
                    </div>
                    <FieldButton variant="primary" onClick={handleMatSubmit} t={t}>{t("Submit Request")}</FieldButton>
                  </div>
                </FieldCard>

                <div className="section-header">
                  <div className="frm-section-title">{t("Material Requests")}</div>
                </div>
                <AsyncState
                  loading={false}
                  empty={projectMatRequests.length === 0}
                  emptyIcon={Package}
                  emptyMessage={t("No material requests for this project.")}
                  t={t}
                >
                  <div className="frm-mat-list">
                    {projectMatRequests.map(req => (
                      <MaterialRequestCard
                        key={req.id}
                        title={
                          (req.urgency === "emergency" ? "🚨 " : req.urgency === "urgent" ? "⚡ " : "") +
                          (req.material || "")
                        }
                        status={
                          req.status === "on_order" ? "on_order" :
                          req.status === "supplier_confirmed" ? "supplier_confirmed" :
                          req.status === "assigned" ? "assigned" :
                          req.status === "picked_up" ? "picked_up" :
                          req.status === "confirmed" ? "confirmed" :
                          req.status
                        }
                        materialName={req.notes || ""}
                        quantity={req.qty}
                        unit={req.unit}
                        submittedBy={t("Requester") + ": " + req.employeeName + (req.neededBy ? " · " + t("Need by") + " " + req.neededBy : "")}
                        timestamp={req.fulfillmentType ? (req.fulfillmentType === "supplier" ? "📦" : "🚛") : undefined}
                        actions={
                          req.status === "delivered" && !req.confirmedBy
                            ? [
                                { label: t("Confirm Receipt"), variant: "primary", onClick: () => handleForemanConfirm(req.id, "") },
                                { label: t("Issue"), variant: "ghost", onClick: () => { const exc = prompt(t("Describe issue") + ":"); if (exc) handleForemanConfirm(req.id, exc); } },
                              ]
                            : undefined
                        }
                        t={t}
                      />
                    ))}
                  </div>
                </AsyncState>
              </div>
            )}

            {/* ═══ JSA TAB ═══ */}
            {foremanTab === "jsa" && (
              <div className="emp-content frm-content-pad">
                {/* ── JSA LIST VIEW ── */}
                {jsaView === "list" && (
                  <div>
                    <div className="frm-flex-between frm-jsa-section">
                      <div className="frm-section-title">{t("Job Safety Analysis")}</div>
                      <div className="frm-flex-gap">
                        <FieldButton variant="primary" size="sm" onClick={() => {
                          setJsaView("rollcall");
                          setRcStep("pick");
                          setRcWeather("clear");
                          setRcJsaId(null);
                        }} t={t}>{t("Pre-Task Safety")}</FieldButton>
                        <FieldButton variant="ghost" size="sm" onClick={() => {
                          setJsaForm(f => ({ ...f, projectId: String(selectedProjectId || ""), supervisor: activeForeman.name, competentPerson: activeForeman.name }));
                          setJsaView("create");
                        }} t={t}>+</FieldButton>
                      </div>
                    </div>

                    <AsyncState
                      loading={false}
                      empty={myJsas.length === 0}
                      emptyIcon={Shield}
                      emptyMessage={t("No Job Safety Analysis on file. Tap New JSA to begin.")}
                      t={t}
                    >
                      {myJsas.sort((a, b) => b.date.localeCompare(a.date)).map(j => {
                        const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
                        const rc = riskColor(maxRisk);
                        const proj = projects.find(p => String(p.id) === String(j.projectId));
                        return (
                          <FieldCard key={j.id} className="frm-jsa-list-item" onClick={() => { setActiveJsaId(j.id); setJsaView("detail"); }}>
                            <div className="frm-flex-between frm-jsa-list-header">
                              <div className="frm-flex-gap frm-jsa-badges">
                                <span className="jsa-status-badge frm-jsa-status-badge" data-status={j.status}>{j.status.toUpperCase()}</span>
                                <span className="jsa-risk-badge frm-jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label}</span>{/* dynamic: risk score color computed at runtime */}
                              </div>
                              <span className="frm-muted text-sm">{(j.teamSignOn || []).length} {t("signed")}</span>
                            </div>
                            <div className="frm-jsa-list-title">{j.title}</div>
                            <div className="frm-muted text-sm">{proj?.name} · {j.date}</div>
                            <div className="frm-jsa-ppe-icons">
                              {(j.ppe || []).slice(0, 6).map(k => {
                                const item = PPE_ITEMS.find(p => p.key === k);
                                return item ? <span key={k} className="frm-jsa-ppe-icon">{item.icon}</span> : null;
                              })}
                            </div>
                          </FieldCard>
                        );
                      })}
                    </AsyncState>
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
                        <div className="frm-flex-gap frm-jsa-step-header">
                          <FieldButton variant="ghost" onClick={() => setJsaView("list")} t={t}>{t("← Back")}</FieldButton>
                          <span className="frm-section-title">{t("Pre-Task Safety")}</span>
                        </div>

                        {!selectedProjectId && (
                          <FieldCard className="frm-jsa-warning-card">
                            <span className="frm-amber">{t("Select a project first")}</span>
                          </FieldCard>
                        )}

                        {selectedProjectId && (
                          <>
                            <div className="frm-muted text-sm frm-jsa-step-proj">{proj?.name || "Project"}</div>
                            <div className="frm-jsa-step-subtitle">{t("Pick today's task")}</div>

                            {/* Indoor / Outdoor toggle */}
                            <div className="frm-jsa-toggle-wrap">
                              <div className="frm-section-sub frm-jsa-env-label">{t("Work Environment")}</div>
                              <div className="frm-jsa-toggle">
                                {[{ key: "indoor", label: t("Indoor"), labelEs: "Interior" }, { key: "outdoor", label: t("Outdoor"), labelEs: "Exterior" }].map(opt => (
                                  <FieldButton
                                    key={opt.key}
                                    variant={rcIndoorOutdoor === opt.key ? "primary" : "ghost"}
                                    onClick={() => setRcIndoorOutdoor(opt.key)}
                                    t={t}
                                  >
                                    {lang === "es" ? opt.labelEs : opt.label}
                                  </FieldButton>
                                ))}
                              </div>
                            </div>

                            {/* Trade cards - 2 column grid */}
                            <div className="frm-jsa-trade-grid">
                              {TRADE_CARDS.map(card => {
                                const tmpl = JSA_TEMPLATES.find(t => t.id === card.templateId);
                                if (!tmpl) return null;
                                const tradeLabel = lang === "es"
                                  ? (TRADE_LABELS[card.trade]?.labelEs || card.trade) + (card.suffixEs ? " — " + card.suffixEs : "")
                                  : (TRADE_LABELS[card.trade]?.label || card.trade) + (card.suffix ? " — " + card.suffix : "");
                                return (
                                  <FieldCard key={card.templateId} className="frm-jsa-trade-card" style={{ borderLeft: `4px solid ${card.color}` }} onClick={() => {
                                    // dynamic: trade card accent color from card data
                                    const trade = tmpl.trade;
                                    const lib = HAZARD_LIBRARY[trade] || [];
                                    const sel = {};
                                    lib.forEach((_, idx) => { sel[idx] = true; });
                                    setRcSelectedHazardIdxs(sel);
                                    setRcPendingCard(card);
                                    setRcStep("hazards");
                                  }}>
                                    <span className="frm-jsa-trade-icon">{card.icon}</span>
                                    <span className="frm-jsa-trade-label" style={{ color: card.color }}>{tradeLabel}</span>{/* dynamic: trade color from card data */}
                                  </FieldCard>
                                );
                              })}
                            </div>

                            {/* Weather quick-select — only for outdoor jobs */}
                            {rcIndoorOutdoor === "outdoor" && (
                              <div className="frm-jsa-weather-section">
                                <div className="frm-section-sub">{t("Weather")}</div>
                                <div className="frm-mat-filter">
                                  {WEATHER_QUICK.map(w => (
                                    <FieldButton key={w.key} variant={rcWeather === w.key ? "primary" : "ghost"} size="sm"
                                      onClick={() => setRcWeather(w.key)} t={t}>
                                      {w.icon} {lang === "es" ? w.labelEs : w.label}
                                    </FieldButton>
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
                        <div className="frm-flex-gap frm-jsa-step-header">
                          <FieldButton variant="ghost" onClick={() => { setRcStep("pick"); setRcPendingCard(null); }} t={t}>{t("← Back")}</FieldButton>
                          <span className="frm-section-title">{t("Select Hazards")}</span>
                        </div>

                        <div className="frm-muted text-sm frm-jsa-step-proj">{proj?.name}</div>
                        <div className="frm-muted text-sm frm-jsa-step-subtitle">
                          {t("Pick as many as apply")} · {TRADE_LABELS[trade]?.label || trade}
                        </div>

                        <div className="frm-jsa-hazard-list">
                          {lib.map((h, idx) => {
                            const isChecked = !!rcSelectedHazardIdxs[idx];
                            const catInfo = HAZARD_CATEGORIES.find(c => c.key === h.category);
                            return (
                              <div
                                key={idx}
                                onClick={() => setRcSelectedHazardIdxs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                className={`frm-jsa-hazard-item${isChecked ? " checked" : ""}`}
                                style={{ borderColor: isChecked ? (catInfo?.color || "var(--amber)") : "var(--border)" }}
                              >
                                {/* dynamic: category/check color from hazard data */}
                                <div className={`frm-jsa-hazard-check${isChecked ? " checked" : ""}`} style={{ color: isChecked ? (catInfo?.color || "var(--amber)") : "var(--text3)" }}>
                                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="frm-jsa-hazard-body">
                                  <div className={`frm-jsa-hazard-name${isChecked ? " checked" : ""}`}>{h.hazard}</div>
                                  {h.hazardEs && <div className="frm-jsa-hazard-es">{h.hazardEs}</div>}
                                  {isChecked && (
                                    <div className="frm-jsa-hazard-controls">
                                      {h.controls.slice(0, 2).map((c, ci) => (
                                        <div key={ci} className="frm-jsa-control-item">✓ {c}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {catInfo && (
                                  <span className="frm-jsa-cat-badge" style={{ background: catInfo.color + "22", color: catInfo.color }}>
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
                                className={`frm-jsa-hazard-item${isChecked ? " checked" : ""}`}
                                style={{ borderColor: isChecked ? "var(--amber)" : "var(--border)" }}
                              >
                                {/* dynamic: checked boolean state colors */}
                                <div className="frm-jsa-hazard-check" style={{ color: isChecked ? "var(--amber)" : "var(--text3)" }}>
                                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="frm-jsa-hazard-body">
                                  <div className={`frm-jsa-hazard-name${isChecked ? " checked" : ""}`}>{wh.hazard}</div>
                                  {wh.hazardEs && <div className="frm-jsa-hazard-es">{wh.hazardEs}</div>}
                                </div>
                                <span className="frm-jsa-cat-badge frm-amber" style={{ background: "var(--amber-dim)" }}>
                                  Weather
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <FieldButton
                          variant="primary"
                          className="frm-jsa-proceed-btn"
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
                              teamSignOn: [], nearMisses: [],
                              toolboxTalk: { topic: "", notes: "", discussed: false },
                              createdAt: new Date().toISOString(),
                              createdBy: activeForeman.name, audit: [],
                            };
                            setJsas(prev => [...prev, newJsa]);
                            setRcJsaId(newJsa.id);
                            const sel = {};
                            teamForProject.forEach(c => { sel[c.id] = true; });
                            setRcSelected(sel);
                            setRcStep("team");
                          }}
                        >
                          {t("Proceed")} ({selectedCount} {t("hazards selected")})
                        </FieldButton>
                      </div>
                    );
                  }

                  // ── STEP 2: CREW ROLL CALL ──
                  if (rcStep === "team") {
                    const allTeam = [...teamForProject];
                    // Include any employees not in teamForProject that were manually added
                    const teamIds = new Set(allTeam.map(c => c.id));
                    return (
                      <div>
                        <div className="frm-flex-gap frm-jsa-step-header">
                          <FieldButton variant="ghost" onClick={() => { setRcStep("pick"); }} t={t}>{t("← Back")}</FieldButton>
                          <span className="frm-section-title">{t("Crew Roll Call")}</span>
                        </div>

                        <div className="frm-muted text-sm frm-jsa-step-proj">{proj?.name} · {rcJsa?.title}</div>
                        <div className="frm-muted text-sm frm-jsa-step-date">
                          {new Date().toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </div>

                        {/* Crew list */}
                        {allTeam.length === 0 ? (
                          <FieldCard className="frm-jsa-warning-card">
                            <span className="frm-muted">{t("No team scheduled. Add team members below.")}</span>
                          </FieldCard>
                        ) : allTeam.map(c => (
                          <div key={c.id} className={`frm-jsa-rollcall-row${rcSelected[c.id] ? " selected" : ""}`}
                            style={{ borderLeft: rcSelected[c.id] ? "4px solid var(--phase-active)" : "4px solid var(--border)", opacity: rcSelected[c.id] ? 1 : 0.5 }}
                            onClick={() => setRcSelected(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                            {/* dynamic: selected state border and opacity */}
                            <span className="frm-jsa-rollcall-check">{rcSelected[c.id] ? <CheckCircle size={20} className="frm-phase-active" /> : <Square size={20} className="frm-muted" />}</span>
                            <div>
                              <div className="frm-jsa-crew-name">{c.name}</div>
                              <div className="frm-muted text-sm">{c.role || "Crew"}</div>
                            </div>
                          </div>
                        ))}

                        {/* Add team */}
                        {rcAddingCrew ? (
                          <select className="form-select frm-jsa-add-crew-select" autoFocus
                            onChange={e => {
                              if (!e.target.value) return;
                              const emp = employees.find(em => em.id === Number(e.target.value));
                              if (!emp || teamIds.has(emp.id)) return;
                              teamForProject.push({ id: emp.id, name: emp.name, role: emp.role || "Crew" });
                              setRcSelected(prev => ({ ...prev, [emp.id]: true }));
                              setRcAddingCrew(false);
                            }} onBlur={() => setRcAddingCrew(false)}>
                            <option value="">{t("Select employee...")}</option>
                            {(employees || []).filter(e => !teamIds.has(e.id) && e.active !== false).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        ) : (
                          <FieldButton variant="ghost" className="frm-jsa-add-crew-btn" onClick={() => setRcAddingCrew(true)} t={t}>
                            + {t("Add Crew")}
                          </FieldButton>
                        )}

                        {/* Start Sign-On */}
                        <FieldButton
                          variant="primary"
                          className="frm-jsa-proceed-btn"
                          disabled={Object.values(rcSelected).filter(Boolean).length === 0}
                          onClick={() => {
                            const queue = teamForProject.filter(c => rcSelected[c.id]).map(c => ({ employeeId: c.id, name: c.name }));
                            setRcQueue(queue);
                            setRcSignIdx(0);
                            setRcStep("sign");
                          }}
                          t={t}
                        >
                          {t("Start Sign-On")} ({Object.values(rcSelected).filter(Boolean).length})
                        </FieldButton>
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
                        <div className="frm-jsa-section">
                          <div className="frm-flex-between frm-muted text-sm frm-jsa-progress-label">
                            <span>{progress} {t("of")} {total}</span>
                            <span>{t("Pass device to next person")}</span>
                          </div>
                          <div className="frm-jsa-progress-bar">
                            <div className="frm-jsa-progress-fill" style={{ width: `${(progress / total) * 100}%` }} />{/* dynamic: progress % computed at runtime */}
                          </div>
                        </div>

                        {/* Name banner */}
                        <div className="frm-jsa-name-banner">
                          <div className="frm-jsa-signer-name">{current.name}</div>
                          <div className="frm-muted text-sm">{proj?.name}</div>
                        </div>

                        {/* Hazard cards */}
                        <div className="frm-jsa-section">
                          <div className="frm-amber frm-jsa-subsection-title">{t("Hazards")}</div>
                          {allHazards.map((h, i) => {
                            const score = (h.likelihood || 1) * (h.severity || 1);
                            const hrc = riskColor(score);
                            const catInfo = HAZARD_CATEGORIES[h.category];
                            return (
                              <FieldCard key={i} className="frm-jsa-hazard-card" style={{ borderLeft: `3px solid ${catInfo?.color || "var(--amber)"}` }}>
                                {/* dynamic: category color from hazard data; risk color computed at runtime */}
                                <div className="frm-flex-gap frm-jsa-hazard-header">
                                  <span className="frm-jsa-risk-score-badge" style={{ background: hrc.bg, color: "#fff" }}>{score}</span>
                                  <span className="frm-jsa-hazard-title">{h.hazard}</span>
                                </div>
                                {h.hazardEs && <div className="frm-jsa-hazard-es">{h.hazardEs}</div>}
                                <div className="frm-jsa-control-list frm-muted text-sm">
                                  {(h.controls || []).map((c, ci) => <div key={ci}>✓ {c}</div>)}
                                </div>
                              </FieldCard>
                            );
                          })}
                        </div>

                        {/* PPE */}
                        <div className="frm-jsa-section">
                          <div className="frm-amber frm-jsa-subsection-title">{t("Required PPE")}</div>
                          <div className="frm-jsa-ppe-display">
                            {(rcJsa?.ppe || []).map(k => {
                              const item = PPE_ITEMS.find(p => p.key === k);
                              return item ? (
                                <div key={k} className="frm-jsa-ppe-display-item">
                                  <div className="frm-jsa-ppe-emoji">{item.icon}</div>
                                  <div className="frm-muted text-sm">{item.label}</div>
                                  <div className="frm-muted text-sm">{item.labelEs}</div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>

                        {/* Signature pad */}
                        <div className="frm-jsa-section">
                          <FieldSignaturePad
                            key={rcSignIdx}
                            label={t("Sign below")}
                            t={t}
                            onSave={(ref) => { sigRef.current = ref; }}
                          />
                        </div>

                        {/* Sign & Next button */}
                        <FieldButton
                          variant="primary"
                          className="frm-jsa-proceed-btn"
                          onClick={() => {
                            const sigData = sigRef.current?.getSig?.();
                            if (!sigData) { show(t("Please sign first"), "err"); return; }
                            updateRcJsa({
                              teamSignOn: [...(rcJsa?.teamSignOn || []), {
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
                              setRcStep("supervisor");
                              sigRef.current = null;
                            }
                          }}
                          t={t}
                        >
                          {rcSignIdx < rcQueue.length - 1 ? t("Sign & Next") : t("Sign & Finish")}
                        </FieldButton>
                      </div>
                    );
                  }

                  // ── STEP 3b: SUPERVISOR SIGN-OFF ──
                  if (rcStep === "supervisor") {
                    return (
                      <div>
                        <div className="frm-jsa-supervisor-banner">
                          <div className="frm-amber frm-jsa-supervisor-label">{t("Supervisor Sign-Off")}</div>
                          <div className="frm-jsa-supervisor-name">{activeForeman.name}</div>
                          <div className="frm-muted text-sm">
                            {(rcJsa?.teamSignOn || []).length} {t("team members signed")}
                          </div>
                        </div>

                        <FieldSignaturePad
                          key="supervisor"
                          label={t("Supervisor signature")}
                          t={t}
                          onSave={(ref) => { sigRef.current = ref; }}
                        />

                        <FieldButton
                          variant="primary"
                          className="frm-jsa-proceed-btn frm-jsa-activate-btn"
                          onClick={() => {
                            const sigData = sigRef.current?.getSig?.();
                            if (!sigData) { show(t("Please sign first"), "err"); return; }
                            updateRcJsa({ supervisorSignature: sigData, status: "active" });
                            setRcStep("done");
                            show(t("Pre-Task Safety Complete"), "ok");
                          }}
                          t={t}
                        >
                          {t("Activate JSA")}
                        </FieldButton>
                      </div>
                    );
                  }

                  // ── STEP 4: CONFIRMATION ──
                  if (rcStep === "done") {
                    const finalJsa = (jsas || []).find(j => j.id === rcJsaId);
                    return (
                      <div className="frm-jsa-done-view">
                        <div className="frm-jsa-done-icon"><CheckCircle size={48} className="frm-phase-active" /></div>
                        <div className="frm-jsa-done-title">{t("Pre-Task Safety Complete")}</div>
                        <div className="frm-muted frm-jsa-done-subtitle">
                          {(finalJsa?.teamSignOn || []).length} {t("team members signed")} · {finalJsa?.title}
                        </div>

                        {/* Signed team list */}
                        <div className="frm-jsa-signed-list">
                          {(finalJsa?.teamSignOn || []).map((c, i) => (
                            <div key={i} className="frm-flex-between frm-divider frm-jsa-signed-row">
                              <span className="frm-jsa-crew-name">{c.name}</span>
                              <span className="frm-phase-active text-sm">✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          ))}
                        </div>

                        <div className="frm-jsa-done-actions">
                          <FieldButton variant="ghost" className="frm-jsa-done-btn" onClick={async () => {
                            try {
                              const { generateJsaPdf } = await import("../utils/jsaPdf");
                              const p = projects.find(pr => pr.id === finalJsa?.projectId);
                              await generateJsaPdf({ ...finalJsa, projectName: p?.name || "Project" });
                              show(t("PDF exported"), "ok");
                            } catch (e) { show("PDF error: " + e.message, "err"); }
                          }} t={t}>{t("Export PDF")}</FieldButton>
                          <FieldButton variant="primary" className="frm-jsa-done-btn" onClick={() => {
                            setJsaView("list");
                            setRcJsaId(null);
                            setRcStep("pick");
                          }} t={t}>{t("Done")}</FieldButton>
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
                  return (
                    <div>
                      <div className="frm-flex-gap frm-jsa-detail-header">
                        <FieldButton variant="ghost" onClick={() => setJsaView("list")} t={t}>{t("← Back")}</FieldButton>
                        <span className="jsa-status-badge frm-jsa-status-badge" data-status={jsa.status}>{jsa.status.toUpperCase()}</span>
                        <div className="frm-flex-gap frm-jsa-detail-actions">
                          {jsa.status === "draft" && <FieldButton variant="primary" size="sm" onClick={() => updateJsa({ status: "active" })} t={t}>{t("Activate")}</FieldButton>}
                          {jsa.status === "active" && <FieldButton variant="ghost" size="sm" onClick={() => updateJsa({ status: "closed" })} t={t}>{t("Close JSA")}</FieldButton>}
                        </div>
                      </div>

                      <h3 className="frm-section-title">{jsa.title}</h3>
                      <div className="frm-muted text-sm frm-jsa-detail-meta">
                        {jsa.date} · {jsa.location} · {lang === "es" ? TRADE_LABELS[jsa.trade]?.labelEs : TRADE_LABELS[jsa.trade]?.label}
                      </div>

                      {/* Risk summary */}
                      <div className="frm-jsa-kpi-grid frm-jsa-section">
                        <FieldCard className="frm-jsa-kpi-card">
                          <div className="frm-jsa-kpi-value" style={{ color: rc.bg }}>{/* dynamic: risk color computed at runtime */}{maxRisk}</div>
                          <div className="frm-muted text-sm">{t("Highest Risk")}</div>
                        </FieldCard>
                        <FieldCard className="frm-jsa-kpi-card">
                          <div className="frm-jsa-kpi-value">{allHazards.length}</div>
                          <div className="frm-muted text-sm">{t("Hazards")}</div>
                        </FieldCard>
                        <FieldCard className="frm-jsa-kpi-card">
                          <div className="frm-jsa-kpi-value frm-phase-active">{(jsa.teamSignOn || []).length}</div>
                          <div className="frm-muted text-sm">{t("Crew Signed")}</div>
                        </FieldCard>
                      </div>

                      {/* PPE */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Required PPE")}</div>
                        <div className="frm-jsa-ppe-display">
                          {(jsa.ppe || []).map(k => {
                            const item = PPE_ITEMS.find(p => p.key === k);
                            return item ? (
                              <div key={k} className="frm-jsa-ppe-display-item">
                                <div className="frm-jsa-ppe-emoji">{item.icon}</div>
                                <div className="frm-muted text-sm">{lang === "es" ? item.labelEs : item.label}</div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {/* Steps & Hazards */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Job Steps & Hazards")}</div>
                        {(jsa.steps || []).map((step, idx) => (
                          <FieldCard key={step.id} className="frm-jsa-step">
                            <div className="frm-flex-gap frm-jsa-step-row">
                              <span className="frm-jsa-step-num">{idx + 1}</span>
                              <span className="frm-jsa-step-text">{step.step}</span>
                            </div>
                            {(step.hazards || []).map((h, hi) => {
                              const score = (h.likelihood || 1) * (h.severity || 1);
                              const hrc = riskColor(score);
                              return (
                                <div key={hi} className="frm-jsa-hazard-sub frm-divider">
                                  <div className="frm-flex-gap">
                                    <span className="frm-jsa-risk-score-badge" style={{ background: hrc.bg, color: "#fff" }}>{/* dynamic: risk color computed at runtime */}{score}</span>
                                    <span className="frm-jsa-hazard-title">{h.hazard}</span>
                                  </div>
                                  <div className="frm-muted text-sm frm-jsa-control-list">
                                    {(h.controls || []).map((c, ci) => <span key={ci}>✓ {c}{ci < h.controls.length - 1 ? " · " : ""}</span>)}
                                  </div>
                                </div>
                              );
                            })}
                          </FieldCard>
                        ))}
                      </div>

                      {/* Crew Sign-On */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Crew Sign-On")} ({(jsa.teamSignOn || []).length})</div>
                        {(jsa.teamSignOn || []).map((c, i) => (
                          <div key={i} className="frm-flex-between frm-divider frm-jsa-signed-row">
                            <span className="frm-jsa-crew-name">{c.name}</span>
                            <span className="frm-phase-active text-sm">✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        ))}
                        {jsa.status === "active" && (
                          <select className="form-select frm-jsa-add-crew-select"
                            onChange={e => {
                              if (!e.target.value) return;
                              const emp = (employees || []).find(em => em.id === Number(e.target.value));
                              if (!emp) return;
                              if ((jsa.teamSignOn || []).some(c => c.employeeId === emp.id)) { show(t("Already signed on")); return; }
                              updateJsa({ teamSignOn: [...(jsa.teamSignOn || []), { employeeId: emp.id, name: emp.name, signedAt: new Date().toISOString() }] });
                              show(t("Crew member signed on"));
                              e.target.value = "";
                            }}>
                            <option value="">{t("+ Add team member...")}</option>
                            {teamForProject.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Near Misses */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Near Misses")}</div>
                        {(jsa.nearMisses || []).length === 0 ? (
                          <div className="frm-muted text-sm">{t("None reported")}</div>
                        ) : (jsa.nearMisses || []).map((nm, i) => (
                          <FieldCard key={i} className="frm-jsa-near-miss text-sm">
                            {nm.description} — {nm.reportedBy} ({nm.date})
                          </FieldCard>
                        ))}
                        {jsa.status === "active" && (
                          <FieldButton variant="ghost" size="sm" className="frm-jsa-add-crew-btn" onClick={() => {
                            const desc = prompt(lang === "es" ? "Describe el casi-accidente:" : "Describe the near miss:");
                            if (!desc) return;
                            updateJsa({ nearMisses: [...(jsa.nearMisses || []), { description: desc, reportedBy: activeForeman.name, date: new Date().toISOString().slice(0, 10) }] });
                            show(t("Near miss recorded"));
                          }} t={t}>{t("+ Report Near Miss")}</FieldButton>
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
                      teamSignOn: [],
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
                      <div className="frm-flex-gap frm-jsa-step-header">
                        <FieldButton variant="ghost" onClick={() => setJsaView("list")} t={t}>{t("← Back")}</FieldButton>
                        <span className="frm-section-title">{t("Create New JSA")}</span>
                      </div>

                      {/* Template */}
                      <FieldSelect
                        label={t("Start from Template")}
                        value={jsaForm.templateId}
                        onChange={e => applyTemplate(e.target.value)}
                        options={[
                          { value: "", label: t("— Blank JSA —") },
                          ...JSA_TEMPLATES.map(tmpl => ({ value: tmpl.id, label: lang === "es" ? tmpl.titleEs : tmpl.title })),
                        ]}
                        t={t}
                      />

                      {/* Basic fields */}
                      <FieldSelect
                        label={t("Project")}
                        value={jsaForm.projectId}
                        onChange={e => updJsaForm("projectId", e.target.value)}
                        options={[{ value: "", label: t("Select...") }, ...myProjects.map(p => ({ value: String(p.id), label: p.name }))]}
                        t={t}
                      />
                      <FieldSelect
                        label={t("Trade")}
                        value={jsaForm.trade}
                        onChange={e => updJsaForm("trade", e.target.value)}
                        options={Object.entries(TRADE_LABELS).map(([k, v]) => ({ value: k, label: lang === "es" ? v.labelEs : v.label }))}
                        t={t}
                      />
                      <FieldInput
                        label={t("JSA Title")}
                        value={jsaForm.title}
                        onChange={e => updJsaForm("title", e.target.value)}
                        placeholder={t("e.g. Metal Stud Framing — Level 2")}
                        t={t}
                      />
                      <FieldInput
                        label={t("Location on Site")}
                        value={jsaForm.location}
                        onChange={e => updJsaForm("location", e.target.value)}
                        t={t}
                      />
                      <FieldInput
                        label={t("Date")}
                        value={jsaForm.date}
                        onChange={e => updJsaForm("date", e.target.value)}
                        t={t}
                      />
                      <FieldSelect
                        label={t("Weather")}
                        value={jsaForm.weather}
                        onChange={e => updJsaForm("weather", e.target.value)}
                        options={[
                          { value: "clear", label: t("Clear") },
                          { value: "rain", label: t("Rain") },
                          { value: "thunderstorm", label: t("Thunderstorm") },
                          { value: "heat", label: t("Heat Advisory") },
                          { value: "freeze", label: t("Freeze/Cold") },
                          { value: "wind", label: t("High Wind") },
                        ]}
                        t={t}
                      />

                      {weatherHazard && jsaForm.weather !== "clear" && (
                        <div className="jsa-weather-warn frm-jsa-section">
                          <AlertTriangle size={14} />{lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
                        </div>
                      )}

                      {/* PPE */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Required PPE")}</div>
                        <div className="frm-jsa-ppe-grid">
                          {PPE_ITEMS.map(item => {
                            const active = jsaForm.ppe.includes(item.key);
                            return (
                              <div key={item.key} className={`frm-jsa-ppe-item${active ? " active" : ""}`}
                                onClick={() => updJsaForm("ppe", active ? jsaForm.ppe.filter(k => k !== item.key) : [...jsaForm.ppe, item.key])}>
                                <span className="frm-jsa-ppe-emoji">{item.icon}</span>
                                <span className="text-sm frm-muted">{lang === "es" ? item.labelEs : item.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Permits */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Permits Required")}</div>
                        <div className="frm-mat-filter">
                          {PERMIT_TYPES.map(p => {
                            const active = jsaForm.permits.includes(p.key);
                            return (
                              <FieldButton
                                key={p.key}
                                variant={active ? "primary" : "ghost"}
                                size="sm"
                                onClick={() => updJsaForm("permits", active ? jsaForm.permits.filter(k => k !== p.key) : [...jsaForm.permits, p.key])}
                                t={t}
                              >
                                {lang === "es" ? p.labelEs : p.label}
                              </FieldButton>
                            );
                          })}
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="frm-jsa-section">
                        <div className="frm-amber frm-jsa-subsection-title">{t("Job Steps & Hazards")}</div>
                        {jsaForm.steps.map((step, idx) => (
                          <FieldCard key={step.id} className="frm-jsa-step">
                            <div className="frm-flex-gap frm-jsa-step-row">
                              <span className="frm-jsa-step-num">{idx + 1}</span>
                              <input className="form-input frm-jsa-step-input" value={step.step}
                                onChange={e => updJsaForm("steps", jsaForm.steps.map((s, i) => i === idx ? { ...s, step: e.target.value } : s))}
                                placeholder={t("Describe this step...")} />
                              <FieldButton variant="danger" size="sm" onClick={() => updJsaForm("steps", jsaForm.steps.filter((_, i) => i !== idx))} t={t}>✕</FieldButton>
                            </div>
                            {(step.hazards || []).map((h, hi) => {
                              const score = (h.likelihood || 1) * (h.severity || 1);
                              const hrc = riskColor(score);
                              return (
                                <div key={hi} className="frm-flex-gap frm-jsa-hazard-sub frm-divider">
                                  <span className="frm-jsa-risk-score-badge" style={{ background: hrc.bg, color: "#fff" }}>{/* dynamic: risk color computed at runtime */}{score}</span>
                                  <span className="text-sm frm-jsa-hazard-flex">{h.hazard}</span>
                                  <FieldButton variant="danger" size="sm" onClick={() => {
                                    const steps = [...jsaForm.steps];
                                    steps[idx] = { ...steps[idx], hazards: steps[idx].hazards.filter((_, i) => i !== hi) };
                                    updJsaForm("steps", steps);
                                  }} t={t}>✕</FieldButton>
                                </div>
                              );
                            })}
                            <select className="form-select frm-jsa-add-hazard-select"
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
                          </FieldCard>
                        ))}
                        <FieldButton variant="ghost" size="sm"
                          onClick={() => updJsaForm("steps", [...jsaForm.steps, { id: "s_" + Date.now(), step: "", hazards: [] }])}
                          t={t}
                        >
                          {t("+ Add Step")}
                        </FieldButton>
                      </div>

                      <div className="frm-jsa-controls">
                        <FieldButton variant="ghost" onClick={() => setJsaView("list")} t={t}>{t("Cancel")}</FieldButton>
                        <FieldButton variant="primary" onClick={saveJsa} t={t}>{t("Create JSA")}</FieldButton>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══ DRAWINGS TAB ═══ */}
            {foremanTab === "drawings" && (
              <div className="emp-content">
                <div className="frm-flex-between frm-section">
                  <div className="frm-section-title">{t("Project Drawings")}</div>
                  <FieldButton variant="ghost" size="sm" onClick={loadCloudDrawings} t={t}>
                    {drawingsLoading ? "..." : t("Refresh")}
                  </FieldButton>
                </div>

                {/* Cloud drawings with revision metadata */}
                {cloudDrawings.length > 0 ? (
                  <div className="frm-draw-grid">
                    {cloudDrawings.map(d => (
                      <FieldCard key={d.id} className={`frm-draw-item frm-draw-card ${d.isStale ? "stale" : d.isCurrent === false ? "superseded" : "current"}`}>
                        {/* ── Revision badge row ── */}
                        <div className="frm-draw-badge-row">
                          {d.revisionLabel ? (
                            <span className={`frm-draw-badge revision ${d.isCurrent ? "current" : "superseded"}`}>
                              {d.revisionLabel}
                            </span>
                          ) : d.revision ? (
                            <span className="frm-draw-badge revision">Rev {d.revision}</span>
                          ) : null}
                          {d.isCurrent && (
                            <span className="frm-draw-badge current">{t("CURRENT")}</span>
                          )}
                          {d.isCurrent === false && (
                            <span className="frm-draw-badge superseded">{t("SUPERSEDED")}</span>
                          )}
                          {d.isStale && (
                            <span className="frm-draw-badge stale">{t("UPDATE AVAILABLE")}</span>
                          )}
                          {d.discipline && d.discipline !== "general" && (
                            <span className="frm-draw-badge discipline">{t(d.discipline)}</span>
                          )}
                        </div>
                        {/* ── Drawing info + actions ── */}
                        <div className="frm-draw-info">
                          <FileText size={28} className={`frm-draw-icon ${d.isStale ? "stale" : ""}`} />
                          <div className="frm-draw-text">
                            <div className="text-sm font-semi frm-draw-title">{d.name}</div>
                            <div className="text-xs text-muted frm-draw-meta">
                              {d.size > 0 ? `${(d.size / 1048576).toFixed(1)} MB` : ""}{d.uploadedAt ? ` · ${d.uploadedAt.slice(0, 10)}` : ""}
                            </div>
                            {d.cached && !d.isStale && <div className="text-xs frm-draw-cached">{t("Saved offline")}</div>}
                            {d.cached && d.isStale && (
                              <div className="text-xs frm-draw-cached-stale">
                                {t("Cached copy is outdated — re-download")}
                              </div>
                            )}
                          </div>
                          <div className="frm-draw-actions">
                            <FieldButton variant="primary" size="sm" onClick={() => handleViewDrawing(d)} t={t}>
                              {t("View")}
                            </FieldButton>
                            {(!d.cached || d.isStale) && (
                              <FieldButton
                                variant={d.isStale ? "warning" : "ghost"}
                                size="sm"
                                onClick={() => handleDownloadDrawing(d)}
                                t={t}
                              >
                                {d.isStale ? t("Re-download") : t("Save")}
                              </FieldButton>
                            )}
                          </div>
                        </div>
                      </FieldCard>
                    ))}
                  </div>
                ) : (
                  <>
                    {drawingsLoading ? (
                      <LoadingSpinner />
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
                            <div className="frm-draw-default-grid">
                              {defaultSets.map(d => (
                                <FieldCard key={d.id} className="frm-draw-default-card">
                                  <div className="frm-draw-default-body">
                                    <d.Icon size={28} className="frm-draw-default-icon" />
                                    <div className="frm-draw-default-info">
                                      <div className="text-sm font-semi">{d.name}</div>
                                      <div className="text-xs text-muted">{d.desc}</div>
                                    </div>
                                    <span className="text-xs text-dim">{t("Not uploaded")}</span>
                                  </div>
                                </FieldCard>
                              ))}
                            </div>
                          );
                        })()}
                        <EmptyState icon={Building2} heading={t("No Drawings")} message={t("No drawings uploaded for this project.")} t={t} />
                      </>
                    )}
                  </>
                )}

                {/* Downloaded files cache info */}
                {Object.keys(downloadedDrawings).length > 0 && (
                  <div className="frm-draw-cache-section">
                    <div className="frm-section-title text-sm">{t("Downloaded for Offline")}</div>
                    <div className="frm-draw-list">
                      {Object.entries(downloadedDrawings).map(([path, info]) => (
                        <div key={path} className="foreman-team-row">
                          <div>
                            <div className="text-sm font-semi">{path.split("/").pop().replace(".pdf", "").replace(/_/g, " ")}</div>
                            <div className="text-xs text-muted">{t("Cached")} {new Date(info.cachedAt).toLocaleDateString()}{info.size ? ` · ${(info.size / 1048576).toFixed(1)} MB` : ""}</div>
                          </div>
                          <FieldButton variant="danger" size="sm" t={t}
                            onClick={() => {
                              const updated = { ...downloadedDrawings };
                              delete updated[path];
                              setDownloadedDrawings(updated);
                              localStorage.setItem("ebc_downloadedDrawings", JSON.stringify(updated));
                              show?.(t("Cache cleared"));
                            }}>
                            {t("Remove")}
                          </FieldButton>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="frm-draw-cache-hint">
                  <div className="text-sm text-muted">{t("Drawings are stored in the cloud")}</div>
                  <div className="text-xs text-dim frm-draw-cache-hint-sub">{t("Download files for offline use on the jobsite. Ask the PM to upload new drawing sets.")}</div>
                </div>
              </div>
            )}

            {/* ═══ LOOK-AHEAD TAB (Read-Only 14-Day View) ═══ */}
            {foremanTab === "lookahead" && (
              <div className="emp-content">
                <div className="section-header">
                  <div className="frm-section-title">{t("14-Day Look-Ahead")}</div>
                </div>
                <div className="text-xs text-muted frm-section-sub">
                  {t("Upcoming milestones, inspections, and deadlines for this project. Read-only — contact PM for changes.")}
                </div>

                {lookAheadEvents.length === 0 ? (
                  <EmptyState icon={ClipboardList} heading={t("No Schedule")} message={t("No lookahead schedule created yet.")} t={t} />
                ) : (
                  <div className="frm-look-grid">
                    {(() => {
                      // Group events by date
                      const groups = {};
                      lookAheadEvents.forEach(e => {
                        const d = e.date || "unknown";
                        if (!groups[d]) groups[d] = [];
                        groups[d].push(e);
                      });
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                      return Object.entries(groups).map(([date, events]) => {
                        const isToday = date === todayStr;
                        const isTomorrow = date === tomorrowStr;
                        const dayLabel = isToday ? t("Today") : isTomorrow ? t("Tomorrow") : new Date(date + "T12:00:00").toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric" });
                        return (
                          <div key={date}>
                            <div className={`frm-look-date-header ${isToday ? "today" : isTomorrow ? "tomorrow" : "future"}`}>
                              {dayLabel}
                            </div>
                            {events.map(ev => {
                              const typeColors = {
                                inspection: "var(--red)", milestone: "var(--green)",
                                delivery: "var(--amber)", meeting: "var(--phase-pre-construction)",
                                task: "var(--text2)", deadline: "var(--red)",
                              };
                              const barColor = typeColors[ev.type] || "var(--text2)";
                              return (
                                <FieldCard key={ev.id} className="frm-look-event">
                                  <div className="frm-look-event-body">
                                    <div className="frm-look-event-bar" style={{ background: barColor }} />{/* dynamic: event type color from map */}
                                    <div className="frm-look-event-text">
                                      <div className="text-sm font-semi frm-look-event-title">
                                        {ev.title}
                                      </div>
                                      <div className="text-xs text-muted frm-look-event-meta">
                                        {ev.type && <span className="frm-look-event-type">{t(ev.type)}</span>}
                                        {ev.startTime ? ` · ${ev.startTime}` : ""}
                                        {ev.start_time ? ` · ${ev.start_time}` : ""}
                                        {ev.location ? ` · ${ev.location}` : ""}
                                      </div>
                                      {ev.notes && <div className="text-xs text-dim frm-look-event-notes">{ev.notes.length > 80 ? ev.notes.slice(0, 80) + "..." : ev.notes}</div>}
                                    </div>
                                    {ev.status && ev.status !== "scheduled" && (
                                      <span className={`badge ${ev.status === "completed" ? "badge-green" : "badge-amber"}`}>
                                        {t(ev.status)}
                                      </span>
                                    )}
                                  </div>
                                </FieldCard>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
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
                      <label className="form-label">{t("Crew on Site")} ({(reportForm.teamPresent || []).length})</label>
                      <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8, background: "var(--surface1)" }}>
                        {teamForProject.length > 0 ? teamForProject.map(c => (
                          <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox"
                              checked={(reportForm.teamPresent || []).some(cp => (typeof cp === "string" ? cp : cp.id) === c.id)}
                              onChange={e => {
                                setReportForm(f => {
                                  const present = f.teamPresent || [];
                                  if (e.target.checked) {
                                    return { ...f, teamPresent: [...present, { id: c.id, name: c.name }] };
                                  } else {
                                    return { ...f, teamPresent: present.filter(cp => (typeof cp === "string" ? cp : cp.id) !== c.id) };
                                  }
                                });
                              }} />
                            <span>{c.name}</span>
                            {c.todayHours > 0 && <span className="text-xs text-muted">({c.todayHours.toFixed(1)}h)</span>}
                          </label>
                        )) : (
                          <div className="text-xs text-muted" style={{ padding: 8 }}>{t("No team assigned to this project this week")}</div>
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
                          teamPresent: reportForm.teamPresent || [],
                          teamSize: (reportForm.teamPresent || []).length,
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
                      const teamN = (r.teamPresent || []).length || r.teamSize || 0;
                      return (
                        <div key={r.id} className="card" style={{ padding: "12px 14px", marginBottom: 8, cursor: "pointer", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10 }}
                          onClick={() => setExpandedReportId(isExpanded ? null : r.id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div className="text-sm font-semi">{r.date} {weatherIcon} {r.temperature ? `${r.temperature}°F` : ""}</div>
                              <div className="text-xs text-muted">{r.projectName || t("Project")} · {teamN} {t("team")} · {r.foremanName || ""}</div>
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
                              {(r.teamPresent || []).length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: 2 }}>{t("Crew on Site")}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {r.teamPresent.map((c, i) => (
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
                                      teamPresent: r.teamPresent || [],
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
                  <div className="frm-section-title">{t("Documents")}</div>
                </div>

                {/* Submittals */}
                <div className="frm-doc-section">
                  <div className="project-section-header" onClick={() => toggleSection("submittals")}>
                    <span>{t("Submittals")} ({projectSubmittals.length})</span>
                    <span>{openSections.submittals ? "▾" : "▸"}</span>
                  </div>
                  {openSections.submittals && (
                    projectSubmittals.length === 0
                      ? <div className="text-xs text-muted">{t("No submittals")}</div>
                      : <div className="frm-doc-list">
                          {projectSubmittals.map(s => (
                            <FieldCard key={s.id} className="frm-doc-card">
                              <div className="frm-flex-between">
                                <span className="text-sm font-semi frm-doc-name">{s.name || s.title}</span>
                                <StatusBadge status={s.status} t={t} />
                              </div>
                              {s.description && <div className="text-xs text-muted frm-doc-meta mt-4">{s.description}</div>}
                            </FieldCard>
                          ))}
                        </div>
                  )}
                </div>

                {/* Change Orders */}
                <div className="frm-doc-section">
                  <div className="project-section-header" onClick={() => toggleSection("cos")}>
                    <span>{t("Change Orders")} ({projectCOs.length})</span>
                    <span>{openSections.cos ? "▾" : "▸"}</span>
                  </div>
                  {openSections.cos && (
                    projectCOs.length === 0
                      ? <div className="text-xs text-muted">{t("No change orders")}</div>
                      : <div className="frm-doc-list">
                          {projectCOs.map(c => (
                            <FieldCard key={c.id} className="frm-doc-card">
                              <div className="frm-flex-between">
                                <span className="text-sm font-semi frm-doc-name">{c.title || c.description}</span>
                                <span className="text-sm font-mono frm-amber">{fmt(c.amount)}</span>
                              </div>
                              <div className="text-xs text-muted frm-doc-meta mt-4">{c.status}</div>
                            </FieldCard>
                          ))}
                        </div>
                  )}
                </div>

                {/* RFIs */}
                <div className="frm-doc-section">
                  <div className="frm-doc-rfi-header project-section-header">
                    <div className="frm-flex-gap" style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleSection("rfis")}>
                      <span>{t("RFIs")} ({projectRFIs.length})</span>
                      <span>{openSections.rfis ? "▾" : "▸"}</span>
                    </div>
                    <FieldButton variant="primary" size="sm" t={t}
                      onClick={() => { setShowRfiModal(true); setRfiFormData({ subject: "", description: "", drawingRef: "" }); }}
                    >
                      <FileQuestion size={13} />
                      {t("Submit RFI")}
                    </FieldButton>
                  </div>
                  {openSections.rfis && (
                    projectRFIs.length === 0
                      ? <EmptyState icon={FileText} heading={t("No Documents")} message={t("No documents uploaded for this project.")} t={t} />
                      : <div className="frm-doc-list">
                          {projectRFIs.map(r => (
                            <FieldCard key={r.id} className="frm-doc-card">
                              <div className="frm-flex-between">
                                <span className="text-sm font-semi frm-doc-name">{r.subject || r.title || r.question}</span>
                                <StatusBadge status={r.status} t={t} />
                              </div>
                              {r.drawingRef && <div className="text-xs text-muted frm-doc-meta mt-4">Ref: {r.drawingRef}</div>}
                              {r.response && <div className="text-xs text-muted frm-doc-meta mt-4">{t("Response")}: {r.response}</div>}
                            </FieldCard>
                          ))}
                        </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ SITE LOGISTICS TAB ═══ */}
            {foremanTab === "site" && (
              <div className="emp-content">
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <div className="flex gap-8" style={{ alignItems: "center" }}>
                    <HardHat size={18} style={{ color: "var(--amber)" }} />
                    <div>
                      <div className="section-title" style={{ fontSize: 16 }}>{t("Site Logistics")}</div>
                      <div className="text-xs text-muted">{t("Daily checklist")} · {today}</div>
                    </div>
                  </div>
                  <span className={`badge ${logCheckedCount === LOGISTICS_ITEMS.length ? "badge-green" : logCheckedCount > 0 ? "badge-amber" : "badge-red"}`} style={{ fontSize: 11 }}>
                    {logCheckedCount}/{LOGISTICS_ITEMS.length}
                  </span>
                </div>

                {criticalUnchecked.length > 0 && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                    <div className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
                      <AlertTriangle size={14} style={{ color: "var(--red)" }} />
                      <span className="text-sm font-semi" style={{ color: "var(--red)" }}>{t("Critical items need attention — PM notified")}</span>
                    </div>
                    {criticalUnchecked.map(i => (
                      <div key={i.id} className="text-xs text-muted" style={{ marginLeft: 22 }}>• {i.label}</div>
                    ))}
                  </div>
                )}

                <div className="flex-col gap-6">
                  {LOGISTICS_ITEMS.map(item => {
                    const checked = !!todayLog[item.id];
                    return (
                      <div key={item.id} style={{ background: checked ? "rgba(16,185,129,0.07)" : item.critical && !checked ? "rgba(239,68,68,0.04)" : "var(--card)", border: `1px solid ${checked ? "var(--green)" : item.critical && !checked ? "var(--red)" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                        onClick={() => {
                          const updated = {
                            ...siteLogistics,
                            [projLogKey]: { ...todayLog, [item.id]: !checked, date: today, projectId: selectedProjectId },
                          };
                          saveSiteLogistics(updated);
                          if (item.critical && checked) {
                            show(`⚠️ ${item.label} — unchecked. PM alerted.`, "warn");
                          } else if (!checked) {
                            show(`✓ ${item.label}`, "ok");
                          }
                        }}
                      >
                        {checked ? <CheckSquare size={20} style={{ color: "var(--green)", flexShrink: 0 }} /> : <Square size={20} style={{ color: "var(--text3)", flexShrink: 0 }} />}
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <span className="text-sm" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{item.label}</span>
                          {item.critical && !checked && (
                            <span className="badge badge-red" style={{ fontSize: 9, marginLeft: 8 }}>Critical</span>
                          )}
                        </div>
                        <span className={`badge ${checked ? "badge-green" : item.critical ? "badge-red" : "badge-muted"}`} style={{ fontSize: 10 }}>
                          {checked ? "OK" : item.critical ? "Needed" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ NOTES TAB ═══ */}
            {foremanTab === "notes" && (
              <div className="emp-content">
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <div className="flex gap-8" style={{ alignItems: "center" }}>
                    <MessageSquare size={18} style={{ color: "var(--accent)" }} />
                    <div>
                      <div className="section-title" style={{ fontSize: 16 }}>{t("Team Notes")}</div>
                      <div className="text-xs text-muted">{t("Visible to all project team members")}</div>
                    </div>
                  </div>
                </div>

                {/* Compose */}
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <textarea
                    style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 14, resize: "vertical", marginBottom: 10 }}
                    placeholder={t("Post a field note to the project team...")}
                    value={foremanNoteText}
                    onChange={e => setForemanNoteText(e.target.value)}
                  />
                  <div className="flex gap-8">
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      if (!foremanNoteText.trim()) return;
                      const newNote = {
                        id: crypto.randomUUID(),
                        projectId: String(selectedProjectId),
                        text: foremanNoteText.trim(),
                        author: activeForeman.name,
                        role: "foreman",
                        category: "field",
                        pinned: false,
                        timestamp: new Date().toISOString(),
                      };
                      saveProjectNotes([newNote, ...(projectNotes || [])]);
                      setForemanNoteText("");
                      show(t("Field note posted"), "ok");
                    }} disabled={!foremanNoteText.trim()}>
                      {t("Post Field Note")}
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="flex gap-4 mb-12" style={{ overflowX: "auto" }}>
                  {["all", "pm", "field", "office"].map(f => {
                    const projNotes = (projectNotes || []).filter(n => String(n.projectId) === String(selectedProjectId));
                    const cnt = f === "all" ? projNotes.length : projNotes.filter(n => n.category === f).length;
                    const label = f === "all" ? "All" : f === "pm" ? "PM" : f === "field" ? "Field" : "Office";
                    return (
                      <button key={f} className={`btn btn-sm ${foremanNotesFilter === f ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setForemanNotesFilter(f)} style={{ whiteSpace: "nowrap" }}>
                        {label} ({cnt})
                      </button>
                    );
                  })}
                </div>

                {/* Notes list */}
                {(() => {
                  const projNotes = (projectNotes || []).filter(n => String(n.projectId) === String(selectedProjectId));
                  const filtered = foremanNotesFilter === "all" ? projNotes : projNotes.filter(n => n.category === foremanNotesFilter);
                  const pinned = filtered.filter(n => n.pinned);
                  const unpinned = filtered.filter(n => !n.pinned);
                  const visible = [...pinned, ...unpinned];

                  if (visible.length === 0) return (
                    <div className="empty-state" style={{ padding: "32px 20px" }}>
                      <div className="empty-icon"><MessageSquare size={28} /></div>
                      <div className="empty-text">{t("No notes yet")}</div>
                    </div>
                  );

                  const catBadge = (cat) => ({ pm: "badge-blue", field: "badge-amber", office: "badge-green" }[cat] || "badge-muted");
                  const catLabel = (cat) => ({ pm: "PM", field: "Field", office: "Office" }[cat] || cat);
                  const fmtTime = (ts) => { try { const d = new Date(ts); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ts; } };

                  return (
                    <div className="flex-col gap-8">
                      {visible.map(note => (
                        <div key={note.id} style={{ background: note.pinned ? "rgba(245,158,11,0.05)" : "var(--card)", border: `1px solid ${note.pinned ? "var(--amber)" : "var(--border)"}`, borderRadius: 10, padding: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div className="flex gap-8" style={{ alignItems: "center" }}>
                              {note.pinned && <Pin size={11} style={{ color: "var(--amber)" }} />}
                              <span className="font-semi text-sm">{note.author}</span>
                              <span className={`badge ${catBadge(note.category)}`} style={{ fontSize: 9 }}>{catLabel(note.category)}</span>
                            </div>
                            <div className="flex gap-6" style={{ alignItems: "center" }}>
                              <span className="text-xs text-muted">{fmtTime(note.timestamp)}</span>
                              <button onClick={() => saveProjectNotes(projectNotes.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "var(--amber)" : "var(--text3)", padding: "2px 4px" }}>
                                {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                              </button>
                              {note.author === activeForeman.name && (
                                <button onClick={() => saveProjectNotes(projectNotes.filter(n => n.id !== note.id))}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, padding: "2px 4px" }}>✕</button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.text}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
        </div>{/* close frm-content-pad */}

        <PortalTabBar
          tabs={FOREMAN_TABS}
          activeTab={foremanTab}
          onTabChange={setForemanTab}
          maxPrimary={5}
          t={t}
        />
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

      {/* Phase 2C: Photo Capture Modal */}
      {showPhotoCapture && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={e => { if (e.target === e.currentTarget) skipPhoto("dismissed"); }}>
          <div style={{ background: "var(--bg2, #1a1a2e)", borderRadius: 12, padding: 20, maxWidth: 400, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>📸 {t("Clock-In Photo")}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>{t("Take a photo to verify clock-in")}</div>
            <div style={{ background: "#000", borderRadius: 8, overflow: "hidden", marginBottom: 16, position: "relative", width: "100%", paddingBottom: "100%" }}>
              <video ref={photoVideoRef} autoPlay playsInline muted
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                onLoadedMetadata={() => { if (photoVideoRef.current) photoVideoRef.current.play(); }}
              />
              {photoStream && (() => {
                const video = photoVideoRef.current;
                if (video && photoStream) {
                  video.srcObject = photoStream;
                }
                return null;
              })()}
            </div>
            <canvas ref={photoCanvasRef} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => skipPhoto("skipped")} style={{ color: "var(--amber)" }}>
                {t("Skip")}
              </button>
              <button className="btn btn-primary" onClick={captureAndClockIn}
                style={{ padding: "10px 24px", fontSize: 14, background: "var(--green)", boxShadow: "0 2px 8px rgba(34,197,94,0.3)" }}>
                📸 {t("Capture & Clock In")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
