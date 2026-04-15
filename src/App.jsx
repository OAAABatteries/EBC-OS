import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import { styles } from "./styles";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSyncedState, flushSyncQueue } from "./hooks/useSyncedState";
import { useToast } from "./hooks/useToast";
import {
  THEMES, ASSEMBLIES, SCOPE_INIT, initBids, initProjects, initContacts, initCallLog,
  initInvoices, initChangeOrders, initRfis, initSubmittals, initSubmittalLibrary, initSchedule,
  initIncidents, initToolboxTalks, initDailyReports, initTakeoffs, initPunchItems,
  OSHA_CHECKLIST, COMPANY_DEFAULTS, getHF,
  initEmployees, initCompanyLocations, initTimeEntries, initCrewSchedule, initMaterialRequests,
  initTmTickets, DATA_VERSION,
  initAreas, initProductionLogs, initDecisionLog,
  initCompanySettings,
  initVendors, initAPBills, initPeriods, COST_TYPES, COST_CODES,
  initAccruals, initCommitments, initBudgets,
  initSovItems, initPayApps
} from "./data/constants";
import { softDelete, filterActive, computeProjectLaborCost, computeProjectLaborByCode, computeProjectTotalCost, validatePeriod, getAdjustedContract } from "./utils/financialValidation";
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
import { supabase, isSupabaseConfigured, signOut as supaSignOut, onAuthStateChange, signIn as supaSignIn, signUp as supaSignUp, ensureSupabaseAuth } from "./lib/supabase";

import { GanttScheduleView } from "./components/GanttScheduleView";
import { useAlertEngine } from "./hooks/useAlertEngine";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { NotificationPanel } from "./components/NotificationPanel";
import { PerimeterMapModal } from "./components/PerimeterMapModal";
import { polygonAreaSqFt } from "./utils/geofence";
import { TrendingDown, AlertTriangle, DollarSign, Wrench, Package, FileX, ChevronDown, ChevronUp, Search, Calendar, Building2, BarChart2, ClipboardList, Globe, Bell, FolderOpen, MapPin, Paperclip, FileText, Image, Sheet, FileSpreadsheet, Camera, List, Columns, CheckSquare, Square, FileDown, Volume2, MessageSquare, Pin, PinOff, Truck, HardHat, Clipboard, LayoutDashboard, Briefcase, Calculator, MoreHorizontal, Clock } from "lucide-react";
import { ModalHub } from "./components/ModalHub";
import { DEVICE_PRESETS, MockStatusBar } from "./components/MockStatusBar";

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
  { key: "submittalLibrary", label: "Submittal Library" },
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
const BID_SECTORS = ["Medical", "Commercial", "Education", "Hospitality", "Government", "Religious", "Entertainment", "Industrial", "Residential"];
const BID_SCOPE_OPTIONS = ["Metal Framing", "GWB", "ACT", "Demo", "Lead-Lined", "ICRA", "Insulation", "L5 Finish", "Deflection Track", "Seismic ACT", "FRP", "Fireproofing", "Shaft Wall"];

// ── Next-action urgency engine (Phase 1a) ──
const NEXT_ACTION = {
  plans_missing:  { label: "Plans missing",   color: "var(--red)",   bg: "var(--red-bg, rgba(239,68,68,0.12))" },
  needs_owner:    { label: "Needs owner",      color: "var(--amber)", bg: "var(--amber-bg, rgba(245,158,11,0.12))" },
  overdue:        { label: "Overdue",           color: "var(--red)",   bg: "var(--red-bg, rgba(239,68,68,0.12))" },
  due_soon:       { label: "Due soon",          color: "var(--amber)", bg: "var(--amber-bg, rgba(245,158,11,0.12))" },
  stale:          { label: "Stale",             color: "var(--text3)", bg: "var(--bg3)" },
  follow_up_due:  { label: "Follow-up due",     color: "var(--amber)", bg: "var(--amber-bg, rgba(245,158,11,0.12))" },
  needs_handoff:  { label: "Needs handoff",     color: "var(--blue)",  bg: "var(--blue-bg, rgba(59,130,246,0.12))" },
};
const getNextAction = (b, projects) => {
  const active = BID_ACTIVE_STATUSES.includes(b.status);
  const estimating = ["estimating","takeoff","awaiting_quotes","pricing","draft_ready","assigned","reviewing","invite_received"].includes(b.status);
  if (estimating && !((b.attachments || []).length > 0 || b.plansUploaded)) return "plans_missing";
  if (estimating && !b.estimator) return "needs_owner";
  const due = b.due ? new Date(b.due) : null;
  const daysLeft = due && !isNaN(due) ? Math.ceil((due - new Date()) / 86400000) : null;
  if (active && daysLeft !== null && daysLeft < 0) return "overdue";
  if (active && daysLeft !== null && daysLeft <= 3) return "due_soon";
  // Follow-up due: submitted bids with a followUpDate that's past or today
  if (["submitted","clarifications","negotiating"].includes(b.status) && b.followUpDate) {
    const fuDue = new Date(b.followUpDate);
    if (!isNaN(fuDue) && fuDue <= new Date()) return "follow_up_due";
  }
  // Follow-up stale: submitted with no follow-up in 7+ days
  if (["submitted","clarifications","negotiating"].includes(b.status)) {
    const lastFU = b.lastFollowUp || b.lastActivityDate || null;
    if (lastFU) {
      const daysSinceFU = Math.floor((Date.now() - new Date(lastFU).getTime()) / 86400000);
      if (daysSinceFU >= 7) return "follow_up_due";
    }
  }
  if (b.status === "awarded" && !b.convertedToProject && !(projects || []).some(p => p.bidId === b.id)) return "needs_handoff";
  // Staleness: no activity in 14+ days
  const ref = b.lastActivityDate || b.estimatingStarted || b.bidDate || null;
  if (active && ref) {
    const daysSince = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
    if (daysSince >= 14) return "stale";
  }
  return null;
};
const getLastTouch = (b) => {
  const ref = b.lastActivityDate || b.lastFollowUp || b.estimatingStarted || b.bidDate || null;
  if (!ref) return null;
  const d = new Date(ref);
  if (isNaN(d)) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
};

// (Anime/Cyberpunk theme effects archived to src/archive/theme-effects.jsx)

