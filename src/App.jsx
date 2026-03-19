import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { styles } from "./styles";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSyncedState, flushSyncQueue } from "./hooks/useSyncedState";
import { useToast } from "./hooks/useToast";
import {
  THEMES, ASSEMBLIES, SCOPE_INIT, initBids, initProjects, initContacts, initCallLog,
  initInvoices, initChangeOrders, initRfis, initSubmittals, initSchedule,
  initIncidents, initToolboxTalks, initDailyReports, initTakeoffs,
  OSHA_CHECKLIST, COMPANY_DEFAULTS, getHF,
  initEmployees, initCompanyLocations, initTimeEntries, initCrewSchedule, initMaterialRequests,
  initTmTickets
} from "./data/constants";
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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { initNative } from "./utils/native";
import { T } from "./data/translations";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { SyncStatus } from "./components/SyncStatus";
import { UpdateBanner } from "./components/InstallPrompt";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { hasAccess } from "./data/roles";
import { supabase, isSupabaseConfigured, signOut as supaSignOut, onAuthStateChange, signIn as supaSignIn, signUp as supaSignUp } from "./lib/supabase";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · App Component
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

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
  { key: "map", label: "Map" },
  { key: "settings", label: "Settings" },
];

const SECONDARY_KEYS = SECONDARY_TABS.map(t => t.key);
const STATUS_BADGE = { estimating: "badge-amber", submitted: "badge-blue", awarded: "badge-green", lost: "badge-red" };
const RISK_BADGE = { High: "badge-red", Med: "badge-amber", Low: "badge-green" };
const PRIORITY_BADGE = { high: "badge-red", med: "badge-amber", low: "badge-green" };
const SCOPE_ICONS = { unchecked: "\u2b1c", checked: "\u2705", flagged: "\ud83d\udea9" };
const SCOPE_CYCLE = { unchecked: "checked", checked: "flagged", flagged: "unchecked" };
const BID_FILTERS = ["All", "Estimating", "Submitted", "Awarded", "Lost"];

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
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("ebc_auth");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try { return localStorage.getItem("ebc_onboarding_complete") === "true"; } catch { return false; }
  });

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
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return <App auth={auth} onLogout={handleLogout} />;
};

