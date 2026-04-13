import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { UserPlus, X, Search, CheckSquare, Square, Send, FileQuestion, ChevronDown, ChevronUp, MapPin, Clock, StopCircle, Package, Shield, AlertTriangle, CheckCircle, ClipboardList, HardHat, MessageSquare, Pin, PinOff, Home, Users, Clock as ClockIcon, MoreHorizontal, FileText, Calendar, Settings, BarChart3, ClipboardCheck, PenLine, Map as MapIcon } from "lucide-react";
import { PortalHeader, PortalTabBar, PremiumCard, FieldButton, FieldInput, EmptyState, StatusBadge, StatTile, AlertCard, CredentialCard, PhotoCapture, Skeleton, LanguageToggle } from "../components/field";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useNotifications } from "../hooks/useNotifications";
import { useFormDraft } from "../hooks/useFormDraft";
import { queueMutation } from "../lib/offlineQueue";
import { hapticSuccess } from "../utils/native";
import { FeatureGuide } from "../components/FeatureGuide";
import { ReportProblemModal } from "../components/ReportProblemModal";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import { PhaseTracker, getDefaultPhases } from "../components/PhaseTracker";
import { DrawingsTab } from "../components/field/DrawingsTab";
import { TmCaptureTab } from "./foreman/TmCaptureTab";
import { PunchTab } from "./foreman/PunchTab";
import { ProductionTab } from "./foreman/ProductionTab";
import { SettingsTab } from "./foreman/SettingsTab";
import { ClockTab } from "./foreman/ClockTab";
import { DashboardTab } from "./foreman/DashboardTab";
import { TeamTab } from "./foreman/TeamTab";
import { HoursTab } from "./foreman/HoursTab";
import { MaterialsTab } from "./foreman/MaterialsTab";
import { DocumentsTab } from "./foreman/DocumentsTab";
import { SiteTab } from "./foreman/SiteTab";
import { NotesTab } from "./foreman/NotesTab";
import { IssuesTab } from "./foreman/IssuesTab";
import { LookAheadTab } from "./foreman/LookAheadTab";
import { DailyReportTab } from "./foreman/DailyReportTab";
import { ScheduleTab } from "./foreman/ScheduleTab";
import { DeliveriesTab } from "./DeliveriesTab";
import { DecisionLogTab } from "./DecisionLogTab";
import { MapView } from "./MapView";
import { ForemanJSATab } from "./foreman/ForemanJSATab";

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
    employees, projects, setProjects, teamSchedule, setCrewSchedule, timeEntries, setTimeEntries,
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
  const { requestPermission, sendNotification, notifyLateArrival, notifyCertExpiry } = useNotifications();
  const [showReportProblem, setShowReportProblem] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [clockEntry, setClockEntry] = useState(null); // { clockIn, lat, lng, projectId }
  const [gpsStatus, setGpsStatus] = useState("");
  const [clockProjectSearch, setClockProjectSearch] = useState("");
  const [teamClocks, setCrewClocks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_teamClocks") || "{}"); } catch { return {}; }
  });
  // ── Crew tab: add member ──
  const [showCrewAdd, setShowCrewAdd] = useState(false);
  const [teamAddSearch, setCrewAddSearch] = useState("");
  const [extraCrewIds, setExtraCrewIds] = useState([]);
  const teamAddRef = useRef(null);

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
  const [laborForm, setLaborForm, { clearDraft: clearLaborDraft, hasDraft: hasLaborDraft, draftAge: laborDraftAge }] = useFormDraft(
    `labor_entry_${activeForeman?.id || "anon"}`,
    { employeeId: "", areaId: "", costCode: "framing", hours: "", payType: "regular", notes: "" }
  );
  const COST_CODES = ["framing", "board", "tape", "finish", "ACT", "demo", "cleanup", "general"];
  const PAY_TYPES = ["regular", "overtime", "doubletime"];

  // ── Submit RFI modal ──
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiFormData, setRfiFormData] = useState({ subject: "", description: "", drawingRef: "", priority: "normal" });

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
  const [reportForm, setReportForm, { clearDraft: clearReportDraft, hasDraft: hasReportDraft, draftAge: reportDraftAge }] = useFormDraft(
    `daily_report_${activeForeman?.id || "anon"}_${selectedProjectId || "none"}`,
    { ...EMPTY_REPORT_FORM }
  );
  const [showReportForm, setShowReportForm] = useState(false);

  // 9.7 — Draft recovery toast: notify foreman when unsaved work is detected
  useEffect(() => {
    const drafts = [];
    if (hasLaborDraft) drafts.push(`${t("Labor entry")} (${laborDraftAge}m ago)`);
    if (hasReportDraft) drafts.push(`${t("Daily report")} (${reportDraftAge}m ago)`);
    if (drafts.length > 0) {
      show?.(`📝 ${t("Draft recovered")}: ${drafts.join(", ")}`, 5000);
    }
  }, []); // mount-only
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
    hapticSuccess();
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
    queueMutation("time_entries", "insert", newEntry);
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
      // Push notification to PM/foreman
      const proj = projects.find(p => String(p.id) === String(selectedProjectId));
      notifyLateArrival({ employeeName: emp?.name || "Crew", projectName: proj?.name || "", minutesLate: lateMinutes, shiftStart });
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
    queueMutation("time_entries", "insert", newEntry);
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
    queueMutation("labor_entries", "insert", entry);
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
    newEntries.forEach(e => queueMutation("labor_entries", "insert", e));
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
    queueMutation("labor_entries", "update", { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: activeForeman?.name }, { column: "id", value: entryId });
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
        // Proactive cert expiry notifications (once per day)
        const certNotifKey = `ebc_certNotifDate_${activeForeman.id}`;
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(certNotifKey) !== today && data?.length) {
          localStorage.setItem(certNotifKey, today);
          const now = new Date();
          for (const cert of data) {
            if (!cert.expiry_date) continue;
            const expiry = new Date(cert.expiry_date);
            const daysLeft = Math.ceil((expiry - now) / 86400000);
            if (daysLeft <= 30) {
              const emp = teamForProject.find(m => String(m.id) === String(cert.employee_id));
              notifyCertExpiry({
                employeeName: emp?.name || "Employee",
                certName: cert.cert_type || cert.name || "Certification",
                daysUntilExpiry: daysLeft,
                expiryDate: cert.expiry_date,
              });
            }
          }
        }
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
      // Queue for offline replay if Supabase write fails
      queueMutation("shift_requests", "update", {
        status: approvalSheet.action === "approve" ? "approved" : "denied",
        reviewed_by: activeForeman.id,
        review_comment: approvalComment || null,
        reviewed_at: new Date().toISOString(),
      }, { column: "id", value: approvalSheet.request.id });
      setPendingRequests(prev => prev.filter(r => r.id !== approvalSheet.request.id));
      setApprovalSheet(null);
      setApprovalComment("");
      show(t("Saved offline — will sync when connected"), "ok");
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
    // ── Primary (5 tabs visible in bottom bar) ──
    { id: "dashboard", label: t("Home"), icon: Home, badge: false },
    { id: "production", label: t("Production"), icon: BarChart3, badge: false },
    { id: "team", label: t("Team"), icon: Users, badge: pendingRequestCount > 0 },
    { id: "documents", label: t("Docs"), icon: FileText, badge: answeredRfiCount > 0 },
    // ── Overflow (ranked by daily use frequency) ──
    { id: "tm", label: t("T&M"), icon: FileText, badge: pendingTmCount > 0 },
    { id: "punchList", label: t("Punch List"), icon: ClipboardCheck, badge: openPunchCount > 0 },
    { id: "materials", label: t("Materials"), icon: Package, badge: projectMatRequests.filter(r => r.status === "requested" || r.status === "pending").length > 0 },
    { id: "reports", label: t("Daily Report"), icon: ClipboardList, badge: (dailyReports || []).filter(r => r.projectId === selectedProjectId && r.date === new Date().toISOString().slice(0,10)).length > 0 },
    { id: "drawings", label: t("Drawings"), icon: FileText, badge: false },
    { id: "jsa", label: "JSA", icon: Shield, badge: activeJsaCount > 0 },
    { id: "lookahead", label: t("Look-Ahead"), icon: Calendar, badge: upcomingEventCount > 0 },
    { id: "hours", label: t("Hours"), icon: BarChart3, badge: false },
    { id: "issues", label: t("Issues"), icon: AlertTriangle, badge: (problems || []).filter(p => String(p.projectId) === String(selectedProjectId) && p.status !== "resolved").length > 0 },
    { id: "schedule", label: t("Schedule"), icon: Calendar, badge: false },
    { id: "map", label: t("Map"), icon: MapIcon, badge: false },
    { id: "deliveries", label: t("Deliveries"), icon: Package, badge: projectMatRequests.filter(r => ["assigned", "picked_up", "in-transit"].includes(r.status)).length > 0 },
    { id: "decisionLog", label: t("Decisions"), icon: FileText, badge: false },
    { id: "settings", label: t("Settings"), icon: Settings, badge: false },
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
          <SettingsTab
            activeForeman={activeForeman} setActiveForeman={setActiveForeman}
            theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}
            setForemanTab={setForemanTab} handleLogout={handleLogout}
            handleNotificationToggle={handleNotificationToggle}
            getInitials={getInitials} myProjects={myProjects} t={t}
          />
        )}

        {selectedProject && foremanTab !== "settings" && (
          <>
            {/* ═══ CLOCK TAB ═══ */}
            {foremanTab === "clock" && (
              <ClockTab
                clockEntry={clockEntry} isClockedIn={isClockedIn}
                handleClockIn={handleClockIn} handleClockOut={handleClockOut}
                selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId}
                clockProjectSearch={clockProjectSearch} setClockProjectSearch={setClockProjectSearch}
                myProjects={myProjects} projects={projects} selectedProject={selectedProject}
                gpsStatus={gpsStatus} myTodayEntries={myTodayEntries} myTodayHours={myTodayHours}
                lang={lang} t={t} setShowReportProblem={setShowReportProblem}
              />
            )}

            {/* ═══ DASHBOARD TAB ═══ */}
            {foremanTab === "dashboard" && (
              <DashboardTab
                clockEntry={clockEntry} isClockedIn={isClockedIn} setForemanTab={setForemanTab}
                pctUsed={pctUsed} hoursUsed={hoursUsed} teamForProject={teamForProject}
                teamClocks={teamClocks} foremanAlerts={foremanAlerts}
                openPunchCount={openPunchCount} pendingTmCount={pendingTmCount}
                productionLogs={productionLogs} areas={areas}
                selectedProjectId={selectedProjectId} projectMatRequests={projectMatRequests}
                calendarEvents={calendarEvents} upcomingEventCount={upcomingEventCount}
                teamSchedule={app.teamSchedule} projects={projects}
                lang={lang} t={t}
                setShowLaborEntry={setShowLaborEntry} setBulkLaborSelected={setBulkLaborSelected}
              />
            )}

            {/* ═══ CREW TAB ═══ */}
            {foremanTab === "team" && (
              <TeamTab
                teamForProject={teamForProject} teamClocks={teamClocks} employees={employees}
                activeForeman={activeForeman}
                handleCrewClockIn={handleCrewClockIn} handleCrewClockOut={handleCrewClockOut}
                rollCallMode={rollCallMode} setRollCallMode={setRollCallMode}
                rollCallSelected={rollCallSelected} setRollCallSelected={setRollCallSelected}
                handleBulkClockIn={handleBulkClockIn}
                showLaborEntry={showLaborEntry} setShowLaborEntry={setShowLaborEntry}
                bulkLaborMode={bulkLaborMode} setBulkLaborMode={setBulkLaborMode}
                bulkLaborSelected={bulkLaborSelected} setBulkLaborSelected={setBulkLaborSelected}
                laborForm={laborForm} setLaborForm={setLaborForm}
                handleAddLabor={handleAddLabor} handleBulkLabor={handleBulkLabor}
                laborEntries={laborEntries}
                editingLaborId={editingLaborId} setEditingLaborId={setEditingLaborId}
                editingLaborHours={editingLaborHours} setEditingLaborHours={setEditingLaborHours}
                handleEditLabor={handleEditLabor} handleDeleteLabor={handleDeleteLabor}
                clearLaborDraft={clearLaborDraft}
                showCrewAdd={showCrewAdd} setShowCrewAdd={setShowCrewAdd}
                teamAddSearch={teamAddSearch} setCrewAddSearch={setCrewAddSearch}
                teamAddRef={teamAddRef}
                extraCrewIds={extraCrewIds} setExtraCrewIds={setExtraCrewIds}
                selectedProjectId={selectedProjectId} areas={areas} COST_CODES={COST_CODES}
                teamSchedule={teamSchedule} setTeamSchedule={setCrewSchedule}
                pendingRequests={pendingRequests} pendingLoading={pendingLoading}
                setApprovalSheet={setApprovalSheet} setApprovalComment={setApprovalComment}
                filteredCrewCerts={filteredCrewCerts} certFilter={certFilter} setCertFilter={setCertFilter}
                certsLoading={certsLoading}
                fmtHours={fmtHours} t={t}
              />
            )}

            {/* ═══ HOURS TAB ═══ */}
            {foremanTab === "hours" && (
              <HoursTab
                allocatedHours={allocatedHours} hoursUsed={hoursUsed}
                hoursRemaining={hoursRemaining} pctUsed={pctUsed} budgetColor={budgetColor}
                weeklyBurnHours={weeklyBurnHours} teamForProject={teamForProject}
                fmtHours={fmtHours} t={t}
              />
            )}

            {/* ═══ MATERIALS TAB ═══ */}
            {foremanTab === "materials" && (
              <MaterialsTab
                projectMatRequests={projectMatRequests} selectedProjectId={selectedProjectId}
                projects={projects} matForm={matForm} setMatForm={setMatForm}
                matPhotos={matPhotos} setMatPhotos={setMatPhotos}
                handleMatSubmit={handleMatSubmit} handleForemanConfirm={handleForemanConfirm}
                t={t}
              />
            )}

            {/* ═══ DELIVERIES TAB ═══ */}
            {foremanTab === "deliveries" && (
              <DeliveriesTab app={{ ...app, materialRequests, setMaterialRequests, projects, auth: { ...app.auth, role: "foreman", id: activeForeman?.id, name: activeForeman?.name } }} />
            )}

            {/* ═══ DECISION LOG TAB ═══ */}
            {foremanTab === "decisionLog" && (
              <div className="emp-content">
                <DecisionLogTab
                  decisionLog={decisionLog} setDecisionLog={setDecisionLog}
                  projectId={selectedProjectId} employees={employees} t={t}
                  defaultRecordedBy={activeForeman?.name || ""}
                />
              </div>
            )}

            {/* ═══ DRAWINGS TAB ═══ */}
            {foremanTab === "drawings" && (
              <div className="emp-content">
                <DrawingsTab readOnly={false} projectFilter={selectedProjectId} t={t} />
              </div>
            )}

            {/* ═══ LOOK-AHEAD TAB ═══ */}
            {foremanTab === "lookahead" && (
              <LookAheadTab lookAheadEvents={lookAheadEvents} lang={lang} t={t}
                project={selectedProject} preparedBy={activeForeman?.name}
                onUpdateEvent={(updated) => {
                  // Update calendar events with inspection result
                  const events = app.calendarEvents || [];
                  const idx = events.findIndex(e => e.id === updated.id);
                  if (idx >= 0) {
                    const next = [...events];
                    next[idx] = { ...next[idx], ...updated };
                    if (app.setCalendarEvents) app.setCalendarEvents(next);
                  }
                  if (show) show(updated.inspectionResult === "passed" ? t("Inspection PASSED") : t("Inspection FAILED"), updated.inspectionResult === "passed" ? "ok" : "err");
                }} />
            )}

            {/* ═══ DAILY REPORT TAB ═══ */}
            {foremanTab === "reports" && (
              <DailyReportTab
                dailyReports={dailyReports} setDailyReports={setDailyReports}
                reportForm={reportForm} setReportForm={setReportForm}
                showReportForm={showReportForm} setShowReportForm={setShowReportForm}
                editingReportId={editingReportId} setEditingReportId={setEditingReportId}
                selectedProjectId={selectedProjectId} selectedProject={selectedProject}
                activeForeman={activeForeman} teamForProject={teamForProject}
                todayHoursForProject={todayHoursForProject}
                employees={employees} areas={areas}
                productionLogs={productionLogs} tmTickets={tmTickets}
                punchItems={punchItems} timeEntries={timeEntries}
                myProjectIds={myProjectIds} projects={projects}
                expandedReportId={expandedReportId} setExpandedReportId={setExpandedReportId}
                clearReportDraft={clearReportDraft} fillFromYesterday={fillFromYesterday}
                reportCrewAdding={reportCrewAdding} setReportCrewAdding={setReportCrewAdding}
                show={show} t={t} lang={lang}
              />
            )}

            {/* ═══ DOCUMENTS TAB ═══ */}
            {foremanTab === "documents" && (
              <DocumentsTab
                rfis={rfis} submittals={submittals} changeOrders={changeOrders}
                selectedProjectId={selectedProjectId}
                openSections={openSections} setOpenSections={setOpenSections}
                setShowRfiModal={setShowRfiModal} setRfiFormData={setRfiFormData}
                fmt={fmt} t={t}
              />
            )}

            {/* ═══ SITE LOGISTICS TAB ═══ */}
            {foremanTab === "site" && (
              <SiteTab
                todayLog={todayLog} LOGISTICS_ITEMS={LOGISTICS_ITEMS}
                logCheckedCount={logCheckedCount} criticalUnchecked={criticalUnchecked}
                siteLogistics={siteLogistics} saveSiteLogistics={saveSiteLogistics}
                projLogKey={projLogKey} today={today}
                selectedProjectId={selectedProjectId} show={show} t={t}
              />
            )}

            {/* ═══ NOTES TAB ═══ */}
            {foremanTab === "notes" && (
              <NotesTab
                projectNotes={projectNotes} saveProjectNotes={saveProjectNotes}
                selectedProjectId={selectedProjectId}
                foremanNoteText={foremanNoteText} setForemanNoteText={setForemanNoteText}
                foremanNotesFilter={foremanNotesFilter} setForemanNotesFilter={setForemanNotesFilter}
                activeForeman={activeForeman} show={show} t={t}
              />
            )}

            {/* ═══ ISSUES TAB ═══ */}
            {foremanTab === "issues" && (
              <IssuesTab
                problems={problems} setProblems={setProblems}
                selectedProjectId={selectedProjectId}
                setShowReportProblem={setShowReportProblem} t={t}
              />
            )}

            {/* ═══ PRODUCTION TAB ═══ */}
            {foremanTab === "production" && (
              <ProductionTab
                productionLogs={productionLogs} setProductionLogs={setProductionLogs}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                setAreas={setAreas} projectId={selectedProjectId}
                employees={employees} foreman={activeForeman} t={t}
              />
            )}

            {/* ═══ T&M TAB ═══ */}
            {foremanTab === "tm" && (
              <TmCaptureTab
                tmTickets={tmTickets} setTmTickets={setTmTickets}
                projects={projects} employees={employees} projectId={selectedProjectId}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                setAreas={setAreas} foreman={activeForeman} t={t}
                changeOrders={changeOrders}
              />
            )}

            {/* ═══ PUNCH LIST TAB ═══ */}
            {foremanTab === "punchList" && (
              <PunchTab
                punchItems={punchItems} setPunchItems={setPunchItems}
                areas={(areas || []).filter(a => String(a.projectId) === String(selectedProjectId))}
                employees={employees} projectId={selectedProjectId}
                foreman={activeForeman} t={t}
              />
            )}

            {/* ═══ MAP TAB ═══ */}
            {foremanTab === "map" && (
              <MapView app={app} />
            )}

            {/* ═══ SCHEDULE TAB ═══ */}
            {foremanTab === "schedule" && (
              <ScheduleTab
                mySchedule={app.mySchedule} selectedProjectId={selectedProjectId}
                employees={employees} t={t}
              />
            )}

            {/* ═══ JSA TAB ═══ */}
            {foremanTab === "jsa" && (
              <ForemanJSATab
                jsas={jsas} setJsas={setJsas}
                selectedProjectId={selectedProjectId}
                activeForeman={activeForeman}
                employees={employees}
                teamForProject={teamForProject}
                projects={projects}
                myProjects={myProjects}
                selectedProject={selectedProject}
                t={t} lang={lang} show={show}
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
              <div className="frm-flex-row-center gap-sp3">
                <FileQuestion size={20} className="frm-amber" />
                <span className="frm-font-16 fs-card">{t("Submit RFI")}</span>
              </div>
              <button onClick={() => setShowRfiModal(false)} className="p-sp1 c-text3 cursor-pointer" style={{ background: "none", border: "none" }}>
                <X size={18} />
              </button>
            </div>

            <div className="frm-font-12 mb-sp4 c-text3">
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
                  className="frm-w-full fs-secondary"
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
                  className="frm-w-full frm-resize-v fs-secondary" style={{ fontFamily: "inherit" }}
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
                  className="frm-w-full fs-secondary"
                />
              </div>

              <div>
                <label className="frm-form-label-upper">
                  {t("Priority")}
                </label>
                <select
                  className="frm-w-full fs-secondary"
                  value={rfiFormData.priority}
                  onChange={e => setRfiFormData(f => ({ ...f, priority: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)" }}
                >
                  <option value="low">{t("Low")}</option>
                  <option value="normal">{t("Normal")}</option>
                  <option value="urgent">{t("Urgent — Blocking Work")}</option>
                </select>
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

            <div className="frm-flex-row gap-sp3" style={{ marginTop: 22 }}>
              <button className="btn fs-secondary flex-1" onClick={() => setShowRfiModal(false)}>
                {t("Cancel")}
              </button>
              <button
                className="btn btn-primary flex fs-secondary justify-center gap-sp2" style={{ flex: 2 }}
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
                    priority: rfiFormData.priority || "normal",
                    assigned: proj?.pm || "PM",
                    submittedBy: activeForeman.name,
                    dateSubmitted: new Date().toISOString().slice(0, 10),
                    submitted: new Date().toISOString().slice(0, 10),
                    createdAt: new Date().toISOString(),
                    photos: rfiFormData.photos || [],
                  };
                  if (setRfis) setRfis(prev => [...prev, newRfi]);
                  queueMutation("rfis", "insert", newRfi);
                  setShowRfiModal(false);
                  setRfiFormData({ subject: "", description: "", drawingRef: "", photos: [], priority: "normal" });
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

      {/* Clock-in blocked message (time gate) */}
      {clockInBlocked && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setClockInBlocked(null)}>
          <div className="rounded-control p-sp5 text-center" style={{ background: "var(--bg2, #1a1a2e)", maxWidth: 360, width: "90%" }}>
            <div className="fs-section mb-sp3">⏰</div>
            <div className="fs-secondary fw-semi mb-sp3" style={{ color: "var(--orange)" }}>{t("Too Early")}</div>
            <div className="mb-sp4 fs-label c-text2">{clockInBlocked}</div>
            <button className="btn btn-ghost" onClick={() => setClockInBlocked(null)}>{t("OK")}</button>
          </div>
        </div>
      )}

      {/* Phase 2C: Photo Capture Modal + PPE Confirmation */}
      {showPhotoCapture && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={e => { if (e.target === e.currentTarget) skipPhoto("dismissed"); }}>
          <div className="rounded-control p-sp5 text-center" style={{ background: "var(--bg2, #1a1a2e)", maxWidth: 400, width: "90%" }}>
            <div className="fw-bold mb-sp3 fs-card c-white">📸 {t("Clock-In Photo")}</div>
            <div className="mb-sp4 fs-label c-text3">{t("Take a selfie wearing your PPE to clock in")}</div>
            <div className="rounded-control mb-sp4 relative overflow-hidden w-full" style={{ background: "var(--bg)", paddingBottom: "100%" }}>
              <video ref={photoVideoRef} autoPlay playsInline muted
                className="absolute h-full w-full" style={{ top: 0, left: 0, objectFit: "cover" }}
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
                className="flex-shrink-0" style={{ width: 22, height: 22, accentColor: "var(--green)" }}
              />
              <span style={{ fontSize: "var(--text-label)", color: ppeConfirmed ? "var(--green)" : "var(--orange)", fontWeight: "var(--weight-semi)" }}>
                {t("I confirm I am wearing required PPE (hard hat, vest, glasses)")}
              </span>
            </label>

            <div className="frm-flex-row justify-center gap-sp3">
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
