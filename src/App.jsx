import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import { styles } from "./styles";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSyncedState, flushSyncQueue } from "./hooks/useSyncedState";
import { useToast } from "./hooks/useToast";
import {
  THEMES, ASSEMBLIES, SCOPE_INIT, initBids, initProjects, initContacts, initCallLog,
  initInvoices, initChangeOrders, initRfis, initSubmittals, initSchedule,
  initIncidents, initToolboxTalks, initDailyReports, initTakeoffs, initPunchItems,
  OSHA_CHECKLIST, COMPANY_DEFAULTS, getHF,
  initEmployees, initCompanyLocations, initTimeEntries, initCrewSchedule, initMaterialRequests,
  initTmTickets, DATA_VERSION,
  initAreas, initProductionLogs, initDecisionLog,
  initCompanySettings
} from "./data/constants";
import { softDelete, filterActive, computeProjectLaborCost } from "./utils/financialValidation";
import { AreasTab } from "./tabs/AreasTab";
import { PunchListTab } from "./tabs/PunchListTab";
import { DecisionLogTab } from "./tabs/DecisionLogTab";
import { PhaseTracker, getDefaultPhases } from "./components/PhaseTracker";
import { EstimatingTab } from "./tabs/Estimating";
import { MoreTabs } from "./tabs/MoreTabs";
import { MaterialsTab } from "./tabs/MaterialsTab";
import { IncentiveTab } from "./tabs/IncentiveTab";
import { DriverView } from "./tabs/DriverView";
import { EmployeeView } from "./tabs/EmployeeView";
import { ForemanView } from "./tabs/ForemanView";
import { CalendarView } from "./tabs/CalendarView";
import { JSATab } from "./tabs/JSATab";
import { DeliveriesTab } from "./tabs/DeliveriesTab";
import { DEFAULT_MATERIALS } from "./data/materials";
import {
  initCalendarEvents, initPtoRequests, initEquipment, initEquipmentBookings,
  initCertifications, initSubSchedule, initWeatherAlerts, initScheduleConflicts,
} from "./data/calendarConstants";
import { initJSAs } from "./data/jsaConstants";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from "recharts";
import { initNative } from "./utils/native";
import { T } from "./data/translations";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { SyncStatus } from "./components/SyncStatus";
import { UpdateBanner } from "./components/InstallPrompt";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useNotifications } from "./hooks/useNotifications";
import { hasAccess, ROLES } from "./data/roles";
import { supabase, isSupabaseConfigured, signOut as supaSignOut, onAuthStateChange, signIn as supaSignIn, signUp as supaSignUp } from "./lib/supabase";

import { GanttScheduleView } from "./components/GanttScheduleView";
import { useAlertEngine } from "./hooks/useAlertEngine";
import { NotificationPanel } from "./components/NotificationPanel";
import { PerimeterMapModal } from "./components/PerimeterMapModal";
import { polygonAreaSqFt } from "./utils/geofence";
import { TrendingDown, AlertTriangle, DollarSign, Wrench, Package, FileX, ChevronDown, ChevronUp, Search, Calendar, Building2, BarChart2, ClipboardList, Globe, Bell, FolderOpen, MapPin, Paperclip, FileText, Image, Sheet, FileSpreadsheet, Camera, List, Columns, CheckSquare, Square, FileDown, Volume2, MessageSquare, Pin, PinOff, Truck, HardHat, Clipboard, LayoutDashboard, Briefcase, Calculator, MoreHorizontal } from "lucide-react";
import { FeatureGuide, resetAllGuides } from "./components/FeatureGuide";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · App Component
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

// ── Construction Stages (Phase 2B) — progress % auto-syncs with stage ──
const CONSTRUCTION_STAGES = [
  { key: "pre-con", label: "Pre-Con", color: "var(--purple)", owner: "pm", progress: 5 },
  { key: "mobilize", label: "Mobilize", color: "var(--blue)", owner: "pm", progress: 10 },
  { key: "demo", label: "Demo", color: "var(--red)", owner: "foreman", progress: 20 },
  { key: "framing", label: "Framing", color: "var(--amber)", owner: "foreman", progress: 40 },
  { key: "board", label: "Board", color: "#f97316", owner: "foreman", progress: 60 },
  { key: "tape", label: "Tape/Finish", color: "var(--green)", owner: "foreman", progress: 80 },
  { key: "punch", label: "Punch", color: "var(--cyan)", owner: "pm", progress: 90 },
  { key: "closeout", label: "Closeout", color: "var(--blue)", owner: "pm", progress: 100 },
];
const STAGE_MAP = Object.fromEntries(CONSTRUCTION_STAGES.map(s => [s.key, s]));

const PRIMARY_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "bids", label: "Bids" },
  { key: "projects", label: "Projects" },
  { key: "estimating", label: "Estimating" },
];

const SECONDARY_TABS = [
  { key: "financials", label: "Financials" },
  { key: "documents", label: "Documents" },
  { key: "calendar", label: "Calendar" },
  { key: "schedule", label: "Schedule" },
  { key: "reports", label: "Reports" },
  { key: "safety", label: "Safety" },
  { key: "jsa", label: "JSA" },
  { key: "materials", label: "Materials" },
  { key: "deliveries", label: "Deliveries" },
  { key: "incentives", label: "Incentives" },
  { key: "scope", label: "Scope" },
  { key: "contacts", label: "Contacts" },
  { key: "timeclock", label: "Time Clock" },
  { key: "sds", label: "SDS Binder" },
  { key: "foreman", label: "Foreman Portal" },
  { key: "map", label: "Map" },
  { key: "settings", label: "Settings" },
];

const SECONDARY_KEYS = SECONDARY_TABS.map(t => t.key);
const STATUS_BADGE = {
  invite_received: "badge-muted", reviewing: "badge-muted", assigned: "badge-blue",
  takeoff: "badge-amber", awaiting_quotes: "badge-amber", pricing: "badge-amber",
  draft_ready: "badge-blue", estimating: "badge-amber",
  submitted: "badge-blue", clarifications: "badge-amber", negotiating: "badge-blue",
  awarded: "badge-green", lost: "badge-red", no_bid: "badge-muted"
};
const STATUS_LABEL = {
  invite_received: "Invite Received", reviewing: "Reviewing Docs", assigned: "Assigned",
  takeoff: "Takeoff", awaiting_quotes: "Awaiting Quotes", pricing: "Pricing",
  draft_ready: "Proposal Ready", estimating: "Estimating",
  submitted: "Submitted", clarifications: "Clarifications", negotiating: "Negotiating",
  awarded: "Awarded", lost: "Lost", no_bid: "No Bid"
};
const BID_ACTIVE_STATUSES = ["invite_received", "reviewing", "assigned", "takeoff", "awaiting_quotes", "pricing", "draft_ready", "estimating", "submitted", "clarifications", "negotiating"];
const RISK_BADGE = { High: "badge-red", Med: "badge-amber", Low: "badge-green" };
const PRIORITY_BADGE = { high: "badge-red", med: "badge-amber", low: "badge-green" };
const SCOPE_ICONS = { unchecked: "○", checked: "✓", flagged: "⚑" };
const SCOPE_CYCLE = { unchecked: "checked", checked: "flagged", flagged: "unchecked" };
const BID_FILTERS = ["All", "Active", "Submitted", "Awarded", "Lost", "No Bid"];

// ── Sakura Petals (anime theme only) ──
const PETAL_COUNT = 28;
const SakuraPetals = () => {
  const petals = useMemo(() =>
    Array.from({ length: PETAL_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dur: 8 + Math.random() * 12,
      delay: Math.random() * 14,
      drift: -60 + Math.random() * 120,
      size: 10 + Math.random() * 14,
      hue: Math.random() > 0.3 ? 0 : 30,
    })), []);

  return (
    <div className="sakura-container">
      {petals.map(p => (
        <div
          key={p.id}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
            "--drift": `${p.drift}px`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="0 0 20 20">
            <path
              d="M10 0C10 0 6 5 6 10C6 13 8 15 10 17C12 15 14 13 14 10C14 5 10 0 10 0Z"
              fill={p.hue === 0
                ? `rgba(255,${160 + Math.floor(Math.random()*40)},${180 + Math.floor(Math.random()*40)},${0.5 + Math.random() * 0.4})`
                : `rgba(255,${200 + Math.floor(Math.random()*30)},${210 + Math.floor(Math.random()*30)},${0.4 + Math.random() * 0.3})`
              }
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

// ── Tokyo Skyline (anime theme only) ──
const TokyoSkyline = () => (
  <div className="tokyo-skyline">
    <svg viewBox="0 0 1400 180" preserveAspectRatio="none">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <path fill="url(#skyGrad)" d={
        // Tokyo Tower + buildings silhouette
        "M0,180 L0,140 L30,140 L30,100 L40,100 L40,130 L50,130 L50,90 L55,90 L55,130 " +
        "L80,130 L80,110 L90,110 L90,70 L95,70 L95,110 L100,110 L100,130 " +
        "L130,130 L130,95 L140,95 L140,130 L160,130 L160,105 L170,105 L170,130 " +
        "L200,130 L200,80 L205,80 L205,60 L208,45 L210,30 L212,45 L215,60 L220,80 L220,130 " +
        "L250,130 L250,100 L260,100 L260,85 L270,85 L270,130 " +
        "L300,130 L300,110 L310,110 L310,75 L320,75 L320,110 L330,110 L330,130 " +
        "L360,130 L360,90 L370,90 L370,130 " +
        "L400,130 L400,105 L410,105 L410,65 L420,65 L420,105 L430,105 L430,130 " +
        "L460,130 L460,95 L465,95 L465,55 L470,40 L475,55 L480,95 L480,130 " +
        "L510,130 L510,110 L520,110 L520,130 L550,130 L550,85 L560,85 L560,130 " +
        "L590,130 L590,100 L600,100 L600,70 L610,70 L610,100 L620,100 L620,130 " +
        "L650,130 L650,115 L660,115 L660,130 " +
        "L690,130 L690,80 L700,80 L700,50 L705,35 L710,50 L720,80 L720,130 " +
        "L750,130 L750,105 L760,105 L760,130 " +
        "L790,130 L790,90 L800,90 L800,60 L810,60 L810,90 L820,90 L820,130 " +
        "L850,130 L850,110 L860,110 L860,130 " +
        "L890,130 L890,95 L900,95 L900,75 L910,75 L910,130 " +
        "L940,130 L940,100 L950,100 L950,130 " +
        "L980,130 L980,85 L985,85 L985,50 L990,35 L995,50 L1000,85 L1000,130 " +
        "L1030,130 L1030,110 L1040,110 L1040,130 " +
        "L1070,130 L1070,90 L1080,90 L1080,65 L1090,65 L1090,90 L1100,90 L1100,130 " +
        "L1130,130 L1130,105 L1140,105 L1140,130 " +
        "L1170,130 L1170,95 L1180,95 L1180,130 " +
        "L1210,130 L1210,80 L1220,80 L1220,55 L1230,55 L1230,80 L1240,80 L1240,130 " +
        "L1270,130 L1270,110 L1280,110 L1280,130 " +
        "L1310,130 L1310,100 L1320,100 L1320,130 " +
        "L1350,130 L1350,115 L1360,115 L1360,130 " +
        "L1400,130 L1400,180 Z"
      }/>
    </svg>
  </div>
);

// ── Cyber Rain (cyberpunk theme only) ──
const RAIN_COUNT = 40;
const CyberRain = () => {
  const drops = useMemo(() =>
    Array.from({ length: RAIN_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dur: 1.5 + Math.random() * 3,
      delay: Math.random() * 6,
      height: 30 + Math.random() * 80,
    })), []);

  return (
    <div className="cyber-rain">
      {drops.map(d => (
        <div
          key={d.id}
          className="cyber-drop"
          style={{
            left: `${d.left}%`,
            height: `${d.height}px`,
            "--dur": `${d.dur}s`,
            "--delay": `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// ── AUTH WRAPPER (defined after App below, exported as default) ──
function AuthGate() {
  // DEV_BYPASS_LOGIN: skip login/onboarding during development — auto-login as Abner (admin)
  // Set to false to re-enable login screen
  const DEV_BYPASS_LOGIN = true;
  const DEV_DEFAULT_USER = { id: 999, name: "Abner Aguilar", email: "abner@ebconstructors.com", role: "admin", pin: "1234" };

  const [auth, setAuth] = useState(() => {
    if (DEV_BYPASS_LOGIN) return DEV_DEFAULT_USER;
    try {
      const stored = localStorage.getItem("ebc_auth");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [onboardingDone, setOnboardingDone] = useState(DEV_BYPASS_LOGIN);

  // Recompute whenever auth changes — check role-specific key first, then legacy key
  useEffect(() => {
    if (!auth) { setOnboardingDone(false); return; }
    const roleKey = `ebc_onboarding_completed_${auth.role}`;
    const done =
      localStorage.getItem(roleKey) === "true" ||
      localStorage.getItem("ebc_onboarding_complete") === "true";
    setOnboardingDone(done);
  }, [auth?.role, auth?.id]);

  // Listen for Supabase auth state changes (session refresh, sign-out from another tab, etc.)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("ebc_auth");
        setAuth(null);
      }
      // On token refresh, keep the session alive (no action needed — Supabase handles it)
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-provision Supabase auth for users logged in via localStorage only (no supabaseId)
  useEffect(() => {
    if (!auth || auth.supabaseId || !isSupabaseConfigured()) return;
    (async () => {
      try {
        // Look up the seed account password for this user
        const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
        const seed = users.find(u => u.email?.toLowerCase() === auth.email?.toLowerCase());
        if (!seed) return;
        // Only auto-provision if user has a legacy base64 password we can decode.
        // Bcrypt hashes (start with "$2") can't be reversed — user must re-login.
        if (!seed.password || seed.password.startsWith("$2")) return;
        let password;
        try { password = decodeURIComponent(atob(seed.password)); } catch { return; }
        // Try signing in first
        try {
          const { user, session } = await supaSignIn(auth.email, password);
          if (user && session) {
            const updated = { ...auth, supabaseId: user.id };
            localStorage.setItem("ebc_auth", JSON.stringify(updated));
            setAuth(updated);
            return;
          }
        } catch (e) {
          // User doesn't exist — auto-provision
          if (e.message?.includes("Invalid login") || e.status === 400) {
            try {
              const { user } = await supaSignUp(auth.email, password, {
                name: auth.name, role: auth.role, title: auth.title, ebc_user_id: auth.id,
              });
              if (user) {
                try { await supaSignIn(auth.email, password); } catch {}
                const updated = { ...auth, supabaseId: user.id };
                localStorage.setItem("ebc_auth", JSON.stringify(updated));
                setAuth(updated);
              }
            } catch (signUpErr) {
              console.warn("[auth] auto-provision failed:", signUpErr.message);
            }
          }
        }
      } catch (err) {
        console.warn("[auth] background Supabase auth failed:", err.message);
      }
    })();
  }, [auth?.email, auth?.supabaseId]);

  const handleLogin = useCallback((user) => {
    localStorage.setItem("ebc_auth", JSON.stringify(user));
    setAuth(user);
    // Request notification permission after login
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => Notification.requestPermission(), 2000);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    // Sign out of Supabase if configured (clears the JWT session)
    if (isSupabaseConfigured()) {
      try { await supaSignOut(); } catch {}
    }
    localStorage.removeItem("ebc_auth");
    // Clear legacy portal session keys
    localStorage.removeItem("ebc_activeForeman");
    localStorage.removeItem("ebc_activeDriver");
    localStorage.removeItem("ebc_activeEmployee");
    // Reset hash to root so user returns to main login
    window.location.hash = "#/";
    setAuth(null);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true);
  }, []);

  if (!auth) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  if (!onboardingDone) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} currentUser={auth} />;
  }

  return <App auth={auth} onLogout={handleLogout} />;
};

function App({ auth, onLogout }) {
  // ── UI preferences (localStorage only, no Supabase sync) ──
  const [theme, setTheme] = useLocalStorage("theme", "ebc");
  const [lang, setLang] = useLocalStorage("ebc_lang", "en");
  const [apiKey, setApiKey] = useLocalStorage("apiKey", "");

  // ── Robust overlay dismiss (prevents close-on-highlight) ──
  const _overlayDown = useRef(false);
  const onOverlayDown = (e) => { _overlayDown.current = (e.target === e.currentTarget); };
  const onOverlayUp = (closeFn) => (e) => {
    if (_overlayDown.current && e.target === e.currentTarget) closeFn();
    _overlayDown.current = false;
  };

  // ── Business data (synced to localStorage + Supabase) ──
  const [bids, setBids, _syncBids] = useSyncedState("bids", initBids);
  const [projects, setProjects, _syncProjects] = useSyncedState("projects", initProjects);
  const [contacts, setContacts, _syncContacts] = useSyncedState("contacts", initContacts);
  const [callLog, setCallLog, _syncCallLog] = useSyncedState("callLog", initCallLog);
  const [scope, setScope, _syncScope] = useSyncedState("scope", SCOPE_INIT);
  const [invoices, setInvoices, _syncInvoices] = useSyncedState("invoices", initInvoices);
  const [changeOrders, setChangeOrders, _syncChangeOrders] = useSyncedState("changeOrders", initChangeOrders);
  const [rfis, setRfis, _syncRfis] = useSyncedState("rfis", initRfis);
  const [submittals, setSubmittals, _syncSubmittals] = useSyncedState("submittals", initSubmittals);
  const [schedule, setSchedule, _syncSchedule] = useSyncedState("schedule", initSchedule);
  const [incidents, setIncidents, _syncIncidents] = useSyncedState("incidents", initIncidents);
  const [toolboxTalks, setToolboxTalks, _syncToolboxTalks] = useSyncedState("toolboxTalks", initToolboxTalks);
  const [dailyReports, setDailyReports, _syncDailyReports] = useSyncedState("dailyReports", initDailyReports);
  const [takeoffs, setTakeoffs, _syncTakeoffs] = useSyncedState("takeoffs", initTakeoffs);
  const [company, setCompany, _syncCompany] = useSyncedState("company", COMPANY_DEFAULTS);
  const [assemblies, setAssemblies, _syncAssemblies] = useSyncedState("assemblies", ASSEMBLIES);
  const [employees, setEmployees, _syncEmployees] = useSyncedState("employees", initEmployees);
  const [companyLocations, setCompanyLocations, _syncLocations] = useSyncedState("companyLocations", initCompanyLocations);
  const [timeEntries, setTimeEntries, _syncTimeEntries] = useSyncedState("timeEntries", initTimeEntries);
  const [teamSchedule, setCrewSchedule, _syncCrewSchedule] = useSyncedState("teamSchedule", initCrewSchedule);
  const [materialRequests, setMaterialRequests, _syncMaterialRequests] = useSyncedState("materialRequests", initMaterialRequests);
  const [calendarEvents, setCalendarEvents, _syncCalendarEvents] = useSyncedState("calendarEvents", initCalendarEvents);
  const [ptoRequests, setPtoRequests, _syncPtoRequests] = useSyncedState("ptoRequests", initPtoRequests);
  const [calEquipment, setCalEquipment, _syncEquipment] = useSyncedState("calEquipment", initEquipment);
  const [equipmentBookings, setEquipmentBookings, _syncEquipBookings] = useSyncedState("equipmentBookings", initEquipmentBookings);
  const [certifications, setCertifications, _syncCerts] = useSyncedState("certifications", initCertifications);
  const [jsas, setJsas, _syncJsas] = useSyncedState("jsas", initJSAs);
  const [tmTickets, setTmTickets, _syncTmTickets] = useSyncedState("tmTickets", initTmTickets);
  const [materials, setMaterials, _syncMaterials] = useSyncedState("materials", DEFAULT_MATERIALS);
  const [customAssemblies, setCustomAssemblies, _syncCustomAssemblies] = useSyncedState("customAssemblies", []);
  const [incentiveProjects, setIncentiveProjects, _syncIncentiveProjects] = useSyncedState("incentiveProjects", []);
  const [sdsSheets, setSdsSheets, _syncSds] = useSyncedState("sdsSheets", []);
  const [punchItems, setPunchItems, _syncPunch] = useSyncedState("punchItems", initPunchItems);
  const [areas, setAreas, _syncAreas] = useSyncedState("areas", initAreas);
  const [productionLogs, setProductionLogs, _syncProductionLogs] = useSyncedState("productionLogs", initProductionLogs);
  const [decisionLog, setDecisionLog, _syncDecisionLog] = useSyncedState("decisionLog", initDecisionLog);
  const [companySettings, setCompanySettings, _syncCompanySettings] = useSyncedState("companySettings", initCompanySettings);
  const [insurancePolicies, setInsurancePolicies, _syncInsurance] = useSyncedState("insurancePolicies", []);
  const [problems, setProblems, _syncProblems] = useSyncedState("problems", []);

  // ── User GPS location for proximity features ──
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  const getDistanceM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Aggregate sync status for UI ──
  const _allSync = [
    _syncBids, _syncProjects, _syncContacts, _syncCallLog, _syncScope,
    _syncInvoices, _syncChangeOrders, _syncRfis, _syncSubmittals, _syncSchedule,
    _syncIncidents, _syncToolboxTalks, _syncDailyReports, _syncTakeoffs,
    _syncCompany, _syncAssemblies, _syncEmployees, _syncLocations,
    _syncTimeEntries, _syncCrewSchedule, _syncMaterialRequests,
    _syncCalendarEvents, _syncPtoRequests, _syncEquipment, _syncEquipBookings,
    _syncCerts, _syncJsas, _syncTmTickets, _syncMaterials, _syncCustomAssemblies,
    _syncIncentiveProjects,
    _syncSds, _syncPunch, _syncInsurance, _syncProblems,
  ];
  const syncStatus = useMemo(() => ({
    loading: _allSync.some(s => s.loading),
    errors: _allSync.filter(s => s.error).map(s => s.error),
    refreshAll: () => _allSync.forEach(s => s.refresh()),
  }), [_allSync.map(s => `${s.loading}|${s.error}`).join(",")]);
  const [subSchedule, setSubSchedule] = useLocalStorage("subSchedule", initSubSchedule);
  const [weatherAlerts, setWeatherAlerts] = useLocalStorage("weatherAlerts", initWeatherAlerts);
  const [scheduleConflicts, setScheduleConflicts] = useLocalStorage("scheduleConflicts", initScheduleConflicts);

  // ── migrate old localStorage keys to new standardized names ──
  useEffect(() => {
    const keyMigrations = {
      ebc_cos: "ebc_changeOrders",
      ebc_subs: "ebc_submittals",
      ebc_tbtalks: "ebc_toolboxTalks",
      ebc_dailyrpts: "ebc_dailyReports",
    };
    for (const [oldKey, newKey] of Object.entries(keyMigrations)) {
      try {
        const old = localStorage.getItem(oldKey);
        if (old && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, old);
          localStorage.removeItem(oldKey);
        }
      } catch {}
    }
    // Flush any pending offline sync operations
    flushSyncQueue();
  }, []);

  // ── DATA VERSION CHECK — re-seed from constants.js when seed data changes ──
  useEffect(() => {
    try {
      const storedVer = parseInt(localStorage.getItem("ebc_data_version") || "0", 10);
      if (storedVer < DATA_VERSION) {
        // Re-seed all data from constants.js (overwrites stale localStorage + pushes to Supabase)
        setBids(initBids);
        setProjects(initProjects);
        setContacts(initContacts);
        setCallLog(initCallLog);
        setChangeOrders(initChangeOrders);
        setRfis(initRfis);
        setSubmittals(initSubmittals);
        setSchedule(initSchedule);
        setInvoices(initInvoices);         // []
        setTmTickets(initTmTickets);       // []
        setIncidents(initIncidents);       // []
        setToolboxTalks(initToolboxTalks); // []
        setDailyReports(initDailyReports); // []
        setTakeoffs(initTakeoffs);         // []
        setPunchItems(initPunchItems);
        localStorage.setItem("ebc_data_version", String(DATA_VERSION));
        console.info("[EBC] Data version upgraded to", DATA_VERSION, "— re-seeded all data from constants.js");
      }
    } catch {}
  }, []);

  // ── Smart Alert Engine — scans all data for actionable notifications ──
  const alertEngine = useAlertEngine({
    bids, projects, contacts, submittals, rfis, changeOrders,
    certifications, employees, timeEntries, invoices,
  });
  const { activeAlerts, grouped: alertGroups, badgeCount: alertBadgeCount, dismissAlert, dismissAll } = alertEngine;

  // ── i18n helper ──
  const t = useCallback((key) => {
    if (lang === "en") return key;
    return T[key]?.[lang] || key;
  }, [lang]);

  // ── hash routing ──
  const [route, setRoute] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    initNative(); // configure status bar, hide native splash, register app events
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // ── role view toggle (Admin can preview other role views) ──
  const [viewAsRole, setViewAsRole] = useLocalStorage("ebc_viewAsRole", "");

  // ── role view toggle (effective role for tabs/dashboard, actual role for portals) ──
  const effectiveRole = viewAsRole || auth?.role || "owner";

  // ── portal routing for field roles (uses actual auth role, NOT the toggle) ──
  const isDriverView = auth?.role === "driver";
  const isEmployeeView = auth?.role === "employee";
  const isForemanView = auth?.role === "foreman";

  // ── ephemeral state ──
  const [tab, setTab] = useState("dashboard");
  // Listen for tab-switch events from external routes (e.g., TakeoffRoute close)
  useEffect(() => {
    const handler = (e) => { if (e.detail) setTab(e.detail); };
    window.addEventListener("ebc-set-tab", handler);
    return () => window.removeEventListener("ebc-set-tab", handler);
  }, []);
  const [modal, setModal] = useState(null);
  const [initialProjTab, setInitialProjTab] = useState("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedBids, setSelectedBids] = useState(new Set());
  const [bidPageSize, setBidPageSize] = useState(24);
  const [projPageSize, setProjPageSize] = useState(24);
  const [projectViewMode, setProjectViewMode] = useState("list"); // "list" | "schedule"
  const [installPrompt, setInstallPrompt] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // ── PWA install prompt (24h cooldown after dismiss) ──
  useEffect(() => {
    const dismissedAt = localStorage.getItem("ebc_install_dismissed");
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) return;
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── toasts ──
  const { toasts, show } = useToast();

  // ── network / offline status ──
  const network = useNetworkStatus();
  const { requestPermission: reqNotifPerm, sendNotification: pmNotify } = useNotifications();
  useEffect(() => {
    if (network.wasOffline && network.online) {
      flushSyncQueue().then(() => network.refreshPending());
      show("Back online — syncing changes...");
    }
  }, [network.wasOffline, network.online]);

  // ── PM notifications: overdue RFIs + missing daily reports ──
  useEffect(() => {
    if (auth?.role === "pm" || auth?.role === "admin") reqNotifPerm();
  }, [auth?.role]); // eslint-disable-line react-hooks/exhaustive-deps
  const pmNotifFired = useRef({});
  useEffect(() => {
    if (!auth || (auth.role !== "pm" && auth.role !== "admin")) return;
    const today = new Date().toISOString().slice(0, 10);
    // Overdue RFIs (>7 days open)
    const overdueRfis = (rfis || []).filter(r => r.status === "open" || r.status === "submitted")
      .filter(r => { const d = new Date(r.submittedAt || r.createdAt); return !isNaN(d) && (Date.now() - d.getTime()) > 7 * 86400000; });
    if (overdueRfis.length > 0 && !pmNotifFired.current[`rfi-overdue-${today}`]) {
      pmNotify({ title: "EBC · RFIs Overdue", body: `${overdueRfis.length} RFI${overdueRfis.length > 1 ? "s" : ""} overdue (>7 days)`, tag: "pm-rfi-overdue" });
      pmNotifFired.current[`rfi-overdue-${today}`] = true;
    }
    // Missing daily reports (after 4 PM, check if today's report exists for active projects)
    const hour = new Date().getHours();
    if (hour >= 16 && !pmNotifFired.current[`report-missing-${today}`]) {
      const activeProjs = (projects || []).filter(p => p.status === "in-progress");
      const todayReports = (dailyReports || []).filter(r => r.date === today);
      const missing = activeProjs.filter(p => !todayReports.some(r => String(r.projectId) === String(p.id)));
      if (missing.length > 0) {
        pmNotify({ title: "EBC · Daily Reports Missing", body: `${missing.length} project${missing.length > 1 ? "s" : ""} have no daily report today`, tag: "pm-report-missing" });
        pmNotifFired.current[`report-missing-${today}`] = true;
      }
    }
  }, [rfis, dailyReports, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── bid filter (for bids tab) ──
  const [bidFilter, setBidFilter] = useState("All");
  const [bidViewMode, setBidViewMode] = useState("list"); // "list" | "pipeline" | "calendar"
  const [bidCalMonth, setBidCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [bidCalSelected, setBidCalSelected] = useState(null); // "YYYY-MM-DD"
  const [bidCalEvents, setBidCalEvents] = useLocalStorage("bidCalEvents", []);
  const [bidCalAddOpen, setBidCalAddOpen] = useState(false);
  const [bidCalEventForm, setBidCalEventForm] = useState({ type: "Site Walk", time: "", location: "", notes: "", bidId: "", date: "" });

  // ── scope bid selector ──
  const [scopeBidId, setScopeBidId] = useState(null);

  // ── contact filter ──
  const [contactSearch, setContactSearch] = useState("");

  // ── scope filter ──
  const [scopeFilter, setScopeFilter] = useState("All");

  // ── theme application ──
  useEffect(() => {
    const t = THEMES[theme] || THEMES.steel;
    Object.entries(t.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [theme]);

  // ── helpers ──
  const fmt = n => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtK = n => n >= 1000000 ? "$" + (n / 1000000).toFixed(1) + "M" : n >= 1000 ? "$" + (n / 1000).toFixed(0) + "K" : fmt(n);
  const nextId = () => crypto.randomUUID();

  // ── app bundle ──
  const app = {
    bids, setBids, projects, setProjects, contacts, setContacts, callLog, setCallLog,
    scope, setScope, invoices, setInvoices, changeOrders, setChangeOrders, rfis, setRfis,
    submittals, setSubmittals, schedule, setSchedule, incidents, setIncidents,
    toolboxTalks, setToolboxTalks, dailyReports, setDailyReports, takeoffs, setTakeoffs,
    company, setCompany, assemblies, setAssemblies, theme, setTheme,
    materials, setMaterials, customAssemblies, setCustomAssemblies, incentiveProjects, setIncentiveProjects, apiKey, setApiKey,
    employees, setEmployees, companyLocations, setCompanyLocations, timeEntries, setTimeEntries, teamSchedule, setCrewSchedule, materialRequests, setMaterialRequests,
    calendarEvents, setCalendarEvents, ptoRequests, setPtoRequests,
    equipment: calEquipment, setEquipment: setCalEquipment, equipmentBookings, setEquipmentBookings,
    certifications, setCertifications, subSchedule, setSubSchedule, weatherAlerts, setWeatherAlerts,
    scheduleConflicts, setScheduleConflicts,
    jsas, setJsas,
    tmTickets, setTmTickets,
    sdsSheets, setSdsSheets,
    punchItems, setPunchItems,
    areas, setAreas,
    productionLogs, setProductionLogs,
    decisionLog, setDecisionLog,
    companySettings, setCompanySettings,
    insurancePolicies, setInsurancePolicies,
    problems, setProblems,
    show, setModal, modal, search, setSearch, tab, setTab, subTab, setSubTab, fmt, fmtK, nextId,
    lang, setLang, t,
    auth, onLogout,
    syncStatus,
    initialProjTab, setInitialProjTab,
  };

  // ── KPI computations ──
  // Pipeline = submitted bids only (not yet awarded or lost)
  const pipeline = useMemo(() => bids.filter(b => b.status === "submitted").reduce((s, b) => s + (b.value || 0), 0), [bids]);
  const activeProjects = projects.length;
  // Open Bids = count of submitted bids only
  const openBids = bids.filter(b => b.status === "submitted").length;
  const awarded = bids.filter(b => b.status === "awarded").length;
  const lost = bids.filter(b => b.status === "lost").length;
  // Win Rate only meaningful when there are actual losses to compare against
  const winRate = awarded > 0 && lost > 0 ? Math.round((awarded / (awarded + lost)) * 100) : null;

  // ── Phase 3 KPI computations ──
  const gcWinRates = useMemo(() => {
    const map = {};
    bids.forEach(b => {
      if (!b.gc) return;
      if (!map[b.gc]) map[b.gc] = { gc: b.gc, total: 0, awarded: 0, lost: 0, pending: 0 };
      map[b.gc].total++;
      if (b.status === "awarded") map[b.gc].awarded++;
      else if (b.status === "lost") map[b.gc].lost++;
      else map[b.gc].pending++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [bids]);

  // Backlog = total contract value of all in-progress projects
  const backlog = useMemo(() => {
    return projects.filter(p => p.status === "in-progress").reduce((s, p) => s + (p.contract || 0), 0);
  }, [projects]);

  const cashFlow = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, net30: 0, net60: 0, net90: 0 };
    invoices.filter(i => i.status === "pending" || i.status === "overdue").forEach(i => {
      const d = new Date(i.date);
      const days = Math.floor((now - d) / 86400000);
      if (days <= 30) buckets.current += (i.amount || 0);
      else if (days <= 60) buckets.net30 += (i.amount || 0);
      else if (days <= 90) buckets.net60 += (i.amount || 0);
      else buckets.net90 += (i.amount || 0);
    });
    return buckets;
  }, [invoices]);

  // Labor % = weighted average of (laborCost / contract) across in-progress projects with cost data
  const laborUtil = useMemo(() => {
    const activeProjWithLabor = projects.filter(p => p.status === "in-progress" && (p.laborCost || 0) > 0 && (p.contract || 0) > 0);
    if (activeProjWithLabor.length === 0) return null;
    const totalLabor = activeProjWithLabor.reduce((s, p) => s + p.laborCost, 0);
    const totalContract = activeProjWithLabor.reduce((s, p) => s + p.contract, 0);
    return Math.round((totalLabor / totalContract) * 100);
  }, [projects]);

  // ── filtered bids ──
  const filteredBids = useMemo(() => {
    let list = bids;
    if (bidFilter === "Active") list = list.filter(b => BID_ACTIVE_STATUSES.includes(b.status));
    else if (bidFilter === "No Bid") list = list.filter(b => b.status === "no_bid");
    else if (bidFilter !== "All") list = list.filter(b => b.status === bidFilter.toLowerCase());
    // Hide converted-to-project bids from All and Active views (show only in Awarded filter)
    if (bidFilter === "All" || bidFilter === "Active") {
      list = list.filter(b => !b.convertedToProject);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.gc || "").toLowerCase().includes(q) ||
        (b.contact || "").toLowerCase().includes(q) ||
        (b.estimator || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [bids, bidFilter, search]);

  // ── filtered contacts ──
  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.role || "").toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  // ── filtered projects (role-scoped: PM sees own, admin/owner sees all) ──
  const filteredProjects = useMemo(() => {
    let list = projects;
    // PM sees only projects assigned to them; admin/owner sees all
    // Note: use effectiveRole (declared earlier) not userRole (declared later)
    if (effectiveRole === "pm" && auth?.name) {
      list = list.filter(p => p.pm === auth.name);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.gc || "").toLowerCase().includes(q) ||
        (p.phase || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q)
      );
    }
    // Sort by start date (newest first)
    return [...list].sort((a, b) => {
      const da = a.start ? new Date(a.start) : new Date(0);
      const db = b.start ? new Date(b.start) : new Date(0);
      return db - da;
    });
  }, [projects, search, effectiveRole, auth]);

  // ── filtered scope ──
  const filteredScope = useMemo(() => {
    if (scopeFilter === "Flagged") return scope.filter(s => s.status === "flagged");
    if (scopeFilter === "Unchecked") return scope.filter(s => s.status === "unchecked");
    return scope;
  }, [scope, scopeFilter]);

  // ── role-based tab filtering ──
  const userRole = effectiveRole;
  const visiblePrimary = useMemo(() =>
    PRIMARY_TABS.filter(t => hasAccess(userRole, t.key)), [userRole]);
  const visibleSecondary = useMemo(() =>
    SECONDARY_TABS.filter(t => hasAccess(userRole, t.key)), [userRole]);

  // ── nav handler ──
  const handleTabClick = (key) => {
    setTab(key);
    setMoreOpen(false);
    setMobileNav(false);
    setSearch("");
    setBidFilter("All");
    setSubTab(null);
  };

  const isSecondaryActive = SECONDARY_KEYS.includes(tab);

  // ── scope cycle handler ──
  const handleScopeCycle = (id) => {
    setScope(prev => prev.map(s => s.id === id ? { ...s, status: SCOPE_CYCLE[s.status] } : s));
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  // ── Dashboard chart data ──
  const statusChartData = useMemo(() => {
    const counts = { estimating: 0, submitted: 0, awarded: 0, lost: 0 };
    bids.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bids]);

  const gcChartData = useMemo(() => {
    const map = {};
    bids.forEach(b => { map[b.gc] = (map[b.gc] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + "..." : name, value }));
  }, [bids]);

  const monthChartData = useMemo(() => {
    const allMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const map = {};
    bids.forEach(b => {
      const m = b.month || (b.due ? allMonths[new Date(b.due).getMonth()] : null);
      if (m) map[m] = (map[m] || 0) + 1;
    });
    // Sort by calendar order, show only months with data
    return allMonths.filter(m => map[m]).map(m => ({ name: m, value: map[m] }));
  }, [bids]);

  const STATUS_COLORS = useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    return [
      s.getPropertyValue("--amber").trim() || "#e09422",
      s.getPropertyValue("--blue").trim() || "#3b82f6",
      s.getPropertyValue("--green").trim() || "#10b981",
      s.getPropertyValue("--red").trim() || "#ef4444",
    ];
  }, [theme]);

  // ── role-specific dashboard config ──
  const ROLE_DASH = {
    owner:       { subtitle: "Company Overview",       showKPIs: true,  showCharts: true,  showDigest: true,  showBrief: true,  showQuickActions: true },
    admin:       { subtitle: "Company Overview",       showKPIs: true,  showCharts: true,  showDigest: true,  showBrief: true,  showQuickActions: true },
    pm:          { subtitle: "Projects & Bids",        showKPIs: true,  showCharts: true,  showDigest: true,  showBrief: true,  showQuickActions: true },
    office_admin:{ subtitle: "Office Operations",      showKPIs: true,  showCharts: false, showDigest: false, showBrief: true,  showQuickActions: false },
    accounting:  { subtitle: "Financials & Payroll",   showKPIs: true,  showCharts: true,  showDigest: true,  showBrief: true,  showQuickActions: false },
    safety:      { subtitle: "Safety & Compliance",    showKPIs: false, showCharts: false, showDigest: false, showBrief: true,  showQuickActions: false },
    foreman:     { subtitle: "Field Operations",       showKPIs: false, showCharts: false, showDigest: false, showBrief: true,  showQuickActions: false },
    driver:      { subtitle: "Deliveries",             showKPIs: false, showCharts: false, showDigest: false, showBrief: false, showQuickActions: false },
    employee:    { subtitle: "My Work",                showKPIs: false, showCharts: false, showDigest: false, showBrief: false, showQuickActions: false },
  };
  const dashCfg = ROLE_DASH[userRole] || ROLE_DASH.owner;

  // ── Dashboard computed action items ──
  const dashActions = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const parseDate = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };

    // Bids due in next 7 days
    const bidsDueSoon = bids.filter(b => {
      if (b.status !== "estimating") return false;
      const d = parseDate(b.due);
      return d && d >= now && d <= in7;
    }).sort((a, b) => (parseDate(a.due) || 0) - (parseDate(b.due) || 0));

    // COs pending approval
    const cosPending = changeOrders.filter(co => co.status !== "approved" && co.status !== "rejected");
    const cosPendingTotal = cosPending.reduce((s, co) => s + (co.amount || 0), 0);

    // RFIs open (with age)
    const rfisOpen = rfis.filter(r => r.status !== "Answered" && r.status !== "Closed").map(r => {
      const submitted = r.submitted || r.dateSubmitted;
      const age = submitted ? Math.floor((now - new Date(submitted)) / 86400000) : 0;
      return { ...r, age };
    }).sort((a, b) => b.age - a.age);

    // Submittals due soon (not approved, due within 14 days)
    const in14 = new Date(now.getTime() + 14 * 86400000);
    const subsDueSoon = submittals.filter(s => {
      if (s.status === "approved") return false;
      const d = parseDate(s.due);
      return d && d <= in14;
    }).sort((a, b) => (parseDate(a.due) || 0) - (parseDate(b.due) || 0));

    // Overdue invoices
    const overdueInv = invoices.filter(i => i.status === "overdue" || (i.status === "pending" && parseDate(i.date) && (now - parseDate(i.date)) > 30 * 86400000));
    const overdueTotal = overdueInv.reduce((s, i) => s + (i.amount || 0), 0);

    // T&M tickets pending
    const tmPending = tmTickets.filter(t => t.status === "pending" || t.status === "draft");

    // Projects with no invoice in last 30 days (active projects only)
    // Suppress entirely when no invoices exist (no data to judge from)
    const projNoBilling = invoices.length === 0 ? [] : projects.filter(p => (p.progress || 0) < 100).filter(p => {
      const projInvs = invoices.filter(i => String(i.projectId) === String(p.id));
      if (projInvs.length === 0) return true;
      const latest = Math.max(...projInvs.map(i => parseDate(i.date)?.getTime() || 0));
      return (now.getTime() - latest) > 30 * 86400000;
    });

    // Projects at risk (behind schedule)
    const projAtRisk = projects.filter(p => {
      if ((p.progress || 0) >= 100) return false;
      const end = parseDate(p.end);
      const start = parseDate(p.start);
      if (!end || !start) return false;
      const totalDays = (end - start) / 86400000;
      const elapsed = (now - start) / 86400000;
      const expectedProgress = Math.min(100, (elapsed / totalDays) * 100);
      return (p.progress || 0) < expectedProgress - 15; // 15% behind expected
    });

    // Follow-ups from call log
    const followUps = callLog.filter(c => c.next && c.next.trim());

    // Profit margin alerts — flag active projects below 30% margin
    // profit% = (contract - laborCost - materialCost) / contract * 100
    const profitAlerts = projects.filter(p => {
      if ((p.progress || 0) >= 100) return false; // skip completed
      const contract = p.contract || 0;
      if (contract <= 0) return false; // can't calculate without contract
      const totalCost = (p.laborCost || 0) + (p.materialCost || 0);
      if (totalCost <= 0) return false; // no costs entered yet — not alertable
      const margin = ((contract - totalCost) / contract) * 100;
      return margin < 30;
    }).map(p => {
      const contract = p.contract || 0;
      const totalCost = (p.laborCost || 0) + (p.materialCost || 0);
      const margin = Math.round(((contract - totalCost) / contract) * 100);
      return { ...p, margin, totalCost };
    }).sort((a, b) => a.margin - b.margin);

    // Total urgency count
    const urgentCount = bidsDueSoon.length + cosPending.length + rfisOpen.filter(r => r.age > 7).length + subsDueSoon.length + overdueInv.length + profitAlerts.length;

    return { bidsDueSoon, cosPending, cosPendingTotal, rfisOpen, subsDueSoon, overdueInv, overdueTotal, tmPending, projNoBilling, projAtRisk, followUps, profitAlerts, urgentCount };
  }, [bids, changeOrders, rfis, submittals, invoices, tmTickets, projects, callLog]);

  const pName = (pid) => projects.find(p => String(p.id) === String(pid))?.name || "Unknown";

  const renderDashboard = () => (
    <div>
      {/* ── Header — action-oriented ── */}
      <div className="section-header">
        <div>
          <div className="section-title font-head fs-20">{t("Command Center")}</div>
          <div className="section-sub" style={{ fontSize: "var(--text-label)", display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span>{auth?.name || "EBC"} — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
            {(auth?.role === "owner" || auth?.role === "admin") && (
              <select
                value={viewAsRole || auth?.role || "owner"}
                onChange={e => setViewAsRole(e.target.value === (auth?.role || "owner") ? "" : e.target.value)}
                style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--bg3)", color: viewAsRole && viewAsRole !== auth?.role ? "var(--amber)" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            )}
            {dashActions.urgentCount > 0 && <span className="text-red fw-700">{dashActions.urgentCount} items need attention</span>}
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text3)", marginLeft: "var(--space-2)" }}>
              {t("Data")}: {new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})} ({t("local")})
            </span>
          </div>
        </div>
        <div className="flex gap-8">
          <FeatureGuide guideKey="dashboard" />
          {dashCfg.showBrief && (
            <button className="btn btn-ghost" onClick={() => { showBrief ? setShowBrief(false) : runMorningBrief(); }} disabled={briefLoading}>
              {briefLoading ? t("Loading...") : t("Morning Brief")}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setModal({ type: "editBid", data: null })}>+ New Bid</button>
        </div>
      </div>

      {/* Morning Briefing Panel */}
      {showBrief && briefResult && (
        <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)", maxHeight: 450, overflow: "auto" }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">{briefResult.greeting || "Good morning!"}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBrief(false)}>{t("Close")}</button>
          </div>

          <div className="text-sm text-muted mb-12">{briefResult.summary}</div>

          {/* Urgent Alerts */}
          {briefResult.urgentAlerts?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-red">{t("Urgent Alerts")}</div>
              {briefResult.urgentAlerts.map((a, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: a.project ? "pointer" : undefined }}
                  onClick={a.project ? () => { const p = projects.find(p => p.name?.toLowerCase().includes(a.project.toLowerCase())); if (p) setModal({ type: "editProject", data: p }); } : undefined}>
                  <div className="flex-between">
                    <span className="text-sm">{a.alert}</span>
                    <span className="badge badge-red">{a.type}</span>
                  </div>
                  <div className="text-xs mt-2 text-green">{a.action}</div>
                </div>
              ))}
            </div>
          )}

          {/* Today's Focus */}
          {briefResult.todaysFocus?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-amber">{t("Today's Focus")}</div>
              {briefResult.todaysFocus.map((f, i) => (
                <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", cursor: f.project ? "pointer" : undefined }}
                  onClick={f.project ? () => { const p = projects.find(p => p.name?.toLowerCase().includes(f.project.toLowerCase())); if (p) setModal({ type: "editProject", data: p }); } : undefined}>
                  <div className="flex-between">
                    <span className="text-sm">{f.item}</span>
                    <span className={`badge ${f.priority === "critical" ? "badge-red" : f.priority === "high" ? "badge-amber" : "badge-muted"}`}>{f.priority}</span>
                  </div>
                  {f.project && <div className="text-xs text-dim mt-2 text-blue" style={{ textDecoration: "underline" }}>{f.project}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Money Moves */}
          {briefResult.moneyMoves?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8">{t("Money Moves")}</div>
              {briefResult.moneyMoves.map((m, i) => (
                <div key={i} className="queue-row">
                  <div className="flex-between">
                    <span className="text-sm">{m.item}</span>
                    <span className="font-semi text-sm text-green">{m.amount}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{m.action} — {m.deadline}</div>
                </div>
              ))}
            </div>
          )}

          {/* Motivational quote removed per design audit — replaced with action-oriented content */}
        </div>
      )}

      {/* ── Today's Field Activity Summary — aggregates foreman-entered data ── */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayProd = (productionLogs || []).filter(pl => pl.date === todayStr || (pl.createdAt && pl.createdAt.startsWith(todayStr)));
        const todayTm = (tmTickets || []).filter(t => t.createdAt && t.createdAt.startsWith(todayStr));
        const todayPunch = (punchItems || []).filter(p => (p.createdAt && p.createdAt.startsWith(todayStr)) || (p.resolvedAt && p.resolvedAt.startsWith(todayStr)));
        const punchCreated = todayPunch.filter(p => p.createdAt && p.createdAt.startsWith(todayStr)).length;
        const punchResolved = todayPunch.filter(p => p.resolvedAt && p.resolvedAt.startsWith(todayStr)).length;
        const todayProblems = (problems || []).filter(p => p.reportedAt && p.reportedAt.startsWith(todayStr));
        const todayReports = (dailyReports || []).filter(r => r.submittedAt && r.submittedAt.startsWith(todayStr));
        const unreviewed = todayReports.filter(r => !r.reviewedBy).length;
        const hasActivity = todayProd.length > 0 || todayTm.length > 0 || todayPunch.length > 0 || todayProblems.length > 0 || todayReports.length > 0;
        if (!hasActivity) return null;
        return (
          <div className="card dash-card dash-card--green">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <ClipboardList size={15} /> {t("Today's Field Activity")}
            </div>
            <div className="grid-auto-180">
              {todayProd.length > 0 && (
                <div className="activity-tile">
                  <div className="text-lg font-bold text-green">{todayProd.length}</div>
                  <div className="text-xs text-muted">{t("Production logged")}</div>
                  <div className="text-xs text-dim">{todayProd.length} {t("entries today")}</div>
                </div>
              )}
              {todayTm.length > 0 && (
                <div className="activity-tile">
                  <div className="text-lg font-bold text-amber">{todayTm.length}</div>
                  <div className="text-xs text-muted">{t("T&M tickets")}</div>
                  <div className="text-xs text-dim">{todayTm.length} {t("created today")}</div>
                </div>
              )}
              {(punchCreated > 0 || punchResolved > 0) && (
                <div className="activity-tile">
                  <div className="text-lg font-bold text-red">{punchCreated}</div>
                  <div className="text-xs text-muted">{t("Punch items")}</div>
                  <div className="text-xs text-dim">{punchResolved} {t("resolved today")}</div>
                </div>
              )}
              {todayProblems.length > 0 && (
                <div className="activity-tile">
                  <div className="text-lg font-bold text-red">{todayProblems.length}</div>
                  <div className="text-xs text-muted">{t("Problems reported")}</div>
                </div>
              )}
              {todayReports.length > 0 && (
                <div className="activity-tile">
                  <div className="text-lg font-bold text-blue">{todayReports.length}</div>
                  <div className="text-xs text-muted">{t("Daily reports")}</div>
                  {unreviewed > 0 && <div className="text-xs text-amber fw-700">{unreviewed} {t("un-reviewed")}</div>}
                </div>
              )}
            </div>
            {/* Per-project breakdown */}
            <div className="mt-10">
              {[...new Set(todayProd.map(p => p.projectId))].map(pid => {
                const proj = projects.find(p => String(p.id) === String(pid));
                const count = todayProd.filter(p => p.projectId === pid).length;
                return proj ? (
                  <div key={pid} className="text-xs py-3 cursor-pointer text-blue"
                    onClick={() => setModal({ type: "editProject", data: proj })}>
                    {proj.name}: {count} {t("entries today")}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        );
      })()}

      {/* ── This Week Look-Ahead — crew + deliveries + events ── */}
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const weekDays = [];
        for (let i = 0; i < lookAheadDays; i++) {
          const d = new Date(today); d.setDate(d.getDate() + i);
          weekDays.push(d);
        }
        const dayKey = (d) => ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
        const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const todayStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

        // Build daily entries
        const days = weekDays.map((d, i) => {
          const dk = dayKey(d);
          const ds = todayStr(d);
          const crewCount = (teamSchedule || []).filter(s => s.days?.[dk]).length;
          const deliveries = (materialRequests || []).filter(r => {
            const sched = r.scheduledDate || r.deliveryDate;
            return sched === ds && (r.status === "approved" || r.status === "assigned");
          }).length;
          const events = (calendarEvents || []).filter(ev => {
            const evDate = ev.date || ev.start;
            return evDate && evDate.startsWith(ds);
          });
          return { date: d, label: fmtDay(d), crew: crewCount, deliveries, events, isToday: i === 0 };
        });

        // Only show if we have some data
        const hasData = days.some(d => d.crew > 0 || d.deliveries > 0 || d.events.length > 0);
        if (!hasData) return null;

        return (
          <div className="card dash-card dash-card--amber">
            <div className="text-sm font-semi mb-8 flex-between">
              <span className="flex-center-gap-6">
                <Calendar size={15} /> {t("Look-Ahead")}
                <span className="flex gap-2 ml-8">
                  {[7, 14, 21].map(d => (
                    <button key={d} className={`btn btn-sm ${lookAheadDays === d ? "btn-primary" : "btn-ghost"}`}
                      style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", minHeight: 0 }}
                      onClick={() => setLookAheadDays(d)}>{d}d</button>
                  ))}
                </span>
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleTabClick("calendar")}>{t("Full Calendar")}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(weekDays.length, 7)}, 1fr)`, gap: "var(--space-1)", fontSize: "var(--text-tab)" }}>
              {days.map((d, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-1)", borderRadius: "var(--radius-control)", background: i === 0 ? "rgba(16,185,129,0.08)" : "var(--bg3)", textAlign: "center", border: i === 0 ? "1px solid var(--green)" : "1px solid transparent" }}>
                  <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-xs)", color: i === 0 ? "var(--green)" : "var(--text3)", marginBottom: "var(--space-1)" }}>
                    {d.label.split(",")[0]}
                  </div>
                  {d.crew > 0 && <div className="text-blue">{d.crew} <span className="fs-9">crew</span></div>}
                  {d.deliveries > 0 && <div className="text-amber">{d.deliveries} <span className="fs-9">del</span></div>}
                  {d.events.map((ev, ei) => (
                    <div key={ei} style={{ fontSize: "var(--text-xs)", color: "var(--text3)", marginTop: "var(--space-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title || ev.type}
                    </div>
                  ))}
                  {d.crew === 0 && d.deliveries === 0 && d.events.length === 0 && <div className="text-dim fs-9">—</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Today's Manpower — cross-project headcount ── */}
      {(() => {
        const todayStr2 = new Date().toDateString();
        const todayKey2 = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
        // Group crew by project from today's clock-ins + schedule
        const projManpower = {};
        timeEntries.filter(te => new Date(te.clockIn).toDateString() === todayStr2).forEach(te => {
          const pid = te.projectId;
          if (!projManpower[pid]) projManpower[pid] = { crew: new Set(), hours: 0 };
          projManpower[pid].crew.add(te.employeeId);
          projManpower[pid].hours += te.totalHours || 0;
        });
        // Also add scheduled (not yet clocked in)
        (teamSchedule || []).filter(s => s.days?.[todayKey2]).forEach(s => {
          const pid = s.projectId;
          if (!projManpower[pid]) projManpower[pid] = { crew: new Set(), hours: 0 };
          projManpower[pid].crew.add(s.employeeId);
        });
        const entries = Object.entries(projManpower);
        if (entries.length === 0) return null;
        const totalCrew = new Set(entries.flatMap(([, v]) => [...v.crew])).size;
        return (
          <div className="card card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <HardHat size={15} /> {t("Today's Manpower")} — {totalCrew} {t("crew")} {t("across")} {entries.length} {t("sites")}
            </div>
            {entries.map(([pid, data]) => {
              const proj = projects.find(p => String(p.id) === String(pid));
              if (!proj) return null;
              return (
                <div key={pid} className="flex-between queue-row fs-12 cursor-pointer"
                  onClick={() => setModal({ type: "editProject", data: proj })}>
                  <span className="text-blue font-semi">{proj.name}</span>
                  <span><strong>{data.crew.size}</strong> crew · {data.hours.toFixed(0)}h</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Today's Sites — quick directions / clock-in ── */}
      {(() => {
        const mySites = projects.filter(p => p.status === "in-progress" && p.lat && p.lng);
        if (mySites.length === 0) return null;
        const PROXIMITY_M = 200;
        return (
          <div className="card card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <MapPin size={15} /> Today's Sites
              <span className="text-xs text-muted fw-400">({mySites.length} active)</span>
            </div>
            <div className="grid-auto-260">
              {mySites.slice(0, 6).map(p => {
                const dist = userLocation ? getDistanceM(userLocation.lat, userLocation.lng, p.lat, p.lng) : null;
                const isOnSite = dist !== null && dist < PROXIMITY_M;
                const distLabel = dist !== null
                  ? dist < 1000 ? `${Math.round(dist)}m away` : `${(dist / 1609.34).toFixed(1)} mi away`
                  : null;
                return (
                  <div key={p.id} className="activity-tile flex-between flex-center-gap-8">
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="text-sm font-semi text-ellipsis cursor-pointer text-blue"
                        onClick={() => setModal({ type: "editProject", data: p })}>{p.name}</div>
                      <div className="text-xs text-muted text-ellipsis">
                        {p.address}{p.suite ? ` — ${p.suite}` : ""}
                      </div>
                      {distLabel && <div className="text-xs" style={{ color: isOnSite ? "var(--green)" : "var(--text-muted)", marginTop: "var(--space-1)" }}>{isOnSite ? "On site" : distLabel}</div>}
                    </div>
                    {isOnSite ? (
                      <button className="btn btn-primary btn-sm ws-nowrap flex-shrink-0"
                        onClick={() => handleTabClick("timeclock")}>
                        Clock In
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm ws-nowrap flex-shrink-0"
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, "_blank")}>
                        Directions
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {mySites.length > 6 && (
              <div className="text-xs text-muted mt-6 cursor-pointer text-blue"
                onClick={() => handleTabClick("projects")}>View all {mySites.length} sites →</div>
            )}
          </div>
        );
      })()}

      {/* ── PM Action Queue (Phase 2A') — single decision inbox ── */}
      {dashCfg.showKPIs && (() => {
        const pendingMat = (materialRequests || []).filter(r => r.status === "requested");
        const urgentMat = pendingMat.filter(r => r.urgency === "urgent" || r.urgency === "emergency");
        const awaitingConfirm = (materialRequests || []).filter(r => r.status === "delivered" && !r.confirmedBy);
        const pendingReviews = (dailyReports || []).filter(r => !r.reviewedBy);
        const openProblems = (problems || []).filter(p => p.status === "open" && !p.assignedTo);
        const queueTotal = pendingMat.length + awaitingConfirm.length + pendingReviews.length + openProblems.length;
        if (queueTotal === 0) return null;
        return (
          <div className="card dash-card dash-card--amber bg-2">
            <div className="flex-between mb-8">
              <div className="text-sm font-semi flex-center-gap-6">
                <span>⚡</span> PM Action Queue
                <span className="badge badge-amber" style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)" }}>{queueTotal}</span>
              </div>
            </div>
            <div className="flex-col-gap-6">
              {pendingMat.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>📦</span>
                    <span className="text-sm">Material Requests</span>
                    {urgentMat.length > 0 && <span className="badge badge-red" style={{ fontSize: "var(--text-xs)", padding: "0 5px" }}>{urgentMat.length} urgent</span>}
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-amber">{pendingMat.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => handleTabClick("materials")}>Review</button>
                  </div>
                </div>
              )}
              {awaitingConfirm.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>✓</span>
                    <span className="text-sm">Deliveries Awaiting Confirmation</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-green">{awaitingConfirm.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => handleTabClick("materials")}>View</button>
                  </div>
                </div>
              )}
              {pendingReviews.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>📋</span>
                    <span className="text-sm">Daily Reports</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi">{pendingReviews.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => handleTabClick("reports")}>Review</button>
                  </div>
                </div>
              )}
              {openProblems.length > 0 && (
                <div className="flex-between py-6">
                  <div className="flex-center-gap-8">
                    <span>⚠️</span>
                    <span className="text-sm">Unassigned Problems</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-red">{openProblems.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => handleTabClick("reports")}>Assign</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Projects by Stage (Phase 2B) ── */}
      {dashCfg.showKPIs && (() => {
        const staged = (projects || []).filter(p => p.constructionStage && (p.progress || 0) < 100);
        if (staged.length === 0) return null;
        const counts = {};
        staged.forEach(p => { counts[p.constructionStage] = (counts[p.constructionStage] || 0) + 1; });
        return (
          <div className="flex gap-6 mb-12 flex-wrap">
            {CONSTRUCTION_STAGES.map(s => counts[s.key] ? (
              <div key={s.key} style={{ padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-control)", background: s.color + "18", border: `1px solid ${s.color}33`, fontSize: "var(--text-tab)", color: s.color, fontWeight: "var(--weight-semi)", cursor: "pointer" }}
                onClick={() => handleTabClick("projects")}>
                {s.label} <span className="fw-800">{counts[s.key]}</span>
              </div>
            ) : null)}
          </div>
        );
      })()}

      {/* ── Section 1: Action Items — what needs attention NOW ── */}
      {dashCfg.showKPIs && (dashActions.bidsDueSoon.length > 0 || dashActions.cosPending.length > 0 || dashActions.rfisOpen.length > 0 || dashActions.subsDueSoon.length > 0 || dashActions.overdueInv.length > 0 || dashActions.tmPending.length > 0 || dashActions.profitAlerts.length > 0) && (
        <div className="grid-auto-200 mb-16">
          {dashActions.bidsDueSoon.length > 0 && (
            <div className="card action-card action-card--red" onClick={() => handleTabClick("bids")}>
              <div className="text-xs text-muted">Bids Due This Week</div>
              <div className="action-value text-red">{dashActions.bidsDueSoon.length}</div>
              <div className="text-xs text-muted mt-2">{dashActions.bidsDueSoon.slice(0, 2).map(b => b.name?.slice(0, 20) || "Untitled").join(", ")}{dashActions.bidsDueSoon.length > 2 ? "..." : ""}</div>
            </div>
          )}
          {dashActions.cosPending.length > 0 && (
            <div className="card action-card action-card--amber" onClick={() => handleTabClick("projects")}>
              <div className="text-xs text-muted">COs Pending</div>
              <div style={{ fontSize: "var(--text-subtitle)", fontWeight: "var(--weight-bold)", color: "var(--amber)" }}>{dashActions.cosPending.length}</div>
              <div className="text-xs text-muted mt-2">{fmtK(dashActions.cosPendingTotal)} awaiting approval</div>
            </div>
          )}
          {dashActions.rfisOpen.length > 0 && (() => {
            const overdueRfis = dashActions.rfisOpen.filter(r => r.age > 7);
            return (
              <div className="card" style={{ padding: "var(--space-3) var(--space-4)", cursor: "pointer", borderLeft: `3px solid ${overdueRfis.length > 0 ? "var(--red)" : "var(--blue)"}` }} onClick={() => handleTabClick("projects")}>
                <div className="text-xs text-muted">Open RFIs</div>
                <div style={{ fontSize: "var(--text-subtitle)", fontWeight: "var(--weight-bold)", color: overdueRfis.length > 0 ? "var(--red)" : "var(--blue)" }}>{dashActions.rfisOpen.length}</div>
                {overdueRfis.length > 0 && <div className="text-xs text-red fw-700 mt-2">{overdueRfis.length} overdue (oldest: {dashActions.rfisOpen[0].age}d)</div>}
              </div>
            );
          })()}
          {dashActions.subsDueSoon.length > 0 && (
            <div className="card action-card action-card--amber" onClick={() => handleTabClick("projects")}>
              <div className="text-xs text-muted">Submittals Due</div>
              <div className="action-value">{dashActions.subsDueSoon.length}</div>
              <div className="text-xs text-muted mt-2">within 14 days</div>
            </div>
          )}
          {dashActions.overdueInv.length > 0 && (
            <div className="card action-card action-card--red" onClick={() => handleTabClick("financials")}>
              <div className="text-xs text-muted">Overdue Invoices</div>
              <div className="action-value text-red">{dashActions.overdueInv.length}</div>
              <div className="text-xs text-muted mt-2">{fmtK(dashActions.overdueTotal)} outstanding</div>
            </div>
          )}
          {dashActions.tmPending.length > 0 && (
            <div className="card action-card action-card--amber" onClick={() => handleTabClick("financials")}>
              <div className="text-xs text-muted">T&M Pending</div>
              <div className="action-value">{dashActions.tmPending.length}</div>
              <div className="text-xs text-muted mt-2">tickets to review</div>
            </div>
          )}
          {dashActions.profitAlerts.length > 0 && (
            <div className="card action-card action-card--red" onClick={() => handleTabClick("projects")}>
              <div className="text-xs text-muted">Low Margin</div>
              <div className="action-value text-red">{dashActions.profitAlerts.length}</div>
              <div className="text-xs text-muted mt-2">projects below 30%</div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 2: Compact KPI row — context, not decoration ── */}
      {dashCfg.showKPIs && (
        <div className="kpi-compact-row">
          {[
            { label: "Backlog", val: backlog > 0 ? fmtK(backlog) : null, click: "projects" },
            { label: "Pipeline", val: pipeline > 0 ? fmtK(pipeline) : null, click: "bids" },
            { label: "Win Rate", val: winRate !== null ? `${winRate}%` : null, sub: winRate !== null ? `${awarded}W/${lost}L` : null, click: "bids" },
            { label: "A/R", val: (cashFlow.current + cashFlow.net30 + cashFlow.net60 + cashFlow.net90) > 0 ? fmtK(cashFlow.current + cashFlow.net30 + cashFlow.net60 + cashFlow.net90) : null, color: cashFlow.net90 > 0 ? "var(--red)" : undefined, click: "financials" },
            { label: "Labor", val: laborUtil !== null ? `${laborUtil}%` : null, color: laborUtil !== null ? (laborUtil >= 70 ? "var(--green)" : laborUtil >= 50 ? "var(--amber)" : "var(--red)") : undefined, click: "timeclock" },
            { label: "Open Bids", val: openBids > 0 ? String(openBids) : null, click: "bids" },
          ].filter(k => k.val).map((k, i) => (
            <div key={i} className="kpi-compact"
              onClick={() => handleTabClick(k.click)}>
              <div className="text-xs text-muted">{k.label}</div>
              <div style={{ fontSize: "var(--text-card)", fontWeight: "var(--weight-bold)", color: k.color || "var(--text)" }}>{k.val}</div>
              {k.sub && <div className="text-xs text-muted">{k.sub}</div>}
            </div>
          ))}
          {dashActions.profitAlerts.length > 0 && (
            <div style={{ padding: "var(--space-2) var(--space-4)", cursor: "pointer", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", minWidth: 80, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-1)" }}
              onClick={() => document.getElementById("profit-analysis-section")?.scrollIntoView({ behavior: "smooth" })}>
              <div className="flex-center-gap-4">
                <TrendingDown size={12} className="text-red" />
                <span className="text-xs text-red text-uppercase" style={{ letterSpacing: "0.6px" }}>Profit Alert</span>
              </div>
              <div style={{ fontSize: "var(--text-card)", fontWeight: "var(--weight-bold)", color: "var(--red)" }}>{dashActions.profitAlerts.length}</div>
              <div className="text-xs text-red" style={{ opacity: 0.8 }}>{dashActions.profitAlerts.filter(p => p.margin < 15).length > 0 ? `${dashActions.profitAlerts.filter(p => p.margin < 15).length} critical` : "below 30%"}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Project Health — behind schedule / no billing ── */}
      {dashCfg.showKPIs && (dashActions.projAtRisk.length > 0 || dashActions.projNoBilling.length > 0) && (
        <div className="card dash-card">
          <div className="text-sm font-semi mb-8">Project Health</div>
          {dashActions.projAtRisk.length > 0 && (
            <div style={{ marginBottom: dashActions.projNoBilling.length > 0 ? 10 : 0 }}>
              <div className="text-xs text-red mb-4">Behind Schedule ({dashActions.projAtRisk.length})</div>
              {dashActions.projAtRisk.slice(0, 4).map(p => (
                <div key={p.id} className="text-sm py-3 cursor-pointer text-blue"
                  onClick={() => setModal({ type: "editProject", data: p })}>{p.name} — {p.progress || 0}%</div>
              ))}
              {dashActions.projAtRisk.length > 4 && <div className="text-xs text-muted">+{dashActions.projAtRisk.length - 4} more</div>}
            </div>
          )}
          {dashActions.projNoBilling.length > 0 && (
            <div>
              <div className="text-xs text-amber mb-4">No Billing 30+ Days ({dashActions.projNoBilling.length})</div>
              {dashActions.projNoBilling.slice(0, 4).map(p => (
                <div key={p.id} className="text-sm py-3 cursor-pointer text-blue"
                  onClick={() => setModal({ type: "editProject", data: p })}>{p.name}</div>
              ))}
              {dashActions.projNoBilling.length > 4 && <div className="text-xs text-muted">+{dashActions.projNoBilling.length - 4} more</div>}
            </div>
          )}
        </div>
      )}

      {/* ── Profit Analysis — projects below 30% margin ── */}
      {dashCfg.showKPIs && dashActions.profitAlerts.length > 0 && (() => {
        const getProfitDiagnosis = (p) => {
          const laborRatio = p.laborCost ? p.laborCost / p.contract : null;
          const matRatio = p.materialCost ? p.materialCost / p.contract : null;
          const issues = [];
          // Labor is primary profit driver — healthy labor ratio is ~50% of contract (100% markup)
          if (laborRatio !== null && laborRatio > 0.55) issues.push({ icon: <Wrench size={11} />, text: "Labor overrun" });
          if (matRatio !== null && matRatio > 0.28) issues.push({ icon: <Package size={11} />, text: "Material overage" });
          // Check negative COs
          const projCOs = changeOrders.filter(co => String(co.projectId) === String(p.id) && co.amount < 0 && co.status === "approved");
          if (projCOs.length > 0) issues.push({ icon: <FileX size={11} />, text: "CO reduced margin" });
          if (issues.length === 0) {
            if (p.margin < 0) return [{ icon: <AlertTriangle size={11} />, text: "Contract underwater" }];
            if (p.margin < 15) return [{ icon: <AlertTriangle size={11} />, text: "Critical — review estimate vs actuals" }];
            return [{ icon: <TrendingDown size={11} />, text: "Below 30% target" }];
          }
          return issues;
        };
        const criticalCount = dashActions.profitAlerts.filter(p => p.margin < 15).length;
        const warnCount = dashActions.profitAlerts.filter(p => p.margin >= 15).length;
        return (
          <div id="profit-analysis-section" className="card dash-card dash-card--red">
            <div className="flex-between mb-12">
              <div className="flex-center-gap-8">
                <TrendingDown size={16} className="text-red" />
                <span className="text-sm font-semi text-default">Profit Analysis</span>
                <span className="text-xs text-muted">— projects below 30% margin</span>
              </div>
              <div className="flex-center-gap-6">
                {criticalCount > 0 && <span className="badge badge-red flex-center-gap-4"><AlertTriangle size={10} /> {criticalCount} critical</span>}
                {warnCount > 0 && <span className="badge badge-amber">{warnCount} warning</span>}
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>GC</th>
                    <th className="num">Contract</th>
                    <th className="num">Est. Costs</th>
                    <th className="num">Margin</th>
                    <th>Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {dashActions.profitAlerts.map(p => {
                    const diagnosis = getProfitDiagnosis(p);
                    const badgeClass = p.margin < 0 ? "badge-red" : p.margin < 15 ? "badge-red" : "badge-amber";
                    return (
                      <tr key={p.id} className="cursor-pointer" onClick={() => setModal({ type: "editProject", data: p })}>
                        <td>
                          <div className="text-sm text-blue fw-500">{p.name}</div>
                          <div className="text-xs text-muted">{p.phase}</div>
                        </td>
                        <td className="text-sm text-muted">{p.gc}</td>
                        <td className="num">{fmt(p.contract)}</td>
                        <td className="num text-muted">{fmt(p.totalCost)}</td>
                        <td className="num">
                          <span className={`badge ${badgeClass} inline-block text-center`} style={{ minWidth: 48 }}>
                            {p.margin < 0 ? `${p.margin}%` : `${p.margin}%`}
                          </span>
                        </td>
                        <td>
                          <div className="flex-col-gap-3">
                            {diagnosis.map((d, i) => (
                              <div key={i} className="diagnosis-item">
                                <span style={{ color: p.margin < 15 ? "var(--red)" : "var(--amber)", flexShrink: 0 }}>{d.icon}</span>
                                <span>{d.text}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <DollarSign size={11} />
              EBC target: 30%+ margin. Labor is the primary profit driver (100% markup). Enter costs per project to track actuals.
            </div>
          </div>
        );
      })()}

      {/* ── Section 4: Charts — only if data exists, compact ── */}
      {dashCfg.showCharts && gcWinRates.length > 0 && (
        <div className="flex gap-16 mt-8 flex-wrap">
          <div className="card" style={{ flex: "1 1 480px", minWidth: 320 }}>
            <div className="card-header"><div className="card-title font-head fs-13">{t("Win Rate by GC")}</div></div>
            <ResponsiveContainer width="100%" height={Math.max(140, gcWinRates.length * 28 + 32)}>
              <BarChart data={gcWinRates.map(g => ({ name: g.gc.length > 18 ? g.gc.slice(0, 16) + "..." : g.gc, Awarded: g.awarded, Lost: g.lost, Pending: g.pending }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
                <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", color: "var(--text)" }} />
                <Bar dataKey="Awarded" stackId="a" fill="var(--green)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Lost" stackId="a" fill="var(--red)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill="var(--amber)" radius={[0, 4, 4, 0]} />
                <Legend wrapperStyle={{ fontSize: "var(--text-tab)" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(cashFlow.current + cashFlow.net30 + cashFlow.net60 + cashFlow.net90) > 0 && (
            <div className="card" style={{ flex: "1 1 260px", minWidth: 240 }}>
              <div className="card-header"><div className="card-title font-head fs-13">{t("Receivables Aging")}</div></div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={[
                  { name: "Current", value: cashFlow.current },
                  { name: "31-60d", value: cashFlow.net30 },
                  { name: "61-90d", value: cashFlow.net60 },
                  { name: "90+d", value: cashFlow.net90 },
                ]} margin={{ left: 0, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
                  <YAxis tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} tickFormatter={v => fmtK(v)} />
                  <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", color: "var(--text)" }} formatter={v => fmt(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: "Current", color: "var(--green)" },
                      { name: "31-60d", color: "var(--amber)" },
                      { name: "61-90d", color: "var(--red)" },
                      { name: "90+d", color: "var(--red)" },
                    ].map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Section 5: Follow-ups & Recent Activity side by side ── */}
      <div className="flex gap-16 mt-16 flex-wrap">
        {dashActions.followUps.length > 0 && (
          <div className="card chart-card-half">
            <div className="text-sm font-semi mb-8">Follow-ups</div>
            {dashActions.followUps.slice(0, 5).map((c, i) => (
              <div key={i} className="flex gap-8 log-item--clickable"
                onClick={() => { handleTabClick("contacts"); setTimeout(() => setContactSearch(c.contact || ""), 0); }}>
                <div className="log-accent-bar bg-amber" />
                <div className="flex-1">
                  <div className="flex-between">
                    <span className="text-sm font-semi">{c.contact}</span>
                    <span className="text-xs text-dim">{c.time}</span>
                  </div>
                  <div className="text-xs text-muted">{c.next}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="card chart-card-half">
          <div className="text-sm font-semi mb-8">Recent Activity</div>
          {callLog.slice(0, 5).map(c => (
            <div key={c.id} className="flex gap-8 log-item--clickable"
              onClick={() => { handleTabClick("contacts"); setTimeout(() => setContactSearch(c.contact || ""), 0); }}>
              <div className="log-accent-bar bg-blue" />
              <div className="flex-1">
                <div className="flex-between">
                  <span className="text-sm font-semi">{c.contact}</span>
                  <span className="text-xs text-dim">{c.time}</span>
                </div>
                <div className="text-xs text-muted">{c.note}</div>
              </div>
            </div>
          ))}
          {callLog.length === 0 && <div className="text-sm text-muted p-8">No recent activity</div>}
        </div>
      </div>

      {/* ── Compact Weekly Digest ── */}
      {dashCfg.showDigest && <div className="card mt-16" style={{ padding: "var(--space-3) var(--space-4)" }}>
        <div className="flex-between mb-8">
          <div className="text-sm font-semi">Weekly Digest</div>
          <button className="btn btn-ghost btn-sm fs-11" onClick={runWeeklyDigest} disabled={digestLoading} >
            {digestLoading ? "Analyzing..." : "Generate"}
          </button>
        </div>
        {!digestResult && !digestLoading && (
          <div className="text-xs text-muted">AI-powered portfolio summary — health, alerts, and recommendations.</div>
        )}
        {digestLoading && <div className="text-xs text-muted text-center p-8">Analyzing {projects.length} projects...</div>}
        {digestResult && (
          <div>
            <div className="text-sm" style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", marginBottom: "var(--space-2)" }}>{digestResult.healthSummary}</div>
            {digestResult.alerts?.length > 0 && digestResult.alerts.slice(0, 3).map((a, i) => (
              <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", borderLeft: `3px solid ${a.priority === "high" ? "var(--red)" : "var(--amber)"}`, background: "var(--card)", fontSize: "var(--text-label)", cursor: a.project ? "pointer" : undefined }}
                onClick={a.project ? () => { const p = projects.find(p => p.name?.toLowerCase().includes(a.project.toLowerCase())); if (p) setModal({ type: "editProject", data: p }); } : undefined}>
                <span className="font-semi">{a.project}</span> — <span className="text-muted">{a.message}</span>
              </div>
            ))}
            {digestResult.recommendations?.length > 0 && (
              <div className="mt-8">
                <div className="text-xs font-semi mb-4">Recommendations</div>
                {digestResult.recommendations.slice(0, 3).map((r, i) => (
                  <div key={i} className="text-xs py-3">
                    <span className={`badge ${r.urgency === "now" ? "badge-red" : "badge-amber"} fs-10`}>{r.urgency}</span>{" "}
                    {r.action}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>}

      {/* Role-tailored quick actions */}
      {dashCfg.showQuickActions && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => setModal({ type: "editBid", data: null })}>{t("+ Add Bid")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("projects")}>{t("View Projects")}</button>
        </div>
      )}
      {userRole === "office_admin" && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => handleTabClick("documents")}>{t("Documents")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("calendar")}>{t("Calendar")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("contacts")}>{t("Contacts")}</button>
        </div>
      )}
      {userRole === "accounting" && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => handleTabClick("financials")}>{t("Financials")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("timeclock")}>{t("Time Clock")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("reports")}>{t("Reports")}</button>
        </div>
      )}
      {userRole === "safety" && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => handleTabClick("jsa")}>{t("JSA Forms")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("safety")}>{t("Safety")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("reports")}>{t("Reports")}</button>
        </div>
      )}
      {userRole === "foreman" && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => handleTabClick("projects")}>{t("Projects")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("schedule")}>{t("Schedule")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("materials")}>{t("Materials")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("jsa")}>{t("JSA")}</button>
        </div>
      )}
      {userRole === "driver" && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => handleTabClick("deliveries")}>{t("Deliveries")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("materials")}>{t("Materials")}</button>
        </div>
      )}
      {userRole === "employee" && (
        <div className="flex gap-8 mt-16">
          <button className="btn btn-primary" onClick={() => handleTabClick("timeclock")}>{t("Time Clock")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("schedule")}>{t("Schedule")}</button>
          <button className="btn btn-ghost" onClick={() => handleTabClick("materials")}>{t("Materials")}</button>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: BIDS
  // ═══════════════════════════════════════════════════════════════
  const renderBids = () => (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">{t("Bid Manager")}</div>
          <div className="section-sub">
            {filteredBids.length} {filteredBids.length !== 1 ? t("bids") : t("bid")}
            {(() => { const active = bids.filter(b => BID_ACTIVE_STATUSES.includes(b.status)).length; const dueSoon = bids.filter(b => { const d = b.due ? new Date(b.due) : null; return d && !isNaN(d) && d >= new Date() && d <= new Date(Date.now() + 7 * 86400000) && BID_ACTIVE_STATUSES.includes(b.status); }).length; return <>{active > 0 && <span className="ml-8">{active} active</span>}{dueSoon > 0 && <span className="text-red ml-8 font-semi">{dueSoon} due this week</span>}</>; })()}
          </div>
        </div>
        <div className="flex gap-8">
          <div className="search-wrap">
            <Search className="w-4 h-4 search-icon" />
            <input
              className="search-input"
              placeholder={t("Search bids...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" onClick={() => {
            const headers = ["ID","Name","GC","Value","Due","Status","Sector","Risk","Contact","Estimator","Scope","Exclusions","Notes"];
            const rows = filteredBids.map(b => [
              b.id, `"${(b.name||'').replace(/"/g,'""')}"`, `"${(b.gc||'').replace(/"/g,'""')}"`,
              b.value||0, b.due||'', STATUS_LABEL[b.status]||b.status||'', b.sector||b.phase||'', b.risk||'',
              `"${(b.contact||'').replace(/"/g,'""')}"`, `"${(b.estimator||'').replace(/"/g,'""')}"`,
              `"${(b.scope||[]).join('; ')}"`, `"${(b.exclusions||'').replace(/"/g,'""')}"`,
              `"${(b.notes||'').replace(/"/g,'""')}"`
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_bids.csv'; a.click();
            URL.revokeObjectURL(url);
            show("CSV exported");
          }}>{t("Export CSV")}</button>
          <button className="btn btn-ghost" onClick={() => setShowEmailScanner(!showEmailScanner)}>
            {showEmailScanner ? t("Close Scanner") : t("Scan Email")}
          </button>
          <FeatureGuide guideKey="bids" />
          <button className="btn btn-primary" onClick={() => setModal({ type: "editBid", data: null })}>{t("+ Add Bid")}</button>
        </div>
      </div>

      {/* Email-to-Bid Scanner */}
      {showEmailScanner && (
        <div className="card p-16 mb-16">
          <div className="flex-between mb-8">
            <div>
              <div className="text-sm font-semi">{t("Email-to-Bid Scanner")}</div>
              <div className="text-xs text-muted mt-2">Paste one or more bid invite emails. AI extracts project details, scope, contacts, and plan links. Review and edit before importing.</div>
            </div>
          </div>
          <textarea className="form-input" rows={8} placeholder={"Paste email content here...\n\nTip: You can paste multiple emails at once \u2014 separate them with a blank line or just paste everything together. The scanner will detect each bid separately.\n\nWorks with: ITB emails, BuildingConnected invites, bid updates, addenda notices, plan availability emails, pre-bid meeting notices..."}
            value={emailText} onChange={e => setEmailText(e.target.value)}
            style={{ resize: "vertical", fontFamily: "inherit", fontSize: "var(--text-label)", marginBottom: "var(--space-2)", minHeight: 120 }} />
          <div className="flex-between">
            <div className="flex gap-8 flex-center">
              <span className="text-xs text-dim">{emailText.length} chars</span>
              {emailText.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => { setEmailText(""); setEmailResults(null); setEditingEmailBid(null); }}>Clear</button>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={runEmailScan} disabled={emailLoading || !emailText.trim()}>
              {emailLoading ? t("Scanning...") : t("Extract Bids")}
            </button>
          </div>

          {/* Editing a single bid inline */}
          {editingEmailBid !== null && emailResults && emailResults[editingEmailBid] && (() => {
            const idx = editingEmailBid;
            const bid = emailResults[idx];
            const updateField = (field, val) => {
              setEmailResults(prev => prev.map((b, i) => i === idx ? { ...b, [field]: val } : b));
            };
            const SCOPE_OPTIONS = ["Metal Framing", "GWB", "ACT", "Insulation", "Lead-Lined", "L5 Finish", "ICRA", "Deflection Track", "Shaft Wall", "FRP", "Cement Board", "Blocking", "Demo"];
            return (
              <div style={{ marginTop: "var(--space-3)", padding: "var(--space-4)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "2px solid var(--accent)" }}>
                <div className="flex-between mb-8">
                  <span className="font-semi text-sm">Edit Extracted Bid</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingEmailBid(null)}>Done Editing</button>
                </div>
                <div className="grid-2col">
                  <div>
                    <label className="text-xs text-muted">Project Name *</label>
                    <input className="form-input" value={bid.name || ""} onChange={e => updateField("name", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">GC Name *</label>
                    <input className="form-input" value={bid.gc || ""} onChange={e => updateField("gc", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Bid Due Date</label>
                    <input className="form-input" value={bid.due || ""} onChange={e => updateField("due", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Estimated Value ($)</label>
                    <input className="form-input" type="number" value={bid.value || ""} onChange={e => updateField("value", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Project Address</label>
                    <input className="form-input" value={bid.address || ""} onChange={e => updateField("address", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Sector</label>
                    <select className="form-select" value={bid.sector || ""} onChange={e => updateField("sector", e.target.value)}>
                      <option value="">--</option>
                      {["Medical", "Commercial", "Education", "Hospitality", "Government", "Religious", "Entertainment", "Industrial", "Residential"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">Contact Name</label>
                    <input className="form-input" value={bid.contactName || ""} onChange={e => updateField("contactName", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Contact Email</label>
                    <input className="form-input" value={bid.contactEmail || ""} onChange={e => updateField("contactEmail", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Contact Phone</label>
                    <input className="form-input" value={bid.contactPhone || ""} onChange={e => updateField("contactPhone", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Pre-Bid Date</label>
                    <input className="form-input" value={bid.prebidDate || ""} onChange={e => updateField("prebidDate", e.target.value)} />
                  </div>
                </div>
                <div className="mt-8">
                  <label className="text-xs text-muted">Scope Tags</label>
                  <div className="flex gap-4 flex-wrap mt-4">
                    {SCOPE_OPTIONS.map(tag => (
                      <button key={tag} className={`btn btn-sm ${(bid.scope || []).includes(tag) ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => {
                          const arr = bid.scope || [];
                          updateField("scope", arr.includes(tag) ? arr.filter(s => s !== tag) : [...arr, tag]);
                        }}>{tag}</button>
                    ))}
                  </div>
                </div>
                {bid.planLinks && bid.planLinks.length > 0 && (
                  <div className="mt-8">
                    <label className="text-xs text-muted">Plan / Spec Links</label>
                    {bid.planLinks.map((link, li) => (
                      <div key={li} className="text-xs mt-2 word-break-all">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-amber">{link}</a>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-8">
                  <label className="text-xs text-muted">Notes</label>
                  <textarea className="form-input" rows={3} value={bid.notes || ""} onChange={e => updateField("notes", e.target.value)}
                    className="form-textarea-flex" />
                </div>
                <div className="flex gap-8 mt-8 justify-end">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingEmailBid(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { importEmailBid(bid); setEditingEmailBid(null); }}>Create Bid</button>
                </div>
              </div>
            );
          })()}

          {/* Results list */}
          {editingEmailBid === null && emailResults && emailResults.length > 0 && (
            <div className="mt-12">
              <div className="flex-between mb-8">
                <div className="text-sm font-semi">Found {emailResults.length} bid{emailResults.length > 1 ? "s" : ""}</div>
                {emailResults.length > 1 && (
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    emailResults.forEach(bid => importEmailBid(bid));
                    setEmailResults(null);
                    setEmailText("");
                  }}>Import All ({emailResults.length})</button>
                )}
              </div>
              {emailResults.map((bid, i) => (
                <div key={i} style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="flex-between mb-4">
                    <span className="font-semi text-sm">{bid.name || "Unnamed Project"}</span>
                    <div className="flex gap-4">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingEmailBid(i)}>Edit</button>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        importEmailBid(bid);
                        setEmailResults(prev => prev.filter((_, j) => j !== i));
                      }}>Import</button>
                    </div>
                  </div>
                  <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
                    {bid.gc && <span>GC: <strong>{bid.gc}</strong> &middot; </span>}
                    {bid.value && <span>{fmt(bid.value)} &middot; </span>}
                    {bid.due && <span>Due: <strong>{bid.due}</strong> &middot; </span>}
                    {bid.sector && <span>{bid.sector} &middot; </span>}
                    {bid.status && <span className={`badge ${STATUS_BADGE[bid.status] || "badge-muted"}`}>{STATUS_LABEL[bid.status] || bid.status}</span>}
                  </div>
                  {bid.address && <div className="text-xs text-dim mt-4">Address: {bid.address}</div>}
                  {(bid.scope || []).length > 0 && (
                    <div className="flex gap-4 flex-wrap mt-4">
                      {bid.scope.map(tag => <span key={tag} className="badge badge-blue fs-10">{tag}</span>)}
                    </div>
                  )}
                  {(bid.contactName || bid.contactEmail) && (
                    <div className="text-xs text-dim mt-4">
                      Contact: {bid.contactName || ""}{bid.contactEmail ? ` (${bid.contactEmail})` : ""}{bid.contactPhone ? ` ${bid.contactPhone}` : ""}
                    </div>
                  )}
                  {bid.prebidDate && <div className="text-xs text-dim mt-4">Pre-Bid: {bid.prebidDate}{bid.prebidLocation ? ` at ${bid.prebidLocation}` : ""}</div>}
                  {bid.planLinks && bid.planLinks.length > 0 && (
                    <div className="text-xs text-dim mt-4">
                      Plans: {bid.planLinks.map((link, li) => (
                        <a key={li} href={link} target="_blank" rel="noopener noreferrer" className="text-amber word-break-all" style={{ marginRight: "var(--space-2)" }}>{link.length > 60 ? link.slice(0, 60) + "..." : link}</a>
                      ))}
                    </div>
                  )}
                  {bid.notes && <div className="text-xs text-dim mt-4 text-italic">{bid.notes}</div>}
                </div>
              ))}
            </div>
          )}
          {emailResults && emailResults.length === 0 && (
            <div className="text-sm text-muted" style={{ padding: "var(--space-3)", textAlign: "center" }}>No bid information found. Try pasting the full email including subject line and body.</div>
          )}
        </div>
      )}

      <div className="flex-between mb-16">
        <div className="flex gap-4 flex-wrap">
          {BID_FILTERS.map(f => (
            <button
              key={f}
              className={`btn btn-sm ${bidFilter === f ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setBidFilter(f)}
            >
              {t(f)}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button className={`btn btn-sm ${bidViewMode === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBidViewMode("list")} className="flex-center-gap-4"><List className="w-4 h-4" /> List</button>
          <button className={`btn btn-sm ${bidViewMode === "pipeline" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBidViewMode("pipeline")} className="flex-center-gap-4"><Columns className="w-4 h-4" /> Pipeline</button>
          <button className={`btn btn-sm ${bidViewMode === "calendar" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBidViewMode("calendar")} className="flex-center-gap-4"><Calendar className="w-4 h-4" /> Calendar</button>
        </div>
      </div>

      {selectedBids.size > 0 && (
        <div className="card mt-16" style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span className="text-sm font-semi">{selectedBids.size} {t("selected")}</span>
          <select className="form-select" style={{ width: "auto", fontSize: "var(--text-label)" }} defaultValue="" onChange={e => {
            if (!e.target.value) return;
            const newStatus = e.target.value;
            if (newStatus === "awarded") {
              // Auto-convert each selected bid to a project
              const bidsToAward = bids.filter(b => selectedBids.has(b.id) && b.status !== "awarded");
              setBids(prev => prev.map(b => selectedBids.has(b.id) ? { ...b, status: "awarded", convertedToProject: true } : b));
              let created = 0;
              bidsToAward.forEach(b => {
                if (!projects.some(p => p.bidId === b.id)) {
                  const newProj = {
                    id: nextId(), bidId: b.id, name: b.name, gc: b.gc,
                    contract: b.value || 0, billed: 0, progress: 0,
                    phase: b.phase || b.sector || "", start: b.due || "", end: "",
                    pm: b.estimator || "", laborBudget: 0, laborHours: 0, laborCost: 0, materialCost: 0,
                    address: b.address || "", attachments: b.attachments || [],
                    notes: b.notes || "", scope: b.scope || [], sector: b.sector || "", contact: b.contact || "",
                  };
                  setProjects(prev => [...prev, newProj]);
                  created++;
                }
              });
              show(`${selectedBids.size} bids awarded!${created > 0 ? ` ${created} project${created > 1 ? "s" : ""} created.` : ""}`);
            } else {
              setBids(prev => prev.map(b => selectedBids.has(b.id) ? { ...b, status: newStatus } : b));
              show(`${selectedBids.size} bids → ${STATUS_LABEL[newStatus] || newStatus}`);
            }
            setSelectedBids(new Set());
            e.target.value = "";
          }}>
            <option value="">{t("Set status...")}</option>
            <option value="invite_received">Invite Received</option>
            <option value="reviewing">Reviewing Docs</option>
            <option value="assigned">Assigned</option>
            <option value="estimating">Estimating</option>
            <option value="takeoff">Takeoff</option>
            <option value="awaiting_quotes">Awaiting Quotes</option>
            <option value="pricing">Pricing</option>
            <option value="draft_ready">Proposal Ready</option>
            <option value="submitted">Submitted</option>
            <option value="awarded">Awarded</option>
            <option value="lost">Lost</option>
            <option value="no_bid">No Bid</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBids(new Set())}>{t("Clear")}</button>
          <button className="btn btn-ghost btn-sm text-red" onClick={() => {
            if (!confirm(`Delete ${selectedBids.size} bids?`)) return;
            setBids(prev => prev.filter(b => !selectedBids.has(b.id)));
            setSelectedBids(new Set());
            show("Bids deleted");
          }}>{t("Delete Selected")}</button>
        </div>
      )}

      {/* ═══ PIPELINE KANBAN VIEW ═══ */}
      {bidViewMode === "pipeline" && (
        <div className="overflow-x-auto pb-16">
          <div className="flex gap-12" style={{ minWidth: "fit-content" }}>
            {[
              { key: "estimating", label: "Estimating", statuses: ["invite_received", "reviewing", "assigned", "takeoff", "awaiting_quotes", "pricing", "draft_ready", "estimating"] },
              { key: "submitted", label: "Submitted", statuses: ["submitted", "clarifications", "negotiating"] },
              { key: "awarded", label: "Awarded", statuses: ["awarded"] },
              { key: "lost", label: "Lost / No Bid", statuses: ["lost", "no_bid"] },
            ].map(col => {
              const colBids = bids.filter(b => col.statuses.includes(b.status));
              const colValue = colBids.reduce((s, b) => s + (b.value || 0), 0);
              return (
                <div key={col.key} className="pipeline-col">
                  <div className="flex-between mb-8">
                    <span className="text-sm font-semi">{col.label}</span>
                    <span className="text-xs text-muted">{colBids.length} · {fmtK(colValue)}</span>
                  </div>
                  {colBids.length === 0 ? (
                    <div className="text-xs text-dim p-16 text-center">Empty</div>
                  ) : colBids.map(b => {
                    const linkedProject = b.convertedToProject ? projects.find(p => p.bidId === b.id) : null;
                    return (
                    <div key={b.id} className="bid-card" style={{ marginBottom: "var(--space-2)", padding: "var(--space-3) var(--space-3)", cursor: "pointer", opacity: b.convertedToProject ? 0.7 : 1 }}
                      onClick={() => b.convertedToProject && linkedProject ? setModal({ type: "editProject", data: linkedProject }) : setModal({ type: "editBid", data: b })}>
                      <div className="text-xs font-semi lh-13 mb-4">{b.name}</div>
                      <div className="flex-between">
                        <span className="text-xs text-muted">{b.gc}</span>
                        <span className="text-xs font-mono text-amber">{b.value ? fmt(b.value) : "—"}</span>
                      </div>
                      <div className="flex gap-4 mt-4">
                        <span className={`badge ${STATUS_BADGE[b.status] || "badge-muted"} fs-9`}>{STATUS_LABEL[b.status] || b.status}</span>
                        {b.contact && <span className="text-xs text-dim">{b.contact}</span>}
                      </div>
                      {b.estimatingBy && !b.convertedToProject && (
                        <div className="text-xs mt-4 text-blue font-semi">
                          {b.estimatingBy.split(" ")[0]}
                        </div>
                      )}
                      {b.convertedToProject && (
                        <div className="text-xs mt-4 text-green text-italic">
                          → Moved to Projects
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ BID CALENDAR VIEW ═══ */}
      {bidViewMode === "calendar" && (() => {
        const { year: calY, month: calM } = bidCalMonth;
        const firstDay = new Date(calY, calM, 1);
        const lastDay = new Date(calY, calM + 1, 0);
        const startDow = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const todayD = new Date(); todayD.setHours(0,0,0,0);
        const todayStr = todayD.toISOString().slice(0, 10);
        const monthLabel = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const evMap = {};
        const addEv = (ds, ev) => { if (!evMap[ds]) evMap[ds] = []; evMap[ds].push(ev); };
        for (const b of bids) {
          if (!b.due) continue;
          const d = new Date(b.due); if (isNaN(d)) continue;
          const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          const sc = b.status === "awarded" ? "status-awarded" : b.status === "lost" ? "status-lost" : b.status === "no_bid" ? "status-nobid" : "bid-due";
          addEv(ds, { id: "bid-" + b.id, type: "Bid Due", label: b.name, gc: b.gc, value: b.value, status: b.status, statusClass: sc, bid: b });
        }
        for (const ev of bidCalEvents) {
          if (!ev.date) continue;
          const tc = ev.type === "Site Walk" ? "site-walk" : ev.type === "Pre-Bid Meeting" ? "pre-bid" : ev.type === "Plan Review" ? "plan-review" : ev.type === "Follow Up" ? "follow-up" : "bid-due";
          addEv(ev.date, { ...ev, statusClass: tc, label: ev.label || ev.type });
        }
        const cells = [];
        const prevMo = new Date(calY, calM, 0);
        for (let i = startDow - 1; i >= 0; i--) {
          const dd = prevMo.getDate() - i;
          const ds = `${prevMo.getFullYear()}-${String(prevMo.getMonth()+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
          cells.push({ day: dd, dateStr: ds, outside: true });
        }
        for (let dd = 1; dd <= daysInMonth; dd++) {
          const ds = `${calY}-${String(calM+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
          cells.push({ day: dd, dateStr: ds, outside: false, isToday: ds === todayStr });
        }
        const rem = 7 - (cells.length % 7);
        if (rem < 7) for (let dd = 1; dd <= rem; dd++) {
          const nm = new Date(calY, calM + 1, dd);
          const ds = `${nm.getFullYear()}-${String(nm.getMonth()+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
          cells.push({ day: dd, dateStr: ds, outside: true });
        }
        const upcoming = [];
        for (let i = 0; i < 7; i++) {
          const dd = new Date(todayD); dd.setDate(dd.getDate() + i);
          const ds = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
          if (evMap[ds]) upcoming.push(...evMap[ds].map(e => ({ ...e, dateStr: ds })));
        }
        const selectedEvts = bidCalSelected && evMap[bidCalSelected] ? evMap[bidCalSelected] : [];
        const BC_TYPES = ["Site Walk", "Pre-Bid Meeting", "Plan Review", "Follow Up"];
        const dotClr = (sc) => sc === "status-awarded" ? "var(--green)" : sc === "status-lost" ? "var(--red)" : sc === "status-nobid" ? "var(--text3)" : sc === "site-walk" ? "var(--blue)" : sc === "pre-bid" ? "var(--green)" : sc === "plan-review" ? "var(--purple, #8b5cf6)" : sc === "follow-up" ? "var(--red)" : "var(--amber)";
        return (
          <div className="bidcal-wrap">
            <div className="bidcal-main">
              <div className="bidcal-toolbar">
                <div className="bidcal-nav">
                  <button onClick={() => setBidCalMonth(p => { let m2 = p.month - 1, y2 = p.year; if (m2 < 0) { m2 = 11; y2--; } return { year: y2, month: m2 }; })}>&#9664;</button>
                  <span className="bidcal-month-title">{monthLabel}</span>
                  <button onClick={() => setBidCalMonth(p => { let m2 = p.month + 1, y2 = p.year; if (m2 > 11) { m2 = 0; y2++; } return { year: y2, month: m2 }; })}>&#9654;</button>
                </div>
                <button className="bidcal-today-btn" onClick={() => { const tn = new Date(); setBidCalMonth({ year: tn.getFullYear(), month: tn.getMonth() }); setBidCalSelected(todayStr); }}>Today</button>
                <button className="btn btn-sm btn-ghost ml-auto" onClick={() => { setBidCalAddOpen(true); setBidCalEventForm(f => ({ ...f, date: bidCalSelected || todayStr })); }}>+ Add Event</button>
              </div>
              <div className="bidcal-grid">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(dw => <div key={dw} className="bidcal-hdr">{dw}</div>)}
                {cells.map((c, ci) => {
                  const dayEvts = evMap[c.dateStr] || [];
                  return (
                    <div key={ci} className={`bidcal-cell${c.outside ? " outside" : ""}${c.isToday ? " today" : ""}${bidCalSelected === c.dateStr ? " selected" : ""}`} onClick={() => setBidCalSelected(c.dateStr)}>
                      <div className="bidcal-day">
                        {c.day}
                        {dayEvts.length > 0 && dayEvts.slice(0, 3).map((ev, j) => <span key={j} className="bidcal-dot" style={{ background: dotClr(ev.statusClass) }} />)}
                      </div>
                      {dayEvts.slice(0, 3).map((ev, j) => (
                        <div key={j} className={`bidcal-evt ${ev.statusClass || "bid-due"}`}
                          onClick={e => { e.stopPropagation(); if (ev.bid) setModal({ type: "editBid", data: ev.bid }); }}
                          title={ev.label + (ev.gc ? " \u2014 " + ev.gc : "") + (ev.value ? " \u2014 " + fmt(ev.value) : "")}>
                          {ev.type !== "Bid Due" && <span className="font-semi">{ev.type}: </span>}{ev.label}
                        </div>
                      ))}
                      {dayEvts.length > 3 && <div className="bidcal-more">+{dayEvts.length - 3} more</div>}
                    </div>
                  );
                })}
              </div>
              {bidCalSelected && selectedEvts.length > 0 && (
                <div className="bidcal-day-detail">
                  <div className="bidcal-day-detail-title">
                    {new Date(bidCalSelected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    <span className="text-xs text-muted ml-8">{selectedEvts.length} event{selectedEvts.length !== 1 ? "s" : ""}</span>
                  </div>
                  {selectedEvts.map((ev, si) => (
                    <div key={si} className="bidcal-detail-item" onClick={() => { if (ev.bid) setModal({ type: "editBid", data: ev.bid }); }}>
                      <div className="flex-between mb-4">
                        <span className={`badge ${ev.status === "awarded" ? "badge-green" : ev.status === "lost" ? "badge-red" : ev.status === "no_bid" ? "badge-muted" : ev.type === "Site Walk" ? "badge-blue" : ev.type === "Pre-Bid Meeting" ? "badge-green" : ev.type === "Plan Review" ? "badge-blue" : ev.type === "Follow Up" ? "badge-red" : "badge-amber"} fs-10`}>{ev.type}</span>
                        {ev.value > 0 && <span className="text-xs font-mono text-amber">{fmt(ev.value)}</span>}
                      </div>
                      <div className="text-sm font-semi">{ev.label}</div>
                      {ev.gc && <div className="text-xs text-muted">{ev.gc}</div>}
                      {ev.time && <div className="text-xs text-dim">Time: {ev.time}</div>}
                      {ev.location && <div className="text-xs text-dim">Location: {ev.location}</div>}
                      {ev.notes && ev.type !== "Bid Due" && <div className="text-xs text-dim mt-4">{ev.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
              {bidCalSelected && selectedEvts.length === 0 && (
                <div className="bidcal-day-detail text-center p-24">
                  <div className="text-sm text-muted">No events on {new Date(bidCalSelected + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</div>
                  <button className="btn btn-ghost btn-sm mt-8" onClick={() => { setBidCalAddOpen(true); setBidCalEventForm(f => ({ ...f, date: bidCalSelected })); }}>+ Add Event</button>
                </div>
              )}
            </div>
            <div className="bidcal-sidebar">
              <div className="bidcal-sidebar-card">
                <div className="bidcal-sidebar-title">Upcoming 7 Days</div>
                {upcoming.length === 0 ? (
                  <div className="text-xs text-muted" style={{ padding: "var(--space-2)", textAlign: "center" }}>No upcoming deadlines</div>
                ) : upcoming.slice(0, 10).map((ev, ui) => (
                  <div key={ui} className="bidcal-upcoming-item" onClick={() => { setBidCalSelected(ev.dateStr); if (ev.bid) setModal({ type: "editBid", data: ev.bid }); }}>
                    <div className="flex-between">
                      <span className={`badge ${ev.status === "awarded" ? "badge-green" : ev.status === "lost" ? "badge-red" : ev.type === "Site Walk" ? "badge-blue" : ev.type === "Pre-Bid Meeting" ? "badge-green" : "badge-amber"} fs-9`}>{ev.type}</span>
                      <span className="text-xs text-dim">{new Date(ev.dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="text-xs font-semi mt-4">{ev.label}</div>
                    {ev.gc && <div className="text-xs text-muted">{ev.gc}</div>}
                    {ev.value > 0 && <div className="text-xs font-mono text-amber">{fmt(ev.value)}</div>}
                  </div>
                ))}
                {upcoming.length > 10 && <div className="text-xs text-dim text-center" style={{ padding: "var(--space-1)" }}>+{upcoming.length - 10} more</div>}
              </div>
              <div className="bidcal-sidebar-card">
                <div className="bidcal-sidebar-title">Legend</div>
                <div className="flex-col-gap-6">
                  {[
                    { label: "Bid Due (Active/Submitted)", color: "var(--amber)" },
                    { label: "Awarded", color: "var(--green)" },
                    { label: "Lost", color: "var(--red)" },
                    { label: "No Bid", color: "var(--text3)" },
                    { label: "Site Walk", color: "var(--blue)" },
                    { label: "Pre-Bid Meeting", color: "var(--green)" },
                    { label: "Plan Review", color: "var(--purple)" },
                    { label: "Follow Up", color: "var(--red)" },
                  ].map((lg, li) => (
                    <div key={li} className="flex gap-8 flex-center">
                      <span className="bidcal-dot" style={{ background: lg.color }} />
                      <span className="text-xs text-muted">{lg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bidcal-sidebar-card">
                <div className="bidcal-sidebar-title">This Month</div>
                {(() => {
                  const moBids = bids.filter(b => { if (!b.due) return false; const d = new Date(b.due); return !isNaN(d) && d.getFullYear() === calY && d.getMonth() === calM; });
                  const actCt = moBids.filter(b => BID_ACTIVE_STATUSES.includes(b.status)).length;
                  const awdCt = moBids.filter(b => b.status === "awarded").length;
                  const totVal = moBids.reduce((s, b) => s + (b.value || 0), 0);
                  return (
                    <div className="flex-col-gap-6">
                      <div className="flex-between"><span className="text-xs text-muted">Total Bids</span><span className="text-xs font-semi">{moBids.length}</span></div>
                      <div className="flex-between"><span className="text-xs text-muted">Active</span><span className="text-xs font-semi text-amber">{actCt}</span></div>
                      <div className="flex-between"><span className="text-xs text-muted">Awarded</span><span className="text-xs font-semi text-green">{awdCt}</span></div>
                      <div className="flex-between"><span className="text-xs text-muted">Total Value</span><span className="text-xs font-mono text-amber">{fmtK(totVal)}</span></div>
                    </div>
                  );
                })()}
              </div>
            </div>
            {bidCalAddOpen && (
              <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setBidCalAddOpen(false); }}>
                <div className="modal-content modal-sm">
                  <div className="modal-header flex-between">
                    <div className="modal-title">Add Bid Calendar Event</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setBidCalAddOpen(false)}>Close</button>
                  </div>
                  <div className="p-16">
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Event Type</label>
                        <select className="form-select" value={bidCalEventForm.type} onChange={e => setBidCalEventForm(f => ({ ...f, type: e.target.value }))}>
                          {BC_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input type="date" className="form-input" value={bidCalEventForm.date} onChange={e => setBidCalEventForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Time</label>
                        <input type="time" className="form-input" value={bidCalEventForm.time} onChange={e => setBidCalEventForm(f => ({ ...f, time: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Related Bid</label>
                        <select className="form-select" value={bidCalEventForm.bidId} onChange={e => setBidCalEventForm(f => ({ ...f, bidId: e.target.value }))}>
                          <option value="">None</option>
                          {bids.filter(b => BID_ACTIVE_STATUSES.includes(b.status)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group full">
                        <label className="form-label">Location</label>
                        <input className="form-input" placeholder="Site address..." value={bidCalEventForm.location} onChange={e => setBidCalEventForm(f => ({ ...f, location: e.target.value }))} />
                      </div>
                      <div className="form-group full">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" rows={3} placeholder="Additional details..." value={bidCalEventForm.notes} onChange={e => setBidCalEventForm(f => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex-between mt-16">
                      <button className="btn btn-ghost" onClick={() => setBidCalAddOpen(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => {
                        const relBid = bidCalEventForm.bidId ? bids.find(b => String(b.id) === String(bidCalEventForm.bidId)) : null;
                        const newEv = {
                          id: nextId(), type: bidCalEventForm.type, date: bidCalEventForm.date,
                          time: bidCalEventForm.time, location: bidCalEventForm.location, notes: bidCalEventForm.notes,
                          label: relBid ? relBid.name : bidCalEventForm.type, gc: relBid ? relBid.gc : "", bidId: bidCalEventForm.bidId || null,
                        };
                        setBidCalEvents(prev => [...prev, newEv]);
                        setBidCalAddOpen(false);
                        setBidCalEventForm({ type: "Site Walk", time: "", location: "", notes: "", bidId: "", date: "" });
                        show(newEv.type + " added to calendar");
                      }}>Save Event</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ LIST VIEW ═══ */}
      {bidViewMode === "list" && filteredBids.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FolderOpen style={{ width: 40, height: 40 }} /></div>
          <div className="empty-text">{t("No bids match your filter")}</div>
        </div>
      ) : bidViewMode === "list" ? (
        <div className="bid-grid">
          {filteredBids.slice(0, bidPageSize).map(b => {
            // Due countdown
            const dueDate = b.due ? new Date(b.due) : null;
            const daysLeft = dueDate && !isNaN(dueDate) ? Math.ceil((dueDate - new Date()) / 86400000) : null;
            const dueColor = daysLeft !== null ? (daysLeft < 0 ? "var(--red)" : daysLeft <= 2 ? "var(--red)" : daysLeft <= 7 ? "var(--amber)" : "var(--text2)") : "var(--text2)";
            const dueLabel = daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `${daysLeft}d left`) : (b.due || "No date");
            // Readiness
            const hasPlans = (b.attachments || []).length > 0 || b.plansUploaded;
            const hasScope = (b.scope || []).length > 0;
            const hasEstimator = !!(b.estimator);
            const hasValue = b.value > 0;
            const readiness = [hasPlans, hasScope, hasEstimator, hasValue].filter(Boolean).length;
            const readinessMax = 4;
            return (
            <div key={b.id} className="bid-card" onClick={() => setModal({ type: "editBid", data: b })} className="pos-relative">
              {/* Top row: status + risk + due countdown */}
              <div className="flex-between mb-4">
                <span className="flex-center-gap-6">
                  <input type="checkbox" checked={selectedBids.has(b.id)} onClick={e => e.stopPropagation()} onChange={e => {
                    setSelectedBids(prev => { const n = new Set(prev); e.target.checked ? n.add(b.id) : n.delete(b.id); return n; });
                  }} className="cursor-pointer" />
                  <span className={`badge ${STATUS_BADGE[b.status] || "badge-muted"}`}>{STATUS_LABEL[b.status] || b.status}</span>
                  {b.risk === "High" && <span className="badge badge-red fs-10">High</span>}
                </span>
                <span style={{ fontSize: "var(--text-tab)", fontWeight: "var(--weight-semi)", color: dueColor }}>{dueLabel}</span>
              </div>
              {/* Name + GC */}
              <div className="card-title font-head fs-14 mb-2 lh-13">{b.name}</div>
              <div className="text-xs text-muted">{b.gc}</div>
              {b.convertedToProject && (
                <div className="text-xs mt-4 text-green text-italic fw-500">→ Moved to Projects</div>
              )}
              {b.estimatingBy && !b.convertedToProject && (
                <div className="text-xs mt-4 text-blue font-semi">
                  In progress: {b.estimatingBy.split(" ")[0]}{b.estimatingStarted ? ` · ${b.estimatingStarted}` : ""}
                </div>
              )}
              {/* Value + Owner row */}
              <div className="flex-between mt-6 items-end">
                {hasValue ? <span className="font-mono font-bold text-amber" style={{ fontSize: "var(--text-secondary)" }}>{fmt(b.value)}</span> : <span className="text-xs text-muted text-italic">No estimate</span>}
                {b.estimator && <span className="text-xs text-blue">{b.estimator}</span>}
              </div>
              {/* Readiness bar */}
              <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
                {Array.from({ length: readinessMax }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: "var(--radius-control)", background: i < readiness ? "var(--green)" : "var(--border)" }} />
                ))}
                <span className="text-xs text-muted" style={{ marginLeft: "var(--space-1)", fontSize: "var(--text-xs)" }}>{readiness}/{readinessMax}</span>
              </div>
              {/* Quick indicators row */}
              <div className="flex gap-6 mt-6 flex-wrap fs-10 text-muted">
                <span style={{ color: hasPlans ? "var(--green)" : "var(--text3)" }}>{hasPlans ? "Plans" : "No plans"}</span>
                {(b.addendaCount || 0) > 0 && <span className="text-amber">{b.addendaCount} addenda</span>}
                {hasScope && <span>{(b.scope || []).slice(0, 3).join(", ")}{(b.scope || []).length > 3 ? "..." : ""}</span>}
                {b.contact && <span>{b.contact}</span>}
              </div>
              {/* Action row */}
              <div className="flex gap-4 mt-6 flex-wrap">
                {b.status === "submitted" && (
                  <button className="btn btn-ghost btn-sm btn-xs"
                    onClick={(e) => { e.stopPropagation(); runFollowUp(b); }}
                    disabled={followUpLoading && followUpBid?.id === b.id}>
                    {followUpLoading && followUpBid?.id === b.id ? "Drafting..." : "Follow-Up"}
                  </button>
                )}
                {b.status === "awarded" && !projects.some(p => p.bidId === b.id) && (
                  <button className="btn btn-primary btn-sm btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newProj = {
                        id: nextId(), bidId: b.id, name: b.name, gc: b.gc,
                        contract: b.value || 0, billed: 0, progress: 0,
                        phase: b.phase || b.sector || "Pre-Construction", start: b.due || "", end: "",
                        pm: b.estimator || "", address: b.address || "",
                        scope: b.scope || [], sector: b.sector || "", contact: b.contact || "",
                        notes: b.notes || "", attachments: b.attachments || [],
                        laborBudget: 0, laborHours: 0, laborCost: 0, materialCost: 0,
                        assignedForeman: b.assignedForeman || null,
                      };
                      setProjects(prev => [...prev, newProj]);
                      setBids(prev => prev.map(x => x.id === b.id ? { ...x, convertedToProject: true } : x));
                      show(`Bid awarded! Project created: ${b.name}`);
                    }}>
                    Convert to Project
                  </button>
                )}
                {b.status === "awarded" && projects.some(p => p.bidId === b.id) && (() => {
                  const linkedProj = projects.find(p => p.bidId === b.id);
                  return (
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", color: "var(--green)" }}
                      onClick={(e) => { e.stopPropagation(); if (linkedProj) setModal({ type: "editProject", data: linkedProj }); }}>
                      → View Project
                    </button>
                  );
                })()}
              </div>
            </div>
            );
          })}
        </div>
      ) : null}
      {bidViewMode === "list" && filteredBids.length > bidPageSize && (
        <div className="flex-between mt-16 py-8">
          <span className="text-xs text-muted">Showing {Math.min(bidPageSize, filteredBids.length)} of {filteredBids.length}</span>
          <div className="flex gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setBidPageSize(s => s + 24)}>
              Load More ({filteredBids.length - bidPageSize})
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setBidPageSize(filteredBids.length)}>
              Show All
            </button>
          </div>
        </div>
      )}

      {/* Follow-Up Email Modal */}
      {followUpBid && followUpText && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => setFollowUpBid(null))}>
          <div className="modal-content modal-md">
            <div className="modal-header flex-between">
              <div className="modal-title">Follow-Up: {followUpBid.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setFollowUpBid(null)}>{t("Close")}</button>
            </div>
            <div className="p-16">
              <div className="text-xs text-muted mb-8">To: {followUpBid.contact || followUpBid.gc} · Re: {followUpBid.name}</div>
              <pre className="pre-wrap-content">
                {followUpText}
              </pre>
              <div className="flex gap-8 mt-12">
                <button className="btn btn-primary btn-sm" onClick={() => {
                  navigator.clipboard.writeText(followUpText);
                  show("Copied to clipboard", "ok");
                }}>{t("Copy Email")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => runFollowUp(followUpBid)}>{t("Regenerate")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Win Predictor Modal */}
      {winPredBid && winPredResult && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => setWinPredBid(null))}>
          <div className="modal-content modal-xl">
            <div className="modal-header flex-between">
              <div className="modal-title">Win Prediction: {winPredBid.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setWinPredBid(null)}>{t("Close")}</button>
            </div>
            <div className="p-16 max-h-500 overflow-auto">
              {/* Win Probability */}
              <div className="card p-16 mb-12 text-center">
                <div className="text-xs text-muted mb-4">{t("Win Probability")}</div>
                <div style={{ fontSize: "var(--text-hero)", fontWeight: "var(--weight-bold)", color: winPredResult.winProbability >= 70 ? "var(--green)" : winPredResult.winProbability >= 40 ? "var(--amber)" : "var(--red)" }}>
                  {winPredResult.winProbability}%
                </div>
                <span className={`badge ${winPredResult.confidence === "high" ? "badge-green" : winPredResult.confidence === "medium" ? "badge-amber" : "badge-red"}`}>
                  {winPredResult.confidence} confidence
                </span>
              </div>

              {/* GC History */}
              {winPredResult.gcHistory && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-8">GC Relationship: {winPredBid.gc}</div>
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-xs text-muted">Bids:</span> <span className="font-semi">{winPredResult.gcHistory.totalBids}</span></div>
                    <div><span className="text-xs text-muted">Wins:</span> <span className="font-semi">{winPredResult.gcHistory.wins}</span></div>
                    <div><span className="text-xs text-muted">Win Rate:</span> <span className="font-semi">{winPredResult.gcHistory.winRate}%</span></div>
                    <div><span className={`badge ${winPredResult.gcHistory.relationship === "strong" ? "badge-green" : winPredResult.gcHistory.relationship === "moderate" ? "badge-amber" : "badge-muted"}`}>{winPredResult.gcHistory.relationship}</span></div>
                  </div>
                </div>
              )}

              {/* Key Factors */}
              {winPredResult.factors?.length > 0 && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-8">{t("Key Factors")}</div>
                  {winPredResult.factors.map((f, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm">{f.factor}</span>
                        <span className={`badge ${f.impact === "positive" ? "badge-green" : f.impact === "negative" ? "badge-red" : "badge-muted"}`}>{f.impact}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{f.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {winPredResult.improvements?.length > 0 && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-8 text-amber">{t("Improve Win Chances")}</div>
                  {winPredResult.improvements.map((imp, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm font-semi">{imp.suggestion}</span>
                        <span className={`badge ${imp.effort === "easy" ? "badge-green" : imp.effort === "medium" ? "badge-amber" : "badge-red"}`}>{imp.effort}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{imp.impact}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing Insight */}
              {winPredResult.pricingInsight && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-4">{t("Pricing Insight")}</div>
                  <div className="text-sm text-muted">{winPredResult.pricingInsight}</div>
                </div>
              )}

              {/* Summary */}
              <div className="text-sm text-muted p-8">{winPredResult.summary}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: PROJECTS
  // ═══════════════════════════════════════════════════════════════
  const renderProjects = () => (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">{t("Projects")}</div>
          <div className="section-sub">
            {filteredProjects.length} {filteredProjects.length !== 1 ? t("projects") : t("project")}
            {(() => {
              const active = projects.filter(p => (p.progress || 0) < 100).length;
              const atRisk = projects.filter(p => {
                if ((p.progress || 0) >= 100) return false;
                const end = p.end ? new Date(p.end) : null;
                const start = p.start ? new Date(p.start) : null;
                if (!end || !start || isNaN(end) || isNaN(start)) return false;
                const totalDays = (end - start) / 86400000;
                const elapsed = (new Date() - start) / 86400000;
                return (p.progress || 0) < Math.min(100, (elapsed / totalDays) * 100) - 15;
              }).length;
              const openRfis = rfis.filter(r => r.status !== "Answered" && r.status !== "Closed").length;
              const pendingCOs = changeOrders.filter(c => c.status === "pending").length;
              return <>{active > 0 && <span className="ml-8">{active} active</span>}{atRisk > 0 && <span className="text-red font-semi ml-8">{atRisk} at risk</span>}{openRfis > 0 && <span className="ml-8">{openRfis} open RFIs</span>}{pendingCOs > 0 && <span className="ml-8">{pendingCOs} pending COs</span>}</>;
            })()}
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={runRiskRadar} disabled={riskLoading}>
            {riskLoading ? t("Scanning...") : t("Risk Radar")}
          </button>
          <button className="btn btn-ghost" onClick={() => {
            const headers = ["ID","Name","GC","Contract","Billed","Progress","Phase","Start","End","PM","Address","Margin"];
            const rows = filteredProjects.map(p => [
              p.id, `"${(p.name||'').replace(/"/g,'""')}"`, `"${(p.gc||'').replace(/"/g,'""')}"`,
              p.contract||0, p.billed||0, p.progress||0, p.phase||'', p.start||'', p.end||'',
              `"${(p.pm||'').replace(/"/g,'""')}"`, `"${(p.address||'').replace(/"/g,'""')}"`, p.margin||''
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_projects.csv'; a.click();
            URL.revokeObjectURL(url);
            show("Projects CSV exported");
          }}>{t("Export CSV")}</button>
          <FeatureGuide guideKey="projects" />
          <button className="btn btn-primary" onClick={() => setModal({ type: "editProject", data: null })}>{t("+ Add Project")}</button>
        </div>
      </div>

      {/* View Toggle: List | Summary | Schedule */}
      <div className="flex gap-4 mb-16">
        <button className={`btn btn-sm ${projectViewMode === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjectViewMode("list")} className="flex-center-gap-4"><List className="w-4 h-4" /> List</button>
        <button className={`btn btn-sm ${projectViewMode === "summary" ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjectViewMode("summary")} className="flex-center-gap-4"><Columns className="w-4 h-4" /> Summary</button>
        <button className={`btn btn-sm ${projectViewMode === "schedule" ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjectViewMode("schedule")} className="flex-center-gap-4"><BarChart2 className="w-4 h-4" /> Schedule</button>
      </div>

      {/* Cross-Project Summary Table */}
      {projectViewMode === "summary" && (
        <div style={{ overflowX: "auto", marginBottom: "var(--space-4)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-label)" }}>
            <thead>
              <tr className="border-b" style={{ borderBottomWidth: 2, textAlign: "left" }}>
                <th style={{ padding: "var(--space-2) var(--space-2)", color: "var(--text3)", fontWeight: "var(--weight-bold)" }}>Project</th>
                <th className="table-th-right">Progress</th>
                <th className="table-th-right">Contract</th>
                <th className="table-th-right">RFIs</th>
                <th className="table-th-right">COs</th>
                <th className="table-th-right">T&M</th>
                <th className="table-th-right">Punch</th>
                <th className="table-th-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.filter(p => p.status === "in-progress" || (p.progress || 0) < 100).map(p => {
                const pRfis = rfis.filter(r => String(r.projectId) === String(p.id) && r.status !== "Answered" && r.status !== "Closed").length;
                const pCOs = changeOrders.filter(c => String(c.projectId) === String(p.id) && c.status !== "approved" && c.status !== "rejected").length;
                const pTm = (tmTickets || []).filter(t => String(t.projectId) === String(p.id) && t.status !== "approved" && t.status !== "billed").length;
                const pPunch = (punchItems || []).filter(pi => String(pi.projectId) === String(p.id) && pi.status !== "resolved" && pi.status !== "complete").length;
                const pHours = timeEntries.filter(te => String(te.projectId) === String(p.id) && te.totalHours).reduce((s, te) => s + te.totalHours, 0);
                return (
                  <tr key={p.id} className="border-b cursor-pointer"
                    onClick={() => { setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, lastAccessed: new Date().toISOString() } : proj)); setModal({ type: "editProject", data: p }); }}>
                    <td style={{ padding: "var(--space-2) var(--space-2)", fontWeight: "var(--weight-semi)", color: "var(--blue)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                    <td style={{ padding: "var(--space-2) var(--space-2)", textAlign: "right" }}>
                      <div className="flex-center-gap-4 inline-flex">
                        <div style={{ width: 40, height: 6, background: "var(--bg3)", borderRadius: "var(--radius-control)", overflow: "hidden" }}>
                          <div style={{ width: `${p.progress || 0}%`, height: "100%", background: (p.progress || 0) >= 80 ? "var(--green)" : "var(--amber)", borderRadius: "var(--radius-control)" }} />
                        </div>
                        <span>{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="table-td-mono-right">${((p.contract || 0) / 1000).toFixed(0)}k</td>
                    <td style={{ padding: "var(--space-2) var(--space-2)", textAlign: "right", color: pRfis > 0 ? "var(--red)" : "var(--text3)", fontWeight: pRfis > 0 ? 700 : 400 }}>{pRfis}</td>
                    <td style={{ padding: "var(--space-2) var(--space-2)", textAlign: "right", color: pCOs > 0 ? "var(--amber)" : "var(--text3)", fontWeight: pCOs > 0 ? 700 : 400 }}>{pCOs}</td>
                    <td style={{ padding: "var(--space-2) var(--space-2)", textAlign: "right", color: pTm > 0 ? "var(--amber)" : "var(--text3)" }}>{pTm}</td>
                    <td style={{ padding: "var(--space-2) var(--space-2)", textAlign: "right", color: pPunch > 0 ? "var(--red)" : "var(--text3)" }}>{pPunch}</td>
                    <td className="table-td-mono-right">{pHours.toFixed(0)}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule / Gantt View */}
      {projectViewMode === "schedule" && (
        <GanttScheduleView
          projects={filteredProjects}
          onProjectClick={(p) => {
            setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, lastAccessed: new Date().toISOString() } : proj));
            setModal({ type: "editProject", data: { ...p, lastAccessed: new Date().toISOString() } });
          }}
        />
      )}

      {/* Search Bar */}
      {projectViewMode === "list" && <>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <input
          className="form-input"
          type="text"
          placeholder={t("Search projects by name, GC, or phase...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 500, width: "100%" }}
        />
      </div>

      {/* Risk Radar Panel */}
      {showRiskRadar && (
        <div className="card p-16 mb-16">
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">{t("Project Risk Radar")}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowRiskRadar(false); setRiskResult(null); }}>{t("Close")}</button>
          </div>
          {riskLoading && <div className="text-sm text-muted p-16 text-center">Analyzing {projects.length} projects for risks...</div>}
          {riskResult && (
            <div>
              <div className="info-panel">
                {riskResult.portfolioRisk}
              </div>

              {/* Rankings */}
              {riskResult.rankings?.map((r, i) => {
                const riskColor = r.riskLevel === "critical" ? "var(--red)" : r.riskLevel === "high" ? "var(--amber)" : r.riskLevel === "medium" ? "var(--blue)" : "var(--green)";
                return (
                  <div key={i} style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", borderLeft: `4px solid ${riskColor}`, background: "var(--card)", cursor: "pointer" }}
                    onClick={() => { const p = projects.find(p => p.name?.toLowerCase().includes(r.project?.toLowerCase())); if (p) setModal({ type: "editProject", data: p }); }}>
                    <div className="flex-between mb-4">
                      <span className="font-semi text-sm">{r.project}</span>
                      <div className="flex gap-8 flex-center">
                        <span style={{ fontSize: "var(--text-subtitle)", fontWeight: "var(--weight-bold)", color: riskColor }}>{r.riskScore}</span>
                        <span className={`badge ${r.riskLevel === "critical" ? "badge-red" : r.riskLevel === "high" ? "badge-amber" : r.riskLevel === "medium" ? "badge-blue" : "badge-green"}`}>{r.riskLevel}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap mb-4">
                      {r.factors?.map((f, j) => <span key={j} className="badge badge-muted fs-10">{f}</span>)}
                    </div>
                    <div className="text-xs text-muted">{r.recommendation}</div>
                  </div>
                );
              })}

              {/* Immediate Actions */}
              {riskResult.immediateActions?.length > 0 && (
                <div className="mt-12">
                  <div className="text-sm font-semi mb-8">{t("Immediate Actions")}</div>
                  {riskResult.immediateActions.map((a, i) => (
                    <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-label)", cursor: a.project ? "pointer" : undefined }}
                      onClick={a.project ? () => { const p = projects.find(p => p.name?.toLowerCase().includes(a.project.toLowerCase())); if (p) setModal({ type: "editProject", data: p }); } : undefined}>
                      <div className="flex-between">
                        <span className="font-semi">{a.project}</span>
                        <span className="text-xs text-dim">{a.deadline}</span>
                      </div>
                      <div className="text-muted mt-2">{a.action}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Building2 style={{ width: 40, height: 40 }} /></div>
          <div className="empty-text">{search ? t("No matching projects") : t("No projects yet")}</div>
        </div>
      ) : (
        <div className="project-grid">
          {filteredProjects.slice(0, projPageSize).map(p => {
            // Compute health signals
            const pid = p.id;
            const pRfis = rfis.filter(r => r.projectId === pid && r.status !== "Answered" && r.status !== "Closed");
            const pSubs = submittals.filter(s => s.projectId === pid && s.status !== "approved");
            const pCOs = changeOrders.filter(c => c.projectId === pid && c.status === "pending");
            const pInvs = invoices.filter(i => i.projectId === pid);
            const overdueRfis = pRfis.filter(r => (r.submitted || r.dateSubmitted) && (new Date() - new Date(r.submitted || r.dateSubmitted)) > 7 * 86400000).length;
            // Schedule health
            const endDate = p.end ? new Date(p.end) : null;
            const startDate = p.start ? new Date(p.start) : null;
            const now = new Date();
            let scheduleRisk = null;
            if (endDate && startDate && !isNaN(endDate) && !isNaN(startDate)) {
              const totalDays = (endDate - startDate) / 86400000;
              const elapsed = (now - startDate) / 86400000;
              const expected = totalDays > 0 ? Math.min(100, (elapsed / totalDays) * 100) : 0;
              if ((p.progress || 0) < expected - 15) scheduleRisk = "behind";
              else if (now > endDate && (p.progress || 0) < 100) scheduleRisk = "overdue";
            }
            // Billing health
            const billedPct = (p.contract || 0) > 0 ? Math.round(((p.billed || 0) / p.contract) * 100) : 0;
            const billingLag = (p.progress || 0) > 0 && billedPct < (p.progress || 0) - 20;
            // Overall health
            const issues = (scheduleRisk ? 1 : 0) + (overdueRfis > 0 ? 1 : 0) + (billingLag ? 1 : 0) + (pCOs.length > 0 ? 1 : 0);
            const healthColor = issues >= 2 ? "var(--red)" : issues === 1 ? "var(--amber)" : "var(--green)";
            const progressColor = scheduleRisk === "overdue" ? "var(--red)" : scheduleRisk === "behind" ? "var(--amber)" : "var(--green)";
            return (
            <div key={p.id} className="project-card" style={{ borderLeft: `4px solid ${healthColor}` }} onClick={() => {
              setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, lastAccessed: new Date().toISOString() } : proj));
              setModal({ type: "editProject", data: { ...p, lastAccessed: new Date().toISOString() } });
            }}>
              {/* Top: phase + PM + foreman + health dot */}
              <div className="flex-between mb-4">
                <span className="flex-center-gap-6">
                  {p.constructionStage && STAGE_MAP[p.constructionStage] && (
                    <span className="badge" style={{ fontSize: "var(--text-xs)", background: STAGE_MAP[p.constructionStage].color + "22", color: STAGE_MAP[p.constructionStage].color, border: `1px solid ${STAGE_MAP[p.constructionStage].color}44` }}>
                      {STAGE_MAP[p.constructionStage].label}
                    </span>
                  )}
                  <span className="badge badge-blue fs-10">{p.phase || "—"}</span>
                  {scheduleRisk && <span className="badge badge-red fs-9">{scheduleRisk === "overdue" ? "OVERDUE" : "BEHIND"}</span>}
                </span>
                <span className="flex-center-gap-6">
                  {p.pm && <span className="text-xs text-blue">{p.pm.split(" ")[0]}</span>}
                  {p.assignedForeman != null && (() => {
                    const fm = employees.find(e => String(e.id) === String(p.assignedForeman));
                    return fm ? <span className="text-xs text-muted">· {fm.name.split(" ")[0]}</span> : null;
                  })()}
                </span>
              </div>
              {/* Name + GC */}
              <div className="card-title font-head fs-14 mb-2 lh-13">{p.name}</div>
              <div className="text-xs text-muted mb-4">{p.gc}</div>
              {/* Contract + Billed (hide $0) */}
              <div className="flex-between text-sm mb-4">
                {(p.contract || 0) > 0 ? (
                  <span>Contract: <span className="font-mono text-amber">{fmt(p.contract)}</span></span>
                ) : <span className="text-xs text-muted text-italic">No contract value</span>}
                {(p.billed || 0) > 0 && <span className="text-xs">Billed: <span className="font-mono">{fmt(p.billed)}</span></span>}
              </div>
              {/* Progress bar — colored by health */}
              <div className="progress-bar" style={{ height: 5 }}>
                <div className="progress-fill" style={{ width: `${p.progress || 0}%`, background: progressColor }} />
              </div>
              <div className="flex-between mt-4">
                <div className="text-xs text-dim">{p.progress || 0}%{(p.contract || 0) > 0 && (p.billed || 0) > 0 ? ` done · ${billedPct}% billed` : ""}</div>
                {endDate && !isNaN(endDate) && (p.progress || 0) < 100 && (
                  <span className="text-xs" style={{ color: now > endDate ? "var(--red)" : "var(--text2)" }}>
                    {now > endDate ? `${Math.ceil((now - endDate) / 86400000)}d past due` : `${Math.ceil((endDate - now) / 86400000)}d left`}
                  </span>
                )}
              </div>
              {/* Document counts row */}
              <div className="flex gap-6 mt-6 flex-wrap fs-10 text-muted">
                {pRfis.length > 0 && <span style={{ color: overdueRfis > 0 ? "var(--red)" : "var(--amber)" }}>RFI: {pRfis.length}{overdueRfis > 0 ? ` (${overdueRfis} aging)` : ""}</span>}
                {pSubs.length > 0 && <span className="text-amber">Sub: {pSubs.length}</span>}
                {pCOs.length > 0 && <span className="text-amber">CO: {pCOs.length}</span>}
                {billingLag && <span className="text-red">Billing lag</span>}
                {(() => { const tc = (p.laborCost || 0) + (p.materialCost || 0); const c = p.contract || 0; if (tc > 0 && c > 0) { const m = Math.round(((c - tc) / c) * 100); if (m < 30) return <span style={{ color: m < 0 ? "#dc2626" : "var(--red)", fontWeight: "var(--weight-semi)" }}>Margin: {m}%</span>; } return null; })()}
                {pRfis.length === 0 && pSubs.length === 0 && pCOs.length === 0 && !billingLag && <span className="text-green">On track</span>}
              </div>
              {/* Closeout button for near-complete */}
              {(p.progress || 0) >= 75 && (
                <div className="mt-6">
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", color: "var(--amber)" }}
                    onClick={(e) => { e.stopPropagation(); runCloseout(p); }}
                    disabled={closeoutLoading && closeoutProj?.id === p.id}>
                    {closeoutLoading && closeoutProj?.id === p.id ? "..." : "AI Closeout"}
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      {filteredProjects.length > projPageSize && (
        <div className="flex-between mt-16 py-8">
          <span className="text-xs text-muted">Showing {Math.min(projPageSize, filteredProjects.length)} of {filteredProjects.length}</span>
          <div className="flex gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setProjPageSize(s => s + 24)}>
              Load More ({filteredProjects.length - projPageSize})
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setProjPageSize(filteredProjects.length)}>
              Show All
            </button>
          </div>
        </div>
      )}

      </>}

      {/* Closeout Modal */}
      {closeoutProj && closeoutResult && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => setCloseoutProj(null))}>
          <div className="modal-content modal-xl">
            <div className="modal-header flex-between">
              <div className="modal-title">Closeout: {closeoutProj.name}</div>
              <div className="flex gap-8">
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const { generateCloseoutPdf } = await import("./utils/closeoutPdf.js");
                  const pid = closeoutProj.id;
                  generateCloseoutPdf(closeoutProj, {
                    rfis: rfis.filter(r => r.projectId === pid),
                    submittals: submittals.filter(s => s.projectId === pid),
                    changeOrders: changeOrders.filter(c => c.projectId === pid),
                    invoices: invoices.filter(i => i.projectId === pid),
                    dailyReports: dailyReports.filter(d => d.projectId === pid),
                    jsas: jsas.filter(j => j.projectId === pid),
                    tmTickets: tmTickets.filter(t => t.projectId === pid),
                    punchItems: (punchItems || []).filter(p => p.projectId === pid),
                    closeoutResult,
                  });
                  show("Closeout PDF exported", "ok");
                }}>Export PDF</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setCloseoutProj(null)}>{t("Close")}</button>
              </div>
            </div>
            <div className="p-16 max-h-500 overflow-auto">
              {/* Readiness Score */}
              <div className="flex gap-16 mb-16 flex-center">
                <div className="text-center">
                  <div className="text-xs text-muted">{t("Readiness")}</div>
                  <div style={{ fontSize: "var(--text-stat)", fontWeight: "var(--weight-bold)", color: closeoutResult.readinessScore >= 70 ? "var(--green)" : closeoutResult.readinessScore >= 40 ? "var(--amber)" : "var(--red)" }}>
                    {closeoutResult.readinessScore}/100
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted">{t("Grade")}</div>
                  <div className="kpi-hero-value">{closeoutResult.grade}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted">{closeoutResult.summary}</div>
                </div>
              </div>

              {/* Financial Status */}
              {closeoutResult.financialStatus && (
                <div className="flex gap-12 mb-12 flex-wrap" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)" }}>
                  <div><span className="text-xs text-muted">Billed:</span> <span className="font-semi">${(closeoutResult.financialStatus.totalBilled || 0).toLocaleString()}</span></div>
                  <div><span className="text-xs text-muted">Remaining:</span> <span className="font-semi text-amber">${(closeoutResult.financialStatus.remaining || 0).toLocaleString()}</span></div>
                  <div><span className="text-xs text-muted">Open COs:</span> <span className="font-semi">{closeoutResult.financialStatus.openCOs}</span></div>
                  <div><span className="text-xs text-muted">Margin:</span> <span className="font-semi">{closeoutResult.financialStatus.margin}</span></div>
                </div>
              )}

              {/* Checklist */}
              {closeoutResult.checklist?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">{t("Closeout Checklist")}</div>
                  {closeoutResult.checklist.map((c, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm">{c.status === "complete" ? "✓" : c.status === "pending" ? "–" : "○"} {c.item}</span>
                        <div className="flex gap-4">
                          <span className="badge badge-muted">{c.category}</span>
                          <span className={`badge ${c.priority === "critical" ? "badge-red" : c.priority === "high" ? "badge-amber" : "badge-muted"}`}>{c.priority}</span>
                        </div>
                      </div>
                      {c.notes && <div className="text-xs text-muted mt-2 ml-20">{c.notes}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Outstanding Items */}
              {closeoutResult.outstandingItems?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8 text-red">{t("Outstanding Items")}</div>
                  {closeoutResult.outstandingItems.map((o, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm font-semi">{o.item}</span>
                        {o.amount && <span className="font-mono text-amber">${o.amount.toLocaleString()}</span>}
                      </div>
                      <div className="text-xs text-muted mt-2">{o.action} — Due: {o.deadline}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risk of Loss */}
              {closeoutResult.riskOfLoss?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8 text-amber">{t("Risk of Loss")}</div>
                  {closeoutResult.riskOfLoss.map((r, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm">{r.item}</span>
                        <div className="flex gap-8">
                          <span className="font-mono">${(r.amount || 0).toLocaleString()}</span>
                          <span className={`badge ${r.risk === "high" ? "badge-red" : r.risk === "medium" ? "badge-amber" : "badge-muted"}`}>{r.risk}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.action}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: SCOPE
  // ═══════════════════════════════════════════════════════════════
  // ── digest state ──
  const [digestResult, setDigestResult] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  const runWeeklyDigest = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setDigestLoading(true);
    setDigestResult(null);
    try {
      const { generateWeeklyDigest } = await import("./utils/api.js");
      const projectData = {
        projects: projects.map(p => ({
          name: p.name || p.project, gc: p.gc, phase: p.phase,
          contract: p.contract, billed: p.billed, margin: p.margin,
          progress: p.progress, scope: p.scope,
        })),
        bids: {
          estimating: bids.filter(b => b.status === "estimating").length,
          submitted: bids.filter(b => b.status === "submitted").length,
          awarded: bids.filter(b => b.status === "awarded").length,
          lost: bids.filter(b => b.status === "lost").length,
          pipelineValue: pipeline,
        },
        tmTickets: {
          total: tmTickets.length,
          pending: tmTickets.filter(t => t.status !== "approved" && t.status !== "billed").length,
          approvedValue: tmTickets.filter(t => t.status === "approved" || t.status === "billed")
            .reduce((s, t) => s + (t.laborEntries || []).reduce((a, e) => a + e.hours * e.rate, 0) + (t.materialEntries || []).reduce((a, e) => a + e.qty * e.unitCost * (1 + (e.markupPct || 0) / 100), 0), 0),
        },
        weekOf: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
      const result = await generateWeeklyDigest(apiKey, projectData);
      setDigestResult(result);
      show("Weekly digest generated", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setDigestLoading(false);
    }
  };

  // ── morning briefing state ──
  const [briefResult, setBriefResult] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [lookAheadDays, setLookAheadDays] = useState(7);

  const runMorningBrief = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setBriefLoading(true);
    setBriefResult(null);
    try {
      const { generateMorningBriefing } = await import("./utils/api.js");
      const dashData = {
        projects: projects.map(p => ({ name: p.name || p.project, gc: p.gc, progress: p.progress, margin: p.margin, phase: p.phase })),
        bids: { total: bids.length, estimating: bids.filter(b => b.status === "estimating").length, submitted: bids.filter(b => b.status === "submitted").length, dueSoon: bids.filter(b => b.due && new Date(b.due) - Date.now() < 7 * 86400000 && b.status === "estimating").length },
        invoices: (invoices || []).filter(i => i.status === "pending" || i.status === "overdue").map(i => ({ number: i.number, amount: i.amount, status: i.status, project: i.projectId })),
        schedule: (schedule || []).filter(t => t.status === "in-progress").map(t => ({ task: t.task, project: t.projectName, end: t.end })),
        incidents: (incidents || []).slice(0, 5),
        today: new Date().toISOString().slice(0, 10),
      };
      const res = await generateMorningBriefing(apiKey, dashData);
      setBriefResult(res);
      setShowBrief(true);
      show("Morning briefing ready", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setBriefLoading(false);
    }
  };

  // ── project closeout state ──
  const [closeoutProj, setCloseoutProj] = useState(null);
  const [closeoutResult, setCloseoutResult] = useState(null);
  const [closeoutLoading, setCloseoutLoading] = useState(false);

  const runCloseout = async (proj) => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setCloseoutProj(proj);
    setCloseoutLoading(true);
    setCloseoutResult(null);
    try {
      const { analyzeProjectCloseout } = await import("./utils/api.js");
      const projInvoices = (invoices || []).filter(i => i.projectId === proj.id);
      const projCOs = (changeOrders || []).filter(c => c.projectId === proj.id);
      const projSchedule = (schedule || []).filter(s => s.projectId === proj.id);
      const res = await analyzeProjectCloseout(apiKey, proj, projInvoices, projCOs, projSchedule);
      setCloseoutResult(res);
      show("Closeout analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
      setCloseoutProj(null);
    } finally {
      setCloseoutLoading(false);
    }
  };

  // ── follow-up state ──
  const [followUpText, setFollowUpText] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpBid, setFollowUpBid] = useState(null);

  const runFollowUp = async (bid) => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setFollowUpBid(bid);
    setFollowUpLoading(true);
    setFollowUpText("");
    try {
      const { generateBidFollowUp } = await import("./utils/api.js");
      const days = bid.due ? Math.max(0, Math.round((Date.now() - new Date(bid.due).getTime()) / 86400000)) : 7;
      const text = await generateBidFollowUp(apiKey, bid, days);
      setFollowUpText(text);
      show("Follow-up email generated", "ok");
    } catch (e) {
      show(e.message, "err");
      setFollowUpBid(null);
    } finally {
      setFollowUpLoading(false);
    }
  };

  // ── bid win predictor state ──
  const [winPredBid, setWinPredBid] = useState(null);
  const [winPredResult, setWinPredResult] = useState(null);
  const [winPredLoading, setWinPredLoading] = useState(false);

  const runWinPredict = async (bid) => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setWinPredBid(bid);
    setWinPredLoading(true);
    setWinPredResult(null);
    try {
      const { predictBidWinRate } = await import("./utils/api.js");
      const res = await predictBidWinRate(apiKey, bid, bids, projects);
      setWinPredResult(res);
      show("Win prediction complete", "ok");
    } catch (e) {
      show(e.message, "err");
      setWinPredBid(null);
    } finally {
      setWinPredLoading(false);
    }
  };

  // ── scope risk scorer state ──
  const [scopeRiskResult, setScopeRiskResult] = useState(null);
  const [scopeRiskLoading, setScopeRiskLoading] = useState(false);
  const [showScopeRisk, setShowScopeRisk] = useState(false);

  const runScopeRisk = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setScopeRiskLoading(true);
    setScopeRiskResult(null);
    try {
      const { scoreScopeRisks } = await import("./utils/api.js");
      const linkedBid = scopeBidId ? bids.find(b => String(b.id) === String(scopeBidId)) : null;
      const res = await scoreScopeRisks(apiKey, filteredScope, linkedBid, projects);
      setScopeRiskResult(res);
      setShowScopeRisk(true);
      show("Scope risk analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setScopeRiskLoading(false);
    }
  };

  // ── risk radar state ──
  const [riskResult, setRiskResult] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [showRiskRadar, setShowRiskRadar] = useState(false);

  const runRiskRadar = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setRiskLoading(true);
    setRiskResult(null);
    setShowRiskRadar(true);
    try {
      const { analyzeProjectRisks } = await import("./utils/api.js");
      const projectData = projects.map(p => {
        const projCOs = (changeOrders || []).filter(c => String(c.projectId) === String(p.id));
        const projTM = (tmTickets || []).filter(t => String(t.projectId) === String(p.id));
        return {
          name: p.name || p.project, gc: p.gc, phase: p.phase,
          contract: p.contract, billed: p.billed, margin: p.margin, progress: p.progress,
          scope: p.scope,
          changeOrders: { count: projCOs.length, totalValue: projCOs.reduce((s, c) => s + (c.amount || 0), 0), pendingCount: projCOs.filter(c => c.status === "pending").length },
          tmTickets: { count: projTM.length, pendingValue: projTM.filter(t => t.status !== "approved" && t.status !== "billed").reduce((s, t) => s + (t.laborEntries || []).reduce((a, e) => a + e.hours * e.rate, 0) + (t.materialEntries || []).reduce((a, e) => a + e.qty * e.unitCost, 0), 0) },
        };
      });
      const result = await analyzeProjectRisks(apiKey, projectData);
      setRiskResult(result);
      show("Risk analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setRiskLoading(false);
    }
  };

  // ── GC intelligence state ──
  const [gcIntelResult, setGcIntelResult] = useState(null);
  const [gcIntelLoading, setGcIntelLoading] = useState(false);
  const [showGcIntel, setShowGcIntel] = useState(false);

  const runGcIntel = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setGcIntelLoading(true);
    setGcIntelResult(null);
    setShowGcIntel(true);
    try {
      const { analyzeGcRelationships } = await import("./utils/api.js");
      const result = await analyzeGcRelationships(apiKey, contacts, bids, projects, callLog.slice(0, 20));
      setGcIntelResult(result);
      show("GC intelligence analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setGcIntelLoading(false);
    }
  };

  // ── email scanner state ──
  const [showEmailScanner, setShowEmailScanner] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [emailResults, setEmailResults] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [editingEmailBid, setEditingEmailBid] = useState(null);

  const runEmailScan = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    if (!emailText.trim()) { show("Paste email content first", "err"); return; }
    setEmailLoading(true);
    setEmailResults(null);
    setEditingEmailBid(null);
    try {
      const { analyzeBidsFromEmail } = await import("./utils/api.js");
      const results = await analyzeBidsFromEmail(apiKey, emailText);
      setEmailResults(results);
      if (results.length === 0) show("No bids found in email", "warn");
      else show(`Found ${results.length} bid${results.length > 1 ? "s" : ""} — review and import`, "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setEmailLoading(false);
    }
  };

  const importEmailBid = (bid) => {
    // Build contact string from extracted contact fields
    const contactParts = [bid.contactName, bid.contactEmail, bid.contactPhone].filter(Boolean);
    const contactStr = bid.contact || contactParts.join(" / ") || "";
    // Build comprehensive notes
    const noteParts = [];
    if (bid.notes) noteParts.push(bid.notes);
    if (bid.prebidDate) noteParts.push(`Pre-bid: ${bid.prebidDate}${bid.prebidLocation ? " at " + bid.prebidLocation : ""}`);
    if (bid.planLinks && bid.planLinks.length > 0) noteParts.push("Plans: " + bid.planLinks.join(" , "));
    if (bid.addenda) noteParts.push(`Addenda: ${bid.addenda}`);
    if (bid.contactEmail) noteParts.push(`Email: ${bid.contactEmail}`);
    if (bid.contactPhone) noteParts.push(`Phone: ${bid.contactPhone}`);

    const newBid = {
      id: nextId(),
      name: bid.name || "Unnamed Project",
      gc: bid.gc || "",
      value: bid.value || 0,
      due: bid.due || "",
      status: bid.status || "invite_received",
      sector: bid.sector || "",
      phase: bid.sector || "",
      risk: "Med",
      scope: Array.isArray(bid.scope) ? bid.scope : [],
      contact: contactStr,
      address: bid.address || "",
      month: bid.due ? new Date(bid.due).toLocaleString("en-US", { month: "short" }) : "",
      notes: noteParts.join(" | "),
      estimator: "",
      exclusions: "",
      attachments: [],
      plansUploaded: !!(bid.planLinks && bid.planLinks.length > 0),
      addendaCount: bid.addenda || 0,
      proposalStatus: "",
    };
    setBids(prev => [...prev, newBid]);
    show(`Imported: ${newBid.name}`, "ok");
  };

  const [scopeSubTab, setScopeSubTab] = useState("checklist");
  const [gapBidScope, setGapBidScope] = useState("");
  const [gapContractScope, setGapContractScope] = useState("");
  const [gapResult, setGapResult] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);

  const runGapCheck = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    if (!gapBidScope.trim() || !gapContractScope.trim()) { show("Paste both scopes", "err"); return; }
    setGapLoading(true);
    setGapResult(null);
    try {
      const { checkScopeGaps } = await import("./utils/api.js");
      const result = await checkScopeGaps(apiKey, gapBidScope, gapContractScope);
      setGapResult(result);
      show("Gap analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setGapLoading(false);
    }
  };

  const SEV_BADGE = { critical: "badge-red", warning: "badge-amber", info: "badge-blue" };

  const renderScope = () => (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">{t("Scope")}</div>
          <div className="section-sub">{t("Checklist & AI gap analysis")}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => { showScopeRisk ? setShowScopeRisk(false) : runScopeRisk(); }} disabled={scopeRiskLoading}>
          {scopeRiskLoading ? t("Analyzing...") : t("AI Risk Score")}
        </button>
      </div>

      {/* Scope Risk Panel */}
      {showScopeRisk && scopeRiskResult && (
        <div className="card p-20 mb-16">
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">{t("Scope Risk Analysis")}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowScopeRisk(false)}>{t("Close")}</button>
          </div>

          {/* Score + Grade */}
          <div className="flex gap-16 mb-16 flex-center">
            <div className="text-center">
              <div className="text-xs text-muted">{t("Risk Score")}</div>
              <div style={{ fontSize: "var(--text-stat)", fontWeight: "var(--weight-bold)", color: scopeRiskResult.overallRisk <= 30 ? "var(--green)" : scopeRiskResult.overallRisk <= 60 ? "var(--amber)" : "var(--red)" }}>
                {scopeRiskResult.overallRisk}/100
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted">{t("Grade")}</div>
              <div className="kpi-hero-value">{scopeRiskResult.grade}</div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted">{scopeRiskResult.summary}</div>
            </div>
          </div>

          {/* Red Flags */}
          {scopeRiskResult.redFlags?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-red">{t("Red Flags")} ({scopeRiskResult.redFlags.length})</div>
              {scopeRiskResult.redFlags.map((f, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="text-sm font-semi">{f.item}</div>
                  <div className="text-xs text-muted mt-2">{f.risk}</div>
                  <div className="text-xs mt-2"><span className="text-amber">Exposure:</span> {f.financialExposure}</div>
                  <div className="text-xs mt-2"><span className="text-green">Mitigation:</span> {f.mitigation}</div>
                </div>
              ))}
            </div>
          )}

          {/* Negotiation Points */}
          {scopeRiskResult.negotiationPoints?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-amber">{t("Negotiation Points")}</div>
              {scopeRiskResult.negotiationPoints.map((n, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm font-semi">{n.point}</span>
                    <span className={`badge ${n.priority === "must_have" ? "badge-red" : "badge-muted"}`}>{n.priority?.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{n.leverage}</div>
                  {n.suggestedLanguage && <div className="text-xs mt-2" style={{ fontStyle: "italic", color: "var(--blue)" }}>"{n.suggestedLanguage}"</div>}
                </div>
              ))}
            </div>
          )}

          {/* Hidden Costs */}
          {scopeRiskResult.hiddenCosts?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8">{t("Hidden Cost Risks")}</div>
              {scopeRiskResult.hiddenCosts.map((h, i) => (
                <div key={i} className="queue-row">
                  <div className="flex-between">
                    <span className="text-sm">{h.item}</span>
                    <span className={`badge ${h.likelihood === "high" ? "badge-red" : h.likelihood === "medium" ? "badge-amber" : "badge-muted"}`}>{h.likelihood}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">Est: {h.estimatedCost} · Trigger: {h.trigger}</div>
                </div>
              ))}
            </div>
          )}

          {/* Exclusions */}
          {scopeRiskResult.exclusions?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-blue">{t("Recommended Exclusions")}</div>
              <ul style={{ margin: "0", paddingLeft: "var(--space-5)" }}>
                {scopeRiskResult.exclusions.map((e, i) => (
                  <li key={i} className="text-sm text-muted mb-4">{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 mb-16">
        {[{ key: "checklist", label: "Checklist" }, { key: "gapchecker", label: "Gap Checker" }].map(st => (
          <button key={st.key} className={`btn btn-sm ${scopeSubTab === st.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setScopeSubTab(st.key)}>{t(st.label)}</button>
        ))}
      </div>

      {scopeSubTab === "checklist" && (<>
        <div className="flex gap-8 mb-16 flex-wrap flex-center">
          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="form-label">{t("Linked Bid")}</label>
            <select className="form-select" value={scopeBidId || ""} onChange={e => setScopeBidId(e.target.value || null)}>
              <option value="">-- All / General --</option>
              {bids.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-4 mt-12">
            {["All", "Flagged", "Unchecked"].map(f => (
              <button key={f} className={`btn btn-sm ${scopeFilter === f ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setScopeFilter(f)}>{t(f)}</button>
            ))}
          </div>
        </div>

        {filteredScope.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ClipboardList style={{ width: 40, height: 40 }} /></div>
            <div className="empty-text">{t("No items match this filter")}</div>
          </div>
        ) : (
          filteredScope.map(s => (
            <div key={s.id} className="scope-item" onClick={() => handleScopeCycle(s.id)}>
              <span className="scope-check">{SCOPE_ICONS[s.status]}</span>
              <div className="scope-info">
                <div className="scope-title">{s.title}</div>
                <div className="scope-desc">{s.desc}</div>
              </div>
            </div>
          ))
        )}
      </>)}

      {scopeSubTab === "gapchecker" && (
        <div>
          <div className="card p-20 mb-16">
            <div className="text-sm font-semi mb-8">Paste your bid scope and contract/spec scope below. AI will identify gaps, extras, and risks.</div>
            <div className="grid-2col" style={{ gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label">{t("Bid Scope (what EBC priced)")}</label>
                <textarea className="form-input" rows={8} placeholder="Paste your bid scope, line items, or proposal scope description..."
                  value={gapBidScope} onChange={e => setGapBidScope(e.target.value)} className="form-textarea-flex" />
                <div className="text-xs text-dim mt-4">{gapBidScope.length} chars</div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("Contract Scope (specs / drawings notes)")}</label>
                <textarea className="form-input" rows={8} placeholder="Paste contract scope, spec sections, or drawing notes..."
                  value={gapContractScope} onChange={e => setGapContractScope(e.target.value)} className="form-textarea-flex" />
                <div className="text-xs text-dim mt-4">{gapContractScope.length} chars</div>
              </div>
            </div>
            <button className="btn btn-primary mt-12" onClick={runGapCheck} disabled={gapLoading}>
              {gapLoading ? t("Analyzing...") : t("Run Gap Analysis")}
            </button>
          </div>

          {gapResult && (
            <div>
              {/* Score + Summary */}
              <div className="card p-16 mb-12">
                <div className="flex-between mb-8">
                  <div className="text-sm font-semi">{t("Coverage Score")}</div>
                  <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: gapResult.score >= 80 ? "var(--green)" : gapResult.score >= 50 ? "var(--amber)" : "var(--red)" }}>
                    {gapResult.score}/100
                  </div>
                </div>
                <div className="text-sm text-muted">{gapResult.summary}</div>
              </div>

              {/* Gaps */}
              {gapResult.gaps?.length > 0 && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-8 text-red">
                    {t("Missing from Bid")} ({gapResult.gaps.length})
                  </div>
                  {gapResult.gaps.map((g, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm font-semi">{g.item}</span>
                        <span className={`badge ${SEV_BADGE[g.severity] || "badge-muted"}`}>{g.severity}</span>
                      </div>
                      <div className="text-xs text-muted mt-4">{g.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Extras */}
              {gapResult.extras?.length > 0 && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-8 text-amber">
                    {t("In Bid but Not in Contract")} ({gapResult.extras.length})
                  </div>
                  {gapResult.extras.map((g, i) => (
                    <div key={i} className="queue-row">
                      <span className="text-sm font-semi">{g.item}</span>
                      <div className="text-xs text-muted mt-4">{g.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risks */}
              {gapResult.risks?.length > 0 && (
                <div className="card p-16 mb-12">
                  <div className="text-sm font-semi mb-8 text-blue">
                    {t("Risks & Ambiguities")} ({gapResult.risks.length})
                  </div>
                  {gapResult.risks.map((g, i) => (
                    <div key={i} className="queue-row">
                      <div className="flex-between">
                        <span className="text-sm font-semi">{g.item}</span>
                        <span className={`badge ${SEV_BADGE[g.severity] || "badge-muted"}`}>{g.severity}</span>
                      </div>
                      <div className="text-xs text-muted mt-4">{g.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {gapResult.gaps?.length === 0 && gapResult.extras?.length === 0 && gapResult.risks?.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon"><ClipboardList style={{ width: 40, height: 40, color: "var(--green)" }} /></div>
                  <div className="empty-text">{t("No gaps found — scope looks aligned")}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: CONTACTS
  // ═══════════════════════════════════════════════════════════════
  const renderContacts = () => (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">{t("Contacts")}</div>
          <div className="section-sub">{contacts.length} {contacts.length !== 1 ? t("contacts") : t("contact")}</div>
        </div>
        <div className="flex gap-8">
          <div className="search-wrap">
            <Search className="w-4 h-4 search-icon" />
            <input
              className="search-input"
              placeholder={t("Search contacts...")}
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={runGcIntel} disabled={gcIntelLoading}>
            {gcIntelLoading ? t("Analyzing...") : t("GC Intelligence")}
          </button>
          <button className="btn btn-ghost" onClick={() => setModal({ type: "logCall", data: null })}>{t("Log Call")}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["ID","Name","Company","Role","Email","Phone","Notes"];
            const rows = contacts.map(c => [
              c.id, `"${(c.name||'').replace(/"/g,'""')}"`, `"${(c.company||'').replace(/"/g,'""')}"`,
              `"${(c.role||'').replace(/"/g,'""')}"`, c.email||'', c.phone||'', `"${(c.notes||'').replace(/"/g,'""')}"`
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_contacts.csv'; a.click();
            URL.revokeObjectURL(url);
            show("Contacts CSV exported");
          }}>{t("Export CSV")}</button>
          <button className="btn btn-primary" onClick={() => setModal({ type: "editContact", data: null })}>{t("+ Add Contact")}</button>
        </div>
      </div>

      {/* GC Intelligence Panel */}
      {showGcIntel && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title font-head">{t("AI GC Relationship Intelligence")}</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowGcIntel(false); setGcIntelResult(null); }}>{t("Close")}</button>
          </div>
          {gcIntelLoading && <div className="text-sm text-muted p-16 text-center">Analyzing {contacts.length} contacts and {bids.length} bids...</div>}
          {gcIntelResult && (
            <div className="mt-8">
              {/* Summary */}
              <div className="info-panel">{gcIntelResult.summary}</div>

              {/* GC Rankings */}
              {gcIntelResult.gcRankings?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">{t("GC Rankings by Relationship Value")}</div>
                  {gcIntelResult.gcRankings.map((gc, i) => (
                    <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", borderLeft: `3px solid ${gc.score >= 70 ? "var(--green)" : gc.score >= 40 ? "var(--amber)" : "var(--red)"}`, background: "var(--card)", fontSize: "var(--text-label)" }}>
                      <div className="flex-between">
                        <span className="font-semi">{gc.gc}</span>
                        <span className="fw-700 text-amber">{gc.score}/100</span>
                      </div>
                      <div className="text-xs text-muted mt-2">
                        {gc.totalBids} bids • {gc.wins}W ({gc.winRate}%) • {gc.activeProjects} active • {gc.trend}
                      </div>
                      <div className="text-xs mt-2 text-blue">{gc.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Opportunities */}
              {gcIntelResult.topOpportunities?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">{t("Top BD Opportunities")}</div>
                  {gcIntelResult.topOpportunities.map((opp, i) => (
                    <div key={i} className="queue-row fs-13">
                      <div className="flex-between">
                        <span><span className="font-semi">{opp.gc}</span> — {opp.action}</span>
                        <span className={opp.priority === "high" ? "badge-red" : opp.priority === "medium" ? "badge-amber" : "badge-blue"}>{opp.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{opp.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* At-Risk Relationships */}
              {gcIntelResult.atRiskRelationships?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">{t("At-Risk Relationships")}</div>
                  {gcIntelResult.atRiskRelationships.map((r, i) => (
                    <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.06)", borderLeft: "3px solid var(--red)", fontSize: "var(--text-label)" }}>
                      <span className="font-semi">{r.gc}</span>
                      <div className="text-xs text-muted mt-2">{r.concern}</div>
                      <div className="text-xs mt-2 text-blue">{r.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-Up Needed */}
              {gcIntelResult.followUpNeeded?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">{t("Follow-Up Needed")}</div>
                  {gcIntelResult.followUpNeeded.map((f, i) => (
                    <div key={i} className="queue-row fs-13">
                      <div className="flex-between">
                        <span>{f.contact} ({f.gc})</span>
                        <span className={f.urgency === "this_week" ? "badge-red" : f.urgency === "next_week" ? "badge-amber" : "badge-blue"}>{f.urgency}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{f.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Market Insights */}
              {gcIntelResult.marketInsights?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">{t("Market Insights")}</div>
                  {gcIntelResult.marketInsights.map((ins, i) => (
                    <div key={i} style={{ padding: "var(--space-1) 0", fontSize: "var(--text-label)", color: "var(--text2)" }}>{ins}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="contact-grid">
        {filteredContacts.map(c => (
          <div key={c.id} className="contact-card" onClick={() => setModal({ type: "editContact", data: c })}>
            <div className="flex gap-12 flex-center">
              <div className="contact-avatar" style={{ background: c.color || "var(--amber)" }}>
                {(c.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-col flex-1">
                <div className="font-semi text-sm">{c.name}</div>
                <div className="text-xs text-muted">{c.company}</div>
                <div className="text-xs text-dim">{c.role}</div>
              </div>
              <span className={`badge ${PRIORITY_BADGE[c.priority] || "badge-muted"}`}>{c.priority}</span>
            </div>
            <div className="flex-between mt-12 text-xs text-dim">
              <span>Bids: {c.bids} | Wins: {c.wins}</span>
              <span>Last: {c.last}</span>
            </div>
          </div>
        ))}
      </div>

      {callLog.length > 0 && (
        <div className="card mt-24">
          <div className="card-header">
            <div className="card-title font-head">{t("Recent Calls")}</div>
          </div>
          {callLog.slice(0, 8).map(c => (
            <div key={c.id} className="flex gap-12 border-b" style={{ padding: "var(--space-3) 0" }}>
              <div className="log-accent-bar bg-blue" />
              <div className="flex-col gap-4 flex-1">
                <div className="flex-between">
                  <span className="font-semi text-sm">{c.contact} <span className="text-dim">({c.company})</span></span>
                  <span className="text-xs text-dim">{c.time}</span>
                </div>
                <div className="text-sm text-muted">{c.note}</div>
                {c.next && <div className="text-xs text-dim">Next: {c.next}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  const isAnime = theme === "anime";
  const isCyber = theme === "cyberpunk";

  // ── Portal views for field roles ──
  if (isDriverView) {
    return (
      <div className={`app${isAnime ? " anime-glow" : ""}${isCyber ? " cyber-glow" : ""}`}>
        <style>{styles}</style>
        {isAnime && <SakuraPetals />}
        {isCyber && <CyberRain />}
        <DriverView app={app} />
      </div>
    );
  }
  if (isEmployeeView) {
    return (
      <div className={`app${isAnime ? " anime-glow" : ""}${isCyber ? " cyber-glow" : ""}`}>
        <style>{styles}</style>
        {isAnime && <SakuraPetals />}
        {isCyber && <CyberRain />}
        <EmployeeView app={app} />
      </div>
    );
  }
  if (isForemanView) {
    return (
      <div className={`app${isAnime ? " anime-glow" : ""}${isCyber ? " cyber-glow" : ""}`}>
        <style>{styles}</style>
        {isAnime && <SakuraPetals />}
        {isCyber && <CyberRain />}
        <ForemanView app={app} />
      </div>
    );
  }

  return (
    <div className={`app${isAnime ? " anime-glow" : ""}${isCyber ? " cyber-glow" : ""}`}>
      <style>{styles}</style>
      {isAnime && <SakuraPetals />}
      {isAnime && <TokyoSkyline />}
      {isCyber && <CyberRain />}
      {isCyber && <div className="cyber-scanlines" />}

      <header className="header">
        <div className="logo flex-center-gap-6">
          <img src={theme === "daylight" ? "/eagle-blue.png" : "/ebc-eagle-white.png"} alt="Eagles Brothers Constructors" style={{ height: 32, width: "auto", objectFit: "contain", transition: "opacity 0.3s" }} onError={(e) => e.target.style.display = "none"} />
        </div>
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", marginRight: "var(--space-1)", fontWeight: "var(--weight-semi)", letterSpacing: 0.5, border: "1px solid var(--border)" }}
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          <Globe className="icon-inline" />{lang === "en" ? "ES" : "EN"}
        </button>
        <div style={{ position: "relative", marginRight: "var(--space-1)" }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "var(--text-card)", padding: "var(--space-1) var(--space-2)", position: "relative" }}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Alerts"
          >
            <Bell style={{ width: 20, height: 20 }} />
            {alertBadgeCount > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2, background: "var(--red)", color: "#fff",
                borderRadius: "50%", width: 16, height: 16, fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)",
                display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
              }}>{alertBadgeCount > 99 ? "99+" : alertBadgeCount}</span>
            )}
          </button>
          {notifOpen && (
            <NotificationPanel
              grouped={alertGroups}
              badgeCount={alertBadgeCount}
              dismissAlert={dismissAlert}
              dismissAll={dismissAll}
              onClose={() => setNotifOpen(false)}
              onNav={(navKey) => {
                setNotifOpen(false);
                // Rich navigation object from alert engine
                if (navKey && typeof navKey === "object") {
                  const { tab: destTab, projectId, projTab: destProjTab, bidId, employeeId, subTab: destSubTab } = navKey;
                  // Switch to the correct main tab
                  if (destTab) handleTabClick(destTab);
                  // Open specific project modal with sub-tab
                  if (projectId) {
                    const proj = projects.find(p => String(p.id) === String(projectId));
                    if (proj) {
                      // Map hyphenated nav keys to spaced tab names
                      const tabMap = { "change-orders": "change orders", submittals: "submittals", rfis: "rfis", closeout: "closeout", financials: "financials", team: "team", overview: "overview" };
                      setInitialProjTab(tabMap[destProjTab] || destProjTab || "overview");
                      setTimeout(() => setModal({ type: "editProject", data: { ...proj, lastAccessed: new Date().toISOString() } }), 50);
                    }
                  }
                  // Open specific bid modal
                  if (bidId && !projectId) {
                    const bid = bids.find(b => String(b.id) === String(bidId));
                    if (bid) setTimeout(() => setModal({ type: "editBid", data: bid }), 50);
                  }
                } else {
                  // Legacy string navigation
                  handleTabClick(navKey);
                }
              }}
            />
          )}
        </div>
        <nav className="nav">
          {visiblePrimary.map(pt => (
            <button
              key={pt.key}
              className={`nav-item ${tab === pt.key ? "active" : ""}`}
              onClick={() => handleTabClick(pt.key)}
            >
              {t(pt.label)}
            </button>
          ))}
          {visibleSecondary.length > 0 && (
          <div className="nav-more">
            <button
              className={`nav-more-btn ${moreOpen ? "open" : ""} ${isSecondaryActive ? "open" : ""}`}
              onClick={() => setMoreOpen(!moreOpen)}
            >
              {isSecondaryActive ? t(visibleSecondary.find(st => st.key === tab)?.label || "More") : t("More")} ▾
            </button>
            {moreOpen && (
              <div className="nav-dropdown">
                {visibleSecondary.map(st => (
                  <button
                    key={st.key}
                    className={`nav-item ${tab === st.key ? "active" : ""}`}
                    onClick={() => handleTabClick(st.key)}
                  >
                    {t(st.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </nav>
        {mobileNav && (
          <div className="mobile-nav-overlay" onClick={() => setMobileNav(false)}>
            <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
              <div className="mobile-nav-header">
                <div className="logo" style={{ fontSize: "var(--text-card)", display: "flex", alignItems: "center" }}><img src={theme === "daylight" ? "/eagle-blue.png" : "/ebc-eagle-white.png"} alt="EBC" style={{ height: 24, width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /></div>
                <button className="modal-close" onClick={() => setMobileNav(false)}>{"\u2715"}</button>
              </div>
              <div className="mobile-nav-section">
                {visiblePrimary.map(pt => (
                  <button
                    key={pt.key}
                    className={`mobile-nav-item ${tab === pt.key ? "active" : ""}`}
                    onClick={() => handleTabClick(pt.key)}
                  >
                    {t(pt.label)}
                  </button>
                ))}
              </div>
              <div className="mobile-nav-divider" />
              <div className="mobile-nav-section">
                {visibleSecondary.map(st => (
                  <button
                    key={st.key}
                    className={`mobile-nav-item ${tab === st.key ? "active" : ""}`}
                    onClick={() => handleTabClick(st.key)}
                  >
                    {t(st.label)}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="main-content" onClick={() => { moreOpen && setMoreOpen(false); notifOpen && setNotifOpen(false); }}>
        <UpdateBanner />
        <SyncStatus syncStatus={syncStatus} network={network} />
        {tab === "dashboard" && renderDashboard()}
        {tab === "bids" && renderBids()}
        {tab === "projects" && renderProjects()}
        {tab === "estimating" && <EstimatingTab app={app} />}
        {tab === "scope" && renderScope()}
        {tab === "contacts" && renderContacts()}
        {tab === "materials" && <MaterialsTab app={app} />}
        {tab === "incentives" && <IncentiveTab app={app} />}
        {tab === "calendar" && <CalendarView app={app} />}
        {tab === "jsa" && <JSATab app={app} />}
        {tab === "deliveries" && <DeliveriesTab app={app} />}
        {tab === "foreman" && <ForemanView app={{...app, auth: { ...app.auth, role: "foreman", name: app.auth?.name || "Admin" }}} />}
        {["financials", "documents", "schedule", "reports", "safety", "timeclock", "sds", "map", "settings"].includes(tab) && <MoreTabs app={app} />}
      </main>

      {/* ── Bottom Nav (mobile only) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {visiblePrimary.map(pt => {
            const icons = {
              dashboard: <LayoutDashboard />,
              bids: <Briefcase />,
              projects: <Building2 />,
              estimating: <Calculator />,
            };
            return (
              <button
                key={pt.key}
                className={`bottom-nav-item${tab === pt.key ? " active" : ""}`}
                onClick={() => { handleTabClick(pt.key); moreOpen && setMoreOpen(false); }}
              >
                {icons[pt.key] || <LayoutDashboard />}
                <span>{t(pt.label)}</span>
              </button>
            );
          })}
          {visibleSecondary.length > 0 && (
            <button
              className={`bottom-nav-item${SECONDARY_KEYS.includes(tab) ? " active" : ""}`}
              onClick={() => setMobileNav(true)}
            >
              <MoreHorizontal />
              <span>{t("More")}</span>
              {SECONDARY_KEYS.includes(tab) && <span className="bottom-nav-dot" />}
            </button>
          )}
        </div>
      </nav>

      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>

      {modal && <ModalHub type={modal.type} data={modal.data} app={app} />}

      {/* PWA Install Banner */}
      {installPrompt && !window.matchMedia("(display-mode: standalone)").matches && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, var(--bg3), var(--bg2))",
          border: "1px solid var(--amber)", borderRadius: "var(--radius-control)",
          padding: "var(--space-4) var(--space-5)", display: "flex", alignItems: "center", gap: "var(--space-3)",
          zIndex: 10000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 420, width: "calc(100% - 32px)",
        }}>
          <div style={{ fontSize: "var(--text-title)", lineHeight: 1 }}>&#9881;</div>
          <div className="flex-1">
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-secondary)", color: "var(--gold, #e09422)" }}>{t("Install EBC")}</div>
            <div style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginTop: "var(--space-1)" }}>
              {t("Works offline, launches instantly — like a real app")}
            </div>
          </div>
          <button style={{
            background: "var(--gold, #e09422)", color: "#000",
            border: "none", borderRadius: "var(--radius-control)", padding: "8px 18px",
            fontWeight: "var(--weight-bold)", fontSize: "var(--text-label)", cursor: "pointer",
          }} onClick={async () => {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === "accepted") show("EBC installed!");
            setInstallPrompt(null);
          }}>{t("Install")}</button>
          <button onClick={() => {
            setInstallPrompt(null);
            localStorage.setItem("ebc_install_dismissed", String(Date.now()));
          }} style={{
            background: "none", border: "none",
            color: "var(--text3)", cursor: "pointer", fontSize: "var(--text-section)", padding: "0 4px",
          }}>&times;</button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  MODAL HUB COMPONENT
// ═══════════════════════════════════════════════════════════════
const SCOPE_OPTIONS = [
  "Metal Framing", "GWB", "ACT", "Demo", "Lead-Lined", "ICRA", "Insulation",
  "L5 Finish", "Deflection Track", "Seismic ACT", "FRP", "Fireproofing", "Shaft Wall"
];

const ModalHub = ({ type, data, app }) => {
  const { setModal, show, fmt } = app;
  const isNew = !data || !data.id;
  const [aiText, setAiText] = useState("");
  const [punchAdding, setPunchAdding] = useState(false);
  const [punchForm, setPunchForm] = useState({ description: "", location: "", assignedTo: "", priority: "med" });
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [pdfScanning, setPdfScanning] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [emailImportText, setEmailImportText] = useState("");

  const parseEmailBid = () => {
    const text = emailImportText;
    if (!text.trim()) { show("Paste an email body first", "err"); return; }

    const first = (patterns) => {
      for (const re of patterns) {
        const m = text.match(re);
        if (m && m[1]) return m[1].trim().replace(/\s+/g, " ");
      }
      return "";
    };

    const name = first([
      /(?:project[:\s]+|re[:\s]+(?:bid (?:invite|invitation|request)|invitation to bid)[:\s]+)([^\n|,–—]{4,80})/i,
      /project name[:\s]+([^\n,]{4,80})/i,
      /ITB[:\s#]+([^\n,]{4,80})/i,
      /subject[:\s]+.*?(?:bid|invite|invitation)[:\s]+([^\n,]{4,80})/i,
      /for[:\s]+([A-Z][^\n]{10,70}(?:hospital|medical|school|center|tower|building|facility|project)[^\n]{0,30})/i,
    ]);

    const gc = first([
      /(?:from[:\s]+|invited by[:\s]+|general contractor[:\s]+|gc[:\s]+|on behalf of[:\s]+)([A-Za-z][^\n,–—]{2,60})/i,
      /([A-Z][a-zA-Z\s]+(?:Construction|Contractors?|Builders?|Building|Group|Corp|Inc|LLC|LP|Co\.|Company))/,
      /invited to bid (?:for|on) .+ (?:by|from) ([A-Za-z][^\n,]{2,50})/i,
    ]);

    const due = first([
      /(?:bid due|due date|bid date|submission deadline|bids? (?:are )?due)[:\s]+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:due|deadline)[:\s]+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    ]);

    const address = first([
      /(?:project (?:location|address|site)|location|address|site)[:\s]+([^\n]{8,80}(?:st|ave|blvd|dr|rd|way|pkwy|ln|houston|tx)[^\n]{0,40})/i,
      /(\d{3,5}\s+[A-Z][^\n]{5,60}(?:St\.?|Ave\.?|Blvd\.?|Dr\.?|Rd\.?|Way|Pkwy)[^\n]{0,30})/i,
    ]);

    const scopeRaw = first([
      /(?:scope of work|work scope|work includes?|bid includes?)[:\s]+([^\n]{10,200}(?:\n[^\n]{0,100}){0,4})/i,
      /(?:work type|trade|division)[:\s]+([^\n]{5,100})/i,
    ]);

    const scopeTags = [];
    const scopeLower = (scopeRaw + " " + text).toLowerCase();
    if (scopeLower.includes("metal fram") || scopeLower.includes("light gauge") || scopeLower.includes("stud") || scopeLower.includes("framing")) scopeTags.push("Metal Framing");
    if (scopeLower.includes("drywall") || scopeLower.includes("gwb") || scopeLower.includes("gypsum")) scopeTags.push("GWB");
    if (scopeLower.includes("ceiling") || scopeLower.includes("act") || scopeLower.includes("acoustical")) scopeTags.push("ACT");
    if (scopeLower.includes("demo") || scopeLower.includes("demolit")) scopeTags.push("Demo");
    if (scopeLower.includes("insul")) scopeTags.push("Insulation");
    if (scopeLower.includes("fireproof") || scopeLower.includes("firestop")) scopeTags.push("Fireproofing");
    if (scopeLower.includes("lead")) scopeTags.push("Lead-Lined");
    if (scopeLower.includes("frp") || scopeLower.includes("fiberglass")) scopeTags.push("FRP");
    if (scopeLower.includes("icra") || scopeLower.includes("infection control")) scopeTags.push("ICRA");
    if (scopeLower.includes("l5") || scopeLower.includes("level 5") || scopeLower.includes("level-5")) scopeTags.push("L5 Finish");
    if (scopeLower.includes("shaft wall")) scopeTags.push("Shaft Wall");

    setDraft(d => ({
      ...d,
      name: name || d.name,
      gc: gc || d.gc,
      due: due || d.due,
      address: address || d.address,
      scope: scopeTags.length > 0 ? scopeTags : d.scope,
      notes: scopeRaw ? (d.notes ? d.notes + "\n" + scopeRaw : scopeRaw) : d.notes,
    }));
    setShowEmailImport(false);
    setEmailImportText("");
    show("Email parsed — review and adjust fields", "ok");
  };
  const [quickContact, setQuickContact] = useState(null); // inline add-contact from bid form
  const [contactFilter, setContactFilter] = useState("");
  const [contactDropOpen, setContactDropOpen] = useState(false);
  const [gcFilter, setGcFilter] = useState("");
  const [gcDropOpen, setGcDropOpen] = useState(false);
  const [showPerimeterMap, setShowPerimeterMap] = useState(false);
  const [dupWarning, setDupWarning] = useState(null); // { pm, bidName } — bid dup alert

  // ── Shared: Sound Testing / Site Logistics / Notes ──
  const [soundForm, setSoundForm] = useState({ roomType: "office", roomLabel: "", wallDetails: "", wallLF: "" });
  const [showSoundForm, setShowSoundForm] = useState(false);
  const [projectNotes, setProjectNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_projectNotes") || "[]"); } catch { return []; }
  });
  const [noteText, setNoteText] = useState("");
  const [notesFilter, setNotesFilter] = useState("all");
  const [siteLogistics, setSiteLogistics] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_siteLogistics") || "{}"); } catch { return {}; }
  });
  const saveProjectNotes = (notes) => {
    localStorage.setItem("ebc_projectNotes", JSON.stringify(notes));
    setProjectNotes(notes);
  };
  const saveSiteLogistics = (log) => {
    localStorage.setItem("ebc_siteLogistics", JSON.stringify(log));
    setSiteLogistics(log);
  };

  const getInitial = () => {
    switch (type) {
      case "editBid":
        return data ? { ...data } : {
          name: "", gc: "", value: 0, due: "", status: "invite_received",
          scope: [], sector: "", risk: "Med", notes: "", contact: "",
          address: "", attachments: [], estimator: app.auth?.name || "", exclusions: "",
          plansUploaded: false, addendaCount: 0, proposalStatus: ""
        };
      case "editProject":
        return data ? { ...data } : {
          name: "", gc: "", contract: 0, billed: 0, progress: 0,
          laborCost: 0, materialCost: 0,
          phase: "", start: "", end: "", pm: "", address: "",
          suite: "", parking: "", lat: "", lng: "",
          closeOut: "", attachments: [], assignedForeman: null
        };
      case "editContact":
        return data ? { ...data } : {
          name: "", company: "", role: "", phone: "", email: "",
          priority: "med", notes: "", bids: 0, wins: 0, color: "var(--blue)", last: "Never"
        };
      case "logCall":
        return { contact: "", company: "", note: "", next: "", time: new Date().toLocaleString() };
      case "viewBid":
        return data || {};
      case "viewProject":
        return data || {};
      default:
        return data || {};
    }
  };

  const [draft, setDraft] = useState(getInitial);

  const upd = (field, val) => setDraft(d => ({ ...d, [field]: val }));

  const toggleScopeTag = (tag) => {
    setDraft(d => {
      const arr = d.scope || [];
      return { ...d, scope: arr.includes(tag) ? arr.filter(s => s !== tag) : [...arr, tag] };
    });
  };

  const handlePdfScan = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      show("Please select a PDF file", "err");
      return;
    }
    setPdfScanning(true);
    try {
      const { extractBidFromPdf } = await import("./utils/pdfBidExtractor.js");
      const extracted = await extractBidFromPdf(file);

      // Pre-fill draft fields (only overwrite if extracted value is non-empty)
      setDraft(d => ({
        ...d,
        name: extracted.name || d.name,
        gc: extracted.gc || d.gc,
        value: extracted.value || d.value,
        due: extracted.due || d.due,
        bidDate: extracted.bidDate || d.bidDate,
        phase: extracted.phase || d.phase,
        address: extracted.address || d.address,
        scope: extracted.scope.length > 0 ? extracted.scope : d.scope,
        notes: extracted.notes || d.notes,
        month: extracted.month || d.month,
      }));

      // Also store the PDF as an attachment
      const reader = new FileReader();
      reader.onload = () => {
        const attachment = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type || "application/pdf",
          size: file.size,
          data: reader.result,
          uploaded: new Date().toISOString(),
        };
        setDraft(d => ({ ...d, attachments: [...(d.attachments || []), attachment] }));
      };
      reader.readAsDataURL(file);

      show(`Extracted: ${extracted.name || "bid"} — $${(extracted.value || 0).toLocaleString()} — review fields`, "ok");
    } catch (err) {
      console.error("[pdf-scan]", err);
      show("PDF scan failed: " + (err.message || "Unknown error"), "err");
    } finally {
      setPdfScanning(false);
    }
  };

  const handleSave = () => {
    switch (type) {
      case "editBid": {
        if (!draft.name) { show("Bid name is required", "err"); return; }
        if (!draft.gc) { show("GC name is required", "err"); return; }
        if (draft.value && isNaN(Number(draft.value))) { show("Value must be a number", "err"); return; }
        if (isNew) {
          app.setBids(prev => [...prev, { ...draft, id: app.nextId() }]);
          show("Bid added");
        } else {
          // If status was changed to "awarded" via the dropdown, auto-convert to project
          const wasPreviouslyAwarded = data && data.status === "awarded";
          if (draft.status === "awarded" && !wasPreviouslyAwarded) {
            // Check if project already exists for this bid
            if (!app.projects.some(p => p.bidId === draft.id)) {
              const awardedBid = { ...draft, convertedToProject: true };
              app.setBids(prev => prev.map(b => b.id === draft.id ? awardedBid : b));
              const newProject = {
                id: app.nextId(),
                name: awardedBid.name,
                gc: awardedBid.gc,
                contract: awardedBid.value || 0,
                billed: 0, progress: 0,
                phase: awardedBid.phase || awardedBid.sector || "",
                start: awardedBid.due || "",
                end: "", pm: awardedBid.estimator || "",
                laborBudget: 0, laborHours: 0, laborCost: 0, materialCost: 0,
                address: awardedBid.address || "",
                attachments: awardedBid.attachments || [],
                bidId: awardedBid.id,
                notes: awardedBid.notes || "",
                scope: awardedBid.scope || [],
                sector: awardedBid.sector || "",
                contact: awardedBid.contact || "",
                assignedForeman: awardedBid.assignedForeman || null,
              };
              app.setProjects(prev => [...prev, newProject]);
              show(`Bid awarded! Project created: ${draft.name}`);
            } else {
              app.setBids(prev => prev.map(b => b.id === draft.id ? { ...draft, convertedToProject: true } : b));
              show("Bid awarded! Project already exists.");
            }
          } else {
            app.setBids(prev => prev.map(b => b.id === draft.id ? { ...draft } : b));
            show("Bid updated");
          }
        }
        break;
      }
      case "editProject": {
        if (!draft.name) { show("Project name is required", "err"); return; }
        if (!draft.gc) { show("GC name is required", "err"); return; }
        if (isNew) {
          app.setProjects(prev => [...prev, { ...draft, id: app.nextId() }]);
          show("Project added");
        } else {
          app.setProjects(prev => prev.map(p => p.id === draft.id ? { ...draft } : p));
          show("Project updated");
        }
        break;
      }
      case "editContact": {
        if (!draft.name) { show("Contact name is required", "err"); return; }
        if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) { show("Invalid email format", "err"); return; }
        if (draft.phone && !/^[\d\s\-().+]+$/.test(draft.phone)) { show("Invalid phone format", "err"); return; }
        if (isNew) {
          app.setContacts(prev => [...prev, { ...draft, id: app.nextId() }]);
          show("Contact added");
        } else {
          app.setContacts(prev => prev.map(c => c.id === draft.id ? { ...draft } : c));
          show("Contact updated");
        }
        break;
      }
      case "logCall": {
        if (!draft.contact || !draft.note) { show("Contact and note required", "err"); return; }
        const contact = app.contacts.find(c => c.name === draft.contact);
        app.setCallLog(prev => [
          { ...draft, id: app.nextId(), company: contact?.company || draft.company, time: draft.time },
          ...prev
        ]);
        show("Call logged");
        break;
      }
      default:
        break;
    }
    setModal(null);
  };

  // ── Award / Un-award a bid ──
  const handleAwardBid = () => {
    if (!draft.id || !draft.name) return;
    // Don't create duplicate project if already linked
    if (app.projects.some(p => p.bidId === draft.id)) {
      const awardedBid = { ...draft, status: "awarded", convertedToProject: true };
      app.setBids(prev => prev.map(b => b.id === awardedBid.id ? awardedBid : b));
      show("Bid awarded! Project already exists.");
      setModal(null);
      return;
    }
    // Update bid status to "awarded" and mark as converted
    const awardedBid = { ...draft, status: "awarded", convertedToProject: true };
    app.setBids(prev => prev.map(b => b.id === awardedBid.id ? awardedBid : b));
    // Create project from bid data
    const newProject = {
      id: app.nextId(),
      name: awardedBid.name,
      gc: awardedBid.gc,
      contract: awardedBid.value || 0,
      billed: 0,
      progress: 0,
      phase: awardedBid.phase || awardedBid.sector || "",
      start: awardedBid.due || "",
      end: "",
      pm: awardedBid.estimator || "",
      laborBudget: 0,
      laborHours: 0,
      laborCost: 0,
      materialCost: 0,
      address: awardedBid.address || "",
      attachments: awardedBid.attachments || [],
      bidId: awardedBid.id, // link back to the bid
      notes: awardedBid.notes || "",
      scope: awardedBid.scope || [],
      sector: awardedBid.sector || "",
      contact: awardedBid.contact || "",
      assignedForeman: awardedBid.assignedForeman || null,
    };
    app.setProjects(prev => [...prev, newProject]);
    show(`Bid awarded! Project created: ${awardedBid.name}`);
    setModal(null);
  };

  const handleUnAwardBid = () => {
    if (!draft.id) return;
    if (!confirm("Un-award this bid? The linked project will be removed.")) return;
    // Set bid back to submitted and clear converted flag
    const updBid = { ...draft, status: "submitted", convertedToProject: false };
    app.setBids(prev => prev.map(b => b.id === updBid.id ? updBid : b));
    // Remove linked project
    app.setProjects(prev => prev.filter(p => p.bidId !== draft.id));
    show("Bid un-awarded. Project removed.");
    setDraft(updBid);
  };

  const handleDelete = () => {
    if (!draft.id) return;
    const label = type === "editBid" || type === "viewBid" ? "bid"
      : type === "editProject" || type === "viewProject" ? "project"
      : type === "editContact" ? "contact" : "item";
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
    switch (type) {
      case "editBid": case "viewBid":
        app.setBids(prev => prev.filter(b => b.id !== draft.id));
        show("Bid deleted"); break;
      case "editProject": case "viewProject":
        app.setProjects(prev => prev.filter(p => p.id !== draft.id));
        show("Project deleted"); break;
      case "editContact":
        app.setContacts(prev => prev.filter(c => c.id !== draft.id));
        show("Contact deleted"); break;
      default: break;
    }
    setModal(null);
  };

  const close = () => { setModal(null); app.setInitialProjTab?.("overview"); };

  // Robust overlay dismiss — only close if BOTH mousedown AND mouseup land on the overlay
  const overlayMouseDown = useRef(false);
  const handleOverlayDown = (e) => { overlayMouseDown.current = (e.target === e.currentTarget); };
  const handleOverlayUp = (closeFn) => (e) => {
    if (overlayMouseDown.current && e.target === e.currentTarget) closeFn();
    overlayMouseDown.current = false;
  };

  // ── View Bid (read-only) ──
  if (type === "viewBid") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Bid Details</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="flex-col gap-12">
            <div><span className="text-dim text-xs">NAME</span><div className="font-semi">{draft.name}</div></div>
            <div><span className="text-dim text-xs">GC</span><div>{draft.gc}</div></div>
            <div className="flex gap-16">
              <div><span className="text-dim text-xs">VALUE</span><div className="font-mono text-amber">{fmt(draft.value)}</div></div>
              <div><span className="text-dim text-xs">DUE</span><div>{draft.due || "TBD"}</div></div>
              <div><span className="text-dim text-xs">STATUS</span><div className={`badge ${STATUS_BADGE[draft.status]}`}>{draft.status}</div></div>
            </div>
            {draft.risk && <div><span className="text-dim text-xs">RISK</span><div className={`badge ${RISK_BADGE[draft.risk]}`}>{draft.risk}</div></div>}
            {draft.scope?.length > 0 && (
              <div><span className="text-dim text-xs">SCOPE</span>
                <div className="flex gap-4 flex-wrap mt-4">{draft.scope.map((s, i) => <span key={i} className="badge badge-muted">{s}</span>)}</div>
              </div>
            )}
            {draft.notes && <div><span className="text-dim text-xs">NOTES</span><div className="text-sm">{draft.notes}</div></div>}
            {draft.contact && <div><span className="text-dim text-xs">CONTACT</span><div className="text-sm">{draft.contact}</div></div>}
          </div>
          <div className="modal-actions flex-between">
            <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>
            <div className="flex gap-8">
              {draft.status !== "awarded" && (
                <button className="btn badge-green-outlined" onClick={handleAwardBid}>
                  Award Bid
                </button>
              )}
              {draft.status === "awarded" && (
                <button className="btn badge-yellow-outlined" onClick={handleUnAwardBid}>
                  Un-award
                </button>
              )}
              <button className="btn btn-ghost" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => setModal({ type: "editBid", data: draft })}>Edit</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── View Project (read-only) ──
  if (type === "viewProject") {
    const projCOs = app.changeOrders.filter(co => String(co.projectId) === String(draft.id));
    const projRFIs = (app.rfis || []).filter(r => String(r.projectId) === String(draft.id));
    const projSubmittals = (app.submittals || []).filter(s => String(s.projectId) === String(draft.id));
    const projCrew = app.teamSchedule.filter(s => String(s.projectId) === String(draft.id));
    const projTime = app.timeEntries.filter(t => String(t.projectId) === String(draft.id) && t.clockOut);
    const totalHrs = projTime.reduce((s, t) => s + (t.totalHours || 0), 0);
    const projInvoices = app.invoices.filter(i => String(i.projectId) === String(draft.id));
    const totalBilled = projInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const remaining = (draft.contract || 0) - totalBilled;
    const [projTab, setProjTab] = useState(app.initialProjTab || "overview");
    const projTabs = ["overview", "change orders", "submittals", "rfis", "areas", "punch", "log", "reports", "team", "financials", "closeout", "sound", "logistics", "notes"];
    const [coFormOpen, setCoFormOpen] = useState(false);
    const [coEditId, setCoEditId] = useState(null);
    const [coExpandedId, setCoExpandedId] = useState(null);
    const coNextNum = projCOs.length > 0 ? Math.max(...projCOs.map(c => parseInt(String(c.number || "0").replace(/\D/g, "")) || 0)) + 1 : 1;
    const [coForm, setCoForm] = useState({ number: "", description: "", type: "add", amount: "", status: "draft", date: new Date().toISOString().slice(0, 10), notes: "", tmTicketIds: [] });
    const coNetTotal = projCOs.reduce((s, c) => s + (c.type === "no cost" ? 0 : (c.amount || 0)), 0);
    const coAdjustedContract = (draft.contract || 0) + coNetTotal;
    const coStatusColor = (st) => ({ draft: "badge-ghost", submitted: "badge-amber", approved: "badge-green", rejected: "badge-red" }[st] || "badge-ghost");
    const coTypeLabel = (t) => ({ add: "+Add", deduct: "-Deduct", "no cost": "No Cost" }[t] || t);
    const resetCoForm = () => { setCoForm({ number: "", description: "", type: "add", amount: "", status: "draft", date: new Date().toISOString().slice(0, 10), notes: "", tmTicketIds: [] }); setCoEditId(null); };
    const saveCo = () => {
      const num = coForm.number || `CO-${String(coNextNum).padStart(3, "0")}`;
      const amt = parseFloat(coForm.amount) || 0;
      const finalAmt = coForm.type === "deduct" ? -Math.abs(amt) : coForm.type === "no cost" ? 0 : Math.abs(amt);
      const tmIds = coForm.tmTicketIds || [];
      if (coEditId) {
        // Clear changeOrderId from previously linked T&M tickets that are no longer selected
        const oldCo = app.changeOrders.find(c => c.id === coEditId);
        const removedTmIds = (oldCo?.tmTicketIds || []).filter(id => !tmIds.includes(id));
        if (removedTmIds.length > 0) {
          app.setTmTickets(prev => prev.map(t => removedTmIds.includes(t.id) ? { ...t, changeOrderId: undefined } : t));
        }
        app.setChangeOrders(prev => prev.map(c => c.id === coEditId ? { ...c, number: num, description: coForm.description, type: coForm.type, amount: finalAmt, status: coForm.status, date: coForm.date, notes: coForm.notes, tmTicketIds: tmIds } : c));
      } else {
        const newCo = { id: crypto.randomUUID(), projectId: draft.id, number: num, description: coForm.description, type: coForm.type, amount: finalAmt, status: coForm.status, date: coForm.date, notes: coForm.notes, tmTicketIds: tmIds, created: new Date().toISOString() };
        app.setChangeOrders(prev => [...prev, newCo]);
        // Set changeOrderId on linked T&M tickets
        if (tmIds.length > 0) {
          app.setTmTickets(prev => prev.map(t => tmIds.includes(t.id) ? { ...t, changeOrderId: newCo.id } : t));
        }
      }
      // Update changeOrderId on newly linked T&M tickets
      if (coEditId && tmIds.length > 0) {
        app.setTmTickets(prev => prev.map(t => tmIds.includes(t.id) ? { ...t, changeOrderId: coEditId } : t));
      }
      resetCoForm();
      setCoFormOpen(false);
    };
    const editCo = (co) => {
      setCoForm({ number: co.number || "", description: co.description || co.desc || "", type: co.type || "add", amount: String(Math.abs(co.amount || 0)), status: co.status || "draft", date: co.date || co.submitted || "", notes: co.notes || "", tmTicketIds: co.tmTicketIds || [] });
      setCoEditId(co.id);
      setCoFormOpen(true);
    };
    const deleteCo = (coId) => {
      const reason = prompt("Reason for voiding this change order:");
      if (reason !== null) {
        app.setChangeOrders(prev => prev.map(c => c.id === coId ? softDelete(c, app.auth?.name, reason) : c));
        app.show("Change order voided");
      }
    };
    const exportCoPdf = async (co) => {
      const { generateChangeOrderPdf } = await import("./utils/changeOrderPdf.js");
      const projectCOs = app.changeOrders.filter(c => c.projectId === co.projectId);
      await generateChangeOrderPdf(draft, { ...co, description: co.description || co.desc }, app.company || {}, projectCOs);
    };

    const generateSubPackage = async () => {
      const { generateSubmittalsPackagePdf } = await import("./utils/submittalsPackagePdf.js");
      await generateSubmittalsPackagePdf(draft, projSubmittals, app.contacts || [], app.company || {});
    };

    // ── Submittal state ──
    const [subFormOpen, setSubFormOpen] = useState(false);
    const [subEditId, setSubEditId] = useState(null);
    const [subExpandedId, setSubExpandedId] = useState(null);
    const [subFilter, setSubFilter] = useState("all");
    const subNextNum = projSubmittals.length > 0 ? Math.max(...projSubmittals.map(s => parseInt(String(s.number || "0").replace(/\D/g, "")) || 0)) + 1 : 1;
    const [subForm, setSubForm] = useState({ number: "", description: "", specSection: "", type: "product data", status: "not started", dateSubmitted: "", dateReturned: "", notes: "" });
    const SUB_STATUSES = ["not started", "in progress", "submitted", "approved", "revise & resubmit", "rejected"];
    const SUB_TYPES = ["product data", "shop drawings", "samples", "test reports"];
    const SUB_STATUS_BADGE = (st) => {
      const map = { "not started": { bg: "var(--bg3)", color: "var(--text3)" }, "in progress": { bg: "var(--blue-dim)", color: "var(--blue)" }, "submitted": { bg: "var(--amber-dim)", color: "var(--amber)" }, "approved": { bg: "var(--green-dim)", color: "var(--green)" }, "revise & resubmit": { bg: "rgba(249,115,22,0.15)", color: "#f97316" }, "rejected": { bg: "var(--red-dim)", color: "var(--red)" } };
      return map[st] || map["not started"];
    };
    const subDaysOut = (s) => {
      if (!s.dateSubmitted || s.status === "not started") return null;
      if (s.dateReturned) return null;
      const submitted = new Date(s.dateSubmitted);
      const now = new Date();
      return Math.floor((now - submitted) / 86400000);
    };
    const resetSubForm = () => { setSubForm({ number: "", description: "", specSection: "", type: "product data", status: "not started", dateSubmitted: "", dateReturned: "", notes: "" }); setSubEditId(null); };
    const saveSub = () => {
      if (!subForm.description) { show("Description required", "err"); return; }
      const num = subForm.number || String(subNextNum);
      if (subEditId) {
        app.setSubmittals(prev => prev.map(s => s.id === subEditId ? { ...s, number: num, description: subForm.description, specSection: subForm.specSection, type: subForm.type, status: subForm.status, dateSubmitted: subForm.dateSubmitted, dateReturned: subForm.dateReturned, notes: subForm.notes } : s));
      } else {
        const newSub = { id: crypto.randomUUID(), projectId: draft.id, number: num, description: subForm.description, specSection: subForm.specSection, type: subForm.type, status: subForm.status, dateSubmitted: subForm.dateSubmitted, dateReturned: subForm.dateReturned, notes: subForm.notes, created: new Date().toISOString() };
        app.setSubmittals(prev => [...prev, newSub]);
      }
      resetSubForm();
      setSubFormOpen(false);
      show(subEditId ? "Submittal updated" : "Submittal added", "ok");
    };
    const editSub = (s) => {
      setSubForm({ number: s.number || "", description: s.description || "", specSection: s.specSection || s.spec || "", type: s.type || "product data", status: s.status || "not started", dateSubmitted: s.dateSubmitted || s.date || "", dateReturned: s.dateReturned || "", notes: s.notes || "" });
      setSubEditId(s.id);
      setSubFormOpen(true);
    };
    const deleteSub = (sId) => { if (confirm("Delete this submittal?")) app.setSubmittals(prev => prev.filter(s => s.id !== sId)); };
    const filteredSubmittals = projSubmittals.filter(s => {
      if (subFilter === "all") return true;
      if (subFilter === "pending") return ["not started", "in progress", "submitted"].includes(s.status);
      if (subFilter === "approved") return s.status === "approved";
      if (subFilter === "action") return ["revise & resubmit", "rejected"].includes(s.status);
      return true;
    });

    // ── RFI state ──
    const [rfiFormOpen, setRfiFormOpen] = useState(false);
    const [rfiEditId, setRfiEditId] = useState(null);
    const [rfiExpandedId, setRfiExpandedId] = useState(null);
    const [rfiFilter, setRfiFilter] = useState("all");
    const rfiNextNum = projRFIs.length > 0 ? Math.max(...projRFIs.map(r => parseInt(String(r.number || "0").replace(/\D/g, "")) || 0)) + 1 : 1;
    const RFI_INIT = { number: "", subject: "", question: "", specRef: "", priority: "Medium", status: "Draft", dateSubmitted: "", dateAnswered: "", answer: "", submittedTo: draft.gc || "", costImpact: "None", costAmount: "", scheduleImpact: "None", scheduleDays: "" };
    const [rfiForm, setRfiForm] = useState({ ...RFI_INIT });
    const RFI_STATUSES = ["Draft", "Submitted", "Answered", "Closed"];
    const RFI_PRIORITIES = ["Low", "Medium", "High", "Critical"];
    const RFI_STATUS_BADGE = (st) => {
      const map = { "Draft": { bg: "var(--bg3)", color: "var(--text3)" }, "Submitted": { bg: "var(--amber-dim)", color: "var(--amber)" }, "Answered": { bg: "var(--blue-dim)", color: "var(--blue)" }, "Closed": { bg: "var(--green-dim)", color: "var(--green)" } };
      return map[st] || map["Draft"];
    };
    const RFI_PRIORITY_BADGE = (p) => {
      const map = { "Low": "badge-green", "Medium": "badge-amber", "High": "badge-red", "Critical": "badge-red" };
      return map[p] || "badge-ghost";
    };
    const rfiDaysOut = (r) => {
      if (!r.dateSubmitted || r.status === "Draft") return null;
      if (r.dateAnswered || r.status === "Closed" || r.status === "Answered") return null;
      const submitted = new Date(r.dateSubmitted);
      const now = new Date();
      return Math.floor((now - submitted) / 86400000);
    };
    const rfiAvgResponse = (() => {
      const answered = projRFIs.filter(r => r.dateSubmitted && r.dateAnswered);
      if (answered.length === 0) return null;
      const totalDays = answered.reduce((s, r) => s + Math.floor((new Date(r.dateAnswered) - new Date(r.dateSubmitted)) / 86400000), 0);
      return Math.round(totalDays / answered.length);
    })();
    const rfiOpenCount = projRFIs.filter(r => r.status === "Draft" || r.status === "Submitted").length;
    const rfiOverdueCount = projRFIs.filter(r => { const d = rfiDaysOut(r); return d !== null && d > 7; }).length;
    const resetRfiForm = () => { setRfiForm({ ...RFI_INIT }); setRfiEditId(null); };
    const saveRfi = () => {
      if (!rfiForm.subject) { show("Subject required", "err"); return; }
      const num = rfiForm.number || `RFI-${String(rfiNextNum).padStart(3, "0")}`;
      const costAmt = rfiForm.costImpact === "Yes" ? (parseFloat(rfiForm.costAmount) || 0) : 0;
      const schDays = rfiForm.scheduleImpact === "Yes" ? (parseInt(rfiForm.scheduleDays) || 0) : 0;
      if (rfiEditId) {
        app.setRfis(prev => prev.map(r => r.id === rfiEditId ? { ...r, number: num, subject: rfiForm.subject, question: rfiForm.question, specRef: rfiForm.specRef, priority: rfiForm.priority, status: rfiForm.status, dateSubmitted: rfiForm.dateSubmitted, dateAnswered: rfiForm.dateAnswered, answer: rfiForm.answer, submittedTo: rfiForm.submittedTo, costImpact: rfiForm.costImpact, costAmount: costAmt, scheduleImpact: rfiForm.scheduleImpact, scheduleDays: schDays } : r));
      } else {
        const newRfi = { id: crypto.randomUUID(), projectId: draft.id, number: num, subject: rfiForm.subject, question: rfiForm.question, specRef: rfiForm.specRef, priority: rfiForm.priority, status: rfiForm.status, dateSubmitted: rfiForm.dateSubmitted, dateAnswered: rfiForm.dateAnswered, answer: rfiForm.answer, submittedTo: rfiForm.submittedTo, costImpact: rfiForm.costImpact, costAmount: costAmt, scheduleImpact: rfiForm.scheduleImpact, scheduleDays: schDays, created: new Date().toISOString() };
        app.setRfis(prev => [...prev, newRfi]);
      }
      resetRfiForm();
      setRfiFormOpen(false);
      show(rfiEditId ? "RFI updated" : "RFI added", "ok");
    };
    const editRfi = (r) => {
      setRfiForm({ number: r.number || "", subject: r.subject || "", question: r.question || "", specRef: r.specRef || "", priority: r.priority || "Medium", status: r.status || "Draft", dateSubmitted: r.dateSubmitted || "", dateAnswered: r.dateAnswered || "", answer: r.answer || "", submittedTo: r.submittedTo || draft.gc || "", costImpact: r.costImpact || "None", costAmount: String(r.costAmount || ""), scheduleImpact: r.scheduleImpact || "None", scheduleDays: String(r.scheduleDays || "") });
      setRfiEditId(r.id);
      setRfiFormOpen(true);
    };
    const deleteRfi = (rId) => { if (confirm("Delete this RFI?")) app.setRfis(prev => prev.filter(r => r.id !== rId)); };
    const filteredRFIs = projRFIs.filter(r => {
      if (rfiFilter === "all") return true;
      if (rfiFilter === "open") return r.status === "Draft" || r.status === "Submitted";
      if (rfiFilter === "answered") return r.status === "Answered" || r.status === "Closed";
      if (rfiFilter === "overdue") { const d = rfiDaysOut(r); return d !== null && d > 7; }
      return true;
    });

    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal modal-lg" style={{ maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">{draft.name}</div>
              <div className="text-xs text-muted">{draft.gc} · {draft.phase} · {draft.pm || "Unassigned"}</div>
            </div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-4 mb-12 border-b overflow-x-auto" style={{ paddingBottom: "var(--space-2)" }}>
            {projTabs.map(tab => (
              <button key={tab} className={`btn btn-sm ${projTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjTab(tab)}
                style={{ whiteSpace: "nowrap", fontSize: "var(--text-tab)", textTransform: "capitalize" }}>{tab}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingBottom: "var(--space-4)" }}>
            {/* ── Overview ── */}
            {projTab === "overview" && (() => {
              const projPhases = draft.phases || getDefaultPhases(draft);
              const updateProjPhases = (newPhases) => {
                const updated = { ...draft, phases: newPhases };
                setDraft(updated);
                app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
              };
              const activePhase = projPhases.find(p => p.status === "in progress");
              const completedCount = projPhases.filter(p => p.status === "completed").length;
              return (
                <div className="flex-col gap-12">
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-dim text-xs">CONTRACT</span><div className="font-mono text-amber font-bold">{fmt(draft.contract)}</div></div>
                    <div><span className="text-dim text-xs">BILLED</span><div className="font-mono">{fmt(totalBilled)}</div></div>
                    <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono" style={{ color: remaining > 0 ? "var(--green)" : "var(--red)" }}>{fmt(remaining)}</div></div>
                    <div><span className="text-dim text-xs">PROGRESS</span><div className="font-mono">{draft.progress}%</div></div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${draft.progress}%` }} /></div>
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-dim text-xs">ADDRESS</span><div className="text-sm">{draft.address || "—"}</div></div>
                    {draft.suite && <div><span className="text-dim text-xs">SUITE</span><div className="text-sm">{draft.suite}</div></div>}
                    {draft.parking && <div><span className="text-dim text-xs">PARKING</span><div className="text-sm">{draft.parking}</div></div>}
                  </div>
                  <div className="flex gap-16">
                    <div><span className="text-dim text-xs">START</span><div>{draft.start || "TBD"}</div></div>
                    <div><span className="text-dim text-xs">END</span><div>{draft.end || "TBD"}</div></div>
                  </div>
                  <div><span className="text-dim text-xs">SCOPE</span>
                    <div className="flex gap-4 flex-wrap mt-4">{(draft.scope || []).map(s => <span key={s} className="badge badge-amber fs-10">{s}</span>)}</div>
                  </div>

                  {/* ── Phase Tracker ── */}
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "var(--space-4) var(--space-4)" }}>
                    <div className="flex-between mb-12">
                      <div>
                        <div style={{ fontSize: "var(--text-tab)", textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text3)", fontWeight: "var(--weight-semi)" }}>Construction Phases</div>
                        <div className="fs-11 text-muted mt-2">
                          {completedCount} of {projPhases.length} complete
                          {activePhase ? ` · Active: ${activePhase.name}` : ""}
                        </div>
                      </div>
                    </div>
                    <PhaseTracker
                      phases={projPhases}
                      employees={app.employees || []}
                      onUpdate={updateProjPhases}
                      readOnly={true}
                    />
                  </div>

                  <div className="flex gap-16 flex-wrap mt-4">
                    <div><span className="text-dim text-xs">LABOR HOURS</span><div className="font-mono">{totalHrs.toFixed(1)}h</div></div>
                    <div><span className="text-dim text-xs">CHANGE ORDERS</span><div className="font-mono">{projCOs.length}</div></div>
                    <div><span className="text-dim text-xs">RFIs</span><div className="font-mono">{projRFIs.length}</div></div>
                    <div><span className="text-dim text-xs">SUBMITTALS</span><div className="font-mono">{projSubmittals.length}</div></div>
                  </div>

                  {/* T&M Exposure */}
                  {(() => {
                    const projTm = (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id));
                    const pending = projTm.filter(t => t.status === "submitted").reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0) + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                    const approved = projTm.filter(t => t.status === "approved").reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0) + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                    if (projTm.length === 0) return null;
                    return (
                      <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--bg3)", borderRadius: "var(--radius-control)", marginTop: "var(--space-3)" }}>
                        <div className="fs-11 text-dim text-uppercase fw-700 mb-8">T&M Exposure</div>
                        <div className="flex gap-16">
                          <div><span className="text-amber fw-700">${pending.toLocaleString()}</span> <span className="fs-11 text-dim">pending</span></div>
                          <div><span className="text-green fw-700">${approved.toLocaleString()}</span> <span className="fs-11 text-dim">approved</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Production Progress & Areas Complete */}
                  {(() => {
                    const projAreas = (app.areas || []).filter(a => String(a.projectId) === String(draft.id));
                    if (projAreas.length === 0) return null;
                    const complete = projAreas.filter(a => a.status === "complete").length;
                    const totalBudget = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.budgetQty || 0), 0), 0);
                    const totalInstalled = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.installedQty || 0), 0), 0);
                    const pct = totalBudget > 0 ? Math.round((totalInstalled / totalBudget) * 100) : 0;
                    return (
                      <div className="flex gap-12 mt-12">
                        <div className="stat-panel-center">
                          <div className="kpi-large-value">{complete}/{projAreas.length}</div>
                          <div className="fs-11 text-dim">Areas Complete</div>
                        </div>
                        <div className="stat-panel-center">
                          <div className="kpi-large-value">{pct}%</div>
                          <div className="fs-11 text-dim">Production</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Generate Project Status Report ── */}
                  <div className="mt-16">
                    <button className="btn btn-primary" style={{ width: "100%", height: 44, fontSize: "var(--text-label)", fontWeight: "var(--weight-bold)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
                      onClick={() => {
                        const projAreas = (app.areas || []).filter(a => String(a.projectId) === String(draft.id));
                        const complete = projAreas.filter(a => a.status === "complete").length;
                        const totalBudget = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.budgetQty || 0), 0), 0);
                        const totalInstalled = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.installedQty || 0), 0), 0);
                        const pct = totalBudget > 0 ? Math.round((totalInstalled / totalBudget) * 100) : 0;
                        const projTm = (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id));
                        const tmTotal = projTm.reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0) + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost), 0), 0);
                        const openPunch = (app.punchItems || []).filter(p => String(p.projectId) === String(draft.id) && p.status !== "resolved" && p.status !== "complete").length;
                        const report = [
                          `PROJECT STATUS REPORT — ${draft.name}`,
                          `Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}`,
                          `Prepared by: ${auth?.name || "EBC"}`,
                          ``,
                          `CONTRACT: $${(draft.contract || 0).toLocaleString()}  |  BILLED: $${totalBilled.toLocaleString()}  |  REMAINING: $${remaining.toLocaleString()}`,
                          `PROGRESS: ${draft.progress}%  |  PRODUCTION: ${pct}%`,
                          ``,
                          `AREAS: ${complete}/${projAreas.length} complete`,
                          ...projAreas.map(a => `  ${a.name} (${a.floor} ${a.zone}) — ${a.status}`),
                          ``,
                          `CHANGE ORDERS: ${projCOs.length} (${projCOs.filter(c => c.status === "approved").length} approved, ${projCOs.filter(c => c.status !== "approved" && c.status !== "rejected").length} pending)`,
                          `RFIs: ${projRFIs.length} (${projRFIs.filter(r => r.status === "open").length} open)`,
                          `SUBMITTALS: ${projSubmittals.length}`,
                          `T&M EXPOSURE: $${tmTotal.toLocaleString()} across ${projTm.length} tickets`,
                          `OPEN PUNCH: ${openPunch} items`,
                          `LABOR HOURS: ${totalHrs.toFixed(1)}h`,
                          ``,
                          `--- EBC Construction | Generated by EBC-OS ---`,
                        ].join("\n");
                        navigator.clipboard.writeText(report).then(() => {
                          show(t("Report copied") + " — " + t("paste into email or document"), "ok");
                        }).catch(() => {
                          // Fallback: show in alert
                          window.prompt("Copy this report:", report);
                        });
                      }}>
                      <ClipboardList size={16} /> {t("Generate Report")} ({t("Copy to Clipboard")})
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Change Orders ── */}
            {projTab === "change orders" && (
              <div className="flex-col gap-12">
                {/* Summary bar */}
                <div className="flex gap-16 flex-wrap field-card-compact">
                  <div><span className="text-dim text-xs">ORIGINAL CONTRACT</span><div className="font-mono text-sm">{fmt(draft.contract)}</div></div>
                  <div><span className="text-dim text-xs">NET CO VALUE</span><div className="font-mono text-sm" style={{ color: coNetTotal >= 0 ? "var(--green)" : "var(--red)" }}>{coNetTotal >= 0 ? "+" : ""}{fmt(coNetTotal)}</div></div>
                  <div><span className="text-dim text-xs">ADJUSTED CONTRACT</span><div className="font-mono text-sm font-bold text-amber">{fmt(coAdjustedContract)}</div></div>
                  <div><span className="text-dim text-xs">TOTAL COs</span><div className="font-mono text-sm">{projCOs.length}</div></div>
                </div>

                {/* Add CO button */}
                <div className="flex-between">
                  <span className="text-xs text-dim">{projCOs.filter(c => c.status === "approved").length} approved, {projCOs.filter(c => c.status === "submitted" || c.status === "pending").length} pending</span>
                  <button className="btn btn-sm btn-primary" onClick={() => { resetCoForm(); setCoFormOpen(true); }}>+ Add Change Order</button>
                </div>

                {/* CO Form (add/edit) */}
                {coFormOpen && (
                  <div className="card card-amber-accent">
                    <div className="flex-between mb-8">
                      <span className="font-semi text-sm">{coEditId ? "Edit Change Order" : "New Change Order"}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setCoFormOpen(false); resetCoForm(); }}>Cancel</button>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-100">
                        <label className="text-xs text-dim">CO Number</label>
                        <input className="input input-sm" placeholder={`CO-${String(coNextNum).padStart(3, "0")}`} value={coForm.number} onChange={e => setCoForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-200">
                        <label className="text-xs text-dim">Description</label>
                        <input className="input input-sm" placeholder="Describe the change..." value={coForm.description} onChange={e => setCoForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">Type</label>
                        <select className="input input-sm" value={coForm.type} onChange={e => setCoForm(p => ({ ...p, type: e.target.value }))}>
                          <option value="add">Add</option>
                          <option value="deduct">Deduct</option>
                          <option value="no cost">No Cost</option>
                        </select>
                      </div>
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">Amount ($)</label>
                        <input className="input input-sm" type="number" step="0.01" placeholder="0.00" value={coForm.amount} onChange={e => setCoForm(p => ({ ...p, amount: e.target.value }))} disabled={coForm.type === "no cost"} />
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Status</label>
                        <select className="input input-sm" value={coForm.status} onChange={e => setCoForm(p => ({ ...p, status: e.target.value }))}>
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date</label>
                        <input className="input input-sm" type="date" value={coForm.date} onChange={e => setCoForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Notes</label>
                      <textarea className="input input-sm" rows={2} placeholder="Additional notes..." value={coForm.notes} onChange={e => setCoForm(p => ({ ...p, notes: e.target.value }))} className="resize-v" />
                    </div>
                    {/* T&M Backup Selection */}
                    {(() => {
                      const projTm = (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id));
                      const availableTm = projTm.filter(t => {
                        // Show tickets not linked to another CO (or linked to this CO being edited)
                        if (coForm.tmTicketIds.includes(t.id)) return true;
                        const linkedToOther = app.changeOrders.some(c => c.id !== coEditId && (c.tmTicketIds || []).includes(t.id));
                        return !linkedToOther;
                      });
                      if (availableTm.length === 0) return null;
                      const selectedTm = projTm.filter(t => coForm.tmTicketIds.includes(t.id));
                      const tmLaborTotal = selectedTm.reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0), 0);
                      const tmMatTotal = selectedTm.reduce((s, t) => s + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                      return (
                        <div className="mb-8" style={{ padding: "var(--space-3)", background: "var(--bg2)", borderRadius: "var(--radius-control)", border: "1px solid var(--border)" }}>
                          <label className="text-xs text-dim text-uppercase fw-700">T&M Backup</label>
                          <div style={{ maxHeight: 160, overflowY: "auto", marginTop: "var(--space-2)" }}>
                            {availableTm.map(t => {
                              const checked = coForm.tmTicketIds.includes(t.id);
                              const tLabor = (t.laborEntries || []).reduce((s, l) => s + l.hours * l.rate, 0);
                              const tMat = (t.materialEntries || []).reduce((s, m) => s + m.qty * m.unitCost * (1 + (m.markup || 0) / 100), 0);
                              return (
                                <label key={t.id} className="flex-center-gap-8 cursor-pointer fs-13" style={{ padding: "var(--space-1) 0" }}>
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const newIds = checked ? coForm.tmTicketIds.filter(id => id !== t.id) : [...coForm.tmTicketIds, t.id];
                                    const newSelected = projTm.filter(tm => newIds.includes(tm.id));
                                    const autoAmt = newSelected.reduce((s, tm) => s + (tm.laborEntries || []).reduce((ls, l) => ls + l.hours * l.rate, 0) + (tm.materialEntries || []).reduce((ms, m) => ms + m.qty * m.unitCost * (1 + (m.markup || 0) / 100), 0), 0);
                                    setCoForm(p => ({ ...p, tmTicketIds: newIds, amount: autoAmt > 0 ? String(Math.round(autoAmt * 100) / 100) : p.amount }));
                                  }} />
                                  <span style={{ fontWeight: "var(--weight-semi)", minWidth: 60 }}>{t.ticketNumber || t.id}</span>
                                  <span className="text-dim" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description || "—"}</span>
                                  <span className="font-mono text-xs">${(tLabor + tMat).toLocaleString()}</span>
                                </label>
                              );
                            })}
                          </div>
                          {selectedTm.length > 0 && (
                            <div style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: "var(--text-label)" }}>
                              <span>{selectedTm.length} ticket{selectedTm.length !== 1 ? "s" : ""} selected</span>
                              <span className="fw-700 text-amber">T&M Total: ${(tmLaborTotal + tmMatTotal).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex gap-8 justify-end">
                      <button className="btn btn-sm btn-primary" onClick={saveCo} disabled={!coForm.description}>{coEditId ? "Update CO" : "Save CO"}</button>
                    </div>
                  </div>
                )}

                {/* CO List */}
                {projCOs.length === 0 && !coFormOpen ? (
                  <div className="text-sm text-dim text-center p-32">No change orders yet. Click "+ Add Change Order" to create one.</div>
                ) : (
                  projCOs.map(co => {
                    const isExpanded = coExpandedId === co.id;
                    const desc = co.description || co.desc || co.name || `CO #${co.id}`;
                    const coStatus = co.status || "draft";
                    return (
                      <div key={co.id} className="card" style={{ padding: 0, marginBottom: "var(--space-2)", overflow: "hidden", border: isExpanded ? "1px solid var(--amber-dim)" : undefined }}>
                        {/* CO row - clickable */}
                        <div style={{ padding: "var(--space-3) var(--space-3)", cursor: "pointer" }} onClick={() => setCoExpandedId(isExpanded ? null : co.id)}>
                          <div className="flex-between">
                            <div className="flex gap-8 align-center">
                              <span style={{ fontSize: "var(--text-xs)", opacity: 0.4 }}>{isExpanded ? "\u25BC" : "\u25B6"}</span>
                              <span className="font-mono text-xs text-dim" style={{ minWidth: 56 }}>{co.number || `CO-${co.id}`}</span>
                              <span className="font-semi text-sm">{desc}</span>
                            </div>
                            <div className="flex gap-8 align-center">
                              <span className={`badge ${coStatusColor(coStatus)}`} style={{ fontSize: "var(--text-xs)", textTransform: "capitalize" }}>{coStatus}</span>
                              <span className="font-mono text-sm" style={{ color: (co.amount || 0) < 0 ? "var(--red)" : (co.amount || 0) > 0 ? "var(--green)" : "var(--text2)", minWidth: 70, textAlign: "right" }}>
                                {(co.amount || 0) < 0 ? "-" : (co.amount || 0) > 0 ? "+" : ""}{fmt(Math.abs(co.amount || 0))}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted mt-2" style={{ marginLeft: "var(--space-6)" }}>
                            {coTypeLabel(co.type || "add")} &middot; {co.date || co.submitted || "No date"}
                          </div>
                        </div>
                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={{ padding: "var(--space-2) var(--space-3) var(--space-3)", borderTop: "1px solid var(--border)", background: "var(--bg3)" }}>
                            <div className="flex gap-16 flex-wrap mb-8">
                              <div><span className="text-dim text-xs">TYPE</span><div className="text-sm">{coTypeLabel(co.type || "add")}</div></div>
                              <div><span className="text-dim text-xs">STATUS</span><div className="text-sm text-capitalize">{coStatus}</div></div>
                              <div><span className="text-dim text-xs">DATE</span><div className="text-sm">{co.date || co.submitted || "—"}</div></div>
                              <div><span className="text-dim text-xs">AMOUNT</span><div className="font-mono text-sm">{fmt(co.amount || 0)}</div></div>
                              {co.approved && <div><span className="text-dim text-xs">APPROVED</span><div className="text-sm">{co.approved}</div></div>}
                              {co.created && <div><span className="text-dim text-xs">CREATED</span><div className="text-sm">{new Date(co.created).toLocaleDateString()}</div></div>}
                            </div>
                            {(co.notes || co.description || co.desc) && (
                              <div className="mb-8">
                                <span className="text-dim text-xs">DESCRIPTION / NOTES</span>
                                <div className="text-sm ws-pre-wrap">{co.description || co.desc}{co.notes ? `\n\nNotes: ${co.notes}` : ""}</div>
                              </div>
                            )}
                            {/* Linked T&M Backup */}
                            {co.tmTicketIds && co.tmTicketIds.length > 0 && (() => {
                              const linked = (app.tmTickets || []).filter(t => co.tmTicketIds.includes(t.id));
                              if (!linked.length) return null;
                              const totalLabor = linked.reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0), 0);
                              const totalMat = linked.reduce((s, t) => s + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                              return (
                                <div style={{ marginTop: "var(--space-1)", marginBottom: "var(--space-2)", padding: "var(--space-3)", background: "var(--bg2)", borderRadius: "var(--radius-control)", border: "1px solid var(--border)" }}>
                                  <div className="fs-11 text-dim text-uppercase fw-700 mb-8">Linked T&M Backup</div>
                                  {linked.map(t => {
                                    const tLabor = (t.laborEntries || []).reduce((s, l) => s + l.hours * l.rate, 0);
                                    const tMat = (t.materialEntries || []).reduce((s, m) => s + m.qty * m.unitCost * (1 + (m.markup || 0) / 100), 0);
                                    return (
                                      <div key={t.id} className="queue-row fs-13">
                                        <div className="flex-between">
                                          <span className="font-semi">{t.ticketNumber || t.id}</span>
                                          <span className="text-muted">{t.date || "—"}</span>
                                        </div>
                                        <div className="text-muted fs-12 mt-2">{t.description || "—"}</div>
                                        <div className="flex gap-12 mt-4 fs-12">
                                          <span>Labor: <strong>${tLabor.toLocaleString()}</strong></span>
                                          <span>Material: <strong>${tMat.toLocaleString()}</strong></span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div style={{ marginTop: "var(--space-2)", display: "flex", justifyContent: "space-between", fontWeight: "var(--weight-bold)", fontSize: "var(--text-label)" }}>
                                    <span>T&M Total</span>
                                    <span className="text-amber">${(totalLabor + totalMat).toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="flex gap-8">
                              <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); editCo(co); }}>Edit</button>
                              <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); exportCoPdf(co); }}>Export PDF</button>
                              <button className="btn btn-sm btn-ghost text-red" onClick={(e) => { e.stopPropagation(); deleteCo(co.id); }}>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Submittals ── */}
            {projTab === "submittals" && (
              <div>
                {/* Header + Add button */}
                <div className="flex-between mb-8">
                  <div className="flex-center-gap-6">
                    <span className="font-semi text-sm">Submittal Log</span>
                    <span className="badge badge-blue fs-9">{projSubmittals.length}</span>
                  </div>
                  <div className="flex gap-6">
                    {projSubmittals.length > 0 && (
                      <button className="btn btn-ghost btn-sm flex-center-gap-4" onClick={generateSubPackage} >
                        <FileDown size={13} /> Generate Package
                      </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => { resetSubForm(); setSubFormOpen(!subFormOpen); }}>+ Add Submittal</button>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="flex gap-4 mb-8 flex-wrap">
                  {[["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["action", "Action Required"]].map(([key, label]) => (
                    <button key={key} className={`btn btn-sm ${subFilter === key ? "btn-primary" : "btn-ghost"} fs-10`} onClick={() => setSubFilter(key)}>
                      {label}
                      {key === "action" && projSubmittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length > 0 && (
                        <span style={{ marginLeft: "var(--space-1)", background: "var(--red)", color: "#fff", borderRadius: "var(--radius-pill)", padding: "0 5px", fontSize: "var(--text-xs)" }}>
                          {projSubmittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Add/Edit Form */}
                {subFormOpen && (
                  <div className="card" style={{ padding: "var(--space-4)", border: "1px solid var(--blue-dim)", background: "var(--bg3)", marginBottom: "var(--space-3)" }}>
                    <div className="flex-between mb-8">
                      <span className="font-semi text-sm">{subEditId ? "Edit Submittal" : "New Submittal"}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setSubFormOpen(false); resetSubForm(); }}>Cancel</button>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div style={{ flex: "0 0 80px" }}>
                        <label className="text-xs text-dim">Number</label>
                        <input className="input input-sm" placeholder={String(subNextNum)} value={subForm.number} onChange={e => setSubForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-200">
                        <label className="text-xs text-dim">Description</label>
                        <input className="input input-sm" placeholder="e.g. Metal stud framing — 20ga 3-5/8&quot; studs" value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="flex-0-100">
                        <label className="text-xs text-dim">Spec Section</label>
                        <input className="input input-sm" placeholder="09 21 16" value={subForm.specSection} onChange={e => setSubForm(p => ({ ...p, specSection: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div style={{ flex: "0 0 150px" }}>
                        <label className="text-xs text-dim">Type</label>
                        <select className="input input-sm" value={subForm.type} onChange={e => setSubForm(p => ({ ...p, type: e.target.value }))}>
                          {SUB_TYPES.map(t => <option key={t} value={t}>{t.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: "0 0 170px" }}>
                        <label className="text-xs text-dim">Status</label>
                        <select className="input input-sm" value={subForm.status} onChange={e => setSubForm(p => ({ ...p, status: e.target.value }))}>
                          {SUB_STATUSES.map(st => <option key={st} value={st}>{st.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Submitted</label>
                        <input className="input input-sm" type="date" value={subForm.dateSubmitted} onChange={e => setSubForm(p => ({ ...p, dateSubmitted: e.target.value }))} />
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Returned</label>
                        <input className="input input-sm" type="date" value={subForm.dateReturned} onChange={e => setSubForm(p => ({ ...p, dateReturned: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Notes</label>
                      <textarea className="input input-sm" rows={2} placeholder="Additional notes..." value={subForm.notes} onChange={e => setSubForm(p => ({ ...p, notes: e.target.value }))} className="resize-v" />
                    </div>
                    <div className="flex gap-8 justify-end">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setSubFormOpen(false); resetSubForm(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={saveSub}>{subEditId ? "Update" : "Add"} Submittal</button>
                    </div>
                  </div>
                )}

                {/* Submittal Table */}
                {filteredSubmittals.length === 0 ? (
                  <div className="text-sm text-dim text-center p-24">
                    {projSubmittals.length === 0 ? "No submittals — click \"+ Add Submittal\" to create one" : "No submittals match this filter"}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Description</th>
                          <th style={{ width: 80 }}>Spec</th>
                          <th style={{ width: 100 }}>Type</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 90 }}>Submitted</th>
                          <th style={{ width: 90 }}>Returned</th>
                          <th style={{ width: 70 }}>Days Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmittals.map(s => {
                          const days = subDaysOut(s);
                          const expanded = subExpandedId === s.id;
                          const stBadge = SUB_STATUS_BADGE(s.status);
                          return (
                            <Fragment key={s.id}>
                              <tr className="cursor-pointer" onClick={() => setSubExpandedId(expanded ? null : s.id)}>
                                <td className="num">{s.number}</td>
                                <td className="font-semi" style={{ fontSize: "var(--text-label)" }}>{s.description || s.name || "—"}</td>
                                <td className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>{s.specSection || s.spec || "—"}</td>
                                <td className="text-xs text-capitalize">{s.type || "—"}</td>
                                <td>
                                  <span className="badge" style={{ background: stBadge.bg, color: stBadge.color, fontSize: "var(--text-xs)", textTransform: "capitalize" }}>{s.status}</span>
                                </td>
                                <td className="text-xs">{s.dateSubmitted || s.date || "—"}</td>
                                <td className="text-xs">{s.dateReturned || "—"}</td>
                                <td className="num" style={{ color: days !== null && days > 14 ? "var(--red)" : undefined, fontWeight: days !== null && days > 14 ? 700 : undefined }}>
                                  {days !== null ? `${days}d` : "—"}
                                </td>
                              </tr>
                              {expanded && (
                                <tr>
                                  <td colSpan={8} style={{ padding: 0, background: "var(--bg3)" }}>
                                    <div className="p-16">
                                      <div className="flex gap-16 flex-wrap mb-8">
                                        <div><span className="text-dim text-xs">TYPE</span><div className="text-sm text-capitalize">{s.type || "—"}</div></div>
                                        <div><span className="text-dim text-xs">SPEC SECTION</span><div className="text-sm font-mono">{s.specSection || s.spec || "—"}</div></div>
                                        <div><span className="text-dim text-xs">STATUS</span><div><span className="badge" style={{ background: stBadge.bg, color: stBadge.color, fontSize: "var(--text-xs)", textTransform: "capitalize" }}>{s.status}</span></div></div>
                                        <div><span className="text-dim text-xs">DATE SUBMITTED</span><div className="text-sm">{s.dateSubmitted || s.date || "—"}</div></div>
                                        <div><span className="text-dim text-xs">DATE RETURNED</span><div className="text-sm">{s.dateReturned || "—"}</div></div>
                                        {days !== null && <div><span className="text-dim text-xs">DAYS OUT</span><div className="text-sm" style={{ color: days > 14 ? "var(--red)" : "var(--amber)", fontWeight: "var(--weight-bold)" }}>{days} days{days > 14 ? " ⚠" : ""}</div></div>}
                                      </div>
                                      {s.notes && <div className="mb-8"><span className="text-dim text-xs">NOTES</span><div className="text-sm ws-pre-wrap">{s.notes}</div></div>}
                                      <div className="text-xs text-muted mb-8">Created: {s.created ? new Date(s.created).toLocaleDateString() : "—"}</div>
                                      <div className="flex gap-8">
                                        <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); editSub(s); }}>Edit</button>
                                        <button className="btn btn-sm btn-ghost text-red" onClick={(e) => { e.stopPropagation(); deleteSub(s.id); }}>Delete</button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary stats */}
                {projSubmittals.length > 0 && (
                  <div className="flex gap-16 flex-wrap" style={{ marginTop: "var(--space-3)", padding: "var(--space-2) 0", borderTop: "1px solid var(--border)" }}>
                    <div className="text-xs"><span className="text-dim">Total:</span> <span className="font-mono">{projSubmittals.length}</span></div>
                    <div className="text-xs"><span className="text-green">Approved:</span> <span className="font-mono">{projSubmittals.filter(s => s.status === "approved").length}</span></div>
                    <div className="text-xs"><span className="text-amber">Submitted:</span> <span className="font-mono">{projSubmittals.filter(s => s.status === "submitted").length}</span></div>
                    <div className="text-xs"><span className="text-red">Action Req:</span> <span className="font-mono">{projSubmittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length}</span></div>
                    {projSubmittals.some(s => { const d = subDaysOut(s); return d !== null && d > 14; }) && (
                      <div className="text-xs text-red fw-700">Overdue: {projSubmittals.filter(s => { const d = subDaysOut(s); return d !== null && d > 14; }).length}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── RFIs ── */}
            {projTab === "rfis" && (
              <div className="flex-col gap-12">
                {/* Summary stats */}
                <div className="flex gap-16 flex-wrap field-card-compact">
                  <div><span className="text-dim text-xs">TOTAL RFIs</span><div className="font-mono text-sm">{projRFIs.length}</div></div>
                  <div><span className="text-dim text-xs">OPEN</span><div className="font-mono text-sm" style={{ color: rfiOpenCount > 0 ? "var(--amber)" : "var(--green)" }}>{rfiOpenCount}</div></div>
                  <div><span className="text-dim text-xs">OVERDUE (&gt;7d)</span><div className="font-mono text-sm" style={{ color: rfiOverdueCount > 0 ? "var(--red)" : "var(--green)" }}>{rfiOverdueCount}</div></div>
                  <div><span className="text-dim text-xs">AVG RESPONSE</span><div className="font-mono text-sm">{rfiAvgResponse !== null ? rfiAvgResponse + " days" : "—"}</div></div>
                </div>

                {/* Filters + Add button */}
                <div className="flex-between flex-wrap gap-8">
                  <div className="flex gap-4">
                    {["all", "open", "answered", "overdue"].map(f => (
                      <button key={f} className={`btn btn-sm ${rfiFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setRfiFilter(f)}
                        style={{ fontSize: "var(--text-xs)", textTransform: "capitalize" }}>{f}{f === "overdue" && rfiOverdueCount > 0 ? ` (${rfiOverdueCount})` : ""}</button>
                    ))}
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => { resetRfiForm(); setRfiFormOpen(true); }}>+ Add RFI</button>
                </div>

                {/* RFI Form (add/edit) */}
                {rfiFormOpen && (
                  <div className="card card-amber-accent">
                    <div className="flex-between mb-8">
                      <span className="font-semi text-sm">{rfiEditId ? "Edit RFI" : "New RFI"}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setRfiFormOpen(false); resetRfiForm(); }}>Cancel</button>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">RFI #</label>
                        <input className="input input-sm" placeholder={`RFI-${String(rfiNextNum).padStart(3, "0")}`} value={rfiForm.number} onChange={e => setRfiForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-200">
                        <label className="text-xs text-dim">Subject *</label>
                        <input className="input input-sm" placeholder="RFI subject/title" value={rfiForm.subject} onChange={e => setRfiForm(p => ({ ...p, subject: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Question / Description</label>
                      <textarea className="input" rows={3} placeholder="Describe the question or information needed..." value={rfiForm.question} onChange={e => setRfiForm(p => ({ ...p, question: e.target.value }))} className="w-full fs-12" />
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-1 min-w-150">
                        <label className="text-xs text-dim">Spec / Drawing Reference</label>
                        <input className="input input-sm" placeholder="e.g. Section 09 29 00, Dwg A-201" value={rfiForm.specRef} onChange={e => setRfiForm(p => ({ ...p, specRef: e.target.value }))} />
                      </div>
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">Priority</label>
                        <select className="input input-sm" value={rfiForm.priority} onChange={e => setRfiForm(p => ({ ...p, priority: e.target.value }))}>
                          {RFI_PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                      </div>
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">Status</label>
                        <select className="input input-sm" value={rfiForm.status} onChange={e => setRfiForm(p => ({ ...p, status: e.target.value }))}>
                          {RFI_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Submitted</label>
                        <input type="date" className="input input-sm" value={rfiForm.dateSubmitted} onChange={e => setRfiForm(p => ({ ...p, dateSubmitted: e.target.value }))} />
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Answered</label>
                        <input type="date" className="input input-sm" value={rfiForm.dateAnswered} onChange={e => setRfiForm(p => ({ ...p, dateAnswered: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-150">
                        <label className="text-xs text-dim">Submitted To</label>
                        <input className="input input-sm" placeholder="GC / Architect name" value={rfiForm.submittedTo} onChange={e => setRfiForm(p => ({ ...p, submittedTo: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Answer / Response</label>
                      <textarea className="input" rows={2} placeholder="Response received..." value={rfiForm.answer} onChange={e => setRfiForm(p => ({ ...p, answer: e.target.value }))} className="w-full fs-12" />
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Cost Impact</label>
                        <select className="input input-sm" value={rfiForm.costImpact} onChange={e => setRfiForm(p => ({ ...p, costImpact: e.target.value }))}>
                          <option value="None">None</option>
                          <option value="TBD">TBD</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {rfiForm.costImpact === "Yes" && (
                        <div className="flex-0-140">
                          <label className="text-xs text-dim">Cost Amount ($)</label>
                          <input type="number" className="input input-sm" placeholder="0" value={rfiForm.costAmount} onChange={e => setRfiForm(p => ({ ...p, costAmount: e.target.value }))} />
                        </div>
                      )}
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Schedule Impact</label>
                        <select className="input input-sm" value={rfiForm.scheduleImpact} onChange={e => setRfiForm(p => ({ ...p, scheduleImpact: e.target.value }))}>
                          <option value="None">None</option>
                          <option value="TBD">TBD</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {rfiForm.scheduleImpact === "Yes" && (
                        <div className="flex-0-140">
                          <label className="text-xs text-dim">Days Delayed</label>
                          <input type="number" className="input input-sm" placeholder="0" value={rfiForm.scheduleDays} onChange={e => setRfiForm(p => ({ ...p, scheduleDays: e.target.value }))} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-8 justify-end">
                      <button className="btn btn-sm btn-ghost" onClick={() => { setRfiFormOpen(false); resetRfiForm(); }}>Cancel</button>
                      <button className="btn btn-sm btn-primary" onClick={saveRfi}>{rfiEditId ? "Update RFI" : "Add RFI"}</button>
                    </div>
                  </div>
                )}

                {/* RFI List */}
                {filteredRFIs.length === 0 ? (
                  <div className="text-center text-muted p-32">
                    <div style={{ marginBottom: "var(--space-2)", display: "flex", justifyContent: "center" }}><ClipboardList style={{ width: 32, height: 32, opacity: 0.4 }} /></div>
                    <div className="text-sm">{rfiFilter === "all" ? "No RFIs yet" : `No ${rfiFilter} RFIs`}</div>
                    <div className="text-xs text-dim mt-4">Click "+ Add RFI" to create one</div>
                  </div>
                ) : (
                  <div className="flex-col gap-4">
                    {filteredRFIs.sort((a, b) => {
                      const numA = parseInt(String(a.number || "0").replace(/\D/g, "")) || 0;
                      const numB = parseInt(String(b.number || "0").replace(/\D/g, "")) || 0;
                      return numB - numA;
                    }).map(r => {
                      const days = rfiDaysOut(r);
                      const isOverdue = days !== null && days > 7;
                      const stBadge = RFI_STATUS_BADGE(r.status);
                      const isExpanded = rfiExpandedId === r.id;
                      return (
                        <div key={r.id} className="card" style={{
                          padding: "var(--space-3) var(--space-3)",
                          borderLeft: `3px solid ${stBadge.color}`,
                          cursor: "pointer",
                          background: isOverdue ? "rgba(239,68,68,0.06)" : undefined,
                        }} onClick={() => setRfiExpandedId(isExpanded ? null : r.id)}>
                          <div className="flex-between items-start">
                            <div className="flex-1">
                              <div className="flex gap-8 items-center flex-wrap">
                                <span className="font-mono text-xs font-bold text-amber">{r.number}</span>
                                <span className="text-sm font-semi">{r.subject}</span>
                              </div>
                              <div className="flex gap-6 mt-4 flex-wrap flex-center">
                                <span style={{ display: "inline-block", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semi)", background: stBadge.bg, color: stBadge.color }}>{r.status}</span>
                                <span className={`badge ${RFI_PRIORITY_BADGE(r.priority)} fs-9`}>{r.priority}</span>
                                {r.submittedTo && <span className="text-xs text-muted">To: {r.submittedTo}</span>}
                                {r.specRef && <span className="text-xs text-muted">Ref: {r.specRef}</span>}
                                {days !== null && (
                                  <span className="text-xs font-mono" style={{ color: isOverdue ? "var(--red)" : "var(--amber)", fontWeight: isOverdue ? 700 : 400 }}>
                                    {days}d outstanding{isOverdue ? " ⚠" : ""}
                                  </span>
                                )}
                                {r.costImpact && r.costImpact !== "None" && (
                                  <span className="text-xs text-amber">
                                    Cost: {r.costImpact === "Yes" ? fmt(r.costAmount || 0) : "TBD"}
                                  </span>
                                )}
                                {r.scheduleImpact && r.scheduleImpact !== "None" && (
                                  <span className="text-xs text-amber">
                                    Sched: {r.scheduleImpact === "Yes" ? `${r.scheduleDays || 0}d` : "TBD"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4" style={{ flexShrink: 0 }}>
                              <button className="btn btn-sm btn-ghost fs-10" onClick={e => { e.stopPropagation(); editRfi(r); }}>Edit</button>
                              <button className="btn btn-sm btn-ghost" style={{ fontSize: "var(--text-xs)", color: "var(--red)" }} onClick={e => { e.stopPropagation(); deleteRfi(r.id); }}>Del</button>
                            </div>
                          </div>
                          {/* Expanded detail */}
                          {isExpanded && (
                            <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
                              {r.question && (
                                <div className="mb-8">
                                  <div className="text-xs text-dim font-semi">QUESTION</div>
                                  <div className="text-sm ws-pre-wrap">{r.question}</div>
                                </div>
                              )}
                              {r.answer && (
                                <div className="mb-8">
                                  <div className="text-xs text-dim font-semi">ANSWER</div>
                                  <div className="text-sm ws-pre-wrap text-green">{r.answer}</div>
                                </div>
                              )}
                              <div className="flex gap-16 flex-wrap text-xs text-muted">
                                {r.dateSubmitted && <span>Submitted: {r.dateSubmitted}</span>}
                                {r.dateAnswered && <span>Answered: {r.dateAnswered}</span>}
                                {r.dateSubmitted && r.dateAnswered && (
                                  <span>Response time: {Math.floor((new Date(r.dateAnswered) - new Date(r.dateSubmitted)) / 86400000)} days</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Crew ── */}
            {projTab === "team" && (
              <div>
                {projCrew.length === 0 ? <div className="text-sm text-dim text-center p-24">No team assigned</div> : (
                  <table className="data-table">
                    <thead><tr><th>Employee</th><th>Days</th><th>Hours</th></tr></thead>
                    <tbody>
                      {projCrew.map(s => {
                        const emp = app.employees.find(e => String(e.id) === String(s.employeeId));
                        const days = ["mon","tue","wed","thu","fri"].filter(d => s.days?.[d]).length;
                        return (
                          <tr key={s.id}>
                            <td className="font-semi">{emp?.name || "Unknown"}<div className="text-xs text-muted">{emp?.role}</div></td>
                            <td>{days}d/wk</td>
                            <td>{s.hours?.start || "6:30"} – {s.hours?.end || "3:00"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <div className="text-xs text-dim mt-8">Total labor logged: <span className="font-mono">{totalHrs.toFixed(1)}h</span></div>
              </div>
            )}

            {/* ── Financials ── */}
            {projTab === "financials" && (() => {
              const approvedCOTotal = projCOs.filter(c => c.status === "approved").reduce((s, c) => s + (c.amount || 0), 0);
              const pendingCOTotal = projCOs.filter(c => c.status !== "approved" && c.status !== "rejected").reduce((s, c) => s + (c.amount || 0), 0);
              return (
              <div>
                <div className="flex gap-16 mb-16 flex-wrap">
                  <div><span className="text-dim text-xs">CONTRACT</span><div className="font-mono text-amber">{fmt(draft.contract)}</div></div>
                  <div><span className="text-dim text-xs">APPROVED COs</span><div className="font-mono text-green">{fmt(approvedCOTotal)}</div></div>
                  <div><span className="text-dim text-xs">PENDING COs</span><div className="font-mono" style={{color: pendingCOTotal > 0 ? "var(--red)" : "var(--text3)"}}>{fmt(pendingCOTotal)}</div></div>
                  <div><span className="text-dim text-xs">REVISED</span><div className="font-mono font-bold">{fmt((draft.contract || 0) + approvedCOTotal)}</div></div>
                  <div><span className="text-dim text-xs">INVOICED</span><div className="font-mono">{fmt(totalBilled)}</div></div>
                  <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono" style={{ color: remaining > 0 ? "var(--green)" : "var(--red)" }}>{fmt(remaining)}</div></div>
                </div>
                {/* Labor budget vs actual */}
                {(draft.laborBudget > 0 || draft.laborCost > 0) && (
                  <div className="flex gap-16 mb-16 flex-wrap">
                    <div><span className="text-dim text-xs">LABOR BUDGET</span><div className="font-mono">{fmt(draft.laborBudget || 0)}</div></div>
                    <div><span className="text-dim text-xs">LABOR SPENT</span><div className="font-mono" style={{ color: (draft.laborCost || 0) > (draft.laborBudget || 0) ? "var(--red)" : "var(--text)" }}>{fmt(draft.laborCost || 0)}</div></div>
                    <div><span className="text-dim text-xs">LABOR REMAINING</span><div className="font-mono" style={{ color: ((draft.laborBudget || 0) - (draft.laborCost || 0)) > 0 ? "var(--green)" : "var(--red)" }}>{fmt((draft.laborBudget || 0) - (draft.laborCost || 0))}</div></div>
                  </div>
                )}
                {projInvoices.length > 0 && (
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {projInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>{inv.number}</td>
                          <td>{inv.date}</td>
                          <td className="font-mono">{fmt(inv.amount)}</td>
                          <td><span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "pending" ? "badge-amber" : "badge-red"}`}>{inv.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              );
            })()}

            {/* ── Closeout ── */}
            {projTab === "closeout" && (() => {
              const CLOSEOUT_ITEMS = [
                { id: "punch_list", label: "Final punch list completed", responsible: "Foreman" },
                { id: "final_walkthrough", label: "Final walk-through with GC", responsible: "PM" },
                { id: "as_builts", label: "As-built drawings submitted", responsible: "PM" },
                { id: "warranty_letter", label: "Warranty letter submitted", responsible: "PM" },
                { id: "lien_waiver_cond", label: "Final lien waiver (conditional) submitted", responsible: "PM" },
                { id: "lien_waiver_uncond", label: "Final lien waiver (unconditional) submitted", responsible: "PM" },
                { id: "final_invoice", label: "Final invoice submitted", responsible: "PM" },
                { id: "final_payment", label: "Final payment received", responsible: "Office" },
                { id: "retainage_invoice", label: "Retainage invoice submitted", responsible: "PM" },
                { id: "retainage_received", label: "Retainage received", responsible: "Office" },
                { id: "om_manuals", label: "O&M manuals submitted (if applicable)", responsible: "PM" },
                { id: "photos_archived", label: "Project photos archived", responsible: "PM" },
                { id: "tools_returned", label: "Tools/equipment returned", responsible: "Foreman" },
                { id: "lessons_learned", label: "Lessons learned documented", responsible: "PM" },
              ];
              const closeout = draft.closeout || { items: [], completedDate: null, notes: "" };
              const itemMap = {};
              (closeout.items || []).forEach(it => { itemMap[it.id] = it; });
              const completedCount = CLOSEOUT_ITEMS.filter(ci => itemMap[ci.id]?.done).length;
              const pct = Math.round((completedCount / CLOSEOUT_ITEMS.length) * 100);
              const isOverdue = draft.end && new Date(draft.end) < new Date();
              const coTotal = projCOs.reduce((s, c) => s + (c.amount || 0), 0);
              const approvedCOs = projCOs.filter(c => c.status === "approved").reduce((s, c) => s + (c.amount || 0), 0);
              const revisedContract = (draft.contract || 0) + coTotal;
              const paidInvoices = projInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
              const retainageHeld = Math.round(revisedContract * 0.10);
              const remainingBalance = revisedContract - totalBilled;

              const updateCloseoutItem = (itemId, field, value) => {
                const items = [...(closeout.items || [])];
                const idx = items.findIndex(it => it.id === itemId);
                if (idx >= 0) {
                  items[idx] = { ...items[idx], [field]: value };
                } else {
                  items.push({ id: itemId, done: false, dateCompleted: null, notes: "", responsible: "", [field]: value });
                }
                const allDone = CLOSEOUT_ITEMS.every(ci => items.find(it => it.id === ci.id)?.done);
                const newCloseout = { ...closeout, items, completedDate: allDone ? (closeout.completedDate || new Date().toISOString().slice(0, 10)) : null };
                const updated = { ...draft, closeout: newCloseout };
                app.setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                setDraft(updated);
              };

              const toggleItem = (itemId) => {
                const current = itemMap[itemId]?.done || false;
                const items = [...(closeout.items || [])];
                const idx = items.findIndex(it => it.id === itemId);
                const newVal = !current;
                const dateVal = newVal ? new Date().toISOString().slice(0, 10) : null;
                if (idx >= 0) {
                  items[idx] = { ...items[idx], done: newVal, dateCompleted: dateVal };
                } else {
                  items.push({ id: itemId, done: newVal, dateCompleted: dateVal, notes: "", responsible: "" });
                }
                const allDone = CLOSEOUT_ITEMS.every(ci => items.find(it => it.id === ci.id)?.done);
                const newCloseout = { ...closeout, items, completedDate: allDone ? (closeout.completedDate || new Date().toISOString().slice(0, 10)) : null };
                const updated = { ...draft, closeout: newCloseout };
                app.setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                setDraft(updated);
              };

              return (
              <div className="flex-col gap-12">
                {/* Progress bar */}
                <div>
                  <div className="flex-between mb-4">
                    <span className="text-xs font-semi" style={{ color: pct === 100 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--text-muted)" }}>
                      Closeout Progress: {pct}% ({completedCount}/{CLOSEOUT_ITEMS.length})
                    </span>
                    {closeout.completedDate && <span className="badge badge-green fs-10">Closed {closeout.completedDate}</span>}
                  </div>
                  <div className="progress-bar" style={{ height: 10, borderRadius: "var(--radius-control)" }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="card p-12">
                  <div className="text-xs font-semi mb-8 text-amber">FINANCIAL SUMMARY</div>
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-dim text-xs">ORIGINAL CONTRACT</span><div className="font-mono">{fmt(draft.contract)}</div></div>
                    <div><span className="text-dim text-xs">CHANGE ORDERS</span><div className="font-mono">{fmt(coTotal)} ({projCOs.length})</div></div>
                    <div><span className="text-dim text-xs">REVISED CONTRACT</span><div className="font-mono font-bold text-amber">{fmt(revisedContract)}</div></div>
                    <div><span className="text-dim text-xs">TOTAL BILLED</span><div className="font-mono">{fmt(totalBilled)}</div></div>
                    <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono" style={{ color: remainingBalance > 0 ? "var(--amber)" : "var(--green)" }}>{fmt(remainingBalance)}</div></div>
                    <div><span className="text-dim text-xs">RETAINAGE (EST 10%)</span><div className="font-mono text-red">{fmt(retainageHeld)}</div></div>
                    <div><span className="text-dim text-xs">PAID</span><div className="font-mono text-green">{fmt(paidInvoices)}</div></div>
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="text-xs font-semi mb-8">CLOSEOUT CHECKLIST</div>
                  <div className="flex-col gap-4">
                    {CLOSEOUT_ITEMS.map((ci, idx) => {
                      const item = itemMap[ci.id] || {};
                      const isDone = item.done || false;
                      const itemOverdue = !isDone && isOverdue;
                      const bgColor = isDone ? "rgba(16,185,129,0.08)" : itemOverdue ? "rgba(239,68,68,0.08)" : "rgba(224,148,34,0.05)";
                      const borderColor = isDone ? "var(--green)" : itemOverdue ? "var(--red)" : "var(--border)";
                      return (
                        <div key={ci.id} className="card" style={{ padding: "var(--space-2) var(--space-3)", borderLeft: `3px solid ${borderColor}`, background: bgColor }}>
                          <div className="flex-between items-start">
                            <div className="flex gap-8 items-start flex-1">
                              <button onClick={() => toggleItem(ci.id)}
                                className="btn-bare fs-16 flex-shrink-0" style={{ padding: 0, lineHeight: 1, marginTop: "var(--space-1)" }}>
                                {isDone ? <CheckSquare size={16} className="text-green" /> : <Square size={16} className="text-dim" />}
                              </button>
                              <div className="flex-1">
                                <div className="text-sm" style={{ textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.7 : 1 }}>
                                  <span className="fw-500">{idx + 1}. {ci.label}</span>
                                </div>
                                <div className="flex gap-8 mt-4 flex-wrap flex-center">
                                  <span className={`badge ${isDone ? "badge-green" : itemOverdue ? "badge-red" : "badge-amber"} fs-9`}>
                                    {isDone ? "Complete" : itemOverdue ? "Overdue" : "Pending"}
                                  </span>
                                  <span className="text-xs text-muted">Resp: {item.responsible || ci.responsible}</span>
                                  {item.dateCompleted && <span className="text-xs text-muted">{item.dateCompleted}</span>}
                                </div>
                                {/* Inline notes */}
                                <input type="text" placeholder="Notes..." value={item.notes || ""} className="input input-sm"
                                  style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-1)", padding: "var(--space-1) var(--space-2)", width: "100%", maxWidth: 400, background: "transparent", border: "1px solid var(--border)" }}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateCloseoutItem(ci.id, "notes", e.target.value)} />
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, marginLeft: "var(--space-2)" }}>
                              <select value={item.responsible || ci.responsible} className="input input-sm"
                                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-1)", width: 80 }}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateCloseoutItem(ci.id, "responsible", e.target.value)}>
                                <option value="PM">PM</option>
                                <option value="Foreman">Foreman</option>
                                <option value="Office">Office</option>
                                <option value="Emmanuel">Emmanuel</option>
                                <option value="Isai">Isai</option>
                                <option value="Abner">Abner</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Closeout Notes */}
                <div>
                  <div className="text-xs font-semi mb-4">CLOSEOUT NOTES</div>
                  <textarea className="input w-full fs-12" rows={3} placeholder="General closeout notes..." value={closeout.notes || ""}
                    
                    onChange={e => {
                      const newCloseout = { ...closeout, notes: e.target.value };
                      const updated = { ...draft, closeout: newCloseout };
                      app.setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                      setDraft(updated);
                    }} />
                </div>

                {/* Generate Report Button */}
                <div className="flex gap-8">
                  <button className="btn btn-primary fs-11" onClick={async () => {
                    try {
                      const { generateCloseoutPdf } = await import("./utils/closeoutPdf.js");
                      generateCloseoutPdf(draft, {
                        rfis: (app.rfis || []).filter(r => String(r.projectId) === String(draft.id)),
                        submittals: (app.submittals || []).filter(s => String(s.projectId) === String(draft.id)),
                        changeOrders: projCOs,
                        invoices: projInvoices,
                        dailyReports: (app.dailyReports || []).filter(d => String(d.projectId) === String(draft.id)),
                        jsas: (app.jsas || []).filter(j => String(j.projectId) === String(draft.id)),
                        tmTickets: (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id)),
                        closeoutResult: {
                          readinessScore: pct,
                          grade: pct >= 90 ? "A" : pct >= 75 ? "B" : pct >= 50 ? "C" : pct >= 25 ? "D" : "F",
                          summary: `Closeout ${pct}% complete. ${completedCount} of ${CLOSEOUT_ITEMS.length} items done.${closeout.notes ? " Notes: " + closeout.notes : ""}`,
                          checklist: CLOSEOUT_ITEMS.map(ci => ({
                            item: ci.label,
                            status: (itemMap[ci.id]?.done) ? "complete" : "pending",
                            dateCompleted: itemMap[ci.id]?.dateCompleted || "",
                            responsible: itemMap[ci.id]?.responsible || ci.responsible,
                            notes: itemMap[ci.id]?.notes || "",
                          })),
                          financialStatus: {
                            contractValue: draft.contract || 0,
                            totalBilled,
                            remaining: remainingBalance,
                            retainage: retainageHeld,
                            openCOs: projCOs.filter(c => c.status !== "approved" && c.status !== "rejected").length,
                            margin: totalBilled > 0 ? Math.round(((totalBilled - (draft.laborCost || 0) - (draft.materialCost || 0)) / totalBilled) * 100) + "%" : "N/A",
                          },
                        },
                      });
                      show("Closeout PDF exported", "ok");
                    } catch (err) {
                      show("PDF export failed: " + err.message, "err");
                    }
                  }}>
                    Generate Closeout Report (PDF)
                  </button>
                </div>
              </div>
              );
            })()}

            {/* ── Areas ── */}
            {projTab === "areas" && (
              <AreasTab areas={app.areas} productionLogs={app.productionLogs} employees={app.employees} projectId={draft.id} t={app.t} />
            )}

            {/* ── Punch List ── */}
            {projTab === "punch" && (
              <PunchListTab punchItems={app.punchItems} setPunchItems={app.setPunchItems} areas={(app.areas || []).filter(a => String(a.projectId) === String(draft.id))} employees={app.employees} projectId={draft.id} t={app.t} />
            )}

            {/* ── Decision / Communication Log ── */}
            {projTab === "log" && (
              <DecisionLogTab decisionLog={app.decisionLog} setDecisionLog={app.setDecisionLog} projectId={draft.id} employees={app.employees} t={app.t} />
            )}

            {/* ── Daily Reports (PM view of foreman reports) ── */}
            {projTab === "reports" && (() => {
              const projReports = (app.dailyReports || [])
                .filter(r => String(r.projectId) === String(draft.id))
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
              return (
                <div>
                  <div className="flex-between mb-12">
                    <div className="text-sm font-semi">{t("Daily Reports")} ({projReports.length})</div>
                    <span className="text-xs text-muted">{projReports.filter(r => !r.reviewedBy).length} {t("un-reviewed")}</span>
                  </div>
                  {projReports.length === 0 ? (
                    <div className="empty-state" style={{ padding: "var(--space-8)" }}>
                      <div className="empty-icon"><ClipboardList style={{ width: 40, height: 40 }} /></div>
                      <div className="empty-text">{t("No daily reports yet")}</div>
                    </div>
                  ) : (
                    <div className="flex-col gap-8">
                      {projReports.map(r => (
                        <div key={r.id} className="card" style={{ padding: "var(--space-3) var(--space-4)", borderLeft: r.reviewedBy ? "3px solid var(--green)" : "3px solid var(--amber)" }}>
                          <div className="flex-between mb-4">
                            <div>
                              <span className="text-sm font-bold">{r.date}</span>
                              <span className="text-xs text-muted ml-8">{r.foremanName} · {r.crewCount || (r.teamPresent || []).length} crew · {r.totalHours || 0}h</span>
                            </div>
                            {r.reviewedBy ? (
                              <span className="badge badge-green fs-10">{t("Reviewed")}</span>
                            ) : (
                              <button className="btn btn-sm btn-primary" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)" }}
                                onClick={() => {
                                  app.setDailyReports(prev => prev.map(dr => dr.id === r.id ? { ...dr, reviewedBy: auth?.name || "PM", reviewedAt: new Date().toISOString() } : dr));
                                  show(t("Report reviewed"));
                                }}>
                                {t("Mark Reviewed")}
                              </button>
                            )}
                          </div>
                          <div className="text-sm mb-4 ws-pre-wrap">{r.workPerformed}</div>
                          {r.materialsReceived && <div className="text-xs text-muted mb-2"><strong>{t("Materials")}:</strong> {r.materialsReceived}</div>}
                          {r.issues && <div className="text-xs mb-2 text-amber"><strong>{t("Issues")}:</strong> {r.issues}</div>}
                          {r.tomorrowPlan && <div className="text-xs text-dim mb-2"><strong>{t("Tomorrow")}:</strong> {r.tomorrowPlan}</div>}
                          {r.safetyIncident && r.safetyIncident !== "None" && (
                            <div className="text-xs text-red fw-700">{t("SAFETY INCIDENT")}: {r.safetyDescription || r.safetyIncident}</div>
                          )}
                          <div className="text-xs text-dim mt-6">
                            {r.conditions || r.weatherCondition} {r.temperature} · {t("Submitted")} {new Date(r.submittedAt || r.createdAt).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}
                            {r.reviewedBy && ` · ${t("Reviewed by")} ${r.reviewedBy}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Sound Quality Testing ── */}
            {projTab === "sound" && (() => {
              const ROOM_TYPES = [
                { key: "office", label: "Standard Office", stc: "40-45", stcDesc: "Adequate speech privacy", assembly: "3-5/8\" 20ga studs · Single layer 5/8\" Type X each side · 3.5\" batt insulation", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall (SF)", "3.5\" Fiberglass Batt Insulation (SF)"], costSF: 8.50, note: "Standard partition meets basic office privacy." },
                { key: "executive", label: "Executive / Private Office", stc: "45-50", stcDesc: "Good speech privacy", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X one side · 3.5\" batt insulation", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers one side (SF)", "3.5\" Fiberglass Batt Insulation (SF)"], costSF: 11.00, note: "Double layer on one side increases STC without resilient channel." },
                { key: "conference", label: "Conference Room", stc: "50+", stcDesc: "Very good speech privacy", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X one side · Resilient Channel RC-1 · 3.5\" batt insulation", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Fiberglass Batt Insulation (SF)"], costSF: 14.00, note: "RC channel decouples drywall to minimize flanking paths." },
                { key: "medical_exam", label: "Medical / Exam Room", stc: "50-55", stcDesc: "Enhanced privacy (HIPAA)", assembly: "3-5/8\" 20ga studs · Soundbreak XP or QuietRock 545 each side · 3.5\" batt insulation", materials: ["3-5/8\" 20ga Steel Stud (LF)", "QuietRock 545 or Soundbreak XP (SF)", "3.5\" Fiberglass Batt Insulation (SF)"], costSF: 18.00, note: "QuietRock/Soundbreak XP provides STC 52-56 in a single layer — ideal for HIPAA compliance." },
                { key: "hospital_patient", label: "Hospital Patient Room", stc: "55+", stcDesc: "Maximum privacy (FGI Guidelines)", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X each side · Resilient Channel RC-1 · 3.5\" batt insulation", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers each side (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Fiberglass Batt Insulation (SF)"], costSF: 22.00, note: "High-performance assembly per FGI/HICPAC acoustic standards for acute care." },
                { key: "restroom", label: "Restroom / Plumbing Wall", stc: "50+", stcDesc: "Minimize plumbing noise", assembly: "6\" 20ga studs · Double layer 5/8\" Type X each side · Resilient Channel RC-1 · 3.5\" batt insulation", materials: ["6\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Fiberglass Batt Insulation (SF)"], costSF: 16.00, note: "Deeper 6\" cavity for plumbing + RC channel reduces both airborne and impact noise." },
              ];
              const soundTests = draft.soundTests || [];
              const selRT = ROOM_TYPES.find(r => r.key === soundForm.roomType) || ROOM_TYPES[0];
              const wallLFNum = parseFloat(soundForm.wallLF) || 0;
              const estSF = wallLFNum > 0 ? Math.round(wallLFNum * 9) : 0;
              const estCost = estSF > 0 ? Math.round(estSF * selRT.costSF) : 0;

              const saveTest = () => {
                if (!soundForm.roomLabel.trim()) { show("Enter a room label/name", "err"); return; }
                const newTest = {
                  id: crypto.randomUUID(),
                  roomLabel: soundForm.roomLabel.trim(),
                  roomType: soundForm.roomType,
                  wallDetails: soundForm.wallDetails,
                  wallLF: soundForm.wallLF,
                  stc: selRT.stc,
                  assembly: selRT.assembly,
                  materials: selRT.materials,
                  estimatedCost: estCost,
                  estimatedSF: estSF,
                  date: new Date().toISOString().slice(0, 10),
                };
                const updated = { ...draft, soundTests: [...soundTests, newTest] };
                app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
                setDraft(updated);
                setSoundForm({ roomType: "office", roomLabel: "", wallDetails: "", wallLF: "" });
                setShowSoundForm(false);
                show("Acoustic recommendation saved", "ok");
              };

              return (
                <div className="flex-col gap-12">
                  <div className="flex-between">
                    <div className="flex gap-8 flex-center">
                      <Volume2 size={16} className="text-blue" />
                      <div>
                        <div className="font-semi text-sm">Sound Quality Testing</div>
                        <div className="text-xs text-muted">STC-based acoustic recommendations by room type</div>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => setShowSoundForm(v => !v)}>
                      {showSoundForm ? "Cancel" : "+ Add Room"}
                    </button>
                  </div>

                  {showSoundForm && (
                    <div className="card" style={{ padding: "var(--space-4)", border: "1px solid var(--blue-dim)" }}>
                      <div className="text-xs font-semi mb-8 text-blue">NEW ACOUSTIC RECOMMENDATION</div>
                      <div className="flex gap-8 flex-wrap mb-8">
                        <div style={{ flex: "0 0 180px" }}>
                          <label className="text-xs text-dim">Room Label / Name</label>
                          <input className="input input-sm" placeholder="e.g. Suite 200 Conf Room" value={soundForm.roomLabel} onChange={e => setSoundForm(p => ({ ...p, roomLabel: e.target.value }))} />
                        </div>
                        <div style={{ flex: "0 0 220px" }}>
                          <label className="text-xs text-dim">Room Type</label>
                          <select className="input input-sm" value={soundForm.roomType} onChange={e => setSoundForm(p => ({ ...p, roomType: e.target.value }))}>
                            {ROOM_TYPES.map(r => <option key={r.key} value={r.key}>{r.label} (STC {r.stc})</option>)}
                          </select>
                        </div>
                        <div className="flex-0-120">
                          <label className="text-xs text-dim">Wall Linear Feet</label>
                          <input className="input input-sm" type="number" min="0" placeholder="LF" value={soundForm.wallLF} onChange={e => setSoundForm(p => ({ ...p, wallLF: e.target.value }))} />
                        </div>
                      </div>
                      <div className="mb-8">
                        <label className="text-xs text-dim">Existing Wall Details / Notes</label>
                        <textarea className="input input-sm" rows={2} placeholder="Stud size, height, special conditions..." value={soundForm.wallDetails} onChange={e => setSoundForm(p => ({ ...p, wallDetails: e.target.value }))} className="resize-v" />
                      </div>

                      {/* Live recommendation preview */}
                      <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid var(--blue-dim)", borderRadius: "var(--radius-control)", padding: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                        <div className="flex-between mb-6">
                          <span className="text-xs font-semi text-blue">RECOMMENDED ASSEMBLY</span>
                          <span className="badge badge-blue fs-10">STC {selRT.stc}</span>
                        </div>
                        <div className="font-semi text-sm mb-4">{selRT.label} — {selRT.stcDesc}</div>
                        <div className="text-xs mb-6 text-muted" style={{ lineHeight: 1.5 }}>{selRT.assembly}</div>
                        <div className="text-xs text-muted mb-8 text-italic">{selRT.note}</div>
                        <div className="text-xs font-semi mb-4 text-dim">MATERIALS NEEDED:</div>
                        <div className="flex-col gap-2 mb-8">
                          {selRT.materials.map((m, i) => (
                            <div key={i} className="text-xs flex-center-gap-6">
                              <span className="text-green fs-14">✓</span> {m}
                            </div>
                          ))}
                        </div>
                        {estSF > 0 && (
                          <div className="flex gap-12">
                            <div><span className="text-xs text-dim">EST. WALL SF</span><div className="font-mono text-sm">{estSF.toLocaleString()} SF</div></div>
                            <div><span className="text-xs text-dim">EST. ADDITIONAL COST</span><div className="font-mono text-sm text-amber">{fmt(estCost)}</div></div>
                            <div><span className="text-xs text-dim">UNIT RATE</span><div className="font-mono text-sm">${selRT.costSF.toFixed(2)}/SF</div></div>
                          </div>
                        )}
                      </div>

                      <button className="btn btn-sm btn-primary" onClick={saveTest}>Save Recommendation</button>
                    </div>
                  )}

                  {soundTests.length === 0 && !showSoundForm ? (
                    <div className="text-sm text-dim text-center p-32">No acoustic tests added. Click "+ Add Room" to generate a recommendation.</div>
                  ) : (
                    soundTests.map((test, i) => {
                      const rt = ROOM_TYPES.find(r => r.key === test.roomType);
                      return (
                        <div key={test.id || i} className="card p-12">
                          <div className="flex-between mb-4">
                            <div className="flex gap-8 flex-center">
                              <Volume2 size={13} className="text-blue" />
                              <span className="font-semi text-sm">{test.roomLabel}</span>
                              <span className="text-xs text-muted">{rt?.label || test.roomType}</span>
                            </div>
                            <div className="flex gap-8 flex-center">
                              <span className="badge badge-blue fs-10">STC {test.stc}</span>
                              <span className="text-xs text-muted">{test.date}</span>
                              <button className="btn btn-sm btn-ghost text-red btn-link" onClick={() => {
                                const updated = { ...draft, soundTests: soundTests.filter((_, j) => j !== i) };
                                app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
                                setDraft(updated);
                              }}>✕</button>
                            </div>
                          </div>
                          <div className="text-xs text-muted mb-4">{test.assembly}</div>
                          {test.wallDetails && <div className="text-xs text-muted mb-4">Notes: {test.wallDetails}</div>}
                          <div className="flex gap-8 flex-wrap">
                            {test.materials?.map((m, j) => (
                              <span key={j} className="badge badge-muted fs-9">{m}</span>
                            ))}
                          </div>
                          {(test.estimatedCost > 0 || test.estimatedSF > 0) && (
                            <div className="flex gap-12 mt-8">
                              {test.estimatedSF > 0 && <div><span className="text-xs text-dim">WALL SF</span><div className="font-mono text-xs">{test.estimatedSF.toLocaleString()} SF</div></div>}
                              {test.estimatedCost > 0 && <div><span className="text-xs text-dim">EST. COST</span><div className="font-mono text-xs text-amber">{fmt(test.estimatedCost)}</div></div>}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* ── Site Logistics ── */}
            {projTab === "logistics" && (() => {
              const today = new Date().toISOString().slice(0, 10);
              const logKey = `${draft.id}_${today}`;
              const todayLog = siteLogistics[logKey] || {};
              const LOGISTICS_ITEMS = [
                { id: "dumpster", label: "Dumpster doors accessible and able to open", critical: true, icon: "🗑️" },
                { id: "porta_potty", label: "Porta-potty on site and serviced", critical: false, icon: "🚽" },
                { id: "staging_clear", label: "Material staging area clear and organized", critical: false, icon: "📦" },
                { id: "safety_signage", label: "Safety signage posted at all entry points", critical: false, icon: "⚠️" },
                { id: "fire_exit", label: "Fire exits unobstructed", critical: true, icon: "🚪" },
                { id: "first_aid", label: "First aid kit accessible and stocked", critical: false, icon: "🩺" },
                { id: "temp_power", label: "Temporary power / lighting operational", critical: false, icon: "💡" },
                { id: "deliveries_clear", label: "Delivery access path clear", critical: false, icon: "🚚" },
              ];

              const toggleLogItem = (itemId) => {
                const updated = {
                  ...siteLogistics,
                  [logKey]: { ...todayLog, [itemId]: !todayLog[itemId], date: today, projectId: draft.id },
                };
                saveSiteLogistics(updated);
                // Alert PM if critical item is unchecked
                const item = LOGISTICS_ITEMS.find(i => i.id === itemId);
                if (item?.critical && todayLog[itemId]) {
                  show(`⚠️ Alert: "${item.label}" marked unchecked — PM should be notified`, "warn");
                }
              };

              const checkedCount = LOGISTICS_ITEMS.filter(i => todayLog[i.id]).length;
              const criticalUnchecked = LOGISTICS_ITEMS.filter(i => i.critical && !todayLog[i.id]);

              // Build history (last 7 days)
              const history = [];
              for (let d = 0; d < 7; d++) {
                const dt = new Date(); dt.setDate(dt.getDate() - d);
                const dk = `${draft.id}_${dt.toISOString().slice(0, 10)}`;
                if (siteLogistics[dk]) history.push({ date: dt.toISOString().slice(0, 10), log: siteLogistics[dk] });
              }

              return (
                <div className="flex-col gap-12">
                  <div className="flex gap-8 flex-center">
                    <HardHat size={16} className="text-amber" />
                    <div>
                      <div className="font-semi text-sm">Site Logistics</div>
                      <div className="text-xs text-muted">Daily site readiness checklist · {today}</div>
                    </div>
                    <div className="ml-auto">
                      <span className={`badge ${checkedCount === LOGISTICS_ITEMS.length ? "badge-green" : checkedCount > 0 ? "badge-amber" : "badge-muted"} fs-10`}>
                        {checkedCount}/{LOGISTICS_ITEMS.length} checked
                      </span>
                    </div>
                  </div>

                  {criticalUnchecked.length > 0 && (
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)", borderRadius: "var(--radius-control)", padding: "var(--space-3) var(--space-3)" }}>
                      <div className="flex gap-8 mb-4 flex-center">
                        <AlertTriangle size={14} className="text-red" />
                        <span className="text-xs font-semi text-red">PM ALERT — Critical items unchecked:</span>
                      </div>
                      {criticalUnchecked.map(i => (
                        <div key={i.id} className="text-xs text-muted" style={{ marginLeft: 22 }}>• {i.label}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex-col gap-4">
                    {LOGISTICS_ITEMS.map(item => {
                      const checked = !!todayLog[item.id];
                      return (
                        <div key={item.id} className="card" style={{ padding: "var(--space-3) var(--space-3)", borderLeft: `3px solid ${checked ? "var(--green)" : item.critical ? "var(--red)" : "var(--border)"}`, background: checked ? "rgba(16,185,129,0.05)" : item.critical && !checked ? "rgba(239,68,68,0.04)" : undefined }}>
                          <div className="flex gap-10 flex-center">
                            <button onClick={() => toggleLogItem(item.id)} className="btn-bare flex-shrink-0" style={{ padding: 0, lineHeight: 1 }}>
                              {checked ? <CheckSquare size={16} className="text-green" /> : <Square size={16} className="text-dim" />}
                            </button>
                            <span style={{ fontSize: "var(--text-card)" }}>{item.icon}</span>
                            <div className="flex-1">
                              <span className="text-sm" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{item.label}</span>
                              {item.critical && !checked && (
                                <span className="badge badge-red" style={{ fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>Critical</span>
                              )}
                            </div>
                            <span className={`badge ${checked ? "badge-green" : item.critical ? "badge-red" : "badge-muted"} fs-9`}>
                              {checked ? "OK" : item.critical ? "Action Needed" : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* History */}
                  {history.length > 0 && (
                    <div>
                      <div className="text-xs font-semi mb-8 text-dim">RECENT HISTORY (Last 7 Days)</div>
                      <div className="flex-col gap-4">
                        {history.map(({ date, log }) => {
                          const cnt = LOGISTICS_ITEMS.filter(i => log[i.id]).length;
                          return (
                            <div key={date} className="flex-center-gap-12 activity-tile">
                              <span className="text-xs text-muted" style={{ minWidth: 80 }}>{date}</span>
                              <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                                <div className="progress-fill" style={{ width: `${(cnt / LOGISTICS_ITEMS.length) * 100}%`, background: cnt === LOGISTICS_ITEMS.length ? "var(--green)" : cnt >= 4 ? "var(--amber)" : "var(--red)", borderRadius: "var(--radius-control)" }} />
                              </div>
                              <span className="text-xs text-muted">{cnt}/{LOGISTICS_ITEMS.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Team Notes ── */}
            {projTab === "notes" && (() => {
              const projId = String(draft.id);
              const allNotes = projectNotes.filter(n => String(n.projectId) === projId);
              const pinnedNotes = allNotes.filter(n => n.pinned);
              const unpinnedNotes = allNotes.filter(n => !n.pinned);
              const filterMap = { all: allNotes, pm: allNotes.filter(n => n.category === "pm"), field: allNotes.filter(n => n.category === "field"), office: allNotes.filter(n => n.category === "office") };
              const visibleNotes = [...pinnedNotes.filter(n => notesFilter === "all" || n.category === notesFilter), ...unpinnedNotes.filter(n => notesFilter === "all" || n.category === notesFilter)];

              const addNote = (category) => {
                if (!noteText.trim()) { show("Enter a note", "err"); return; }
                const newNote = {
                  id: crypto.randomUUID(),
                  projectId: projId,
                  text: noteText.trim(),
                  author: app.auth?.name || "PM",
                  role: app.auth?.role || "pm",
                  category,
                  pinned: false,
                  timestamp: new Date().toISOString(),
                };
                saveProjectNotes([newNote, ...projectNotes]);
                setNoteText("");
                show("Note posted", "ok");
              };

              const togglePin = (noteId) => {
                saveProjectNotes(projectNotes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n));
              };

              const deleteNote = (noteId) => {
                saveProjectNotes(projectNotes.filter(n => n.id !== noteId));
              };

              const catBadge = (cat) => ({ pm: "badge-blue", field: "badge-amber", office: "badge-green" }[cat] || "badge-muted");
              const catLabel = (cat) => ({ pm: "PM", field: "Field", office: "Office" }[cat] || cat);
              const fmtTime = (ts) => {
                try {
                  const d = new Date(ts);
                  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                } catch { return ts; }
              };

              return (
                <div className="flex-col gap-12">
                  <div className="flex gap-8 flex-center">
                    <MessageSquare size={16} className="text-green" />
                    <div>
                      <div className="font-semi text-sm">Team Notes</div>
                      <div className="text-xs text-muted">{allNotes.length} note{allNotes.length !== 1 ? "s" : ""} · visible to all project team</div>
                    </div>
                  </div>

                  {/* Compose */}
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", padding: "var(--space-3)" }}>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Post a note to the project team..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      style={{ width: "100%", fontSize: "var(--text-label)", marginBottom: "var(--space-2)", resize: "vertical" }}
                    />
                    <div className="flex gap-8">
                      <button className="btn btn-sm btn-primary" onClick={() => addNote("pm")} disabled={!noteText.trim()}>Post as PM Note</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => addNote("office")} disabled={!noteText.trim()}>Office Note</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => addNote("field")} disabled={!noteText.trim()}>Field Note</button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-4">
                    {["all", "pm", "field", "office"].map(f => (
                      <button key={f} className={`btn btn-sm ${notesFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setNotesFilter(f)} className="text-capitalize">
                        {f === "all" ? `All (${allNotes.length})` : `${catLabel(f)} (${filterMap[f]?.length || 0})`}
                      </button>
                    ))}
                  </div>

                  {visibleNotes.length === 0 ? (
                    <div className="text-sm text-dim text-center p-32">No notes yet. Post the first note above.</div>
                  ) : (
                    <div className="flex-col gap-8">
                      {visibleNotes.map(note => (
                        <div key={note.id} className="card" style={{ padding: "var(--space-3)", borderLeft: `3px solid ${note.pinned ? "var(--amber)" : "var(--border)"}`, background: note.pinned ? "rgba(245,158,11,0.04)" : undefined }}>
                          <div className="flex-between mb-6">
                            <div className="flex gap-8 flex-center">
                              {note.pinned && <Pin size={12} className="text-amber" />}
                              <span className="font-semi text-sm">{note.author}</span>
                              <span className={`badge ${catBadge(note.category)} fs-9`}>{catLabel(note.category)} Note</span>
                            </div>
                            <div className="flex gap-6 flex-center">
                              <span className="text-xs text-muted">{fmtTime(note.timestamp)}</span>
                              <button onClick={() => togglePin(note.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "var(--space-1) var(--space-1)", color: note.pinned ? "var(--amber)" : "var(--text3)" }} title={note.pinned ? "Unpin" : "Pin"}>
                                {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                              </button>
                              <button onClick={() => deleteNote(note.id)} className="btn-bare fs-11" style={{ padding: "var(--space-1) var(--space-1)" }}>✕</button>
                            </div>
                          </div>
                          <div className="text-sm ws-pre-wrap" style={{ lineHeight: 1.5 }}>{note.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="modal-actions flex-between">
            <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>
            <div className="flex gap-8">
              <button className="btn btn-ghost" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => setModal({ type: "editProject", data: draft })}>Edit</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit Bid ──
  const runAnalysis = async () => {
    if (!aiText.trim()) return show("Paste bid invite text first", "err");
    if (!app.apiKey) return show("Set your API key in Settings first", "err");
    setAiLoading(true);
    try {
      const { analyzeBidPackage } = await import("./utils/api.js");
      const result = await analyzeBidPackage(app.apiKey, aiText);
      // Pre-fill form fields from extraction
      setDraft(d => ({
        ...d,
        name: result.name || d.name,
        gc: result.gc || d.gc,
        value: result.value || d.value,
        due: result.due || d.due,
        phase: result.phase || d.phase,
        risk: result.risk || d.risk,
        scope: result.scope?.length > 0 ? result.scope : d.scope,
        contact: result.contact || d.contact,
        month: result.month || d.month,
        notes: result.notes || d.notes,
        address: result.address || d.address,
      }));
      setAiWarnings(result.warnings || []);
      setShowAiPanel(false);
      show("Bid fields extracted — review and save", "ok");
    } catch (err) {
      show(err.message || "Analysis failed", "err");
    } finally {
      setAiLoading(false);
    }
  };

  if (type === "editBid") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal modal-lg">
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Bid" : "Edit Bid"}</div>
            <div className="flex gap-8 flex-center">
              <label className="btn btn-sm" style={{ background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid var(--blue)", fontSize: "var(--text-tab)", cursor: "pointer", position: "relative" }}>
                {pdfScanning ? "Scanning..." : "Scan Proposal PDF"}
                <input type="file" accept=".pdf" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={(e) => { if (e.target.files?.[0]) handlePdfScan(e.target.files[0]); e.target.value = ""; }} disabled={pdfScanning} />
              </label>
              {isNew && <button className="btn btn-sm" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", background: "rgba(16,185,129,0.12)", color: "var(--green)", border: "1px solid var(--green)", fontSize: "var(--text-tab)" }} onClick={() => { setShowEmailImport(!showEmailImport); setShowAiPanel(false); }}><Clipboard size={12} />{showEmailImport ? "Close" : "Paste Bid Invite"}</button>}
              {isNew && <button className="btn btn-sm" style={{ background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid var(--amber)", fontSize: "var(--text-tab)" }} onClick={() => { setShowAiPanel(!showAiPanel); setShowEmailImport(false); }}>{showAiPanel ? "Hide AI" : "Analyze Bid Package"}</button>}
              <button className="modal-close" onClick={close}>✕</button>
            </div>
          </div>

          {showEmailImport && (
            <div style={{ marginBottom: "var(--space-4)", padding: "var(--space-4)", background: "rgba(16,185,129,0.06)", borderRadius: "var(--radius)", border: "1px solid var(--green)" }}>
              <div style={{ fontSize: "var(--text-label)", color: "var(--green)", fontWeight: "var(--weight-semi)", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}><Clipboard size={13} />PASTE BID INVITE EMAIL</div>
              <div style={{ fontSize: "var(--text-tab)", color: "var(--text2)", marginBottom: "var(--space-2)" }}>Paste the full email body from Procore, BuildingConnected, or any bid invite. Regex patterns will extract project name, GC, address, due date, and scope tags.</div>
              <textarea className="form-textarea" value={emailImportText} onChange={e => setEmailImportText(e.target.value)} placeholder={"Paste bid invite email here...\n\nExample:\nFrom: ABC Construction\nProject: Houston Medical Center Renovation\nBid Due: April 15, 2026\nProject Address: 1234 Main St, Houston, TX 77002\nScope of Work: Metal Framing, Drywall, ACT\n\nThe AI parser will extract key fields automatically."} style={{ minHeight: 130, fontSize: "var(--text-label)" }} />
              <div className="flex-between mt-8">
                <span className="text2 fs-11">{emailImportText.length > 0 ? `${emailImportText.length} characters` : "Paste email text above"}</span>
                <div className="flex gap-8">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEmailImportText(""); setShowEmailImport(false); }}>Cancel</button>
                  <button className="btn btn-sm bg-green text-white" onClick={parseEmailBid}>Import Fields</button>
                </div>
              </div>
            </div>
          )}

          {showAiPanel && (
            <div style={{ marginBottom: "var(--space-4)", padding: "var(--space-4)", background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--amber-dim)" }}>
              <div style={{ fontSize: "var(--text-label)", color: "var(--amber)", fontWeight: "var(--weight-semi)", marginBottom: "var(--space-2)" }}>PASTE BID INVITE, SPEC EXCERPT, OR EMAIL</div>
              <textarea className="form-textarea" value={aiText} onChange={e => setAiText(e.target.value)} placeholder={"Paste the bid invite email, spec section, or project description here...\n\nThe AI will extract: project name, GC, due date, scope tags, risk level, phase, and key notes."} style={{ minHeight: 120, fontSize: "var(--text-label)" }} />
              <div className="flex-between mt-8">
                <span className="text2 fs-11">{aiText.length > 0 ? `${aiText.length} characters` : "Paste text to analyze"}</span>
                <button className="btn btn-primary btn-sm" onClick={runAnalysis} disabled={aiLoading} style={{ minWidth: 140 }}>
                  {aiLoading ? "Analyzing..." : "Extract Fields"}
                </button>
              </div>
            </div>
          )}

          {aiWarnings.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-3)", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "var(--radius)", fontSize: "var(--text-label)" }}>
              <strong className="text-red fs-11">WARNINGS</strong>
              <ul style={{ margin: "4px 0 0 16px", color: "var(--text2)" }}>
                {aiWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* ── Duplicate PM Warning ── */}
          {dupWarning && (
            <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "rgba(245,158,11,0.1)", border: "1px solid var(--amber)", borderRadius: "var(--radius)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}>
              <div>
                <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-label)", color: "var(--amber)", marginBottom: "var(--space-1)" }}>⚠ Potential Duplicate</div>
                <div style={{ fontSize: "var(--text-label)", color: "var(--text2)" }}>
                  <strong>{dupWarning.pm}</strong> is already estimating <strong>{dupWarning.bidName}</strong> from the same GC. Confirm you want to proceed.
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, fontSize: "var(--text-tab)" }} onClick={() => setDupWarning(null)}>Dismiss</button>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Bid Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Project name" />
            </div>
            <div className="form-group">
              <label className="form-label">General Contractor</label>
              <div className="pos-relative">
                <input
                  className="form-input"
                  placeholder="Search or type GC name..."
                  value={gcDropOpen ? gcFilter : (draft.gc || "")}
                  onChange={e => { setGcFilter(e.target.value); upd("gc", e.target.value); setGcDropOpen(true); }}
                  onFocus={() => { setGcDropOpen(true); setGcFilter(draft.gc || ""); }}
                  onBlur={() => setTimeout(() => setGcDropOpen(false), 200)}
                />
                {draft.gc && !gcDropOpen && (
                  <button type="button" className="input-clear-btn"
                    onClick={() => { upd("gc", ""); setGcFilter(""); }}>&#10005;</button>
                )}
                {gcDropOpen && (() => {
                  const q = gcFilter.toLowerCase();
                  const gcSet = new Set();
                  app.contacts.forEach(c => { if (c.company) gcSet.add(c.company); });
                  app.bids.forEach(b => { if (b.gc) gcSet.add(b.gc); });
                  const allGcs = [...gcSet].sort((a, b) => a.localeCompare(b));
                  const filtered = allGcs.filter(name => name.toLowerCase().includes(q));
                  if (filtered.length === 0) return null;
                  return (
                    <div className="autocomplete-dropdown">
                      {filtered.map(name => (
                        <div key={name}
                          className="queue-row fs-13 cursor-pointer px-12"
                          onMouseDown={e => { e.preventDefault(); upd("gc", name); setGcDropOpen(false); setGcFilter(""); }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span className="fw-500">{name}</span>
                          <span className="text-muted ml-8 fs-11">
                            {app.contacts.filter(c => c.company === name).length} contact{app.contacts.filter(c => c.company === name).length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Value ($)</label>
              <input className="form-input" type="number" value={draft.value} onChange={e => upd("value", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" value={draft.due} onChange={e => upd("due", e.target.value)} placeholder="e.g. Mar 20" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={draft.status} onChange={e => {
                const newStatus = e.target.value;
                const ESTIMATING_ACTIVE = ["estimating", "takeoff", "awaiting_quotes", "pricing", "draft_ready"];
                // When transitioning into active estimating and not yet claimed
                if (ESTIMATING_ACTIVE.includes(newStatus) && !draft.estimatingBy) {
                  const pmName = app.auth?.name || "";
                  setDraft(d => ({ ...d, status: newStatus, estimatingBy: pmName, estimatingStarted: new Date().toISOString().slice(0, 10) }));
                  // Check for duplicate: other bids from same GC already being estimated by a different PM
                  if (pmName) {
                    const dups = (app.bids || []).filter(b =>
                      String(b.id) !== String(draft.id) &&
                      b.estimatingBy &&
                      b.estimatingBy !== pmName &&
                      b.gc === draft.gc
                    );
                    if (dups.length > 0) {
                      setDupWarning({ pm: dups[0].estimatingBy, bidName: dups[0].name });
                    }
                  }
                } else {
                  upd("status", newStatus);
                }
              }}>
                <optgroup label="Pre-Bid">
                  <option value="invite_received">Invite Received</option>
                  <option value="reviewing">Reviewing Docs</option>
                  <option value="assigned">Assigned</option>
                </optgroup>
                <optgroup label="Estimating">
                  <option value="estimating">Estimating</option>
                  <option value="takeoff">Takeoff in Progress</option>
                  <option value="awaiting_quotes">Awaiting Quotes</option>
                  <option value="pricing">Pricing</option>
                  <option value="draft_ready">Proposal Ready</option>
                </optgroup>
                <optgroup label="Post-Bid">
                  <option value="submitted">Submitted</option>
                  <option value="clarifications">Clarifications</option>
                  <option value="negotiating">Negotiating</option>
                </optgroup>
                <optgroup label="Outcome">
                  <option value="awarded">Awarded</option>
                  <option value="lost">Lost</option>
                  <option value="no_bid">No Bid</option>
                </optgroup>
              </select>
              {/* Estimating-by info */}
              {draft.estimatingBy && (
                <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-tab)", color: "var(--blue)" }}>
                  In progress by {draft.estimatingBy}{draft.estimatingStarted ? ` · started ${draft.estimatingStarted}` : ""}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Sector</label>
              <input className="form-input" value={draft.sector || draft.phase || ""} onChange={e => upd("sector", e.target.value)} placeholder="e.g. Healthcare, Commercial, K-12" />
            </div>
            <div className="form-group">
              <label className="form-label">Estimator / Owner</label>
              <select className="form-select" value={draft.estimator || ""} onChange={e => upd("estimator", e.target.value)}>
                <option value="">— Select —</option>
                <option value="Emmanuel Aguilar">Emmanuel Aguilar</option>
                <option value="Abner Aguilar">Abner Aguilar</option>
                <option value="Isai Aguilar">Isai Aguilar</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign Foreman (if awarded)</label>
              <select className="form-select" value={draft.assignedForeman != null ? String(draft.assignedForeman) : ""} onChange={e => upd("assignedForeman", e.target.value ? Number(e.target.value) : null)}>
                <option value="">— No Foreman —</option>
                {(app.employees || []).filter(e => e.role === "Foreman").map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Risk</label>
              <select className="form-select" value={draft.risk} onChange={e => upd("risk", e.target.value)}>
                <option value="Low">Low</option>
                <option value="Med">Med</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <div className="flex gap-4 flex-center">
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    className="form-input"
                    placeholder="Search contacts..."
                    value={contactDropOpen ? contactFilter : (draft.contact || "")}
                    onChange={e => { setContactFilter(e.target.value); setContactDropOpen(true); }}
                    onFocus={() => { setContactDropOpen(true); setContactFilter(""); }}
                    onBlur={() => setTimeout(() => setContactDropOpen(false), 200)}
                  />
                  {draft.contact && !contactDropOpen && (
                    <button type="button" className="input-clear-btn"
                      onClick={() => { upd("contact", ""); setContactFilter(""); }}>✕</button>
                  )}
                  {contactDropOpen && (() => {
                    const q = contactFilter.toLowerCase();
                    const filtered = app.contacts.filter(c =>
                      c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q)
                    );
                    return (
                      <div className="autocomplete-dropdown">
                        {filtered.length === 0 ? (
                          <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", color: "var(--text2)" }}>No contacts found</div>
                        ) : filtered.map(c => (
                          <div key={c.id}
                            className="queue-row fs-13 cursor-pointer px-12"
                            onMouseDown={e => { e.preventDefault(); upd("contact", c.name); setContactDropOpen(false); setContactFilter(""); }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span className="fw-500">{c.name}</span>
                            <span className="text-muted ml-8 fs-11">{c.company}{c.role ? ` · ${c.role}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" style={{ whiteSpace: "nowrap", fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)" }}
                  onClick={() => setQuickContact({ name: "", company: draft.gc || "", role: "", phone: "", email: "" })}>+ New</button>
              </div>
              {quickContact && (
                <div style={{ marginTop: "var(--space-2)", padding: "var(--space-3)", background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--border2)" }}>
                  <div style={{ fontSize: "var(--text-tab)", fontWeight: "var(--weight-semi)", color: "var(--amber)", marginBottom: "var(--space-2)" }}>QUICK ADD CONTACT</div>
                  <div className="flex gap-8 mb-8 flex-wrap">
                    <input className="form-input flex-1-140" placeholder="Name *" value={quickContact.name}
                      onChange={e => setQuickContact(prev => ({ ...prev, name: e.target.value }))} />
                    <input className="form-input flex-1-140" placeholder="Company" value={quickContact.company}
                      onChange={e => setQuickContact(prev => ({ ...prev, company: e.target.value }))} />
                  </div>
                  <div className="flex gap-8 mb-8 flex-wrap">
                    <input className="form-input flex-1-120" placeholder="Role" value={quickContact.role}
                      onChange={e => setQuickContact(prev => ({ ...prev, role: e.target.value }))} />
                    <input className="form-input flex-1-120" placeholder="Phone" value={quickContact.phone}
                      onChange={e => setQuickContact(prev => ({ ...prev, phone: e.target.value }))} />
                    <input className="form-input" style={{ flex: "1 1 160px" }} placeholder="Email" value={quickContact.email}
                      onChange={e => setQuickContact(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="flex gap-8">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                      if (!quickContact.name.trim()) { app.show("Contact name is required", "err"); return; }
                      const newContact = { ...quickContact, id: app.nextId(), priority: "med", notes: "", bids: 0, wins: 0, color: "var(--blue)", last: "Never" };
                      app.setContacts(prev => [...prev, newContact]);
                      upd("contact", newContact.name);
                      setQuickContact(null);
                      app.show("Contact added & selected");
                    }}>Save & Select</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuickContact(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Addenda Count</label>
              <input className="form-input" type="number" min="0" value={draft.addendaCount || 0} onChange={e => upd("addendaCount", Number(e.target.value))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Address</label>
              <input className="form-input" value={draft.address || ""} onChange={e => upd("address", e.target.value)} placeholder="Project address" />
            </div>
            <div className="form-group full">
              <label className="form-label">Scope Tags</label>
              <div className="flex gap-4 flex-wrap">
                {SCOPE_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${(draft.scope || []).includes(s) ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => toggleScopeTag(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group full">
              <label className="form-label">Notes / Clarifications</label>
              <textarea className="form-textarea" value={draft.notes} onChange={e => upd("notes", e.target.value)} placeholder="RFI questions, clarifications, general notes..." style={{ minHeight: 120, resize: "vertical", fontSize: "var(--text-label)", lineHeight: 1.5, fontFamily: "inherit" }} />
            </div>
            <div className="form-group full">
              <label className="form-label">Exclusions / Inclusions</label>
              <textarea className="form-textarea" value={draft.exclusions || ""} onChange={e => upd("exclusions", e.target.value)} placeholder="List scope exclusions and inclusions for the proposal..." style={{ minHeight: 80, resize: "vertical", fontSize: "var(--text-label)", lineHeight: 1.5, fontFamily: "inherit" }} />
            </div>

            {/* ── File Attachments ── */}
            <div className="form-group full">
              <label className="form-label flex-center-gap-8">
                Plans, Specs & Documents
                {(draft.attachments || []).length === 0 && <span style={{ fontSize: "var(--text-xs)", color: "var(--red)", fontWeight: "var(--weight-semi)" }}>NO PLANS UPLOADED</span>}
                {(draft.attachments || []).length > 0 && <span style={{ fontSize: "var(--text-xs)", color: "var(--green)", fontWeight: "var(--weight-semi)" }}>{(draft.attachments || []).length} file{(draft.attachments || []).length !== 1 ? "s" : ""}</span>}
              </label>
              <div style={{ border: `2px dashed ${(draft.attachments || []).length === 0 ? "var(--amber)" : "var(--border2)"}`, borderRadius: "var(--radius)", padding: "var(--space-4)", background: "var(--bg2)" }}>
                <div className="text-center py-8">
                  <label className="cursor-pointer text-blue font-semi fs-13">
                    Click to upload or drag files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.dwg,.xlsx,.xls,.doc,.docx,.csv"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;
                        files.forEach(file => {
                          if (file.size > 10 * 1024 * 1024) {
                            show(`${file.name} is too large (max 10MB)`, "err");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const attachment = {
                              id: Date.now() + Math.random(),
                              name: file.name,
                              type: file.type || "application/octet-stream",
                              size: file.size,
                              data: reader.result,
                              uploaded: new Date().toISOString(),
                            };
                            setDraft(d => ({ ...d, attachments: [...(d.attachments || []), attachment] }));
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                  <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", marginTop: "var(--space-1)" }}>
                    PDF, images, DWG, Excel, Word — max 10MB per file
                  </div>
                </div>
                {(draft.attachments || []).length > 0 && (
                  <div className="flex-col-gap-6">
                    {(draft.attachments || []).map((att, i) => (
                      <div key={att.id || i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                        padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)"
                      }}>
                        <div className="flex-center-gap-8 flex-1" style={{ minWidth: 0 }}>
                          <span className="flex-center">
                            {att.type?.includes("pdf") ? <FileText className="w-4 h-4" /> : att.type?.includes("image") ? <Image className="w-4 h-4" /> : att.type?.includes("sheet") || att.type?.includes("excel") ? <BarChart2 className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                          </span>
                          <span className="text-default fw-500 text-ellipsis">
                            {att.name}
                          </span>
                          <span className="text-dim flex-shrink-0">
                            {att.size < 1024 ? att.size + "B" : att.size < 1048576 ? (att.size / 1024).toFixed(1) + "KB" : (att.size / 1048576).toFixed(1) + "MB"}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          {att.data && (
                            <button
                              className="btn btn-ghost btn-sm btn-link"
                              onClick={() => { const w = window.open(); w.document.write(`<iframe src="${att.data}" style="width:100%;height:100%;border:none"></iframe>`); }}
                              title="View"
                            >View</button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", color: "var(--red)" }}
                            onClick={() => setDraft(d => ({ ...d, attachments: (d.attachments || []).filter((_, j) => j !== i) }))}
                            title="Remove"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-actions flex-between">
            {!isNew && <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8 ml-auto">
              {!isNew && draft.status !== "awarded" && (
                <button className="btn badge-green-outlined" onClick={handleAwardBid}>
                  Award Bid
                </button>
              )}
              {!isNew && draft.status === "awarded" && (
                <button className="btn badge-yellow-outlined" onClick={handleUnAwardBid}>
                  Un-award
                </button>
              )}
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Bid" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit Project ──
  if (type === "editProject") {
    return (
      <>
      {showPerimeterMap && (
        <PerimeterMapModal
          project={draft}
          onClose={() => setShowPerimeterMap(false)}
          onSave={(pts) => {
            upd("perimeter", pts);
            setShowPerimeterMap(false);
          }}
        />
      )}
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Project" : "Edit Project"}</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Project name" />
            </div>
            <div className="form-group">
              <label className="form-label">General Contractor</label>
              <input className="form-input" value={draft.gc} onChange={e => upd("gc", e.target.value)} placeholder="GC name" />
            </div>
            <div className="form-group">
              <label className="form-label">Contract Value ($)</label>
              <input className="form-input" type="number" value={draft.contract} onChange={e => upd("contract", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Billed Amount ($)</label>
              <input className="form-input" type="number" value={draft.billed} onChange={e => upd("billed", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Labor Cost ($)</label>
              <input className="form-input" type="number" value={draft.laborCost || 0} onChange={e => upd("laborCost", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Material Cost ($)</label>
              <input className="form-input" type="number" value={draft.materialCost || 0} onChange={e => upd("materialCost", Number(e.target.value))} />
            </div>
            {(draft.contract || 0) > 0 && ((draft.laborCost || 0) + (draft.materialCost || 0)) > 0 && (() => {
              const totalCost = (draft.laborCost || 0) + (draft.materialCost || 0);
              const margin = Math.round(((draft.contract - totalCost) / draft.contract) * 100);
              return (
                <div className="form-group">
                  <label className="form-label">Profit Margin</label>
                  <div style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: margin < 30 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${margin < 30 ? "var(--red)" : "var(--green)"}`, fontWeight: "var(--weight-bold)", color: margin < 0 ? "#dc2626" : margin < 30 ? "var(--red)" : "var(--green)" }}>
                    {margin}% {margin < 30 ? " — Below 30% target" : ""}
                  </div>
                </div>
              );
            })()}
            <div className="form-group">
              <label className="form-label">Progress (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={draft.progress} onChange={e => upd("progress", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Sector</label>
              <input className="form-input" value={draft.phase} onChange={e => upd("phase", e.target.value)} placeholder="e.g. Medical, Commercial" />
            </div>
            <div className="form-group">
              <label className="form-label">Construction Stage</label>
              <select className="form-select" value={draft.constructionStage || ""} onChange={e => {
                const newStage = e.target.value;
                const oldStage = draft.constructionStage || null;
                const now = new Date().toISOString();
                const entry = { from: oldStage, to: newStage, changedBy: app.auth?.name || "Unknown", changedById: app.auth?.id, changedAt: now };
                const history = [...(draft.stageHistory || []), entry];
                upd("constructionStage", newStage);
                upd("stageHistory", history);
                upd("stageUpdatedAt", now);
                upd("stageUpdatedBy", app.auth?.name || "Unknown");
                // Auto-sync progress with stage
                const stageDef = CONSTRUCTION_STAGES.find(s => s.key === newStage);
                if (stageDef) upd("progress", stageDef.progress);
              }}>
                <option value="">— No Stage —</option>
                {CONSTRUCTION_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              {draft.stageHistory?.length > 0 && (
                <details className="mt-6">
                  <summary className="text-xs text-dim cursor-pointer">Stage history ({draft.stageHistory.length})</summary>
                  {draft.stageHistory.map((h, i) => (
                    <div key={i} className="text-xs text-dim py-2">
                      {h.changedAt ? new Date(h.changedAt).toLocaleDateString() : ""} · {h.changedBy} · {STAGE_MAP[h.from]?.label || h.from || "—"} → {STAGE_MAP[h.to]?.label || h.to || "—"}
                    </div>
                  ))}
                </details>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" value={draft.start} onChange={e => upd("start", e.target.value)} placeholder="e.g. Jan 15" />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" value={draft.end} onChange={e => upd("end", e.target.value)} placeholder="e.g. Jul 30" />
            </div>
            <div className="form-group">
              <label className="form-label">PM Assigned</label>
              <select className="form-select" value={draft.pm || ""} onChange={e => upd("pm", e.target.value)}>
                <option value="">— Select PM —</option>
                <option value="Emmanuel Aguilar">Emmanuel Aguilar</option>
                <option value="Abner Aguilar">Abner Aguilar</option>
                <option value="Isai Aguilar">Isai Aguilar</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Foreman</label>
              <select className="form-select" value={draft.assignedForeman != null ? String(draft.assignedForeman) : ""} onChange={e => upd("assignedForeman", e.target.value ? Number(e.target.value) : null)}>
                <option value="">— No Foreman Assigned —</option>
                {(app.employees || []).filter(e => e.role === "Foreman").map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Address</label>
              <input className="form-input" value={draft.address || ""} onChange={e => upd("address", e.target.value)} placeholder="Project address" />
            </div>
            <div className="form-group">
              <label className="form-label">Suite / Area</label>
              <input className="form-input" value={draft.suite || ""} onChange={e => upd("suite", e.target.value)} placeholder="e.g. Suite 200, Level 4" />
            </div>
            <div className="form-group">
              <label className="form-label">Parking Info</label>
              <input className="form-input" value={draft.parking || ""} onChange={e => upd("parking", e.target.value)} placeholder="e.g. Garage Level B2, Lot C" />
            </div>
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-input" type="number" step="any" value={draft.lat || ""} onChange={e => upd("lat", Number(e.target.value) || "")} placeholder="29.7604" />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-input" type="number" step="any" value={draft.lng || ""} onChange={e => upd("lng", Number(e.target.value) || "")} placeholder="-95.3698" />
            </div>

            {/* ── Polygon Perimeter ── */}
            <div className="form-group full">
              <label className="form-label">Job Site Perimeter</label>
              <div className="flex-center-gap-12 flex-wrap">
                <button
                  type="button"
                  className="btn btn-ghost fs-13"
                  onClick={() => setShowPerimeterMap(true)}
                  disabled={!draft.lat || !draft.lng}
                  title={!draft.lat || !draft.lng ? "Set Lat/Lng first" : "Draw polygon boundary on map"}
                >
                  <MapPin className="icon-inline" />{draft.perimeter && draft.perimeter.length >= 3 ? "Edit Perimeter" : "Set Perimeter"}
                </button>
                {draft.perimeter && draft.perimeter.length >= 3 ? (
                  <span className="fs-12 text-green">
                    ✓ {draft.perimeter.length} points · {polygonAreaSqFt(draft.perimeter) > 43560
                      ? `${(polygonAreaSqFt(draft.perimeter) / 43560).toFixed(2)} acres`
                      : `${Math.round(polygonAreaSqFt(draft.perimeter)).toLocaleString()} sq ft`}
                  </span>
                ) : (
                  <span className="fs-12 text-muted">
                    {!draft.lat || !draft.lng ? "Enter Lat/Lng above first" : "No polygon — using radius geofence"}
                  </span>
                )}
                {draft.perimeter && draft.perimeter.length >= 3 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm fs-11 text-red"
                    onClick={() => upd("perimeter", [])}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">Close-Out Notes</label>
              <textarea className="form-textarea" value={draft.closeOut || ""} onChange={e => upd("closeOut", e.target.value)} placeholder="Close-out status, punch list, final inspections..." style={{ minHeight: 80, resize: "vertical" }} />
            </div>

            {/* ── Proposal Attachments ── */}
            <div className="form-group full">
              <label className="form-label">Proposal / Attachments</label>
              <div className="upload-zone">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  id="proposal-upload"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const attachment = {
                          id: Date.now() + Math.random(),
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          data: reader.result,
                          uploadedAt: new Date().toISOString(),
                        };
                        setDraft(d => ({
                          ...d,
                          attachments: [...(d.attachments || []), attachment],
                        }));
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }}
                />
                <label htmlFor="proposal-upload" className="btn btn-ghost cursor-pointer">
                  <Paperclip className="icon-inline" />Upload Proposal / Files
                </label>
                <div className="text-xs text-dim mt-6">PDF, Word, Excel, Images</div>
              </div>

              {/* List attached files */}
              {(draft.attachments || []).length > 0 && (
                <div className="mt-12">
                  {draft.attachments.map((att, i) => (
                    <div key={att.id || i} className="flex-between" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--bg3)", borderRadius: "var(--radius-control)", marginBottom: "var(--space-1)" }}>
                      <div className="flex gap-8 flex-center">
                        <span className="flex-center">{att.type?.includes("pdf") ? <FileText className="w-4 h-4" /> : att.type?.includes("image") ? <Image className="w-4 h-4" /> : att.type?.includes("sheet") || att.type?.includes("excel") ? <BarChart2 className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}</span>
                        <div>
                          <div className="text-sm font-semi">{att.name}</div>
                          <div className="text-xs text-dim">{(att.size / 1024).toFixed(0)} KB · {new Date(att.uploadedAt || att.uploaded || Date.now()).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-sm fs-11"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = att.data;
                            link.download = att.name;
                            link.click();
                          }}>↓</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-tab)", color: "var(--red)" }}
                          onClick={() => setDraft(d => ({ ...d, attachments: d.attachments.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* ── Project Document Hub ── */}
          {!isNew && (() => {
            const calcLaborTotal = (entries) => (entries || []).reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.rate) || 0), 0);
            const calcMatTotal = (entries) => (entries || []).reduce((s, e) => { const b = (Number(e.qty) || 0) * (Number(e.unitCost) || 0); return s + b + b * (Number(e.markup) || 0) / 100; }, 0);
            const pid = draft.id;
            const projRfis = (app.rfis || []).filter(r => r.projectId === pid);
            const projSubmittals = (app.submittals || []).filter(s => s.projectId === pid);
            const projCOs = (app.changeOrders || []).filter(c => c.projectId === pid);
            const projInvoices = (app.invoices || []).filter(i => i.projectId === pid);
            const projDailyReports = (app.dailyReports || []).filter(d => d.projectId === pid);
            const projJSAs = (app.jsas || []).filter(j => j.projectId === pid);
            const projTM = (app.tmTickets || []).filter(t => t.projectId === pid);

            // Health signals
            const openRfis = projRfis.filter(r => r.status !== "Answered" && r.status !== "Closed");
            const agingRfis = openRfis.filter(r => (r.submitted || r.dateSubmitted) && (new Date() - new Date(r.submitted || r.dateSubmitted)) > 7 * 86400000);
            const pendingSubs = projSubmittals.filter(s => s.status !== "approved");
            const pendingCOs = projCOs.filter(c => c.status === "pending");
            const overdueInvs = projInvoices.filter(i => i.status === "overdue");
            const pendingTM = projTM.filter(t => t.status === "pending" || t.status === "draft");
            const hasIssues = agingRfis.length > 0 || pendingCOs.length > 0 || overdueInvs.length > 0;

            const sections = [
              { label: "RFIs", items: projRfis, icon: null, tab: "documents", fields: (r) => `#${r.number || ""} — ${r.subject || r.desc || ""}`, badge: (r) => r.status, urgent: openRfis.length },
              { label: "Submittals", items: projSubmittals, icon: null, tab: "documents", fields: (s) => `#${s.number || ""} — ${s.description || s.desc || ""}`, badge: (s) => s.status, urgent: pendingSubs.length },
              { label: "Change Orders", items: projCOs, icon: null, tab: "financials", fields: (c) => `#${c.number || ""} — ${c.desc || ""} (${fmt(c.amount || 0)})`, badge: (c) => c.status, urgent: pendingCOs.length },
              { label: "Invoices", items: projInvoices, icon: null, tab: "financials", fields: (i) => `#${i.number} — ${fmt(i.amount)} — ${i.date || ""}`, badge: (i) => i.status, urgent: overdueInvs.length },
              { label: "Daily Reports", items: projDailyReports, icon: null, tab: "safety", fields: (d) => `${d.date || ""} — ${d.teamSize || 0} team — ${(d.work || "").slice(0, 60)}`, badge: () => null, urgent: 0 },
              { label: "JSAs", items: projJSAs, icon: null, tab: "jsa", fields: (j) => `${j.date || ""} — ${j.title || j.location || ""}`, badge: () => null, urgent: 0 },
              { label: "T&M Tickets", items: projTM, icon: null, tab: "financials", fields: (t) => `${t.ticketNumber || ""} — ${t.description || ""} (${fmt(calcLaborTotal(t.laborEntries || []) + calcMatTotal(t.materialEntries || []))})`, badge: (t) => t.status, urgent: pendingTM.length },
            ];

            const totalDocs = sections.reduce((s, sec) => s + sec.items.length, 0);

            return (
              <div className="mt-16 border-t-2 pt-16">
                {/* Health Summary Bar */}
                {hasIssues && (
                  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    {agingRfis.length > 0 && <span className="fs-11 text-red font-semi">{agingRfis.length} RFI{agingRfis.length > 1 ? "s" : ""} aging 7+ days</span>}
                    {pendingCOs.length > 0 && <span style={{ fontSize: "var(--text-tab)", color: "var(--amber)", fontWeight: "var(--weight-semi)" }}>{pendingCOs.length} CO{pendingCOs.length > 1 ? "s" : ""} pending ({fmt(pendingCOs.reduce((s, c) => s + (c.amount || 0), 0))})</span>}
                    {overdueInvs.length > 0 && <span className="fs-11 text-red font-semi">{overdueInvs.length} overdue invoice{overdueInvs.length > 1 ? "s" : ""}</span>}
                    {pendingTM.length > 0 && <span style={{ fontSize: "var(--text-tab)", color: "var(--amber)" }}>{pendingTM.length} T&M pending</span>}
                  </div>
                )}
                <div className="flex-between mb-12">
                  <div className="fw-700 fs-14">Project Documents ({totalDocs})</div>
                </div>
                <div className="grid-auto-280">
                  {sections.map(sec => (
                    <div key={sec.label} style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <div className="flex-between mb-6">
                        <div className="font-semi fs-12">{sec.label}</div>
                        <span className="flex gap-4">
                          {sec.urgent > 0 && <span className="badge badge-red fs-9">{sec.urgent} open</span>}
                          <span className="badge badge-blue fs-9">{sec.items.length}</span>
                        </span>
                      </div>
                      {sec.items.length === 0 ? (
                        <div className="text-xs text-muted">None</div>
                      ) : (
                        sec.items.slice(0, 5).map((item, i) => (
                          <div key={item.id || i} style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                            onClick={() => { setModal(null); app.setSearch(draft.name || ""); app.setTab(sec.tab); }}>
                            <span>{sec.fields(item)}</span>
                            {sec.badge(item) && <span className={`badge ${sec.badge(item) === "paid" || sec.badge(item) === "approved" || sec.badge(item) === "answered" ? "badge-green" : sec.badge(item) === "pending" || sec.badge(item) === "submitted" || sec.badge(item) === "open" ? "badge-amber" : "badge-muted"}`} style={{ fontSize: "var(--text-xs)", marginLeft: "var(--space-1)" }}>{sec.badge(item)}</span>}
                          </div>
                        ))
                      )}
                      {sec.items.length > 5 && <div className="text-xs mt-4 cursor-pointer text-blue"
                        onClick={() => { setModal(null); app.setSearch(draft.name || ""); app.setTab(sec.tab); }}>+{sec.items.length - 5} more →</div>}
                      <div className="flex gap-4 mt-6">
                        <button className="btn btn-ghost btn-link" onClick={() => { setModal(null); app.setSearch(draft.name || ""); app.setTab(sec.tab); }}>
                          View All →
                        </button>
                        {sec.label === "Submittals" && sec.items.length > 0 && (
                          <button className="btn btn-ghost" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}
                            onClick={async () => {
                              const { generateSubmittalsPackagePdf } = await import("./utils/submittalsPackagePdf.js");
                              generateSubmittalsPackagePdf(draft, sec.items, app.contacts || [], app.company || {});
                            }}>
                            <FileDown size={11} /> PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Punch List ── */}
          {!isNew && (() => {
            const pid = draft.id;
            const items = (app.punchItems || []).filter(p => p.projectId === pid);
            const openItems = items.filter(p => p.status === "open").length;
            const ipItems = items.filter(p => p.status === "in-progress").length;
            const doneItems = items.filter(p => p.status === "complete").length;
            const pctDone = items.length > 0 ? Math.round((doneItems / items.length) * 100) : 0;

            const users = (() => { try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; } })();

            const addPunch = () => {
              if (!punchForm.description) { show("Description required", "err"); return; }
              app.setPunchItems(prev => [...prev, {
                id: app.nextId(), projectId: pid, ...punchForm,
                status: "open", photos: [], createdAt: new Date().toISOString(),
                completedAt: null, signedOffBy: null, signedOffAt: null,
              }]);
              show("Punch item added", "ok");
              setPunchAdding(false);
              setPunchForm({ description: "", location: "", assignedTo: "", priority: "med" });
            };

            const cyclePunchStatus = (item) => {
              const next = item.status === "open" ? "in-progress" : item.status === "in-progress" ? "complete" : "open";
              app.setPunchItems(prev => prev.map(p => p.id === item.id ? {
                ...p, status: next, completedAt: next === "complete" ? new Date().toISOString() : null
              } : p));
              show(`Punch item → ${next}`, "ok");
            };

            const deletePunch = (item) => {
              app.setPunchItems(prev => prev.filter(p => p.id !== item.id));
              show("Punch item removed", "ok");
            };

            const signOffPunch = () => {
              if (openItems + ipItems > 0) { show("Complete all items before sign-off", "err"); return; }
              app.setPunchItems(prev => prev.map(p => p.projectId === pid ? { ...p, signedOffBy: app.auth?.name, signedOffAt: new Date().toISOString() } : p));
              show("Punch list signed off", "ok");
            };

            const addPunchPhoto = (itemId, e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                app.setPunchItems(prev => prev.map(p => p.id === itemId ? { ...p, photos: [...(p.photos || []), { name: file.name, data: reader.result }] } : p));
                show("Photo attached", "ok");
              };
              reader.readAsDataURL(file);
            };

            const PRIORITY_BADGE = { high: "badge-red", med: "badge-amber", low: "badge-green" };
            const STATUS_BADGE = { open: "badge-red", "in-progress": "badge-amber", complete: "badge-green" };

            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-12">
                  <div className="fw-700 fs-14">Punch List ({items.length})</div>
                  <div className="flex gap-8">
                    {items.length > 0 && doneItems === items.length && !items[0]?.signedOffBy && (
                      <button className="btn btn-ghost btn-sm text-green" onClick={signOffPunch}>Sign Off</button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => setPunchAdding(!punchAdding)}>+ Add Item</button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="flex gap-8 mb-12">
                    <div className="activity-tile fs-11">Open: <strong className="text-red">{openItems}</strong></div>
                    <div className="activity-tile fs-11">In Progress: <strong className="text-amber">{ipItems}</strong></div>
                    <div className="activity-tile fs-11">Complete: <strong className="text-green">{doneItems}</strong></div>
                    <div className="activity-tile fs-11">{pctDone}% done</div>
                  </div>
                )}

                {punchAdding && (
                  <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", marginBottom: "var(--space-3)" }}>
                    <div className="grid-2col">
                      <div className="form-group full">
                        <label className="form-label">Description *</label>
                        <input className="form-input" value={punchForm.description} onChange={e => setPunchForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Touch up tape joint at room 201 north wall" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Location</label>
                        <input className="form-input" value={punchForm.location} onChange={e => setPunchForm(f => ({ ...f, location: e.target.value }))} placeholder="Room / Area" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Assigned To</label>
                        <select className="form-select" value={punchForm.assignedTo} onChange={e => setPunchForm(f => ({ ...f, assignedTo: e.target.value }))}>
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Priority</label>
                        <select className="form-select" value={punchForm.priority} onChange={e => setPunchForm(f => ({ ...f, priority: e.target.value }))}>
                          <option value="high">High</option>
                          <option value="med">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8 mt-8">
                      <button className="btn btn-primary btn-sm" onClick={addPunch}>Add</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPunchAdding(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {items.sort((a, b) => { const o = { open: 0, "in-progress": 1, complete: 2 }; return (o[a.status] ?? 0) - (o[b.status] ?? 0); }).map(item => (
                  <div key={item.id} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                    <div className="flex-between">
                      <div className="flex-1">
                        <span style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-label)", textDecoration: item.status === "complete" ? "line-through" : "none" }}>{item.description}</span>
                        {item.location && <span className="text-xs text-muted ml-8">{item.location}</span>}
                      </div>
                      <div className="flex gap-4 flex-center">
                        <span className={`badge ${PRIORITY_BADGE[item.priority]} fs-9`}>{item.priority}</span>
                        <button className={`badge ${STATUS_BADGE[item.status]}`} style={{ fontSize: "var(--text-xs)", cursor: "pointer", border: "none" }} onClick={() => cyclePunchStatus(item)} title="Click to advance status">{item.status}</button>
                        <label className="cursor-pointer fs-12" title="Attach photo">
                          <Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addPunchPhoto(item.id, e)} />
                        </label>
                        <button className="btn btn-ghost" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-1)", color: "var(--red)" }} onClick={() => deletePunch(item)}>✕</button>
                      </div>
                    </div>
                    {item.assignedTo && <div className="text-xs text-muted">Assigned: {item.assignedTo}</div>}
                    {(item.photos || []).length > 0 && (
                      <div className="flex gap-4 mt-4">
                        {item.photos.map((p, i) => <img key={i} src={p.data} alt={p.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "var(--radius-control)", border: "1px solid var(--border)" }} />)}
                      </div>
                    )}
                    {item.signedOffBy && <div className="text-xs text-green mt-4">Signed off by {item.signedOffBy} on {new Date(item.signedOffAt).toLocaleDateString()}</div>}
                  </div>
                ))}

                {items.length === 0 && !punchAdding && <div className="text-xs text-muted">No punch items yet.</div>}
              </div>
            );
          })()}

          {/* ── Construction Phases ── */}
          {!isNew && (() => {
            const editPhases = draft.phases || getDefaultPhases(draft);
            const updateEditPhases = (newPhases) => {
              const updated = { ...draft, phases: newPhases };
              setDraft(updated);
              app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
            };
            const activePhaseEdit = editPhases.find(p => p.status === "in progress");
            const completedEditCount = editPhases.filter(p => p.status === "completed").length;
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-12">
                  <div>
                    <div className="fw-700 fs-14">Construction Phases</div>
                    <div className="fs-11 text-muted mt-2">
                      {completedEditCount}/{editPhases.length} complete
                      {activePhaseEdit ? ` · Active: ${activePhaseEdit.name}` : ""}
                    </div>
                  </div>
                  {activePhaseEdit && (
                    <span className="badge badge-amber fs-10">{activePhaseEdit.name}</span>
                  )}
                </div>
                <PhaseTracker
                  phases={editPhases}
                  employees={app.employees || []}
                  onUpdate={updateEditPhases}
                  readOnly={false}
                />
              </div>
            );
          })()}

          {/* ── Reported Problems ── */}
          {!isNew && (() => {
            const pid = draft.id;
            const projProblems = (app.problems || []).filter(p => String(p.projectId) === String(pid)).sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
            const openProblems = projProblems.filter(p => p.status === "open");
            const PRIORITY_COLOR_MAP = { Low: "var(--green)", Medium: "var(--amber)", High: "var(--red)", Urgent: "#dc2626" };
            const PRIORITY_BADGE_MAP = { Low: "badge-green", Medium: "badge-amber", High: "badge-red", Urgent: "badge-red" };
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Reported Problems ({projProblems.length})
                    {openProblems.length > 0 && <span className="badge badge-red fs-10">{openProblems.length} open</span>}
                  </div>
                </div>
                {projProblems.length === 0 ? (
                  <div className="text-xs text-muted py-8">No problems reported for this project.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 280, overflowY: "auto" }}>
                    {projProblems.map(prob => (
                      <div key={prob.id} style={{ padding: "var(--space-3) var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: `1px solid ${prob.status === "resolved" ? "var(--border)" : "rgba(245,158,11,0.2)"}`, opacity: prob.status === "resolved" ? 0.65 : 1 }}>
                        <div className="flex-between mb-4">
                          <div className="flex-center-gap-6">
                            <span className={`badge ${PRIORITY_BADGE_MAP[prob.priority] || "badge-amber"} fs-9`}>{prob.priority}</span>
                            <span className="text-xs font-semi text-default">{prob.category}</span>
                          </div>
                          <div className="flex-center-gap-6">
                            <span className={`badge ${prob.status === "resolved" ? "badge-green" : "badge-amber"} fs-9`}>{prob.status}</span>
                            {prob.status === "open" && (
                              <button className="btn btn-ghost btn-link"
                                onClick={() => app.setProblems(prev => prev.map(p => p.id === prob.id ? { ...p, status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: app.auth?.name } : p))}>
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm mb-4">{prob.description}</div>
                        <div className="text-xs text-muted">
                          {prob.reporter} · {new Date(prob.reportedAt).toLocaleDateString()} {new Date(prob.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {prob.gps && <span style={{ marginLeft: "var(--space-2)", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}><MapPin style={{ width: 12, height: 12 }} />{prob.gps.lat?.toFixed(4)}, {prob.gps.lng?.toFixed(4)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Sound Quality Testing ── */}
          {!isNew && (() => {
            const ROOM_TYPES = [
              { key: "office", label: "Standard Office", stc: "40-45", assembly: "3-5/8\" 20ga studs · Single layer 5/8\" Type X each side · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall (SF)", "3.5\" Batt Insulation (SF)"], costSF: 8.50, note: "Standard partition meets basic office privacy." },
              { key: "executive", label: "Executive Office", stc: "45-50", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X one side · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers one side (SF)", "3.5\" Batt Insulation (SF)"], costSF: 11.00, note: "Double layer on one side increases STC without RC." },
              { key: "conference", label: "Conference Room", stc: "50+", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X · Resilient Channel RC-1 · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Batt Insulation (SF)"], costSF: 14.00, note: "RC channel decouples drywall to minimize flanking paths." },
              { key: "medical_exam", label: "Medical / Exam Room", stc: "50-55", assembly: "3-5/8\" 20ga studs · Soundbreak XP or QuietRock 545 each side · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "QuietRock 545 or Soundbreak XP (SF)", "3.5\" Batt Insulation (SF)"], costSF: 18.00, note: "QuietRock/Soundbreak XP: STC 52-56 in a single layer (HIPAA)." },
              { key: "hospital_patient", label: "Hospital Patient Room", stc: "55+", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X each side · RC-1 · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Batt Insulation (SF)"], costSF: 22.00, note: "High-performance per FGI/HICPAC acoustic standards." },
              { key: "restroom", label: "Restroom / Plumbing Wall", stc: "50+", assembly: "6\" 20ga studs · Double layer 5/8\" Type X · RC-1 · 3.5\" batt", materials: ["6\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Batt Insulation (SF)"], costSF: 16.00, note: "Deeper 6\" cavity + RC reduces airborne and impact noise." },
            ];
            const soundTests = draft.soundTests || [];
            const selRT = ROOM_TYPES.find(r => r.key === soundForm.roomType) || ROOM_TYPES[0];
            const wallLFNum = parseFloat(soundForm.wallLF) || 0;
            const estSF = wallLFNum > 0 ? Math.round(wallLFNum * 9) : 0;
            const estCost = estSF > 0 ? Math.round(estSF * selRT.costSF) : 0;
            const saveTest = () => {
              if (!soundForm.roomLabel.trim()) { show("Enter a room label", "err"); return; }
              const newTest = { id: crypto.randomUUID(), roomLabel: soundForm.roomLabel.trim(), roomType: soundForm.roomType, wallDetails: soundForm.wallDetails, wallLF: soundForm.wallLF, stc: selRT.stc, assembly: selRT.assembly, materials: selRT.materials, estimatedCost: estCost, estimatedSF: estSF, date: new Date().toISOString().slice(0, 10) };
              const updated = { ...draft, soundTests: [...soundTests, newTest] };
              app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
              setDraft(updated);
              setSoundForm({ roomType: "office", roomLabel: "", wallDetails: "", wallLF: "" });
              setShowSoundForm(false);
              show("Acoustic recommendation saved", "ok");
            };
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <Volume2 size={16} className="text-blue" />
                    Sound Testing ({soundTests.length})
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => setShowSoundForm(v => !v)}>{showSoundForm ? "Cancel" : "+ Add Room"}</button>
                </div>
                {showSoundForm && (
                  <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(59,130,246,0.06)", border: "1px solid var(--blue-dim)", marginBottom: "var(--space-3)" }}>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div style={{ flex: "0 0 160px" }}>
                        <label className="text-xs text-dim">Room Label</label>
                        <input className="input input-sm" placeholder="e.g. Conf Room A" value={soundForm.roomLabel} onChange={e => setSoundForm(p => ({ ...p, roomLabel: e.target.value }))} />
                      </div>
                      <div style={{ flex: "0 0 200px" }}>
                        <label className="text-xs text-dim">Room Type</label>
                        <select className="input input-sm" value={soundForm.roomType} onChange={e => setSoundForm(p => ({ ...p, roomType: e.target.value }))}>
                          {ROOM_TYPES.map(r => <option key={r.key} value={r.key}>{r.label} (STC {r.stc})</option>)}
                        </select>
                      </div>
                      <div className="flex-0-100">
                        <label className="text-xs text-dim">Wall LF</label>
                        <input className="input input-sm" type="number" min="0" placeholder="LF" value={soundForm.wallLF} onChange={e => setSoundForm(p => ({ ...p, wallLF: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Notes / Existing Conditions</label>
                      <input className="input input-sm" placeholder="Stud size, height, special conditions..." value={soundForm.wallDetails} onChange={e => setSoundForm(p => ({ ...p, wallDetails: e.target.value }))} />
                    </div>
                    <div style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginBottom: "var(--space-2)" }}>
                      <strong>Assembly:</strong> {selRT.assembly} &nbsp;·&nbsp; <span className="text-amber">STC {selRT.stc}</span>
                      {estCost > 0 && <span className="ml-8">· Est. cost: <strong>{fmt(estCost)}</strong></span>}
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={saveTest}>Save</button>
                  </div>
                )}
                {soundTests.length === 0 && !showSoundForm && <div className="text-xs text-muted">No acoustic tests yet.</div>}
                {soundTests.map((test, i) => (
                  <div key={test.id || i} style={{ fontSize: "var(--text-label)", padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{test.roomLabel}</strong> <span className="badge badge-blue fs-9">STC {test.stc}</span>
                      <div className="text-dim mt-2">{test.assembly}</div>
                      {test.estimatedCost > 0 && <span className="text-amber">Est. {fmt(test.estimatedCost)}</span>}
                    </div>
                    <button className="btn-bare fs-12" onClick={() => {
                      const updated = { ...draft, soundTests: soundTests.filter((_, j) => j !== i) };
                      app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
                      setDraft(updated);
                    }}>✕</button>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Site Logistics ── */}
          {!isNew && (() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const logKey = `${draft.id}_${todayStr}`;
            const todayLog = siteLogistics[logKey] || {};
            const LOGISTICS_ITEMS = [
              { id: "dumpster", label: "Dumpster doors accessible and able to open", critical: true, icon: "🗑️" },
              { id: "porta_potty", label: "Porta-potty on site and serviced", critical: false, icon: "🚽" },
              { id: "staging_clear", label: "Material staging area clear and organized", critical: false, icon: "📦" },
              { id: "safety_signage", label: "Safety signage posted at all entry points", critical: false, icon: "⚠️" },
              { id: "fire_exit", label: "Fire exits unobstructed", critical: true, icon: "🚪" },
              { id: "first_aid", label: "First aid kit accessible and stocked", critical: false, icon: "🩺" },
              { id: "temp_power", label: "Temporary power / lighting operational", critical: false, icon: "💡" },
              { id: "deliveries_clear", label: "Delivery access path clear", critical: false, icon: "🚚" },
            ];
            const checkedCount = LOGISTICS_ITEMS.filter(i => todayLog[i.id]).length;
            const critUnchecked = LOGISTICS_ITEMS.filter(i => i.critical && !todayLog[i.id]);
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <HardHat size={16} className="text-amber" />
                    Site Logistics · {todayStr}
                    {critUnchecked.length > 0 && <span className="badge badge-red fs-9">{critUnchecked.length} critical</span>}
                  </div>
                  <span className={`badge ${checkedCount === LOGISTICS_ITEMS.length ? "badge-green" : checkedCount > 0 ? "badge-amber" : "badge-muted"} fs-10`}>{checkedCount}/{LOGISTICS_ITEMS.length}</span>
                </div>
                {critUnchecked.length > 0 && (
                  <div style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.07)", border: "1px solid var(--red)", marginBottom: "var(--space-2)", fontSize: "var(--text-tab)", color: "var(--red)" }}>
                    ⚠️ Critical unchecked: {critUnchecked.map(i => i.label).join(" · ")}
                  </div>
                )}
                <div className="grid-auto-260" style={{ gap: "var(--space-1)" }}>
                  {LOGISTICS_ITEMS.map(item => {
                    const checked = !!todayLog[item.id];
                    return (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: checked ? "rgba(16,185,129,0.06)" : "var(--bg3)", border: `1px solid ${checked ? "var(--green)" : item.critical && !checked ? "var(--red)" : "var(--border)"}`, cursor: "pointer" }}
                        onClick={() => {
                          const updated = { ...siteLogistics, [logKey]: { ...todayLog, [item.id]: !checked, date: todayStr, projectId: draft.id } };
                          saveSiteLogistics(updated);
                          if (item.critical && checked) show(`⚠️ ${item.label} — unchecked`, "warn");
                        }}>
                        {checked ? <CheckSquare size={14} className="text-green flex-shrink-0" /> : <Square size={14} className="text-dim flex-shrink-0" />}
                        <span className="fs-11">{item.icon} {item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Team Notes ── */}
          {!isNew && (() => {
            const projId = String(draft.id);
            const allNotes = projectNotes.filter(n => String(n.projectId) === projId);
            const catLabel = (cat) => ({ pm: "PM", field: "Field", office: "Office" }[cat] || cat);
            const catBadge = (cat) => ({ pm: "badge-blue", field: "badge-amber", office: "badge-green" }[cat] || "badge-muted");
            const fmtTime = (ts) => { try { const d = new Date(ts); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ts; } };
            const filterMap = { all: allNotes, pm: allNotes.filter(n => n.category === "pm"), field: allNotes.filter(n => n.category === "field"), office: allNotes.filter(n => n.category === "office") };
            const visibleNotes = allNotes.filter(n => notesFilter === "all" || n.category === notesFilter).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.timestamp) - new Date(a.timestamp));
            const addNote = (category) => {
              if (!noteText.trim()) { show("Enter a note", "err"); return; }
              const newNote = { id: crypto.randomUUID(), projectId: projId, text: noteText.trim(), author: app.auth?.name || "PM", role: app.auth?.role || "pm", category, pinned: false, timestamp: new Date().toISOString() };
              saveProjectNotes([newNote, ...projectNotes]);
              setNoteText("");
              show("Note posted", "ok");
            };
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <MessageSquare size={16} className="text-green" />
                    Team Notes ({allNotes.length})
                  </div>
                </div>
                <textarea className="input" rows={2} placeholder="Post a note to the project team..." value={noteText} onChange={e => setNoteText(e.target.value)} style={{ width: "100%", fontSize: "var(--text-label)", marginBottom: "var(--space-2)", resize: "vertical" }} />
                <div className="flex gap-6 mb-10">
                  <button className="btn btn-sm btn-primary" onClick={() => addNote("pm")} disabled={!noteText.trim()}>PM Note</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => addNote("field")} disabled={!noteText.trim()}>Field Note</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => addNote("office")} disabled={!noteText.trim()}>Office Note</button>
                  <div className="ml-auto flex gap-4">
                    {["all", "pm", "field", "office"].map(f => (
                      <button key={f} className={`btn btn-sm ${notesFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setNotesFilter(f)} style={{ fontSize: "var(--text-xs)", textTransform: "capitalize", padding: "var(--space-1) var(--space-2)" }}>
                        {f === "all" ? `All (${allNotes.length})` : `${catLabel(f)} (${filterMap[f]?.length || 0})`}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleNotes.length === 0 ? (
                  <div className="text-xs text-muted">No notes yet.</div>
                ) : (
                  <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {visibleNotes.map(note => (
                      <div key={note.id} style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: note.pinned ? "rgba(245,158,11,0.05)" : "var(--bg3)", border: `1px solid ${note.pinned ? "var(--amber)" : "var(--border)"}` }}>
                        <div className="flex-between mb-4">
                          <div className="flex-center-gap-6">
                            {note.pinned && <Pin size={10} className="text-amber" />}
                            <span className="font-semi fs-12">{note.author}</span>
                            <span className={`badge ${catBadge(note.category)} fs-8`}>{catLabel(note.category)}</span>
                          </div>
                          <div className="flex-center-gap-4">
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--text3)" }}>{fmtTime(note.timestamp)}</span>
                            <button onClick={() => saveProjectNotes(projectNotes.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n))} style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "var(--amber)" : "var(--text3)", padding: "var(--space-1) var(--space-1)" }}>
                              {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                            </button>
                            <button onClick={() => saveProjectNotes(projectNotes.filter(n => n.id !== note.id))} className="btn-bare fs-11">✕</button>
                          </div>
                        </div>
                        <div className="fs-12 ws-pre-wrap" style={{ lineHeight: 1.4 }}>{note.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="modal-actions flex-between">
            {!isNew && <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8 ml-auto">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Project" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── Edit Contact ──
  if (type === "editContact") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Contact" : "Edit Contact"}</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={draft.company} onChange={e => upd("company", e.target.value)} placeholder="Company" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-input" value={draft.role} onChange={e => upd("role", e.target.value)} placeholder="e.g. Senior PM" />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={draft.priority} onChange={e => upd("priority", e.target.value)}>
                <option value="high">High</option>
                <option value="med">Med</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={draft.phone} onChange={e => upd("phone", e.target.value)} placeholder="713-555-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={draft.email} onChange={e => upd("email", e.target.value)} placeholder="email@company.com" />
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={draft.notes} onChange={e => upd("notes", e.target.value)} placeholder="Notes about this contact..." />
            </div>
          </div>
          {!isNew && (
            <div className="mt-16">
              <div className="text-xs text-dim mb-8">CALL HISTORY</div>
              {app.callLog.filter(c => c.contact === draft.name).length === 0 ? (
                <div className="text-sm text-muted">No calls logged for this contact.</div>
              ) : (
                app.callLog.filter(c => c.contact === draft.name).map(c => (
                  <div key={c.id} className="flex gap-8 border-b" style={{ padding: "var(--space-2) 0", alignItems: "center" }}>
                    <div className="text-xs text-dim" style={{ width: 130, flexShrink: 0 }}>{c.time}</div>
                    <div className="text-sm flex-1">{c.note}</div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-1)", color: "var(--red)", flexShrink: 0 }}
                      onClick={() => { if (confirm("Delete this call log?")) { app.setCallLog(prev => prev.filter(cl => cl.id !== c.id)); app.show("Call deleted"); } }}>✕</button>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="modal-actions flex-between">
            {!isNew && <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8 ml-auto">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Contact" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Log Call ──
  if (type === "logCall") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Log Call</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Contact</label>
              <select className="form-select" value={draft.contact} onChange={e => upd("contact", e.target.value)}>
                <option value="">-- Select Contact --</option>
                {app.contacts.map(c => <option key={c.id} value={c.name}>{c.name} ({c.company})</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Call Note</label>
              <textarea className="form-textarea" value={draft.note} onChange={e => upd("note", e.target.value)} placeholder="What was discussed..." />
            </div>
            <div className="form-group full">
              <label className="form-label">Next Action</label>
              <input className="form-input" value={draft.next} onChange={e => upd("next", e.target.value)} placeholder="Follow-up action..." />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={close}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Log Call</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthGate;
