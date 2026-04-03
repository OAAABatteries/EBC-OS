import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Calendar, Settings, Navigation, Package, Truck, CheckCircle, MapPin, RefreshCw } from "lucide-react";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import { PortalHeader, PortalTabBar, FieldCard, FieldButton, EmptyState, StatusBadge, Skeleton } from "../components/field";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

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

  // ── network status ──
  const network = useNetworkStatus();

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
  const [initialLoading, setInitialLoading] = useState(true);
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

  // ── initial load skeleton ──
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 600);
    return () => clearTimeout(timer);
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

  // ── delivery lists (Phase 2A: driver route = "assigned" status instead of "approved") ──
  const queueItems = useMemo(() => materialRequests.filter(r =>
    r.status === "approved" || r.status === "assigned"  // backward compat: old "approved" + new "assigned"
  ), [materialRequests]);
  const inTransitItems = useMemo(() => materialRequests.filter(r =>
    (r.status === "in-transit" || r.status === "picked_up") && r.driverId === activeDriver?.id
  ), [materialRequests, activeDriver]);
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

  // ── desktop drag and drop ──
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

  // ── touch drag-and-drop (D-03) ──
  const [heldIdx, setHeldIdx] = useState(null);
  const holdTimerRef = useRef(null);
  const touchStartY = useRef(null);
  const touchCurrentIdx = useRef(null);
  const rafRef = useRef(null);

  const handleTouchStart = useCallback((e, idx) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentIdx.current = idx;
    holdTimerRef.current = setTimeout(() => {
      setHeldIdx(idx);
      setDragIdx(idx);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400); // 400ms long-press threshold
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (heldIdx === null) {
      // Not in drag mode — cancel hold if finger moved more than 10px
      if (holdTimerRef.current && touchStartY.current !== null) {
        const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
        if (dy > 10) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
      }
      return;
    }

    // Only prevent scroll when dragging significantly vertically (>20px threshold per review feedback)
    if (touchStartY.current !== null) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (dy > 20) {
        e.preventDefault();
      }
    }

    // Throttle to ~60fps via requestAnimationFrame (review feedback — prevents jank on low-end phones)
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const touch = e.touches[0];
      if (!touch) return;
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const cardEl = elements.find(el => el.closest('[data-stop-idx]'));
      if (cardEl) {
        const targetIdx = parseInt(cardEl.closest('[data-stop-idx]').dataset.stopIdx, 10);
        if (!isNaN(targetIdx) && targetIdx !== touchCurrentIdx.current) {
          // Reorder in real-time
          const items = [...optimizedStops];
          const [moved] = items.splice(touchCurrentIdx.current, 1);
          items.splice(targetIdx, 0, moved);
          setManualOrder(items);
          touchCurrentIdx.current = targetIdx;
        }
      }
    });
  }, [heldIdx, optimizedStops]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHeldIdx(null);
    setDragIdx(null);
    touchStartY.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── actions (Phase 2A: audit trail on status changes) ──
  const handleStartDelivery = (reqId) => {
    const now = new Date().toISOString();
    setMaterialRequests(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const trail = [...(r.auditTrail || []), { action: "picked_up", actor: activeDriver?.name || "Driver", actorId: activeDriver?.id, timestamp: now }];
      return { ...r, status: "picked_up", driverId: activeDriver.id, auditTrail: trail };
    }));
    show(t("Delivery started") + " ✓", "ok");
  };

  const handleMarkDelivered = (reqId) => {
    const now = new Date().toISOString();
    setMaterialRequests(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const trail = [...(r.auditTrail || []), { action: "delivered", actor: activeDriver?.name || "Driver", actorId: activeDriver?.id, timestamp: now }];
      return { ...r, status: "delivered", deliveredAt: now, auditTrail: trail };
    }));
    setManualOrder(null);
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

  // ── skeleton placeholders ──
  const routeCardSkeleton = (
    <div className="driver-route-list">
      {[1, 2, 3].map(i => (
        <FieldCard key={i} className="driver-route-card">
          <div className="flex-between mb-4">
            <Skeleton width="60%" height="var(--text-sm)" />
            <Skeleton width="48px" height="var(--text-sm)" />
          </div>
          <Skeleton width="80%" height="var(--text-xs)" className="mb-4" />
          <Skeleton width="40%" height="var(--text-xs)" />
        </FieldCard>
      ))}
    </div>
  );

  const completedCardSkeleton = (
    <div className="driver-route-list">
      {[1, 2].map(i => (
        <FieldCard key={i} className="driver-completed-card">
          <div className="flex-between mb-4">
            <Skeleton width="50%" height="var(--text-sm)" />
            <Skeleton width="64px" height="20px" />
          </div>
          <Skeleton width="70%" height="var(--text-xs)" className="mb-4" />
          <Skeleton width="35%" height="var(--text-xs)" />
        </FieldCard>
      ))}
    </div>
  );

  // ── Tab definitions (D-05) ──
  const driverTabDefs = [
    { id: "route", label: "Route", icon: Navigation, badge: optimizedStops.length > 0 },
    { id: "completed", label: "Completed", icon: CheckCircle, badge: todayDelivered.length > 0 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // ═══ LOGIN ═══
  if (!activeDriver) {
    return (
      <div className="employee-app">
        <PortalHeader variant="driver" t={t} />
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted driver-login-subtitle">{t("Driver Portal")}</div>
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
  return (
    <div className="employee-app">
      <PortalHeader
        variant="driver"
        userName={`${activeDriver.name} \u00B7 ${t("Deliveries")}`}
        t={t}
        network={network}
      />

      <div className="employee-body driver-content-pad">

        {/* ═══ ROUTE TAB — Map + Sorted Stops ═══ */}
        {driverTab === "route" && (
          <div className="emp-content">
            {/* KPI summary bar (D-06) */}
            <div className="driver-kpi-grid">
              <div className="driver-kpi-tile">
                <div className="driver-kpi-label">{t("Stops")}</div>
                <div className="driver-kpi-value">{optimizedStops.length}</div>
              </div>
              <div className="driver-kpi-tile">
                <div className="driver-kpi-label">{t("In Transit")}</div>
                <div className="driver-kpi-value driver-kpi-value--amber">{inTransitItems.length}</div>
              </div>
              <div className="driver-kpi-tile">
                <div className="driver-kpi-label">{t("Done Today")}</div>
                <div className="driver-kpi-value driver-kpi-value--green">{todayDelivered.length}</div>
              </div>
              {totalDistance > 0 && (
                <div className="driver-kpi-tile">
                  <div className="driver-kpi-label">{t("Est. Miles")}</div>
                  <div className="driver-kpi-value">{totalDistance.toFixed(1)}</div>
                </div>
              )}
            </div>

            {/* Navigate All CTA */}
            {optimizedStops.length > 0 && (
              <div className="mb-4">
                {getMultiStopNavUrl() && (
                  <a href={getMultiStopNavUrl()} target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary driver-nav-cta touch-target">
                    <Navigation size={16} aria-hidden="true" /> {t("Navigate Full Route")}
                  </a>
                )}
                <div className="text-xs text-muted driver-nav-cta-hint">
                  {t("Drag stops to reorder")} &middot; {t("Opens Google Maps with all stops")}
                </div>
              </div>
            )}

            {/* Stop list — draggable (DRVR-03, D-03) */}
            {initialLoading ? routeCardSkeleton : (
              optimizedStops.length === 0 ? (
                <EmptyState
                  icon={Package}
                  heading={t("No deliveries in queue")}
                  message={t("Approved material requests will appear here")}
                  t={t}
                />
              ) : (
              <div className="driver-route-list">
                {optimizedStops.map((stop, idx) => (
                  <FieldCard
                    key={stop.id}
                    data-stop-idx={idx}
                    className={`driver-route-card${stop.isInTransit ? " driver-route-card--in-transit" : ""}${dragIdx === idx ? " driver-route-card--dragging" : ""}${heldIdx === idx ? " driver-route-card--held" : ""}`}
                    onTouchStart={(e) => handleTouchStart(e, idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    draggable
                  >
                    {/* Stop number + project name + drag handle */}
                    <div className="driver-card-header">
                      <div className={`driver-stop-badge${stop.isInTransit ? " driver-stop-badge--in-transit" : ""}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm driver-project-name">{stop.projectName}</div>
                        {stop.address && <div className="text-xs text-muted">{stop.address}</div>}
                      </div>
                      <div className="driver-drag-handle">&#x2807;</div>
                    </div>

                    {/* Material info */}
                    <div className="driver-card-body">
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
                      <div className="driver-schedule-row">
                        <Calendar size={13} className="driver-schedule-label" aria-hidden="true" />
                        <span className="text-xs driver-schedule-label">{t("Scheduled")}:</span>
                        <input
                          type="date"
                          className="form-input field-input driver-schedule-input focus-visible"
                          value={deliverySchedules[stop.id] || ""}
                          onChange={e => setScheduleDate(stop.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                        {deliverySchedules[stop.id] && (
                          <button
                            className="driver-schedule-clear touch-target"
                            onClick={e => { e.stopPropagation(); setScheduleDate(stop.id, ""); }}
                            title={t("Clear date")}
                          >
                            &#x2715;
                          </button>
                        )}
                      </div>

                      {/* Action buttons (DRVR-02 — 44px touch targets via FieldButton) */}
                      <div className="driver-action-row">
                        {!stop.isInTransit ? (
                          <FieldButton
                            variant="primary"
                            className="btn-sm driver-action-btn"
                            onClick={() => handleStartDelivery(stop.id)}
                            t={t}
                          >
                            <Truck size={14} aria-hidden="true" /> {t("Start Delivery")}
                          </FieldButton>
                        ) : (
                          <FieldButton
                            variant="primary"
                            className="btn-sm driver-action-btn driver-delivered-btn"
                            onClick={() => handleMarkDelivered(stop.id)}
                            t={t}
                          >
                            <CheckCircle size={14} aria-hidden="true" /> {t("Mark Delivered")}
                          </FieldButton>
                        )}
                        {getNavLink(stop) && (
                          <FieldButton
                            variant="ghost"
                            className="btn-sm driver-action-btn"
                            onClick={() => window.open(getNavLink(stop), "_blank")}
                            t={t}
                          >
                            <MapPin size={14} aria-hidden="true" /> {t("Navigate")}
                          </FieldButton>
                        )}
                      </div>
                    </div>
                  </FieldCard>
                ))}
              </div>
            ))}

            {/* Re-optimize button */}
            {manualOrder && optimizedStops.length > 1 && (
              <FieldButton
                variant="ghost"
                className="driver-reoptimize-btn"
                onClick={() => setManualOrder(null)}
                t={t}
              >
                <RefreshCw size={14} aria-hidden="true" /> {t("Re-optimize Route")}
              </FieldButton>
            )}
          </div>
        )}

        {/* ═══ COMPLETED TAB ═══ */}
        {driverTab === "completed" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title driver-section-title">{t("Today's Deliveries")}</div>
            </div>
            {initialLoading ? completedCardSkeleton : (
              todayDelivered.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  heading={t("No deliveries completed today")}
                  t={t}
                />
              ) : (
                <div className="driver-route-list">
                  {todayDelivered.map(req => (
                    <FieldCard key={req.id} className="driver-completed-card">
                      <div className="flex-between mb-4">
                        <span className="text-sm font-semi">{req.material}</span>
                        <StatusBadge status="completed" t={t} />
                      </div>
                      <div className="text-xs text-muted mb-4">{req.projectName} — {req.qty} {req.unit}</div>
                      <div className="text-xs text-dim">{t("Delivered")} {fmtTime(req.deliveredAt)}</div>
                    </FieldCard>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {driverTab === "settings" && (
          <div className="settings-wrap">
            <FieldButton
              variant="ghost"
              className="btn-sm driver-settings-back"
              onClick={() => setDriverTab("route")}
              t={t}
            >
              &#9664; {t("Back")}
            </FieldButton>
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeDriver.name)}</div>
              <div className="driver-profile-center">
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
              <div className="settings-row driver-settings-lang-row">
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

      {/* Bottom tab bar (D-05) — position:fixed via .field-tab-bar CSS */}
      <PortalTabBar
        tabs={driverTabDefs}
        activeTab={driverTab}
        onTabChange={setDriverTab}
        maxPrimary={3}
        t={t}
      />
    </div>
  );
}
