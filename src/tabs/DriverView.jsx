import { useState, useEffect, useMemo } from "react";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";

// ═══════════════════════════════════════════════════════════════
//  Driver View — Delivery management portal
//  Email/password login (Driver role only) → Queue / In Transit / Completed / Settings
// ═══════════════════════════════════════════════════════════════

const DRIVER_SESSION_KEY = "ebc_activeDriver";

export function DriverView({ app }) {
  const {
    employees, projects, materialRequests, setMaterialRequests, theme, setTheme, show
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;

  // ── session — use main auth if available (logged in via main login screen) ──
  const mainAuth = app.auth;
  const [activeDriver, setActiveDriver] = useState(() => {
    // If already authenticated through the main app login, use that
    if (mainAuth && mainAuth.role === "driver") {
      return { id: mainAuth.id, name: mainAuth.name, email: mainAuth.email, role: "Driver", title: mainAuth.title, phone: "", notifications: { schedule: true, materials: true, deliveries: true } };
    }
    try {
      const saved = localStorage.getItem(DRIVER_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ── login form state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [driverTab, setDriverTab] = useState("queue");

  // ── persist session ──
  useEffect(() => {
    if (activeDriver) {
      localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(activeDriver));
    } else {
      localStorage.removeItem(DRIVER_SESSION_KEY);
    }
  }, [activeDriver]);

  // ── login handler ──
  const handleLogin = () => {
    setLoginError("");
    const emp = employees.find(
      e => e.email === email.trim().toLowerCase() && e.password === password && e.active && e.role === "Driver"
    );
    if (emp) {
      setActiveDriver(emp);
      setEmail("");
      setPassword("");
    } else {
      setLoginError(t("Invalid credentials"));
    }
  };

  const handleLogout = () => {
    setActiveDriver(null);
    setEmail("");
    setPassword("");
    setDriverTab("queue");
    // If logged in via main app, use main logout
    if (app.onLogout) app.onLogout();
  };

  // ── delivery lists ──
  const queueItems = useMemo(
    () => materialRequests.filter(r => r.status === "approved"),
    [materialRequests]
  );

  const inTransitItems = useMemo(
    () => materialRequests.filter(r => r.status === "in-transit" && r.driverId === activeDriver?.id),
    [materialRequests, activeDriver]
  );

  const todayDelivered = useMemo(() => {
    const today = new Date().toDateString();
    return materialRequests.filter(
      r => r.status === "delivered" && r.driverId === activeDriver?.id &&
        r.deliveredAt && new Date(r.deliveredAt).toDateString() === today
    );
  }, [materialRequests, activeDriver]);

  const pendingCount = queueItems.length;

  // ── actions ──
  const handleStartDelivery = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "in-transit", driverId: activeDriver.id } : r
    ));
    show(t("Start Delivery"), "ok");
  };

  const handleMarkDelivered = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "delivered", deliveredAt: new Date().toISOString() } : r
    ));
    show(t("Delivered"), "ok");
  };

  // ── format helpers ──
  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  // ── get project nav link ──
  const getNavLink = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj?.lat || !proj?.lng) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${proj.lat},${proj.lng}`;
  };

  const getProjectAddress = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    return proj?.address || "";
  };

  // ── notification toggle helper ──
  const handleNotificationToggle = (key) => {
    const updated = { ...activeDriver, notifications: { ...activeDriver.notifications, [key]: !activeDriver.notifications?.[key] } };
    setActiveDriver(updated);
  };

  // ── initials for avatar ──
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!activeDriver) {
    return (
      <div className="employee-app">
        <header className="employee-header">
          <div className="employee-logo">EBC-OS</div>
          <span className="text-sm text-muted">{t("Driver Portal")}</span>
        </header>
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted" style={{ textAlign: "center", marginTop: -12 }}>{t("Driver Portal")}</div>
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
  //  MAIN DRIVER VIEW (logged in)
  // ═══════════════════════════════════════════════════════════════
  const driverTabs = [
    { key: "queue", label: t("Queue"), count: pendingCount },
    { key: "transit", label: t("In Transit"), count: inTransitItems.length },
    { key: "completed", label: t("Completed") },
    { key: "settings", label: t("Settings") },
  ];

  return (
    <div className="employee-app">
      <header className="employee-header">
        <div>
          <div className="employee-logo">EBC-OS</div>
          <span className="text-xs text-muted">{activeDriver.name} · {activeDriver.role}</span>
        </div>
        <button className="settings-gear" onClick={() => setDriverTab("settings")} title={t("Settings")}>
          &#9881;
        </button>
      </header>

      <div className="employee-body">
        <div className="emp-tabs">
          {driverTabs.map((tab) => (
            <button
              key={tab.key}
              className={`emp-tab${driverTab === tab.key ? " active" : ""}`}
              onClick={() => setDriverTab(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && <span className="driver-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* ═══ QUEUE TAB ═══ */}
        {driverTab === "queue" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 16 }}>{t("Delivery Queue")}</div>
            </div>
            {queueItems.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 20px" }}>
                <div className="empty-icon">📦</div>
                <div className="empty-text">{t("No pending deliveries")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {queueItems.map(req => {
                  const navLink = getNavLink(req.projectId);
                  const address = getProjectAddress(req.projectId);
                  return (
                    <div key={req.id} className="driver-queue-card">
                      <div className="text-sm font-bold text-amber mb-4">{req.projectName}</div>
                      {address && <div className="text-xs text-muted mb-8">{address}</div>}
                      <div className="flex-between mb-4">
                        <span className="text-sm font-semi">{req.material}</span>
                        <span className="text-sm font-mono">{req.qty} {req.unit}</span>
                      </div>
                      <div className="text-xs text-muted mb-8">
                        {t("Requester")}: {req.employeeName} · {fmtDate(req.requestedAt)}
                      </div>
                      {req.notes && <div className="text-xs text-dim mb-8">{req.notes}</div>}
                      <div className="flex gap-8">
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => handleStartDelivery(req.id)}
                        >
                          {t("Start Delivery")}
                        </button>
                        {navLink && (
                          <a
                            href={navLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="driver-nav-link"
                          >
                            {t("Navigate")} →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ IN TRANSIT TAB ═══ */}
        {driverTab === "transit" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 16 }}>{t("In Transit")}</div>
            </div>
            {inTransitItems.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 20px" }}>
                <div className="empty-icon">🚛</div>
                <div className="empty-text">{t("No active deliveries")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {inTransitItems.map(req => {
                  const navLink = getNavLink(req.projectId);
                  const address = getProjectAddress(req.projectId);
                  return (
                    <div key={req.id} className="driver-queue-card" style={{ borderColor: "var(--amber)" }}>
                      <div className="text-sm font-bold text-amber mb-4">{req.projectName}</div>
                      {address && <div className="text-xs text-muted mb-8">{address}</div>}
                      <div className="flex-between mb-4">
                        <span className="text-sm font-semi">{req.material}</span>
                        <span className="text-sm font-mono">{req.qty} {req.unit}</span>
                      </div>
                      <div className="text-xs text-muted mb-8">
                        {t("Requester")}: {req.employeeName}
                      </div>
                      <div className="flex gap-8">
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                          onClick={() => handleMarkDelivered(req.id)}
                        >
                          {t("Mark Delivered")}
                        </button>
                        {navLink && (
                          <a
                            href={navLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="driver-nav-link"
                          >
                            {t("Navigate")} →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ COMPLETED TAB ═══ */}
        {driverTab === "completed" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 16 }}>{t("Today's Deliveries")}</div>
            </div>
            {todayDelivered.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 20px" }}>
                <div className="empty-icon">✅</div>
                <div className="empty-text">{t("No deliveries completed today")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayDelivered.map(req => (
                  <div key={req.id} className="card" style={{ padding: 14 }}>
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className="badge badge-green">{t("Delivered")}</span>
                    </div>
                    <div className="text-xs text-muted mb-4">{req.projectName} — {req.qty} {req.unit}</div>
                    <div className="text-xs text-dim">
                      {t("Delivered")} {fmtTime(req.deliveredAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {driverTab === "settings" && (
          <div className="settings-wrap">
            {/* Profile */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeDriver.name)}</div>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div className="text-md font-semi">{activeDriver.name}</div>
                <div className="text-xs text-muted">{activeDriver.role} · {activeDriver.phone}</div>
                <div className="text-xs text-dim">{activeDriver.email}</div>
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
                <div className={`settings-toggle${activeDriver.notifications?.schedule ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("schedule")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Material updates")}</span>
                <div className={`settings-toggle${activeDriver.notifications?.materials ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("materials")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Delivery updates")}</span>
                <div className={`settings-toggle${activeDriver.notifications?.deliveries ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("deliveries")} />
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
    </div>
  );
}