function App({ auth, onLogout }) {
  // ── UI preferences (localStorage only, no Supabase sync) ──
  const [theme, setTheme] = useLocalStorage("theme", "daylight");
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
  const [crewSchedule, setCrewSchedule, _syncCrewSchedule] = useSyncedState("crewSchedule", initCrewSchedule);
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
    _syncSds,
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

  const [notifications, setNotifications] = useLocalStorage("ebc_notifications", []);
  // ── notification generator (runs on mount + every 5 min) ──
  useEffect(() => {
    const generateNotifications = () => {
      const now = new Date();
      const candidates = [];
      const addCandidate = (id, type, title, message, linkedType, linkedId) => {
        candidates.push({ id, userId: auth?.id, type, title, message, linkedType, linkedId, read: false, createdAt: now.toISOString() });
      };
      // Cert expirations
      (certifications || []).forEach(cert => {
        if (!cert.expiryDate) return;
        const expiry = new Date(cert.expiryDate);
        const daysLeft = Math.floor((expiry - now) / 86400000);
        const empName = (() => { try { const users = JSON.parse(localStorage.getItem("ebc_users") || "[]"); return users.find(u => u.id === cert.employeeId)?.name || "Employee"; } catch { return "Employee"; } })();
        if (daysLeft < 0) addCandidate(`cert_exp_${cert.id}`, "cert_expired", "Certification Expired", `${empName}'s ${cert.name} expired ${Math.abs(daysLeft)} days ago`, "certification", cert.id);
        else if (daysLeft <= 7) addCandidate(`cert_7d_${cert.id}`, "cert_urgent", "Certification Expiring", `${empName}'s ${cert.name} expires in ${daysLeft} days`, "certification", cert.id);
        else if (daysLeft <= 30) addCandidate(`cert_30d_${cert.id}`, "cert_warning", "Certification Expiring Soon", `${empName}'s ${cert.name} expires in ${daysLeft} days`, "certification", cert.id);
      });
      // Overdue invoices
      (invoices || []).forEach(inv => {
        if (inv.status !== "overdue") return;
        const age = Math.floor((now - new Date(inv.date)) / 86400000);
        addCandidate(`inv_overdue_${inv.id}`, "invoice_overdue", "Invoice Overdue", `Invoice #${inv.number} is ${age} days old ($${inv.amount})`, "invoice", inv.id);
      });
      // Pending T&M tickets
      const pendingTM = (tmTickets || []).filter(t => t.status === "draft" || t.status === "pending");
      if (pendingTM.length > 0) addCandidate(`tm_pending_${now.toISOString().slice(0, 10)}`, "tm_pending", "T&M Tickets Pending", `${pendingTM.length} T&M ticket(s) need review`, "tmTickets", null);
      // SDS expirations
      (sdsSheets || []).forEach(sds => {
        if (!sds.expiresAt) return;
        const daysLeft = Math.floor((new Date(sds.expiresAt) - now) / 86400000);
        if (daysLeft < 0) addCandidate(`sds_exp_${sds.id}`, "sds_expired", "SDS Expired", `${sds.productName} SDS has expired`, "sds", sds.id);
        else if (daysLeft <= 30) addCandidate(`sds_30d_${sds.id}`, "sds_warning", "SDS Expiring Soon", `${sds.productName} SDS expires in ${daysLeft} days`, "sds", sds.id);
      });
      // Pending change orders
      const pendingCOs = (changeOrders || []).filter(co => co.status === "pending");
      if (pendingCOs.length > 0) addCandidate(`co_pending_${now.toISOString().slice(0, 10)}`, "co_pending", "Change Orders Pending", `${pendingCOs.length} change order(s) awaiting approval`, "changeOrders", null);

      if (candidates.length > 0) {
        // Read directly from localStorage to avoid stale closure issues with React strict mode
        const current = (() => { try { return JSON.parse(localStorage.getItem("ebc_notifications") || "[]"); } catch { return []; } })();
        const currentIds = new Set(current.map(n => n.id));
        const fresh = candidates.filter(c => !currentIds.has(c.id));
        if (fresh.length > 0) {
          const merged = [...fresh, ...current].slice(0, 100);
          setNotifications(merged);
        }
      }
    };
    generateNotifications();
    const interval = setInterval(generateNotifications, 300000); // every 5 min
    return () => clearInterval(interval);
  }, [certifications?.length, invoices?.length, tmTickets?.length, sdsSheets?.length, changeOrders?.length]);

  const unreadCount = (notifications || []).filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => (prev || []).map(n => ({ ...n, read: true })));
  const markRead = (id) => setNotifications(prev => (prev || []).map(n => n.id === id ? { ...n, read: true } : n));
  const clearNotifications = () => setNotifications([]);

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
  // ── portal routing for field roles ──
  const isDriverView = auth?.role === "driver";
  const isEmployeeView = auth?.role === "employee";
  const isForemanView = auth?.role === "foreman";

  // ── ephemeral state ──
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedBids, setSelectedBids] = useState(new Set());
  const [bidPageSize, setBidPageSize] = useState(24);
  const [projPageSize, setProjPageSize] = useState(24);
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
  useEffect(() => {
    if (network.wasOffline && network.online) {
      flushSyncQueue().then(() => network.refreshPending());
      show("Back online — syncing changes...");
    }
  }, [network.wasOffline, network.online]);

  // ── bid filter (for bids tab) ──
  const [bidFilter, setBidFilter] = useState("All");

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
    employees, setEmployees, companyLocations, setCompanyLocations, timeEntries, setTimeEntries, crewSchedule, setCrewSchedule, materialRequests, setMaterialRequests,
    calendarEvents, setCalendarEvents, ptoRequests, setPtoRequests,
    equipment: calEquipment, setEquipment: setCalEquipment, equipmentBookings, setEquipmentBookings,
    certifications, setCertifications, subSchedule, setSubSchedule, weatherAlerts, setWeatherAlerts,
    scheduleConflicts, setScheduleConflicts,
    jsas, setJsas,
    tmTickets, setTmTickets,
    sdsSheets, setSdsSheets,
    show, setModal, modal, search, setSearch, tab, setTab, subTab, setSubTab, fmt, fmtK, nextId,
    lang, setLang, t,
    auth, onLogout,
    syncStatus,
  };

  // ── KPI computations ──
  const pipeline = useMemo(() => bids.filter(b => b.status === "estimating").reduce((s, b) => s + (b.value || 0), 0), [bids]);
  const activeProjects = projects.length;
  const openBids = bids.filter(b => b.status === "estimating" || b.status === "submitted").length;
  const awarded = bids.filter(b => b.status === "awarded").length;
  const lost = bids.filter(b => b.status === "lost").length;
  const winRate = awarded + lost > 0 ? Math.round((awarded / (awarded + lost)) * 100) : 0;

  // ── filtered bids ──
  const filteredBids = useMemo(() => {
    let list = bids;
    if (bidFilter !== "All") list = list.filter(b => b.status === bidFilter.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.gc.toLowerCase().includes(q) ||
        (b.contact || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [bids, bidFilter, search]);

  // ── filtered contacts ──
  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  // ── filtered projects ──
  const filteredProjects = useMemo(() => {
    let list = projects;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.gc || "").toLowerCase().includes(q) ||
        (p.phase || "").toLowerCase().includes(q)
      );
    }
    // Sort by start date (newest first)
    return [...list].sort((a, b) => {
      const da = a.start ? new Date(a.start) : new Date(0);
      const db = b.start ? new Date(b.start) : new Date(0);
      return db - da;
    });
  }, [projects, search]);

  // ── filtered scope ──
  const filteredScope = useMemo(() => {
    if (scopeFilter === "Flagged") return scope.filter(s => s.status === "flagged");
    if (scopeFilter === "Unchecked") return scope.filter(s => s.status === "unchecked");
    return scope;
  }, [scope, scopeFilter]);

  // ── role-based tab filtering ──
  const userRole = auth?.role || "owner";
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
    const order = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
    const map = {};
    bids.forEach(b => { if (b.month) map[b.month] = (map[b.month] || 0) + 1; });
    return order.filter(m => map[m]).map(m => ({ name: m, value: map[m] }));
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

  const renderDashboard = () => (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">{t("Dashboard")}</div>
          <div className="section-sub">{auth?.name ? `${auth.name} — ${t(dashCfg.subtitle)}` : t(dashCfg.subtitle)}</div>
        </div>
        {dashCfg.showBrief && (
          <button className="btn btn-ghost" onClick={() => { showBrief ? setShowBrief(false) : runMorningBrief(); }} disabled={briefLoading}>
            {briefLoading ? t("Loading...") : t("Morning Brief")}
          </button>
        )}
      </div>

      {/* Morning Briefing Panel */}
      {showBrief && briefResult && (
        <div className="card" style={{ padding: 20, marginBottom: 16, maxHeight: 450, overflow: "auto" }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">{briefResult.greeting || "Good morning!"}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBrief(false)}>{t("Close")}</button>
          </div>

          <div className="text-sm text-muted mb-12">{briefResult.summary}</div>

          {/* Urgent Alerts */}
          {briefResult.urgentAlerts?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>{t("Urgent Alerts")}</div>
              {briefResult.urgentAlerts.map((a, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{a.alert}</span>
                    <span className="badge badge-red">{a.type}</span>
                  </div>
                  <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{a.action}</div>
                </div>
              ))}
            </div>
          )}

          {/* Today's Focus */}
          {briefResult.todaysFocus?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>{t("Today's Focus")}</div>
              {briefResult.todaysFocus.map((f, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{f.item}</span>
                    <span className={`badge ${f.priority === "critical" ? "badge-red" : f.priority === "high" ? "badge-amber" : "badge-muted"}`}>{f.priority}</span>
                  </div>
                  {f.project && <div className="text-xs text-dim mt-2">{f.project}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Money Moves */}
          {briefResult.moneyMoves?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8">{t("Money Moves")}</div>
              {briefResult.moneyMoves.map((m, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{m.item}</span>
                    <span className="font-semi text-sm" style={{ color: "var(--green)" }}>{m.amount}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{m.action} — {m.deadline}</div>
                </div>
              ))}
            </div>
          )}

          {briefResult.motivationalNote && (
            <div className="text-sm" style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", fontStyle: "italic", color: "var(--amber)" }}>
              {briefResult.motivationalNote}
            </div>
          )}
        </div>
      )}

      {dashCfg.showKPIs && userRole === "accounting" ? (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">{t("Outstanding A/R")}</div>
            <div className="kpi-value">{fmtK(invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + (i.amount || 0), 0))}</div>
            <div className="kpi-sub">{invoices.filter(i => i.status === "pending" || i.status === "overdue").length} {t("unpaid invoices")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Overdue Invoices")}</div>
            <div className="kpi-value" style={{ color: "var(--red)" }}>{fmtK(invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.amount || 0), 0))}</div>
            <div className="kpi-sub">{invoices.filter(i => i.status === "overdue").length} {t("past due")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Active Projects")}</div>
            <div className="kpi-value">{activeProjects}</div>
            <div className="kpi-sub">{t("billing in progress")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("T&M Pending")}</div>
            <div className="kpi-value">{tmTickets.filter(t => t.status === "pending" || t.status === "draft").length}</div>
            <div className="kpi-sub">{t("tickets to review")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Team on Payroll")}</div>
            <div className="kpi-value">{(() => { try { return JSON.parse(localStorage.getItem("ebc_users") || "[]").length; } catch { return 0; } })()}</div>
            <div className="kpi-sub">{t("employees")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Change Orders")}</div>
            <div className="kpi-value">{fmtK(changeOrders.filter(co => co.status === "approved").reduce((s, co) => s + (co.amount || 0), 0))}</div>
            <div className="kpi-sub">{changeOrders.filter(co => co.status === "pending").length} {t("pending approval")}</div>
          </div>
        </div>
      ) : dashCfg.showKPIs && userRole === "office_admin" ? (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">{t("Active Projects")}</div>
            <div className="kpi-value">{activeProjects}</div>
            <div className="kpi-sub">{projects.filter(p => p.progress < 100).length} {t("in progress")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Open Bids")}</div>
            <div className="kpi-value">{openBids}</div>
            <div className="kpi-sub">{bids.filter(b => b.status === "submitted").length} {t("submitted")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Contacts")}</div>
            <div className="kpi-value">{contacts.length}</div>
            <div className="kpi-sub">{t("in directory")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Pipeline Value")}</div>
            <div className="kpi-value">{fmtK(pipeline)}</div>
            <div className="kpi-sub">{t("total estimating")}</div>
          </div>
        </div>
      ) : dashCfg.showKPIs && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">{t("Pipeline Value")}</div>
            <div className="kpi-value">{fmtK(pipeline)}</div>
            <div className="kpi-sub">{bids.filter(b => b.status === "estimating").length} {t("bids estimating")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Active Projects")}</div>
            <div className="kpi-value">{activeProjects}</div>
            <div className="kpi-sub">{projects.filter(p => p.progress < 100).length} {t("in progress")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Open Bids")}</div>
            <div className="kpi-value">{openBids}</div>
            <div className="kpi-sub">{bids.filter(b => b.status === "submitted").length} {t("submitted")}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t("Win Rate")}</div>
            <div className="kpi-value">{winRate}%</div>
            <div className="kpi-sub">{awarded}W / {lost}L</div>
          </div>
        </div>
      )}

      {/* Charts Row — only for roles that need bid analytics */}
      {dashCfg.showCharts && (<>
        <div className="flex gap-16 mt-24" style={{ flexWrap: "wrap" }}>
          <div className="card" style={{ flex: "1 1 280px", minWidth: 280 }}>
            <div className="card-header"><div className="card-title font-head">{t("Bids by Status")}</div></div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={false}>
                  {statusChartData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-12 flex-wrap" style={{ justifyContent: "center", padding: "4px 8px" }}>
              {statusChartData.map((entry, i) => (
                <div key={entry.name} className="flex gap-4" style={{ alignItems: "center", fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[i % STATUS_COLORS.length], display: "inline-block" }} />
                  <span style={{ color: "var(--text2)" }}>{entry.name}: <strong style={{ color: "var(--text)" }}>{entry.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ flex: "1 1 400px", minWidth: 300 }}>
            <div className="card-header"><div className="card-title font-head">{t("Bids by GC (Top 8)")}</div></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gcChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--text2)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }} />
                <Bar dataKey="value" fill="var(--amber)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card mt-16">
          <div className="card-header"><div className="card-title font-head">{t("Bids by Month")}</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthChartData} margin={{ left: 0, right: 20 }}>
              <XAxis dataKey="name" tick={{ fill: "var(--text2)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }} />
              <Bar dataKey="value" fill="var(--blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>)}

      <div className="card mt-16">
        <div className="card-header">
          <div className="card-title font-head">{t("Recent Activity")}</div>
        </div>
        {callLog.slice(0, 5).map(c => (
          <div key={c.id} className="flex gap-12 border-b" style={{ padding: "10px 0" }}>
            <div style={{ width: 6, borderRadius: 3, background: "var(--amber)", flexShrink: 0 }} />
            <div className="flex-col gap-4" style={{ flex: 1 }}>
              <div className="flex-between">
                <span className="font-semi text-sm">{c.contact}</span>
                <span className="text-xs text-dim">{c.time}</span>
              </div>
              <div className="text-sm text-muted">{c.note}</div>
              {c.next && <div className="text-xs text-dim">Next: {c.next}</div>}
            </div>
          </div>
        ))}
        {callLog.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">{t("No recent activity")}</div>
          </div>
        )}
      </div>

      {/* Weekly Digest — owner/admin/pm only */}
      {dashCfg.showDigest && <div className="card mt-16">
        <div className="card-header flex-between">
          <div className="card-title font-head">{t("PM Weekly Digest")}</div>
          <button className="btn btn-primary btn-sm" onClick={runWeeklyDigest} disabled={digestLoading}>
            {digestLoading ? t("Generating...") : t("Generate Digest")}
          </button>
        </div>
        {!digestResult && !digestLoading && (
          <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
            {t("AI-powered summary of project health, alerts, and recommendations across your portfolio.")}
          </div>
        )}
        {digestLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing {projects.length} projects and {bids.length} bids...</div>}
        {digestResult && (
          <div style={{ marginTop: 8 }}>
            {/* Health Summary */}
            <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>
              {digestResult.healthSummary}
            </div>

            {/* KPIs */}
            {digestResult.kpis && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div className="text-xs text-muted">{t("Avg Margin")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--amber)" }}>{digestResult.kpis.avgMargin}%</div>
                </div>
                <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div className="text-xs text-muted">{t("Cash Flow")}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{digestResult.kpis.cashFlowStatus}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div className="text-xs text-muted">{t("Crew Utilization")}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{digestResult.kpis.crewUtilization}</div>
                </div>
              </div>
            )}

            {/* Alerts */}
            {digestResult.alerts?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-sm font-semi mb-8">{t("Alerts")}</div>
                {digestResult.alerts.map((a, i) => (
                  <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, borderLeft: `3px solid ${a.priority === "high" ? "var(--red)" : a.priority === "medium" ? "var(--amber)" : "var(--blue)"}`, background: "var(--card)", fontSize: 13 }}>
                    <div className="flex-between">
                      <span className="font-semi">{a.project}</span>
                      <span className={`badge ${a.priority === "high" ? "badge-red" : a.priority === "medium" ? "badge-amber" : "badge-blue"}`}>{a.type}</span>
                    </div>
                    <div className="text-muted mt-4">{a.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {digestResult.recommendations?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-sm font-semi mb-8">{t("Recommendations")}</div>
                {digestResult.recommendations.map((r, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <div className="flex-between">
                      <span>{r.action}</span>
                      <span className={`badge ${r.urgency === "now" ? "badge-red" : r.urgency === "this_week" ? "badge-amber" : "badge-blue"}`}>{r.urgency}</span>
                    </div>
                    <div className="text-xs text-muted mt-2">{r.impact}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Wins */}
            {digestResult.wins?.length > 0 && (
              <div>
                <div className="text-sm font-semi mb-8">{t("Wins This Week")}</div>
                {digestResult.wins.map((w, i) => (
                  <div key={i} style={{ padding: "4px 0", fontSize: 13, color: "var(--green)" }}>{w}</div>
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
          <div className="section-title font-head">{t("Bids")}</div>
          <div className="section-sub">{filteredBids.length} {filteredBids.length !== 1 ? t("bids") : t("bid")}</div>
        </div>
        <div className="flex gap-8">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder={t("Search bids...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" onClick={() => {
            const headers = ["ID","Name","GC","Value","Due","Status","Phase","Risk","Contact","Month","Scope","Notes"];
            const rows = filteredBids.map(b => [
              b.id, `"${(b.name||'').replace(/"/g,'""')}"`, `"${(b.gc||'').replace(/"/g,'""')}"`,
              b.value||0, b.due||'', b.status||'', b.phase||'', b.risk||'', `"${(b.contact||'').replace(/"/g,'""')}"`,
              b.month||'', `"${(b.scope||[]).join('; ')}"`, `"${(b.notes||'').replace(/"/g,'""')}"`
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
          <button className="btn btn-primary" onClick={() => setModal({ type: "editBid", data: null })}>{t("+ Add Bid")}</button>
        </div>
      </div>

      {/* Email-to-Bid Scanner */}
      {showEmailScanner && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="text-sm font-semi mb-8">{t("Email-to-Bid Scanner")}</div>
          <div className="text-xs text-muted mb-8">Paste a bid invite email, forwarded bid package, or any email with project info. AI will extract bids and let you import them.</div>
          <textarea className="form-input" rows={6} placeholder="Paste email content here..."
            value={emailText} onChange={e => setEmailText(e.target.value)}
            style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, marginBottom: 8 }} />
          <div className="flex-between">
            <span className="text-xs text-dim">{emailText.length} chars</span>
            <button className="btn btn-primary btn-sm" onClick={runEmailScan} disabled={emailLoading}>
              {emailLoading ? t("Scanning...") : t("Extract Bids")}
            </button>
          </div>

          {emailResults && emailResults.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="text-sm font-semi mb-8">Found {emailResults.length} bid{emailResults.length > 1 ? "s" : ""}</div>
              {emailResults.map((bid, i) => (
                <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="flex-between mb-4">
                    <span className="font-semi text-sm">{bid.name || "Unnamed"}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => importEmailBid(bid)}>Import</button>
                  </div>
                  <div className="text-xs text-muted">
                    {bid.gc && <span>GC: {bid.gc} · </span>}
                    {bid.value && <span>{fmt(bid.value)} · </span>}
                    {bid.due && <span>Due: {bid.due} · </span>}
                    {bid.status && <span className={`badge ${STATUS_BADGE[bid.status] || "badge-muted"}`}>{bid.status}</span>}
                  </div>
                  {bid.contact && <div className="text-xs text-dim mt-4">Contact: {bid.contact}</div>}
                  {bid.notes && <div className="text-xs text-dim mt-4">{bid.notes}</div>}
                </div>
              ))}
            </div>
          )}
          {emailResults && emailResults.length === 0 && (
            <div className="text-sm text-muted" style={{ padding: 12, textAlign: "center" }}>No bid information found in this email.</div>
          )}
        </div>
      )}

      <div className="flex gap-4 mb-16 flex-wrap">
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

      {selectedBids.size > 0 && (
        <div className="card mt-16" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="text-sm font-semi">{selectedBids.size} {t("selected")}</span>
          <select className="form-select" style={{ width: "auto", fontSize: 12 }} defaultValue="" onChange={e => {
            if (!e.target.value) return;
            setBids(prev => prev.map(b => selectedBids.has(b.id) ? { ...b, status: e.target.value } : b));
            show(`${selectedBids.size} bids → ${e.target.value}`);
            setSelectedBids(new Set());
            e.target.value = "";
          }}>
            <option value="">{t("Set status...")}</option>
            <option value="estimating">Estimating</option>
            <option value="submitted">Submitted</option>
            <option value="awarded">Awarded</option>
            <option value="lost">Lost</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBids(new Set())}>{t("Clear")}</button>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => {
            if (!confirm(`Delete ${selectedBids.size} bids?`)) return;
            setBids(prev => prev.filter(b => !selectedBids.has(b.id)));
            setSelectedBids(new Set());
            show("Bids deleted");
          }}>{t("Delete Selected")}</button>
        </div>
      )}

      {filteredBids.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <div className="empty-text">{t("No bids match your filter")}</div>
        </div>
      ) : (
        <div className="bid-grid">
          {filteredBids.slice(0, bidPageSize).map(b => (
            <div key={b.id} className="bid-card" onClick={() => setModal({ type: "editBid", data: b })}>
              <div className="flex-between mb-8">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={selectedBids.has(b.id)} onClick={e => e.stopPropagation()} onChange={e => {
                    setSelectedBids(prev => { const n = new Set(prev); e.target.checked ? n.add(b.id) : n.delete(b.id); return n; });
                  }} style={{ cursor: "pointer" }} />
                  <span className={`badge ${STATUS_BADGE[b.status] || "badge-muted"}`}>{b.status}</span>
                </span>
                {b.risk && <span className={`badge ${RISK_BADGE[b.risk] || "badge-muted"}`}>{b.risk} Risk</span>}
              </div>
              <div className="card-title font-head" style={{ fontSize: 15, marginBottom: 4 }}>{b.name}</div>
              <div className="text-sm text-muted mb-4">{b.gc}</div>
              <div className="flex-between mt-8">
                <span className="font-mono font-bold text-amber">{fmt(b.value)}</span>
                <span className="text-xs text-dim">Due: {b.due || "TBD"}</span>
              </div>
              {b.scope && b.scope.length > 0 && (
                <div className="flex gap-4 flex-wrap mt-8">
                  {b.scope.map((s, i) => (
                    <span key={i} className="badge badge-muted" style={{ fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              )}
              {b.contact && <div className="text-xs text-dim mt-8">Contact: {b.contact}</div>}
              <div className="flex gap-4 mt-8 flex-wrap">
                {b.status === "submitted" && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); runFollowUp(b); }}
                    disabled={followUpLoading && followUpBid?.id === b.id}>
                    {followUpLoading && followUpBid?.id === b.id ? t("Drafting...") : t("Draft Follow-Up")}
                  </button>
                )}
                {(b.status === "estimating" || b.status === "submitted") && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "var(--amber)" }}
                    onClick={(e) => { e.stopPropagation(); runWinPredict(b); }}
                    disabled={winPredLoading && winPredBid?.id === b.id}>
                    {winPredLoading && winPredBid?.id === b.id ? t("Predicting...") : t("Win Predictor")}
                  </button>
                )}
                {b.status === "awarded" && !projects.some(p => p.bidId === b.id) && (
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newProj = {
                        id: nextId(),
                        bidId: b.id,
                        name: b.name,
                        gc: b.gc,
                        contract: b.value || 0,
                        billed: 0,
                        progress: 0,
                        phase: "Pre-Construction",
                        start: "",
                        end: "",
                        scope: b.scope || [],
                        margin: 0,
                      };
                      setProjects(prev => [...prev, newProj]);
                      show(`Project created from "${b.name}"`);
                    }}>
                    {t("Convert to Project")}
                  </button>
                )}
                {b.status === "awarded" && projects.some(p => p.bidId === b.id) && (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>{t("Project Created")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredBids.length > bidPageSize && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => setBidPageSize(s => s + 24)}>
            {t("Show More")} ({filteredBids.length - bidPageSize} {t("remaining")})
          </button>
        </div>
      )}

      {/* Follow-Up Email Modal */}
      {followUpBid && followUpText && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => setFollowUpBid(null))}>
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header flex-between">
              <div className="modal-title">Follow-Up: {followUpBid.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setFollowUpBid(null)}>{t("Close")}</button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="text-xs text-muted mb-8">To: {followUpBid.contact || followUpBid.gc} · Re: {followUpBid.name}</div>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, background: "var(--bg3)", padding: 16, borderRadius: 8, maxHeight: 400, overflow: "auto" }}>
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
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header flex-between">
              <div className="modal-title">Win Prediction: {winPredBid.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setWinPredBid(null)}>{t("Close")}</button>
            </div>
            <div style={{ padding: 16, maxHeight: 500, overflow: "auto" }}>
              {/* Win Probability */}
              <div className="card" style={{ padding: 16, marginBottom: 12, textAlign: "center" }}>
                <div className="text-xs text-muted mb-4">{t("Win Probability")}</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: winPredResult.winProbability >= 70 ? "var(--green)" : winPredResult.winProbability >= 40 ? "var(--amber)" : "var(--red)" }}>
                  {winPredResult.winProbability}%
                </div>
                <span className={`badge ${winPredResult.confidence === "high" ? "badge-green" : winPredResult.confidence === "medium" ? "badge-amber" : "badge-red"}`}>
                  {winPredResult.confidence} confidence
                </span>
              </div>

              {/* GC History */}
              {winPredResult.gcHistory && (
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
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
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("Key Factors")}</div>
                  {winPredResult.factors.map((f, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
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
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>{t("Improve Win Chances")}</div>
                  {winPredResult.improvements.map((imp, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
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
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-4">{t("Pricing Insight")}</div>
                  <div className="text-sm text-muted">{winPredResult.pricingInsight}</div>
                </div>
              )}

              {/* Summary */}
              <div className="text-sm text-muted" style={{ padding: 8 }}>{winPredResult.summary}</div>
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
          <div className="section-sub">{projects.length} {projects.length !== 1 ? t("projects") : t("project")}</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={runRiskRadar} disabled={riskLoading}>
            {riskLoading ? t("Scanning...") : t("Risk Radar")}
          </button>
          <button className="btn btn-ghost" onClick={() => {
            const headers = ["ID","Name","GC","Contract","Billed","Progress","Phase","Start","End","Margin"];
            const rows = filteredProjects.map(p => [
              p.id, `"${(p.name||'').replace(/"/g,'""')}"`, `"${(p.gc||'').replace(/"/g,'""')}"`,
              p.contract||0, p.billed||0, p.progress||0, p.phase||'', p.start||'', p.end||'', p.margin||''
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_projects.csv'; a.click();
            URL.revokeObjectURL(url);
            show("Projects CSV exported");
          }}>{t("Export CSV")}</button>
          <button className="btn btn-primary" onClick={() => setModal({ type: "editProject", data: null })}>{t("+ Add Project")}</button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
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
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">{t("Project Risk Radar")}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowRiskRadar(false); setRiskResult(null); }}>{t("Close")}</button>
          </div>
          {riskLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing {projects.length} projects for risks...</div>}
          {riskResult && (
            <div>
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>
                {riskResult.portfolioRisk}
              </div>

              {/* Rankings */}
              {riskResult.rankings?.map((r, i) => {
                const riskColor = r.riskLevel === "critical" ? "var(--red)" : r.riskLevel === "high" ? "var(--amber)" : r.riskLevel === "medium" ? "var(--blue)" : "var(--green)";
                return (
                  <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, borderLeft: `4px solid ${riskColor}`, background: "var(--card)" }}>
                    <div className="flex-between mb-4">
                      <span className="font-semi text-sm">{r.project}</span>
                      <div className="flex gap-8" style={{ alignItems: "center" }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: riskColor }}>{r.riskScore}</span>
                        <span className={`badge ${r.riskLevel === "critical" ? "badge-red" : r.riskLevel === "high" ? "badge-amber" : r.riskLevel === "medium" ? "badge-blue" : "badge-green"}`}>{r.riskLevel}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap mb-4">
                      {r.factors?.map((f, j) => <span key={j} className="badge badge-muted" style={{ fontSize: 10 }}>{f}</span>)}
                    </div>
                    <div className="text-xs text-muted">{r.recommendation}</div>
                  </div>
                );
              })}

              {/* Immediate Actions */}
              {riskResult.immediateActions?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("Immediate Actions")}</div>
                  {riskResult.immediateActions.map((a, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
          <div className="empty-icon">🏗️</div>
          <div className="empty-text">{search ? t("No matching projects") : t("No projects yet")}</div>
        </div>
      ) : (
        <div className="project-grid">
          {filteredProjects.slice(0, projPageSize).map(p => (
            <div key={p.id} className="project-card" onClick={() => {
              // Track last accessed
              setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, lastAccessed: new Date().toISOString() } : proj));
              setModal({ type: "editProject", data: { ...p, lastAccessed: new Date().toISOString() } });
            }}>
              <div className="flex-between mb-4">
                <span className="badge badge-blue">{p.phase}</span>
              </div>
              <div className="card-title font-head" style={{ fontSize: 15, marginBottom: 4 }}>{p.name}</div>
              <div className="text-sm text-muted mb-4">{p.gc}</div>
              <div className="flex-between text-xs text-dim mb-4">
                <span>📅 Bid: {p.start || "—"}</span>
                <span>🕐 {p.lastAccessed ? new Date(p.lastAccessed).toLocaleDateString() : "Never opened"}</span>
              </div>
              <div className="flex-between text-sm">
                <span>Contract: <span className="font-mono text-amber">{fmt(p.contract)}</span></span>
                <span>Billed: <span className="font-mono">{fmt(p.billed)}</span></span>
              </div>
              <div className="progress-bar mt-8">
                <div className="progress-fill" style={{ width: `${p.progress}%` }} />
              </div>
              <div className="flex-between mt-4">
                <div className="text-xs text-dim">{p.progress}% complete</div>
                {p.progress >= 75 && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 8px", color: "var(--amber)" }}
                    onClick={(e) => { e.stopPropagation(); runCloseout(p); }}
                    disabled={closeoutLoading && closeoutProj?.id === p.id}>
                    {closeoutLoading && closeoutProj?.id === p.id ? "..." : "AI Closeout"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredProjects.length > projPageSize && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => setProjPageSize(s => s + 24)}>
            {t("Show More")} ({filteredProjects.length - projPageSize} {t("remaining")})
          </button>
        </div>
      )}

      {/* Closeout Modal */}
      {closeoutProj && closeoutResult && (
        <div className="modal-overlay" onMouseDown={onOverlayDown} onMouseUp={onOverlayUp(() => setCloseoutProj(null))}>
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header flex-between">
              <div className="modal-title">Closeout: {closeoutProj.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCloseoutProj(null)}>{t("Close")}</button>
            </div>
            <div style={{ padding: 16, maxHeight: 500, overflow: "auto" }}>
              {/* Readiness Score */}
              <div className="flex gap-16 mb-16" style={{ alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div className="text-xs text-muted">{t("Readiness")}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: closeoutResult.readinessScore >= 70 ? "var(--green)" : closeoutResult.readinessScore >= 40 ? "var(--amber)" : "var(--red)" }}>
                    {closeoutResult.readinessScore}/100
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="text-xs text-muted">{t("Grade")}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--amber)" }}>{closeoutResult.grade}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-sm text-muted">{closeoutResult.summary}</div>
                </div>
              </div>

              {/* Financial Status */}
              {closeoutResult.financialStatus && (
                <div className="flex gap-12 mb-12 flex-wrap" style={{ padding: 12, borderRadius: 8, background: "var(--bg3)" }}>
                  <div><span className="text-xs text-muted">Billed:</span> <span className="font-semi">${(closeoutResult.financialStatus.totalBilled || 0).toLocaleString()}</span></div>
                  <div><span className="text-xs text-muted">Remaining:</span> <span className="font-semi" style={{ color: "var(--amber)" }}>${(closeoutResult.financialStatus.remaining || 0).toLocaleString()}</span></div>
                  <div><span className="text-xs text-muted">Open COs:</span> <span className="font-semi">{closeoutResult.financialStatus.openCOs}</span></div>
                  <div><span className="text-xs text-muted">Margin:</span> <span className="font-semi">{closeoutResult.financialStatus.margin}</span></div>
                </div>
              )}

              {/* Checklist */}
              {closeoutResult.checklist?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("Closeout Checklist")}</div>
                  {closeoutResult.checklist.map((c, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div className="flex-between">
                        <span className="text-sm">{c.status === "complete" ? "✅" : c.status === "pending" ? "🔶" : "⬜"} {c.item}</span>
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
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>{t("Outstanding Items")}</div>
                  {closeoutResult.outstandingItems.map((o, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
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
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>{t("Risk of Loss")}</div>
                  {closeoutResult.riskOfLoss.map((r, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
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

  const runMorningBrief = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setBriefLoading(true);
    setBriefResult(null);
    try {
      const { generateMorningBriefing } = await import("./utils/api.js");
      const dashData = {
        projects: projects.map(p => ({ name: p.project || p.name, gc: p.gc, progress: p.progress, margin: p.margin, phase: p.phase })),
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
      const linkedBid = scopeBidId ? bids.find(b => b.id === scopeBidId) : null;
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
        const projCOs = (changeOrders || []).filter(c => c.projectId === p.id);
        const projTM = (tmTickets || []).filter(t => t.projectId === p.id);
        return {
          name: p.project || p.name, gc: p.gc, phase: p.phase,
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

  const runEmailScan = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    if (!emailText.trim()) { show("Paste email content first", "err"); return; }
    setEmailLoading(true);
    setEmailResults(null);
    try {
      const { analyzeBidsFromEmail } = await import("./utils/api.js");
      const results = await analyzeBidsFromEmail(apiKey, emailText);
      setEmailResults(results);
      if (results.length === 0) show("No bids found in email", "warn");
      else show(`Found ${results.length} bid${results.length > 1 ? "s" : ""}`, "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setEmailLoading(false);
    }
  };

  const importEmailBid = (bid) => {
    const newBid = {
      id: nextId(),
      name: bid.name || "Unnamed Project",
      gc: bid.gc || "",
      value: bid.value || 0,
      due: bid.due || "",
      status: bid.status || "estimating",
      phase: "",
      risk: "Med",
      scope: [],
      contact: bid.contact || "",
      month: "",
      notes: bid.notes || "",
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
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">{t("Scope Risk Analysis")}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowScopeRisk(false)}>{t("Close")}</button>
          </div>

          {/* Score + Grade */}
          <div className="flex gap-16 mb-16" style={{ alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div className="text-xs text-muted">{t("Risk Score")}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: scopeRiskResult.overallRisk <= 30 ? "var(--green)" : scopeRiskResult.overallRisk <= 60 ? "var(--amber)" : "var(--red)" }}>
                {scopeRiskResult.overallRisk}/100
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="text-xs text-muted">{t("Grade")}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--amber)" }}>{scopeRiskResult.grade}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-sm text-muted">{scopeRiskResult.summary}</div>
            </div>
          </div>

          {/* Red Flags */}
          {scopeRiskResult.redFlags?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>{t("Red Flags")} ({scopeRiskResult.redFlags.length})</div>
              {scopeRiskResult.redFlags.map((f, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="text-sm font-semi">{f.item}</div>
                  <div className="text-xs text-muted mt-2">{f.risk}</div>
                  <div className="text-xs mt-2"><span style={{ color: "var(--amber)" }}>Exposure:</span> {f.financialExposure}</div>
                  <div className="text-xs mt-2"><span style={{ color: "var(--green)" }}>Mitigation:</span> {f.mitigation}</div>
                </div>
              ))}
            </div>
          )}

          {/* Negotiation Points */}
          {scopeRiskResult.negotiationPoints?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>{t("Negotiation Points")}</div>
              {scopeRiskResult.negotiationPoints.map((n, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--border)" }}>
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
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8">{t("Hidden Cost Risks")}</div>
              {scopeRiskResult.hiddenCosts.map((h, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
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
            <div style={{ marginBottom: 12 }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--blue)" }}>{t("Recommended Exclusions")}</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {scopeRiskResult.exclusions.map((e, i) => (
                  <li key={i} className="text-sm text-muted" style={{ marginBottom: 4 }}>{e}</li>
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
        <div className="flex gap-8 mb-16 flex-wrap" style={{ alignItems: "center" }}>
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
            <div className="empty-icon">📋</div>
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
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="text-sm font-semi mb-8">Paste your bid scope and contract/spec scope below. AI will identify gaps, extras, and risks.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t("Bid Scope (what EBC priced)")}</label>
                <textarea className="form-input" rows={8} placeholder="Paste your bid scope, line items, or proposal scope description..."
                  value={gapBidScope} onChange={e => setGapBidScope(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }} />
                <div className="text-xs text-dim mt-4">{gapBidScope.length} chars</div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("Contract Scope (specs / drawings notes)")}</label>
                <textarea className="form-input" rows={8} placeholder="Paste contract scope, spec sections, or drawing notes..."
                  value={gapContractScope} onChange={e => setGapContractScope(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }} />
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
              <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                <div className="flex-between mb-8">
                  <div className="text-sm font-semi">{t("Coverage Score")}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: gapResult.score >= 80 ? "var(--green)" : gapResult.score >= 50 ? "var(--amber)" : "var(--red)" }}>
                    {gapResult.score}/100
                  </div>
                </div>
                <div className="text-sm text-muted">{gapResult.summary}</div>
              </div>

              {/* Gaps */}
              {gapResult.gaps?.length > 0 && (
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>
                    {t("Missing from Bid")} ({gapResult.gaps.length})
                  </div>
                  {gapResult.gaps.map((g, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
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
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>
                    {t("In Bid but Not in Contract")} ({gapResult.extras.length})
                  </div>
                  {gapResult.extras.map((g, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <span className="text-sm font-semi">{g.item}</span>
                      <div className="text-xs text-muted mt-4">{g.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risks */}
              {gapResult.risks?.length > 0 && (
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--blue)" }}>
                    {t("Risks & Ambiguities")} ({gapResult.risks.length})
                  </div>
                  {gapResult.risks.map((g, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
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
                  <div className="empty-icon">✅</div>
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
            <span className="search-icon">🔍</span>
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
          {gcIntelLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing {contacts.length} contacts and {bids.length} bids...</div>}
          {gcIntelResult && (
            <div style={{ marginTop: 8 }}>
              {/* Summary */}
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>{gcIntelResult.summary}</div>

              {/* GC Rankings */}
              {gcIntelResult.gcRankings?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("GC Rankings by Relationship Value")}</div>
                  {gcIntelResult.gcRankings.map((gc, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, borderLeft: `3px solid ${gc.score >= 70 ? "var(--green)" : gc.score >= 40 ? "var(--amber)" : "var(--red)"}`, background: "var(--card)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{gc.gc}</span>
                        <span style={{ fontWeight: 700, color: "var(--amber)" }}>{gc.score}/100</span>
                      </div>
                      <div className="text-xs text-muted mt-2">
                        {gc.totalBids} bids • {gc.wins}W ({gc.winRate}%) • {gc.activeProjects} active • {gc.trend}
                      </div>
                      <div className="text-xs mt-2" style={{ color: "var(--blue)" }}>{gc.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Opportunities */}
              {gcIntelResult.topOpportunities?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("Top BD Opportunities")}</div>
                  {gcIntelResult.topOpportunities.map((opp, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("At-Risk Relationships")}</div>
                  {gcIntelResult.atRiskRelationships.map((r, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, background: "rgba(239,68,68,0.06)", borderLeft: "3px solid var(--red)", fontSize: 13 }}>
                      <span className="font-semi">{r.gc}</span>
                      <div className="text-xs text-muted mt-2">{r.concern}</div>
                      <div className="text-xs mt-2" style={{ color: "var(--blue)" }}>{r.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-Up Needed */}
              {gcIntelResult.followUpNeeded?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">{t("Follow-Up Needed")}</div>
                  {gcIntelResult.followUpNeeded.map((f, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
                    <div key={i} style={{ padding: "4px 0", fontSize: 13, color: "var(--text2)" }}>{ins}</div>
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
            <div className="flex gap-12" style={{ alignItems: "center" }}>
              <div className="contact-avatar" style={{ background: c.color || "var(--amber)" }}>
                {c.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-col" style={{ flex: 1 }}>
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
            <div key={c.id} className="flex gap-12 border-b" style={{ padding: "10px 0" }}>
              <div style={{ width: 4, borderRadius: 2, background: "var(--blue)", flexShrink: 0 }} />
              <div className="flex-col gap-4" style={{ flex: 1 }}>
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
        <div className="logo" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <img src={theme === "daylight" ? "/eagle-blue.png" : "/ebc-eagle-white.png"} alt="Eagles Brothers Constructors" style={{ height: 32, width: "auto", objectFit: "contain", transition: "opacity 0.3s" }} onError={(e) => e.target.style.display = "none"} />
        </div>
        <button className="hamburger" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileNav ? "open" : ""}`} />
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, marginRight: 4, fontWeight: 600, letterSpacing: 0.5, border: "1px solid var(--border)" }}
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          {lang === "en" ? "🌐 ES" : "🌐 EN"}
        </button>
        <div style={{ position: "relative", marginRight: 4 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 16, padding: "4px 8px", position: "relative" }}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2, background: "var(--red)", color: "#fff",
                borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
              }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>
          {notifOpen && (
            <div style={{
              position: "absolute", top: "100%", right: 0, width: 360, maxHeight: 480, overflowY: "auto",
              background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              zIndex: 999, padding: 0,
            }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t("Notifications")} {unreadCount > 0 && <span className="badge badge-red" style={{ fontSize: 10, marginLeft: 4 }}>{unreadCount}</span>}</div>
                <div className="flex gap-4">
                  {unreadCount > 0 && <button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 6px" }} onClick={markAllRead}>Mark all read</button>}
                  {(notifications || []).length > 0 && <button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 6px", color: "var(--red)" }} onClick={clearNotifications}>Clear</button>}
                </div>
              </div>
              {(notifications || []).length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <div className="text-sm text-muted" style={{ marginTop: 8 }}>All caught up! No notifications.</div>
                </div>
              ) : (
                (notifications || []).slice(0, 30).map(n => {
                  const NOTIF_ICONS = { cert_expired: "🚨", cert_urgent: "⚠️", cert_warning: "📋", invoice_overdue: "💰", tm_pending: "📝", sds_expired: "☣️", sds_warning: "📄", co_pending: "📑" };
                  const timeAgo = (() => {
                    const mins = Math.floor((Date.now() - new Date(n.createdAt)) / 60000);
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    return `${Math.floor(hrs / 24)}d ago`;
                  })();
                  return (
                    <div key={n.id}
                      style={{
                        padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                        background: n.read ? "transparent" : "rgba(224,148,34,0.06)",
                      }}
                      onClick={() => { markRead(n.id); }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{NOTIF_ICONS[n.type] || "📌"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 12 }}>{n.title}</div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>{n.message}</div>
                        </div>
                        <div className="text-xs text-muted" style={{ flexShrink: 0 }}>{timeAgo}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
                <div className="logo" style={{ fontSize: 16, display: "flex", alignItems: "center" }}><img src={theme === "daylight" ? "/eagle-blue.png" : "/ebc-eagle-white.png"} alt="EBC" style={{ height: 24, width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /></div>
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
        {["financials", "documents", "schedule", "reports", "safety", "timeclock", "sds", "map", "settings"].includes(tab) && <MoreTabs app={app} />}
      </main>

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
          border: "1px solid var(--amber)", borderRadius: 12,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
          zIndex: 10000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 420, width: "calc(100% - 32px)",
        }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>&#9881;</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold, #e09422)" }}>{t("Install EBC")}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
              {t("Works offline, launches instantly — like a real app")}
            </div>
          </div>
          <button style={{
            background: "var(--gold, #e09422)", color: "#000",
            border: "none", borderRadius: 8, padding: "8px 18px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
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
            color: "var(--text3)", cursor: "pointer", fontSize: 18, padding: "0 4px",
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
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [pdfScanning, setPdfScanning] = useState(false);
  const [quickContact, setQuickContact] = useState(null); // inline add-contact from bid form
  const [contactFilter, setContactFilter] = useState("");
  const [contactDropOpen, setContactDropOpen] = useState(false);

  const getInitial = () => {
    switch (type) {
      case "editBid":
        return data ? { ...data } : {
          name: "", gc: "", value: 0, due: "", status: "estimating",
          scope: [], phase: "", risk: "Med", notes: "", contact: "",
          month: "", address: "", attachments: []
        };
      case "editProject":
        return data ? { ...data } : {
          name: "", gc: "", contract: 0, billed: 0, progress: 0,
          phase: "", start: "", end: ""
        };
      case "editContact":
        return data ? { ...data } : {
          name: "", company: "", role: "", phone: "", email: "",
          priority: "med", notes: "", bids: 0, wins: 0, color: "#3b82f6", last: "Never"
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
          app.setBids(prev => prev.map(b => b.id === draft.id ? { ...draft } : b));
          show("Bid updated");
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
    // Update bid status to "awarded"
    const awardedBid = { ...draft, status: "awarded" };
    app.setBids(prev => prev.map(b => b.id === awardedBid.id ? awardedBid : b));
    // Create project from bid data
    const newProject = {
      id: app.nextId(),
      name: awardedBid.name,
      gc: awardedBid.gc,
      contract: awardedBid.value || 0,
      billed: 0,
      progress: 0,
      phase: awardedBid.phase || "",
      start: awardedBid.due || "",
      end: "",
      pm: "",
      laborBudget: 0,
      laborHours: 0,
      address: awardedBid.address || "",
      attachments: awardedBid.attachments || [],
      bidId: awardedBid.id, // link back to the bid
      notes: awardedBid.notes || "",
    };
    app.setProjects(prev => [...prev, newProject]);
    show("Bid awarded! Project created.");
    setModal(null);
  };

  const handleUnAwardBid = () => {
    if (!draft.id) return;
    if (!confirm("Un-award this bid? The linked project will be removed.")) return;
    // Set bid back to submitted
    const updBid = { ...draft, status: "submitted" };
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

  const close = () => setModal(null);

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
          <div className="modal-actions" style={{ justifyContent: "space-between" }}>
            <button className="btn" style={{ color: "var(--red)", border: "1px solid var(--red-dim)", background: "var(--red-dim)" }} onClick={handleDelete}>Delete</button>
            <div className="flex gap-8">
              {draft.status !== "awarded" && (
                <button className="btn" style={{ background: "rgba(16,185,129,0.12)", color: "var(--green)", border: "1px solid var(--green)", fontWeight: 600 }} onClick={handleAwardBid}>
                  Award Bid
                </button>
              )}
              {draft.status === "awarded" && (
                <button className="btn" style={{ background: "rgba(234,179,8,0.12)", color: "var(--yellow)", border: "1px solid var(--yellow)", fontSize: 11 }} onClick={handleUnAwardBid}>
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
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Project Details</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="flex-col gap-12">
            <div><span className="text-dim text-xs">NAME</span><div className="font-semi">{draft.name}</div></div>
            <div><span className="text-dim text-xs">GC</span><div>{draft.gc}</div></div>
            <div className="flex gap-16">
              <div><span className="text-dim text-xs">CONTRACT</span><div className="font-mono text-amber">{fmt(draft.contract)}</div></div>
              <div><span className="text-dim text-xs">BILLED</span><div className="font-mono">{fmt(draft.billed)}</div></div>
              <div><span className="text-dim text-xs">PROGRESS</span><div>{draft.progress}%</div></div>
            </div>
            <div><span className="text-dim text-xs">PHASE</span><div className="badge badge-blue">{draft.phase}</div></div>
            <div className="flex gap-16">
              <div><span className="text-dim text-xs">START</span><div>{draft.start || "TBD"}</div></div>
              <div><span className="text-dim text-xs">END</span><div>{draft.end || "TBD"}</div></div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${draft.progress}%` }} />
            </div>
          </div>
          <div className="modal-actions" style={{ justifyContent: "space-between" }}>
            <button className="btn" style={{ color: "var(--red)", border: "1px solid var(--red-dim)", background: "var(--red-dim)" }} onClick={handleDelete}>Delete</button>
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
            <div className="flex gap-8" style={{ alignItems: "center" }}>
              <label className="btn btn-sm" style={{ background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid var(--blue)", fontSize: 11, cursor: "pointer", position: "relative" }}>
                {pdfScanning ? "Scanning..." : "Scan Proposal PDF"}
                <input type="file" accept=".pdf" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={(e) => { if (e.target.files?.[0]) handlePdfScan(e.target.files[0]); e.target.value = ""; }} disabled={pdfScanning} />
              </label>
              {isNew && <button className="btn btn-sm" style={{ background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid var(--amber)", fontSize: 11 }} onClick={() => setShowAiPanel(!showAiPanel)}>{showAiPanel ? "Hide AI" : "Analyze Bid Package"}</button>}
              <button className="modal-close" onClick={close}>✕</button>
            </div>
          </div>

          {showAiPanel && (
            <div style={{ marginBottom: 16, padding: 16, background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--amber-dim)" }}>
              <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, marginBottom: 8 }}>PASTE BID INVITE, SPEC EXCERPT, OR EMAIL</div>
              <textarea className="form-textarea" value={aiText} onChange={e => setAiText(e.target.value)} placeholder={"Paste the bid invite email, spec section, or project description here...\n\nThe AI will extract: project name, GC, due date, scope tags, risk level, phase, and key notes."} style={{ minHeight: 120, fontSize: 12 }} />
              <div className="flex-between mt-8">
                <span className="text2" style={{ fontSize: 11 }}>{aiText.length > 0 ? `${aiText.length} characters` : "Paste text to analyze"}</span>
                <button className="btn btn-primary btn-sm" onClick={runAnalysis} disabled={aiLoading} style={{ minWidth: 140 }}>
                  {aiLoading ? "Analyzing..." : "Extract Fields"}
                </button>
              </div>
            </div>
          )}

          {aiWarnings.length > 0 && (
            <div style={{ marginBottom: 12, padding: 10, background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "var(--radius)", fontSize: 12 }}>
              <strong style={{ color: "var(--red)", fontSize: 11 }}>WARNINGS</strong>
              <ul style={{ margin: "4px 0 0 16px", color: "var(--text2)" }}>
                {aiWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Bid Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Project name" />
            </div>
            <div className="form-group">
              <label className="form-label">General Contractor</label>
              <input className="form-input" value={draft.gc} onChange={e => upd("gc", e.target.value)} placeholder="GC name" />
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
              <select className="form-select" value={draft.status} onChange={e => upd("status", e.target.value)}>
                <option value="estimating">Estimating</option>
                <option value="submitted">Submitted</option>
                <option value="awarded">Awarded</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phase</label>
              <input className="form-input" value={draft.phase} onChange={e => upd("phase", e.target.value)} placeholder="e.g. Medical, Commercial" />
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
              <div className="flex gap-4" style={{ alignItems: "center" }}>
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
                    <button type="button" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 14, padding: "2px 4px" }}
                      onClick={() => { upd("contact", ""); setContactFilter(""); }}>✕</button>
                  )}
                  {contactDropOpen && (() => {
                    const q = contactFilter.toLowerCase();
                    const filtered = app.contacts.filter(c =>
                      c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q)
                    );
                    return (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, maxHeight: 200, overflowY: "auto", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "0 0 var(--radius) var(--radius)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                        {filtered.length === 0 ? (
                          <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text2)" }}>No contacts found</div>
                        ) : filtered.map(c => (
                          <div key={c.id}
                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
                            onMouseDown={e => { e.preventDefault(); upd("contact", c.name); setContactDropOpen(false); setContactFilter(""); }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                            <span style={{ color: "var(--text2)", marginLeft: 8, fontSize: 11 }}>{c.company}{c.role ? ` · ${c.role}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" style={{ whiteSpace: "nowrap", fontSize: 11, padding: "4px 8px" }}
                  onClick={() => setQuickContact({ name: "", company: draft.gc || "", role: "", phone: "", email: "" })}>+ New</button>
              </div>
              {quickContact && (
                <div style={{ marginTop: 8, padding: 12, background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--border2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--amber)", marginBottom: 8 }}>QUICK ADD CONTACT</div>
                  <div className="flex gap-8 mb-8" style={{ flexWrap: "wrap" }}>
                    <input className="form-input" style={{ flex: "1 1 140px" }} placeholder="Name *" value={quickContact.name}
                      onChange={e => setQuickContact(prev => ({ ...prev, name: e.target.value }))} />
                    <input className="form-input" style={{ flex: "1 1 140px" }} placeholder="Company" value={quickContact.company}
                      onChange={e => setQuickContact(prev => ({ ...prev, company: e.target.value }))} />
                  </div>
                  <div className="flex gap-8 mb-8" style={{ flexWrap: "wrap" }}>
                    <input className="form-input" style={{ flex: "1 1 120px" }} placeholder="Role" value={quickContact.role}
                      onChange={e => setQuickContact(prev => ({ ...prev, role: e.target.value }))} />
                    <input className="form-input" style={{ flex: "1 1 120px" }} placeholder="Phone" value={quickContact.phone}
                      onChange={e => setQuickContact(prev => ({ ...prev, phone: e.target.value }))} />
                    <input className="form-input" style={{ flex: "1 1 160px" }} placeholder="Email" value={quickContact.email}
                      onChange={e => setQuickContact(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="flex gap-8">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                      if (!quickContact.name.trim()) { app.show("Contact name is required", "err"); return; }
                      const newContact = { ...quickContact, id: app.nextId(), priority: "med", notes: "", bids: 0, wins: 0, color: "#3b82f6", last: "Never" };
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
              <label className="form-label">Month</label>
              <input className="form-input" value={draft.month || ""} onChange={e => upd("month", e.target.value)} placeholder="e.g. Mar" />
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
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={draft.notes} onChange={e => upd("notes", e.target.value)} placeholder="Bid notes, clarifications, exclusions..." style={{ minHeight: 220, resize: "vertical", fontSize: 12, lineHeight: 1.5, fontFamily: "inherit" }} />
            </div>

            {/* ── File Attachments ── */}
            <div className="form-group full">
              <label className="form-label">Plans, Specs & Documents</label>
              <div style={{ border: "1px dashed var(--border2)", borderRadius: "var(--radius)", padding: 16, background: "var(--bg2)" }}>
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
                  style={{ marginBottom: 8 }}
                />
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>
                  PDF, images, DWG, Excel, Word — max 10MB per file. Stored locally.
                </div>
                {(draft.attachments || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(draft.attachments || []).map((att, i) => (
                      <div key={att.id || i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                        padding: "8px 12px", fontSize: 12
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 16 }}>
                            {att.type?.includes("pdf") ? "📄" : att.type?.includes("image") ? "🖼️" : att.type?.includes("sheet") || att.type?.includes("excel") ? "📊" : "📎"}
                          </span>
                          <span style={{ color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {att.name}
                          </span>
                          <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                            {att.size < 1024 ? att.size + "B" : att.size < 1048576 ? (att.size / 1024).toFixed(1) + "KB" : (att.size / 1048576).toFixed(1) + "MB"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {att.data && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 10, padding: "2px 6px" }}
                              onClick={() => { const w = window.open(); w.document.write(`<iframe src="${att.data}" style="width:100%;height:100%;border:none"></iframe>`); }}
                              title="View"
                            >View</button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 10, padding: "2px 6px", color: "var(--red)" }}
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
          <div className="modal-actions" style={{ justifyContent: "space-between" }}>
            {!isNew && <button className="btn" style={{ color: "var(--red)", border: "1px solid var(--red-dim)", background: "var(--red-dim)" }} onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8" style={{ marginLeft: "auto" }}>
              {!isNew && draft.status !== "awarded" && (
                <button className="btn" style={{ background: "rgba(16,185,129,0.12)", color: "var(--green)", border: "1px solid var(--green)", fontWeight: 600 }} onClick={handleAwardBid}>
                  Award Bid
                </button>
              )}
              {!isNew && draft.status === "awarded" && (
                <button className="btn" style={{ background: "rgba(234,179,8,0.12)", color: "var(--yellow)", border: "1px solid var(--yellow)", fontSize: 11 }} onClick={handleUnAwardBid}>
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
              <label className="form-label">Progress (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={draft.progress} onChange={e => upd("progress", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phase</label>
              <input className="form-input" value={draft.phase} onChange={e => upd("phase", e.target.value)} placeholder="e.g. Framing, Board Hang" />
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
            <div className="form-group full">
              <label className="form-label">Address</label>
              <input className="form-input" value={draft.address || ""} onChange={e => upd("address", e.target.value)} placeholder="Project address" />
            </div>

            <div className="form-group full">
              <label className="form-label">Close-Out Notes</label>
              <textarea className="form-textarea" value={draft.closeOut || ""} onChange={e => upd("closeOut", e.target.value)} placeholder="Close-out status, punch list, final inspections..." style={{ minHeight: 80, resize: "vertical" }} />
            </div>

            {/* ── Proposal Attachments ── */}
            <div className="form-group full">
              <label className="form-label">Proposal / Attachments</label>
              <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  multiple
                  style={{ display: "none" }}
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
                <label htmlFor="proposal-upload" className="btn btn-ghost" style={{ cursor: "pointer" }}>
                  📎 Upload Proposal / Files
                </label>
                <div className="text-xs text-dim" style={{ marginTop: 6 }}>PDF, Word, Excel, Images</div>
              </div>

              {/* List attached files */}
              {(draft.attachments || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {draft.attachments.map((att, i) => (
                    <div key={att.id || i} className="flex-between" style={{ padding: "8px 12px", background: "var(--bg3)", borderRadius: 6, marginBottom: 4 }}>
                      <div className="flex gap-8" style={{ alignItems: "center" }}>
                        <span>{att.type?.includes("pdf") ? "📄" : att.type?.includes("image") ? "🖼️" : att.type?.includes("sheet") || att.type?.includes("excel") ? "📊" : "📁"}</span>
                        <div>
                          <div className="text-sm font-semi">{att.name}</div>
                          <div className="text-xs text-dim">{(att.size / 1024).toFixed(0)} KB · {new Date(att.uploadedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = att.data;
                            link.download = att.name;
                            link.click();
                          }}>⬇️</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "var(--red)" }}
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

            const sections = [
              { label: "RFIs", items: projRfis, icon: "📝", tab: "documents", fields: (r) => `#${r.number || ""} — ${r.subject || r.desc || ""}`, badge: (r) => r.status },
              { label: "Submittals", items: projSubmittals, icon: "📋", tab: "documents", fields: (s) => `#${s.number || ""} — ${s.description || s.desc || ""}`, badge: (s) => s.status },
              { label: "Change Orders", items: projCOs, icon: "📑", tab: "financials", fields: (c) => `#${c.number || ""} — ${c.desc || ""} (${fmt(c.amount || 0)})`, badge: (c) => c.status },
              { label: "Invoices", items: projInvoices, icon: "💰", tab: "financials", fields: (i) => `#${i.number} — ${fmt(i.amount)} — ${i.date || ""}`, badge: (i) => i.status },
              { label: "Daily Reports", items: projDailyReports, icon: "📊", tab: "safety", fields: (d) => `${d.date || ""} — ${d.crewSize || 0} crew — ${(d.work || "").slice(0, 60)}`, badge: () => null },
              { label: "JSAs", items: projJSAs, icon: "⚠️", tab: "jsa", fields: (j) => `${j.date || ""} — ${j.title || j.location || ""}`, badge: () => null },
              { label: "T&M Tickets", items: projTM, icon: "🔧", tab: "financials", fields: (t) => `${t.ticketNumber || ""} — ${t.description || ""} (${fmt(calcLaborTotal(t.laborEntries || []) + calcMatTotal(t.materialEntries || []))})`, badge: (t) => t.status },
            ];

            const totalDocs = sections.reduce((s, sec) => s + sec.items.length, 0);

            return (
              <div style={{ marginTop: 16, borderTop: "2px solid var(--border)", paddingTop: 16 }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Project Documents ({totalDocs})</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
                  {sections.map(sec => (
                    <div key={sec.label} style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                      <div className="flex-between" style={{ marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{sec.icon} {sec.label}</div>
                        <span className="badge badge-blue" style={{ fontSize: 9 }}>{sec.items.length}</span>
                      </div>
                      {sec.items.length === 0 ? (
                        <div className="text-xs text-muted">None</div>
                      ) : (
                        sec.items.slice(0, 5).map((item, i) => (
                          <div key={item.id || i} style={{ fontSize: 11, padding: "3px 0", borderBottom: "1px solid var(--border)" }}>
                            <span>{sec.fields(item)}</span>
                            {sec.badge(item) && <span className={`badge ${sec.badge(item) === "paid" || sec.badge(item) === "approved" || sec.badge(item) === "answered" ? "badge-green" : sec.badge(item) === "pending" || sec.badge(item) === "submitted" || sec.badge(item) === "open" ? "badge-amber" : "badge-muted"}`} style={{ fontSize: 8, marginLeft: 4 }}>{sec.badge(item)}</span>}
                          </div>
                        ))
                      )}
                      {sec.items.length > 5 && <div className="text-xs text-muted" style={{ marginTop: 4 }}>+{sec.items.length - 5} more</div>}
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 6px", marginTop: 6 }} onClick={() => { setModal(null); app.setTab(sec.tab); }}>
                        View All →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="modal-actions" style={{ justifyContent: "space-between" }}>
            {!isNew && <button className="btn" style={{ color: "var(--red)", border: "1px solid var(--red-dim)", background: "var(--red-dim)" }} onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8" style={{ marginLeft: "auto" }}>
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Project" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
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
                  <div key={c.id} className="flex gap-8 border-b" style={{ padding: "8px 0", alignItems: "center" }}>
                    <div className="text-xs text-dim" style={{ width: 130, flexShrink: 0 }}>{c.time}</div>
                    <div className="text-sm" style={{ flex: 1 }}>{c.note}</div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "1px 5px", color: "var(--red)", flexShrink: 0 }}
                      onClick={() => { if (confirm("Delete this call log?")) { app.setCallLog(prev => prev.filter(cl => cl.id !== c.id)); app.show("Call deleted"); } }}>✕</button>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="modal-actions" style={{ justifyContent: "space-between" }}>
            {!isNew && <button className="btn" style={{ color: "var(--red)", border: "1px solid var(--red-dim)", background: "var(--red-dim)" }} onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8" style={{ marginLeft: "auto" }}>
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