// ═══════════════════════════════════════════════════════════════
// PREVIEW DEVICE FRAMES (admin impersonation / auditor QA)
// ═══════════════════════════════════════════════════════════════
// Each preset defines portrait dimensions + chrome locations; landscape is
// an explicit sibling (not derived) so we can reposition notch/home-indicator
// cleanly for each orientation. `class` drives the mock status bar styling.
// `statusBar` is the TOTAL vertical height (px) reserved for fake OS chrome
// at the top of the screen area — portal content pads below it.
// homeArea: RESERVED vertical space at the bottom of the screen, in device
// pixels, that the portal content (bottom nav, etc) must not draw into so
// the home-indicator pill / Android gesture bar remains visible. Matches
// the iOS safe-area-inset-bottom behavior on real devices.
function AuthGate() {
  // DEV_BYPASS_LOGIN: skip login/onboarding during development — auto-login as Abner (admin)
  // Set to false to re-enable login screen
  const DEV_BYPASS_LOGIN = true;
  const DEV_DEFAULT_USER = { id: 999, name: "Abner Aguilar", email: "abner@ebconstructors.com", role: "admin", pin: "1234" };

  // Phone-preview iframe mode: when the admin impersonates a field role from the
  // role switcher, the parent renders this app inside a 390×844 iframe with a
  // ?preview=employee|foreman|driver URL param. Inside that iframe we force auth
  // to the impersonated role so the portal renders naturally — no phone-frame
  // wrap, and media queries key off the iframe's own 390px viewport.
  const urlPreviewRole = (() => {
    try {
      const r = new URLSearchParams(window.location.search).get("preview");
      return (r === "employee" || r === "foreman" || r === "driver") ? r : null;
    } catch { return null; }
  })();

  const [auth, setAuth] = useState(() => {
    if (urlPreviewRole) {
      return { ...DEV_DEFAULT_USER, role: urlPreviewRole };
    }
    if (DEV_BYPASS_LOGIN) return DEV_DEFAULT_USER;
    try {
      const stored = localStorage.getItem("ebc_auth");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [onboardingDone, setOnboardingDone] = useState(DEV_BYPASS_LOGIN || !!urlPreviewRole);

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

  // DEV_BYPASS_LOGIN ↔ RLS bridge: persist bypass auth to localStorage and
  // establish a real Supabase session so RLS policies see a valid JWT.
  useEffect(() => {
    if (!DEV_BYPASS_LOGIN || !isSupabaseConfigured() || !auth) return;
    localStorage.setItem("ebc_auth", JSON.stringify(auth));
    ensureSupabaseAuth().then(ok => {
      if (ok) console.log("[dev] Supabase session established — RLS active");
      else console.warn("[dev] Supabase session failed — RLS will block queries");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Phone-preview iframe mode — when this App instance is running inside the
  // admin's preview iframe, ?preview=<role> is set. Used to inject a top
  // safe-area so the portal header clears the notch, and to disable features
  // that don't make sense inside a preview (PWA install prompt, etc).
  const isPhonePreview = (() => {
    try {
      const r = new URLSearchParams(window.location.search).get("preview");
      return r === "employee" || r === "foreman" || r === "driver";
    } catch { return false; }
  })();

  // ── Robust overlay dismiss (prevents close-on-highlight) ──
  const _overlayDown = useRef(false);
  const onOverlayDown = (e) => { _overlayDown.current = (e.target === e.currentTarget); };
  const onOverlayUp = (closeFn) => (e) => {
    if (_overlayDown.current && e.target === e.currentTarget) closeFn();
    _overlayDown.current = false;
  };

  // ── Session timeout (30m idle → auto-logout) ──
  const { showWarning: showTimeoutWarning, remainingSec: timeoutSec, extendSession } = useSessionTimeout(onLogout);

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
  const [submittalLibrary, setSubmittalLibrary, _syncSubLibrary] = useSyncedState("submittalLibrary", initSubmittalLibrary);
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
  const [vendors, setVendors, _syncVendors] = useSyncedState("vendors", initVendors);
  const [apBills, setAPBills, _syncAPBills] = useSyncedState("apBills", initAPBills);
  const [periods, setPeriods, _syncPeriods] = useSyncedState("periods", initPeriods);
  const [accruals, setAccruals, _syncAccruals] = useSyncedState("accruals", initAccruals);
  const [commitments, setCommitments, _syncCommitments] = useSyncedState("commitments", initCommitments);
  const [budgets, setBudgets, _syncBudgets] = useSyncedState("budgets", initBudgets);
  const [sovItems, setSovItems, _syncSovItems] = useSyncedState("sovItems", initSovItems);
  const [payApps, setPayApps, _syncPayApps] = useSyncedState("payApps", initPayApps);

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
        setVendors(initVendors);
        setAPBills(initAPBills);
        setPeriods(initPeriods);
        setEmployees(initEmployees);       // refreshes roster (comp type, rate, role)
        localStorage.setItem("ebc_data_version", String(DATA_VERSION));
        console.info("[EBC] Data version upgraded to", DATA_VERSION, "— re-seeded all data from constants.js");
      }
    } catch {}
  }, []);

  // ── Smart Alert Engine — scans all data for actionable notifications ──
  const alertEngine = useAlertEngine({
    bids, projects, contacts, submittals, rfis, changeOrders,
    certifications, employees, timeEntries, invoices,
    apBills, accruals, companySettings,
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
  // Auditor device + orientation for preview frames. Persisted so auditors
  // don't have to re-pick every session. Defaults to iPhone portrait.
  const [previewDevice, setPreviewDevice] = useLocalStorage("ebc_previewDevice", "iphone-14-pro");
  const [previewOrient, setPreviewOrient] = useLocalStorage("ebc_previewOrient", "portrait");

  // ── role view toggle (effective role drives tabs AND phone-portal impersonation) ──
  const effectiveRole = viewAsRole || auth?.role || "owner";

  // ── portal routing: actual field user OR admin/owner impersonating via dropdown ──
  // When an admin/owner picks Foreman/Employee/Driver from the role switcher,
  // we swap the whole screen to that portal (wrapped in a phone-frame bezel) so
  // the big-screen view matches what the crew sees on their phone. Real field
  // logins are untouched — isImpersonating is only true for admin/owner.
  const isImpersonatingPortal = (auth?.role === "owner" || auth?.role === "admin")
    && (viewAsRole === "driver" || viewAsRole === "employee" || viewAsRole === "foreman");
  const isDriverView = auth?.role === "driver" || (isImpersonatingPortal && viewAsRole === "driver");
  const isEmployeeView = auth?.role === "employee" || (isImpersonatingPortal && viewAsRole === "employee");
  const isForemanView = auth?.role === "foreman" || (isImpersonatingPortal && viewAsRole === "foreman");

  // Viewport tracking for responsive phone-frame scaling in impersonation mode.
  // rAF-throttled so drag-resize only updates once per frame (avoids the "GTA
  // choppy zoom" effect where every intermediate innerHeight triggered a
  // re-render + snap-to-new-scale). Tracks BOTH axes so landscape tablet frames
  // can fit-box against horizontal space too.
  const [viewportH, setViewportH] = useState(() => typeof window !== "undefined" ? window.innerHeight : 900);
  const [viewportW, setViewportW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1400);
  useEffect(() => {
    let rafId = 0;
    const handler = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        setViewportH(window.innerHeight);
        setViewportW(window.innerWidth);
      });
    };
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

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
  const [bidAdvFilter, setBidAdvFilter] = useState({ estimator: "", gc: "", sector: "", scope: "", risk: "", dueBefore: "", dueAfter: "", overdueOnly: false, noPlans: false, staleOnly: false });
  const [bidAdvOpen, setBidAdvOpen] = useState(false);
  const bidAdvActive = Object.values(bidAdvFilter).some(v => v === true || (typeof v === "string" && v !== ""));
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
    const t = THEMES[theme] || THEMES.ebc;
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
    submittals, setSubmittals, submittalLibrary, setSubmittalLibrary, schedule, setSchedule, incidents, setIncidents,
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
    vendors, setVendors, apBills, setAPBills, periods, setPeriods,
    accruals, setAccruals, commitments, setCommitments, budgets, setBudgets,
    sovItems, setSovItems, payApps, setPayApps,
    COST_TYPES, COST_CODES,
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

  // Backlog = total adjusted contract value (base + approved COs) of all in-progress projects
  const backlog = useMemo(() => {
    return projects.filter(p => p.status === "in-progress").reduce((s, p) => s + getAdjustedContract(p, changeOrders), 0);
  }, [projects, changeOrders]);

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

  // Labor % = weighted average of (burdened labor cost / contract) across in-progress projects with time data
  const laborUtil = useMemo(() => {
    const burden = companySettings?.laborBurdenMultiplier || 1.35;
    const activeProj = projects.filter(p => p.status === "in-progress" && (p.contract || 0) > 0);
    if (activeProj.length === 0) return null;
    let totalLabor = 0;
    let totalContract = 0;
    for (const p of activeProj) {
      const lc = computeProjectLaborCost(p.id, p.name, timeEntries, employees, burden);
      if (lc.burdenedCost > 0) {
        totalLabor += lc.burdenedCost;
        totalContract += p.contract;
      }
    }
    if (totalContract === 0) return null;
    return Math.round((totalLabor / totalContract) * 100);
  }, [projects, timeEntries, employees, companySettings]);

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
    // Advanced filters
    const af = bidAdvFilter;
    if (af.estimator) list = list.filter(b => b.estimator === af.estimator);
    if (af.gc) list = list.filter(b => (b.gc || "").toLowerCase().includes(af.gc.toLowerCase()));
    if (af.sector) list = list.filter(b => b.sector === af.sector);
    if (af.scope) list = list.filter(b => (b.scope || []).includes(af.scope));
    if (af.risk) list = list.filter(b => b.risk === af.risk);
    if (af.dueAfter) list = list.filter(b => b.due && b.due >= af.dueAfter);
    if (af.dueBefore) list = list.filter(b => b.due && b.due <= af.dueBefore);
    if (af.overdueOnly) list = list.filter(b => { const d = b.due ? new Date(b.due) : null; return d && !isNaN(d) && d < new Date(); });
    if (af.noPlans) list = list.filter(b => !((b.attachments || []).length > 0 || b.plansUploaded));
    if (af.staleOnly) list = list.filter(b => {
      const ref = b.lastActivityDate || b.estimatingStarted || b.bidDate || null;
      return ref && Math.floor((Date.now() - new Date(ref).getTime()) / 86400000) >= 14;
    });
    return list;
  }, [bids, bidFilter, search, bidAdvFilter]);

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

  // ── context-preserving nav — use from dashboard actions that pre-filter ──
  const navigateWithContext = (key, opts = {}) => {
    setTab(key);
    setMoreOpen(false);
    setMobileNav(false);
    if ("search" in opts) setSearch(opts.search); else setSearch("");
    if ("bidFilter" in opts) setBidFilter(opts.bidFilter); else setBidFilter("All");
    if ("subTab" in opts) setSubTab(opts.subTab); else setSubTab(null);
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
    owner:          { subtitle: "Company Overview",       showKPIs: true,  showCharts: true,  showBrief: true  },
    admin:          { subtitle: "Company Overview",       showKPIs: true,  showCharts: true,  showBrief: true  },
    pm:             { subtitle: "Projects & Bids",        showKPIs: true,  showCharts: true,  showBrief: true  },
    superintendent: { subtitle: "Field Oversight",        showKPIs: false, showCharts: false, showBrief: true  },
    estimator:      { subtitle: "Estimating & Bids",      showKPIs: true,  showCharts: true,  showBrief: true  },
    office_admin:   { subtitle: "Office Operations",      showKPIs: true,  showCharts: false, showBrief: true  },
    accounting:     { subtitle: "Financials & Payroll",   showKPIs: true,  showCharts: true,  showBrief: true  },
    safety:         { subtitle: "Safety & Compliance",    showKPIs: false, showCharts: false, showBrief: true  },
    foreman:        { subtitle: "Field Operations",       showKPIs: false, showCharts: false, showBrief: true  },
    driver:         { subtitle: "Deliveries",             showKPIs: false, showCharts: false, showBrief: false },
    employee:       { subtitle: "My Work",                showKPIs: false, showCharts: false, showBrief: false },
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

    // Projects at risk (behind schedule) — uses front-loaded S-curve
    // Construction work is non-linear: mobilization is slow, middle phase is fast, punch/closeout is slow
    const projAtRisk = projects.filter(p => {
      if ((p.progress || 0) >= 100) return false;
      const end = parseDate(p.end);
      const start = parseDate(p.start);
      if (!end || !start) return false;
      const totalDays = (end - start) / 86400000;
      if (totalDays <= 0) return false;
      const elapsed = Math.max(0, (now - start) / 86400000);
      const ratio = Math.min(1, elapsed / totalDays);
      // S-curve: slow start, fast middle, slow finish — better matches construction progress
      const expectedProgress = Math.min(100, 100 * (3 * ratio * ratio - 2 * ratio * ratio * ratio));
      return (p.progress || 0) < expectedProgress - 20; // 20% behind S-curve expected
    });

    // Follow-ups from call log
    const followUps = callLog.filter(c => c.next && c.next.trim());

    // Profit margin alerts — flag active projects below threshold
    // Uses computeProjectTotalCost for full cost breakdown (labor + material + sub + other AP)
    const marginThreshold = companySettings?.marginAlertThreshold || 25;
    const burden = companySettings?.laborBurdenMultiplier || 1.35;
    // Use adjusted contract (base + approved COs) so margin matches every other
    // screen. Using raw p.contract here is the #1 source of dashboard/P&L
    // self-contradiction flagged by the auditor.
    const profitAlerts = projects.filter(p => {
      if ((p.progress || 0) >= 100) return false; // skip completed
      const adjustedContract = getAdjustedContract(p, changeOrders);
      if (adjustedContract <= 0) return false; // can't calculate without contract
      const costs = computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, burden, accruals || []);
      if (costs.total <= 0) return false; // no costs yet — not alertable
      const margin = ((adjustedContract - costs.total) / adjustedContract) * 100;
      return margin < marginThreshold;
    }).map(p => {
      const adjustedContract = getAdjustedContract(p, changeOrders);
      const costs = computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, burden, accruals || []);
      const margin = Math.round(((adjustedContract - costs.total) / adjustedContract) * 100);
      return { ...p, adjustedContract, margin, totalCost: costs.total, laborActual: costs.labor, materialActual: costs.material, laborHours: costs.laborHours, subCost: costs.subcontractor, otherAP: costs.otherAP };
    }).sort((a, b) => a.margin - b.margin);

    // Total urgency count
    const urgentCount = bidsDueSoon.length + cosPending.length + rfisOpen.filter(r => r.age > 7).length + subsDueSoon.length + overdueInv.length + profitAlerts.length;

    return { bidsDueSoon, cosPending, cosPendingTotal, rfisOpen, subsDueSoon, overdueInv, overdueTotal, tmPending, projNoBilling, projAtRisk, followUps, profitAlerts, urgentCount };
  }, [bids, changeOrders, rfis, submittals, invoices, tmTickets, projects, callLog, timeEntries, employees, companySettings, apBills, accruals]);

  const pName = (pid) => projects.find(p => String(p.id) === String(pid))?.name || "Unknown";

  const renderDashboard = () => (
    <div>
      {/* ── Header — time-aware, action-oriented ── */}
      <div className="section-header">
        <div>
          <div className="section-title font-head fs-20">{(() => {
            const h = new Date().getHours();
            if (h < 6) return t("Command Center");
            if (h < 12) return t("Good Morning") + (auth?.name ? `, ${auth.name.split(" ")[0]}` : "");
            if (h < 17) return t("Command Center");
            return t("End of Day");
          })()}</div>
          <div className="section-sub flex fs-label gap-sp2 flex-wrap">
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
            <span className="ml-sp2 fs-xs" style={{ color: isSupabaseConfigured() ? "var(--green)" : "var(--text3)" }}>
              {isSupabaseConfigured() ? "● " + t("Live") : "○ " + t("Local")} — {new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}
            </span>
          </div>
        </div>
        <div className="flex gap-8">
          <FeatureGuide guideKey="dashboard" />
        </div>
      </div>

      {/* Quick Brief — auto-populated from live data */}
      {dashCfg.showBrief && briefResult && (
        <div className="card mb-sp4 p-sp5 overflow-auto" style={{ maxHeight: 450 }}>
          <div className="flex-between mb-12">
            <div>
              <div className="text-xs" style={{ color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" }}>{t("Quick Brief")}</div>
              <div className="text-sm font-semi mt-4">{briefResult.greeting}</div>
            </div>
          </div>

          <div className="text-sm text-muted mb-12">{briefResult.summary}</div>

          {/* Urgent Alerts */}
          {briefResult.urgentAlerts?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-red">{t("Urgent Alerts")}</div>
              {briefResult.urgentAlerts.map((a, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}
                  onClick={() => { if (a.tab) navigateWithContext(a.tab, { search: a.search, subTab: a.subTab }); else if (a.project) { const p = projects.find(p => p.name?.toLowerCase().includes(a.project.toLowerCase())); if (p) setModal({ type: "viewProject", data: p }); } }}>
                  <div className="flex-between">
                    <span className="text-sm">{a.alert}</span>
                    <span className="badge badge-red">{a.type}</span>
                  </div>
                  <div className="flex-between mt-2">
                    <span className="text-xs text-green">{a.action}</span>
                    {a.tab && <span className="text-xs font-semi" style={{ color: "var(--accent, #3b82f6)" }}>Go &rsaquo;</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Today's Focus */}
          {briefResult.todaysFocus?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8 text-amber">{t("Today's Focus")}</div>
              {briefResult.todaysFocus.map((f, i) => (
                <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", cursor: f.tab ? "pointer" : undefined }}
                  onClick={f.tab ? () => navigateWithContext(f.tab, { search: f.search, subTab: f.subTab }) : f.project ? () => { const p = projects.find(p => p.name?.toLowerCase().includes(f.project.toLowerCase())); if (p) setModal({ type: "viewProject", data: p }); } : undefined}>
                  <div className="flex-between">
                    <span className="text-sm">{f.item}</span>
                    <div className="flex gap-8" style={{ alignItems: "center" }}>
                      <span className={`badge ${f.priority === "critical" ? "badge-red" : f.priority === "high" ? "badge-amber" : "badge-muted"}`}>{f.priority}</span>
                      {f.actionLabel && <span className="text-xs font-semi" style={{ color: "var(--accent, #3b82f6)", whiteSpace: "nowrap" }}>{f.actionLabel} &rsaquo;</span>}
                    </div>
                  </div>
                  {f.project && <div className="text-xs text-dim mt-2 text-blue underline">{f.project}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Money Moves */}
          {briefResult.moneyMoves?.length > 0 && (
            <div className="mb-12">
              <div className="text-sm font-semi mb-8">{t("Money Moves")}</div>
              {briefResult.moneyMoves.map((m, i) => (
                <div key={i} className="queue-row" style={{ cursor: m.tab ? "pointer" : undefined }} onClick={m.tab ? () => navigateWithContext(m.tab, { search: m.search, subTab: m.subTab }) : undefined}>
                  <div className="flex-between">
                    <span className="text-sm">{m.item}</span>
                    <span className="font-semi text-sm text-green">{m.amount}</span>
                  </div>
                  <div className="flex-between mt-2">
                    <span className="text-xs text-muted">{m.action} — {m.deadline}</span>
                    {m.actionLabel && <span className="text-xs font-semi" style={{ color: "var(--accent, #3b82f6)", whiteSpace: "nowrap" }}>{m.actionLabel} &rsaquo;</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Motivational quote removed per design audit — replaced with action-oriented content */}
        </div>
      )}

      {/* ── PM Action Queue — promoted to position 2 (was buried at position 11) ── */}
      {dashCfg.showKPIs && (() => {
        const pendingMat = (materialRequests || []).filter(r => r.status === "requested");
        const urgentMat = pendingMat.filter(r => r.urgency === "urgent" || r.urgency === "emergency");
        const awaitingConfirm = (materialRequests || []).filter(r => r.status === "delivered" && !r.confirmedBy);
        const pendingReviews = (dailyReports || []).filter(r => !r.reviewedBy);
        const openProblems = (problems || []).filter(p => p.status === "open" && !p.assignedTo);
        const plansNeeded = projects.filter(p => p.needsPlans);
        const queueRfis = dashActions.rfisOpen.filter(r => r.age > 7);
        const queueSubs = dashActions.subsDueSoon;
        const queueCOs = dashActions.cosPending;
        const queueTm = dashActions.tmPending;
        const queueTotal = pendingMat.length + awaitingConfirm.length + pendingReviews.length + openProblems.length + plansNeeded.length + queueRfis.length + queueSubs.length + queueCOs.length + queueTm.length;
        if (queueTotal === 0) return (
          <div className="card dash-card bg-2" style={{ borderLeft: "3px solid var(--green)" }}>
            <div className="text-sm font-semi flex-center-gap-6">
              <span style={{ color: "var(--green)" }}>&#10003;</span> {t("All Clear")} — {t("nothing needs your attention right now")}
            </div>
          </div>
        );
        return (
          <div className="card dash-card dash-card--amber bg-2">
            <div className="flex-between mb-8">
              <div className="text-sm font-semi flex-center-gap-6">
                <span>&#9889;</span> PM Action Queue
                <span className="badge badge-amber fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}>{queueTotal}</span>
              </div>
            </div>
            <div className="flex-col-gap-6">
              {queueCOs.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#128221;</span>
                    <span className="text-sm">{t("Change Orders Pending")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-amber">{queueCOs.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("projects", { subTab: "change-orders" })}>{t("Review")}</button>
                  </div>
                </div>
              )}
              {queueRfis.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#10067;</span>
                    <span className="text-sm">{t("Overdue RFIs")}</span>
                    <span className="badge badge-red fs-xs" style={{ padding: "0 5px" }}>{t("oldest")}: {queueRfis[0].age}d</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-red">{queueRfis.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("projects", { subTab: "rfis" })}>{t("Respond")}</button>
                  </div>
                </div>
              )}
              {queueSubs.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#128206;</span>
                    <span className="text-sm">{t("Submittals Due Soon")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-amber">{queueSubs.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("projects", { subTab: "submittals" })}>{t("Review")}</button>
                  </div>
                </div>
              )}
              {queueTm.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#128336;</span>
                    <span className="text-sm">{t("T&M Tickets")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-amber">{queueTm.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("financials", { subTab: "tm" })}>{t("Review")}</button>
                  </div>
                </div>
              )}
              {pendingMat.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#128230;</span>
                    <span className="text-sm">{t("Material Requests")}</span>
                    {urgentMat.length > 0 && <span className="badge badge-red fs-xs" style={{ padding: "0 5px" }}>{urgentMat.length} {t("urgent")}</span>}
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-amber">{pendingMat.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("materials", { search: "requested" })}>{t("Review")}</button>
                  </div>
                </div>
              )}
              {awaitingConfirm.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#10003;</span>
                    <span className="text-sm">{t("Deliveries Awaiting Confirmation")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-green">{awaitingConfirm.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("deliveries")}>{t("View")}</button>
                  </div>
                </div>
              )}
              {pendingReviews.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#128203;</span>
                    <span className="text-sm">{t("Daily Reports")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi">{pendingReviews.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("reports")}>{t("Review")}</button>
                  </div>
                </div>
              )}
              {openProblems.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#9888;&#65039;</span>
                    <span className="text-sm">{t("Unassigned Problems")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-red">{openProblems.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("reports", { subTab: "problems" })}>{t("Assign")}</button>
                  </div>
                </div>
              )}
              {plansNeeded.length > 0 && (
                <div className="flex-between queue-row">
                  <div className="flex-center-gap-8">
                    <span>&#128208;</span>
                    <span className="text-sm">{t("Plans Needed")}</span>
                  </div>
                  <div className="flex-center-gap-8">
                    <span className="text-sm font-semi text-amber">{plansNeeded.length}</span>
                    <button className="btn btn-ghost btn-sm btn-inline" onClick={() => navigateWithContext("projects")}>{t("Request")}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Driver Quick Summary ── */}
      {userRole === "driver" && (() => {
        const pendingDeliveries = (materialRequests || []).filter(r => r.status === "approved" || r.status === "assigned" || r.status === "in-transit");
        const todayDeliveries = pendingDeliveries.filter(r => {
          const d = r.scheduledDate || r.deliveryDate;
          return d && d.startsWith(new Date().toISOString().slice(0, 10));
        });
        return (
          <div className="card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <Truck size={15} /> {t("Delivery Summary")}
            </div>
            <div className="grid-auto-180">
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("deliveries")}>
                <div className="text-lg font-bold text-blue">{todayDeliveries.length}</div>
                <div className="text-xs text-muted">{t("Today's Deliveries")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("deliveries")}>
                <div className="text-lg font-bold" style={{ color: pendingDeliveries.length > 0 ? "var(--amber)" : "var(--green)" }}>{pendingDeliveries.length}</div>
                <div className="text-xs text-muted">{t("Total Pending")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("materials")}>
                <div className="text-lg font-bold text-blue">{(materialRequests || []).filter(r => r.status === "requested").length}</div>
                <div className="text-xs text-muted">{t("Awaiting Pickup")}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Employee Quick Summary ── */}
      {userRole === "employee" && (() => {
        const todayStr = new Date().toDateString();
        const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
        const mySchedule = (teamSchedule || []).filter(s => s.days?.[todayKey]);
        const mySiteCount = new Set(mySchedule.map(s => s.projectId)).size;
        const clockedIn = (timeEntries || []).some(te => te.clockIn && !te.clockOut && new Date(te.clockIn).toDateString() === todayStr);
        return (
          <div className="card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <Clock size={15} /> {t("My Day")}
            </div>
            <div className="grid-auto-180">
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("timeclock")}>
                <div className="text-lg font-bold" style={{ color: clockedIn ? "var(--green)" : "var(--amber)" }}>{clockedIn ? "IN" : "OUT"}</div>
                <div className="text-xs text-muted">{clockedIn ? t("Clocked In") : t("Not Clocked In")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("schedule")}>
                <div className="text-lg font-bold text-blue">{mySiteCount}</div>
                <div className="text-xs text-muted">{t("Sites Today")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("materials")}>
                <div className="text-lg font-bold text-blue">{(materialRequests || []).filter(r => r.status === "requested").length}</div>
                <div className="text-xs text-muted">{t("Material Requests")}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Foreman / Superintendent Field Summary ── */}
      {(userRole === "foreman" || userRole === "superintendent") && (() => {
        const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
        const myCrewToday = (teamSchedule || []).filter(s => s.days?.[todayKey]);
        const crewCount = new Set(myCrewToday.map(s => s.employeeId)).size;
        const siteCount = new Set(myCrewToday.map(s => s.projectId)).size;
        const openPunch = (punchItems || []).filter(p => p.status !== "resolved" && p.status !== "complete");
        const pendingDeliveries = (materialRequests || []).filter(r => r.status === "approved" || r.status === "assigned" || r.status === "in-transit");
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayJsas = (jsas || []).filter(j => j.date === todayStr || (j.createdAt && j.createdAt.startsWith(todayStr)));
        return (
          <div className="card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <HardHat size={15} /> {t("Field Summary")}
            </div>
            <div className="grid-auto-180">
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("schedule")}>
                <div className="text-lg font-bold text-blue">{crewCount}</div>
                <div className="text-xs text-muted">{t("Crew Scheduled")}</div>
                <div className="text-xs text-muted">{siteCount} {t("site")}{siteCount !== 1 ? "s" : ""}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("projects", { subTab: "punch" })}>
                <div className="text-lg font-bold" style={{ color: openPunch.length > 0 ? "var(--amber)" : "var(--green)" }}>{openPunch.length}</div>
                <div className="text-xs text-muted">{t("Open Punch")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("deliveries")}>
                <div className="text-lg font-bold" style={{ color: pendingDeliveries.length > 0 ? "var(--blue)" : "var(--text3)" }}>{pendingDeliveries.length}</div>
                <div className="text-xs text-muted">{t("Pending Deliveries")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("jsa")}>
                <div className="text-lg font-bold" style={{ color: todayJsas.length > 0 ? "var(--green)" : "var(--amber)" }}>{todayJsas.length}</div>
                <div className="text-xs text-muted">{t("JSAs Today")}</div>
                {todayJsas.length === 0 && <div className="text-xs text-amber">{t("None filed")}</div>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ZONE: Financial Health ── */}
      {dashCfg.showKPIs && <div className="text-xs text-uppercase text-muted mt-sp4 mb-sp2" style={{ letterSpacing: "1px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>{t("Financial Health")}</div>}

      {/* ── Financial KPI Summary — PM's money-at-a-glance ── */}
      {dashCfg.showKPIs && (() => {
        const activeProjects = projects.filter(p => !p.deletedAt && p.status !== "completed");
        const adjustedContract = activeProjects.reduce((s, p) => s + getAdjustedContract(p, changeOrders), 0);
        const activeIds = new Set(activeProjects.map(p => String(p.id)));
        const totalBilled = invoices.filter(inv => !inv.deletedAt && activeIds.has(String(inv.projectId))).reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
        const totalPendingCOs = changeOrders.filter(co => !co.deletedAt && co.status === "pending").reduce((s, co) => s + (Math.abs(Number(co.amount)) || 0), 0);
        const remaining = adjustedContract - totalBilled;
        const fmt = (n) => "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
        // Trend: compare this month billing vs last month
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2, "0")}`;
        const billedThisMonth = invoices.filter(inv => !inv.deletedAt && activeIds.has(String(inv.projectId)) && (inv.date || inv.createdAt || "").startsWith(thisMonth)).reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
        const billedLastMonth = invoices.filter(inv => !inv.deletedAt && activeIds.has(String(inv.projectId)) && (inv.date || inv.createdAt || "").startsWith(lastMonth)).reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
        const billingTrend = billedLastMonth > 0 ? Math.round(((billedThisMonth - billedLastMonth) / billedLastMonth) * 100) : null;
        return (
          <div className="kpi-grid mb-sp4">
            <div className="kpi-card cursor-pointer" onClick={() => navigateWithContext("projects")}>
              <div className="kpi-label">{t("Active Contract")}</div>
              <div className="kpi-value fs-subtitle">{fmt(adjustedContract)}</div>
              <div className="kpi-sub">{activeProjects.length} {t("projects")} {t("(incl. COs)")}</div>
            </div>
            <div className="kpi-card cursor-pointer" onClick={() => navigateWithContext("financials")}>
              <div className="kpi-label">{t("Billed")}</div>
              <div className="kpi-value fs-subtitle c-green">{fmt(totalBilled)}</div>
              <div className="kpi-sub flex-center-gap-4">
                <span>{adjustedContract > 0 ? Math.round((totalBilled / adjustedContract) * 100) : 0}% {t("of contract")}</span>
                {billingTrend !== null && (
                  <span style={{ color: billingTrend >= 0 ? "var(--green)" : "var(--red)", fontSize: "var(--text-tab)" }}>
                    {billingTrend >= 0 ? "\u25B2" : "\u25BC"} {Math.abs(billingTrend)}% {t("vs last mo")}
                  </span>
                )}
              </div>
            </div>
            <div className="kpi-card cursor-pointer" onClick={() => navigateWithContext("financials")}>
              <div className="kpi-label">{t("Remaining")}</div>
              <div className="kpi-value" style={{ fontSize: "var(--text-subtitle)", color: remaining < 0 ? "var(--red)" : "var(--text)" }}>{fmt(remaining)}</div>
              <div className="kpi-sub">{totalPendingCOs > 0 && <span className="c-amber">{fmt(totalPendingCOs)} {t("pending COs")}</span>}</div>
            </div>
          </div>
        );
      })()}

      {/* ═══ ZONE: Field & Operations ═══ */}
      <div className="zone-divider" style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-3)" }}>
        <div className="text-xs text-muted text-uppercase fw-700" style={{ letterSpacing: "0.8px" }}>{t("Field & Operations")}</div>
      </div>

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
        if (!hasActivity) return (
          <div className="card dash-card" style={{ opacity: 0.6 }}>
            <div className="text-sm text-muted flex-center-gap-6"><ClipboardList size={14} /> {t("No field activity reported today")}</div>
          </div>
        );
        return (
          <div className="card dash-card dash-card--green">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <ClipboardList size={15} /> {t("Today's Field Activity")}
            </div>
            <div className="grid-auto-180">
              {todayProd.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("reports")}>
                  <div className="text-lg font-bold text-green">{todayProd.length}</div>
                  <div className="text-xs text-muted">{t("Production logged")}</div>
                  <div className="text-xs text-dim">{todayProd.length} {t("entries today")}</div>
                </div>
              )}
              {todayTm.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("financials")}>
                  <div className="text-lg font-bold text-amber">{todayTm.length}</div>
                  <div className="text-xs text-muted">{t("T&M tickets")}</div>
                  <div className="text-xs text-dim">{todayTm.length} {t("created today")}</div>
                </div>
              )}
              {(punchCreated > 0 || punchResolved > 0) && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("projects")}>
                  <div className="text-lg font-bold text-red">{punchCreated}</div>
                  <div className="text-xs text-muted">{t("Punch items")}</div>
                  <div className="text-xs text-dim">{punchResolved} {t("resolved today")}</div>
                </div>
              )}
              {todayProblems.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("reports")}>
                  <div className="text-lg font-bold text-red">{todayProblems.length}</div>
                  <div className="text-xs text-muted">{t("Problems reported")}</div>
                </div>
              )}
              {todayReports.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("reports")}>
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
                    onClick={() => setModal({ type: "viewProject", data: proj })}>
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
        if (!hasData) return (
          <div className="card dash-card" style={{ opacity: 0.6 }}>
            <div className="text-sm text-muted flex-center-gap-6"><Calendar size={14} /> {t("No crew, deliveries, or events scheduled this week")}</div>
          </div>
        );

        return (
          <div className="card dash-card dash-card--amber">
            <div className="text-sm font-semi mb-8 flex-between">
              <span className="flex-center-gap-6">
                <Calendar size={15} /> {t("Look-Ahead")}
                <span className="flex gap-2 ml-8">
                  {[7, 14, 21].map(d => (
                    <button key={d} className={`btn btn-sm ${lookAheadDays === d ? "btn-primary" : "btn-ghost"} fs-xs`} style={{ padding: "var(--space-1) var(--space-2)", minHeight: 0 }}
                      onClick={() => setLookAheadDays(d)}>{d}d</button>
                  ))}
                </span>
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleTabClick("calendar")}>{t("Full Calendar")}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(weekDays.length, 7)}, 1fr)`, gap: "var(--space-1)", fontSize: "var(--text-tab)" }}>
              {days.map((d, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-1)", borderRadius: "var(--radius-control)", background: i === 0 ? "rgba(16,185,129,0.08)" : "var(--bg3)", textAlign: "center", border: i === 0 ? "1px solid var(--green)" : "1px solid transparent", cursor: "pointer" }} onClick={() => handleTabClick("calendar")}>
                  <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-xs)", color: i === 0 ? "var(--green)" : "var(--text3)", marginBottom: "var(--space-1)" }}>
                    {d.label.split(",")[0]}
                  </div>
                  {d.crew > 0 && <div className="text-blue">{d.crew} <span className="fs-9">crew</span></div>}
                  {d.deliveries > 0 && <div className="text-amber">{d.deliveries} <span className="fs-9">del</span></div>}
                  {d.events.map((ev, ei) => (
                    <div key={ei} className="mt-sp1 fs-xs c-text3 nowrap overflow-hidden" style={{ textOverflow: "ellipsis" }}>
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
        if (entries.length === 0) return (
          <div className="card dash-card" style={{ opacity: 0.6 }}>
            <div className="text-sm text-muted flex-center-gap-6"><HardHat size={14} /> {t("No crew on site today")}</div>
          </div>
        );
        const totalCrew = new Set(entries.flatMap(([, v]) => [...v.crew])).size;
        return (
          <div className="card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <HardHat size={15} /> {t("Today's Manpower")} — {totalCrew} {t("crew")} {t("across")} {entries.length} {t("sites")}
            </div>
            {entries.map(([pid, data]) => {
              const proj = projects.find(p => String(p.id) === String(pid));
              if (!proj) return null;
              return (
                <div key={pid} className="flex-between queue-row fs-12 cursor-pointer"
                  onClick={() => setModal({ type: "viewProject", data: proj })}>
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
          <div className="card dash-card dash-card--blue">
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
                        onClick={() => setModal({ type: "viewProject", data: p })}>{p.name}</div>
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

      {/* ── Safety & Compliance Summary ── */}
      {(() => {
        const now2 = new Date();
        const openIncidents = (incidents || []).filter(i => i.status === "open" || !i.status);
        const recentTalks = (toolboxTalks || []).filter(tt => {
          const d = tt.date ? new Date(tt.date) : null;
          return d && (now2 - d) < 7 * 86400000;
        });
        const expiringCerts = (certifications || []).filter(c => {
          const exp = c.expirationDate ? new Date(c.expirationDate) : null;
          return exp && exp > now2 && (exp - now2) < 30 * 86400000;
        });
        const expiredCerts = (certifications || []).filter(c => {
          const exp = c.expirationDate ? new Date(c.expirationDate) : null;
          return exp && exp <= now2;
        });
        const safetyCount = openIncidents.length + expiringCerts.length + expiredCerts.length;
        if (safetyCount === 0 && recentTalks.length === 0) return (
          <div className="card dash-card" style={{ borderLeft: "3px solid var(--green)", opacity: 0.6 }}>
            <div className="text-sm text-muted flex-center-gap-6">&#128737;&#65039; {t("No safety issues — all clear")}</div>
          </div>
        );
        return (
          <div className="card dash-card" style={{ borderLeft: expiredCerts.length > 0 || openIncidents.length > 0 ? "3px solid var(--red)" : "3px solid var(--green)" }}>
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              🛡️ {t("Safety & Compliance")}
              {(expiredCerts.length > 0 || openIncidents.length > 0) && <span className="badge badge-red fs-xs">{t("Action needed")}</span>}
            </div>
            <div className="grid-auto-180">
              {openIncidents.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("safety")}>
                  <div className="text-lg font-bold text-red">{openIncidents.length}</div>
                  <div className="text-xs text-muted">{t("Open Incidents")}</div>
                </div>
              )}
              <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("jsa")}>
                <div className="text-lg font-bold text-green">{recentTalks.length}</div>
                <div className="text-xs text-muted">{t("Toolbox Talks (7d)")}</div>
              </div>
              {expiredCerts.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("settings", { subTab: "credentials" })}>
                  <div className="text-lg font-bold text-red">{expiredCerts.length}</div>
                  <div className="text-xs text-muted">{t("Expired Certs")}</div>
                </div>
              )}
              {expiringCerts.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("settings", { subTab: "credentials" })}>
                  <div className="text-lg font-bold text-amber">{expiringCerts.length}</div>
                  <div className="text-xs text-muted">{t("Expiring (30d)")}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Crew & Workforce Health ── */}
      {dashCfg.showKPIs && (() => {
        const now3 = new Date();
        const activeEmps = (employees || []).filter(e => e.status !== "terminated" && e.status !== "inactive" && !e.deletedAt);
        const todayKey3 = ['sun','mon','tue','wed','thu','fri','sat'][now3.getDay()];
        const scheduledToday = new Set((teamSchedule || []).filter(s => s.days?.[todayKey3]).map(s => s.employeeId)).size;
        const clockedIn = (timeEntries || []).filter(te => te.clockIn && !te.clockOut && new Date(te.clockIn).toDateString() === now3.toDateString()).length;
        // Scheduling conflicts: employees double-booked on 2+ projects today
        const empProjects = {};
        (teamSchedule || []).filter(s => s.days?.[todayKey3]).forEach(s => {
          if (!empProjects[s.employeeId]) empProjects[s.employeeId] = new Set();
          empProjects[s.employeeId].add(s.projectId);
        });
        const conflicts = Object.values(empProjects).filter(pSet => pSet.size > 1).length;
        const expiringCerts3 = (certifications || []).filter(c => {
          const exp = c.expirationDate ? new Date(c.expirationDate) : null;
          return exp && exp > now3 && (exp - now3) < 30 * 86400000;
        });
        if (activeEmps.length === 0) return (
          <div className="card dash-card" style={{ opacity: 0.6 }}>
            <div className="text-sm text-muted">No active employees</div>
          </div>
        );
        return (
          <div className="card dash-card dash-card--blue">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              👷 {t("Workforce Health")}
              {conflicts > 0 && <span className="badge badge-red fs-xs">{conflicts} {t("conflict")}{conflicts > 1 ? "s" : ""}</span>}
            </div>
            <div className="grid-auto-180">
              <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("timeclock")}>
                <div className="text-lg font-bold text-blue">{activeEmps.length}</div>
                <div className="text-xs text-muted">{t("Active Employees")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("schedule")}>
                <div className="text-lg font-bold text-green">{scheduledToday}</div>
                <div className="text-xs text-muted">{t("Scheduled Today")}</div>
              </div>
              <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("timeclock")}>
                <div className="text-lg font-bold" style={{ color: clockedIn > 0 ? "var(--green)" : "var(--text3)" }}>{clockedIn}</div>
                <div className="text-xs text-muted">{t("Clocked In")}</div>
              </div>
              {conflicts > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => handleTabClick("schedule")}>
                  <div className="text-lg font-bold text-red">{conflicts}</div>
                  <div className="text-xs text-muted">{t("Double-Booked")}</div>
                </div>
              )}
              {expiringCerts3.length > 0 && (
                <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("settings", { subTab: "credentials" })}>
                  <div className="text-lg font-bold text-amber">{expiringCerts3.length}</div>
                  <div className="text-xs text-muted">{t("Certs Expiring")}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Drawing / Plan Revision Alerts ── */}
      {dashCfg.showKPIs && (() => {
        // Check for recently revised drawings (plans uploaded/revised in last 7 days)
        const now4 = new Date();
        const recentRevisions = [];
        (projects || []).forEach(p => {
          if (p.deletedAt || (p.status === "completed")) return;
          (p.drawings || p.planSets || []).forEach(d => {
            const rev = d.revisedAt || d.updatedAt;
            if (rev && (now4 - new Date(rev)) < 7 * 86400000) {
              recentRevisions.push({ project: p.name, projectId: p.id, drawing: d.number || d.name || "Plan", revision: d.revision || "New", date: rev });
            }
          });
        });
        if (recentRevisions.length === 0) return null;
        return (
          <div className="card dash-card" style={{ borderLeft: "3px solid var(--amber)" }}>
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              📐 {t("Drawing Revisions")}
              <span className="badge badge-amber fs-xs">{recentRevisions.length} {t("in last 7 days")}</span>
            </div>
            <div className="flex-col-gap-6">
              {recentRevisions.slice(0, 5).map((r, i) => (
                <div key={i} className="flex-between queue-row cursor-pointer"
                  onClick={() => { const p = projects.find(p2 => String(p2.id) === String(r.projectId)); if (p) setModal({ type: "viewProject", data: p }); }}>
                  <div className="flex-center-gap-8">
                    <span className="text-sm text-blue fw-500">{r.project}</span>
                    <span className="text-xs text-muted">{r.drawing} Rev {r.revision}</span>
                  </div>
                  <span className="text-xs text-muted">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              ))}
              {recentRevisions.length > 5 && <div className="text-xs text-muted">+{recentRevisions.length - 5} {t("more")}</div>}
            </div>
          </div>
        );
      })()}

      {/* PM Action Queue moved to position 2 (right after Brief) */}

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
                onClick={() => navigateWithContext("projects", { search: s.label })}>
                {s.label} <span className="fw-800">{counts[s.key]}</span>
              </div>
            ) : null)}
          </div>
        );
      })()}

      {/* ── 7.6 Multi-project PM KPI Grid ── */}
      {dashCfg.showKPIs && (() => {
        const activeProjs = (projects || []).filter(p => p.status === "in-progress" || p.status === "active");
        if (activeProjs.length < 2) return null;
        const fmt = (v) => typeof v === "number" ? (v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v.toFixed(0)}`) : "$0";
        return (
          <div className="card mb-12" style={{ padding: "var(--space-3) var(--space-4)" }}>
            <div className="text-sm font-semi mb-8" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              Multi-Project KPIs
              <span className="badge badge-blue fs-xs" style={{ padding: "0 6px" }}>{activeProjs.length}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-label)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-tab)", textTransform: "uppercase", color: "var(--text3)", fontWeight: "var(--weight-semi)" }}>Project</th>
                    <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-tab)", textTransform: "uppercase", color: "var(--text3)" }}>Contract</th>
                    <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-tab)", textTransform: "uppercase", color: "var(--text3)" }}>Billed</th>
                    <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-tab)", textTransform: "uppercase", color: "var(--text3)" }}>Cost</th>
                    <th style={{ textAlign: "center", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-tab)", textTransform: "uppercase", color: "var(--text3)" }}>Margin</th>
                    <th style={{ textAlign: "center", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-tab)", textTransform: "uppercase", color: "var(--text3)" }}>Crew</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjs.slice(0, 10).map(p => {
                    const contract = getAdjustedContract(p, changeOrders);
                    const billed = (invoices || []).filter(i => String(i.projectId) === String(p.id) && !i.deletedAt).reduce((s, i) => s + (Number(i.amount) || 0), 0);
                    const burden = companySettings?.laborBurdenMultiplier || 1.35;
                    const costs = computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, burden, accruals || []);
                    const margin = contract > 0 ? Math.round(((contract - costs.total) / contract) * 100) : 0;
                    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
                    const crewToday = (teamSchedule || []).filter(s => String(s.projectId) === String(p.id) && s.days?.[todayKey]).length;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                        onClick={() => setModal({ type: "viewProject", data: p })}>
                        <td style={{ padding: "var(--space-2) var(--space-3)", fontWeight: "var(--weight-medium)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                        <td style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", color: "var(--text2)" }}>{fmt(contract)}</td>
                        <td style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", color: "var(--green)" }}>{fmt(billed)}</td>
                        <td style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", color: "var(--text2)" }}>{fmt(costs.total)}</td>
                        <td style={{ textAlign: "center", padding: "var(--space-2) var(--space-3)", color: margin < 20 ? "var(--red)" : margin < 40 ? "var(--amber)" : "var(--green)", fontWeight: "var(--weight-semi)" }}>{margin}%</td>
                        <td style={{ textAlign: "center", padding: "var(--space-2) var(--space-3)" }}>{crewToday || "\u2014"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Action Items card grid removed — duplicated PM Action Queue (now position 2) */}
      {/* Compact KPI row removed — duplicated Financial KPI Summary */}

      {/* ── Section 3: Project Health — behind schedule / no billing ── */}
      {dashCfg.showKPIs && (dashActions.projAtRisk.length > 0 || dashActions.projNoBilling.length > 0) && (
        <div className="card dash-card">
          <div className="text-sm font-semi mb-8">Project Health</div>
          {dashActions.projAtRisk.length > 0 && (
            <div style={{ marginBottom: dashActions.projNoBilling.length > 0 ? 10 : 0 }}>
              <div className="text-xs text-red mb-4">Behind Schedule ({dashActions.projAtRisk.length})</div>
              {dashActions.projAtRisk.slice(0, 4).map(p => (
                <div key={p.id} className="text-sm py-3 cursor-pointer text-blue"
                  onClick={() => setModal({ type: "viewProject", data: p })}>{p.name} — {p.progress || 0}%</div>
              ))}
              {dashActions.projAtRisk.length > 4 && <div className="text-xs text-muted">+{dashActions.projAtRisk.length - 4} more</div>}
            </div>
          )}
          {dashActions.projNoBilling.length > 0 && (
            <div>
              <div className="text-xs text-amber mb-4">No Billing 30+ Days ({dashActions.projNoBilling.length})</div>
              {dashActions.projNoBilling.slice(0, 4).map(p => (
                <div key={p.id} className="text-sm py-3 cursor-pointer text-blue"
                  onClick={() => setModal({ type: "viewProject", data: p })}>{p.name}</div>
              ))}
              {dashActions.projNoBilling.length > 4 && <div className="text-xs text-muted">+{dashActions.projNoBilling.length - 4} more</div>}
            </div>
          )}
        </div>
      )}

      {/* ── Profit Analysis — projects below 30% margin ── */}
      {dashCfg.showKPIs && dashActions.profitAlerts.length > 0 && (() => {
        const marginThr = companySettings?.marginAlertThreshold || 25;
        const getProfitDiagnosis = (p) => {
          const base = p.adjustedContract || p.contract || 0;
          const laborRatio = p.laborActual && base > 0 ? p.laborActual / base : null;
          const matRatio = p.materialActual && base > 0 ? p.materialActual / base : null;
          const issues = [];
          // Labor is primary profit driver — healthy labor ratio is ~50% of contract (100% markup)
          if (laborRatio !== null && laborRatio > 0.55) issues.push({ icon: <Wrench size={11} />, text: "Labor overrun" });
          if (matRatio !== null && matRatio > 0.28) issues.push({ icon: <Package size={11} />, text: "Material overage (est.)" });
          // Check negative COs
          const projCOs = changeOrders.filter(co => String(co.projectId) === String(p.id) && co.amount < 0 && co.status === "approved");
          if (projCOs.length > 0) issues.push({ icon: <FileX size={11} />, text: "CO reduced margin" });
          if (issues.length === 0) {
            if (p.margin < 0) return [{ icon: <AlertTriangle size={11} />, text: "Contract underwater" }];
            if (p.margin < 15) return [{ icon: <AlertTriangle size={11} />, text: "Critical — review estimate vs actuals" }];
            return [{ icon: <TrendingDown size={11} />, text: `Below ${marginThr}% target` }];
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
                <span className="text-xs text-muted">— projects below {marginThr}% margin</span>
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
                      <tr key={p.id} className="cursor-pointer" onClick={() => setModal({ type: "viewProject", data: p })}>
                        <td>
                          <div className="text-sm text-blue fw-500">{p.name}</div>
                          <div className="text-xs text-muted">{p.phase}</div>
                        </td>
                        <td className="text-sm text-muted">{p.gc}</td>
                        <td className="num">{fmt(p.adjustedContract || p.contract)}</td>
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
            <div className="text-xs text-muted flex mt-sp3 gap-sp2">
              <DollarSign size={11} />
              EBC target: 30%+ margin. Labor is the primary profit driver (100% markup). Enter costs per project to track actuals.
            </div>
          </div>
        );
      })()}

      {/* ── Cash Position / Payroll Coverage — Owner/Admin only ── */}
      {(userRole === "owner" || userRole === "admin") && (() => {
        const burden = companySettings?.laborBurdenMultiplier || 1.35;
        const now = new Date();
        const weekAgo = new Date(now - 7 * 86400000);
        const recentEntries = timeEntries.filter(te => te.clockIn && new Date(te.clockIn) >= weekAgo);
        const weeklyHours = recentEntries.reduce((s, te) => s + (te.totalHours || 0), 0);
        const avgRate = employees.length > 0 ? employees.reduce((s, e) => s + (e.payRate || 25), 0) / employees.length : 25;
        const weeklyPayroll = Math.round(weeklyHours * avgRate * burden);
        const totalAR = cashFlow.current + cashFlow.net30 + cashFlow.net60 + cashFlow.net90;
        const coverageWeeks = weeklyPayroll > 0 ? Math.round(totalAR / weeklyPayroll * 10) / 10 : null;
        if (weeklyPayroll === 0 && totalAR === 0) return null;
        return (
          <div className="card dash-card mt-8">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <DollarSign size={15} /> {t("Cash Position")}
            </div>
            <div className="grid-auto-180">
              <div className="activity-tile cursor-pointer" onClick={() => navigateWithContext("financials")}>
                <div className="text-lg font-bold text-green">{fmtK(totalAR)}</div>
                <div className="text-xs text-muted">{t("Outstanding A/R")}</div>
              </div>
              <div className="activity-tile">
                <div className="text-lg font-bold" style={{ color: weeklyPayroll > 0 ? "var(--text)" : "var(--text3)" }}>{fmtK(weeklyPayroll)}</div>
                <div className="text-xs text-muted">{t("Est. Weekly Payroll")}</div>
                <div className="text-xs text-muted">{weeklyHours.toFixed(0)}h @ ${avgRate.toFixed(0)}/hr</div>
              </div>
              {coverageWeeks !== null && (
                <div className="activity-tile">
                  <div className="text-lg font-bold" style={{ color: coverageWeeks >= 4 ? "var(--green)" : coverageWeeks >= 2 ? "var(--amber)" : "var(--red)" }}>{coverageWeeks}</div>
                  <div className="text-xs text-muted">{t("Weeks A/R Coverage")}</div>
                  {coverageWeeks < 2 && <div className="text-xs text-red">{t("Low coverage")}</div>}
                </div>
              )}
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
              <BarChart data={gcWinRates.map(g => ({ name: g.gc.length > 18 ? g.gc.slice(0, 16) + "..." : g.gc, fullGc: g.gc, Awarded: g.awarded, Lost: g.lost, Pending: g.pending }))} layout="vertical" margin={{ left: 10, right: 20 }}
                onClick={(data) => { if (data?.activePayload?.[0]?.payload?.fullGc) { navigateWithContext("bids", { search: data.activePayload[0].payload.fullGc }); } }}>
                <XAxis type="number" tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
                <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", color: "var(--text)" }} />
                <Bar dataKey="Awarded" stackId="a" fill="var(--green)" radius={[0, 0, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar dataKey="Lost" stackId="a" fill="var(--red)" radius={[0, 0, 0, 0]} style={{ cursor: "pointer" }} />
                <Bar dataKey="Pending" stackId="a" fill="var(--amber)" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }} />
                <Legend wrapperStyle={{ fontSize: "var(--text-tab)" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(cashFlow.current + cashFlow.net30 + cashFlow.net60 + cashFlow.net90) > 0 && (
            <div className="card" style={{ flex: "1 1 272px", minWidth: 240 }}>
              <div className="card-header"><div className="card-title font-head fs-13">{t("Receivables Aging")}</div></div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={[
                  { name: "Current", value: cashFlow.current },
                  { name: "31-60d", value: cashFlow.net30 },
                  { name: "61-90d", value: cashFlow.net60 },
                  { name: "90+d", value: cashFlow.net90 },
                ]} margin={{ left: 0, right: 10 }} onClick={() => handleTabClick("financials")} style={{ cursor: "pointer" }}>
                  <XAxis dataKey="name" tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
                  <YAxis tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} tickFormatter={v => fmtK(v)} />
                  <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", color: "var(--text)" }} formatter={v => fmt(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}>
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

      {/* ── GC Relationship Health — active projects + open items per GC ── */}
      {dashCfg.showKPIs && (() => {
        const activeByGc = {};
        projects.filter(p => p.status === "in-progress" && p.gc).forEach(p => {
          if (!activeByGc[p.gc]) activeByGc[p.gc] = { gc: p.gc, projects: 0, openRfis: 0, openSubs: 0, backlog: 0 };
          activeByGc[p.gc].projects++;
          activeByGc[p.gc].backlog += getAdjustedContract(p, changeOrders);
        });
        (rfis || []).filter(r => r.status === "open" || r.status === "pending").forEach(r => {
          const proj = projects.find(p => String(p.id) === String(r.projectId));
          if (proj?.gc && activeByGc[proj.gc]) activeByGc[proj.gc].openRfis++;
        });
        (submittals || []).filter(s => s.status === "pending" || s.status === "submitted").forEach(s => {
          const proj = projects.find(p => String(p.id) === String(s.projectId));
          if (proj?.gc && activeByGc[proj.gc]) activeByGc[proj.gc].openSubs++;
        });
        const gcList = Object.values(activeByGc).sort((a, b) => b.backlog - a.backlog);
        if (gcList.length === 0) return null;
        return (
          <div className="card dash-card mt-16">
            <div className="text-sm font-semi mb-8 flex-center-gap-6">
              <Building2 size={15} /> {t("GC Relationships")}
              <span className="text-xs text-muted fw-400">{gcList.length} active</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table-clean" style={{ width: "100%" }}>
                <thead><tr>
                  <th className="text-xs text-muted">{t("General Contractor")}</th>
                  <th className="text-xs text-muted text-right">{t("Projects")}</th>
                  <th className="text-xs text-muted text-right">{t("Backlog")}</th>
                  <th className="text-xs text-muted text-right">{t("Open RFIs")}</th>
                  <th className="text-xs text-muted text-right">{t("Open Subs")}</th>
                </tr></thead>
                <tbody>
                  {gcList.slice(0, 8).map(g => (
                    <tr key={g.gc} className="cursor-pointer" onClick={() => navigateWithContext("projects", { search: g.gc })}>
                      <td className="text-sm fw-600">{g.gc}</td>
                      <td className="text-sm text-right">{g.projects}</td>
                      <td className="text-sm text-right">{fmtK(g.backlog)}</td>
                      <td className="text-sm text-right" style={{ color: g.openRfis > 0 ? "var(--amber)" : "var(--text3)" }}>{g.openRfis}</td>
                      <td className="text-sm text-right" style={{ color: g.openSubs > 0 ? "var(--amber)" : "var(--text3)" }}>{g.openSubs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Section 5: Follow-ups & Recent Activity side by side ── */}
      <div className="flex gap-16 mt-16 flex-wrap">
        {dashActions.followUps.length > 0 && (
          <div className="card chart-card-half">
            <div className="text-sm font-semi mb-8">Follow-ups</div>
            {dashActions.followUps.slice(0, 5).map((c, i) => (
              <div key={i} className="flex gap-8 log-item--clickable"
                onClick={() => navigateWithContext("contacts", { search: c.contact || "" })}>
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
              onClick={() => navigateWithContext("contacts", { search: c.contact || "" })}>
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

      {/* Weekly Digest removed — called banned external AI API (generateWeeklyDigest).
         Quick Brief already serves the same purpose using local computation. */}

      {/* Quick Actions removed — redundant tab-bar restatement (audit: "zero-value noise") */}
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
            className="mb-sp2 fs-label" style={{ resize: "vertical", fontFamily: "inherit", minHeight: 120 }} />
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
              <div className="rounded-control mt-sp3 p-sp4 bg-bg3" style={{ border: "2px solid var(--accent)" }}>
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
                <div key={i} className="rounded-control mb-sp2 p-sp3 bg-bg3" style={{ border: "1px solid var(--border)" }}>
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
                        <a key={li} href={link} target="_blank" rel="noopener noreferrer" className="text-amber word-break-all mr-sp2">{link.length > 60 ? link.slice(0, 60) + "..." : link}</a>
                      ))}
                    </div>
                  )}
                  {bid.notes && <div className="text-xs text-dim mt-4 text-italic">{bid.notes}</div>}
                </div>
              ))}
            </div>
          )}
          {emailResults && emailResults.length === 0 && (
            <div className="text-sm text-muted p-sp3 text-center">No bid information found. Try pasting the full email including subject line and body.</div>
          )}
        </div>
      )}

      {/* ── KPI Strip ── */}
      {(() => {
        const activeBids = bids.filter(b => BID_ACTIVE_STATUSES.includes(b.status) && !b.convertedToProject);
        const activeVol = activeBids.reduce((s, b) => s + (b.value || 0), 0);
        const submittedBids = bids.filter(b => ["submitted", "clarifications", "negotiating"].includes(b.status));
        const submittedVol = submittedBids.reduce((s, b) => s + (b.value || 0), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const awardedThisMonth = bids.filter(b => b.status === "awarded" && b.lastActivityDate && b.lastActivityDate >= monthStart).length;
        const totalDecided = bids.filter(b => ["awarded", "lost"].includes(b.status)).length;
        const totalWon = bids.filter(b => b.status === "awarded").length;
        const winRate = totalDecided > 0 ? Math.round((totalWon / totalDecided) * 100) : 0;
        const overdueFU = submittedBids.filter(b => {
          if (b.followUpDate && new Date(b.followUpDate) <= now) return true;
          const lastFU = b.lastFollowUp || b.lastActivityDate;
          return lastFU && Math.floor((now - new Date(lastFU)) / 86400000) >= 7;
        }).length;
        const weekOut = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
        const dueThisWeek = activeBids.filter(b => b.due && b.due <= weekOut && b.due >= now.toISOString().slice(0, 10)).length;
        return (
          <div className="flex gap-sp3 mb-12 flex-wrap" style={{ padding: "var(--space-2) 0" }}>
            {[
              { label: "Active", value: fmtK(activeVol), sub: `${activeBids.length} bids` },
              { label: "Submitted", value: fmtK(submittedVol), sub: `${submittedBids.length} bids` },
              { label: "Awarded", value: String(awardedThisMonth), sub: "this month" },
              { label: "Win Rate", value: `${winRate}%`, sub: `${totalWon}/${totalDecided}` },
              { label: "F/U Overdue", value: String(overdueFU), sub: "need action", color: overdueFU > 0 ? "var(--red)" : undefined },
              { label: "Due This Week", value: String(dueThisWeek), sub: "bids", color: dueThisWeek > 0 ? "var(--amber)" : undefined },
            ].map(k => (
              <div key={k.label} className="text-center" style={{ flex: 1, minWidth: 80 }}>
                <div className="fs-xs text-muted">{k.label}</div>
                <div className="font-bold fs-secondary" style={{ color: k.color || "var(--text)" }}>{k.value}</div>
                <div className="fs-10 text-dim">{k.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="flex-between mb-16">
        <div className="flex gap-4 flex-wrap items-center">
          {BID_FILTERS.map(f => (
            <button
              key={f}
              className={`btn btn-sm ${bidFilter === f ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setBidFilter(f)}
            >
              {t(f)}
            </button>
          ))}
          <button className={`btn btn-sm ${bidAdvOpen ? "btn-primary" : bidAdvActive ? "btn-amber" : "btn-ghost"}`} onClick={() => setBidAdvOpen(o => !o)}>
            {bidAdvActive ? "Filters Active" : "Filters"}
          </button>
        </div>
        <div className="flex gap-4">
          <button className={`btn btn-sm flex-center-gap-4 ${bidViewMode === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBidViewMode("list")}><List className="w-4 h-4" /> List</button>
          <button className={`btn btn-sm flex-center-gap-4 ${bidViewMode === "pipeline" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBidViewMode("pipeline")}><Columns className="w-4 h-4" /> Pipeline</button>
          <button className={`btn btn-sm flex-center-gap-4 ${bidViewMode === "calendar" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBidViewMode("calendar")}><Calendar className="w-4 h-4" /> Calendar</button>
        </div>
      </div>

      {/* ── Advanced Filter Panel ── */}
      {bidAdvOpen && (
        <div className="card mb-16" style={{ padding: "var(--space-3) var(--space-4)" }}>
          <div className="flex gap-8 flex-wrap items-end">
            <div className="form-group" style={{ minWidth: 120 }}>
              <label className="form-label fs-xs">Estimator</label>
              <select className="form-select fs-label" value={bidAdvFilter.estimator} onChange={e => setBidAdvFilter(f => ({ ...f, estimator: e.target.value }))}>
                <option value="">All</option>
                {[...new Set(bids.map(b => b.estimator).filter(Boolean))].sort().map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 120 }}>
              <label className="form-label fs-xs">GC</label>
              <input className="form-input fs-label" placeholder="Filter GC..." value={bidAdvFilter.gc} onChange={e => setBidAdvFilter(f => ({ ...f, gc: e.target.value }))} style={{ width: 120 }} />
            </div>
            <div className="form-group" style={{ minWidth: 120 }}>
              <label className="form-label fs-xs">Sector</label>
              <select className="form-select fs-label" value={bidAdvFilter.sector} onChange={e => setBidAdvFilter(f => ({ ...f, sector: e.target.value }))}>
                <option value="">All</option>
                {BID_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 120 }}>
              <label className="form-label fs-xs">Scope</label>
              <select className="form-select fs-label" value={bidAdvFilter.scope} onChange={e => setBidAdvFilter(f => ({ ...f, scope: e.target.value }))}>
                <option value="">All</option>
                {BID_SCOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 80 }}>
              <label className="form-label fs-xs">Risk</label>
              <select className="form-select fs-label" value={bidAdvFilter.risk} onChange={e => setBidAdvFilter(f => ({ ...f, risk: e.target.value }))}>
                <option value="">All</option>
                <option value="High">High</option>
                <option value="Med">Med</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 110 }}>
              <label className="form-label fs-xs">Due After</label>
              <input className="form-input fs-label" type="date" value={bidAdvFilter.dueAfter} onChange={e => setBidAdvFilter(f => ({ ...f, dueAfter: e.target.value }))} />
            </div>
            <div className="form-group" style={{ minWidth: 110 }}>
              <label className="form-label fs-xs">Due Before</label>
              <input className="form-input fs-label" type="date" value={bidAdvFilter.dueBefore} onChange={e => setBidAdvFilter(f => ({ ...f, dueBefore: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-12 mt-8 items-center">
            <label className="flex-center-gap-4 text-xs cursor-pointer">
              <input type="checkbox" checked={bidAdvFilter.overdueOnly} onChange={e => setBidAdvFilter(f => ({ ...f, overdueOnly: e.target.checked }))} /> Overdue only
            </label>
            <label className="flex-center-gap-4 text-xs cursor-pointer">
              <input type="checkbox" checked={bidAdvFilter.noPlans} onChange={e => setBidAdvFilter(f => ({ ...f, noPlans: e.target.checked }))} /> No plans
            </label>
            <label className="flex-center-gap-4 text-xs cursor-pointer">
              <input type="checkbox" checked={bidAdvFilter.staleOnly} onChange={e => setBidAdvFilter(f => ({ ...f, staleOnly: e.target.checked }))} /> Stale (14d+)
            </label>
            {bidAdvActive && (
              <button className="btn btn-ghost btn-sm text-red ml-auto" onClick={() => setBidAdvFilter({ estimator: "", gc: "", sector: "", scope: "", risk: "", dueBefore: "", dueAfter: "", overdueOnly: false, noPlans: false, staleOnly: false })}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {selectedBids.size > 0 && (
        <div className="card mt-16 flex gap-sp3" style={{ padding: "var(--space-3) var(--space-4)" }}>
          <span className="text-sm font-semi">{selectedBids.size} {t("selected")}</span>
          <select className="form-select fs-label" style={{ width: "auto" }} defaultValue="" onChange={e => {
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
                    pm: b.estimator || "", laborBudget: 0, laborHours: 0,
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
                    const pDue = b.due ? new Date(b.due) : null;
                    const pDaysLeft = pDue && !isNaN(pDue) ? Math.ceil((pDue - new Date()) / 86400000) : null;
                    const pNA = getNextAction(b, projects);
                    const pNAMeta = pNA ? NEXT_ACTION[pNA] : null;
                    return (
                    <div key={b.id} className="bid-card" style={{ marginBottom: "var(--space-2)", padding: "var(--space-3) var(--space-3)", cursor: "pointer", opacity: b.convertedToProject ? 0.7 : 1, borderLeft: pNAMeta ? `3px solid ${pNAMeta.color}` : undefined }}
                      onClick={() => b.convertedToProject && linkedProject ? setModal({ type: "viewProject", data: linkedProject }) : setModal({ type: "editBid", data: b })}>
                      <div className="flex-between mb-2">
                        <div className="text-xs font-semi lh-13" style={{ flex: 1 }}>{b.name}</div>
                        {pDaysLeft !== null && (
                          <span className="fs-10 fw-600 ml-4" style={{ color: pDaysLeft < 0 ? "var(--red)" : pDaysLeft <= 3 ? "var(--amber)" : "var(--text3)", whiteSpace: "nowrap" }}>
                            {pDaysLeft < 0 ? `${Math.abs(pDaysLeft)}d over` : pDaysLeft === 0 ? "Today" : `${pDaysLeft}d`}
                          </span>
                        )}
                      </div>
                      <div className="flex-between">
                        <span className="text-xs text-muted">{b.gc}</span>
                        <span className="text-xs font-mono text-amber">{b.value ? fmt(b.value) : "—"}</span>
                      </div>
                      <div className="flex gap-4 mt-4 flex-wrap">
                        <span className={`badge ${STATUS_BADGE[b.status] || "badge-muted"} fs-9`}>{STATUS_LABEL[b.status] || b.status}</span>
                        {b.estimator && <span className="text-xs text-blue">{b.estimator.split(" ")[0]}</span>}
                        {pNAMeta && <span className="fs-9 fw-600" style={{ color: pNAMeta.color }}>{pNAMeta.label}</span>}
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
                  <div className="text-xs text-muted p-sp2 text-center">No upcoming deadlines</div>
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
                {upcoming.length > 10 && <div className="text-xs text-dim text-center p-sp1">+{upcoming.length - 10} more</div>}
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
            // Readiness (5 milestones)
            const hasPlans = (b.attachments || []).length > 0 || b.plansUploaded;
            const hasScope = (b.scope || []).length > 0;
            const hasEstimator = !!(b.estimator);
            const hasValue = b.value > 0;
            const hasProposal = !!(b.proposalStatus);
            const readiness = [hasPlans, hasScope, hasEstimator, hasValue, hasProposal].filter(Boolean).length;
            const readinessMax = 5;
            // Next action + last touch
            const nextAction = getNextAction(b, projects);
            const naMeta = nextAction ? NEXT_ACTION[nextAction] : null;
            const lastTouch = getLastTouch(b);
            return (
            <div key={b.id} className="bid-card pos-relative" onClick={() => setModal({ type: "editBid", data: b })}>
              {/* Top row: status + risk + due countdown */}
              <div className="flex-between mb-4">
                <span className="flex-center-gap-6">
                  <input type="checkbox" checked={selectedBids.has(b.id)} onClick={e => e.stopPropagation()} onChange={e => {
                    setSelectedBids(prev => { const n = new Set(prev); e.target.checked ? n.add(b.id) : n.delete(b.id); return n; });
                  }} className="cursor-pointer" />
                  <span className={`badge ${STATUS_BADGE[b.status] || "badge-muted"}`}>{STATUS_LABEL[b.status] || b.status}</span>
                  {b.risk === "High" && <span className="badge badge-red fs-10">High</span>}
                  {b.priority && <span className={`badge ${b.priority === "hot" ? "badge-red" : b.priority === "warm" ? "badge-amber" : b.priority === "strategic" ? "badge-blue" : "badge-muted"} fs-10`}>{b.priority.charAt(0).toUpperCase() + b.priority.slice(1)}</span>}
                </span>
                <span className="fw-semi fs-tab" style={{ color: dueColor }}>{dueLabel}</span>
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
                {hasValue ? <span className="font-mono font-bold text-amber fs-secondary">{fmt(b.value)}</span> : <span className="text-xs text-muted text-italic">No estimate</span>}
                {b.estimator && <span className="text-xs text-blue">{b.estimator}</span>}
              </div>
              {/* Readiness bar + next action */}
              <div className="mt-sp2 gap-sp1" style={{ display: "flex", alignItems: "center" }}>
                {Array.from({ length: readinessMax }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: "var(--radius-control)", background: i < readiness ? "var(--green)" : "var(--border)" }} />
                ))}
                <span className="text-xs text-muted ml-sp1 fs-xs">{readiness}/{readinessMax}</span>
                {naMeta && (
                  <span className="ml-sp2 fs-10 fw-600" style={{ color: naMeta.color, background: naMeta.bg, padding: "1px 6px", borderRadius: "var(--radius-control)", whiteSpace: "nowrap" }}>
                    {naMeta.label}
                  </span>
                )}
              </div>
              {/* Quick indicators row */}
              <div className="flex gap-6 mt-6 flex-wrap fs-10 text-muted">
                <span style={{ color: hasPlans ? "var(--green)" : "var(--text3)" }}>{hasPlans ? "Plans" : "No plans"}</span>
                {(b.addendaCount || 0) > 0 && <span className="text-amber">{b.addendaCount} addenda</span>}
                {hasScope && <span>{(b.scope || []).slice(0, 3).join(", ")}{(b.scope || []).length > 3 ? "..." : ""}</span>}
                {b.contact && <span>{b.contact}</span>}
                {b.followUpDate && <span style={{ color: new Date(b.followUpDate) <= new Date() ? "var(--red)" : "var(--text2)" }}>Next F/U: {b.followUpDate}</span>}
                {lastTouch && <span style={{ marginLeft: "auto" }}>Last touch: {lastTouch}</span>}
              </div>
              {/* Action row */}
              <div className="flex gap-4 mt-6 flex-wrap">
                {["submitted", "clarifications", "negotiating"].includes(b.status) && (
                  <button className="btn btn-ghost btn-sm btn-xs"
                    onClick={(e) => { e.stopPropagation(); openFollowUpLog(b); }}>
                    {b.followUpDate && new Date(b.followUpDate) <= new Date() ? "Follow-Up Due!" : "Log Follow-Up"}
                  </button>
                )}
                {b.status === "awarded" && !projects.some(p => p.bidId === b.id) && (
                  <button className="btn btn-primary btn-sm btn-xs"
                    onClick={(e) => { e.stopPropagation(); openHandoff(b); }}>
                    Convert to Project
                  </button>
                )}
                {b.status === "awarded" && projects.some(p => p.bidId === b.id) && (() => {
                  const linkedProj = projects.find(p => p.bidId === b.id);
                  return (
                    <button className="btn btn-ghost btn-sm fs-xs c-green" style={{ padding: "var(--space-1) var(--space-2)" }}
                      onClick={(e) => { e.stopPropagation(); if (linkedProj) setModal({ type: "viewProject", data: linkedProj }); }}>
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

      {/* Follow-Up Log Modal */}
      {followUpBid && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => { setFollowUpBid(null); setFollowUpText(""); })}>
          <div className="modal-content modal-md">
            <div className="modal-header flex-between">
              <div className="modal-title">Follow-Up: {followUpBid.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFollowUpBid(null); setFollowUpText(""); }}>{t("Close")}</button>
            </div>
            <div className="p-16">
              <div className="text-xs text-muted mb-12">GC: {followUpBid.gc} · Contact: {followUpBid.contact || "—"}</div>

              {/* Previous follow-ups */}
              {(followUpBid.followUpLog || []).length > 0 && (
                <div className="mb-12">
                  <div className="text-xs font-semi mb-4">History</div>
                  {(followUpBid.followUpLog || []).slice(-5).map((entry, i) => (
                    <div key={i} className="flex gap-8 text-xs text-muted py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="fw-500">{entry.date}</span>
                      <span className="badge badge-muted fs-9">{entry.method}</span>
                      <span style={{ flex: 1 }}>{entry.result || "—"}</span>
                      <span>{entry.by}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Log new follow-up */}
              <div className="text-xs font-semi mb-8">Log Follow-Up</div>
              <div className="flex gap-8 mb-8">
                {["call", "email", "text", "in-person"].map(m => (
                  <button key={m} className={`btn btn-sm ${followUpForm.method === m ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFollowUpForm(f => ({ ...f, method: m }))}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <div className="form-group mb-8">
                <label className="form-label fs-xs">Contact</label>
                <input className="form-input" value={followUpForm.contact} onChange={e => setFollowUpForm(f => ({ ...f, contact: e.target.value }))} placeholder="Who did you speak with?" />
              </div>
              <div className="form-group mb-8">
                <label className="form-label fs-xs">Result / Notes</label>
                <textarea className="form-textarea" rows={2} value={followUpForm.result} onChange={e => setFollowUpForm(f => ({ ...f, result: e.target.value }))} placeholder="Left voicemail, awaiting response, GC said..." />
              </div>
              <div className="form-group mb-12">
                <label className="form-label fs-xs">Next Follow-Up Date</label>
                <input className="form-input" type="date" value={followUpForm.nextDate} onChange={e => setFollowUpForm(f => ({ ...f, nextDate: e.target.value }))} />
              </div>
              <div className="flex gap-8">
                <button className="btn btn-primary btn-sm" onClick={saveFollowUpLog}>Save Follow-Up</button>
                <button className="btn btn-ghost btn-sm" onClick={() => runFollowUp(followUpBid)} disabled={followUpLoading}>
                  {followUpLoading ? "Drafting..." : "AI Draft Email"}
                </button>
              </div>

              {/* AI-generated email (shown after clicking AI Draft) */}
              {followUpText && (
                <div className="mt-12" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
                  <div className="text-xs font-semi mb-4">AI Draft Email</div>
                  <pre className="pre-wrap-content">{followUpText}</pre>
                  <div className="flex gap-8 mt-8">
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      navigator.clipboard.writeText(followUpText);
                      show("Copied to clipboard", "ok");
                    }}>{t("Copy Email")}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => runFollowUp(followUpBid)}>{t("Regenerate")}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Handoff Modal */}
      {handoffBid && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => setHandoffBid(null))}>
          <div className="modal-content modal-md">
            <div className="modal-header flex-between">
              <div className="modal-title">Project Handoff: {handoffBid.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setHandoffBid(null)}>{t("Close")}</button>
            </div>
            <div className="p-16">
              <div className="text-xs text-muted mb-12">GC: {handoffBid.gc} · Estimator: {handoffBid.estimator || "—"}</div>

              <div className="form-group mb-8">
                <label className="form-label fs-xs">Contract Value ($)</label>
                <input className="form-input" type="number" value={handoffForm.contractValue} onChange={e => setHandoffForm(f => ({ ...f, contractValue: Number(e.target.value) }))} />
                {handoffForm.contractValue !== (handoffBid.value || 0) && (
                  <div className="text-xs text-amber mt-2">Original bid: {fmt(handoffBid.value || 0)} → Contract: {fmt(handoffForm.contractValue)}</div>
                )}
              </div>

              <div className="form-group mb-8">
                <label className="form-label fs-xs">Scope Awarded</label>
                <div className="flex gap-4 flex-wrap">
                  {(handoffBid.scope || []).map(s => (
                    <span key={s} className="badge badge-muted fs-10">{s}</span>
                  ))}
                  {(handoffBid.scope || []).length === 0 && <span className="text-xs text-dim">No scope tags</span>}
                </div>
              </div>

              {handoffBid.exclusions && (
                <div className="form-group mb-8">
                  <label className="form-label fs-xs">Exclusions</label>
                  <div className="text-xs text-muted" style={{ whiteSpace: "pre-wrap" }}>{handoffBid.exclusions}</div>
                </div>
              )}

              <div className="flex gap-8 mb-8">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label fs-xs">Project Manager</label>
                  <select className="form-select" value={handoffForm.pm} onChange={e => setHandoffForm(f => ({ ...f, pm: e.target.value }))}>
                    <option value="">Select PM...</option>
                    <option value="Emmanuel Aguilar">Emmanuel Aguilar</option>
                    <option value="Abner Aguilar">Abner Aguilar</option>
                    <option value="Isai">Isai</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label fs-xs">Superintendent</label>
                  <select className="form-select" value={handoffForm.super} onChange={e => setHandoffForm(f => ({ ...f, super: e.target.value }))}>
                    <option value="">Select Super...</option>
                    {(employees || []).filter(emp => emp.role === "Foreman" || emp.role === "Superintendent").map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group mb-8">
                <label className="form-label fs-xs">Documents ({(handoffBid.attachments || []).length} files)</label>
                <div className="text-xs text-muted">{(handoffBid.attachments || []).length > 0 ? "All bid documents will be copied to the project." : "No documents attached — request plans from GC."}</div>
              </div>

              <div className="form-group mb-12">
                <label className="form-label fs-xs">Handoff Notes</label>
                <textarea className="form-textarea" rows={2} value={handoffForm.notes} onChange={e => setHandoffForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything the field team needs to know..." />
              </div>

              <div className="flex gap-8">
                <button className="btn btn-primary" onClick={executeHandoff}>Create Project</button>
                <button className="btn btn-ghost" onClick={() => setHandoffBid(null)}>Cancel</button>
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
        <button className={`btn btn-sm flex-center-gap-4 ${projectViewMode === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjectViewMode("list")}><List className="w-4 h-4" /> List</button>
        <button className={`btn btn-sm flex-center-gap-4 ${projectViewMode === "summary" ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjectViewMode("summary")}><Columns className="w-4 h-4" /> Summary</button>
        <button className={`btn btn-sm flex-center-gap-4 ${projectViewMode === "schedule" ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjectViewMode("schedule")}><BarChart2 className="w-4 h-4" /> Schedule</button>
      </div>

      {/* Cross-Project Summary Table */}
      {projectViewMode === "summary" && (
        <div className="mb-sp4 overflow-x-auto">
          <table className="fs-label w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="border-b text-left" style={{ borderBottomWidth: 2 }}>
                <th className="fw-bold c-text3" style={{ padding: "var(--space-2) var(--space-2)" }}>Project</th>
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
                    onClick={() => { setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, lastAccessed: new Date().toISOString() } : proj)); setModal({ type: "viewProject", data: p }); }}>
                    <td className="fw-semi c-blue nowrap overflow-hidden" style={{ padding: "var(--space-2) var(--space-2)", maxWidth: 180, textOverflow: "ellipsis" }}>{p.name}</td>
                    <td className="text-right" style={{ padding: "var(--space-2) var(--space-2)" }}>
                      <div className="flex-center-gap-4 inline-flex">
                        <div className="rounded-control bg-bg3 overflow-hidden" style={{ width: 40, height: 6 }}>
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
            setModal({ type: "viewProject", data: { ...p, lastAccessed: new Date().toISOString() } });
          }}
        />
      )}

      {/* Search Bar */}
      {projectViewMode === "list" && <>
      <div className="mb-sp4">
        <input
          className="form-input w-full"
          type="text"
          placeholder={t("Search projects by name, GC, or phase...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 500 }}
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
                    onClick={() => { const p = projects.find(p => p.name?.toLowerCase().includes(r.project?.toLowerCase())); if (p) setModal({ type: "viewProject", data: p }); }}>
                    <div className="flex-between mb-4">
                      <span className="font-semi text-sm">{r.project}</span>
                      <div className="flex gap-8 flex-center">
                        <span className="fs-subtitle fw-bold" style={{ color: riskColor }}>{r.riskScore}</span>
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
                      onClick={a.project ? () => { const p = projects.find(p => p.name?.toLowerCase().includes(a.project.toLowerCase())); if (p) setModal({ type: "viewProject", data: p }); } : undefined}>
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
              setModal({ type: "viewProject", data: { ...p, lastAccessed: new Date().toISOString() } });
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
              {/* Plans needed banner */}
              {p.needsPlans && (
                <div className="flex-between mb-4" style={{ padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-sm, 4px)", background: "var(--amber-dim)", border: "1px solid var(--amber)" }}>
                  <span className="fs-10 fw-semi" style={{ color: "var(--amber)" }}>Plans needed — request from GC</span>
                  <button className="fs-9 fw-semi cursor-pointer" style={{ background: "none", border: "none", color: "var(--amber)", padding: "0 4px" }}
                    onClick={(e) => { e.stopPropagation(); setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, needsPlans: false, plansRequestedAt: new Date().toISOString() } : proj)); show(`Plans marked as requested for ${p.name}`); }}>
                    Mark Requested
                  </button>
                </div>
              )}
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
                {(() => { const costs = computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, companySettings?.laborBurdenMultiplier || 1.35, accruals || []); const c = getAdjustedContract(p, changeOrders); const thr = companySettings?.marginAlertThreshold || 25; if (costs.total > 0 && c > 0) { const m = Math.round(((c - costs.total) / c) * 100); if (m < thr) return <span style={{ color: m < 0 ? "#dc2626" : "var(--red)", fontWeight: "var(--weight-semi)" }}>Margin: {m}%</span>; } return null; })()}
                {pRfis.length === 0 && pSubs.length === 0 && pCOs.length === 0 && !billingLag && <span className="text-green">On track</span>}
              </div>
              {/* Closeout button for near-complete */}
              {(p.progress || 0) >= 75 && (
                <div className="mt-6">
                  <button className="btn btn-ghost btn-sm fs-xs c-amber" style={{ padding: "var(--space-1) var(--space-2)" }}
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
                <div className="flex gap-12 mb-12 flex-wrap rounded-control p-sp3 bg-bg3">
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
  const [digestTimestamp, setDigestTimestamp] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  // runWeeklyDigest removed — called banned external AI API (generateWeeklyDigest).
  // Quick Brief auto-computes the same information from local data.

  // ── morning briefing (auto-computed) ──
  const [lookAheadDays, setLookAheadDays] = useState(7);

  const briefResult = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const parseDate = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };
    const fmt = (n) => "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
    const crewCount = new Set((teamSchedule || []).filter(s => s.days?.[todayKey]).map(s => s.employeeId)).size;
    const siteCount = new Set((teamSchedule || []).filter(s => s.days?.[todayKey]).map(s => s.projectId)).size;
    const dayLabel = now.toLocaleDateString("en-US", { weekday: "long" });
    const timeLabel = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const greetName = auth?.name?.split(" ")[0] || "Boss";
    const GREETINGS = [
      `Que pedo, ${greetName}`,
      `What's good, ${greetName}`,
      `Rise and grind, ${greetName}`,
      `Let's get it, ${greetName}`,
      `Arriba, ${greetName}`,
      `Orale pues, ${greetName}`,
      `Another day, another dollar, ${greetName}`,
      `Lock in, ${greetName}`,
      `A darle, ${greetName}`,
      `Eagle mode, ${greetName}`,
      `Vamos, ${greetName}`,
      `Back at it, ${greetName}`,
      `Let's eat, ${greetName}`,
      `Echale ganas, ${greetName}`,
      `No days off, ${greetName}`,
      `Wassup, ${greetName}`,
      `Pa'lante, ${greetName}`,
      `Ready or not, ${greetName}`,
      `Con todo, ${greetName}`,
      `Time to build, ${greetName}`,
    ];
    // Pick greeting based on day-of-year so it stays stable within a day but changes daily
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const greetLine = GREETINGS[dayOfYear % GREETINGS.length];
    const greeting = `${greetLine} — ${dayLabel} ${timeLabel}, ${siteCount} site${siteCount !== 1 ? "s" : ""} active, ${crewCount} crew scheduled`;

    // ── Urgent Alerts ──
    const urgentAlerts = [];

    const dueBids = bids.filter(b => b.status === "estimating" && b.due && parseDate(b.due) >= now && parseDate(b.due) <= in7);
    dueBids.forEach(b => urgentAlerts.push({ type: "Bid", alert: `"${b.name || "Untitled"}" due ${new Date(b.due).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`, project: b.gc, action: "Finalize and submit", tab: "bids" }));

    const unassignedBids = bids.filter(b => !b.estimator && ["invite_received","reviewing","assigned","takeoff","awaiting_quotes","pricing","draft_ready","estimating"].includes(b.status) && b.due && parseDate(b.due) >= now && parseDate(b.due) <= in7);
    unassignedBids.forEach(b => urgentAlerts.push({ type: "Unassigned", alert: `"${b.name || "Untitled"}" has no estimator — due ${new Date(b.due).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`, project: b.gc, action: "Assign an estimator now", tab: "bids" }));

    const overdueInvs = invoices.filter(i => i.status === "overdue" || (i.status === "pending" && parseDate(i.date) && (now - parseDate(i.date)) > 30 * 86400000));
    if (overdueInvs.length > 0) {
      const total = overdueInvs.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      urgentAlerts.push({ type: "A/R", alert: `${overdueInvs.length} overdue invoice${overdueInvs.length > 1 ? "s" : ""} totaling ${fmt(total)}`, action: "Follow up on collections", tab: "financials" });
    }

    const marginThr = companySettings?.marginAlertThreshold || 25;
    const activeProjs = projects.filter(p => !p.deletedAt && (p.status === "in-progress" || p.status === "active"));
    const briefBurden = companySettings?.laborBurdenMultiplier || 1.35;
    const lowMargin = activeProjs.filter(p => {
      const adjContract = getAdjustedContract(p, changeOrders);
      if (adjContract <= 0) return false;
      const costs = computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, briefBurden, accruals || []);
      if (costs.total <= 0) return false;
      const margin = Math.round(((adjContract - costs.total) / adjContract) * 100);
      return margin < marginThr;
    });
    lowMargin.forEach(p => urgentAlerts.push({ type: "Margin", alert: `"${p.name}" is below ${marginThr}% margin target`, project: p.name, action: "Review labor costs and estimate", tab: "projects" }));

    const openInc = (incidents || []).filter(i => i.status === "open" || !i.status);
    if (openInc.length > 0) urgentAlerts.push({ type: "Safety", alert: `${openInc.length} open safety incident${openInc.length > 1 ? "s" : ""} need resolution`, action: "Investigate and close out", tab: "safety" });

    const expCerts = (certifications || []).filter(c => { const exp = c.expirationDate ? new Date(c.expirationDate) : null; return exp && exp <= now; });
    if (expCerts.length > 0) urgentAlerts.push({ type: "Compliance", alert: `${expCerts.length} expired certification${expCerts.length > 1 ? "s" : ""} — crew may not be compliant`, action: "Renew or reassign affected workers", tab: "settings", subTab: "credentials" });

    const overdueRfis = (rfis || []).filter(r => r.status !== "Answered" && r.status !== "Closed").filter(r => {
      const sub = r.submitted || r.dateSubmitted;
      return sub && (now - new Date(sub)) > 7 * 86400000;
    });
    if (overdueRfis.length > 0) urgentAlerts.push({ type: "RFI", alert: `${overdueRfis.length} RFI${overdueRfis.length > 1 ? "s" : ""} overdue (oldest: ${Math.floor((now - new Date(overdueRfis[0].submitted || overdueRfis[0].dateSubmitted)) / 86400000)}d)`, action: "Follow up with GC or architect", tab: "projects" });

    // ── Today's Focus ──
    const todaysFocus = [];

    const pendCOs = changeOrders.filter(co => co.status !== "approved" && co.status !== "rejected" && !co.deletedAt);
    if (pendCOs.length > 0) {
      const coTotal = pendCOs.reduce((s, co) => s + (Math.abs(Number(co.amount)) || 0), 0);
      todaysFocus.push({ item: `${pendCOs.length} change order${pendCOs.length > 1 ? "s" : ""} pending approval (${fmt(coTotal)})`, priority: coTotal > 10000 ? "high" : "medium", tab: "projects", actionLabel: "Review COs" });
    }

    const pendMat = (materialRequests || []).filter(r => r.status === "requested");
    if (pendMat.length > 0) todaysFocus.push({ item: `${pendMat.length} material request${pendMat.length > 1 ? "s" : ""} awaiting review`, priority: pendMat.some(r => r.urgency === "urgent" || r.urgency === "emergency") ? "high" : "medium", tab: "materials", actionLabel: "Review Materials" });

    const unreviewed = (dailyReports || []).filter(r => !r.reviewedBy);
    if (unreviewed.length > 0) todaysFocus.push({ item: `${unreviewed.length} daily report${unreviewed.length > 1 ? "s" : ""} need review`, priority: unreviewed.length > 3 ? "high" : "medium", tab: "reports", actionLabel: "Review Reports" });

    const in14 = new Date(now.getTime() + 14 * 86400000);
    const subsDue = submittals.filter(s => s.status !== "approved" && parseDate(s.due) && parseDate(s.due) <= in14);
    if (subsDue.length > 0) todaysFocus.push({ item: `${subsDue.length} submittal${subsDue.length > 1 ? "s" : ""} due within 14 days`, priority: "medium", tab: "projects", actionLabel: "Check Submittals" });

    if (crewCount > 0) todaysFocus.push({ item: `${crewCount} crew member${crewCount > 1 ? "s" : ""} scheduled across ${siteCount} site${siteCount > 1 ? "s" : ""}`, priority: "low", tab: "calendar", actionLabel: "View Schedule" });

    // ── Money Moves ──
    const moneyMoves = [];

    const pendingInv = invoices.filter(i => i.status === "draft" || i.status === "pending");
    if (pendingInv.length > 0) {
      const invTotal = pendingInv.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      moneyMoves.push({ item: `${pendingInv.length} invoice${pendingInv.length > 1 ? "s" : ""} to send`, amount: fmt(invTotal), action: "Send to GC", deadline: "This week", tab: "financials", actionLabel: "Send Invoices" });
    }

    const backlogVal = activeProjs.reduce((s, p) => {
      const adjContract = getAdjustedContract(p, changeOrders);
      const billed = invoices.filter(i => String(i.projectId) === String(p.id) && !i.deletedAt).reduce((s2, i) => s2 + (Number(i.amount) || 0), 0);
      return s + Math.max(0, adjContract - billed);
    }, 0);
    if (backlogVal > 0) moneyMoves.push({ item: "Remaining backlog to bill", amount: fmt(backlogVal), action: "Bill as work completes", deadline: "Ongoing", tab: "financials", actionLabel: "View Billing" });

    const activeBids = bids.filter(b => b.status === "estimating" || b.status === "submitted");
    const pipelineVal = activeBids.reduce((s, b) => s + (b.value || 0), 0);
    if (pipelineVal > 0) moneyMoves.push({ item: `${activeBids.length} bids in pipeline`, amount: fmt(pipelineVal), action: "Track and follow up", deadline: "Active", tab: "bids", actionLabel: "View Pipeline" });

    // ── Summary ──
    const parts = [];
    if (activeProjs.length > 0) parts.push(`${activeProjs.length} active project${activeProjs.length > 1 ? "s" : ""}`);
    if (dueBids.length > 0) parts.push(`${dueBids.length} bid${dueBids.length > 1 ? "s" : ""} due this week`);
    if (urgentAlerts.length > 0) parts.push(`${urgentAlerts.length} item${urgentAlerts.length > 1 ? "s" : ""} needing attention`);
    const summary = parts.length > 0 ? `You have ${parts.join(", ")}.` : "All clear — no urgent items today.";

    // Only show brief if there's something to say
    const hasContent = urgentAlerts.length > 0 || todaysFocus.length > 0 || moneyMoves.length > 0;
    if (!hasContent) return null;

    return { greeting, summary, urgentAlerts, todaysFocus, moneyMoves };
  }, [bids, invoices, projects, changeOrders, companySettings, timeEntries, incidents, certifications, rfis, submittals, materialRequests, dailyReports, teamSchedule, auth]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [followUpForm, setFollowUpForm] = useState({ method: "email", result: "", nextDate: "", contact: "" });

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
    } finally {
      setFollowUpLoading(false);
    }
  };

  const openFollowUpLog = (bid) => {
    setFollowUpBid(bid);
    setFollowUpForm({ method: "email", result: "", nextDate: "", contact: bid.contact || bid.gc || "" });
    setFollowUpText("");
  };

  const saveFollowUpLog = () => {
    if (!followUpBid) return;
    const today = new Date().toISOString().slice(0, 10);
    const entry = {
      date: today,
      method: followUpForm.method,
      result: followUpForm.result,
      contact: followUpForm.contact,
      by: auth?.name || "Unknown",
    };
    setBids(prev => prev.map(b => {
      if (b.id !== followUpBid.id) return b;
      return {
        ...b,
        followUpLog: [...(b.followUpLog || []), entry],
        lastFollowUp: today,
        followUpDate: followUpForm.nextDate || "",
        lastActivityDate: today,
      };
    }));
    show("Follow-up logged");
    setFollowUpBid(null);
    setFollowUpText("");
  };

  // ── handoff state ──
  const [handoffBid, setHandoffBid] = useState(null);
  const [handoffForm, setHandoffForm] = useState({ contractValue: 0, pm: "", super: "", notes: "" });

  const openHandoff = (bid) => {
    setHandoffBid(bid);
    setHandoffForm({
      contractValue: bid.value || 0,
      pm: bid.estimator || "",
      super: "",
      notes: "",
    });
  };

  const executeHandoff = () => {
    if (!handoffBid) return;
    const b = handoffBid;
    const linkedTakeoff = (takeoffs || []).find(tk => tk.bidId === b.id);
    const newProj = {
      id: nextId(), bidId: b.id, name: b.name, gc: b.gc,
      contract: handoffForm.contractValue || b.value || 0,
      originalBidValue: b.value || 0,
      billed: 0, progress: 0,
      phase: b.phase || b.sector || "Pre-Construction",
      start: b.due || "", end: "",
      pm: handoffForm.pm || b.estimator || "",
      address: b.address || "",
      scope: b.scope || [], sector: b.sector || "",
      contact: b.contact || "",
      notes: handoffForm.notes ? `${b.notes || ""}\n\nHandoff notes: ${handoffForm.notes}`.trim() : (b.notes || ""),
      exclusions: b.exclusions || "",
      attachments: b.attachments || [],
      laborBudget: 0, laborHours: 0,
      assignedForeman: null,
      needsPlans: true, plansRequestedAt: null,
      contractType: "lump_sum", retainageRate: 10,
      takeoffSummary: linkedTakeoff ? {
        totalSF: linkedTakeoff.rooms?.reduce((s, r) => s + (r.items || []).reduce((is, i) => is + (i.totalSF || i.qty || 0), 0), 0) || 0,
        roomCount: linkedTakeoff.rooms?.length || 0,
        grandTotal: linkedTakeoff.grandTotal || 0,
        snapshotAt: new Date().toISOString(),
      } : null,
    };
    setProjects(prev => [...prev, newProj]);
    setBids(prev => prev.map(x => x.id === b.id ? { ...x, convertedToProject: true, lastActivityDate: new Date().toISOString().slice(0, 10) } : x));
    show(`Project "${b.name}" created — request construction plans from ${b.gc || "the GC"}`, 6000);
    setHandoffBid(null);
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
                <div key={i} className="rounded-control mb-sp2" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
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
                <div key={i} className="rounded-control mb-sp2 bg-bg3" style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm font-semi">{n.point}</span>
                    <span className={`badge ${n.priority === "must_have" ? "badge-red" : "badge-muted"}`}>{n.priority?.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{n.leverage}</div>
                  {n.suggestedLanguage && <div className="text-xs mt-2 c-blue" style={{ fontStyle: "italic" }}>"{n.suggestedLanguage}"</div>}
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
            <div className="grid-2col gap-sp3">
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
                  <div className="empty-icon"><ClipboardList className="c-green" style={{ width: 40, height: 40 }} /></div>
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
                    <div key={i} className="rounded-control mb-sp1 fs-label" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.06)", borderLeft: "3px solid var(--red)" }}>
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
                    <div key={i} className="fs-label c-text2" style={{ padding: "var(--space-1) 0" }}>{ins}</div>
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

  // ── Portal views for field roles (real login OR admin/owner impersonation) ──
  // When impersonating, wrap the portal in a device-frame bezel so the desktop
  // view mirrors what the crew sees — intended for in-person explanation AND
  // auditor QA across multiple device viewports (phone/tablet, portrait/land).
  //
  // Safe-area CSS injected only when this App instance is running inside the
  // preview iframe. The status-bar height is read from the `sb` URL param so
  // the portal header reserves exactly the right amount of space for the
  // mock iOS/Android status bar drawn by the parent frame.
  const previewStatusBarH = (() => {
    if (!isPhonePreview) return 0;
    try {
      const n = parseInt(new URLSearchParams(window.location.search).get("sb") || "0", 10);
      return Number.isFinite(n) && n >= 0 && n <= 120 ? n : 0;
    } catch { return 0; }
  })();
  // Home-indicator safe area: reserved space at the bottom of the iframe so
  // the portal's bottom nav doesn't collide with the home-indicator pill or
  // Android gesture bar. Value comes from ?ha=<px> URL param, same channel
  // as status-bar height.
  const previewHomeArea = (() => {
    if (!isPhonePreview) return 0;
    try {
      const n = parseInt(new URLSearchParams(window.location.search).get("ha") || "0", 10);
      return Number.isFinite(n) && n >= 0 && n <= 80 ? n : 0;
    } catch { return 0; }
  })();
  const phonePreviewSafeArea = isPhonePreview ? (
    <style>{`
      /* Kill default iframe body margin so there's no pixel crack at the edges */
      html, body { margin: 0 !important; padding: 0 !important; background: #152332 !important; overflow-x: hidden; }
      html, body, #root { min-height: 100vh; }
      #root { background: var(--bg1); }
      /* The portal's .app shell: natural min-height, no bottom padding
         override. */
      .app { min-height: 100vh; padding-bottom: 0 !important; background: var(--bg1); }
      /* The tab bar keeps its native 56px content area (labels sit at their
         normal position — NOT drifted upward). We switch it to
         box-sizing: content-box and add padding-bottom so the background
         extends a little further downward into the phone's bottom area,
         giving the home-indicator pill room to sit inside the bar.
         CRITICAL: we override the glass/translucent background with a
         SOLID color and disable backdrop-filter — otherwise the blur
         picks up the transition between scroll content and empty bg
         behind the bar, which renders as a visible horizontal seam/line
         across the bar. Solid bg = one continuous block. */
      .field-tab-bar, .field-nav, .bottom-nav {
        box-sizing: content-box !important;
        bottom: 0 !important;
        height: 56px !important;
        padding-bottom: 16px !important;
        background: #152332 !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      /* Bottom-attached sheets sit above the full tab bar (content + extended pad). */
      .field-tab-sheet { bottom: 72px !important; }
      /* Network banner was pushed down by the header safe-area shift */
      .network-banner { position: relative; }
      /* Status-bar safe-area: push the portal header below the mock OS chrome
         drawn by the parent preview frame. Value comes from ?sb=<px> param. */
      .portal-header--preview { padding-top: ${previewStatusBarH + 6}px !important; }
    `}</style>
  ) : null;
  const renderFieldPortal = (PortalComp, roleLabel) => {
    // For real field logins, render the portal full-bleed as before.
    if (!isImpersonatingPortal) {
      return (
        <div className={"app"}>
          <style>{styles}</style>
          {phonePreviewSafeArea}
          <PortalComp app={app} />
        </div>
      );
    }
    // Impersonation mode: top control bar + device-style frame containing an
    // iframe that loads the app with ?preview=<role>&device=<id>&orient=<o>&sb=<n>.
    // Inside the iframe, AuthGate forces auth to the impersonated role and
    // PortalHeader reads the `sb` param to reserve space below the mock OS chrome.
    // Each device preset defines its own dimensions + chrome, so iPhone/iPad/
    // Galaxy Tab all render with correct viewport AND correct CSS media-query
    // context — auditors see real responsive behavior, not stretched phone.
    const device = DEVICE_PRESETS[previewDevice] || DEVICE_PRESETS["iphone-14-pro"];
    const orient = previewOrient === "landscape" ? "landscape" : "portrait";
    const dims = device[orient];
    return (
      <div className={"app"} style={{ background: "var(--bg1)", minHeight: "100vh" }}>
        <style>{styles}</style>
        {/* Impersonation control bar */}
        <div className="flex flex-wrap" style={{ position: "sticky", top: 0, zIndex: 50,
          background: "linear-gradient(180deg, rgba(245,158,11,0.14), rgba(245,158,11,0.04))",
          borderBottom: "1px solid rgba(245,158,11,0.35)",
          padding: "10px 16px", gap: 10 }}>
          <span className="uppercase c-amber fw-bold" style={{ fontSize: 12, letterSpacing: 0.5 }}>
            Preview Mode
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text1)" }}>{roleLabel}</strong> on <strong style={{ color: "var(--text1)" }}>{device.label}</strong> · <span className="capitalize">{orient}</span>
          </span>
          <div className="flex-1" />
          <select
            value={viewAsRole}
            onChange={(e) => setViewAsRole(e.target.value)}
            className="bg-bg3 cursor-pointer" style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, color: "var(--text1)", border: "1px solid var(--border)" }}
            aria-label="Switch impersonated role"
          >
            <option value="foreman">Foreman</option>
            <option value="employee">Employee / Team</option>
            <option value="driver">Driver</option>
          </select>
          <select
            value={previewDevice}
            onChange={(e) => setPreviewDevice(e.target.value)}
            className="bg-bg3 cursor-pointer" style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, color: "var(--text1)", border: "1px solid var(--border)" }}
            aria-label="Switch preview device"
          >
            {Object.entries(DEVICE_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </select>
          <button
            onClick={() => setPreviewOrient(previewOrient === "landscape" ? "portrait" : "landscape")}
            className="bg-bg3 d-inline-flex cursor-pointer fw-semi" style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, color: "var(--text1)", border: "1px solid var(--border)", alignItems: "center", gap: 6 }}
            aria-label={`Rotate to ${previewOrient === "landscape" ? "portrait" : "landscape"}`}
            title={`Rotate to ${previewOrient === "landscape" ? "portrait" : "landscape"}`}
          >
            <span style={{ display: "inline-block", transform: previewOrient === "landscape" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 180ms ease-out" }}>⟲</span>
            <span>{previewOrient === "landscape" ? "Landscape" : "Portrait"}</span>
          </button>
          <button
            onClick={() => setViewAsRole("")}
            className="bg-bg3 cursor-pointer fw-semi" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, color: "var(--text1)", border: "1px solid var(--border)" }}
          >
            Exit preview
          </button>
        </div>
        {/* Device-frame wrapper — FIXED (dims.w × dims.h) layout box, visually
            scaled via transform so the portal's CSS/media-query context stays
            pinned to the device's true viewport regardless of the host window size.
            Fit-to-box scaling uses min(availableH/h, availableW/w) so landscape
            tablets (1194px wide) still fit in a 1280px browser window. */}
        {(() => {
          const DEV_W = dims.w;
          const DEV_H = dims.h;
          // Chrome budget: preview bar (~56px) + top pad (32px) + bottom pad (40px)
          // vertical, horizontal pad (32px) horizontal.
          const availableH = Math.max(320, viewportH - 128);
          const availableW = Math.max(320, viewportW - 64);
          const deviceScale = Math.min(1, Math.min(availableH / DEV_H, availableW / DEV_W));
          const scaledW = DEV_W * deviceScale;
          const scaledH = DEV_H * deviceScale;

          const sbH = dims.statusBar || 0;
          const haH = dims.homeArea || 0;
          const hasTopNotch = !!(dims.notch && dims.notch.side === "top");
          const hasSideNotch = !!(dims.notch && dims.notch.side !== "top");
          const sideGap = hasSideNotch ? (dims.notch.w + 4) : 0;

          // URL params for the iframe: role + device chrome dimensions so
          // PortalHeader + injected safe-area CSS reserve the right amount
          // of space for status bar (sb), home-indicator area (ha), and
          // side-gutter in landscape (sideGap).
          const iframeSrc = `${window.location.pathname}?preview=${viewAsRole}&device=${previewDevice}&orient=${orient}&sb=${sbH}&ha=${haH}&sideGap=${sideGap}&notchSide=${dims.notch?.side || "none"}`;

          // Inner screen area = frame size minus bezel padding on all sides.
          const screenW = DEV_W - (dims.bezel * 2);
          const screenH = DEV_H - (dims.bezel * 2);

          // Notch absolute position inside the screen-area container
          const notchStyle = dims.notch ? (() => {
            const n = dims.notch;
            if (n.side === "top") {
              return { position: "absolute", top: n.offset, left: "50%", transform: "translateX(-50%)", width: n.w, height: n.h, borderRadius: Math.min(n.h, n.w) * 0.6, background: "#000", zIndex: 3 };
            }
            if (n.side === "left") {
              return { position: "absolute", left: n.offset, top: "50%", transform: "translateY(-50%)", width: n.w, height: n.h, borderRadius: Math.min(n.h, n.w) * 0.6, background: "#000", zIndex: 3 };
            }
            return null;
          })() : null;

          // Home indicator (iOS) or nav gesture bar (Android). The pill
          // sits a small fixed distance from the screen bottom so it lands
          // inside the grown tab-bar's bottom edge (the bar grows by the
          // same small amount) instead of hovering in a filler strip. The
          // old math tried to vertically center the pill in a large haH
          // strip, which produced a visible gap below the labels.
          const hi = dims.homeIndicator;
          const homeStyle = hi ? (() => {
            if (hi.side === "bottom") {
              const pillBottom = 4;
              return { position: "absolute", bottom: pillBottom, left: "50%", transform: "translateX(-50%)", width: hi.w, height: hi.h, borderRadius: hi.h / 2, background: "rgba(255,255,255,0.9)", zIndex: 3 };
            }
            if (hi.side === "right") {
              return { position: "absolute", right: hi.offset, top: "50%", transform: "translateY(-50%)", width: hi.w, height: hi.h, borderRadius: hi.w / 2, background: "rgba(255,255,255,0.9)", zIndex: 3 };
            }
            return null;
          })() : null;

          return (
            <div className="items-start justify-center" style={{ display: "flex",
              padding: "24px 32px 40px",
              minHeight: "calc(100vh - 56px)" }}>
              {/* Reservation: takes the visual (scaled) size in flex layout. */}
              <div className="relative flex-shrink-0" style={{ width: scaledW,
                height: scaledH,
                transition: "width 180ms ease-out, height 180ms ease-out",
                willChange: "width, height" }}>
                {/* Actual device frame, native size, scaled via transform. */}
                <div style={{
                  width: DEV_W,
                  height: DEV_H,
                  transform: `scale(${deviceScale})`,
                  transformOrigin: "top left",
                  transition: "transform 180ms ease-out",
                  willChange: "transform",
                  borderRadius: dims.radius,
                  background: "#0b0b0f",
                  padding: dims.bezel,
                  boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.06) inset",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  boxSizing: "border-box",
                }}>
                  {/* Screen area — iframe preview + mock status bar + notch overlay */}
                  <div className="relative overflow-hidden" style={{ width: screenW,
                    height: screenH,
                    borderRadius: Math.max(0, dims.radius - dims.bezel),
                    background: "var(--bg1)",
                    isolation: "isolate" }}>
                    {/* iframe — loads portal at device's native viewport */}
                    <iframe
                      key={`${viewAsRole}_${previewDevice}_${orient}`}
                      src={iframeSrc}
                      title={`${roleLabel} ${device.label} ${orient} preview`}
                      className="absolute d-block h-full w-full" style={{ border: 0,
                        background: "var(--bg1)",
                        top: 0, left: 0 }}
                    />
                    {/* Mock OS status bar (live clock + signal/wifi/battery).
                        Sits above the iframe so the clock/battery are visible
                        at all times — the portal header pads down below it. */}
                    <MockStatusBar
                      deviceClass={device.class}
                      statusBarHeight={sbH}
                      orientation={orient}
                      hasTopNotch={hasTopNotch}
                      notchCfg={dims.notch}
                    />
                    {/* Notch / Dynamic Island overlay */}
                    {notchStyle && <div style={notchStyle} aria-hidden />}
                    {/* Home indicator / Android gesture bar */}
                    {homeStyle && <div style={homeStyle} aria-hidden />}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  if (isDriverView) return renderFieldPortal(DriverView, "Driver");
  if (isEmployeeView) return renderFieldPortal(EmployeeView, "Employee / Team");
  if (isForemanView) return renderFieldPortal(ForemanView, "Superintendent / Foreman");

  return (
    <div className={"app"}>
      <style>{styles}</style>
      <header className="header">
        <div className="logo flex-center-gap-6">
          {/* EBC brand mark — masked from ebc-eagle-white.png (the only
              true-transparent asset in /public/), theme-tinted via --logo-tint */}
          <div
            role="img"
            aria-label="Eagles Brothers Constructors"
            style={{
              width: 32, height: 32,
              backgroundColor: "var(--logo-tint, #ffffff)",
              WebkitMaskImage: "url(/ebc-eagle-white.png)",
              maskImage: "url(/ebc-eagle-white.png)",
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              WebkitMaskPosition: "center", maskPosition: "center",
              WebkitMaskSize: "contain", maskSize: "contain",
              transition: "background-color 0.3s",
            }}
          />
        </div>
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
        </button>
        <button
          className="btn btn-ghost btn-sm rounded-control fw-semi mr-sp1 fs-tab" style={{ padding: "var(--space-1) var(--space-2)", letterSpacing: 0.5, border: "1px solid var(--border)" }}
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          <Globe className="icon-inline" />{lang === "en" ? "ES" : "EN"}
        </button>
        <div className="mr-sp1 relative">
          <button
            className="btn btn-ghost btn-sm fs-card relative" style={{ padding: "var(--space-1) var(--space-2)" }}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Alerts"
          >
            <Bell style={{ width: 20, height: 20 }} />
            {alertBadgeCount > 0 && (
              <span className="flex fw-bold fs-xs justify-center absolute c-white" style={{ top: -2, right: -2, background: "var(--red)",
                borderRadius: "50%", width: 16, height: 16, lineHeight: 1 }}>{alertBadgeCount > 99 ? "99+" : alertBadgeCount}</span>
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
                      setTimeout(() => setModal({ type: "viewProject", data: { ...proj, lastAccessed: new Date().toISOString() } }), 50);
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
                <div className="logo flex fs-card">
                  <div
                    role="img"
                    aria-label="EBC"
                    style={{
                      width: 24, height: 24,
                      backgroundColor: "var(--logo-tint, #ffffff)",
                      WebkitMaskImage: "url(/ebc-eagle-white.png)",
                      maskImage: "url(/ebc-eagle-white.png)",
                      WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center", maskPosition: "center",
                      WebkitMaskSize: "contain", maskSize: "contain",
                    }}
                  />
                </div>
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
        {["financials", "documents", "submittalLibrary", "schedule", "reports", "safety", "timeclock", "sds", "map", "settings"].includes(tab) && <MoreTabs app={app} />}
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

      {/* Session timeout warning */}
      {showTimeoutWarning && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: 360, textAlign: "center", padding: "var(--space-6)" }}>
            <div className="fs-card fw-bold mb-sp3">Session Expiring</div>
            <div className="fs-secondary c-text2 mb-sp4">
              You've been inactive. Your session will end in <strong className="c-amber">{timeoutSec}s</strong>.
            </div>
            <div className="flex gap-8 justify-center">
              <button className="btn btn-primary" onClick={extendSession}>Stay Logged In</button>
              <button className="btn btn-ghost" onClick={onLogout}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Banner */}
      {installPrompt && !window.matchMedia("(display-mode: standalone)").matches && (
        <div className="flex rounded-control gap-sp3" style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, var(--bg3), var(--bg2))",
          border: "1px solid var(--amber)",
          padding: "var(--space-4) var(--space-5)",
          zIndex: 10000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 420, width: "calc(100% - 32px)" }}>
          <div className="fs-title" style={{ lineHeight: 1 }}>&#9881;</div>
          <div className="flex-1">
            <div className="fs-secondary fw-bold" style={{ color: "var(--gold, #e09422)" }}>{t("Install EBC")}</div>
            <div className="fs-label mt-sp1 c-text2">
              {t("Works offline, launches instantly — like a real app")}
            </div>
          </div>
          <button className="rounded-control fw-bold fs-label cursor-pointer" style={{ background: "var(--gold, #e09422)", color: "#000",
            border: "none", padding: "8px 18px" }} onClick={async () => {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === "accepted") show("EBC installed!");
            setInstallPrompt(null);
          }}>{t("Install")}</button>
          <button onClick={() => {
            setInstallPrompt(null);
            localStorage.setItem("ebc_install_dismissed", String(Date.now()));
          }} className="fs-section c-text3 cursor-pointer" style={{ background: "none", border: "none", padding: "0 4px" }}>&times;</button>
        </div>
      )}
    </div>
  );
};


export default AuthGate;
