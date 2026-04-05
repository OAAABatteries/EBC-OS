import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { UserPlus, X, Search, CheckSquare, Square, Send, FileQuestion, ChevronDown, ChevronUp, MapPin, Clock, StopCircle, Package, Shield, AlertTriangle, CheckCircle, ClipboardList, HardHat, MessageSquare, Pin, PinOff, LayoutDashboard, Users, Clock as ClockIcon, MoreHorizontal, FileText, Calendar, Settings, BarChart3, ClipboardCheck } from "lucide-react";
import { PortalHeader, PortalTabBar, PremiumCard, FieldButton, FieldInput, EmptyState, StatusBadge, StatTile, AlertCard, FieldSignaturePad, CredentialCard } from "../components/field";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { FeatureGuide } from "../components/FeatureGuide";
import { ReportProblemModal } from "../components/ReportProblemModal";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import { PhaseTracker, getDefaultPhases } from "../components/PhaseTracker";
import { DrawingsTab } from "../components/field/DrawingsTab";
import { TmCaptureTab } from "./foreman/TmCaptureTab";
import { PunchTab } from "./foreman/PunchTab";
import { ProductionTab } from "./foreman/ProductionTab";
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
    theme, setTheme, show,
    tmTickets, setTmTickets,
    punchItems, setPunchItems,
    areas, setAreas,
    productionLogs, setProductionLogs,
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
  const network = useNetworkStatus();
  const [showReportProblem, setShowReportProblem] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [clockEntry, setClockEntry] = useState(null); // { clockIn, lat, lng, projectId }
  const [gpsStatus, setGpsStatus] = useState("");
  const [clockProjectSearch, setClockProjectSearch] = useState("");
  const [teamClocks, setCrewClocks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_teamClocks") || "{}"); } catch { return {}; }
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

  // ── Team tab state (Plan 03: FSCH-02, FSCH-03, CRED-04) ──
  const [pendingRequests, setPendingRequests] = useState([]);
  const [crewCerts, setCrewCerts] = useState([]);
  const [certFilter, setCertFilter] = useState("all"); // "all" | "expiring" | "expired"
  const [approvalSheet, setApprovalSheet] = useState(null); // { request, action: 'approve'|'deny' }
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);

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
        <header className="portal-login-header">
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

  // ── Fetch pending requests for Team tab (FSCH-02, FSCH-03) ──
  useEffect(() => {
    if (!activeForeman || !selectedProjectId) return;
    const fetchPendingRequests = async () => {
      try {
        const { supabase } = await import("../lib/supabase");
        const { data: shiftReqs } = await supabase
          .from("shift_requests")
          .select("*, available_shifts(*), employees:employee_id(name, role)")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        setPendingRequests(shiftReqs || []);
      } catch (err) {
        console.error("Failed to fetch pending requests:", err);
      }
    };
    fetchPendingRequests();
  }, [activeForeman, selectedProjectId, foremanTab]);

  // ── Fetch crew certifications (CRED-04) ──
  useEffect(() => {
    if (!activeForeman || foremanTab !== "team") return;
    const fetchCrewCerts = async () => {
      try {
        const { supabase } = await import("../lib/supabase");
        const crewIds = teamForProject.map(m => m.id);
        if (crewIds.length === 0) { setCrewCerts([]); return; }
        const { data } = await supabase
          .from("certifications")
          .select("*")
          .in("employee_id", crewIds)
          .order("expiry_date", { ascending: true });
        setCrewCerts(data || []);
      } catch (err) {
        console.error("Failed to fetch crew certs:", err);
      }
    };
    fetchCrewCerts();
  }, [activeForeman, foremanTab, teamForProject]);

  // ── Approval handler (FSCH-02, FSCH-03) ──
  const handleApproveRequest = async () => {
    if (!approvalSheet) return;
    setApprovalLoading(true);
    try {
      const { supabase } = await import("../lib/supabase");
      const newStatus = approvalSheet.action === "approve" ? "approved" : "denied";
      await supabase
        .from("shift_requests")
        .update({
          status: newStatus,
          reviewed_by: activeForeman.id,
          review_comment: approvalComment || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", approvalSheet.request.id);
      setPendingRequests(prev => prev.filter(r => r.id !== approvalSheet.request.id));
      setApprovalSheet(null);
      setApprovalComment("");
      show(newStatus === "approved" ? t("Request approved") : t("Request denied"), "ok");
    } catch (err) {
      show(t("Failed to update request"), "error");
    } finally {
      setApprovalLoading(false);
    }
  };

  // ── Cert filter helper (CRED-04) ──
  const filteredCrewCerts = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const byEmployee = {};
    crewCerts.forEach(cert => {
      if (!byEmployee[cert.employee_id]) byEmployee[cert.employee_id] = [];
      const expiry = cert.expiry_date ? new Date(cert.expiry_date) : null;
      const certStatus = !expiry ? "active" : expiry < now ? "expired" : expiry < in30 ? "expiring" : "active";
      byEmployee[cert.employee_id].push({ ...cert, computedStatus: certStatus });
    });
    const teamMembers = teamForProject.map(member => {
      const certs = byEmployee[member.id] || [];
      const activeCount = certs.filter(c => c.computedStatus === "active").length;
      const expiringCount = certs.filter(c => c.computedStatus === "expiring").length;
      const expiredCount = certs.filter(c => c.computedStatus === "expired").length;
      return { ...member, certs, activeCount, expiringCount, expiredCount };
    });
    if (certFilter === "expiring") return teamMembers.filter(m => m.expiringCount > 0);
    if (certFilter === "expired") return teamMembers.filter(m => m.expiredCount > 0);
    return teamMembers;
  }, [crewCerts, teamForProject, certFilter]);

  const pendingRequestCount = pendingRequests.length;

  const openPunchCount = (punchItems || []).filter(p => String(p.projectId) === String(selectedProjectId) && p.status === "open").length;
  const pendingTmCount = (tmTickets || []).filter(t => String(t.projectId) === String(selectedProjectId) && (t.status === "draft" || t.status === "submitted")).length;

  const foremanTabDefs = [
    // Primary (5 field-critical tabs + More)
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: false },
    { id: "production", label: t("Production"), icon: BarChart3, badge: false },
    { id: "tm", label: t("T&M"), icon: FileText, badge: pendingTmCount > 0 },
    { id: "team", label: "Team", icon: Users, badge: pendingRequestCount > 0 },
    // More overflow
    { id: "punchList", label: t("Punch List"), icon: ClipboardCheck, badge: openPunchCount > 0 },
    { id: "hours", label: "Hours", icon: ClockIcon, badge: false },
    { id: "materials", label: "Materials", icon: Package, badge: projectMatRequests.filter(r => r.status === "requested" || r.status === "pending").length > 0 },
    { id: "clock", label: "Clock", icon: ClockIcon, badge: false },
    { id: "jsa", label: "JSA", icon: Shield, badge: activeJsaCount > 0 },
    { id: "drawings", label: "Drawings", icon: FileText, badge: false },
    { id: "reports", label: "Daily Report", icon: ClipboardList, badge: (dailyReports || []).filter(r => r.projectId === selectedProjectId && r.date === new Date().toISOString().slice(0,10)).length > 0 },
    { id: "documents", label: "Documents", icon: FileQuestion, badge: rfiAlerts.length > 0 },
    { id: "settings", label: "Settings", icon: Settings, badge: false },
  ];

  // FSCH-04: Pull-based in-app alert. Foreman sees pending request alerts when opening Dashboard.
  // Push notification deferred to Phase 10.
  const foremanAlerts = useMemo(() => {
    const alerts = [];
    if (pendingRequestCount > 0) {
      alerts.push({ type: "info", message: t("{n} pending requests").replace("{n}", pendingRequestCount), timestamp: t("Today"), navigateTo: "team" });
    }
    if (pctUsed > 90) {
      alerts.push({ type: "error", message: t("Budget at {n}%").replace("{n}", pctUsed), timestamp: t("Today"), navigateTo: "hours" });
    }
    if (teamForProject.length > 0) {
      const clockedInCount = teamForProject.filter(c => teamClocks[c.id]).length;
      alerts.push({ type: "success", message: t("{n} crew on site").replace("{n}", clockedInCount), timestamp: t("Today"), navigateTo: "team" });
    }
    return alerts;
  }, [pendingRequestCount, pctUsed, teamForProject, teamClocks, lang]);

  return (
    <div className="employee-app">
      {/* Report Problem Modal */}
      {showReportProblem && (
        <ReportProblemModal
          reporter={activeForeman.name}
          projects={myProjects.length > 0 ? myProjects : projects}
          defaultProjectId={selectedProjectId}
          areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
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
        variant="foreman"
        userName={activeForeman.name}
        t={t}
        network={network}
        theme={theme}
        languageToggle={
          <button className="lang-toggle" onClick={() => setLang(lang === "en" ? "es" : "en")}>
            {lang === "en" ? "ES" : "EN"}
          </button>
        }
        logoutAction={
          <button className="settings-logout-sm" onClick={handleLogout}>{t("Logout")}</button>
        }
        projectSelector={myProjects.length > 1 ? (
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
        ) : undefined}
      />

      <div className="employee-body">

        {myProjects.length === 0 && foremanTab !== "settings" && (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-icon"><ClipboardList size={32} /></div>
            <div className="empty-text">{t("No projects assigned")}</div>
          </div>
        )}


        {/* ═══ SETTINGS TAB ═══ */}
        {foremanTab === "settings" && (
          <div className="settings-wrap">
            {/* Back button */}
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setForemanTab("dashboard")}>&#9664; {t("Back")}</button>
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
                        <div key={i} className="foreman-team-row" style={{ padding: "8px 12px", marginBottom: 4 }}>
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
                {/* Clock status hero — PremiumCard hero variant per D-08 */}
                <PremiumCard
                  variant="hero"
                  className={`foreman-dashboard-clock-hero${isClockedIn ? " foreman-dashboard-clock-hero--active" : ""}`}
                  onClick={() => setForemanTab("clock")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="foreman-dashboard-clock-status" style={{ color: isClockedIn ? "var(--green)" : "var(--text3)" }}>
                    {isClockedIn ? t("ON CLOCK") : t("OFF CLOCK")}
                  </div>
                  <div className="foreman-dashboard-clock-value">
                    {isClockedIn && clockEntry
                      ? (() => { const ms = Date.now() - new Date(clockEntry.clockIn).getTime(); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m`; })()
                      : "\u2014"}
                  </div>
                  <div className="foreman-dashboard-clock-hint">{t("TAP TO CLOCK IN/OUT")}</div>
                </PremiumCard>

                {/* KPI tiles row — 3 tiles per D-09 */}
                <div className="foreman-dashboard-stats">
                  <StatTile
                    label="BUDGET"
                    value={pctUsed != null ? `${pctUsed}%` : "\u2014"}
                    color={pctUsed > 90 ? "var(--accent)" : "var(--green)"}
                    onTap={() => setForemanTab("hours")}
                    t={t}
                  />
                  <StatTile
                    label="HOURS"
                    value={hoursUsed != null ? hoursUsed.toFixed(1) : "\u2014"}
                    color="var(--text)"
                    onTap={() => setForemanTab("hours")}
                    t={t}
                  />
                  <StatTile
                    label="CREW"
                    value={teamForProject.length}
                    color="var(--green)"
                    onTap={() => setForemanTab("team")}
                    t={t}
                  />
                </div>

                {/* Alerts feed per D-09 — actionable first (requests, budget), then informational (cert warnings) */}
                {foremanAlerts.length > 0 && (
                  <div className="foreman-dashboard-alerts">
                    <div className="foreman-dashboard-section-label">{t("ALERTS")}</div>
                    <div className="foreman-dashboard-alerts-list">
                      {foremanAlerts.slice(0, 3).map((alert, i) => (
                        <AlertCard
                          key={i}
                          type={alert.type}
                          message={alert.message}
                          timestamp={alert.timestamp}
                          onTap={() => setForemanTab(alert.navigateTo || "team")}
                          t={t}
                        />
                      ))}
                    </div>
                    {foremanAlerts.length > 3 && (
                      <button className="foreman-dashboard-view-all" onClick={() => setForemanTab("team")}>
                        {t("View All")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ DASHBOARD TAB (legacy project KPI view — preserved for reference, unreachable with new tab structure) ═══ */}
            {foremanTab === "dashboard-kpi-legacy" && (
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
                        <div key={i} className="foreman-team-row" style={{ padding: "8px 12px", marginBottom: 4 }}>
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

                    {/* Add team member — searchable dropdown */}
                    <div style={{ position: "relative", marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, position: "relative" }}>
                          <input
                            type="text"
                            placeholder={t("Search or select team member...")}
                            value={teamSearch || ""}
                            onChange={e => setCrewSearch(e.target.value)}
                            onFocus={() => setCrewSearch(teamSearch || "")}
                            style={{ width: "100%", padding: "10px 14px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, color: "var(--text)", fontSize: 14 }}
                          />
                          {/* Dropdown list */}
                          {teamSearch !== null && teamSearch !== undefined && (() => {
                            const q = (teamSearch || "").toLowerCase().trim();
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
                                  const isIn = !!teamClocks[c.id];
                                  const isAssigned = teamForProject.some(cp => cp.id === c.id);
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

                    {/* Currently clocked-in team */}
                    {(() => {
                      const clockedInIds = Object.keys(teamClocks).map(Number);
                      const clockedIn = clockedInIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
                      if (clockedIn.length === 0) return null;
                      return (
                        <div style={{ marginBottom: 16 }}>
                          <div className="text-xs text-muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("Clocked In")} ({clockedIn.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                            {clockedIn.map(c => {
                              const clockData = teamClocks[c.id];
                              const isAssigned = teamForProject.some(cp => cp.id === c.id);
                              const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                              const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                              return (
                                <div key={c.id} className="foreman-team-row" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, borderLeft: "3px solid var(--green)" }}>
                                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                    {c.name.split(" ").map(n => n[0]).join("")}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm font-semi">{c.name}</div>
                                    <div className="text-xs text-muted">
                                      {c.role || c.title || ""}{!isAssigned && <span style={{ color: "var(--amber)" }}> · {t("Other team")}</span>}
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

                    {/* Assigned team not yet clocked in */}
                    {(() => {
                      const notIn = teamForProject.filter(c => c.id !== activeForeman?.id && !teamClocks[c.id]);
                      if (notIn.length === 0) return null;
                      return (
                        <div>
                          <div className="text-xs text-muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("Not Clocked In")} ({notIn.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                            {notIn.map(c => {
                              const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                              const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                              return (
                                <div key={c.id} className="foreman-team-row" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
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

            {/* ═══ PROJECT KPI TAB (legacy — content merged into Dashboard Premium view, keeping for reference) ═══ */}
            {foremanTab === "project-kpi-legacy" && (() => {
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

                  {/* Phase 2B: Construction Stage with advance */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-xs text-muted">{t("Stage")}:</span>
                    {(() => {
                      const STAGES = [
                        { key: "pre-con", label: "Pre-Con", color: "#8b5cf6", progress: 5 },
                        { key: "mobilize", label: "Mobilize", color: "#3b82f6", progress: 10 },
                        { key: "demo", label: "Demo", color: "#ef4444", progress: 20 },
                        { key: "framing", label: "Framing", color: "#f59e0b", progress: 40 },
                        { key: "board", label: "Board", color: "#f97316", progress: 60 },
                        { key: "tape", label: "Tape/Finish", color: "#10b981", progress: 80 },
                        { key: "punch", label: "Punch", color: "#06b6d4", progress: 90 },
                        { key: "closeout", label: "Closeout", color: "#6366f1", progress: 100 },
                      ];
                      const currentIdx = STAGES.findIndex(s => s.key === selectedProject.constructionStage);
                      const current = currentIdx >= 0 ? STAGES[currentIdx] : null;
                      const next = currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
                      return (
                        <>
                          {STAGES.map((s, i) => (
                            <div key={s.key} style={{
                              width: 24, height: 6, borderRadius: 3,
                              background: i <= currentIdx ? s.color : "rgba(255,255,255,0.1)"
                            }} title={s.label} />
                          ))}
                          <span style={{ fontWeight: 700, color: current?.color || "#888", marginLeft: 4 }}>
                            {current?.label || t("Not Set")}
                          </span>
                          {next && (
                            <button className="btn btn-sm" style={{ marginLeft: "auto", fontSize: 10, padding: "2px 10px", background: next.color + "22", color: next.color, border: `1px solid ${next.color}44` }}
                              onClick={() => {
                                const now = new Date().toISOString();
                                const entry = { from: selectedProject.constructionStage || null, to: next.key, changedBy: activeForeman.name, changedById: activeForeman.id, changedAt: now };
                                const history = [...(selectedProject.stageHistory || []), entry];
                                setProjects(prev => prev.map(p => String(p.id) === String(selectedProjectId) ? { ...p, constructionStage: next.key, stageHistory: history, stageUpdatedAt: now, stageUpdatedBy: activeForeman.name, progress: next.progress || p.progress } : p));
                                show(`${t("Stage")} → ${next.label}`, "ok");
                              }}>
                              → {next.label}
                            </button>
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
                      <div className="foreman-kpi-value" style={{ fontSize: 18 }}>{teamForProject.length}</div>
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

                  {/* ── RFI Alerts (read-only, field visibility) ── */}
                  {rfiAlerts.length > 0 && (
                    <div className="foreman-kpi-card" style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <FileQuestion size={16} style={{ color: "var(--amber, #f59e0b)" }} />
                        <div className="foreman-kpi-label" style={{ margin: 0 }}>
                          {t("RFIs Needing Attention")} ({rfiAlerts.length})
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {rfiAlerts.slice(0, 5).map(r => (
                          <div key={r.id} style={{
                            padding: "8px 12px", borderRadius: 8,
                            background: r.status === "answered" || r.status === "closed"
                              ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                            border: `1px solid ${r.status === "answered" || r.status === "closed"
                              ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              <div className="text-sm font-semi" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.number ? `${r.number}: ` : ""}{r.subject || r.title || r.question}
                              </div>
                              <span className={`badge ${r.status === "answered" || r.status === "closed" ? "badge-green" : "badge-amber"}`} style={{ fontSize: 9, flexShrink: 0 }}>
                                {r.status === "answered" || r.status === "closed" ? t("ANSWERED") : t("OPEN")}
                              </span>
                            </div>
                            {(r.status === "answered" || r.status === "closed") && r.response && (
                              <div className="text-xs" style={{ marginTop: 4, color: "var(--green, #22c55e)", fontWeight: 500 }}>
                                {t("Response")}: {r.response.length > 120 ? r.response.slice(0, 120) + "..." : r.response}
                              </div>
                            )}
                            {r.drawingRef && (
                              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                                {t("Drawing ref")}: {r.drawingRef}
                              </div>
                            )}
                          </div>
                        ))}
                        {rfiAlerts.length > 5 && (
                          <button className="cal-nav-btn" style={{ fontSize: 11, alignSelf: "center" }}
                            onClick={() => setForemanTab("documents")}>
                            {t("View all")} {rfiAlerts.length} {t("RFIs")} →
                          </button>
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

                  {/* Add team member dropdown */}
                  {showCrewAdd && (
                    <div style={{ marginBottom: 14, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                        <Search size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
                        <input
                          ref={teamAddRef}
                          autoFocus
                          type="text"
                          placeholder={t("Search employees...")}
                          value={teamAddSearch}
                          onChange={e => setCrewAddSearch(e.target.value)}
                          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 14 }}
                        />
                        <button onClick={() => setShowCrewAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 2 }}>
                          <X size={14} />
                        </button>
                      </div>
                      {teamAddFiltered.length === 0 ? (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text3)" }}>{t("No employees found")}</div>
                      ) : (
                        teamAddFiltered.map(emp => (
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
                      <div className="empty-text">{t("No team assigned")}</div>
                      <div className="text-xs text-muted" style={{ marginTop: 6 }}>{t("Tap Add Crew to add members")}</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {teamForProject.map(c => (
                        <div key={c.id} className="foreman-team-row">
                          <div>
                            <div className="foreman-team-name">{c.name}</div>
                            <div className="foreman-team-role">{t(c.role)}</div>
                            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                              {DAY_KEYS.filter(d => c.days?.[d]).map(d => t(d.charAt(0).toUpperCase() + d.slice(1))).join(", ")}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div className="foreman-team-hours">{fmtHours(c.todayHours)}</div>
                            <div className="text-xs text-muted">{t("Hours Today")}</div>
                            <div className="text-xs text-dim" style={{ marginTop: 2 }}>
                              {fmtHours(c.weekHours)} {t("This Week").toLowerCase()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {extraCrew.map(c => (
                        <div key={c.id} className="foreman-team-row" style={{ borderLeft: "3px solid var(--amber)" }}>
                          <div>
                            <div className="foreman-team-name">{c.name}</div>
                            <div className="foreman-team-role">{t(c.role)}</div>
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

                  {/* ── Pending Requests section (FSCH-02, FSCH-03) per D-13 ── */}
                  <div className="foreman-team-section">
                    <div className="foreman-team-section-label">
                      {t("PENDING REQUESTS")} {pendingRequests.length > 0 && <span className="foreman-team-count">{pendingRequests.length}</span>}
                    </div>
                    {pendingRequests.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        heading={t("No pending requests")}
                        message={t("Your crew is all set")}
                        t={t}
                      />
                    ) : (
                      <div className="foreman-team-requests-list">
                        {pendingRequests.map(req => (
                          <PremiumCard variant="info" key={req.id} className="foreman-team-request-card">
                            <div className="foreman-team-request-header">
                              <div className="foreman-team-request-name">{req.employees?.name || t("Unknown")}</div>
                              <div className={`foreman-team-request-type${req.type === "time_off" ? " foreman-team-request-type--timeoff" : ""}`}>
                                {req.type === "time_off" ? t("TIME OFF") : t("SHIFT REQUEST")}
                              </div>
                            </div>
                            <div className="foreman-team-request-details">
                              {req.available_shifts?.date && <span>{req.available_shifts.date}</span>}
                              {req.available_shifts?.start_time && req.available_shifts?.end_time && (
                                <span>{req.available_shifts.start_time} - {req.available_shifts.end_time}</span>
                              )}
                            </div>
                            <div className="foreman-team-request-actions">
                              <FieldButton variant="primary" onClick={() => { setApprovalSheet({ request: req, action: "approve" }); setApprovalComment(""); }}>
                                {t("Approve Request")}
                              </FieldButton>
                              <FieldButton variant="danger" onClick={() => { setApprovalSheet({ request: req, action: "deny" }); setApprovalComment(""); }}>
                                {t("Deny Request")}
                              </FieldButton>
                            </div>
                          </PremiumCard>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Crew Certifications section (CRED-04) per D-17, D-18, D-19 ── */}
                  <div className="foreman-team-section">
                    <div className="foreman-team-section-label">{t("CREW CERTIFICATIONS")}</div>

                    {/* Filter chips per D-18 */}
                    <div className="foreman-team-cert-filters">
                      {["all", "expiring", "expired"].map(filter => (
                        <button
                          key={filter}
                          className={`foreman-team-cert-chip${certFilter === filter ? " foreman-team-cert-chip--active" : ""}`}
                          onClick={() => setCertFilter(filter)}
                        >
                          {t(filter === "all" ? "All" : filter === "expiring" ? "Expiring" : "Expired")}
                        </button>
                      ))}
                    </div>

                    {/* Cert rows per D-18 — grouped by crew member */}
                    {filteredCrewCerts.length === 0 ? (
                      <EmptyState
                        icon={Shield}
                        heading={certFilter === "expiring" ? t("No expiring credentials") : certFilter === "expired" ? t("No expired credentials") : t("No credentials found")}
                        message={certFilter === "expired" ? t("All crew credentials are current") : t("Your crew certs are up to date")}
                        t={t}
                      />
                    ) : (
                      <div className="foreman-team-cert-list">
                        {filteredCrewCerts.map(member => (
                          <PremiumCard variant="info" key={member.id} className="foreman-team-cert-member">
                            <div className="foreman-team-cert-member-header">
                              <div className="foreman-team-cert-member-name">{member.name}</div>
                              <div className="foreman-team-cert-summary">
                                {member.activeCount > 0 && <span className="foreman-team-cert-count foreman-team-cert-count--active">{t("{n} active").replace("{n}", member.activeCount)}</span>}
                                {member.expiringCount > 0 && <span className="foreman-team-cert-count foreman-team-cert-count--expiring">{t("{n} expiring").replace("{n}", member.expiringCount)}</span>}
                                {member.expiredCount > 0 && <span className="foreman-team-cert-count foreman-team-cert-count--expired">{t("{n} expired").replace("{n}", member.expiredCount)}</span>}
                              </div>
                            </div>
                            {/* Individual cert cards — view-only per D-19 */}
                            {member.certs.map(cert => (
                              <CredentialCard
                                key={cert.id}
                                certName={cert.cert_type}
                                issuedDate={cert.issue_date}
                                expiryDate={cert.expiry_date}
                                issuingOrg={cert.issuing_org}
                                status={cert.computedStatus}
                                t={t}
                              />
                            ))}
                          </PremiumCard>
                        ))}
                      </div>
                    )}
                  </div>
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
                {teamForProject.length === 0 ? (
                  <div className="text-sm text-muted">{t("No team assigned")}</div>
                ) : (
                  <div className="foreman-kpi-card">
                    <div className="foreman-cost-row" style={{ fontWeight: 600, fontSize: 10, textTransform: "uppercase", color: "var(--text3)" }}>
                      <span style={{ flex: 2 }}>{t("Crew")}</span>
                      <span style={{ flex: 1, textAlign: "right" }}>{t("Role")}</span>
                      <span style={{ flex: 1, textAlign: "right" }}>{t("Hours Today")}</span>
                      <span style={{ flex: 1, textAlign: "right" }}>{t("Hours This Week")}</span>
                    </div>
                    {teamForProject.map(c => (
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
                        {fmtHours(teamForProject.reduce((s, c) => s + c.todayHours, 0))}
                      </span>
                      <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                        {fmtHours(teamForProject.reduce((s, c) => s + c.weekHours, 0))}
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Priority")}</label>
                        <select className="settings-select" value={matForm.urgency} onChange={e => setMatForm(f => ({ ...f, urgency: e.target.value }))}>
                          <option value="normal">{t("Normal")}</option>
                          <option value="urgent">⚡ {t("Urgent")}</option>
                          <option value="emergency">🚨 {t("Emergency")}</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("Needed By")}</label>
                        <input type="date" className="login-input" value={matForm.neededBy} onChange={e => setMatForm(f => ({ ...f, neededBy: e.target.value }))} />
                      </div>
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
                      <div key={req.id} className="mat-request-card" style={{ borderLeft: req.urgency === "emergency" ? "3px solid var(--red)" : req.urgency === "urgent" ? "3px solid var(--amber)" : undefined }}>
                        <div className="flex-between mb-4">
                          <span className="text-sm font-semi">
                            {req.urgency === "emergency" ? "🚨 " : req.urgency === "urgent" ? "⚡ " : ""}{req.material}
                          </span>
                          <span className={`badge mat-status-${req.status}`}>
                            {req.status === "on_order" ? t("On Order") : req.status === "supplier_confirmed" ? t("Supplier OK") :
                             req.status === "assigned" ? t("Assigned") : req.status === "picked_up" ? t("Picked Up") :
                             req.status === "confirmed" ? t("Confirmed") :
                             t(req.status.charAt(0).toUpperCase() + req.status.slice(1))}
                          </span>
                        </div>
                        <div className="text-xs text-muted mb-4">
                          {req.qty} {req.unit} · {t("Requester")}: {req.employeeName}
                          {req.neededBy && <span> · {t("Need by")} {req.neededBy}</span>}
                          {req.fulfillmentType && <span> · {req.fulfillmentType === "supplier" ? "📦" : "🚛"}</span>}
                        </div>
                        {req.notes && <div className="text-xs text-dim mb-4">{req.notes}</div>}
                        {/* Confirm receipt when delivered */}
                        {req.status === "delivered" && !req.confirmedBy && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-primary btn-sm" style={{ background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                              onClick={() => handleForemanConfirm(req.id, "")}>
                              ✓ {t("Confirm Receipt")}
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "var(--amber)" }}
                              onClick={() => { const exc = prompt(t("Describe issue") + ":"); if (exc) handleForemanConfirm(req.id, exc); }}>
                              ⚠ {t("Issue")}
                            </button>
                          </div>
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
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{(j.teamSignOn || []).length} {t("signed")}</span>
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
                        </button>
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
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                          <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); }}>{t("← Back")}</button>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("Crew Roll Call")}</span>
                        </div>

                        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>{proj?.name} · {rcJsa?.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
                          {new Date().toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </div>

                        {/* Crew list */}
                        {allTeam.length === 0 ? (
                          <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--text3)" }}>
                            {t("No team scheduled. Add team members below.")}
                          </div>
                        ) : allTeam.map(c => (
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

                        {/* Add team */}
                        {rcAddingCrew ? (
                          <select className="form-select" style={{ fontSize: 12, marginTop: 8 }} autoFocus
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
                          <button className="cal-nav-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setRcAddingCrew(true)}>
                            + {t("Add Crew")}
                          </button>
                        )}

                        {/* Start Sign-On */}
                        <button className="btn btn-primary" style={{ width: "100%", marginTop: 20, padding: "14px", fontSize: 16 }}
                          disabled={Object.values(rcSelected).filter(Boolean).length === 0}
                          onClick={() => {
                            const queue = teamForProject.filter(c => rcSelected[c.id]).map(c => ({ employeeId: c.id, name: c.name }));
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
                              // All team signed — move to supervisor sign-off
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
                            {(rcJsa?.teamSignOn || []).length} {t("team members signed")}
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
                          {(finalJsa?.teamSignOn || []).length} {t("team members signed")} · {finalJsa?.title}
                        </div>

                        {/* Signed team list */}
                        <div style={{ textAlign: "left", marginBottom: 20 }}>
                          {(finalJsa?.teamSignOn || []).map((c, i) => (
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
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{(jsa.teamSignOn || []).length}</div>
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
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Crew Sign-On")} ({(jsa.teamSignOn || []).length})</div>
                        {(jsa.teamSignOn || []).map((c, i) => (
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
                <DrawingsTab
                  readOnly={false}
                  projectFilter={selectedProjectId}
                  t={t}
                />
              </div>
            )}

            {/* ═══ LOOK-AHEAD TAB (Read-Only 14-Day View) ═══ */}
            {foremanTab === "lookahead" && (
              <div className="emp-content">
                <div className="section-header">
                  <div className="section-title" style={{ fontSize: 16 }}>{t("14-Day Look-Ahead")}</div>
                </div>
                <div className="text-xs text-muted" style={{ marginBottom: 12 }}>
                  {t("Upcoming milestones, inspections, and deadlines for this project. Read-only — contact PM for changes.")}
                </div>

                {lookAheadEvents.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 20px" }}>
                    <div className="empty-text">{t("No events in the next 14 days")}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 6 }}>{t("The PM will add milestones, inspections, and deadlines here.")}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                            <div style={{
                              fontSize: 12, fontWeight: 700, padding: "6px 0", marginTop: 8,
                              color: isToday ? "var(--amber, #f59e0b)" : isTomorrow ? "var(--accent)" : "var(--text2)",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}>
                              {dayLabel}
                            </div>
                            {events.map(ev => {
                              const typeColors = {
                                inspection: "var(--red)", milestone: "var(--green, #22c55e)",
                                delivery: "var(--accent)", meeting: "var(--purple, #8b5cf6)",
                                task: "var(--text2)", deadline: "var(--red)",
                              };
                              const color = typeColors[ev.type] || "var(--text2)";
                              return (
                                <div key={ev.id} className="card" style={{ padding: "10px 14px", marginTop: 4 }}>
                                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <div style={{
                                      width: 4, height: 32, borderRadius: 2, background: color, flexShrink: 0,
                                    }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div className="text-sm font-semi" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {ev.title}
                                      </div>
                                      <div className="text-xs text-muted">
                                        {ev.type && <span style={{ textTransform: "capitalize" }}>{t(ev.type)}</span>}
                                        {ev.startTime ? ` · ${ev.startTime}` : ""}
                                        {ev.start_time ? ` · ${ev.start_time}` : ""}
                                        {ev.location ? ` · ${ev.location}` : ""}
                                      </div>
                                      {ev.notes && <div className="text-xs text-dim" style={{ marginTop: 2 }}>{ev.notes.length > 80 ? ev.notes.slice(0, 80) + "..." : ev.notes}</div>}
                                    </div>
                                    {ev.status && ev.status !== "scheduled" && (
                                      <span className={`badge ${ev.status === "completed" ? "badge-green" : "badge-amber"}`} style={{ fontSize: 9 }}>
                                        {t(ev.status)}
                                      </span>
                                    )}
                                  </div>
                                </div>
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

            {/* ═══ PRODUCTION TAB ═══ */}
            {foremanTab === "production" && (
              <ProductionTab
                productionLogs={productionLogs}
                setProductionLogs={setProductionLogs}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                setAreas={setAreas}
                projectId={selectedProjectId}
                employees={employees}
                t={t}
              />
            )}

            {/* ═══ T&M TAB ═══ */}
            {foremanTab === "tm" && (
              <TmCaptureTab
                tmTickets={tmTickets}
                setTmTickets={setTmTickets}
                projects={projects}
                employees={employees}
                projectId={selectedProjectId}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                t={t}
              />
            )}

            {/* ═══ PUNCH LIST TAB ═══ */}
            {foremanTab === "punchList" && (
              <PunchTab
                punchItems={punchItems}
                setPunchItems={setPunchItems}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                employees={employees}
                projectId={selectedProjectId}
                t={t}
              />
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

      {activeForeman && (
        <PortalTabBar
          tabs={foremanTabDefs}
          activeTab={foremanTab}
          onTabChange={setForemanTab}
          maxPrimary={4}
          t={t}
        />
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

      {/* Approval bottom sheet per D-15 */}
      {approvalSheet && (
        <>
          <div className="field-tab-sheet-overlay" onClick={() => setApprovalSheet(null)} />
          <div className="foreman-approval-sheet">
            <div className="foreman-approval-sheet-header">
              <div className="foreman-approval-sheet-title">
                {approvalSheet.action === "approve" ? t("Approve Request") : t("Deny Request")}
              </div>
              <button className="foreman-approval-sheet-close" onClick={() => setApprovalSheet(null)}>
                {t("Go Back")}
              </button>
            </div>
            <div className="foreman-approval-sheet-body">
              <div className="foreman-approval-sheet-summary">
                <div className="text-base font-bold">{approvalSheet.request.employees?.name}</div>
                <div className="text-sm text-muted">
                  {approvalSheet.request.type === "time_off" ? t("TIME OFF") : t("SHIFT REQUEST")}
                  {approvalSheet.request.available_shifts?.date && ` — ${approvalSheet.request.available_shifts.date}`}
                </div>
              </div>
              <FieldInput
                label={t("Add comment (optional)")}
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                inputMode="text"
                placeholder={t("Add comment (optional)")}
                t={t}
              />
              <FieldButton
                variant={approvalSheet.action === "approve" ? "primary" : "danger"}
                onClick={handleApproveRequest}
                loading={approvalLoading}
                className="foreman-approval-sheet-confirm"
              >
                {approvalSheet.action === "approve" ? t("Confirm Approval") : t("Confirm Denial")}
              </FieldButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
