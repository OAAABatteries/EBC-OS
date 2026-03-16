import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNotifications } from "../hooks/useNotifications";
import { findNearestGeofence, getLocationsInRange } from "../utils/geofence";
import { T } from "../data/translations";
import { THEMES } from "../data/constants";
import {
  PPE_ITEMS, riskColor, HAZARD_CATEGORIES, CONTROL_HIERARCHY, TRADE_LABELS,
} from "../data/jsaConstants";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const PHASE_COLORS = {
  "Pre-Construction": "#e09422",
  "Estimating": "#3b82f6",
  "Active": "#10b981",
  "Complete": "#6b7280",
};

// ═══════════════════════════════════════════════════════════════
//  Employee View — Time Clock + Schedule + Materials + Field Access
//  Email/password login → Role-aware tabs → i18n (EN/ES)
// ═══════════════════════════════════════════════════════════════

const EMP_SESSION_KEY = "ebc_activeEmployee";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const UNITS = ["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT"];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export function EmployeeView({ app }) {
  const {
    employees, projects, companyLocations,
    timeEntries, setTimeEntries,
    changeOrders, rfis, submittals, crewSchedule,
    materialRequests, setMaterialRequests,
    jsas, setJsas,
    theme, setTheme, show
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => lang === "es" && T[key]?.es ? T[key].es : key;

  // ── session — use main auth if available ──
  const mainAuth = app.auth;
  const [activeEmp, setActiveEmp] = useState(() => {
    if (mainAuth && mainAuth.role === "employee") {
      return { id: mainAuth.id, name: mainAuth.name, email: mainAuth.email, role: "Crew", active: true, phone: "", notifications: { schedule: true, materials: true, deliveries: true }, schedule: { start: "06:00", end: "14:30" } };
    }
    try {
      const saved = localStorage.getItem(EMP_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ── login form state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [empTab, setEmpTab] = useState("clock");
  const [now, setNow] = useState(new Date());
  const [activeJsaId, setActiveJsaId] = useState(null);

  // ── geolocation ──
  const { position, error: geoError, loading: geoLoading, getPosition } = useGeolocation();
  const [geoStatus, setGeoStatus] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  // ── notifications ──
  const { requestPermission, scheduleClockReminder, getNextScheduledTime } = useNotifications();

  // ── schedule/project info state ──
  const [selectedInfoProject, setSelectedInfoProject] = useState(null);
  const [openSections, setOpenSections] = useState({});

  // ── project search for clock-in ──
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectSearch, setShowProjectSearch] = useState(false);

  // ── material request state ──
  const [matForm, setMatForm] = useState({ material: "", qty: "", unit: "EA", notes: "" });
  const [matProjectId, setMatProjectId] = useState(null);

  // ── clock map ──
  const clockMapRef = useRef(null);
  const clockMapInstance = useRef(null);
  const clockMarkersRef = useRef([]);

  // ── clock tick ──
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── persist session ──
  useEffect(() => {
    if (activeEmp) {
      localStorage.setItem(EMP_SESSION_KEY, JSON.stringify(activeEmp));
    } else {
      localStorage.removeItem(EMP_SESSION_KEY);
    }
  }, [activeEmp]);

  // ── request notification permission on login ──
  useEffect(() => {
    if (activeEmp) {
      requestPermission().then((perm) => {
        if (perm === "granted" && activeEmp.schedule?.start) {
          const nextTime = getNextScheduledTime(activeEmp.schedule.start);
          if (nextTime) {
            scheduleClockReminder({
              employeeId: activeEmp.id,
              employeeName: activeEmp.name,
              scheduledTime: nextTime,
              projectName: "",
            });
          }
        }
      });
    }
  }, [activeEmp]);

  // ── login handler ──
  const handleLogin = () => {
    setLoginError("");
    const emp = employees.find(
      e => e.email === email.trim().toLowerCase() && e.password === password && e.active && e.role !== "Driver"
    );
    if (emp) {
      setActiveEmp(emp);
      setEmail("");
      setPassword("");
    } else {
      setLoginError(t("Invalid credentials"));
    }
  };

  // ── detect active clock-in ──
  const activeEntry = useMemo(() => {
    if (!activeEmp) return null;
    return timeEntries.find((e) => e.employeeId === activeEmp.id && !e.clockOut);
  }, [activeEmp, timeEntries]);

  const isClockedIn = !!activeEntry;

  // ── elapsed time for active entry ──
  const elapsed = useMemo(() => {
    if (!activeEntry) return "";
    const ms = now - new Date(activeEntry.clockIn);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }, [activeEntry, now]);

  const handleLogout = () => {
    setActiveEmp(null);
    setEmail("");
    setPassword("");
    setEmpTab("clock");
    setGeoStatus(null);
    setSelectedProject(null);
    setSelectedInfoProject(null);
    if (app.onLogout) app.onLogout();
  };

  // ── geolocation check ──
  const checkLocation = useCallback(async () => {
    try {
      const pos = await getPosition();
      const nearest = findNearestGeofence(pos.lat, pos.lng, projects, companyLocations);
      const inRange = getLocationsInRange(pos.lat, pos.lng, projects, companyLocations);
      setGeoStatus({ nearest, locationsInRange: inRange });
      if (inRange.length > 0 && !selectedProject) {
        setSelectedProject(inRange[0]);
      }
      return { pos, nearest, inRange };
    } catch (err) {
      show("Location error: " + err, "err");
      return null;
    }
  }, [getPosition, projects, companyLocations, selectedProject, show]);

  // ── auto-detect location when clock tab is active and not clocked in ──
  useEffect(() => {
    if (activeEmp && empTab === "clock" && !isClockedIn && !geoStatus) {
      checkLocation();
    }
  }, [activeEmp, empTab, isClockedIn]);

  // ── clock map: init, markers, cleanup ──
  const [clockMapReady, setClockMapReady] = useState(false);

  useEffect(() => {
    if (!activeEmp || empTab !== "clock") return;
    const timer = setTimeout(() => {
      if (!clockMapRef.current) return;
      // If old map instance exists but its container was unmounted, clean up
      if (clockMapInstance.current) {
        if (clockMapInstance.current.getContainer() === clockMapRef.current) return; // still valid
        try { clockMapInstance.current.remove(); } catch {}
        clockMapInstance.current = null;
        clockMarkersRef.current = [];
        setClockMapReady(false);
      }
      const map = L.map(clockMapRef.current, {
        center: [29.76, -95.40],
        zoom: 9,
        attributionControl: false,
        zoomControl: true,
      });
      L.tileLayer(DARK_TILES, { maxZoom: 18 }).addTo(map);
      clockMapInstance.current = map;
      setTimeout(() => { map.invalidateSize(); setClockMapReady(true); }, 120);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeEmp, empTab]);

  useEffect(() => {
    const map = clockMapInstance.current;
    if (!map || !clockMapReady) return;
    // clear old markers
    clockMarkersRef.current.forEach(m => map.removeLayer(m));
    clockMarkersRef.current = [];
    // add project markers
    projects.forEach(p => {
      if (!p.lat || !p.lng) return;
      const color = PHASE_COLORS[p.phase] || "#e09422";
      const icon = L.divIcon({
        className: "map-marker-wrap",
        html: `<div class="map-marker" style="background:${color};box-shadow:0 0 8px ${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      marker.bindPopup(`<div style="font-size:12px"><b style="color:${color}">${p.name}</b><br/>${p.gc} · ${p.phase}<br/>${p.address || ""}</div>`);
      clockMarkersRef.current.push(marker);
    });
    // add user position marker
    if (position) {
      const userIcon = L.divIcon({
        className: "map-marker-wrap",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 12px rgba(59,130,246,0.6)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const userMarker = L.marker([position.lat, position.lng], { icon: userIcon }).addTo(map);
      userMarker.bindPopup(`<div style="font-size:12px"><b>You</b></div>`);
      clockMarkersRef.current.push(userMarker);
      // fit bounds to show user + nearby projects
      const bounds = L.latLngBounds([[position.lat, position.lng]]);
      projects.forEach(p => { if (p.lat && p.lng) bounds.extend([p.lat, p.lng]); });
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [clockMapReady, projects, position]);

  // cleanup map on unmount or tab change
  useEffect(() => {
    return () => {
      if (clockMapInstance.current) {
        clockMapInstance.current.remove();
        clockMapInstance.current = null;
        setClockMapReady(false);
      }
    };
  }, []);

  // ── clock in ──
  const handleClockIn = async () => {
    // refresh location right before clocking in
    const result = await checkLocation();
    if (!result) return;
    const { pos, inRange } = result;
    const target = selectedProject || (inRange.length > 0 ? inRange[0] : null);
    if (!target || !target.withinGeofence) {
      setShowOverride(true);
      return;
    }
    doClockIn(pos, target, "inside");
  };

  const doClockIn = (pos, target, status, reason) => {
    const entry = {
      id: "te_" + Date.now(),
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      projectId: target?.id || null,
      projectName: target?.name || "Unknown Location",
      clockIn: new Date().toISOString(),
      clockOut: null,
      clockInLat: pos.lat,
      clockInLng: pos.lng,
      clockOutLat: null,
      clockOutLng: null,
      geofenceStatus: status,
      overrideReason: reason || null,
      totalHours: null,
      notes: "",
    };
    setTimeEntries((prev) => [entry, ...prev]);
    setShowOverride(false);
    setOverrideReason("");
    show("Clocked in — " + (target?.name || ""), "ok");
  };

  const handleOverrideClockIn = async () => {
    if (!overrideReason.trim()) return;
    const pos = position || (await getPosition());
    const nearest = geoStatus?.nearest || { name: "Off-site" };
    doClockIn(
      { lat: pos.lat, lng: pos.lng },
      nearest,
      "override",
      overrideReason.trim()
    );
  };

  // ── clock out ──
  const handleClockOut = async () => {
    if (!activeEntry) return;
    let outLat = null, outLng = null;
    try {
      const pos = await getPosition();
      outLat = pos.lat;
      outLng = pos.lng;
    } catch {}
    const clockIn = new Date(activeEntry.clockIn);
    const clockOut = new Date();
    const totalHours = Math.round(((clockOut - clockIn) / 3600000) * 100) / 100;
    setTimeEntries((prev) =>
      prev.map((e) =>
        e.id === activeEntry.id
          ? { ...e, clockOut: clockOut.toISOString(), clockOutLat: outLat, clockOutLng: outLng, totalHours }
          : e
      )
    );
    show(`Clocked out — ${totalHours.toFixed(2)} hours`, "ok");
  };

  // ── employee's time log (current week) ──
  const weekEntries = useMemo(() => {
    if (!activeEmp) return [];
    const monday = getWeekStart(new Date());
    return timeEntries
      .filter((e) => e.employeeId === activeEmp.id && new Date(e.clockIn) >= monday)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));
  }, [activeEmp, timeEntries]);

  const weekTotal = useMemo(
    () => weekEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
    [weekEntries]
  );

  // ── employee's projects (from time entries) ──
  const myProjectIds = useMemo(() => {
    if (!activeEmp) return new Set();
    return new Set(timeEntries.filter((e) => e.employeeId === activeEmp.id).map((e) => e.projectId));
  }, [activeEmp, timeEntries]);

  const myCOs = useMemo(
    () => changeOrders.filter((co) => myProjectIds.has(co.projectId)),
    [changeOrders, myProjectIds]
  );

  const myRFIs = useMemo(
    () => rfis.filter((r) => myProjectIds.has(r.projectId)),
    [rfis, myProjectIds]
  );

  // ── my crew schedule this week ──
  const mySchedule = useMemo(() => {
    if (!activeEmp) return [];
    const weekStr = toDateStr(getWeekStart(new Date()));
    return crewSchedule.filter(s => s.employeeId === activeEmp.id && s.weekStart === weekStr);
  }, [activeEmp, crewSchedule]);

  // ── my assigned project IDs (from schedule) ──
  const myScheduledProjectIds = useMemo(() => {
    const ids = new Set();
    mySchedule.forEach(s => { if (s.projectId) ids.add(s.projectId); });
    return ids;
  }, [mySchedule]);

  // ── my material requests ──
  const myMatRequests = useMemo(() => {
    if (!activeEmp) return [];
    return materialRequests
      .filter(r => r.employeeId === activeEmp.id)
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [activeEmp, materialRequests]);

  // ── format helpers ──
  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  // ── role-aware tabs ──
  const tabs = useMemo(() => {
    const base = [
      { key: "clock", label: isClockedIn ? `🟢 ${t("Clock")}` : t("Clock") },
      { key: "schedule", label: t("Schedule") },
      { key: "materials", label: t("Materials") },
      { key: "settings", label: "⚙️" },
    ];
    return base;
  }, [activeEmp, lang, isClockedIn]);

  // ── material request submit ──
  const handleMatSubmit = () => {
    if (!matProjectId || !matForm.material.trim() || !matForm.qty) return;
    const proj = projects.find(p => p.id === matProjectId);
    const newReq = {
      id: "mr_" + Date.now(),
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      projectId: matProjectId,
      projectName: proj?.name || "",
      material: matForm.material.trim(),
      qty: Number(matForm.qty),
      unit: matForm.unit,
      notes: matForm.notes.trim(),
      status: "requested",
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      deliveredAt: null,
      driverId: null,
    };
    setMaterialRequests(prev => [newReq, ...prev]);
    setMatForm({ material: "", qty: "", unit: "EA", notes: "" });
    show(t("Request Material") + " — " + newReq.material, "ok");
  };

  // ── toggle section ──
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── status label helper ──
  const statusLabel = (s) => {
    const map = { requested: t("Requested"), approved: t("Approved"), "in-transit": t("In Transit"), delivered: t("Delivered") };
    return map[s] || s;
  };
  const statusClass = (s) => {
    const map = { requested: "mat-status-requested", approved: "mat-status-approved", "in-transit": "mat-status-in-transit", delivered: "mat-status-delivered" };
    return "badge " + (map[s] || "badge-muted");
  };

  // ── notification toggle helper ──
  const handleNotificationToggle = (key) => {
    const updated = { ...activeEmp, notifications: { ...activeEmp.notifications, [key]: !activeEmp.notifications?.[key] } };
    setActiveEmp(updated);
  };

  // ── initials for avatar ──
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!activeEmp) {
    return (
      <div className="employee-app">
        <header className="employee-header">
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/eagle.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", background: "transparent" }} onError={(e) => e.target.style.display = "none"} />EBC-OS</div>
          <span className="text-sm text-muted">{t("Employee Portal")}</span>
        </header>
        <div className="employee-body">
          <div className="login-wrap">
            <div className="login-title">{t("Sign In")}</div>
            <div className="text-sm text-muted" style={{ textAlign: "center", marginTop: -12 }}>{t("Employee Portal")}</div>
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
  //  PROJECT INFO PANEL (drill-down from Schedule)
  // ═══════════════════════════════════════════════════════════════
  if (selectedInfoProject) {
    const proj = projects.find(p => p.id === selectedInfoProject);
    if (!proj) { setSelectedInfoProject(null); return null; }
    const projSubs = (submittals || []).filter(s => s.projectId === proj.id);
    const projCOs = changeOrders.filter(co => co.projectId === proj.id);
    const projRFIs = rfis.filter(r => r.projectId === proj.id);
    const isForeman = activeEmp.role === "Foreman";

    return (
      <div className="employee-app">
        <header className="employee-header">
          <div>
            <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/eagle.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", background: "transparent" }} onError={(e) => e.target.style.display = "none"} />EBC-OS</div>
            <span className="text-xs text-muted">{activeEmp.name} · {activeEmp.role}</span>
          </div>
          <button className="settings-gear" onClick={() => { setSelectedInfoProject(null); setEmpTab("settings"); }} title={t("Settings")}>
            &#9881;
          </button>
        </header>
        <div className="employee-body">
          <div className="project-info">
            <button className="project-info-back" onClick={() => setSelectedInfoProject(null)}>
              ← {t("Back to Schedule")}
            </button>
            <div className="clock-card" style={{ textAlign: "left" }}>
              <div className="text-lg font-bold text-amber mb-8">{proj.name}</div>

              <div className="project-info-field">
                <span className="project-info-label">{t("General Contractor")}</span>
                <span className="project-info-value">{proj.gc}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Superintendent")}</span>
                <span className="project-info-value">{proj.superintendent || "—"}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Project Manager")}</span>
                <span className="project-info-value">{proj.pm || "—"}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Address")}</span>
                <span className="project-info-value">{proj.address || "—"}</span>
              </div>
              <div className="project-info-field">
                <span className="project-info-label">{t("Phase")}</span>
                <span className="project-info-value">{proj.phase}</span>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="flex-between mb-4">
                  <span className="text-xs text-dim">{t("Progress")}</span>
                  <span className="text-xs font-mono text-amber">{proj.progress}%</span>
                </div>
                <div className="project-progress-bar">
                  <div className="project-progress-fill" style={{ width: `${proj.progress}%` }} />
                </div>
              </div>

              {proj.emergencyContact && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--red-dim)", borderRadius: "var(--radius-sm)" }}>
                  <div className="text-xs font-semi text-red mb-4">{t("Emergency Contact")}</div>
                  <div className="text-sm">{proj.emergencyContact.name} — {proj.emergencyContact.role}</div>
                  <a href={`tel:${proj.emergencyContact.phone}`} className="text-sm text-amber" style={{ textDecoration: "none" }}>
                    {proj.emergencyContact.phone}
                  </a>
                </div>
              )}
            </div>

            {/* ── Foreman-only document sections ── */}
            {isForeman && (
              <div style={{ marginTop: 12 }}>
                {/* Submittals */}
                <div className="clock-card" style={{ textAlign: "left", marginBottom: 8 }}>
                  <div className="project-section-header" onClick={() => toggleSection("subs")}>
                    <span>{t("Submittals")} ({projSubs.length})</span>
                    <span>{openSections.subs ? "▾" : "▸"}</span>
                  </div>
                  {openSections.subs && (
                    projSubs.length === 0 ? (
                      <div className="text-xs text-muted mt-8">{t("No submittals")}</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                        {projSubs.map(s => (
                          <div key={s.id} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <div>
                              <div className="text-sm font-semi">{s.number}</div>
                              <div className="text-xs text-muted">{s.desc}</div>
                            </div>
                            <span className={`badge ${s.status === "approved" ? "badge-green" : s.status === "submitted" ? "badge-amber" : "badge-muted"}`}>
                              {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Change Orders */}
                <div className="clock-card" style={{ textAlign: "left", marginBottom: 8 }}>
                  <div className="project-section-header" onClick={() => toggleSection("cos")}>
                    <span>{t("Change Orders")} ({projCOs.length})</span>
                    <span>{openSections.cos ? "▾" : "▸"}</span>
                  </div>
                  {openSections.cos && (
                    projCOs.length === 0 ? (
                      <div className="text-xs text-muted mt-8">{t("No change orders")}</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                        {projCOs.map(co => (
                          <div key={co.id} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <div>
                              <div className="text-sm font-semi">{co.number}</div>
                              <div className="text-xs text-muted">{co.desc}</div>
                            </div>
                            <span className="text-sm font-mono text-amber">${Number(co.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* RFIs */}
                <div className="clock-card" style={{ textAlign: "left" }}>
                  <div className="project-section-header" onClick={() => toggleSection("rfis")}>
                    <span>{t("RFIs")} ({projRFIs.length})</span>
                    <span>{openSections.rfis ? "▾" : "▸"}</span>
                  </div>
                  {openSections.rfis && (
                    projRFIs.length === 0 ? (
                      <div className="text-xs text-muted mt-8">{t("No RFIs")}</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                        {projRFIs.map(rfi => (
                          <div key={rfi.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <div className="flex-between mb-4">
                              <span className="text-sm font-semi">{rfi.number}</span>
                              <span className={`badge ${rfi.status === "answered" ? "badge-green" : "badge-amber"}`}>
                                {rfi.status}
                              </span>
                            </div>
                            <div className="text-xs text-muted">{rfi.subject}</div>
                            {rfi.response && (
                              <div className="text-xs text-green mt-4">{t("Response")}: {rfi.response}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAIN EMPLOYEE VIEW (logged in)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="employee-app">
      <header className="employee-header">
        <div>
          <div className="employee-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/eagle.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", background: "transparent" }} onError={(e) => e.target.style.display = "none"} />EBC-OS</div>
          <span className="text-xs text-muted">{activeEmp.name} · {activeEmp.role}</span>
        </div>
        <button className="settings-gear" onClick={() => setEmpTab("settings")} title={t("Settings")}>
          &#9881;
        </button>
      </header>

      <div className="employee-body">
        {/* ── Sub-tabs ── */}
        <div className="emp-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`emp-tab${empTab === tab.key ? " active" : ""}`}
              onClick={() => setEmpTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ CLOCK TAB ═══ */}
        {empTab === "clock" && (
          <div className="emp-content">
            <div className="clock-card">
              <div className={`clock-status ${isClockedIn ? "in" : "out"}`}>
                {isClockedIn ? t("Clocked In") : t("Clocked Out")}
              </div>
              <div className="clock-time">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              {isClockedIn && (
                <>
                  <div className="clock-project">{activeEntry.projectName}</div>
                  <div className="text-sm text-amber mb-16" style={{ fontFamily: "var(--font-mono)" }}>
                    {elapsed}
                  </div>
                </>
              )}

              {geoStatus?.nearest && (
                <div className={`geo-status ${geoStatus.nearest.withinGeofence ? "inside" : "outside"}`}>
                  <span className="geo-dot" />
                  {geoStatus.nearest.withinGeofence
                    ? `Inside — ${geoStatus.nearest.name} (${geoStatus.nearest.distance} ft)`
                    : `Outside — ${geoStatus.nearest.name} (${geoStatus.nearest.distance} ft)`}
                </div>
              )}
              {geoLoading && (
                <div className="geo-status inside" style={{ opacity: 0.6 }}>
                  <span className="geo-dot" /> {t("Getting location...")}
                </div>
              )}
              {geoError && !geoLoading && (
                <div className="geo-status outside">
                  <span className="geo-dot" /> {geoError}
                </div>
              )}

              {!isClockedIn && geoStatus?.locationsInRange?.length > 1 && !showProjectSearch && (
                <div className="form-group mb-16">
                  <label className="form-label">{t("Job Site")} (GPS)</label>
                  <select
                    className="form-select"
                    value={selectedProject?.id || ""}
                    onChange={(e) => {
                      const loc = geoStatus.locationsInRange.find(
                        (l) => String(l.id) === e.target.value
                      );
                      setSelectedProject(loc);
                    }}
                  >
                    {geoStatus.locationsInRange.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.distance} ft)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Project Search / Lookup ── */}
              {!isClockedIn && (
                <div className="form-group mb-16">
                  {!showProjectSearch ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: "100%", opacity: 0.7 }}
                      onClick={() => setShowProjectSearch(true)}
                    >
                      🔍 {t("Search project manually")}
                    </button>
                  ) : (
                    <>
                      <label className="form-label">{t("Search Project")}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={t("Type project name or address...")}
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        autoFocus
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 8, background: "var(--glass-bg)" }}>
                        {projects
                          .filter(p => {
                            if (!projectSearch.trim()) return true;
                            const q = projectSearch.toLowerCase();
                            return (p.name || "").toLowerCase().includes(q) ||
                                   (p.address || "").toLowerCase().includes(q) ||
                                   (p.gc || "").toLowerCase().includes(q);
                          })
                          .slice(0, 8)
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedProject({ id: p.id, name: p.name, withinGeofence: true });
                                setShowProjectSearch(false);
                                setProjectSearch("");
                              }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--glass-border)",
                                background: selectedProject?.id === p.id ? "var(--accent-dim)" : "transparent",
                              }}
                            >
                              <div className="text-sm font-semi">{p.name}</div>
                              <div className="text-xs text-muted">{p.address || p.gc || ""}</div>
                            </div>
                          ))}
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: 6, width: "100%" }}
                        onClick={() => { setShowProjectSearch(false); setProjectSearch(""); }}
                      >
                        {t("Cancel")}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Show selected project */}
              {!isClockedIn && selectedProject && (
                <div className="text-sm font-semi" style={{ textAlign: "center", marginBottom: 12, color: "var(--accent)" }}>
                  📍 {selectedProject.name}
                </div>
              )}

              {isClockedIn ? (
                <button className="clock-btn clock-out" onClick={handleClockOut}>
                  {t("Clock Out")}
                </button>
              ) : geoLoading ? (
                <button className="clock-btn clock-in" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                  {t("Getting location...")}
                </button>
              ) : !geoStatus ? (
                <button className="clock-btn clock-in" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                  {t("Getting location...")}
                </button>
              ) : (
                <button className="clock-btn clock-in" onClick={handleClockIn}>
                  {t("Clock In")}
                </button>
              )}
            </div>

            {showOverride && (
              <div className="clock-card" style={{ borderColor: "var(--amber)", marginTop: 12 }}>
                <div className="text-sm text-amber font-semi mb-8">
                  {t("You are outside the geofence. Enter a reason to override:")}
                </div>
                <textarea
                  className="form-textarea w-full mb-12"
                  placeholder="e.g., Parking lot across street..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                />
                <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowOverride(false); setOverrideReason(""); }}>
                    {t("Cancel")}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleOverrideClockIn}
                    disabled={!overrideReason.trim()}
                  >
                    {t("Override & Clock In")}
                  </button>
                </div>
              </div>
            )}

            {/* ── Map ── */}
            <div className="clock-card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
              <div ref={clockMapRef} style={{ width: "100%", height: 260, borderRadius: "var(--radius)" }} />
            </div>

            <div className="clock-card" style={{ marginTop: 12 }}>
              <div className="text-xs text-dim mb-8" style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}>
                {t("This Week")}
              </div>
              <div className="flex-between">
                <span className="text-sm text-muted">{weekEntries.length} {t("entries")}</span>
                <span className="text-md font-bold text-amber">{weekTotal.toFixed(1)}h</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCHEDULE TAB ═══ */}
        {empTab === "schedule" && (
          <div className="emp-content">
            <div className="section-header">
              <div>
                <div className="section-title" style={{ fontSize: 16 }}>{t("My Schedule")}</div>
                <div className="section-sub">{t("Week of")} {getWeekStart(new Date()).toLocaleDateString(lang === "es" ? "es" : "en", { month: "short", day: "numeric" })}</div>
              </div>
            </div>
            <div className="clock-card" style={{ textAlign: "left", padding: 0, overflow: "hidden" }}>
              {DAY_KEYS.map((dayKey, i) => {
                const assignment = mySchedule.find(s => s.days?.[dayKey] && s.projectId);
                const proj = assignment ? projects.find(p => p.id === assignment.projectId) : null;
                return (
                  <div key={dayKey} className="schedule-day">
                    <span className="schedule-day-name">{t(DAY_LABELS_EN[i])}</span>
                    {proj ? (
                      <>
                        <span className="schedule-project" onClick={() => setSelectedInfoProject(proj.id)}>
                          {proj.name}
                        </span>
                        <span className="schedule-time">
                          {assignment.hours?.start || "06:30"} — {assignment.hours?.end || "15:00"}
                        </span>
                      </>
                    ) : (
                      <span className="schedule-off">{t("Off")}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {mySchedule.length === 0 && (
              <div className="empty-state" style={{ padding: "30px 20px" }}>
                <div className="empty-icon">📅</div>
                <div className="empty-text">{t("No schedule this week")}</div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TIME LOG TAB ═══ */}
        {empTab === "log" && (
          <div className="emp-content">
            <div className="section-header">
              <div>
                <div className="section-title" style={{ fontSize: 16 }}>{t("Time Log")}</div>
                <div className="section-sub">{t("This Week")} — {weekTotal.toFixed(1)}h</div>
              </div>
            </div>
            {weekEntries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🕐</div>
                <div className="empty-text">{t("No entries this week")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {weekEntries.map((entry) => (
                  <div key={entry.id} className="card" style={{ padding: 14 }}>
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{fmtDate(entry.clockIn)}</span>
                      <span className={`badge ${entry.geofenceStatus === "inside" ? "badge-green" : entry.geofenceStatus === "override" ? "badge-amber" : "badge-red"}`}>
                        {entry.geofenceStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted mb-4">{entry.projectName}</div>
                    <div className="flex-between">
                      <span className="text-xs font-mono text-muted">
                        {fmtTime(entry.clockIn)} — {fmtTime(entry.clockOut)}
                      </span>
                      <span className="text-sm font-bold text-amber">
                        {entry.totalHours ? entry.totalHours.toFixed(2) + "h" : t("Active")}
                      </span>
                    </div>
                    {entry.overrideReason && (
                      <div className="text-xs text-dim mt-4">{t("Override")}: {entry.overrideReason}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ JSA TAB ═══ */}
        {empTab === "jsa" && (() => {
          // JSAs for my projects
          const allMyProjectIds = new Set([...myProjectIds, ...myScheduledProjectIds]);
          const myJsaList = (jsas || []).filter(j => allMyProjectIds.has(j.projectId) && (j.status === "active" || j.status === "draft"))
            .sort((a, b) => b.date.localeCompare(a.date));

          // Detail view
          if (activeJsaId) {
            const jsa = (jsas || []).find(j => j.id === activeJsaId);
            if (!jsa) { setActiveJsaId(null); return null; }
            const allHazards = jsa.steps.flatMap(s => s.hazards || []);
            const maxRisk = Math.max(0, ...allHazards.map(h => (h.likelihood || 1) * (h.severity || 1)));
            const rc = riskColor(maxRisk);
            const alreadySigned = (jsa.crewSignOn || []).some(c => c.employeeId === activeEmp.id);
            const proj = projects.find(p => p.id === jsa.projectId);

            return (
              <div className="emp-content">
                <button className="cal-nav-btn" style={{ marginBottom: 12 }} onClick={() => setActiveJsaId(null)}>{t("← Back")}</button>

                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <span className="jsa-status-badge" style={{ background: (jsa.status === "active" ? "#10b981" : "#f59e0b") + "22", color: jsa.status === "active" ? "#10b981" : "#f59e0b" }}>{jsa.status.toUpperCase()}</span>
                  <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label} Risk</span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{jsa.title}</h3>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
                  {proj?.name} · {jsa.date} · {jsa.supervisor}
                </div>

                {/* Sign-On Button (prominent) */}
                {jsa.status === "active" && !alreadySigned && (
                  <button className="btn btn-primary" style={{ width: "100%", padding: "14px", fontSize: 16, fontWeight: 700, marginBottom: 16 }}
                    onClick={() => {
                      setJsas(prev => prev.map(j => j.id === jsa.id ? {
                        ...j, crewSignOn: [...(j.crewSignOn || []), { employeeId: activeEmp.id, name: activeEmp.name, signedAt: new Date().toISOString() }]
                      } : j));
                      show(t("You have signed the JSA"));
                    }}>
                    ✍️ {t("Sign JSA")}
                  </button>
                )}
                {alreadySigned && (
                  <div style={{ background: "#10b98122", color: "#10b981", padding: 12, borderRadius: 8, textAlign: "center", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
                    ✓ {t("You have signed this JSA")}
                  </div>
                )}

                {/* PPE */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Required PPE")}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(jsa.ppe || []).map(k => {
                      const item = PPE_ITEMS.find(p => p.key === k);
                      return item ? (
                        <div key={k} style={{ textAlign: "center", fontSize: 11 }}>
                          <div style={{ fontSize: 22 }}>{item.icon}</div>
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
                              <span style={{ background: hrc.bg, color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{score}</span>
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

                {/* Crew who signed */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>{t("Crew Signed")} ({(jsa.crewSignOn || []).length})</div>
                  {(jsa.crewSignOn || []).map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 13, fontWeight: c.employeeId === activeEmp.id ? 700 : 400 }}>
                        {c.name} {c.employeeId === activeEmp.id ? "(You)" : ""}
                      </span>
                      <span style={{ fontSize: 11, color: "#10b981" }}>✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // List view
          return (
            <div className="emp-content">
              <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>{t("Job Safety Analysis")}</div>

              {myJsaList.length === 0 ? (
                <div className="empty-state" style={{ padding: "30px 20px" }}>
                  <div className="empty-icon">🛡️</div>
                  <div className="empty-text">{t("No active JSAs for your projects")}</div>
                </div>
              ) : myJsaList.map(j => {
                const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
                const rc = riskColor(maxRisk);
                const signed = (j.crewSignOn || []).some(c => c.employeeId === activeEmp.id);
                const proj = projects.find(p => p.id === j.projectId);
                return (
                  <div key={j.id} className="card" style={{ padding: 12, marginBottom: 8, cursor: "pointer", borderLeft: signed ? "3px solid #10b981" : "3px solid var(--amber)" }}
                    onClick={() => setActiveJsaId(j.id)}>
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg, fontSize: 10 }}>{rc.label}</span>
                        {signed
                          ? <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✓ {t("Signed")}</span>
                          : <span style={{ fontSize: 10, color: "var(--amber)", fontWeight: 600 }}>⚠ {t("Not Signed")}</span>
                        }
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>{j.date}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{j.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{proj?.name} · {j.supervisor}</div>
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
          );
        })()}

        {/* ═══ MATERIALS TAB ═══ */}
        {empTab === "materials" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 16 }}>{t("Request Material")}</div>
            </div>

            {/* Request form */}
            <div className="clock-card" style={{ textAlign: "left", marginBottom: 16 }}>
              <div className="form-group mb-12">
                <label className="form-label">{t("Project")}</label>
                <select
                  className="form-select"
                  value={matProjectId || ""}
                  onChange={(e) => setMatProjectId(Number(e.target.value) || null)}
                >
                  <option value="">{t("Select project")}</option>
                  {projects.filter(p => myScheduledProjectIds.has(p.id) || myProjectIds.has(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-12">
                <label className="form-label">{t("Material")}</label>
                <input
                  className="form-input"
                  placeholder='e.g., 5/8" Type X GWB'
                  value={matForm.material}
                  onChange={(e) => setMatForm(f => ({ ...f, material: e.target.value }))}
                />
              </div>
              <div className="flex gap-8 mb-12">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t("Quantity")}</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={matForm.qty}
                    onChange={(e) => setMatForm(f => ({ ...f, qty: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t("Unit")}</label>
                  <select
                    className="form-select"
                    value={matForm.unit}
                    onChange={(e) => setMatForm(f => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group mb-12">
                <label className="form-label">{t("Notes")}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={matForm.notes}
                  onChange={(e) => setMatForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleMatSubmit}
                disabled={!matProjectId || !matForm.material.trim() || !matForm.qty}
              >
                {t("Submit Request")}
              </button>
            </div>

            {/* My requests list */}
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 14 }}>{t("My Requests")}</div>
            </div>
            {myMatRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 20px" }}>
                <div className="empty-icon">📦</div>
                <div className="empty-text">{t("No material requests yet")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myMatRequests.map(req => (
                  <div key={req.id} className="mat-request-card">
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className={statusClass(req.status)}>{statusLabel(req.status)}</span>
                    </div>
                    <div className="text-xs text-muted mb-4">
                      {req.projectName} — {req.qty} {req.unit}
                    </div>
                    <div className="text-xs text-dim">
                      {fmtDate(req.requestedAt)} {fmtTime(req.requestedAt)}
                    </div>
                    {req.notes && <div className="text-xs text-dim mt-4">{req.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CHANGE ORDERS TAB (Foreman only) ═══ */}
        {empTab === "cos" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 16 }}>{t("Change Orders")}</div>
            </div>
            {myCOs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">{t("No change orders for your projects")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myCOs.map((co) => (
                  <div key={co.id} className="card" style={{ padding: 14 }}>
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{co.number}</span>
                      <span className={`badge ${co.status === "approved" ? "badge-green" : "badge-amber"}`}>
                        {co.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted">{co.desc}</div>
                    <div className="text-sm font-mono text-amber mt-4">
                      ${Number(co.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ RFIs TAB (Foreman only) ═══ */}
        {empTab === "rfis" && (
          <div className="emp-content">
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 16 }}>{t("RFIs")}</div>
            </div>
            {myRFIs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <div className="empty-text">{t("No RFIs for your projects")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myRFIs.map((rfi) => (
                  <div key={rfi.id} className="card" style={{ padding: 14 }}>
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{rfi.number}</span>
                      <span className={`badge ${rfi.status === "answered" ? "badge-green" : "badge-amber"}`}>
                        {rfi.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted">{rfi.subject}</div>
                    {rfi.response && (
                      <div className="text-xs text-green mt-4">{t("Response")}: {rfi.response}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {empTab === "settings" && (
          <div className="settings-wrap">
            {/* Profile */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Profile")}</div>
              <div className="settings-avatar">{getInitials(activeEmp.name)}</div>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div className="text-md font-semi">{activeEmp.name}</div>
                <div className="text-xs text-muted">{activeEmp.role} · {activeEmp.phone}</div>
                <div className="text-xs text-dim">{activeEmp.email}</div>
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
                <div className={`settings-toggle${activeEmp.notifications?.schedule ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("schedule")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Material updates")}</span>
                <div className={`settings-toggle${activeEmp.notifications?.materials ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("materials")} />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t("Delivery updates")}</span>
                <div className={`settings-toggle${activeEmp.notifications?.deliveries ? " on" : ""}`}
                  onClick={() => handleNotificationToggle("deliveries")} />
              </div>
            </div>

            {/* Preferences */}
            <div className="settings-section">
              <div className="settings-section-title">{t("Preferences")}</div>
              <div className="settings-row">
                <span className="settings-label">{t("Default Project")}</span>
                <select className="settings-select" style={{ width: "auto", maxWidth: 180 }}
                  value={activeEmp.defaultProjectId || ""}
                  onChange={e => setActiveEmp({ ...activeEmp, defaultProjectId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{t("None")}</option>
                  {projects.filter(p => myScheduledProjectIds.has(p.id) || myProjectIds.has(p.id)).map(p => (
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
      </div>
    </div>
  );
}
