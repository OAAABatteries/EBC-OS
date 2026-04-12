import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { UserPlus, X, Search, CheckSquare, Square, Send, FileQuestion, ChevronDown, ChevronUp, MapPin, Clock, StopCircle, Package, Shield, AlertTriangle, CheckCircle, ClipboardList, HardHat, MessageSquare, Pin, PinOff, Home, Users, Clock as ClockIcon, MoreHorizontal, FileText, Calendar, Settings, BarChart3, ClipboardCheck, PenLine } from "lucide-react";
import { PortalHeader, PortalTabBar, PremiumCard, FieldButton, FieldInput, EmptyState, StatusBadge, StatTile, AlertCard, FieldSignaturePad, CredentialCard, PhotoCapture, Skeleton, LanguageToggle } from "../components/field";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useNotifications } from "../hooks/useNotifications";
import { useFormDraft } from "../hooks/useFormDraft";
import { FeatureGuide } from "../components/FeatureGuide";
import { ReportProblemModal } from "../components/ReportProblemModal";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import { PhaseTracker, getDefaultPhases } from "../components/PhaseTracker";
import { DrawingsTab } from "../components/field/DrawingsTab";
import { TmCaptureTab } from "./foreman/TmCaptureTab";
import { PunchTab } from "./foreman/PunchTab";
import { ProductionTab } from "./foreman/ProductionTab";
import { DeliveriesTab } from "./DeliveriesTab";
import { DecisionLogTab } from "./DecisionLogTab";
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
    decisionLog, setDecisionLog,
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;

  // ── session — use main auth if available ──
  const mainAuth = app.auth;
  const [activeForeman, setActiveForeman] = useState(() => {
    if (mainAuth && mainAuth.role === "foreman") {
      // Look up full employee record so flags like trustedLead carry over
      // to impersonation/preview sessions. Fall back to a synthesized stub.
      const empRecord = (employees || []).find(e => String(e.id) === String(mainAuth.id) || e.email === mainAuth.email);
      if (empRecord) {
        return { ...empRecord, role: "Foreman" };
      }
      return { id: mainAuth.id, name: mainAuth.name, email: mainAuth.email, role: "Foreman", title: mainAuth.title, active: true, phone: "", notifications: { schedule: true, materials: true, deliveries: true }, trustedLead: false };
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
  const { requestPermission, sendNotification } = useNotifications();
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

  // ── Inline labor edit state ──
  const [editingLaborId, setEditingLaborId] = useState(null);
  const [editingLaborHours, setEditingLaborHours] = useState("");

  // ── Bulk Roll Call state ──
  const [rollCallMode, setRollCallMode] = useState(false);
  const [rollCallSelected, setRollCallSelected] = useState({});

  // ── Labor Entry state ──
  const [showLaborEntry, setShowLaborEntry] = useState(false);
  const [bulkLaborMode, setBulkLaborMode] = useState(true); // default to bulk
  const [bulkLaborSelected, setBulkLaborSelected] = useState({});
  const [laborEntries, setLaborEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_laborEntries") || "[]"); } catch { return []; }
  });
  const [laborForm, setLaborForm, { clearDraft: clearLaborDraft }] = useFormDraft(
    `labor_entry_${activeForeman?.id || "anon"}`,
    { employeeId: "", areaId: "", costCode: "framing", hours: "", payType: "regular", notes: "" }
  );
  const COST_CODES = ["framing", "board", "tape", "finish", "ACT", "demo", "cleanup", "general"];
  const PAY_TYPES = ["regular", "overtime", "doubletime"];

  // ── Submit RFI modal ──
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiFormData, setRfiFormData] = useState({ subject: "", description: "", drawingRef: "" });

  // ── daily report form state ──
  const EMPTY_REPORT_FORM = {
    date: new Date().toISOString().slice(0, 10),
    isOutdoor: false,
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
  const [reportForm, setReportForm, { clearDraft: clearReportDraft }] = useFormDraft(
    `daily_report_${activeForeman?.id || "anon"}_${selectedProjectId || "none"}`,
    { ...EMPTY_REPORT_FORM }
  );
  const [showReportForm, setShowReportForm] = useState(false);
  const [teamSearch, setCrewSearch] = useState("");
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);
  const [reportCrewAdding, setReportCrewAdding] = useState(false);

  // ── Team tab state (Plan 03: FSCH-02, FSCH-03, CRED-04) ──
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [crewCerts, setCrewCerts] = useState([]);
  const [certsLoading, setCertsLoading] = useState(false);
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

  // Phase 2C: photo capture state + PPE confirmation
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoStream, setPhotoStream] = useState(null);
  const [ppeConfirmed, setPpeConfirmed] = useState(false);
  const [clockInBlocked, setClockInBlocked] = useState(null); // null | "too_early" | string reason
  const photoVideoRef = useRef(null);
  const photoCanvasRef = useRef(null);

  /**
   * Clock-in time gate: block clock-in if more than 5 min before shift start.
   * Uses project schedule or defaults to 6:00 AM.
   */
  const getShiftStartToday = () => {
    // Try to find today's shift for this project from schedule/calendar
    const todayStr = new Date().toISOString().slice(0, 10);
    const projSchedule = (mySchedule || []).find(s =>
      String(s.projectId) === String(selectedProjectId) && s.date === todayStr
    );
    if (projSchedule?.start_time) return projSchedule.start_time; // "HH:MM"
    // Default construction start time
    return "06:00";
  };

  const isClockInAllowed = () => {
    const shiftStart = getShiftStartToday();
    const [h, m] = shiftStart.split(":").map(Number);
    const now = new Date();
    const shiftDate = new Date(now);
    shiftDate.setHours(h, m, 0, 0);
    const diffMs = shiftDate.getTime() - now.getTime();
    const diffMin = diffMs / 60000;
    // Allow clock-in 5 min before shift start, or anytime after
    return { allowed: diffMin <= 5, minutesUntil: Math.ceil(diffMin), shiftStart };
  };

  const handleClockIn = async () => {
    // Time gate check
    const { allowed, minutesUntil, shiftStart } = isClockInAllowed();
    if (!allowed) {
      setClockInBlocked(`${t("Clock-in opens 5 min before shift")} (${shiftStart}). ${t("Available in")} ${minutesUntil - 5} ${t("min")}.`);
      return;
    }
    setClockInBlocked(null);
    setPpeConfirmed(false);
    // Phase 2C: prompt for photo + PPE before clock-in
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
      ppeConfirmed: ppeConfirmed,
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
    const lunchDeducted = rawHours >= 6 ? 0.5 : 0;
    const totalHours = +(rawHours - lunchDeducted).toFixed(2);
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
      lunchDeducted,
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
    const lunchNote = lunchDeducted > 0 ? ` (${rawHours.toFixed(1)}h - 30m ${t("lunch")} = ${totalHours}h)` : "";
    show?.(`${t("Clocked out")} · ${totalHours}h${lunchNote} ✓`);
  };

  // ── team clock-in/out ──
  const persistTeamClocks = (updated) => {
    setCrewClocks(updated);
    localStorage.setItem("ebc_teamClocks", JSON.stringify(updated));
  };

  const handleCrewClockIn = async (empId) => {
    const loc = await getLocation();
    const now = new Date();
    const entry = { clockIn: now.toISOString(), lat: loc?.lat || null, lng: loc?.lng || null, projectId: selectedProjectId };
    persistTeamClocks({ ...teamClocks, [empId]: entry });
    const emp = employees.find(e => e.id === empId);
    show?.(`${emp?.name || "Crew"} ${t("clocked in")} ✓`);

    // Late arrival check: 15+ min after shift start → flag it
    const shiftStart = getShiftStartToday();
    const [h, m] = shiftStart.split(":").map(Number);
    const shiftDate = new Date(now); shiftDate.setHours(h, m, 0, 0);
    const lateMinutes = Math.round((now.getTime() - shiftDate.getTime()) / 60000);
    if (lateMinutes >= 15) {
      // Track late arrivals in localStorage for repeat-offender detection
      const lateLog = JSON.parse(localStorage.getItem("ebc_lateArrivals") || "{}");
      const key = empId;
      if (!lateLog[key]) lateLog[key] = [];
      lateLog[key].push({ date: now.toISOString().slice(0, 10), minutes: lateMinutes, projectId: selectedProjectId });
      // Keep last 30 entries per employee
      if (lateLog[key].length > 30) lateLog[key] = lateLog[key].slice(-30);
      localStorage.setItem("ebc_lateArrivals", JSON.stringify(lateLog));
      const recentLates = lateLog[key].filter(l => {
        const d = new Date(l.date); const ago = (Date.now() - d.getTime()) / 86400000;
        return ago <= 30;
      });
      const isRepeat = recentLates.length >= 3;
      show?.(`⚠️ ${emp?.name || "Crew"} ${t("is")} ${lateMinutes} ${t("min late")}${isRepeat ? ` — ${t("REPEAT")} (${recentLates.length}x ${t("this month")})` : ""}`, isRepeat ? 6000 : 4000);
    }
  };

  const handleCrewClockOut = async (empId) => {
    const entry = teamClocks[empId];
    if (!entry) return;
    const loc = await getLocation();
    const totalMs = Date.now() - new Date(entry.clockIn).getTime();
    const rawHours = totalMs / 3600000;
    // Auto-deduct 30-min unpaid lunch for shifts over 6 hours
    const lunchDeducted = rawHours >= 6 ? 0.5 : 0;
    const totalHours = +(rawHours - lunchDeducted).toFixed(2);
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
      lunchDeducted,
      geofenceStatus: "inside",
    };
    if (setTimeEntries) setTimeEntries(prev => [...prev, newEntry]);
    const updated = { ...teamClocks };
    delete updated[empId];
    persistTeamClocks(updated);
    const lunchNote = lunchDeducted > 0 ? ` (${rawHours.toFixed(1)}h - 30m lunch)` : "";
    show?.(`${emp?.name || "Crew"} ${t("clocked out")} · ${totalHours}h${lunchNote} ✓`);
  };

  // ── bulk roll call handler ──
  const handleBulkClockIn = async () => {
    const selected = Object.entries(rollCallSelected).filter(([, v]) => v).map(([id]) => id);
    if (selected.length === 0) return;
    const loc = await getLocation();
    const now = new Date().toISOString();
    const updated = { ...teamClocks };
    let count = 0;
    for (const empId of selected) {
      if (updated[empId]) continue; // already clocked in
      updated[empId] = { clockIn: now, lat: loc?.lat || null, lng: loc?.lng || null, projectId: selectedProjectId };
      count++;
    }
    persistTeamClocks(updated);
    setRollCallMode(false);
    setRollCallSelected({});
    show?.(`${count} ${t("crew members clocked in")} ✓`);
  };

  // ── labor entry handler ──
  const handleAddLabor = () => {
    if (!laborForm.employeeId || !laborForm.areaId || !laborForm.hours) return;
    const emp = employees.find(e => String(e.id) === String(laborForm.employeeId));
    const area = (areas || []).find(a => String(a.id) === String(laborForm.areaId));
    const entry = {
      id: crypto.randomUUID(),
      employeeId: laborForm.employeeId,
      employeeName: emp?.name || "Unknown",
      projectId: selectedProjectId,
      areaId: laborForm.areaId,
      areaName: area?.name || "Unknown",
      floor: area?.floor || "",
      zone: area?.zone || "",
      costCode: laborForm.costCode,
      hours: Number(laborForm.hours),
      payType: laborForm.payType,
      notes: laborForm.notes.trim(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    setLaborEntries(prev => {
      const updated = [entry, ...prev];
      localStorage.setItem("ebc_laborEntries", JSON.stringify(updated));
      return updated;
    });
    clearLaborDraft();
    show?.(`${t("Labor Entry")} — ${emp?.name} · ${laborForm.hours}h ${laborForm.costCode} ✓`);
  };

  // ── bulk labor handler: same hours for multiple crew ──
  const handleBulkLabor = () => {
    const selectedIds = Object.entries(bulkLaborSelected).filter(([, v]) => v).map(([id]) => id);
    if (selectedIds.length === 0 || !laborForm.areaId || !laborForm.hours) return;
    const area = (areas || []).find(a => String(a.id) === String(laborForm.areaId));
    const newEntries = selectedIds.map(empId => {
      const emp = employees.find(e => String(e.id) === String(empId));
      return {
        id: crypto.randomUUID(),
        employeeId: empId,
        employeeName: emp?.name || "Unknown",
        projectId: selectedProjectId,
        areaId: laborForm.areaId,
        areaName: area?.name || "Unknown",
        floor: area?.floor || "",
        zone: area?.zone || "",
        costCode: laborForm.costCode,
        hours: Number(laborForm.hours),
        payType: laborForm.payType,
        notes: laborForm.notes.trim(),
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
    });
    setLaborEntries(prev => {
      const updated = [...newEntries, ...prev];
      localStorage.setItem("ebc_laborEntries", JSON.stringify(updated));
      return updated;
    });
    setBulkLaborSelected({});
    clearLaborDraft();
    show?.(`${t("Labor Entry")} — ${selectedIds.length} ${t("crew")} · ${laborForm.hours}h ${laborForm.costCode} ✓`);
  };

  // ── labor entry edit/delete ──
  const handleDeleteLabor = (entryId) => {
    setLaborEntries(prev => {
      const updated = prev.map(le => le.id === entryId ? { ...le, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: activeForeman?.name } : le);
      localStorage.setItem("ebc_laborEntries", JSON.stringify(updated));
      return updated;
    });
    show?.(`${t("Labor Entry")} ${t("deleted")} ✓`);
  };

  const handleEditLabor = (entryId, newHours) => {
    setLaborEntries(prev => {
      const updated = prev.map(le => le.id === entryId ? { ...le, hours: Number(newHours), editedAt: new Date().toISOString(), editedBy: activeForeman?.name, originalHours: le.originalHours || le.hours } : le);
      localStorage.setItem("ebc_laborEntries", JSON.stringify(updated));
      return updated;
    });
    show?.(`${t("Labor Entry")} ${t("updated")} ✓`);
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
  const [matPhotos, setMatPhotos] = useState([]);
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
      photos: matPhotos || [],
      photoUrl: matPhotos?.length > 0 ? matPhotos[0].data : null,
      status: "requested",
      requestedAt: now,
      approvedBy: null, approvedAt: null, rejectedReason: null,
      fulfillmentType: null, driverId: null, deliveredAt: null,
      confirmedBy: null, confirmedAt: null,
      auditTrail: [{ action: "submitted", actor: activeForeman.name, actorId: activeForeman.id, timestamp: now }],
    };
    setMaterialRequests(prev => [newReq, ...prev]);
    setMatForm({ material: "", qty: "", unit: "EA", notes: "", urgency: "normal", neededBy: "" });
    setMatPhotos([]);
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
          <div className="employee-logo frm-flex-row-center"><img src="/ebc-eagle-white.png" alt="EBC" className="portal-header-logo" onError={(e) => e.target.style.display = "none"} /></div>
          <span className="text-sm text-muted">{t("Foreman Portal")}</span>
        </header>
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted frm-text-center" style={{ marginTop: -12 }}>{t("Foreman Portal")}</div>
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
      setPendingLoading(true);
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
      setPendingLoading(false);
    };
    fetchPendingRequests();
  }, [activeForeman, selectedProjectId, foremanTab]);

  // ── Fetch crew certifications (CRED-04) ──
  useEffect(() => {
    if (!activeForeman || foremanTab !== "team") return;
    const fetchCrewCerts = async () => {
      setCertsLoading(true);
      try {
        const { supabase } = await import("../lib/supabase");
        const crewIds = teamForProject.map(m => m.id);
        if (crewIds.length === 0) { setCrewCerts([]); setCertsLoading(false); return; }
        const { data } = await supabase
          .from("certifications")
          .select("*")
          .in("employee_id", crewIds)
          .order("expiry_date", { ascending: true });
        setCrewCerts(data || []);
      } catch (err) {
        console.error("Failed to fetch crew certs:", err);
      }
      setCertsLoading(false);
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

  // ── Notifications: permission + RFI answered + inspection tomorrow ──
  useEffect(() => { if (activeForeman) requestPermission(); }, [activeForeman]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevAnsweredRfis = useRef(new Set());
  useEffect(() => {
    const answered = (rfis || []).filter(r => r.status === "answered");
    answered.forEach(r => {
      if (!prevAnsweredRfis.current.has(r.id)) {
        sendNotification({ title: "EBC · RFI Answered", body: `${r.subject || "RFI"} — response received`, tag: `rfi-answered-${r.id}` });
      }
    });
    prevAnsweredRfis.current = new Set(answered.map(r => r.id));
  }, [rfis]); // eslint-disable-line react-hooks/exhaustive-deps
  // Inspection tomorrow alert (fire once per day)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const inspections = (calendarEvents || []).filter(ev => (ev.date || ev.start || "").slice(0, 10) === tomorrowStr && (ev.type === "inspection" || ev.title?.toLowerCase().includes("inspect")));
    const notifKey = `ebc_inspection_notif_${tomorrowStr}`;
    if (inspections.length > 0 && !localStorage.getItem(notifKey)) {
      sendNotification({ title: "EBC · Inspection Tomorrow", body: `${inspections.length} inspection${inspections.length > 1 ? "s" : ""} scheduled for tomorrow`, tag: "inspection-tomorrow" });
      localStorage.setItem(notifKey, "1");
    }
  }, [calendarEvents]); // eslint-disable-line react-hooks/exhaustive-deps

  // RFI badge: count answered RFIs not yet viewed
  const answeredRfiCount = (rfis || []).filter(r => String(r.projectId) === String(selectedProjectId) && r.status === "answered").length;
  // Look-ahead badge: events in next 48 hours
  const next48h = Date.now() + 48 * 60 * 60 * 1000;
  const upcomingEventCount = (calendarEvents || []).filter(ev => {
    const d = new Date(ev.date || ev.start);
    return !isNaN(d) && d.getTime() >= Date.now() && d.getTime() <= next48h;
  }).length;

  const foremanTabDefs = [
    // Primary (4 field-critical tabs)
    { id: "dashboard", label: t("Home"), icon: Home, badge: false },
    { id: "production", label: t("Production"), icon: BarChart3, badge: false },
    { id: "tm", label: t("T&M"), icon: FileText, badge: pendingTmCount > 0 },
    { id: "team", label: "Team", icon: Users, badge: pendingRequestCount > 0 },
    // Promoted daily-use tabs (R15 auditor: "daily-use features shouldn't require 3+ taps")
    { id: "documents", label: t("Documents"), icon: FileText, badge: answeredRfiCount > 0 },
    { id: "lookahead", label: t("Look-Ahead"), icon: Calendar, badge: upcomingEventCount > 0 },
    // Overflow (frequency-driven)
    { id: "reports", label: t("Daily Report"), icon: ClipboardList, badge: (dailyReports || []).filter(r => r.projectId === selectedProjectId && r.date === new Date().toISOString().slice(0,10)).length > 0 },
    { id: "drawings", label: "Drawings", icon: FileText, badge: false },
    { id: "punchList", label: t("Punch List"), icon: ClipboardCheck, badge: openPunchCount > 0 },
    { id: "materials", label: "Materials", icon: Package, badge: projectMatRequests.filter(r => r.status === "requested" || r.status === "pending").length > 0 },
    { id: "deliveries", label: t("Deliveries"), icon: Package, badge: projectMatRequests.filter(r => ["assigned", "picked_up", "in-transit"].includes(r.status)).length > 0 },
    { id: "issues", label: t("Issues"), icon: AlertTriangle, badge: (problems || []).filter(p => String(p.projectId) === String(selectedProjectId) && p.status !== "resolved").length > 0 },
    { id: "decisionLog", label: t("Decisions"), icon: FileText, badge: false },
    { id: "hours", label: t("Hours"), icon: BarChart3, badge: false },
    { id: "jsa", label: "JSA", icon: Shield, badge: activeJsaCount > 0 },
  ];

  // FSCH-04: Pull-based in-app alert. Foreman sees pending request alerts when opening Dashboard.
  // Push notification deferred to Phase 10.
  const foremanAlerts = useMemo(() => {
    const alerts = [];
    if (pendingRequestCount > 0) {
      alerts.push({ type: "info", message: t("{n} pending requests").replace("{n}", pendingRequestCount), timestamp: t("Today"), navigateTo: "team" });
    }
    if (pctUsed > 90) {
      alerts.push({ type: "error", message: t("Budget at {n}%").replace("{n}", pctUsed), timestamp: t("Today"), navigateTo: "dashboard" });
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
          <LanguageToggle lang={lang} onChange={setLang} />
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
        {/* Offline status chip */}
        {!network.online && (
          <div className="offline-status-chip">
            <span className="offline-pulse-dot" />
            {t("Offline Mode")} — {t("saved locally")}
            {network.lastSync > 0 && <span className="offline-last-sync">{t("Last synced")}: {(() => { const m = Math.round((Date.now() - network.lastSync) / 60000); return m < 1 ? t("just now") : `${m}m ago`; })()}</span>}
          </div>
        )}

        {myProjects.length === 0 && foremanTab !== "settings" && (
          <div className="empty-state" style={{ padding: "var(--space-10) var(--space-5)" }}>
            <div className="empty-icon"><ClipboardList size={32} /></div>
            <div className="empty-text">{t("No projects assigned")}</div>
          </div>
        )}


        {/* ═══ SETTINGS TAB ═══ */}
        {foremanTab === "settings" && (
          <div className="settings-wrap">
            {/* Back button */}
            <button className="btn btn-ghost btn-sm frm-mb-12" onClick={() => setForemanTab("dashboard")}>&#9664; {t("Back")}</button>
            {/* Profile */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeForeman.name)}</div>
              <div className="frm-text-center frm-mb-12">
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
              <div className="settings-row frm-mt-12">
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
                <div className="frm-text-center" style={{ padding: "var(--space-8) var(--space-5)" }}>
                  {/* Big clock display */}
                  <div className="frm-clock-big">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-muted frm-mb-24">
                    {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  {gpsStatus && <div className="text-xs text-muted frm-mb-10">{gpsStatus}</div>}

                  {/* ── Project Lookup for Clock-In ── */}
                  {!isClockedIn && (
                    <div className="frm-project-search-wrap">
                      <label className="form-label frm-text-center" style={{ display: "block", marginBottom: "var(--space-2)" }}>{t("Select Project")}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={t("Search project name or address...")}
                        value={clockProjectSearch}
                        onChange={(e) => setClockProjectSearch(e.target.value)}
                        className="frm-text-center frm-mb-6"
                      />
                      <div className="frm-project-list">
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
                                padding: "var(--space-3) var(--space-4)",
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
                              {selectedProjectId === p.id && <span style={{ color: "var(--green)", fontSize: "var(--text-section)" }}>✓</span>}
                            </div>
                          ))}
                      </div>
                      {selectedProject && (
                        <div className="text-sm font-semi frm-selected-project">
                          <MapPin size={14} />{selectedProject.name}
                        </div>
                      )}
                    </div>
                  )}

                  {!isClockedIn ? (
                    <button
                      className="btn btn-primary frm-clock-btn"
                      onClick={handleClockIn}
                      disabled={!selectedProjectId}
                    >
                      <Clock size={40} />
                      {t("CLOCK IN")}
                    </button>
                  ) : (
                    <>
                      <div className="frm-mb-16">
                        <div className="text-xs text-muted">{t("Clocked in at")}</div>
                        <div className="frm-font-20" style={{ color: "var(--green)" }}>
                          {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted frm-mt-4">
                          {(() => {
                            const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                            const hrs = Math.floor(elapsed / 3600000);
                            const mins = Math.floor((elapsed % 3600000) / 60000);
                            return `${hrs}h ${mins}m ${t("elapsed")}`;
                          })()}
                        </div>
                      </div>
                      <button
                        className="btn frm-clock-out-btn"
                        onClick={handleClockOut}
                      >
                        <StopCircle size={40} />
                        {t("CLOCK OUT")}
                      </button>
                    </>
                  )}

                  {/* Today's entries */}
                  {myTodayEntries.length > 0 && (
                    <div className="frm-mt-30">
                      <div className="section-title frm-font-14 frm-mb-8">{t("Today's Time Log")}</div>
                      {myTodayEntries.map((te, i) => (
                        <div key={i} className="foreman-team-row" style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)" }}>
                          <div>
                            <div className="text-sm font-semi">
                              {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-muted">
                              {projects.find(p => p.id === te.projectId)?.name || t("General")}
                            </div>
                          </div>
                          <div className="foreman-team-hours">{te.totalHours}h</div>
                        </div>
                      ))}
                      <div className="text-sm font-semi frm-text-right frm-mt-8 frm-amber">
                        {t("Total")}: {myTodayHours.toFixed(1)}h
                      </div>
                    </div>
                  )}

                  {/* Report Problem button */}
                  <div className="frm-mt-30">
                    <FieldButton variant="warning" className="foreman-report-problem-btn" onClick={() => setShowReportProblem(true)} t={t}>
                      <AlertTriangle size={18} /> {t("Report a Problem")}
                    </FieldButton>
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

                {/* Quick Actions — 1-tap access to Labor Entry + Daily Report */}
                <div className="foreman-dashboard-actions">
                  <FieldButton variant="primary" className="flex-1 foreman-action-btn foreman-action-btn--amber" onClick={() => {
                      setForemanTab("team");
                      setShowLaborEntry(true);
                      const autoSelected = {};
                      Object.keys(teamClocks).forEach(id => { autoSelected[id] = true; });
                      if (Object.keys(autoSelected).length > 0) setBulkLaborSelected(autoSelected);
                    }} t={t}>
                    <ClockIcon size={16} /> {t("Enter Labor")}
                  </FieldButton>
                  <FieldButton variant="primary" className="flex-1 foreman-action-btn foreman-action-btn--blue" onClick={() => setForemanTab("reports")} t={t}>
                    <ClipboardList size={16} /> {t("Daily Report")}
                  </FieldButton>
                </div>
                <FieldButton variant="ghost" className="foreman-action-btn foreman-action-btn--full" onClick={() => setForemanTab("lookahead")} t={t}>
                  <Calendar size={15} /> {t("Look-Ahead")} {upcomingEventCount > 0 && <span className="foreman-action-badge">{upcomingEventCount}</span>}
                </FieldButton>

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

                {/* Today's Activity Summary — deliveries, open punch, pending T&M, production */}
                <div className="frm-mt-30">
                  <div className="foreman-dashboard-section-label">{t("TODAY'S ACTIVITY")}</div>
                  <div className="frm-activity-grid">
                    <div className="frm-activity-tile">
                      <div className="frm-activity-value" style={{ color: "var(--red)" }}>{openPunchCount}</div>
                      <div className="text-xs text-muted">{t("Open Punch")}</div>
                    </div>
                    <div className="frm-activity-tile">
                      <div className="frm-activity-value frm-amber">{pendingTmCount}</div>
                      <div className="text-xs text-muted">{t("Pending T&M")}</div>
                    </div>
                    <div className="frm-activity-tile">
                      <div className="frm-activity-value" style={{ color: "var(--green)" }}>
                        {(productionLogs || []).filter(pl => String(pl.projectId) === String(selectedProjectId) && pl.status !== "deleted" && (pl.date === new Date().toISOString().slice(0,10) || (pl.createdAt && pl.createdAt.startsWith(new Date().toISOString().slice(0,10))))).length}
                      </div>
                      <div className="text-xs text-muted">{t("Production Today")}</div>
                    </div>
                    <div className="frm-activity-tile">
                      <div className="frm-activity-value" style={{ color: "var(--blue)" }}>
                        {projectMatRequests.filter(r => r.status === "approved" || r.status === "in-transit").length}
                      </div>
                      <div className="text-xs text-muted">{t("Deliveries Pending")}</div>
                    </div>
                  </div>
                  {/* Look-ahead preview — next 3 days from calendar events */}
                  {(() => {
                    const upcoming = (calendarEvents || [])
                      .filter(ev => {
                        const evDate = new Date(ev.date || ev.start);
                        const today = new Date(); today.setHours(0,0,0,0);
                        const inThreeDays = new Date(today); inThreeDays.setDate(inThreeDays.getDate() + 3);
                        return evDate >= today && evDate < inThreeDays && (!ev.projectId || String(ev.projectId) === String(selectedProjectId));
                      })
                      .slice(0, 4);
                    if (upcoming.length === 0) return null;
                    return (
                      <div className="frm-mt-12">
                        <div className="text-xs font-bold mb-4">{t("Upcoming")}</div>
                        {upcoming.map((ev, i) => (
                          <div key={i} className="text-xs frm-flex-between" style={{ padding: "var(--space-1) 0", borderBottom: "1px solid var(--border)" }}>
                            <span>{ev.title || ev.type}</span>
                            <span className="text-muted">{new Date(ev.date || ev.start).toLocaleDateString(lang === "es" ? "es" : "en", { weekday: "short", month: "short", day: "numeric" })}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ═══ DASHBOARD TAB (legacy project KPI view — preserved for reference, unreachable with new tab structure) ═══ */}
            {foremanTab === "dashboard-kpi-legacy" && (
              <div className="emp-content">
                <div className="frm-text-center" style={{ padding: "var(--space-8) var(--space-5)" }}>
                  {/* Big clock display */}
                  <div className="frm-clock-big">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-muted frm-mb-24">
                    {new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  {gpsStatus && <div className="text-xs text-muted frm-mb-10">{gpsStatus}</div>}

                  {/* ── Project Lookup for Clock-In ── */}
                  {!isClockedIn && (
                    <div className="frm-project-search-wrap">
                      <label className="form-label frm-text-center" style={{ display: "block", marginBottom: "var(--space-2)" }}>{t("Select Project")}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={t("Search project name or address...")}
                        value={clockProjectSearch}
                        onChange={(e) => setClockProjectSearch(e.target.value)}
                        className="frm-text-center frm-mb-6"
                      />
                      <div className="frm-project-list">
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
                                padding: "var(--space-3) var(--space-4)",
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
                              {selectedProjectId === p.id && <span style={{ color: "var(--green)", fontSize: "var(--text-section)" }}>✓</span>}
                            </div>
                          ))}
                      </div>
                      {selectedProject && (
                        <div className="text-sm font-semi frm-selected-project">
                          <MapPin size={14} />{selectedProject.name}
                        </div>
                      )}
                    </div>
                  )}

                  {!isClockedIn ? (
                    <button
                      className="btn btn-primary frm-clock-btn"
                      onClick={handleClockIn}
                      disabled={!selectedProjectId}
                    >
                      <Clock size={40} />
                      {t("CLOCK IN")}
                    </button>
                  ) : (
                    <>
                      <div className="frm-mb-16">
                        <div className="text-xs text-muted">{t("Clocked in at")}</div>
                        <div className="frm-font-20" style={{ color: "var(--green)" }}>
                          {new Date(clockEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted frm-mt-4">
                          {(() => {
                            const elapsed = Date.now() - new Date(clockEntry.clockIn).getTime();
                            const hrs = Math.floor(elapsed / 3600000);
                            const mins = Math.floor((elapsed % 3600000) / 60000);
                            return `${hrs}h ${mins}m ${t("elapsed")}`;
                          })()}
                        </div>
                      </div>
                      <button
                        className="btn frm-clock-out-btn"
                        onClick={handleClockOut}
                      >
                        <StopCircle size={40} />
                        {t("CLOCK OUT")}
                      </button>
                    </>
                  )}

                  {/* Today's entries */}
                  {myTodayEntries.length > 0 && (
                    <div className="frm-mt-30">
                      <div className="section-title frm-font-14 frm-mb-8">{t("Today's Time Log")}</div>
                      {myTodayEntries.map((te, i) => (
                        <div key={i} className="foreman-team-row" style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)" }}>
                          <div>
                            <div className="text-sm font-semi">
                              {new Date(te.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(te.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-xs text-muted">
                              {projects.find(p => String(p.id) === String(te.projectId))?.name || t("General")}
                            </div>
                          </div>
                          <div className="foreman-team-hours">{te.totalHours}h</div>
                        </div>
                      ))}
                      <div className="text-sm font-semi frm-text-right frm-mt-8 frm-amber">
                        {t("Total")}: {myTodayHours.toFixed(1)}h
                      </div>
                    </div>
                  )}

                  {/* ── Crew Clock-In/Out ── */}
                  <div className="frm-mt-30">
                    <div className="section-title frm-font-14 frm-mb-12">{t("Crew Time Clock")}</div>

                    {/* Add team member — searchable dropdown */}
                    <div className="frm-mb-16" style={{ position: "relative" }}>
                      <div className="frm-flex-row-center">
                        <div className="frm-flex-1" style={{ position: "relative" }}>
                          <input
                            type="text"
                            placeholder={t("Search or select team member...")}
                            value={teamSearch || ""}
                            onChange={e => setCrewSearch(e.target.value)}
                            onFocus={() => setCrewSearch(teamSearch || "")}
                            className="frm-crew-search-input"
                          />
                          {/* Dropdown list */}
                          {teamSearch !== null && teamSearch !== undefined && (() => {
                            const q = (teamSearch || "").toLowerCase().trim();
                            const allEmp = employees.filter(e => e.id !== activeForeman?.id);
                            const filtered = q.length > 0
                              ? allEmp.filter(e => e.name.toLowerCase().includes(q))
                              : allEmp;
                            if (filtered.length === 0 && q.length > 0) return (
                              <div className="frm-crew-dropdown frm-crew-dropdown-empty">
                                <span className="text-sm text-muted">{t("No employees found")}</span>
                              </div>
                            );
                            if (q.length === 0 && !document.activeElement?.matches?.('input[placeholder*="Search"]')) return null;
                            return (
                              <div className="frm-crew-dropdown frm-crew-dropdown-scroll">
                                {filtered.slice(0, 15).map(c => {
                                  const isIn = !!teamClocks[c.id];
                                  const isAssigned = teamForProject.some(cp => cp.id === c.id);
                                  return (
                                    <div key={c.id}
                                      className="frm-crew-dropdown-row"
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={() => {
                                        if (!isIn) { handleCrewClockIn(c.id); }
                                        else { handleCrewClockOut(c.id); }
                                        setCrewSearch(null);
                                      }}
                                    >
                                      <div className={`foreman-avatar foreman-avatar--sm ${isIn ? "foreman-avatar--active" : "foreman-avatar--inactive"}`}>
                                        {c.name.split(" ").map(n => n[0]).join("")}
                                      </div>
                                      <div className="frm-flex-1">
                                        <div className="text-sm font-semi">{c.name}</div>
                                        <div className="text-xs text-muted">
                                          {c.role || c.title || ""}
                                          {isAssigned && <span style={{ color: "var(--amber)", marginLeft: "var(--space-1)" }}>· {t("Assigned")}</span>}
                                        </div>
                                      </div>
                                      <span className={`foreman-clock-chip ${isIn ? "foreman-clock-chip--in" : "foreman-clock-chip--out"}`}>
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
                        <div className="frm-mb-16">
                          <div className="foreman-subsection-label">{t("Clocked In")} ({clockedIn.length})</div>
                          <div className="foreman-crew-grid">
                            {clockedIn.map(c => {
                              const clockData = teamClocks[c.id];
                              const isAssigned = teamForProject.some(cp => cp.id === c.id);
                              const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                              const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                              return (
                                <div key={c.id} className="foreman-team-row foreman-crew-row foreman-crew-row--clocked">
                                  <div className="foreman-avatar foreman-avatar--md foreman-avatar--active">
                                    {c.name.split(" ").map(n => n[0]).join("")}
                                  </div>
                                  <div className="frm-flex-1">
                                    <div className="text-sm font-semi">{c.name}</div>
                                    <div className="text-xs text-muted">
                                      {c.role || c.title || ""}{!isAssigned && <span className="frm-amber"> · {t("Other team")}</span>}
                                      {todayTotal > 0 ? ` · ${todayTotal.toFixed(1)}h ${t("today")}` : ""}
                                    </div>
                                    {clockData && (
                                      <div className="text-xs frm-mt-2" style={{ color: "var(--green)" }}>
                                        {t("In since")} {new Date(clockData.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        {" · "}{(() => { const m = Math.floor((Date.now() - new Date(clockData.clockIn).getTime()) / 60000); return `${Math.floor(m/60)}h ${m%60}m`; })()}
                                      </div>
                                    )}
                                  </div>
                                  <FieldButton variant="danger" className="btn-sm" style={{ minWidth: 80 }}
                                    onClick={() => handleCrewClockOut(c.id)} t={t}>
                                    {t("Clock Out")}
                                  </FieldButton>
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
                          <div className="foreman-subsection-label">{t("Not Clocked In")} ({notIn.length})</div>
                          <div className="foreman-crew-grid">
                            {notIn.map(c => {
                              const todayEntries = timeEntries.filter(te => te.employeeId === c.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours);
                              const todayTotal = todayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
                              return (
                                <div key={c.id} className="foreman-team-row foreman-crew-row foreman-crew-row--not-clocked">
                                  <div className="foreman-avatar foreman-avatar--md foreman-avatar--inactive">
                                    {c.name.split(" ").map(n => n[0]).join("")}
                                  </div>
                                  <div className="frm-flex-1">
                                    <div className="text-sm font-semi">{c.name}</div>
                                    <div className="text-xs text-muted">{t(c.role)}{todayTotal > 0 ? ` · ${todayTotal.toFixed(1)}h ${t("today")}` : ""}</div>
                                  </div>
                                  <FieldButton variant="primary" className="btn-sm" style={{ minWidth: 80 }}
                                    onClick={() => handleCrewClockIn(c.id)} t={t}>
                                    {t("Clock In")}
                                  </FieldButton>
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
                    <div className="section-title frm-section-title-md">{selectedProject.name}</div>
                  </div>
                  <div className="text-xs text-muted mb-8">
                    {selectedProject.gc} · {selectedProject.phase} · {selectedProject.address}
                  </div>

                  {/* Phase 2B: Construction Stage with advance */}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-xs text-muted">{t("Stage")}:</span>
                    {(() => {
                      const STAGES = [
                        { key: "pre-con", label: "Pre-Con", color: "var(--purple, #8b5cf6)", progress: 5 },
                        { key: "mobilize", label: "Mobilize", color: "var(--blue)", progress: 10 },
                        { key: "demo", label: "Demo", color: "var(--red)", progress: 20 },
                        { key: "framing", label: "Framing", color: "var(--amber)", progress: 40 },
                        { key: "board", label: "Board", color: "var(--accent)", progress: 60 },
                        { key: "tape", label: "Tape/Finish", color: "var(--green)", progress: 80 },
                        { key: "punch", label: "Punch", color: "var(--cyan, #06b6d4)", progress: 90 },
                        { key: "closeout", label: "Closeout", color: "var(--indigo, #6366f1)", progress: 100 },
                      ];
                      const currentIdx = STAGES.findIndex(s => s.key === selectedProject.constructionStage);
                      const current = currentIdx >= 0 ? STAGES[currentIdx] : null;
                      const next = currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
                      return (
                        <>
                          {STAGES.map((s, i) => (
                            <div key={s.key} style={{
                              width: 24, height: 6, borderRadius: "var(--radius-control)",
                              background: i <= currentIdx ? s.color : "rgba(255,255,255,0.1)"
                            }} title={s.label} />
                          ))}
                          <span style={{ fontWeight: "var(--weight-bold)", color: current?.color || "var(--text3)", marginLeft: "var(--space-1)" }}>
                            {current?.label || t("Not Set")}
                          </span>
                          {next && (
                            <button className="btn btn-sm" style={{ marginLeft: "auto", fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", background: next.color + "22", color: next.color, border: `1px solid ${next.color}44` }}
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

                  <div className="frm-flex-row frm-mb-12" style={{ gap: "var(--space-3)" }}>
                    <div className="foreman-kpi-card frm-flex-1">
                      <div className="foreman-kpi-label">{t("Crew Members")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: "var(--text-section)" }}>{teamForProject.length}</div>
                    </div>
                    <div className="foreman-kpi-card frm-flex-1">
                      <div className="foreman-kpi-label">{t("Materials")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: "var(--text-section)" }}>{projectMatRequests.length}</div>
                    </div>
                    <div className="foreman-kpi-card frm-flex-1">
                      <div className="foreman-kpi-label">{t("Progress")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: "var(--text-section)" }}>{selectedProject.progress}%</div>
                    </div>
                  </div>

                  <div className="foreman-kpi-card frm-mb-12">
                    <div className="foreman-kpi-label">{t("Progress")}</div>
                    <div className="project-progress-bar frm-mt-8">
                      <div className="project-progress-fill"
                        style={{ width: `${selectedProject.progress}%` }} />
                    </div>
                  </div>

                  {/* ── Phase Tracker ── */}
                  <div className="foreman-kpi-card">
                    <div className="frm-flex-between frm-mb-10">
                      <div>
                        <div className="foreman-kpi-label">{t("Construction Phases")}</div>
                        <div className="frm-font-11 frm-mt-2" style={{ color: "var(--text2)" }}>
                          {completedCount}/{projPhases.length} {t("complete")}
                          {activePhase ? ` · ${activePhase.name}` : ""}
                        </div>
                      </div>
                      {activePhase && (
                        <span className="badge badge-amber frm-font-10">{activePhase.name}</span>
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
                    <div className="foreman-kpi-card frm-mt-12">
                      <div className="frm-flex-row-center frm-mb-10">
                        <FileQuestion size={16} style={{ color: "var(--amber, #f59e0b)" }} />
                        <div className="foreman-kpi-label" style={{ margin: "0" }}>
                          {t("RFIs Needing Attention")} ({rfiAlerts.length})
                        </div>
                      </div>
                      <div className="frm-flex-col-6">
                        {rfiAlerts.slice(0, 5).map(r => (
                          <div key={r.id} style={{
                            padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)",
                            background: r.status === "answered" || r.status === "closed"
                              ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                            border: `1px solid ${r.status === "answered" || r.status === "closed"
                              ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
                              <div className="text-sm font-semi frm-flex-1 frm-truncate">
                                {r.number ? `${r.number}: ` : ""}{r.subject || r.title || r.question}
                              </div>
                              <span className={`badge ${r.status === "answered" || r.status === "closed" ? "badge-green" : "badge-amber"} frm-shrink-0`} style={{ fontSize: "var(--text-xs)" }}>
                                {r.status === "answered" || r.status === "closed" ? t("ANSWERED") : t("OPEN")}
                              </span>
                            </div>
                            {(r.status === "answered" || r.status === "closed") && r.response && (
                              <div className="text-xs frm-mt-4" style={{ color: "var(--green, #22c55e)", fontWeight: "var(--weight-medium)" }}>
                                {t("Response")}: {r.response.length > 120 ? r.response.slice(0, 120) + "..." : r.response}
                              </div>
                            )}
                            {r.drawingRef && (
                              <div className="text-xs text-muted frm-mt-2">
                                {t("Drawing ref")}: {r.drawingRef}
                              </div>
                            )}
                          </div>
                        ))}
                        {rfiAlerts.length > 5 && (
                          <button className="cal-nav-btn frm-font-11" style={{ alignSelf: "center" }}
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
                  {/* ── Roll Call + Labor Entry action row ── */}
                  <div className="foreman-roll-call-toggle">
                    <FieldButton variant="primary" className={`flex-1 foreman-action-btn ${rollCallMode ? "foreman-action-btn--green" : "foreman-action-btn--blue"}`}
                      onClick={() => { setRollCallMode(v => !v); if (!rollCallMode) setRollCallSelected({}); }} t={t}>
                      <CheckSquare size={15} />
                      {rollCallMode ? t("Cancel") : t("Roll Call")}
                    </FieldButton>
                    <FieldButton variant="primary" className="flex-1 foreman-action-btn foreman-action-btn--amber"
                      onClick={() => setShowLaborEntry(v => !v)} t={t}>
                      <Clock size={15} />
                      {t("Labor Entry")}
                    </FieldButton>
                  </div>

                  {/* ── Roll Call Mode: checkbox crew list with bulk clock-in ── */}
                  {rollCallMode && allDisplayCrew.length > 0 && (
                    <div className="frm-roll-call-card">
                      <div className="frm-flex-between frm-mb-10">
                        <span className="text-sm font-bold">{t("Roll Call")} — {t("Select crew to clock in")}</span>
                        <button className="text-xs frm-btn-unstyled--amber frm-amber"
                          onClick={() => {
                            const allIds = {};
                            allDisplayCrew.forEach(c => { if (!teamClocks[c.id]) allIds[c.id] = true; });
                            setRollCallSelected(allIds);
                          }}>
                          {t("Select All")}
                        </button>
                      </div>
                      {allDisplayCrew.map(c => (
                        <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", cursor: teamClocks[c.id] ? "default" : "pointer", opacity: teamClocks[c.id] ? 0.5 : 1 }}>
                          {teamClocks[c.id] ? (
                            <CheckCircle size={18} style={{ color: "var(--green)", flexShrink: 0 }} />
                          ) : (
                            rollCallSelected[c.id]
                              ? <CheckSquare size={18} style={{ color: "var(--accent)", flexShrink: 0 }} onClick={() => setRollCallSelected(p => ({ ...p, [c.id]: false }))} />
                              : <Square size={18} style={{ color: "var(--text3)", flexShrink: 0 }} onClick={() => setRollCallSelected(p => ({ ...p, [c.id]: true }))} />
                          )}
                          <span className="text-sm frm-flex-1">{c.name}</span>
                          {teamClocks[c.id] && <span className="text-xs" style={{ color: "var(--green)" }}>✓ {t("Clocked In")}</span>}
                        </label>
                      ))}
                      <button
                        className="btn btn-primary touch-target frm-labor-submit frm-mt-12"
                        onClick={handleBulkClockIn}
                        disabled={Object.values(rollCallSelected).filter(Boolean).length === 0}
                      >
                        <CheckSquare size={16} /> {t("Clock In Selected")} ({Object.values(rollCallSelected).filter(Boolean).length})
                      </button>
                    </div>
                  )}

                  {/* ── Labor Entry Form (Bulk + Single mode) ── */}
                  {showLaborEntry && (
                    <div className="frm-roll-call-card">
                      <div className="frm-flex-between frm-mb-10">
                        <div className="text-sm font-bold">{t("Labor Entry")}</div>
                        <div className="frm-flex-row" style={{ gap: "var(--space-1)" }}>
                          <button className={`btn btn-sm ${bulkLaborMode ? "btn-primary" : "btn-ghost"} frm-font-11`} style={{ padding: "var(--space-1) var(--space-3)" }} onClick={() => setBulkLaborMode(true)}>{t("Bulk")}</button>
                          <button className={`btn btn-sm ${!bulkLaborMode ? "btn-primary" : "btn-ghost"} frm-font-11`} style={{ padding: "var(--space-1) var(--space-3)" }} onClick={() => setBulkLaborMode(false)}>{t("Single")}</button>
                        </div>
                      </div>

                      {/* Crew selection — bulk (checkboxes) or single (dropdown) */}
                      {bulkLaborMode ? (
                        <div className="frm-labor-crew-list">
                          <div className="frm-labor-crew-header">
                            <span className="text-xs font-bold">{t("Select crew")} ({Object.values(bulkLaborSelected).filter(Boolean).length})</span>
                            <button className="text-xs frm-btn-unstyled--amber frm-amber"
                              onClick={() => { const all = {}; allDisplayCrew.forEach(c => { all[c.id] = true; }); setBulkLaborSelected(all); }}>
                              {t("Select All")}
                            </button>
                          </div>
                          {allDisplayCrew.map(c => (
                            <label key={c.id} className="frm-labor-crew-row">
                              {bulkLaborSelected[c.id]
                                ? <CheckSquare size={16} style={{ color: "var(--accent)", flexShrink: 0 }} onClick={() => setBulkLaborSelected(p => ({ ...p, [c.id]: false }))} />
                                : <Square size={16} style={{ color: "var(--text3)", flexShrink: 0 }} onClick={() => setBulkLaborSelected(p => ({ ...p, [c.id]: true }))} />
                              }
                              <span className="text-sm">{c.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <select className="form-input field-input mb-8" value={laborForm.employeeId} onChange={e => setLaborForm(p => ({ ...p, employeeId: e.target.value }))}>
                          <option value="">{t("Select crew member")}</option>
                          {allDisplayCrew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}

                      {/* Shared fields: area, cost code, hours, pay type */}
                      <select className="form-input field-input mb-8" value={laborForm.areaId} onChange={e => setLaborForm(p => ({ ...p, areaId: e.target.value }))}>
                        <option value="">{t("Select area")}</option>
                        {(areas || []).filter(a => String(a.projectId) === String(selectedProjectId)).map(a => <option key={a.id} value={a.id}>{a.name} — {a.floor} {a.zone}</option>)}
                      </select>
                      <select className="form-input field-input mb-8" value={laborForm.costCode} onChange={e => setLaborForm(p => ({ ...p, costCode: e.target.value }))}>
                        {COST_CODES.map(cc => <option key={cc} value={cc}>{t(cc.charAt(0).toUpperCase() + cc.slice(1))}</option>)}
                      </select>
                      <div className="frm-flex-row">
                        <input type="number" className="form-input field-input mb-8" placeholder={t("Hours")} value={laborForm.hours} onChange={e => setLaborForm(p => ({ ...p, hours: e.target.value }))} style={{ flex: 1, fontSize: "var(--text-card)", height: 48 }} />
                        <select className="form-input field-input mb-8 frm-flex-1" value={laborForm.payType} onChange={e => setLaborForm(p => ({ ...p, payType: e.target.value }))}>
                          <option value="regular">{t("Regular")}</option>
                          <option value="overtime">{t("Overtime")}</option>
                          <option value="doubletime">{t("Double Time")}</option>
                        </select>
                      </div>
                      <input type="text" className="form-input field-input mb-8" placeholder={t("Notes")} value={laborForm.notes} onChange={e => setLaborForm(p => ({ ...p, notes: e.target.value }))} />

                      {/* Submit button — bulk or single */}
                      {bulkLaborMode ? (
                        <button className="btn btn-primary touch-target frm-labor-submit" onClick={handleBulkLabor}
                          disabled={Object.values(bulkLaborSelected).filter(Boolean).length === 0 || !laborForm.areaId || !laborForm.hours}>
                          {t("Add Labor")} ({Object.values(bulkLaborSelected).filter(Boolean).length} {t("crew")})
                        </button>
                      ) : (
                        <button className="btn btn-primary touch-target frm-labor-submit" onClick={handleAddLabor}
                          disabled={!laborForm.employeeId || !laborForm.areaId || !laborForm.hours}>
                          {t("Add Labor")}
                        </button>
                      )}

                      {/* Today's labor entries with edit/delete */}
                      {laborEntries.filter(le => le.projectId === selectedProjectId && le.date === new Date().toISOString().slice(0, 10) && le.status !== "deleted").length > 0 && (
                        <div className="frm-labor-today">
                          <div className="text-xs font-bold mb-4">{t("Today's Labor")} ({laborEntries.filter(le => le.projectId === selectedProjectId && le.date === new Date().toISOString().slice(0, 10) && le.status !== "deleted").reduce((s, le) => s + le.hours, 0).toFixed(1)}h)</div>
                          {laborEntries.filter(le => le.projectId === selectedProjectId && le.date === new Date().toISOString().slice(0, 10) && le.status !== "deleted").map(le => (
                            <div key={le.id} className="frm-labor-row">
                              <span className="frm-flex-1 frm-truncate">{le.employeeName}</span>
                              <span className="text-muted">{le.costCode}</span>
                              {editingLaborId === le.id ? (
                                <div className="frm-flex-row-center" style={{ gap: "var(--space-1)" }}>
                                  <input type="number" value={editingLaborHours} onChange={e => setEditingLaborHours(e.target.value)}
                                    className="frm-labor-edit-input"
                                    autoFocus onKeyDown={e => { if (e.key === "Enter") { handleEditLabor(le.id, editingLaborHours); setEditingLaborId(null); } if (e.key === "Escape") setEditingLaborId(null); }} />
                                  <button className="frm-labor-edit-ok"
                                    onClick={() => { handleEditLabor(le.id, editingLaborHours); setEditingLaborId(null); }}>✓</button>
                                  <button className="frm-btn-unstyled--text3"
                                    onClick={() => setEditingLaborId(null)}>✕</button>
                                </div>
                              ) : (
                                <>
                                  <span className="frm-labor-hours">{le.hours}h{le.payType !== "regular" ? ` ${le.payType.slice(0,2).toUpperCase()}` : ""}</span>
                                  <button className="frm-btn-unstyled--text3"
                                    onClick={() => { setEditingLaborId(le.id); setEditingLaborHours(String(le.hours)); }}>
                                    <PenLine size={12} />
                                  </button>
                                </>
                              )}
                              <button className="frm-btn-unstyled--red"
                                onClick={() => handleDeleteLabor(le.id)}>
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="section-header">
                    <div className="section-title frm-section-title-md">{t("Crew Members")}</div>
                    <button
                      className="btn btn-sm frm-add-crew-btn"
                      onClick={() => { setShowCrewAdd(v => !v); setCrewAddSearch(""); }}
                    >
                      <UserPlus size={15} />
                      {t("Add Crew")}
                    </button>
                  </div>

                  {/* Add team member dropdown */}
                  {showCrewAdd && (
                    <div className="frm-crew-add-wrap">
                      <div className="frm-crew-add-header">
                        <Search size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
                        <input
                          ref={teamAddRef}
                          autoFocus
                          type="text"
                          placeholder={t("Search employees...")}
                          value={teamAddSearch}
                          onChange={e => setCrewAddSearch(e.target.value)}
                          className="frm-crew-add-input"
                        />
                        <button onClick={() => setShowCrewAdd(false)} className="frm-btn-unstyled--text3">
                          <X size={14} />
                        </button>
                      </div>
                      {teamAddFiltered.length === 0 ? (
                        <div className="frm-crew-add-empty">{t("No employees found")}</div>
                      ) : (
                        teamAddFiltered.map(emp => (
                          <div
                            key={emp.id}
                            className="frm-crew-add-row"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setExtraCrewIds(prev => [...prev, emp.id]);
                              setCrewAddSearch("");
                            }}
                          >
                            <div className="frm-crew-add-avatar">
                              {emp.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div className="frm-flex-1">
                              <div className="frm-font-14" style={{ color: "var(--text)" }}>{emp.name}</div>
                              <div className="frm-font-11" style={{ color: "var(--text3)" }}>{emp.role || ""}</div>
                            </div>
                            <UserPlus size={14} className="frm-amber" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {allDisplayCrew.length === 0 ? (
                    <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
                      <div style={{ fontSize: "var(--text-stat)", marginBottom: "var(--space-2)", opacity: 0.5 }}><UserPlus size={36} /></div>
                      <div className="empty-text">{t("No team assigned")}</div>
                      <div className="text-xs text-muted frm-mt-8">{t("Tap Add Crew to add members")}</div>
                    </div>
                  ) : (
                    <div className="frm-flex-col-6">
                      {teamForProject.map(c => (
                        <div key={c.id} className="foreman-team-row">
                          <div>
                            <div className="foreman-team-name">{c.name}</div>
                            <div className="foreman-team-role">{t(c.role)}</div>
                            <div className="text-xs text-muted frm-mt-2">
                              {DAY_KEYS.filter(d => c.days?.[d]).map(d => t(d.charAt(0).toUpperCase() + d.slice(1))).join(", ")}
                            </div>
                          </div>
                          <div className="frm-text-right">
                            <div className="foreman-team-hours">{fmtHours(c.todayHours)}</div>
                            <div className="text-xs text-muted">{t("Hours Today")}</div>
                            <div className="text-xs text-dim frm-mt-2">
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
                            <div className="text-xs frm-mt-2 frm-amber">+ {t("Added today")}</div>
                          </div>
                          <button
                            className="frm-btn-unstyled--text3" style={{ padding: "var(--space-2)" }}
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
                    {pendingLoading ? (
                      <div className="frm-flex-col-8">
                        {[1,2].map(i => <Skeleton key={i} width="100%" height="64px" style={{ borderRadius: "var(--radius)" }} />)}
                      </div>
                    ) : pendingRequests.length === 0 ? (
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
                    {certsLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                        {[1,2,3].map(i => <Skeleton key={i} width="100%" height="56px" style={{ borderRadius: "var(--radius)" }} />)}
                      </div>
                    ) : filteredCrewCerts.length === 0 ? (
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
                  <div className="section-title frm-section-title-md">{t("Hours")}</div>
                </div>

                {/* Summary card */}
                <div className="foreman-kpi-card frm-mb-16">
                  <div className="frm-flex-between frm-mb-8">
                    <div>
                      <div className="foreman-kpi-label">{t("Allocated Hours")}</div>
                      <div className="foreman-kpi-value frm-font-20">{allocatedHours.toLocaleString()} {t("hrs")}</div>
                    </div>
                    <div className="frm-text-right">
                      <div className="foreman-kpi-label">{t("Hours Used")}</div>
                      <div className="foreman-kpi-value" style={{ fontSize: "var(--text-subtitle)", color: budgetColor }}>{hoursUsed.toFixed(1)} {t("hrs")}</div>
                    </div>
                  </div>
                  <div className="foreman-budget-bar">
                    <div className="foreman-budget-fill"
                      style={{ width: `${Math.min(pctUsed, 100)}%`, background: budgetColor }} />
                  </div>
                  <div className="frm-flex-between">
                    <span className="text-xs text-muted">{t("Hours Remaining")}: <b style={{ color: hoursRemaining < 0 ? "var(--red)" : "var(--green)" }}>{hoursRemaining.toFixed(1)} {t("hrs")}</b></span>
                    <span className="text-xs text-muted">{t("Burn Rate")}: <b className="frm-amber">{weeklyBurnHours.toFixed(1)} {t("hrs")}</b> {t("per week")}</span>
                  </div>
                </div>

                {/* Per-employee hours breakdown */}
                <div className="section-header mb-8">
                  <div className="section-title frm-font-14">{t("Crew Members")}</div>
                </div>
                {teamForProject.length === 0 ? (
                  <div className="text-sm text-muted">{t("No team assigned")}</div>
                ) : (
                  <div className="foreman-kpi-card">
                    <div className="foreman-cost-row foreman-table-header">
                      <span className="foreman-cell--name">{t("Crew")}</span>
                      <span className="foreman-cell">{t("Role")}</span>
                      <span className="foreman-cell">{t("Hours Today")}</span>
                      <span className="foreman-cell">{t("Hours This Week")}</span>
                    </div>
                    {teamForProject.map(c => (
                      <div key={c.id} className="foreman-cost-row">
                        <span className="foreman-cell--name">{c.name}</span>
                        <span className="foreman-cell text-xs text-muted">{t(c.role)}</span>
                        <span className="foreman-cell foreman-cell--mono">{fmtHours(c.todayHours)}</span>
                        <span className="foreman-cell foreman-cell--accent">{fmtHours(c.weekHours)}</span>
                      </div>
                    ))}
                    <div className="foreman-cost-row foreman-table-total">
                      <span className="foreman-cell--name">Total</span>
                      <span className="foreman-cell"></span>
                      <span className="foreman-cell foreman-cell--mono">
                        {fmtHours(teamForProject.reduce((s, c) => s + c.todayHours, 0))}
                      </span>
                      <span className="foreman-cell foreman-cell--accent">
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
                  <div className="section-title frm-section-title-md">{t("Request Material")}</div>
                </div>
                <div className="card foreman-form-card">
                  <div className="foreman-form-stack">
                    <div>
                      <label className="foreman-form-label">{t("Material")}</label>
                      <input type="text" className="login-input" placeholder='e.g., 5/8" Type X GWB'
                        value={matForm.material} onChange={e => setMatForm(f => ({ ...f, material: e.target.value }))} />
                    </div>
                    <div className="foreman-form-row">
                      <div className="frm-flex-1">
                        <label className="foreman-form-label">{t("Quantity")}</label>
                        <input type="number" className="login-input" min="1"
                          value={matForm.qty} onChange={e => setMatForm(f => ({ ...f, qty: e.target.value }))} />
                      </div>
                      <div>
                        <label className="foreman-form-label">{t("Unit")}</label>
                        <select className="settings-select" value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))}>
                          {["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="foreman-form-label">{t("Notes")}</label>
                      <textarea className="login-input frm-resize-v" rows={2} style={{ minHeight: 60 }}
                        value={matForm.notes} onChange={e => setMatForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="frm-flex-row">
                      <div className="frm-flex-1">
                        <label className="foreman-form-label">{t("Priority")}</label>
                        <select className="settings-select" value={matForm.urgency} onChange={e => setMatForm(f => ({ ...f, urgency: e.target.value }))}>
                          <option value="normal">{t("Normal")}</option>
                          <option value="urgent">⚡ {t("Urgent")}</option>
                          <option value="emergency">🚨 {t("Emergency")}</option>
                        </select>
                      </div>
                      <div className="frm-flex-1">
                        <label className="foreman-form-label">{t("Needed By")}</label>
                        <input type="date" className="login-input" value={matForm.neededBy} onChange={e => setMatForm(f => ({ ...f, neededBy: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginTop: "var(--space-2)" }}>
                      <PhotoCapture photos={matPhotos} setPhotos={setMatPhotos} label={t("Attach Photo")} max={3} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleMatSubmit}>{t("Submit Request")}</button>
                  </div>
                </div>

                <div className="section-header">
                  <div className="section-title frm-font-14">{t("Material Requests")}</div>
                </div>
                {projectMatRequests.length === 0 ? (
                  <div className="empty-state" style={{ padding: "var(--space-5)" }}>
                    <div className="empty-icon"><Package size={32} /></div>
                    <div className="empty-text">{t("No material requests yet")}</div>
                  </div>
                ) : (
                  <div className="frm-flex-col-8">
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
                        {(req.photoUrl || req.photos?.length > 0) && (
                          <div className="frm-photo-thumb-row" style={{ marginBottom: "var(--space-2)" }}>
                            {(req.photos || []).slice(0, 3).map((ph, i) => (
                              <img key={i} src={ph.data || ph} alt="" style={{ width: 40, height: 40, borderRadius: "var(--radius-control)", objectFit: "cover" }} />
                            ))}
                            {!req.photos?.length && req.photoUrl && (
                              <img src={req.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "var(--radius-control)", objectFit: "cover" }} />
                            )}
                          </div>
                        )}
                        {/* Shortage / damage report alert */}
                        {req.shortageReport && (
                          <div style={{ padding: "var(--space-2) var(--space-3)", background: "var(--red-dim, rgba(239,68,68,0.08))", borderRadius: "var(--radius-control)", borderLeft: "3px solid var(--red)", marginBottom: "var(--space-2)" }}>
                            <div className="text-xs font-semi" style={{ color: "var(--red)" }}>⚠ {req.shortageReport.type || t("Shortage Report")}</div>
                            {req.shortageReport.description && <div className="text-xs text-muted">{req.shortageReport.description}</div>}
                            {req.shortageReport.expectedQty != null && <div className="text-xs text-dim">Expected: {req.shortageReport.expectedQty} · Received: {req.shortageReport.receivedQty}</div>}
                          </div>
                        )}
                        {/* Confirm receipt when delivered */}
                        {req.status === "delivered" && !req.confirmedBy && (
                          <div className="frm-flex-row">
                            <button className="btn btn-primary btn-sm" style={{ background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                              onClick={() => handleForemanConfirm(req.id, "")}>
                              ✓ {t("Confirm Receipt")}
                            </button>
                            <button className="btn btn-ghost btn-sm frm-amber"
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

            {/* ═══ DELIVERIES TAB ═══ */}
            {foremanTab === "deliveries" && (
              <DeliveriesTab app={{ ...app, materialRequests, setMaterialRequests, projects, auth: { ...app.auth, role: "foreman", id: activeForeman?.id, name: activeForeman?.name } }} />
            )}

            {/* ═══ DECISION LOG TAB ═══ */}
            {foremanTab === "decisionLog" && (
              <div className="emp-content">
                <DecisionLogTab
                  decisionLog={decisionLog}
                  setDecisionLog={setDecisionLog}
                  projectId={selectedProjectId}
                  employees={employees}
                  t={t}
                  defaultRecordedBy={activeForeman?.name || ""}
                />
              </div>
            )}

            {/* ═══ JSA TAB ═══ */}
            {foremanTab === "jsa" && (
              <div className="emp-content">
                {/* ── JSA LIST VIEW ── */}
                {jsaView === "list" && (
                  <div>
                    <div className="flex-between frm-mb-12">
                      <div className="section-title frm-section-title-md">{t("Job Safety Analysis")}</div>
                      <div className="frm-flex-row" style={{ gap: "var(--space-2)" }}>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setJsaView("rollcall");
                          setRcStep("pick");
                          setRcWeather("clear");
                          setRcJsaId(null);
                        }}>{t("Pre-Task Safety")}</button>
                        <button className="cal-nav-btn frm-font-11" onClick={() => {
                          setJsaForm(f => ({ ...f, projectId: String(selectedProjectId || ""), supervisor: activeForeman.name, competentPerson: activeForeman.name }));
                          setJsaView("create");
                        }}>+</button>
                      </div>
                    </div>

                    {myJsas.length === 0 ? (
                      <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
                        <div className="empty-icon"><Shield size={32} /></div>
                        <div className="empty-text">{t("No JSAs yet. Create one for today's work.")}</div>
                      </div>
                    ) : myJsas.sort((a, b) => b.date.localeCompare(a.date)).map(j => {
                      const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
                      const rc = riskColor(maxRisk);
                      const statusClr = j.status === "active" ? "var(--green)" : j.status === "draft" ? "var(--amber)" : "var(--text3)";
                      const proj = projects.find(p => String(p.id) === String(j.projectId));
                      return (
                        <div key={j.id} className="card frm-p-12 frm-mb-8" style={{ cursor: "pointer" }} onClick={() => { setActiveJsaId(j.id); setJsaView("detail"); }}>
                          <div className="flex-between frm-mb-4">
                            <div className="frm-flex-row-center" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
                              <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr, fontSize: "var(--text-xs)" }}>{j.status.toUpperCase()}</span>
                              <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg, fontSize: "var(--text-xs)" }}>{rc.label}</span>
                            </div>
                            <span className="frm-font-11" style={{ color: "var(--text3)" }}>{(j.teamSignOn || []).length} {t("signed")}</span>
                          </div>
                          <div className="frm-font-14">{j.title}</div>
                          <div className="frm-font-11" style={{ color: "var(--text3)" }}>{proj?.name} · {j.date}</div>
                          <div className="frm-flex-row frm-mt-8" style={{ gap: "var(--space-1)" }}>
                            {(j.ppe || []).slice(0, 6).map(k => {
                              const item = PPE_ITEMS.find(p => p.key === k);
                              return item ? <span key={k} className="frm-font-14">{item.icon}</span> : null;
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
                        <div className="frm-flex-row-center frm-mb-16">
                          <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("← Back")}</button>
                          <span className="frm-font-16">{t("Pre-Task Safety")}</span>
                        </div>

                        {!selectedProjectId && (
                          <div className="card frm-text-center frm-p-16 frm-amber">
                            {t("Select a project first")}
                          </div>
                        )}

                        {selectedProjectId && (
                          <>
                            <div className="frm-font-13" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{proj?.name || "Project"}</div>
                            <div className="frm-font-13 frm-mb-16">{t("Pick today's task")}</div>

                            {/* Indoor / Outdoor toggle */}
                            <div className="frm-mb-16">
                              <div className="frm-form-label-upper frm-font-12">{t("Work Environment")}</div>
                              <div className="frm-flex-row">
                                {[{ key: "indoor", label: t("Indoor"), labelEs: "Interior" }, { key: "outdoor", label: t("Outdoor"), labelEs: "Exterior" }].map(opt => (
                                  <button
                                    key={opt.key}
                                    onClick={() => setRcIndoorOutdoor(opt.key)}
                                    style={{
                                      flex: 1, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-control)", fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", cursor: "pointer", border: "2px solid",
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
                            <div className="frm-grid-2-10 frm-mb-20">
                              {TRADE_CARDS.map(card => {
                                const tmpl = JSA_TEMPLATES.find(t => t.id === card.templateId);
                                if (!tmpl) return null;
                                const tradeLabel = lang === "es"
                                  ? (TRADE_LABELS[card.trade]?.labelEs || card.trade) + (card.suffixEs ? " — " + card.suffixEs : "")
                                  : (TRADE_LABELS[card.trade]?.label || card.trade) + (card.suffix ? " — " + card.suffix : "");
                                return (
                                  <div key={card.templateId} className="card" style={{
                                    padding: "var(--space-4)", cursor: "pointer", borderLeft: `4px solid ${card.color}`,
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)",
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
                                    <span style={{ fontSize: "var(--text-title)" }}>{card.icon}</span>
                                    <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: card.color }}>{tradeLabel}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Weather quick-select — only for outdoor jobs */}
                            {rcIndoorOutdoor === "outdoor" && (
                              <div className="mb-8">
                                <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--text2)", marginBottom: "var(--space-2)" }}>{t("Weather")}</div>
                                <div className="frm-flex-wrap" style={{ gap: "var(--space-2)" }}>
                                  {WEATHER_QUICK.map(w => (
                                    <button key={w.key} className={rcWeather === w.key ? "btn btn-primary btn-sm" : "cal-nav-btn"}
                                      style={{ fontSize: "var(--text-label)", padding: "var(--space-2) var(--space-3)" }}
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
                        <div className="frm-flex-row-center frm-mb-12">
                          <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); setRcPendingCard(null); }}>{t("← Back")}</button>
                          <span className="frm-font-16">{t("Select Hazards")}</span>
                        </div>

                        <div className="frm-font-13" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{proj?.name}</div>
                        <div className="frm-font-12" style={{ color: "var(--text3)", marginBottom: "var(--space-4)" }}>
                          {t("Pick as many as apply")} · {TRADE_LABELS[trade]?.label || trade}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
                          {lib.map((h, idx) => {
                            const isChecked = !!rcSelectedHazardIdxs[idx];
                            const catInfo = HAZARD_CATEGORIES.find(c => c.key === h.category);
                            return (
                              <div
                                key={idx}
                                onClick={() => setRcSelectedHazardIdxs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                style={{
                                  display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
                                  background: isChecked ? "var(--bg2)" : "var(--bg3)",
                                  border: `1.5px solid ${isChecked ? (catInfo?.color || "var(--accent)") : "var(--border)"}`,
                                  borderRadius: "var(--radius-control)", cursor: "pointer", transition: "all 0.15s",
                                }}
                              >
                                <div style={{ flexShrink: 0, marginTop: "var(--space-1)", color: isChecked ? (catInfo?.color || "var(--accent)") : "var(--text3)" }}>
                                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="frm-flex-1">
                                  <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: isChecked ? "var(--text)" : "var(--text3)" }}>{h.hazard}</div>
                                  {h.hazardEs && <div className="frm-font-11" style={{ color: "var(--text3)", fontStyle: "italic" }}>{h.hazardEs}</div>}
                                  {isChecked && (
                                    <div className="frm-mt-4">
                                      {h.controls.slice(0, 2).map((c, ci) => (
                                        <div key={ci} className="frm-font-11" style={{ color: "var(--text2)" }}>✓ {c}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {catInfo && (
                                  <span style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", background: catInfo.color + "22", color: catInfo.color, fontWeight: "var(--weight-bold)", flexShrink: 0 }}>
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
                                  display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
                                  background: isChecked ? "var(--bg2)" : "var(--bg3)",
                                  border: `1.5px solid ${isChecked ? "var(--amber)" : "var(--border)"}`,
                                  borderRadius: "var(--radius-control)", cursor: "pointer", transition: "all 0.15s",
                                }}
                              >
                                <div style={{ flexShrink: 0, marginTop: "var(--space-1)", color: isChecked ? "var(--amber)" : "var(--text3)" }}>
                                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="frm-flex-1">
                                  <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: isChecked ? "var(--text)" : "var(--text3)" }}>{wh.hazard}</div>
                                  {wh.hazardEs && <div className="frm-font-11" style={{ color: "var(--text3)", fontStyle: "italic" }}>{wh.hazardEs}</div>}
                                </div>
                                <span style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", background: "#eab30822", color: "var(--amber)", fontWeight: "var(--weight-bold)", flexShrink: 0 }}>
                                  Weather
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <button
                          className="btn btn-primary frm-w-full" style={{ padding: "var(--space-4)", fontSize: "var(--text-card)" }}
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
                        <div className="frm-flex-row-center frm-mb-12">
                          <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); }}>{t("← Back")}</button>
                          <span className="frm-font-16">{t("Crew Roll Call")}</span>
                        </div>

                        <div className="frm-font-13" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{proj?.name} · {rcJsa?.title}</div>
                        <div className="frm-font-12" style={{ color: "var(--text3)", marginBottom: "var(--space-4)" }}>
                          {new Date().toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </div>

                        {/* Crew list */}
                        {allTeam.length === 0 ? (
                          <div className="card frm-text-center frm-p-16" style={{ color: "var(--text3)" }}>
                            {t("No team scheduled. Add team members below.")}
                          </div>
                        ) : allTeam.map(c => (
                          <div key={c.id} className="card" style={{
                            padding: "var(--space-3)", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer",
                            borderLeft: rcSelected[c.id] ? "4px solid #10b981" : "4px solid var(--border)",
                            opacity: rcSelected[c.id] ? 1 : 0.5,
                          }} onClick={() => setRcSelected(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                            <span style={{ width: 28, display: "flex", justifyContent: "center" }}>{rcSelected[c.id] ? <CheckCircle size={20} style={{ color: "var(--green)" }} /> : <Square size={20} style={{ color: "var(--text3)" }} />}</span>
                            <div>
                              <div className="frm-font-14">{c.name}</div>
                              <div className="frm-font-11" style={{ color: "var(--text3)" }}>{c.role || "Crew"}</div>
                            </div>
                          </div>
                        ))}

                        {/* Add team */}
                        {rcAddingCrew ? (
                          <select className="form-select" style={{ fontSize: "var(--text-label)", marginTop: "var(--space-2)" }} autoFocus
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
                          <button className="cal-nav-btn" style={{ marginTop: "var(--space-2)", fontSize: "var(--text-label)" }} onClick={() => setRcAddingCrew(true)}>
                            + {t("Add Crew")}
                          </button>
                        )}

                        {/* Start Sign-On */}
                        <button className="btn btn-primary frm-w-full" style={{ marginTop: "var(--space-5)", padding: "var(--space-4)", fontSize: "var(--text-card)" }}
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
                        <div className="frm-mb-12">
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-label)", color: "var(--text3)", marginBottom: "var(--space-1)" }}>
                            <span>{progress} {t("of")} {total}</span>
                            <span>{t("Pass device to next person")}</span>
                          </div>
                          <div style={{ height: 4, background: "var(--border)", borderRadius: "var(--radius-control)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(progress / total) * 100}%`, background: "var(--green)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
                          </div>
                        </div>

                        {/* Name banner */}
                        <div className="frm-text-center" style={{ padding: "var(--space-4) 0", marginBottom: "var(--space-3)" }}>
                          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)" }}>{current.name}</div>
                          <div className="frm-font-13" style={{ color: "var(--text3)" }}>{proj?.name}</div>
                        </div>

                        {/* Hazard cards */}
                        <div className="frm-mb-16">
                          <div className="frm-jsa-label" style={{ fontSize: "var(--text-label)" }}>{t("Hazards")}</div>
                          {allHazards.map((h, i) => {
                            const score = (h.likelihood || 1) * (h.severity || 1);
                            const hrc = riskColor(score);
                            const catInfo = HAZARD_CATEGORIES[h.category];
                            return (
                              <div key={i} className="card" style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)", borderLeft: `3px solid ${catInfo?.color || "var(--amber)"}` }}>
                                <div className="frm-flex-row-center frm-mb-4" style={{ gap: "var(--space-2)" }}>
                                  <span style={{ background: hrc.bg, color: "#fff", fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", fontWeight: "var(--weight-bold)" }}>{score}</span>
                                  <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)" }}>{h.hazard}</span>
                                </div>
                                {h.hazardEs && <div className="frm-font-11 frm-mb-4" style={{ color: "var(--text3)", fontStyle: "italic" }}>{h.hazardEs}</div>}
                                <div className="frm-font-11" style={{ color: "var(--text2)" }}>
                                  {(h.controls || []).map((c, ci) => <div key={ci}>✓ {c}</div>)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* PPE */}
                        <div className="frm-mb-16">
                          <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--amber)", marginBottom: "var(--space-2)" }}>{t("Required PPE")}</div>
                          <div className="frm-flex-wrap" style={{ gap: "var(--space-3)" }}>
                            {(rcJsa?.ppe || []).map(k => {
                              const item = PPE_ITEMS.find(p => p.key === k);
                              return item ? (
                                <div key={k} className="frm-text-center">
                                  <div style={{ fontSize: "var(--text-subtitle)" }}>{item.icon}</div>
                                  <div className="frm-font-10" style={{ color: "var(--text2)" }}>{item.label}</div>
                                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text3)" }}>{item.labelEs}</div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>

                        {/* Signature pad */}
                        <div className="frm-mb-12">
                          <FieldSignaturePad
                            key={rcSignIdx}
                            label={t("Sign below")}
                            t={t}
                            onSave={(ref) => { sigRef.current = ref; }}
                          />
                        </div>

                        {/* Sign & Next button */}
                        <button className="btn btn-primary frm-w-full" style={{ padding: "var(--space-4)", fontSize: "var(--text-card)" }}
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
                        <div className="frm-text-center" style={{ padding: "var(--space-6) 0", marginBottom: "var(--space-4)" }}>
                          <div className="frm-font-16 frm-amber">{t("Supervisor Sign-Off")}</div>
                          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", marginTop: "var(--space-2)" }}>{activeForeman.name}</div>
                          <div className="frm-font-13 frm-mt-4" style={{ color: "var(--text3)" }}>
                            {(rcJsa?.teamSignOn || []).length} {t("team members signed")}
                          </div>
                        </div>

                        <FieldSignaturePad
                          key="supervisor"
                          label={t("Supervisor signature")}
                          t={t}
                          onSave={(ref) => { sigRef.current = ref; }}
                        />

                        <button className="btn btn-primary frm-w-full frm-mt-16" style={{ padding: "var(--space-4)", fontSize: "var(--text-card)" }}
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
                      <div className="frm-text-center">
                        <div className="frm-mb-8" style={{ display: "flex", justifyContent: "center" }}><CheckCircle size={48} style={{ color: "var(--green)" }} /></div>
                        <div className="frm-font-20 frm-mb-4">{t("Pre-Task Safety Complete")}</div>
                        <div className="frm-font-14 frm-mb-20" style={{ color: "var(--text2)" }}>
                          {(finalJsa?.teamSignOn || []).length} {t("team members signed")} · {finalJsa?.title}
                        </div>

                        {/* Signed team list */}
                        <div className="frm-mb-20">
                          {(finalJsa?.teamSignOn || []).map((c, i) => (
                            <div key={i} className="flex-between frm-rfi-row" style={{ fontSize: "inherit" }}>
                              <span className="frm-font-13" style={{ fontWeight: "var(--weight-medium)" }}>{c.name}</span>
                              <span className="frm-font-11" style={{ color: "var(--green)" }}>✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          ))}
                        </div>

                        <div className="frm-flex-row">
                          <button className="cal-nav-btn" style={{ flex: 1, padding: "var(--space-3)" }} onClick={async () => {
                            try {
                              const { generateJsaPdf } = await import("../utils/jsaPdf");
                              const p = projects.find(pr => pr.id === finalJsa?.projectId);
                              await generateJsaPdf({ ...finalJsa, projectName: p?.name || "Project" });
                              show(t("PDF exported"), "ok");
                            } catch (e) { show("PDF error: " + e.message, "err"); }
                          }}>{t("Export PDF")}</button>
                          <button className="btn btn-primary" style={{ flex: 1, padding: "var(--space-3)" }} onClick={() => {
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
                  const statusClr = jsa.status === "active" ? "var(--green)" : jsa.status === "draft" ? "var(--amber)" : "var(--text3)";
                  return (
                    <div>
                      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                        <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("← Back")}</button>
                        <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr }}>{jsa.status.toUpperCase()}</span>
                        <div className="frm-flex-row" style={{ marginLeft: "auto", gap: "var(--space-2)" }}>
                          {jsa.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateJsa({ status: "active" })}>{t("Activate")}</button>}
                          {jsa.status === "active" && <button className="cal-nav-btn" onClick={() => updateJsa({ status: "closed" })}>{t("Close JSA")}</button>}
                        </div>
                      </div>

                      <h3 className="frm-font-16 frm-mb-4">{jsa.title}</h3>
                      <div className="frm-font-12 frm-mb-12" style={{ color: "var(--text3)" }}>
                        {jsa.date} · {jsa.location} · {lang === "es" ? TRADE_LABELS[jsa.trade]?.labelEs : TRADE_LABELS[jsa.trade]?.label}
                      </div>

                      {/* Risk summary */}
                      <div className="frm-grid-3 frm-mb-16">
                        <div className="card frm-text-center frm-p-12">
                          <div style={{ fontSize: "var(--text-subtitle)", fontWeight: "var(--weight-bold)", color: rc.bg }}>{maxRisk}</div>
                          <div className="frm-font-10" style={{ color: "var(--text3)" }}>{t("Highest Risk")}</div>
                        </div>
                        <div className="card frm-text-center frm-p-12">
                          <div className="frm-font-20">{allHazards.length}</div>
                          <div className="frm-font-10" style={{ color: "var(--text3)" }}>{t("Hazards")}</div>
                        </div>
                        <div className="card frm-text-center frm-p-12">
                          <div className="frm-activity-value" style={{ color: "var(--green)" }}>{(jsa.teamSignOn || []).length}</div>
                          <div className="frm-font-10" style={{ color: "var(--text3)" }}>{t("Crew Signed")}</div>
                        </div>
                      </div>

                      {/* PPE */}
                      <div className="frm-mb-16">
                        <div className="frm-jsa-label">{t("Required PPE")}</div>
                        <div className="frm-flex-wrap" style={{ gap: "var(--space-2)" }}>
                          {(jsa.ppe || []).map(k => {
                            const item = PPE_ITEMS.find(p => p.key === k);
                            return item ? (
                              <div key={k} style={{ textAlign: "center", fontSize: "var(--text-tab)" }}>
                                <div className="frm-font-20">{item.icon}</div>
                                <div style={{ color: "var(--text3)" }}>{lang === "es" ? item.labelEs : item.label}</div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {/* Steps & Hazards */}
                      <div className="frm-mb-16">
                        <div className="frm-jsa-label">{t("Job Steps & Hazards")}</div>
                        {(jsa.steps || []).map((step, idx) => (
                          <div key={step.id} className="card" style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-1)" }}>
                              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--amber)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-tab)", fontWeight: "var(--weight-bold)", flexShrink: 0 }}>{idx + 1}</span>
                              <span className="frm-font-13">{step.step}</span>
                            </div>
                            {(step.hazards || []).map((h, hi) => {
                              const score = (h.likelihood || 1) * (h.severity || 1);
                              const hrc = riskColor(score);
                              return (
                                <div key={hi} style={{ marginLeft: "var(--space-8)", padding: "var(--space-2) 0", borderTop: "1px solid var(--border)" }}>
                                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-1)" }}>
                                    <span className="jsa-risk-score" style={{ background: hrc.bg, color: "#fff", fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)" }}>{score}</span>
                                    <span className="frm-font-12">{h.hazard}</span>
                                  </div>
                                  <div className="frm-font-11" style={{ color: "var(--text3)" }}>
                                    {(h.controls || []).map((c, ci) => <span key={ci}>✓ {c}{ci < h.controls.length - 1 ? " · " : ""}</span>)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Crew Sign-On */}
                      <div className="frm-mb-16">
                        <div className="frm-jsa-label">{t("Crew Sign-On")} ({(jsa.teamSignOn || []).length})</div>
                        {(jsa.teamSignOn || []).map((c, i) => (
                          <div key={i} className="flex-between frm-rfi-row" style={{ padding: "var(--space-2) 0" }}>
                            <span className="frm-font-13" style={{ fontWeight: "var(--weight-medium)" }}>{c.name}</span>
                            <span className="frm-font-11" style={{ color: "var(--green)" }}>✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        ))}
                        {jsa.status === "active" && (
                          <select className="form-select" style={{ fontSize: "var(--text-label)", marginTop: "var(--space-2)" }}
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
                        <div className="frm-jsa-label">{t("Near Misses")}</div>
                        {(jsa.nearMisses || []).length === 0 ? (
                          <div className="frm-font-12" style={{ color: "var(--text3)" }}>{t("None reported")}</div>
                        ) : (jsa.nearMisses || []).map((nm, i) => (
                          <div key={i} className="card" style={{ padding: "var(--space-2)", marginBottom: "var(--space-1)", fontSize: "var(--text-label)" }}>
                            {nm.description} — {nm.reportedBy} ({nm.date})
                          </div>
                        ))}
                        {jsa.status === "active" && (
                          <button className="cal-nav-btn" style={{ marginTop: "var(--space-2)", fontSize: "var(--text-tab)" }} onClick={() => {
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
                      <div className="frm-flex-row-center frm-mb-12">
                        <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("← Back")}</button>
                        <span className="frm-font-16">{t("Create New JSA")}</span>
                      </div>

                      {/* Template */}
                      <div className="form-group frm-mb-12">
                        <label className="form-label">{t("Start from Template")}</label>
                        <select className="form-select" value={jsaForm.templateId} onChange={e => applyTemplate(e.target.value)}>
                          <option value="">{t("— Blank JSA —")}</option>
                          {JSA_TEMPLATES.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{lang === "es" ? tmpl.titleEs : tmpl.title}</option>)}
                        </select>
                      </div>

                      {/* Basic fields */}
                      <div className="form-group mb-8">
                        <label className="form-label">{t("Project")}</label>
                        <select className="form-select" value={jsaForm.projectId} onChange={e => updJsaForm("projectId", e.target.value)}>
                          <option value="">{t("Select...")}</option>
                          {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group mb-8">
                        <label className="form-label">{t("Trade")}</label>
                        <select className="form-select" value={jsaForm.trade} onChange={e => updJsaForm("trade", e.target.value)}>
                          {Object.entries(TRADE_LABELS).map(([k, v]) => <option key={k} value={k}>{lang === "es" ? v.labelEs : v.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group mb-8">
                        <label className="form-label">{t("JSA Title")}</label>
                        <input className="form-input" value={jsaForm.title} onChange={e => updJsaForm("title", e.target.value)} placeholder={t("e.g. Metal Stud Framing — Level 2")} />
                      </div>
                      <div className="form-group mb-8">
                        <label className="form-label">{t("Location on Site")}</label>
                        <input className="form-input" value={jsaForm.location} onChange={e => updJsaForm("location", e.target.value)} />
                      </div>
                      <div className="form-group mb-8">
                        <label className="form-label">{t("Date")}</label>
                        <input className="form-input" type="date" value={jsaForm.date} onChange={e => updJsaForm("date", e.target.value)} />
                      </div>
                      <div className="form-group mb-8">
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
                        <div className="jsa-weather-warn frm-mb-12">
                          <AlertTriangle size={14} style={{ display: "inline", marginRight: "var(--space-1)", verticalAlign: "middle" }} />{lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
                        </div>
                      )}

                      {/* PPE */}
                      <div className="frm-mb-12">
                        <div className="frm-jsa-label">{t("Required PPE")}</div>
                        <div className="frm-flex-wrap" style={{ gap: "var(--space-2)" }}>
                          {PPE_ITEMS.map(item => {
                            const active = jsaForm.ppe.includes(item.key);
                            return (
                              <div key={item.key} className={`jsa-ppe-pick${active ? " active" : ""}`}
                                onClick={() => updJsaForm("ppe", active ? jsaForm.ppe.filter(k => k !== item.key) : [...jsaForm.ppe, item.key])}
                                className="frm-text-center" style={{ padding: "var(--space-1) var(--space-2)", cursor: "pointer" }}>
                                <div style={{ fontSize: "var(--text-section)" }}>{item.icon}</div>
                                <div style={{ fontSize: "var(--text-xs)" }}>{lang === "es" ? item.labelEs : item.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Permits */}
                      <div className="frm-mb-12">
                        <div className="frm-jsa-label">{t("Permits Required")}</div>
                        <div className="frm-flex-wrap" style={{ gap: "var(--space-2)" }}>
                          {PERMIT_TYPES.map(p => {
                            const active = jsaForm.permits.includes(p.key);
                            return (
                              <button key={p.key} className={`cal-nav-btn${active ? " active" : ""}`}
                                style={active ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)", fontSize: "var(--text-tab)" } : { fontSize: "var(--text-tab)" }}
                                onClick={() => updJsaForm("permits", active ? jsaForm.permits.filter(k => k !== p.key) : [...jsaForm.permits, p.key])}>
                                {lang === "es" ? p.labelEs : p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="frm-mb-16">
                        <div className="frm-jsa-label">{t("Job Steps & Hazards")}</div>
                        {jsaForm.steps.map((step, idx) => (
                          <div key={step.id} className="card" style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                            <div className="frm-flex-row-center frm-mb-6" style={{ gap: "var(--space-2)" }}>
                              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--amber)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", flexShrink: 0 }}>{idx + 1}</span>
                              <input className="form-input frm-flex-1 frm-font-12" value={step.step}
                                onChange={e => updJsaForm("steps", jsaForm.steps.map((s, i) => i === idx ? { ...s, step: e.target.value } : s))}
                                placeholder={t("Describe this step...")} />
                              <button className="frm-btn-unstyled--red"
                                onClick={() => updJsaForm("steps", jsaForm.steps.filter((_, i) => i !== idx))}>✕</button>
                            </div>
                            {(step.hazards || []).map((h, hi) => {
                              const score = (h.likelihood || 1) * (h.severity || 1);
                              const hrc = riskColor(score);
                              return (
                                <div key={hi} style={{ marginLeft: 26, padding: "var(--space-1) 0", display: "flex", gap: "var(--space-2)", alignItems: "center", borderTop: "1px solid var(--border)" }}>
                                  <span className="jsa-risk-score" style={{ background: hrc.bg, color: "#fff", fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-1)", borderRadius: "var(--radius-control)" }}>{score}</span>
                                  <span className="frm-font-11 frm-flex-1">{h.hazard}</span>
                                  <button className="frm-btn-unstyled--red"
                                    onClick={() => {
                                      const steps = [...jsaForm.steps];
                                      steps[idx] = { ...steps[idx], hazards: steps[idx].hazards.filter((_, i) => i !== hi) };
                                      updJsaForm("steps", steps);
                                    }}>✕</button>
                                </div>
                              );
                            })}
                            <select className="form-select" style={{ fontSize: "var(--text-tab)", marginTop: "var(--space-1)", marginLeft: 26 }}
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
                        <button className="cal-nav-btn frm-font-12"
                          onClick={() => updJsaForm("steps", [...jsaForm.steps, { id: "s_" + Date.now(), step: "", hazards: [] }])}>
                          {t("+ Add Step")}
                        </button>
                      </div>

                      <div className="frm-flex-row" style={{ justifyContent: "flex-end" }}>
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
                  <div className="section-title frm-section-title-md">{t("14-Day Look-Ahead")}</div>
                </div>
                <div className="text-xs text-muted frm-mb-12">
                  {t("Upcoming milestones, inspections, and deadlines for this project. Read-only — contact PM for changes.")}
                </div>

                {lookAheadEvents.length === 0 ? (
                  <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
                    <div className="empty-text">{t("No events in the next 14 days")}</div>
                    <div className="text-xs text-muted frm-mt-8">{t("The PM will add milestones, inspections, and deadlines here.")}</div>
                  </div>
                ) : (
                  <div className="frm-flex-col-6">
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
                              fontSize: "var(--text-label)", fontWeight: "var(--weight-bold)", padding: "var(--space-2) 0", marginTop: "var(--space-2)",
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
                                <div key={ev.id} className="card frm-mt-4" style={{ padding: "var(--space-3) var(--space-4)" }}>
                                  <div className="frm-flex-row-center" style={{ gap: "var(--space-3)" }}>
                                    <div style={{
                                      width: 4, height: 32, borderRadius: "var(--radius-control)", background: color, flexShrink: 0,
                                    }} />
                                    <div className="frm-flex-1">
                                      <div className="text-sm font-semi frm-truncate">
                                        {ev.title}
                                      </div>
                                      <div className="text-xs text-muted">
                                        {ev.type && <span style={{ textTransform: "capitalize" }}>{t(ev.type)}</span>}
                                        {ev.startTime ? ` · ${ev.startTime}` : ""}
                                        {ev.start_time ? ` · ${ev.start_time}` : ""}
                                        {ev.location ? ` · ${ev.location}` : ""}
                                      </div>
                                      {ev.notes && <div className="text-xs text-dim frm-mt-2">{ev.notes.length > 80 ? ev.notes.slice(0, 80) + "..." : ev.notes}</div>}
                                    </div>
                                    {ev.status && ev.status !== "scheduled" && (
                                      <span className={`badge ${ev.status === "completed" ? "badge-green" : "badge-amber"}`} style={{ fontSize: "var(--text-xs)" }}>
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
                <div className="section-header frm-flex-between">
                  <div className="section-title frm-section-title-md">{t("Daily Reports")}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowReportForm(!showReportForm); setEditingReportId(null); if (!showReportForm) setReportForm({ ...EMPTY_REPORT_FORM, date: new Date().toISOString().slice(0, 10) }); }}>
                    {showReportForm ? t("Cancel") : `+ ${t("New Report")}`}
                  </button>
                </div>

                {/* Auto-aggregated summary from today's entries */}
                {(() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const todayProd = (productionLogs || []).filter(l => l.date === today && String(l.projectId) === String(selectedProjectId) && l.status !== "deleted");
                  const todayTm = (tmTickets || []).filter(t2 => t2.date === today && String(t2.projectId) === String(selectedProjectId) && t2.status !== "deleted");
                  const todayPunch = (punchItems || []).filter(p => String(p.projectId) === String(selectedProjectId) && (p.createdAt || "").startsWith(today) && p.status !== "deleted");
                  const todayTime = (timeEntries || []).filter(te => String(te.projectId) === String(selectedProjectId) && (te.clockIn || "").startsWith(today));
                  const totalHours = todayTime.reduce((s, te) => s + (te.totalHours || 0), 0);

                  if (todayProd.length === 0 && todayTm.length === 0 && todayPunch.length === 0 && todayTime.length === 0) return null;

                  return (
                    <div style={{ padding: "var(--space-3)", background: "var(--bg3)", borderRadius: "var(--radius-control)", marginBottom: "var(--space-4)", marginTop: "var(--space-3)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", textTransform: "uppercase", fontWeight: "var(--weight-bold)", marginBottom: "var(--space-2)" }}>{t("Today's Activity")} ({t("Auto-Populated")})</div>

                      {todayTime.length > 0 && (
                        <div className="frm-font-13 frm-mb-6" style={{ color: "var(--text)" }}>
                          <strong>{todayTime.length} {t("crew")}</strong> {t("on site")} · <strong>{totalHours.toFixed(1)}h</strong> {t("total")}
                        </div>
                      )}

                      {todayProd.length > 0 && (
                        <div className="frm-mb-6">
                          <div className="frm-font-12" style={{ color: "var(--text2)" }}>{t("Production")}:</div>
                          {todayProd.map(p => (
                            <div key={p.id} className="frm-font-12" style={{ color: "var(--text)", paddingLeft: "var(--space-2)" }}>
                              {"\u2022"} {p.trade}: {p.qtyInstalled} {p.unit} {t("in")} {(areas || []).find(a => a.id === p.areaId)?.name || "\u2014"}
                            </div>
                          ))}
                        </div>
                      )}

                      {todayTm.length > 0 && (
                        <div className="frm-mb-6">
                          <div className="frm-font-12" style={{ color: "var(--text2)" }}>{t("T&M")} {t("Tickets")}:</div>
                          {todayTm.map(tk => (
                            <div key={tk.id} className="frm-font-12" style={{ color: "var(--text)", paddingLeft: "var(--space-2)" }}>
                              {"\u2022"} {tk.ticketNumber}: {(tk.description || "").slice(0, 60)}
                            </div>
                          ))}
                        </div>
                      )}

                      {todayPunch.length > 0 && (
                        <div>
                          <div className="frm-font-12" style={{ color: "var(--text2)" }}>{t("Punch List")}:</div>
                          <div className="frm-font-12" style={{ color: "var(--text)", paddingLeft: "var(--space-2)" }}>
                            {todayPunch.length} {t("new")} {t("item")}{todayPunch.length !== 1 ? "s" : ""} {t("logged")}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Report Creation / Edit Form ── */}
                {showReportForm && (
                  <div className="card frm-report-card frm-mt-12 frm-p-16">

                    {/* Quick-fill from yesterday */}
                    {!editingReportId && (
                      <div className="frm-flex-row frm-mb-12">
                        <button className="btn btn-sm" style={{ fontSize: "var(--text-tab)", background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                          onClick={fillFromYesterday}>
                          {t("Quick-fill from yesterday")}
                        </button>
                      </div>
                    )}

                    {/* Date + Project */}
                    <div className="frm-grid-2-10">
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

                    {/* Outdoor toggle — weather fields only relevant for exterior work */}
                    <div className="frm-mt-10" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-label)", color: "var(--text2)" }}>
                        <input type="checkbox"
                          checked={!!reportForm.isOutdoor}
                          onChange={e => setReportForm(f => ({ ...f, isOutdoor: e.target.checked, ...(e.target.checked ? {} : { temperature: "", weatherCondition: "Clear" }) }))} />
                        <span>{t("Outdoor work today")}</span>
                      </label>
                    </div>

                    {/* Weather: Temperature + Conditions (outdoor only) */}
                    {reportForm.isOutdoor && (
                      <div className="frm-grid-2-10 frm-mt-10">
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
                    )}

                    {/* Crew on Site — checkboxes + manual add */}
                    {(() => {
                      const scheduledIds = new Set(teamForProject.map(c => c.id));
                      const present = reportForm.teamPresent || [];
                      // Employees already on the report who aren't scheduled (manually added)
                      const extraCrew = present
                        .map(cp => {
                          const id = typeof cp === "string" ? cp : cp.id;
                          if (scheduledIds.has(id)) return null;
                          const emp = (employees || []).find(e => String(e.id) === String(id));
                          return emp ? { id: emp.id, name: emp.name, role: emp.role || "Crew" } : { id, name: (typeof cp === "object" ? cp.name : "") || "Unknown", role: "Crew" };
                        })
                        .filter(Boolean);
                      const combined = [...teamForProject, ...extraCrew];
                      const combinedIds = new Set(combined.map(c => c.id));
                      const availableEmployees = (employees || [])
                        .filter(e => e.active !== false && !combinedIds.has(e.id))
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                      const isChecked = (id) => present.some(cp => (typeof cp === "string" ? cp : cp.id) === id);
                      const toggle = (c, checked) => {
                        setReportForm(f => {
                          const p = f.teamPresent || [];
                          if (checked) return { ...f, teamPresent: [...p, { id: c.id, name: c.name }] };
                          return { ...f, teamPresent: p.filter(cp => (typeof cp === "string" ? cp : cp.id) !== c.id) };
                        });
                      };
                      return (
                        <div className="frm-mt-12">
                          <label className="form-label">{t("Crew on Site")} ({present.length})</label>
                          <div className="frm-report-crew-list">
                            {combined.length > 0 ? combined.map(c => (
                              <label key={c.id} className="frm-report-crew-label">
                                <input type="checkbox"
                                  checked={isChecked(c.id)}
                                  onChange={e => toggle(c, e.target.checked)} />
                                <span>{c.name}</span>
                                {c.todayHours > 0 && <span className="text-xs text-muted">({c.todayHours.toFixed(1)}h)</span>}
                                {!scheduledIds.has(c.id) && <span className="text-xs text-muted">({t("added")})</span>}
                              </label>
                            )) : (
                              <div className="text-xs text-muted" style={{ padding: "var(--space-2)" }}>{t("No team assigned to this project this week")}</div>
                            )}
                          </div>
                          {/* Manual add */}
                          {availableEmployees.length > 0 && (
                            reportCrewAdding ? (
                              <select className="form-select frm-mt-8" autoFocus
                                onChange={e => {
                                  if (!e.target.value) { setReportCrewAdding(false); return; }
                                  const emp = (employees || []).find(em => String(em.id) === String(e.target.value));
                                  if (emp) {
                                    setReportForm(f => ({ ...f, teamPresent: [...(f.teamPresent || []), { id: emp.id, name: emp.name }] }));
                                  }
                                  setReportCrewAdding(false);
                                }} onBlur={() => setReportCrewAdding(false)}>
                                <option value="">{t("Select employee...")}</option>
                                {availableEmployees.map(e => (
                                  <option key={e.id} value={e.id}>{e.name}{e.role ? ` — ${e.role}` : ""}</option>
                                ))}
                              </select>
                            ) : (
                              <button className="btn btn-sm frm-mt-8"
                                style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)", fontSize: "var(--text-tab)" }}
                                onClick={() => setReportCrewAdding(true)}>
                                + {t("Add employee")}
                              </button>
                            )
                          )}
                        </div>
                      );
                    })()}

                    {/* Work Performed — quick-add tasks + textarea */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Work Performed Today")} *</label>
                      <div className="frm-flex-wrap frm-mb-8" style={{ gap: "var(--space-2)" }}>
                        {QUICK_TASKS.map(task => {
                          const isActive = (reportForm.quickTasks || []).includes(task);
                          return (
                            <button key={task} className="btn btn-sm"
                              style={{
                                fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-card)",
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
                      <textarea className="form-input frm-resize-v" rows={4} placeholder={t("Describe work completed...")}
                        value={reportForm.workPerformed}
                        onChange={e => setReportForm(f => ({ ...f, workPerformed: e.target.value }))} />
                    </div>

                    {/* Materials Received */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Materials Received")}</label>
                      <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Materials delivered/received today...")}
                        value={reportForm.materialsReceived}
                        onChange={e => setReportForm(f => ({ ...f, materialsReceived: e.target.value }))} />
                    </div>

                    {/* Equipment on Site */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Equipment on Site")}</label>
                      <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Lifts, scaffolding, tools...")}
                        value={reportForm.equipmentOnSite}
                        onChange={e => setReportForm(f => ({ ...f, equipmentOnSite: e.target.value }))} />
                    </div>

                    {/* Visitors / Inspections */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Visitors / Inspections")}</label>
                      <textarea className="form-input frm-resize-v" rows={2} placeholder={t("GC walkthroughs, inspector visits...")}
                        value={reportForm.visitors}
                        onChange={e => setReportForm(f => ({ ...f, visitors: e.target.value }))} />
                    </div>

                    {/* Safety Incidents */}
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: reportForm.safetyIncident ? "rgba(239,68,68,0.08)" : "var(--surface1)", borderRadius: "var(--radius-control)", border: reportForm.safetyIncident ? "1px solid var(--red)" : "1px solid var(--border)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer", fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)" }}>
                        <span>{t("Safety Incident")}</span>
                        <button
                          style={{
                            width: 44, height: 24, borderRadius: "var(--radius-control)", border: "none", cursor: "pointer",
                            background: reportForm.safetyIncident ? "var(--red)" : "var(--border)",
                            position: "relative", transition: "background 0.2s",
                          }}
                          onClick={() => setReportForm(f => ({ ...f, safetyIncident: !f.safetyIncident }))}>
                          <span style={{
                            position: "absolute", top: 2, left: reportForm.safetyIncident ? 22 : 2,
                            width: 20, height: 20, borderRadius: "var(--radius-control)", background: "#fff",
                            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }} />
                        </button>
                        <span style={{ fontSize: "var(--text-label)", color: reportForm.safetyIncident ? "var(--red)" : "var(--text3)" }}>
                          {reportForm.safetyIncident ? t("YES") : t("No")}
                        </span>
                      </label>
                      {reportForm.safetyIncident && (
                        <textarea className="form-input" rows={3} placeholder={t("Describe the safety incident...")}
                          value={reportForm.safetyDescription}
                          onChange={e => setReportForm(f => ({ ...f, safetyDescription: e.target.value }))}
                          style={{ resize: "vertical", marginTop: "var(--space-2)" }} />
                      )}
                    </div>

                    {/* Photos — uses PhotoCapture for direct camera access */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Photos")} ({(reportForm.photos || []).length})</label>
                      <PhotoCapture
                        photos={reportForm.photos || []}
                        onPhotos={(photos) => setReportForm(f => ({ ...f, photos }))}
                        multiple={true}
                        t={t}
                      />
                    </div>

                    {/* Issues / Delays */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Issues / Delays")}</label>
                      <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Any issues or delays...")}
                        value={reportForm.issues}
                        onChange={e => setReportForm(f => ({ ...f, issues: e.target.value }))} />
                    </div>

                    {/* Tomorrow's Plan */}
                    <div className="frm-mt-12">
                      <label className="form-label">{t("Tomorrow's Plan")}</label>
                      <textarea className="form-input frm-resize-v" rows={2} placeholder={t("Planned work for tomorrow...")}
                        value={reportForm.tomorrowPlan}
                        onChange={e => setReportForm(f => ({ ...f, tomorrowPlan: e.target.value }))} />
                    </div>

                    {/* Hours Worked (auto-calculated) */}
                    <div className="frm-report-hours-row frm-mt-10">
                      <span className="form-label" style={{ margin: "0" }}>{t("Hours Worked (from time entries)")}</span>
                      <span className="frm-report-hours-value">{todayHoursForProject.toFixed(1)} hrs</span>
                    </div>

                    {/* Submit / Update */}
                    <button className="btn btn-primary frm-w-full" style={{ marginTop: "var(--space-4)" }}
                      onClick={() => {
                        if (!reportForm.workPerformed.trim()) { show(t("Describe work performed"), "warn"); return; }
                        const report = {
                          id: editingReportId || ("dr-" + Date.now()),
                          projectId: selectedProjectId,
                          projectName: selectedProject?.name || "",
                          foremanId: activeForeman?.id,
                          foremanName: activeForeman?.name,
                          date: reportForm.date,
                          isOutdoor: !!reportForm.isOutdoor,
                          temperature: reportForm.isOutdoor ? reportForm.temperature : "",
                          weatherCondition: reportForm.isOutdoor ? reportForm.weatherCondition : "",
                          weather: reportForm.isOutdoor ? reportForm.weatherCondition : "",
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
                        clearReportDraft();
                        setShowReportForm(false);
                        setEditingReportId(null);
                        show(editingReportId ? t("Report updated") : t("Daily report submitted"));
                      }}>
                      {editingReportId ? t("Update Report") : t("Submit Report")}
                    </button>
                  </div>
                )}

                {/* ── Report List ── */}
                <div className="frm-mt-16">
                  {(dailyReports || [])
                    .filter(r => myProjectIds.has(r.projectId) && r.status !== "deleted")
                    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
                    .map(r => {
                      const isExpanded = expandedReportId === r.id;
                      const isOutdoorReport = r.isOutdoor === true || (r.isOutdoor === undefined && ((r.temperature && r.temperature !== "") || (r.weatherCondition && r.weatherCondition !== "" && r.weatherCondition !== "Clear")));
                      const weatherIcon = isOutdoorReport ? ({ Clear: "Clear", Cloudy: "Cloudy", Rain: "Rain", Storm: "Storm", Wind: "Windy", Snow: "Snow", Hot: "Hot", Cold: "Cold" }[r.weatherCondition || r.weather] || (r.weatherCondition || r.weather || "")) : "";
                      const tempClean = String(r.temperature || "").replace(/°F/gi, "").trim();
                      const teamN = (r.teamPresent || []).length || r.teamSize || 0;
                      return (
                        <div key={r.id} className="card frm-report-card" style={{ cursor: "pointer" }}
                          onClick={() => setExpandedReportId(isExpanded ? null : r.id)}>
                          <div className="frm-flex-between">
                            <div>
                              <div className="text-sm font-semi">{r.date}{isOutdoorReport && (weatherIcon || tempClean) ? ` ${weatherIcon}${tempClean ? ` ${tempClean}°F` : ""}` : ""}</div>
                              <div className="text-xs text-muted">{r.projectName || t("Project")} · {teamN} {t("team")} · {r.foremanName || ""}</div>
                              {r.hoursWorked && <div className="text-xs text-muted">{r.hoursWorked} hrs logged</div>}
                            </div>
                            <div className="frm-flex-row-center" style={{ gap: "var(--space-2)" }}>
                              {r.safetyIncident && <span style={{ fontSize: "var(--text-xs)", background: "var(--red)", color: "#fff", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)" }}>Safety</span>}
                              {r.photos && r.photos.length > 0 && <span className="text-xs text-muted">{r.photos.length} pic</span>}
                              <span className="frm-font-12" style={{ color: "var(--text3)" }}>{isExpanded ? "\u25BE" : "\u25B8"}</span>
                            </div>
                          </div>
                          {!isExpanded && (
                            <div className="text-xs text-muted frm-mt-4 frm-truncate">
                              {(r.quickTasks || []).length > 0 && <span style={{ color: "var(--accent)", marginRight: "var(--space-1)" }}>{r.quickTasks.join(", ")}</span>}
                              {r.workPerformed?.replace(/^Tasks: [^\n]*\n?/, "").slice(0, 80)}
                            </div>
                          )}
                          {isExpanded && (
                            <div className="frm-mt-10" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "var(--space-3)" }}
                              onClick={e => e.stopPropagation()}>

                              {/* Crew Present */}
                              {(r.teamPresent || []).length > 0 && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Crew on Site")}</div>
                                  <div className="frm-flex-wrap">
                                    {r.teamPresent.map((c, i) => (
                                      <span key={i} className="badge badge-blue frm-font-10">{typeof c === "string" ? c : c.name}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Quick Tasks */}
                              {(r.quickTasks || []).length > 0 && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: "var(--space-1)" }}>{t("Tasks")}</div>
                                  <div className="frm-flex-wrap">
                                    {r.quickTasks.map((tk, i) => (
                                      <span key={i} style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--accent)", color: "#fff" }}>{tk}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mb-8">
                                <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: "var(--space-1)" }}>{t("Work Performed")}</div>
                                <div className="text-sm frm-pre-wrap">{r.workPerformed}</div>
                              </div>

                              {r.materialsReceived && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Materials Received")}</div>
                                  <div className="text-sm frm-pre-wrap">{r.materialsReceived}</div>
                                </div>
                              )}
                              {r.equipmentOnSite && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Equipment on Site")}</div>
                                  <div className="text-sm frm-pre-wrap">{r.equipmentOnSite}</div>
                                </div>
                              )}
                              {r.visitors && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Visitors / Inspections")}</div>
                                  <div className="text-sm frm-pre-wrap">{r.visitors}</div>
                                </div>
                              )}

                              {/* Safety */}
                              <div style={{ marginBottom: "var(--space-2)", padding: "var(--space-2)", borderRadius: "var(--radius-control)", background: r.safetyIncident ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)" }}>
                                <div className="text-xs font-semi" style={{ color: r.safetyIncident ? "var(--red)" : "var(--green)", marginBottom: "var(--space-1)" }}>
                                  {r.safetyIncident ? t("SAFETY INCIDENT") : t("No Safety Incidents")}
                                </div>
                                {r.safetyIncident && r.safetyDescription && (
                                  <div className="text-sm frm-pre-wrap">{r.safetyDescription}</div>
                                )}
                              </div>

                              {r.issues && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--amber)", marginBottom: "var(--space-1)" }}>{t("Issues / Delays")}</div>
                                  <div className="text-sm frm-pre-wrap">{r.issues}</div>
                                </div>
                              )}
                              {r.tomorrowPlan && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--accent)", marginBottom: "var(--space-1)" }}>{t("Tomorrow's Plan")}</div>
                                  <div className="text-sm frm-pre-wrap">{r.tomorrowPlan}</div>
                                </div>
                              )}

                              {/* Photos */}
                              {r.photos && r.photos.length > 0 && (
                                <div className="mb-8">
                                  <div className="text-xs font-semi" style={{ color: "var(--text2)", marginBottom: "var(--space-1)" }}>{t("Photos")} ({r.photos.length})</div>
                                  <div className="frm-flex-wrap" style={{ gap: "var(--space-2)" }}>
                                    {r.photos.map((p, i) => (
                                      <img key={i} src={p.data || p} alt={`Photo ${i + 1}`}
                                        className="frm-report-photo" style={{ cursor: "pointer" }}
                                        onClick={() => window.open(p.data || p, "_blank")} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-muted frm-mt-8">
                                {t("Submitted")}: {new Date(r.createdAt).toLocaleString()}
                                {r.updatedAt && r.updatedAt !== r.createdAt && ` · ${t("Updated")}: ${new Date(r.updatedAt).toLocaleString()}`}
                              </div>

                              {/* Action Buttons */}
                              <div className="frm-flex-row frm-mt-10">
                                <button className="btn btn-sm frm-font-11"
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
                                <button className="btn btn-sm frm-font-11"
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
                                <button className="btn btn-sm frm-font-11"
                                  onClick={() => {
                                    const proj = projects.find(p => p.id === r.projectId);
                                    const report = [
                                      `DAILY REPORT — ${proj?.name || "Project"} — ${r.date}`,
                                      `Foreman: ${r.foremanName || activeForeman?.name}`,
                                      `Crew: ${(r.teamPresent || []).length} on site | ${r.totalHours || 0}h total`,
                                      `Weather: ${r.weatherCondition || r.weather || ""} ${r.temperature || ""}`,
                                      ``,
                                      `WORK PERFORMED:`,
                                      r.workPerformed || "—",
                                      r.materialsReceived ? `\nMATERIALS: ${r.materialsReceived}` : "",
                                      r.equipmentOnSite ? `EQUIPMENT: ${r.equipmentOnSite}` : "",
                                      r.visitors ? `VISITORS: ${r.visitors}` : "",
                                      r.issues ? `\nISSUES: ${r.issues}` : "",
                                      r.tomorrowPlan ? `\nTOMORROW: ${r.tomorrowPlan}` : "",
                                      r.safetyIncident ? `\nSAFETY INCIDENT: ${r.safetyDescription || "Yes"}` : "",
                                      `\n--- EBC Construction | ${new Date(r.createdAt || r.submittedAt).toLocaleString()} ---`,
                                    ].filter(Boolean).join("\n");
                                    navigator.clipboard.writeText(report).then(() => show(t("Report copied"))).catch(() => window.prompt("Copy:", report));
                                  }}>
                                  {t("Copy to Clipboard")}
                                </button>
                                <button className="btn btn-sm" style={{ fontSize: "var(--text-tab)", color: "var(--red)" }}
                                  onClick={() => {
                                    if (confirm(t("Delete this daily report?"))) {
                                      setDailyReports(prev => prev.map(rp => rp.id === r.id ? { ...rp, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: activeForeman?.name || "Foreman" } : rp));
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
                  {(dailyReports || []).filter(r => myProjectIds.has(r.projectId) && r.status !== "deleted").length === 0 && !showReportForm && (
                    <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
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
                  <div className="section-title frm-section-title-md">{t("Documents")}</div>
                  <button className="btn btn-sm frm-new-rfi-btn"
                    onClick={() => setShowRfiModal(true)}>
                    <FileQuestion size={14} /> {t("New RFI")}
                  </button>
                </div>

                {/* My RFIs */}
                <div className="project-section frm-mb-12">
                  <div className="project-section-header" onClick={() => toggleSection("myRfis")}>
                    <span>{t("My RFIs")} ({(rfis || []).filter(r => String(r.projectId) === String(selectedProjectId)).length})</span>
                    <span>{openSections.myRfis ? "▾" : "▸"}</span>
                  </div>
                  {openSections.myRfis && (() => {
                    const myRfis = (rfis || []).filter(r => String(r.projectId) === String(selectedProjectId)).sort((a, b) => (b.submitted || b.dateSubmitted || "").localeCompare(a.submitted || a.dateSubmitted || ""));
                    return myRfis.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No RFIs submitted")}</div>
                      : myRfis.map(r => (
                        <div key={r.id} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-label)" }}>
                          <div className="frm-flex-between">
                            <span className="font-bold">{r.number}</span>
                            <span className={`badge ${r.status === "open" || r.status === "submitted" ? "badge-amber" : r.status === "Answered" ? "badge-green" : "badge-muted"} frm-font-10`}>{r.status}</span>
                          </div>
                          <div className="text-muted frm-mt-2">{r.subject}</div>
                          {r.response && <div style={{ marginTop: "var(--space-1)", padding: "var(--space-1) var(--space-2)", background: "var(--green-dim, rgba(16,185,129,0.1))", borderRadius: "var(--radius-control)", color: "var(--green)", fontSize: "var(--text-tab)" }}>{t("Answer")}: {r.response}</div>}
                          {r.daysOut > 0 && !r.response && <div className="text-dim frm-mt-2">{r.daysOut}d {t("outstanding")}</div>}
                        </div>
                      ));
                  })()}
                </div>

                {/* Submittals */}
                <div className="project-section">
                  <div className="project-section-header" onClick={() => toggleSection("submittals")}>
                    <span>{t("Submittals")} ({projectSubmittals.length})</span>
                    <span>{openSections.submittals ? "▾" : "▸"}</span>
                  </div>
                  {openSections.submittals && (
                    projectSubmittals.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No submittals")}</div>
                      : projectSubmittals.map(s => (
                        <div key={s.id} className="card frm-mt-8" style={{ padding: "var(--space-3)" }}>
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
                      ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No change orders")}</div>
                      : projectCOs.map(c => (
                        <div key={c.id} className="card frm-mt-8" style={{ padding: "var(--space-3)" }}>
                          <div className="flex-between">
                            <span className="text-sm font-semi">{c.title || c.description}</span>
                            <span className="text-sm font-mono frm-amber">{fmt(c.amount)}</span>
                          </div>
                          <div className="text-xs text-muted mt-4">{c.status}</div>
                        </div>
                      ))
                  )}
                </div>

                {/* RFIs */}
                <div className="project-section">
                  <div className="project-section-header frm-flex-between">
                    <div className="frm-flex-row-center frm-flex-1" style={{ cursor: "pointer" }} onClick={() => toggleSection("rfis")}>
                      <span>{t("RFIs")} ({projectRFIs.length})</span>
                      <span>{openSections.rfis ? "▾" : "▸"}</span>
                    </div>
                    <button
                      className="btn btn-sm frm-new-rfi-btn"
                      onClick={() => { setShowRfiModal(true); setRfiFormData({ subject: "", description: "", drawingRef: "" }); }}
                    >
                      <FileQuestion size={13} />
                      {t("Submit RFI")}
                    </button>
                  </div>
                  {openSections.rfis && (
                    projectRFIs.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No RFIs")}</div>
                      : projectRFIs.map(r => (
                        <div key={r.id} className="card frm-mt-8" style={{ padding: "var(--space-3)" }}>
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
                <div className="section-header frm-mb-12">
                  <div className="flex gap-8" style={{ alignItems: "center" }}>
                    <HardHat size={18} className="frm-amber" />
                    <div>
                      <div className="section-title frm-section-title-md">{t("Site Logistics")}</div>
                      <div className="text-xs text-muted">{t("Daily checklist")} · {today}</div>
                    </div>
                  </div>
                  <span className={`badge ${logCheckedCount === LOGISTICS_ITEMS.length ? "badge-green" : logCheckedCount > 0 ? "badge-amber" : "badge-red"} frm-font-11`}>
                    {logCheckedCount}/{LOGISTICS_ITEMS.length}
                  </span>
                </div>

                {criticalUnchecked.length > 0 && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)", borderRadius: "var(--radius-control)", padding: "var(--space-3) var(--space-3)", marginBottom: "var(--space-3)" }}>
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
                      <div key={item.id} style={{ background: checked ? "rgba(16,185,129,0.07)" : item.critical && !checked ? "rgba(239,68,68,0.04)" : "var(--card)", border: `1px solid ${checked ? "var(--green)" : item.critical && !checked ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-control)", padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}
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
                        <span className="frm-font-20">{item.icon}</span>
                        <div className="frm-flex-1">
                          <span className="text-sm" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{item.label}</span>
                          {item.critical && !checked && (
                            <span className="badge badge-red" style={{ fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>Critical</span>
                          )}
                        </div>
                        <span className={`badge ${checked ? "badge-green" : item.critical ? "badge-red" : "badge-muted"} frm-font-10`}>
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
                <div className="section-header frm-mb-12">
                  <div className="flex gap-8" style={{ alignItems: "center" }}>
                    <MessageSquare size={18} className="frm-amber" />
                    <div>
                      <div className="section-title frm-section-title-md">{t("Team Notes")}</div>
                      <div className="text-xs text-muted">{t("Visible to all project team members")}</div>
                    </div>
                  </div>
                </div>

                {/* Compose */}
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                  <textarea
                    style={{ width: "100%", minHeight: 80, padding: "var(--space-3)", borderRadius: "var(--radius-control)", border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: "var(--text-secondary)", resize: "vertical", marginBottom: "var(--space-3)" }}
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
                    <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
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
                        <div key={note.id} style={{ background: note.pinned ? "rgba(245,158,11,0.05)" : "var(--card)", border: `1px solid ${note.pinned ? "var(--amber)" : "var(--border)"}`, borderRadius: "var(--radius-control)", padding: "var(--space-4)" }}>
                          <div className="frm-flex-between frm-mb-8">
                            <div className="flex gap-8" style={{ alignItems: "center" }}>
                              {note.pinned && <Pin size={11} className="frm-amber" />}
                              <span className="font-semi text-sm">{note.author}</span>
                              <span className={`badge ${catBadge(note.category)}`} style={{ fontSize: "var(--text-xs)" }}>{catLabel(note.category)}</span>
                            </div>
                            <div className="flex gap-6" style={{ alignItems: "center" }}>
                              <span className="text-xs text-muted">{fmtTime(note.timestamp)}</span>
                              <button onClick={() => saveProjectNotes(projectNotes.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "var(--amber)" : "var(--text3)", padding: "var(--space-1) var(--space-1)" }}>
                                {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                              </button>
                              {note.author === activeForeman.name && (
                                <button onClick={() => saveProjectNotes(projectNotes.filter(n => n.id !== note.id))}
                                  className="frm-btn-unstyled--text3">✕</button>
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

            {/* ═══ ISSUES / BLOCKERS TAB ═══ */}
            {foremanTab === "issues" && (() => {
              const projProblems = (problems || []).filter(p => String(p.projectId) === String(selectedProjectId))
                .sort((a, b) => new Date(b.reportedAt || b.createdAt) - new Date(a.reportedAt || a.createdAt));
              const openProblems = projProblems.filter(p => p.status !== "resolved");
              const resolvedProblems = projProblems.filter(p => p.status === "resolved");
              return (
                <div className="emp-content">
                  <div className="section-header">
                    <div>
                      <div className="section-title frm-section-title-md">{t("Issues & Blockers")}</div>
                      <div className="text-xs text-muted">{openProblems.length} {t("open")} · {resolvedProblems.length} {t("resolved")}</div>
                    </div>
                    <button className="btn btn-sm frm-report-problem-btn"
                      onClick={() => setShowReportProblem(true)}>
                      <AlertTriangle size={14} /> {t("Report Problem")}
                    </button>
                  </div>
                  {openProblems.length === 0 && resolvedProblems.length === 0 ? (
                    <EmptyState icon={AlertTriangle} heading={t("No issues reported")} message={t("Tap Report Problem to log an issue")} t={t} />
                  ) : (
                    <div className="frm-flex-col-8">
                      {openProblems.map(p => (
                        <PremiumCard key={p.id} variant="info" style={{ borderLeft: `3px solid ${p.priority === "high" || p.priority === "critical" ? "var(--red)" : "var(--amber)"}` }}>
                          <div className="flex-between mb-4">
                            <span className="text-sm font-bold">{p.category || t("General")}</span>
                            <span className={`badge ${p.priority === "high" || p.priority === "critical" ? "badge-red" : "badge-amber"}`}>{p.priority || "medium"}</span>
                          </div>
                          <div className="text-xs text-muted mb-4">{p.description || p.notes || ""}</div>
                          {p.location && <div className="text-xs text-dim mb-4"><MapPin size={10} /> {p.location}</div>}
                          <div className="flex-between">
                            <span className="text-xs text-dim">{p.reportedBy || t("Unknown")} · {new Date(p.reportedAt || p.createdAt).toLocaleDateString()}</span>
                            <button className="btn btn-sm badge-green" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", border: "none", cursor: "pointer" }}
                              onClick={() => setProblems(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: "resolved", resolvedAt: new Date().toISOString() } : pr))}>
                              {t("Resolve")}
                            </button>
                          </div>
                          {p.photos?.length > 0 && (
                            <div className="frm-photo-thumb-row">
                              {p.photos.slice(0, 3).map((ph, i) => (
                                <img key={i} src={ph} alt="" className="frm-photo-thumb-sm" />
                              ))}
                            </div>
                          )}
                        </PremiumCard>
                      ))}
                      {resolvedProblems.length > 0 && (
                        <div className="frm-mt-8">
                          <div className="text-xs font-bold text-muted mb-4">{t("Resolved")} ({resolvedProblems.length})</div>
                          {resolvedProblems.slice(0, 5).map(p => (
                            <div key={p.id} className="frm-resolved-row">
                              <span style={{ textDecoration: "line-through" }}>{p.category}: {(p.description || "").slice(0, 50)}</span>
                              <span className="text-xs text-dim" style={{ marginLeft: "var(--space-2)" }}>{new Date(p.resolvedAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ PRODUCTION TAB ═══ */}
            {foremanTab === "production" && (
              <ProductionTab
                productionLogs={productionLogs}
                setProductionLogs={setProductionLogs}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                setAreas={setAreas}
                projectId={selectedProjectId}
                employees={employees}
                foreman={activeForeman}
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
                setAreas={setAreas}
                foreman={activeForeman}
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
                foreman={activeForeman}
                t={t}
              />
            )}
          </>
        )}
      </div>

      {/* ═══ SUBMIT RFI MODAL ═══ */}
      {showRfiModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRfiModal(false); }}>
          <div className="modal-content frm-rfi-modal">
            <div className="frm-flex-between frm-mb-20">
              <div className="frm-flex-row-center" style={{ gap: "var(--space-3)" }}>
                <FileQuestion size={20} className="frm-amber" />
                <span className="frm-font-16" style={{ fontSize: "var(--text-card)" }}>{t("Submit RFI")}</span>
              </div>
              <button onClick={() => setShowRfiModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: "var(--space-1)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="frm-font-12" style={{ color: "var(--text3)", marginBottom: "var(--space-4)" }}>
              {selectedProject?.name} · {t("Assigned to PM")}: {selectedProject?.pm || "PM"}
            </div>

            <div className="frm-flex-col-14">
              <div>
                <label className="frm-form-label-upper">
                  {t("Subject")} *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t("e.g., Clarification needed on wall type at Grid A")}
                  value={rfiFormData.subject}
                  onChange={e => setRfiFormData(f => ({ ...f, subject: e.target.value }))}
                  className="frm-w-full" style={{ fontSize: "var(--text-secondary)" }}
                />
              </div>

              <div>
                <label className="frm-form-label-upper">
                  {t("Description")} *
                </label>
                <textarea
                  className="form-input"
                  placeholder={t("Describe the question or issue in detail...")}
                  value={rfiFormData.description}
                  onChange={e => setRfiFormData(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="frm-w-full frm-resize-v" style={{ fontSize: "var(--text-secondary)", fontFamily: "inherit" }}
                />
              </div>

              <div>
                <label className="frm-form-label-upper">
                  {t("Drawing / Spec Reference")} ({t("optional")})
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t("e.g., A-201, Spec 09 21 16")}
                  value={rfiFormData.drawingRef}
                  onChange={e => setRfiFormData(f => ({ ...f, drawingRef: e.target.value }))}
                  className="frm-w-full" style={{ fontSize: "var(--text-secondary)" }}
                />
              </div>

              {/* Photo attachment for RFI */}
              <div>
                <label className="frm-form-label-upper">
                  {t("Photos")} ({t("optional")})
                </label>
                <PhotoCapture
                  photos={rfiFormData.photos || []}
                  onPhotos={(photos) => setRfiFormData(f => ({ ...f, photos }))}
                  multiple={true}
                  t={t}
                />
              </div>
            </div>

            <div className="frm-flex-row" style={{ gap: "var(--space-3)", marginTop: 22 }}>
              <button className="btn" style={{ flex: 1, fontSize: "var(--text-secondary)" }} onClick={() => setShowRfiModal(false)}>
                {t("Cancel")}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, fontSize: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
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
                    photos: rfiFormData.photos || [],
                  };
                  if (setRfis) setRfis(prev => [...prev, newRfi]);
                  setShowRfiModal(false);
                  setRfiFormData({ subject: "", description: "", drawingRef: "", photos: [] });
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
          maxPrimary={5}
          t={t}
        />
      )}

      {/* Clock-in blocked message (time gate) */}
      {clockInBlocked && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setClockInBlocked(null)}>
          <div style={{ background: "var(--bg2, #1a1a2e)", borderRadius: "var(--radius-control)", padding: "var(--space-5)", maxWidth: 360, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-section)", marginBottom: "var(--space-3)" }}>⏰</div>
            <div style={{ fontSize: "var(--text-secondary)", fontWeight: "var(--weight-semi)", color: "var(--orange)", marginBottom: "var(--space-3)" }}>{t("Too Early")}</div>
            <div style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginBottom: "var(--space-4)" }}>{clockInBlocked}</div>
            <button className="btn btn-ghost" onClick={() => setClockInBlocked(null)}>{t("OK")}</button>
          </div>
        </div>
      )}

      {/* Phase 2C: Photo Capture Modal + PPE Confirmation */}
      {showPhotoCapture && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={e => { if (e.target === e.currentTarget) skipPhoto("dismissed"); }}>
          <div style={{ background: "var(--bg2, #1a1a2e)", borderRadius: "var(--radius-control)", padding: "var(--space-5)", maxWidth: 400, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-card)", fontWeight: "var(--weight-bold)", color: "#fff", marginBottom: "var(--space-3)" }}>📸 {t("Clock-In Photo")}</div>
            <div style={{ fontSize: "var(--text-label)", color: "var(--text3)", marginBottom: "var(--space-4)" }}>{t("Take a selfie wearing your PPE to clock in")}</div>
            <div style={{ background: "var(--bg)", borderRadius: "var(--radius-control)", overflow: "hidden", marginBottom: "var(--space-4)", position: "relative", width: "100%", paddingBottom: "100%" }}>
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
            <canvas ref={photoCanvasRef} className="frm-hidden" />

            {/* PPE Confirmation Checkbox */}
            <label style={{
              display: "flex", alignItems: "center", gap: "var(--space-3)",
              padding: "var(--space-3)", marginBottom: "var(--space-4)",
              background: ppeConfirmed ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${ppeConfirmed ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
              borderRadius: "var(--radius-control)", cursor: "pointer", textAlign: "left",
              transition: "background 0.2s, border-color 0.2s",
            }}>
              <input
                type="checkbox"
                checked={ppeConfirmed}
                onChange={e => setPpeConfirmed(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: "var(--green)", flexShrink: 0 }}
              />
              <span style={{ fontSize: "var(--text-label)", color: ppeConfirmed ? "var(--green)" : "var(--orange)", fontWeight: "var(--weight-semi)" }}>
                {t("I confirm I am wearing required PPE (hard hat, vest, glasses)")}
              </span>
            </label>

            <div className="frm-flex-row" style={{ gap: "var(--space-3)", justifyContent: "center" }}>
              <button className="btn btn-ghost frm-amber" onClick={() => skipPhoto("skipped")}>
                {t("Skip")}
              </button>
              <button className="btn btn-primary" onClick={captureAndClockIn}
                disabled={!ppeConfirmed}
                style={{
                  padding: "var(--space-3) var(--space-6)", fontSize: "var(--text-secondary)",
                  background: ppeConfirmed ? "var(--green)" : "rgba(255,255,255,0.1)",
                  boxShadow: ppeConfirmed ? "0 2px 8px rgba(34,197,94,0.3)" : "none",
                  opacity: ppeConfirmed ? 1 : 0.5, cursor: ppeConfirmed ? "pointer" : "not-allowed",
                }}>
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
