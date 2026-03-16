import { useState, useEffect, useMemo } from "react";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import {
  PPE_ITEMS, RISK_LIKELIHOOD, RISK_SEVERITY, riskColor,
  HAZARD_CATEGORIES, CONTROL_HIERARCHY, PERMIT_TYPES,
  HAZARD_LIBRARY, TRADE_LABELS, JSA_TEMPLATES, WEATHER_HAZARD_MAP,
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
    employees, projects, crewSchedule, timeEntries, setTimeEntries,
    materialRequests, setMaterialRequests,
    changeOrders, rfis, submittals,
    jsas, setJsas,
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
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [clockEntry, setClockEntry] = useState(null); // { clockIn, lat, lng, projectId }
  const [gpsStatus, setGpsStatus] = useState("");
  const [clockProjectSearch, setClockProjectSearch] = useState("");
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

  // ── persist session ──
  useEffect(() => {
    if (activeForeman) {
      localStorage.setItem(FOREMAN_SESSION_KEY, JSON.stringify(activeForeman));
    } else {
      localStorage.removeItem(FOREMAN_SESSION_KEY);
    }
  }, [activeForeman]);

  // ── login handler ──
  const handleLogin = () => {
    setLoginError("");
    const emp = employees.find(
      e => e.email === email.trim().toLowerCase() && e.password === password && e.active && e.role === "Foreman"
    );
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
    const totalHours = +(totalMs / 3600000).toFixed(2);
    const newEntry = {
      id: Date.now(),
      employeeId: activeForeman.id,
      projectId: clockEntry.projectId || selectedProjectId,
      clockIn: clockEntry.clockIn,
      clockInLat: clockEntry.lat,
      clockInLng: clockEntry.lng,
      clockOut: new Date().toISOString(),
      clockOutLat: loc?.lat || null,
      clockOutLng: loc?.lng || null,
      totalHours,
    };
    // Add to timeEntries
    if (setTimeEntries) {
      setTimeEntries(prev => [...prev, newEntry]);
    }
    setClockEntry(null);
    localStorage.removeItem(CLOCK_KEY);
    show?.(`${t("Clocked out")} · ${totalHours}h ✓`);
  };

  // ── today's time entries for this foreman ──
  const todayStr = new Date().toDateString();
  const myTodayEntries = useMemo(() =>
    timeEntries.filter(te => te.employeeId === activeForeman?.id && new Date(te.clockIn).toDateString() === todayStr && te.totalHours),
    [timeEntries, activeForeman, todayStr]
  );
  const myTodayHours = myTodayEntries.reduce((s, e) => s + (e.totalHours || 0), 0);

  // ── computed: my projects ──
  const weekStart = useMemo(() => getWeekStart(), []);

  const myProjects = useMemo(() => {
    if (!activeForeman) return [];
    const mySchedule = crewSchedule.filter(
      s => s.employeeId === activeForeman.id && s.weekStart === weekStart
    );
    const projectIds = [...new Set(mySchedule.map(s => s.projectId))];
    return projects.filter(p => projectIds.includes(p.id));
  }, [activeForeman, crewSchedule, projects, weekStart]);

  // auto-select first project
  useEffect(() => {
    if (myProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(myProjects[0].id);
    }
  }, [myProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  // ── computed: crew for selected project ──
  const crewForProject = useMemo(() => {
    if (!selectedProjectId) return [];
    const entries = crewSchedule.filter(
      s => s.projectId === selectedProjectId && s.weekStart === weekStart
    );
    return entries.map(s => {
      const emp = employees.find(e => e.id === s.employeeId);
      if (!emp) return null;
      const today = new Date().toDateString();
      const empEntries = timeEntries.filter(te => te.employeeId === emp.id && te.projectId === selectedProjectId);
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
    return materialRequests.filter(r => r.projectId === selectedProjectId);
  }, [materialRequests, selectedProjectId]);

  // ── computed: documents for project ──
  const projectSubmittals = useMemo(() => {
    if (!selectedProjectId) return [];
    return (submittals || []).filter(s => s.projectId === selectedProjectId);
  }, [submittals, selectedProjectId]);

  const projectCOs = useMemo(() => {
    if (!selectedProjectId) return [];
    return (changeOrders || []).filter(c => c.projectId === selectedProjectId);
  }, [changeOrders, selectedProjectId]);

  const projectRFIs = useMemo(() => {
    if (!selectedProjectId) return [];
    return (rfis || []).filter(r => r.projectId === selectedProjectId);
  }, [rfis, selectedProjectId]);

  // weekly burn rate in hours: sum of scheduled hours per crew member this week
  const weeklyBurnHours = useMemo(() => {
    return crewForProject.reduce((sum, c) => {
      const daysThisWeek = DAY_KEYS.filter(d => c.days?.[d]).length;
      const dailyHours = c.scheduleHours
        ? (parseFloat(c.scheduleHours.end) - parseFloat(c.scheduleHours.start))
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
    const proj = projects.find(p => p.id === selectedProjectId);
    const newReq = {
      id: "mr_" + Date.now(),
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
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/eagle.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", background: "transparent" }} onError={(e) => e.target.style.display = "none"} />EBC-OS</div>
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
    { key: "clock", label: isClockedIn ? `🟢 ${t("Clock")}` : t("Clock") },
    { key: "dashboard", label: t("Dashboard") },
    { key: "crew", label: t("Crew"), count: crewForProject.length },
    { key: "hours", label: t("Hours") },
    { key: "jsa", label: t("JSA"), count: activeJsaCount },
    { key: "materials", label: t("Materials"), count: projectMatRequests.filter(r => r.status === "requested").length },
    { key: "documents", label: t("Documents") },
    { key: "settings", label: t("Settings") },
  ];

  return (
    <div className="employee-app">
      <header className="employee-header">
        <div>
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/eagle.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", background: "transparent" }} onError={(e) => e.target.style.display = "none"} />EBC-OS</div>
          <span className="text-xs text-muted">{activeForeman.name} · {t("Foreman Portal")}</span>
        </div>
        <button className="settings-gear" onClick={() => setForemanTab("settings")} title={t("Settings")}>
          &#9881;
        </button>
      </header>

      <div className="employee-body">
        {/* ── Project selector ── */}
        {myProjects.length > 1 && (
          <select
            className="foreman-project-select"
            value={selectedProjectId || ""}
            onChange={e => setSelectedProjectId(Number(e.target.value))}
          >
            {myProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {myProjects.length === 0 && foremanTab !== "settings" && (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-icon">📋</div>
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
                        <div className="text-sm font-semi" style={{ textAlign: "center", marginTop: 10, color: "var(--accent)" }}>
                          📍 {selectedProject.name}
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
                      <span style={{ fontSize: 40 }}>⏱️</span>
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
                        <span style={{ fontSize: 40 }}>🛑</span>
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
                </div>
              </div>
            )}

            {/* ═══ DASHBOARD TAB ═══ */}
            {foremanTab === "dashboard" && (
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

                <div className="foreman-kpi-card">
                  <div className="foreman-kpi-label">{t("Progress")}</div>
                  <div className="project-progress-bar" style={{ marginTop: 8 }}>
                    <div className="project-progress-fill"
                      style={{ width: `${selectedProject.progress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ CREW TAB ═══ */}
            {foremanTab === "crew" && (
              <div className="emp-content">
                <div className="section-header">
                  <div className="section-title" style={{ fontSize: 16 }}>{t("Crew Members")}</div>
                </div>
                {crewForProject.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 20px" }}>
                    <div className="empty-icon">👷</div>
                    <div className="empty-text">{t("No crew assigned")}</div>
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
                  </div>
                )}
              </div>
            )}

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
                    <div className="empty-icon">📦</div>
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
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setJsaForm(f => ({ ...f, projectId: String(selectedProjectId || ""), supervisor: activeForeman.name, competentPerson: activeForeman.name }));
                        setJsaView("create");
                      }}>{t("+ New JSA")}</button>
                    </div>

                    {myJsas.length === 0 ? (
                      <div className="empty-state" style={{ padding: "30px 20px" }}>
                        <div className="empty-icon">🛡️</div>
                        <div className="empty-text">{t("No JSAs yet. Create one for today's work.")}</div>
                      </div>
                    ) : myJsas.sort((a, b) => b.date.localeCompare(a.date)).map(j => {
                      const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
                      const rc = riskColor(maxRisk);
                      const statusClr = j.status === "active" ? "#10b981" : j.status === "draft" ? "#f59e0b" : "var(--text3)";
                      const proj = projects.find(p => p.id === j.projectId);
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
                      id: "jsa_" + Date.now(),
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
                          ⚠️ {lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
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
                  <div className="project-section-header" onClick={() => toggleSection("rfis")}>
                    <span>{t("RFIs")} ({projectRFIs.length})</span>
                    <span>{openSections.rfis ? "▾" : "▸"}</span>
                  </div>
                  {openSections.rfis && (
                    projectRFIs.length === 0
                      ? <div className="text-xs text-muted" style={{ padding: "8px 0" }}>{t("No RFIs")}</div>
                      : projectRFIs.map(r => (
                        <div key={r.id} className="card" style={{ padding: 10, marginTop: 6 }}>
                          <div className="flex-between">
                            <span className="text-sm font-semi">{r.title || r.question}</span>
                            <span className={`badge ${r.status === "answered" ? "badge-green" : "badge-amber"}`}>{r.status}</span>
                          </div>
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
    </div>
  );
}
