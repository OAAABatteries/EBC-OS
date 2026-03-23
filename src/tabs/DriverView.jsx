import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Calendar } from "lucide-react";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";

// ═══════════════════════════════════════════════════════════════
//  Driver View — Delivery Route Map + Queue Management
//  Route optimization with drag-and-drop reorder
// ═══════════════════════════════════════════════════════════════

const DRIVER_SESSION_KEY = "ebc_activeDriver";
const DELIVERY_SCHEDULE_KEY = "ebc_deliverySchedules";

// Simple distance calc (Haversine) for route optimization
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor route optimization
function optimizeRoute(stops, startLat, startLng) {
  if (stops.length <= 1) return stops;
  const remaining = [...stops];
  const ordered = [];
  let curLat = startLat || 29.7604; // default Houston
  let curLng = startLng || -95.3698;

  while (remaining.length > 0) {
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(curLat, curLng, remaining[i].lat || 29.76, remaining[i].lng || -95.37);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    }
    const stop = remaining.splice(nearest, 1)[0];
    ordered.push({ ...stop, distFromPrev: nearestDist });
    curLat = stop.lat || 29.76;
    curLng = stop.lng || -95.37;
  }
  return ordered;
}

export function DriverView({ app }) {
  const {
    employees, projects, materialRequests, setMaterialRequests, theme, setTheme, show
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;

  // ── session ──
  const mainAuth = app.auth;
  const [activeDriver, setActiveDriver] = useState(() => {
    if (mainAuth && mainAuth.role === "driver") {
      return { id: mainAuth.id, name: mainAuth.name, email: mainAuth.email, role: "Driver", title: mainAuth.title, phone: "", notifications: { schedule: true, materials: true, deliveries: true } };
    }
    try {
      const saved = localStorage.getItem(DRIVER_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [driverTab, setDriverTab] = useState("route");
  const [driverLat, setDriverLat] = useState(null);
  const [driverLng, setDriverLng] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [deliverySchedules, setDeliverySchedules] = useState(() => {
    try {
      const saved = localStorage.getItem(DELIVERY_SCHEDULE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // ── persist ──
  useEffect(() => {
    if (activeDriver) localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(activeDriver));
    else localStorage.removeItem(DRIVER_SESSION_KEY);
  }, [activeDriver]);

  useEffect(() => {
    localStorage.setItem(DELIVERY_SCHEDULE_KEY, JSON.stringify(deliverySchedules));
  }, [deliverySchedules]);

  const setScheduleDate = (reqId, date) => {
    setDeliverySchedules(prev => ({ ...prev, [reqId]: date }));
  };

  // ── GPS ──
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setDriverLat(pos.coords.latitude); setDriverLng(pos.coords.longitude); },
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  // ── login ──
  const handleLogin = async () => {
    setLoginError("");
    const { verifyPassword } = await import("../utils/passwordHash");
    let emp = null;
    for (const e of employees) {
      if (e.email === email.trim().toLowerCase() && e.active && e.role === "Driver") {
        if (await verifyPassword(password, e.password)) { emp = e; break; }
      }
    }
    if (emp) { setActiveDriver(emp); setEmail(""); setPassword(""); }
    else setLoginError(t("Invalid credentials"));
  };

  const handleLogout = () => {
    setActiveDriver(null); setEmail(""); setPassword(""); setDriverTab("route");
    if (app.onLogout) app.onLogout();
  };

  // ── delivery lists ──
  const queueItems = useMemo(() => materialRequests.filter(r => r.status === "approved"), [materialRequests]);
  const inTransitItems = useMemo(() => materialRequests.filter(r => r.status === "in-transit" && r.driverId === activeDriver?.id), [materialRequests, activeDriver]);
  const todayDelivered = useMemo(() => {
    const today = new Date().toDateString();
    return materialRequests.filter(r => r.status === "delivered" && r.driverId === activeDriver?.id && r.deliveredAt && new Date(r.deliveredAt).toDateString() === today);
  }, [materialRequests, activeDriver]);

  // ── all active stops (queue + in-transit) with project data ──
  const [manualOrder, setManualOrder] = useState(null);

  const allStops = useMemo(() => {
    const items = [...inTransitItems, ...queueItems];
    const stops = items.map(req => {
      const proj = projects.find(p => String(p.id) === String(req.projectId));
      return {
        ...req,
        address: proj?.address || "",
        lat: proj?.lat || null,
        lng: proj?.lng || null,
        projectName: req.projectName || proj?.name || "Unknown",
        isInTransit: req.status === "in-transit",
      };
    });
    return stops;
  }, [queueItems, inTransitItems, projects]);

  // Optimized route
  const optimizedStops = useMemo(() => {
    if (manualOrder) return manualOrder;
    return optimizeRoute(allStops, driverLat, driverLng);
  }, [allStops, driverLat, driverLng, manualOrder]);

  // Total distance
  const totalDistance = useMemo(() =>
    optimizedStops.reduce((s, stop) => s + (stop.distFromPrev || 0), 0),
    [optimizedStops]
  );

  // ── drag and drop ──
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); };
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const items = [...optimizedStops];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    setManualOrder(items);
    setDragIdx(null);
  };

  // ── actions ──
  const handleStartDelivery = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "in-transit", driverId: activeDriver.id } : r
    ));
    show(t("Delivery started") + " ✓", "ok");
  };

  const handleMarkDelivered = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "delivered", deliveredAt: new Date().toISOString() } : r
    ));
    setManualOrder(null); // recalculate route
    show(t("Delivered") + " ✓", "ok");
  };

  // ── Google Maps multi-stop URL ──
  const getMultiStopNavUrl = () => {
    const stops = optimizedStops.filter(s => s.lat && s.lng);
    if (stops.length === 0) return null;
    if (stops.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${stops[0].lat},${stops[0].lng}`;
    }
    const dest = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).map(s => `${s.lat},${s.lng}`).join("|");
    let url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&waypoints=${waypoints}`;
    if (driverLat && driverLng) url += `&origin=${driverLat},${driverLng}`;
    return url;
  };

  const getNavLink = (stop) => {
    if (!stop.lat || !stop.lng) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
  };

  // ── format helpers ──
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  const handleNotificationToggle = (key) => {
    setActiveDriver({ ...activeDriver, notifications: { ...activeDriver.notifications, [key]: !activeDriver.notifications?.[key] } });
  };
  const getInitials = (name) => name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  // ═══ LOGIN ═══
  if (!activeDriver) {
    return (
      <div className="employee-app">
        <header className="employee-header">
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/ebc-eagle-white.png" alt="EBC" style={{ height: 28, width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /></div>
          <span className="text-sm text-muted">{t("Driver Portal")}</span>
        </header>
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted" style={{ textAlign: "center", marginTop: -12 }}>{t("Driver Portal")}</div>
            <div className="login-form">
              <input type="email" className="login-input" placeholder={t("Email")} value={email}
                onChange={e => { setEmail(e.target.value); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <input type="password" className="login-input" placeholder={t("Password")} value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              {loginError && <div className="login-error">{loginError}</div>}
              <button className="login-btn" onClick={handleLogin}>{t("Sign In")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MAIN DRIVER VIEW ═══
  const driverTabs = [
    { key: "route", label: `🗺️ ${t("Route")}`, count: optimizedStops.length },
    { key: "completed", label: t("Completed"), count: todayDelivered.length },
    { key: "settings", label: "⚙️" },
  ];

  return (
    <div className="employee-app">
      <header className="employee-header">
        <div>
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/ebc-eagle-white.png" alt="EBC" style={{ height: 28, width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /></div>
          <span className="text-xs text-muted">{activeDriver.name} · {t("Deliveries")}</span>
        </div>
        <button className="settings-gear" onClick={() => setDriverTab("settings")} title={t("Settings")}>&#9881;</button>
      </header>

      <div className="employee-body">
        <div className="emp-tabs">
          {driverTabs.map((tab) => (
            <button key={tab.key} className={`emp-tab${driverTab === tab.key ? " active" : ""}`} onClick={() => setDriverTab(tab.key)}>
              {tab.label}
              {tab.count > 0 && <span className="driver-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* ═══ ROUTE TAB — Map + Sorted Stops ═══ */}
        {driverTab === "route" && (
          <div className="emp-content">
            {/* Route summary bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div className="foreman-kpi-card" style={{ flex: 1, minWidth: 80, padding: "10px 12px" }}>
                <div className="foreman-kpi-label">{t("Stops")}</div>
                <div className="foreman-kpi-value" style={{ fontSize: 22 }}>{optimizedStops.length}</div>
              </div>
              <div className="foreman-kpi-card" style={{ flex: 1, minWidth: 80, padding: "10px 12px" }}>
                <div className="foreman-kpi-label">{t("In Transit")}</div>
                <div className="foreman-kpi-value" style={{ fontSize: 22, color: "var(--amber)" }}>{inTransitItems.length}</div>
              </div>
              <div className="foreman-kpi-card" style={{ flex: 1, minWidth: 80, padding: "10px 12px" }}>
                <div className="foreman-kpi-label">{t("Done Today")}</div>
                <div className="foreman-kpi-value" style={{ fontSize: 22, color: "var(--green)" }}>{todayDelivered.length}</div>
              </div>
              {totalDistance > 0 && (
                <div className="foreman-kpi-card" style={{ flex: 1, minWidth: 80, padding: "10px 12px" }}>
                  <div className="foreman-kpi-label">{t("Est. Miles")}</div>
                  <div className="foreman-kpi-value" style={{ fontSize: 22 }}>{totalDistance.toFixed(1)}</div>
                </div>
              )}
            </div>

            {/* Navigate All button */}
            {optimizedStops.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {getMultiStopNavUrl() && (
                  <a href={getMultiStopNavUrl()} target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary" style={{ display: "block", textAlign: "center", padding: "14px 20px", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                    🧭 {t("Navigate Full Route")}
                  </a>
                )}
                <div className="text-xs text-muted" style={{ textAlign: "center", marginTop: 6 }}>
                  {t("Drag stops to reorder")} · {t("Opens Google Maps with all stops")}
                </div>
              </div>
            )}

            {/* Stop list — draggable */}
            {optimizedStops.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 20px" }}>
                <div className="empty-icon">📦</div>
                <div className="empty-text">{t("No deliveries in queue")}</div>
                <div className="text-xs text-muted" style={{ marginTop: 8 }}>{t("Approved material requests will appear here")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {optimizedStops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className="driver-queue-card"
                    style={{
                      borderLeft: stop.isInTransit ? "4px solid var(--amber)" : "4px solid var(--accent)",
                      cursor: "grab",
                      opacity: dragIdx === idx ? 0.5 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {/* Stop number + drag handle */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: stop.isInTransit ? "var(--amber)" : "var(--accent)",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="text-sm font-bold" style={{ color: "var(--amber)" }}>{stop.projectName}</div>
                        {stop.address && <div className="text-xs text-muted">{stop.address}</div>}
                      </div>
                      <div style={{ fontSize: 18, color: "var(--text3)", cursor: "grab", padding: "0 4px" }}>⠿</div>
                    </div>

                    {/* Material info */}
                    <div style={{ marginLeft: 42 }}>
                      <div className="flex-between mb-4">
                        <span className="text-sm font-semi">{stop.material}</span>
                        <span className="text-sm font-mono">{stop.qty} {stop.unit}</span>
                      </div>
                      <div className="text-xs text-muted mb-8">
                        {t("Requester")}: {stop.employeeName}
                        {stop.distFromPrev ? ` · ~${stop.distFromPrev.toFixed(1)} mi` : ""}
                      </div>
                      {stop.notes && <div className="text-xs text-dim mb-8">{stop.notes}</div>}

                      {/* Delivery schedule */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Calendar size={13} style={{ color: "var(--text3)", flexShrink: 0 }} />
                        <label className="text-xs" style={{ color: "var(--text2)", minWidth: 48 }}>Scheduled:</label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ flex: 1, fontSize: 12, padding: "3px 8px", height: "auto" }}
                          value={deliverySchedules[stop.id] || ""}
                          onChange={e => setScheduleDate(stop.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                        {deliverySchedules[stop.id] && (
                          <button
                            className="btn-icon"
                            style={{ fontSize: 11, color: "var(--text3)" }}
                            onClick={e => { e.stopPropagation(); setScheduleDate(stop.id, ""); }}
                            title="Clear date"
                          >✕</button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-8">
                        {!stop.isInTransit ? (
                          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleStartDelivery(stop.id)}>
                            🚛 {t("Start Delivery")}
                          </button>
                        ) : (
                          <button className="btn btn-sm" style={{ flex: 1, background: "var(--green)", color: "#fff" }} onClick={() => handleMarkDelivered(stop.id)}>
                            ✅ {t("Mark Delivered")}
                          </button>
                        )}
                        {getNavLink(stop) && (
                          <a href={getNavLink(stop)} target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            📍 {t("Navigate")}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Optimize button */}
            {manualOrder && optimizedStops.length > 1 && (
              <button className="btn btn-ghost" style={{ marginTop: 12, width: "100%" }}
                onClick={() => setManualOrder(null)}>
                🔄 {t("Re-optimize Route")}
              </button>
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
                    <div className="text-xs text-dim">{t("Delivered")} {fmtTime(req.deliveredAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {driverTab === "settings" && (
          <div className="settings-wrap">
            {/* Back button */}
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setDriverTab("queue")}>&#9664; {t("Back")}</button>
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeDriver.name)}</div>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div className="text-md font-semi">{activeDriver.name}</div>
                <div className="text-xs text-muted">{activeDriver.role}</div>
                <div className="text-xs text-dim">{activeDriver.email}</div>
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">{t("Appearance")}</div>
              <div className="theme-card-grid">
                {Object.entries(THEMES).map(([key, th]) => (
                  <div key={key} className={`theme-card${theme === key ? " active" : ""}`} onClick={() => setTheme(key)}>
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
            <div className="settings-section">
              <div className="settings-section-title">{t("Notifications")}</div>
              {["schedule", "materials", "deliveries"].map(key => (
                <div key={key} className="settings-row">
                  <span className="settings-label">{t(key.charAt(0).toUpperCase() + key.slice(1) + " updates")}</span>
                  <div className={`settings-toggle${activeDriver.notifications?.[key] ? " on" : ""}`}
                    onClick={() => handleNotificationToggle(key)} />
                </div>
              ))}
            </div>
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
