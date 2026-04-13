import { useState, useEffect, useMemo, useCallback } from "react";
import { T } from "../data/translations";
import { EVENT_TYPES, WEATHER_CONDITIONS } from "../data/calendarConstants";
import { detectAllConflicts } from "../utils/conflictEngine";
import { CalendarLookahead } from "./calendar/CalendarLookahead";
import { CalendarPTO } from "./calendar/CalendarPTO";
import { CalendarEquipment } from "./calendar/CalendarEquipment";
import { CalendarConflicts } from "./calendar/CalendarConflicts";
import { CalendarAnalytics } from "./calendar/CalendarAnalytics";

// ═══════════════════════════════════════════════════════════════
//  CalendarView — Main calendar module for EBC-OS
//  Month / Week / Day views + sub-tabs for Lookahead, PTO,
//  Equipment, Conflicts, Analytics
// ═══════════════════════════════════════════════════════════════

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Event types that are manually created (not auto-generated)
const MANUAL_TYPES = EVENT_TYPES.filter(
  (et) => !["team", "gantt", "pto", "weather", "equipment", "sub"].includes(et.key)
);

// ── Date helpers (no external libs) ──

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(d) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateLong(d) {
  return `${DAY_LABELS[(d.getDay() + 6) % 7]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function inRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

function getEventTypeObj(key) {
  return EVENT_TYPES.find((et) => et.key === key) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function getWeatherIcon(condition) {
  const w = WEATHER_CONDITIONS.find((c) => c.key === condition);
  return w ? w.icon : "";
}

// ── Empty event form template ──
function emptyForm() {
  return {
    type: "meeting",
    title: "",
    projectId: "",
    date: toStr(new Date()),
    allDay: false,
    startTime: "08:00",
    endTime: "09:00",
    assignedTo: [],
    recurrence: { freq: "none", until: "" },
    linkedRfiId: "",
    linkedCOId: "",
    notes: "",
  };
}

// ═══════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════

export function CalendarView({ app }) {
  const {
    calendarEvents, setCalendarEvents, teamSchedule, schedule,
    ptoRequests, setPtoRequests, equipmentBookings, setEquipmentBookings,
    equipment, setEquipment, subSchedule, setSubSchedule,
    weatherAlerts, certifications, scheduleConflicts, setScheduleConflicts,
    materialRequests, employees, projects, timeEntries,
    show, theme, setTheme,
  } = app;

  // ── i18n ──
  const [lang, setLang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  useEffect(() => localStorage.setItem("ebc_lang", lang), [lang]);
  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);

  // ── State ──
  const [calSubTab, setCalSubTab] = useState("calendar");
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterTypes, setFilterTypes] = useState(() => new Set(EVENT_TYPES.map((et) => et.key)));
  const [filterProject, setFilterProject] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(emptyForm);

  // ── AI Week Planner state ──
  const [weekPlanResult, setWeekPlanResult] = useState(null);
  const [weekPlanLoading, setWeekPlanLoading] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);

  const runWeekPlan = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setWeekPlanLoading(true);
    setWeekPlanResult(null);
    try {
      const { planWeekSchedule } = await import("../utils/api.js");
      const res = await planWeekSchedule(app.apiKey, (calendarEvents || []).slice(0, 30), (projects || []).slice(0, 10), (employees || []).slice(0, 15), (teamSchedule || []).slice(0, 30), (schedule || []).slice(0, 20));
      setWeekPlanResult(res);
      setShowWeekPlan(true);
      show("Week plan generated", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setWeekPlanLoading(false);
    }
  };

  // ── Conflict detection ──
  const conflicts = useMemo(() => {
    return detectAllConflicts({
      teamSchedule: teamSchedule || [],
      employees: employees || [],
      projects: projects || [],
      equipment: equipment || [],
      equipmentBookings: equipmentBookings || [],
      certifications: certifications || [],
      calendarEvents: calendarEvents || [],
      ptoRequests: ptoRequests || [],
      dateRange: null,
    });
  }, [teamSchedule, employees, projects, equipment, equipmentBookings, certifications, calendarEvents, ptoRequests]);

  const unresolvedCount = useMemo(() => conflicts.filter((c) => !c.resolved).length, [conflicts]);

  // ── Recurring event expansion ──
  const expandRecurring = useCallback((ev, dateStr) => {
    if (!ev.recurrence || ev.recurrence.freq === "none" || !ev.recurrence) return ev.date === dateStr;
    const evDate = toDate(ev.date);
    const target = toDate(dateStr);
    if (target < evDate) return false;
    const until = ev.recurrence.until ? toDate(ev.recurrence.until) : addDays(new Date(), 365);
    if (target > until) return false;

    const diffMs = target.getTime() - evDate.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    switch (ev.recurrence.freq) {
      case "weekly":
        return diffDays % 7 === 0;
      case "biweekly":
        return diffDays % 14 === 0;
      case "monthly":
        return target.getDate() === evDate.getDate();
      default:
        return false;
    }
  }, []);

  // ── Unified event aggregation ──
  const getEventsForDate = useCallback(
    (dateStr) => {
      const events = [];

      // 1. Calendar events (with recurrence)
      for (const ev of calendarEvents || []) {
        if (expandRecurring(ev, dateStr)) {
          const et = getEventTypeObj(ev.type);
          events.push({
            id: ev.id + "_" + dateStr,
            type: ev.type,
            title: ev.title,
            color: et.color,
            time: ev.allDay ? null : ev.startTime,
            projectId: ev.projectId,
            raw: ev,
          });
        }
      }

      // 2. Crew schedule
      if (teamSchedule) {
        const d = toDate(dateStr);
        const monday = getMonday(d);
        const weekStr = toStr(monday);
        const dayIdx = (d.getDay() + 6) % 7;
        const dayKey = DAY_KEYS[dayIdx];

        for (const cs of teamSchedule) {
          if (cs.weekStart === weekStr && cs.days?.[dayKey]) {
            const emp = (employees || []).find((e) => String(e.id) === String(cs.employeeId));
            const proj = (projects || []).find((p) => String(p.id) === String(cs.projectId));
            events.push({
              id: "crew_" + cs.id + "_" + dateStr,
              type: "team",
              title: `${emp?.name || "Employee"} @ ${proj?.name || "Project"}`,
              color: getEventTypeObj("team").color,
              time: cs.hours?.start || null,
              projectId: cs.projectId,
              raw: cs,
            });
          }
        }
      }

      // 3. Gantt tasks
      for (const task of schedule || []) {
        if (task.start && task.end && inRange(dateStr, task.start, task.end)) {
          events.push({
            id: "gantt_" + task.id + "_" + dateStr,
            type: "gantt",
            title: task.task || task.name || "Gantt Task",
            color: getEventTypeObj("gantt").color,
            time: null,
            projectId: task.projectId,
            raw: task,
          });
        }
      }

      // 4. Approved PTO
      for (const pto of ptoRequests || []) {
        if (pto.status === "approved" && inRange(dateStr, pto.startDate, pto.endDate)) {
          const emp = (employees || []).find((e) => String(e.id) === String(pto.employeeId));
          events.push({
            id: "pto_" + pto.id + "_" + dateStr,
            type: "pto",
            title: `${emp?.name || "Employee"} — PTO`,
            color: getEventTypeObj("pto").color,
            time: null,
            projectId: null,
            raw: pto,
          });
        }
      }

      // 5. Equipment bookings
      for (const eb of equipmentBookings || []) {
        if (inRange(dateStr, eb.startDate, eb.endDate)) {
          const eq = (equipment || []).find((e) => String(e.id) === String(eb.equipmentId));
          events.push({
            id: "equip_" + eb.id + "_" + dateStr,
            type: "equipment",
            title: eq?.name || "Equipment",
            color: getEventTypeObj("equipment").color,
            time: null,
            projectId: eb.projectId,
            raw: eb,
          });
        }
      }

      // 6. Sub schedule
      for (const ss of subSchedule || []) {
        if (inRange(dateStr, ss.startDate, ss.endDate)) {
          events.push({
            id: "sub_" + ss.id + "_" + dateStr,
            type: "sub",
            title: `${ss.subName} — ${ss.trade}`,
            color: getEventTypeObj("sub").color,
            time: null,
            projectId: ss.projectId,
            raw: ss,
          });
        }
      }

      // 7. Weather alerts
      for (const wa of weatherAlerts || []) {
        if (wa.date === dateStr) {
          events.push({
            id: "weather_" + wa.id,
            type: "weather",
            title: wa.advisory || "Weather Alert",
            color: getEventTypeObj("weather").color,
            time: null,
            projectId: wa.projectId,
            raw: wa,
          });
        }
      }

      // 8. Material requests (approved / in-transit)
      for (const mr of materialRequests || []) {
        if ((mr.status === "approved" || mr.status === "in-transit") && mr.requestedAt) {
          const mrDate = mr.requestedAt.slice(0, 10);
          if (mrDate === dateStr) {
            events.push({
              id: "mat_" + mr.id,
              type: "delivery",
              title: `Material: ${mr.item || mr.description || "Request"}`,
              color: getEventTypeObj("delivery").color,
              time: null,
              projectId: mr.projectId,
              raw: mr,
            });
          }
        }
      }

      // Apply filters
      return events.filter((ev) => {
        if (!filterTypes.has(ev.type)) return false;
        if (filterProject && ev.projectId !== filterProject) return false;
        return true;
      });
    },
    [calendarEvents, teamSchedule, schedule, ptoRequests, equipmentBookings, subSchedule, weatherAlerts, materialRequests, employees, projects, equipment, filterTypes, filterProject, expandRecurring]
  );

  // ── Weather lookup for a date ──
  const weatherForDate = useCallback(
    (dateStr) => (weatherAlerts || []).find((w) => w.date === dateStr),
    [weatherAlerts]
  );

  // ── Navigation ──
  const navigate = (dir) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + 7 * dir);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  // ── Title string ──
  const titleStr = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "week") {
      const mon = getMonday(currentDate);
      const sun = addDays(mon, 6);
      return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()} - ${mon.getMonth() !== sun.getMonth() ? MONTH_NAMES[sun.getMonth()] + " " : ""}${sun.getDate()}, ${sun.getFullYear()}`;
    }
    return formatDateLong(currentDate);
  }, [currentDate, view]);

  // ── Month grid cells ──
  const monthCells = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const start = getMonday(first);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      cells.push(d);
    }
    return cells;
  }, [currentDate]);

  // ── Week grid dates ──
  const weekDates = useMemo(() => {
    const mon = getMonday(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }, [currentDate]);

  // ── Hours array ──
  const hours = useMemo(() => Array.from({ length: 15 }, (_, i) => 6 + i), []);

  // ── Toggle filter ──
  const toggleFilter = (key) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Open event form ──
  const openNewEvent = () => {
    setEventForm({ ...emptyForm(), date: selectedDate || toStr(new Date()) });
    setShowEventForm(true);
  };

  const openEditEvent = (ev) => {
    if (!ev.raw || ["team", "gantt", "pto", "weather", "equipment", "sub"].includes(ev.type)) return;
    const raw = ev.raw;
    setEventForm({
      type: raw.type || "other",
      title: raw.title || "",
      projectId: raw.projectId || "",
      date: raw.date || "",
      allDay: raw.allDay || false,
      startTime: raw.startTime || "08:00",
      endTime: raw.endTime || "09:00",
      assignedTo: raw.assignedTo || [],
      recurrence: raw.recurrence || { freq: "none", until: "" },
      linkedRfiId: raw.linkedRfiId || "",
      linkedCOId: raw.linkedCOId || "",
      notes: raw.notes || "",
    });
    setShowEventForm(raw);
  };

  // ── Save event ──
  const saveEvent = () => {
    if (!eventForm.title.trim()) return;
    const now = new Date().toISOString();

    if (showEventForm && typeof showEventForm === "object" && showEventForm.id) {
      // Edit existing
      setCalendarEvents((prev) =>
        prev.map((ev) =>
          ev.id === showEventForm.id
            ? {
                ...ev,
                ...eventForm,
                projectId: eventForm.projectId || null,
                recurrence: eventForm.recurrence?.freq === "none" ? null : eventForm.recurrence,
                linkedRfiId: eventForm.linkedRfiId || null,
                linkedCOId: eventForm.linkedCOId || null,
                audit: [...(ev.audit || []), { action: "edited", at: now, by: "admin" }],
              }
            : ev
        )
      );
    } else {
      // Create new
      const newEv = {
        id: crypto.randomUUID(),
        type: eventForm.type,
        title: eventForm.title,
        projectId: eventForm.projectId || null,
        date: eventForm.date,
        allDay: eventForm.allDay,
        startTime: eventForm.allDay ? null : eventForm.startTime,
        endTime: eventForm.allDay ? null : eventForm.endTime,
        assignedTo: eventForm.assignedTo,
        location: "",
        notes: eventForm.notes,
        status: "scheduled",
        linkedRfiId: eventForm.linkedRfiId || null,
        linkedSubmittalId: null,
        linkedCOId: eventForm.linkedCOId || null,
        recurrence: eventForm.recurrence?.freq === "none" ? null : eventForm.recurrence,
        createdAt: now,
        createdBy: "admin",
        audit: [{ action: "created", at: now, by: "admin" }],
      };
      setCalendarEvents((prev) => [...prev, newEv]);
    }
    setShowEventForm(false);
  };

  // ── Delete event ──
  const deleteEvent = () => {
    if (showEventForm && typeof showEventForm === "object" && showEventForm.id) {
      setCalendarEvents((prev) => prev.filter((ev) => ev.id !== showEventForm.id));
    }
    setShowEventForm(false);
  };

  // ── Update form field ──
  const setField = (key, val) => setEventForm((prev) => ({ ...prev, [key]: val }));

  const toggleAssigned = (empId) => {
    setEventForm((prev) => {
      const list = prev.assignedTo.includes(empId)
        ? prev.assignedTo.filter((id) => id !== empId)
        : [...prev.assignedTo, empId];
      return { ...prev, assignedTo: list };
    });
  };

  // ── Format hour label ──
  const fmtHour = (h) => {
    if (h === 0 || h === 12) return h === 0 ? "12 AM" : "12 PM";
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  // ── Determine if an event falls in a given hour ──
  const eventInHour = (ev, hour) => {
    if (!ev.time) return hour === 6; // all-day at first row
    const h = parseInt(ev.time.split(":")[0], 10);
    return h === hour;
  };

  // ── Today string ──
  const todayStr = toStr(new Date());

  // ═══════════════════════════════════════════════════════════════
  //  Sub-tab bar
  // ═══════════════════════════════════════════════════════════════

  const SUB_TABS = [
    { key: "calendar", label: "Calendar" },
    { key: "lookahead", label: "Lookahead" },
    { key: "pto", label: "PTO" },
    { key: "equipment", label: "Equipment" },
    { key: "conflicts", label: "Conflicts" },
    { key: "analytics", label: "Analytics" },
  ];

  // ═══════════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="cal-container">
      {/* ── Sub-tab bar ── */}
      <div className="cal-sub-tabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`cal-sub-tab${calSubTab === tab.key ? " active" : ""}`}
              onClick={() => setCalSubTab(tab.key)}
            >
              {t(tab.label)}
              {tab.key === "conflicts" && unresolvedCount > 0 && (
                <span className="cal-conflict-badge">{unresolvedCount}</span>
              )}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { showWeekPlan ? setShowWeekPlan(false) : runWeekPlan(); }} disabled={weekPlanLoading}>
          {weekPlanLoading ? "Planning..." : "AI Week Plan"}
        </button>
      </div>

      {/* ── AI Week Plan Panel ── */}
      {showWeekPlan && weekPlanResult && (
        <div className="card mb-sp4 p-sp5 overflow-auto" style={{ maxHeight: 500 }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">AI Week Plan</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowWeekPlan(false)}>Close</button>
          </div>

          <div className="text-sm text-muted mb-16">{weekPlanResult.weekOverview}</div>

          {/* Daily Plan */}
          {weekPlanResult.dailyPlan?.length > 0 && (
            <div className="mb-sp4">
              <div className="text-sm font-semi mb-8">Daily Breakdown</div>
              <div className="gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                {weekPlanResult.dailyPlan.map((d, i) => (
                  <div key={i} style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: `1px solid ${d.priority === "high" ? "var(--amber)" : "var(--border)"}` }}>
                    <div className="flex-between mb-4">
                      <span className="font-semi text-sm">{d.day}</span>
                      <span className={`badge ${d.priority === "high" ? "badge-red" : d.priority === "light" ? "badge-green" : "badge-muted"} fs-xs`}>{d.priority}</span>
                    </div>
                    <div className="text-xs text-muted mb-4">{d.focus}</div>
                    {d.keyEvents?.map((e, j) => (
                      <div key={j} className="text-xs mb-sp1 c-amber">• {e}</div>
                    ))}
                    <div className="text-xs text-dim mt-4">{d.teamNeeds}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crew Allocation */}
          {weekPlanResult.teamAllocation?.length > 0 && (
            <div className="mb-sp4">
              <div className="text-sm font-semi mb-8">Crew Allocation</div>
              <table className="data-table fs-label">
                <thead><tr><th>Project</th><th>Crew</th><th>Trade</th><th>Days</th><th>Notes</th></tr></thead>
                <tbody>
                  {weekPlanResult.teamAllocation.map((c, i) => (
                    <tr key={i}>
                      <td className="font-semi">{c.project}</td>
                      <td>{c.recommendedCrew}</td>
                      <td>{c.trade}</td>
                      <td>{c.days}</td>
                      <td className="text-muted">{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Suggestions */}
          {weekPlanResult.suggestions?.length > 0 && (
            <div className="mb-sp4">
              <div className="text-sm font-semi mb-8 c-amber">Suggestions</div>
              {weekPlanResult.suggestions.map((s, i) => (
                <div key={i} className="border-b" style={{ padding: "var(--space-2) 0" }}>
                  <div className="flex-between">
                    <span className="text-sm">{s.suggestion}</span>
                    <span className={`badge ${s.priority === "high" ? "badge-red" : s.priority === "medium" ? "badge-amber" : "badge-muted"}`}>{s.priority}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{s.reason} — {s.impact}</div>
                </div>
              ))}
            </div>
          )}

          {/* Risks */}
          {weekPlanResult.risks?.length > 0 && (
            <div>
              <div className="text-sm font-semi mb-8">Risks</div>
              {weekPlanResult.risks.map((r, i) => (
                <div key={i} className="border-b" style={{ padding: "var(--space-2) 0" }}>
                  <div className="flex-between">
                    <span className="text-sm">{r.risk}</span>
                    <span className={`badge ${r.likelihood === "high" ? "badge-red" : r.likelihood === "medium" ? "badge-amber" : "badge-muted"}`}>{r.likelihood}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{r.mitigation}</div>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted mt-12">{weekPlanResult.summary}</div>
        </div>
      )}

      {/* ── Delegate to sub-components ── */}
      {calSubTab === "lookahead" && <CalendarLookahead app={app} lang={lang} />}
      {calSubTab === "pto" && <CalendarPTO app={app} lang={lang} />}
      {calSubTab === "equipment" && <CalendarEquipment app={app} lang={lang} />}
      {calSubTab === "conflicts" && <CalendarConflicts app={app} lang={lang} conflicts={conflicts} />}
      {calSubTab === "analytics" && <CalendarAnalytics app={app} lang={lang} />}

      {/* ── Main calendar ── */}
      {calSubTab === "calendar" && (
        <>
          {/* Toolbar */}
          <div className="cal-toolbar">
            <div className="cal-nav">
              <button className="cal-nav-btn" onClick={() => navigate(-1)}>&#8592;</button>
              <button className="cal-nav-btn today" onClick={goToday}>{t("Today")}</button>
              <button className="cal-nav-btn" onClick={() => navigate(1)}>&#8594;</button>
            </div>
            <div className="cal-title">{titleStr}</div>
            <div className="cal-view-toggle">
              {["month", "week", "day"].map((v) => (
                <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
                  {t(v.charAt(0).toUpperCase() + v.slice(1))}
                </button>
              ))}
            </div>
            <button className="cal-add-btn" onClick={openNewEvent}>+ {t("Add Event")}</button>
            <select
              className="bg-bg3 c-text" style={{ border: "1px solid var(--border)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius)", fontSize: "12px" }}
              value={filterProject || ""}
              onChange={(e) => setFilterProject(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t("All Projects")}</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Filter chips */}
          <div className="cal-filter-bar">
            {EVENT_TYPES.map((et) => (
              <div
                key={et.key}
                className={`cal-filter-chip${filterTypes.has(et.key) ? " active" : ""}`}
                style={filterTypes.has(et.key) ? { color: et.color, borderColor: et.color } : {}}
                onClick={() => toggleFilter(et.key)}
              >
                <span className="cal-filter-dot" style={{ background: et.color }} />
                {lang === "es" ? et.labelEs : et.label}
              </div>
            ))}
          </div>

          {/* ════════ Month View ════════ */}
          {view === "month" && (
            <div className="cal-month-grid">
              {DAY_LABELS.map((dl) => (
                <div key={dl} className="cal-month-header">{t(dl)}</div>
              ))}
              {monthCells.map((d, i) => {
                const ds = toStr(d);
                const evts = getEventsForDate(ds);
                const isToday = ds === todayStr;
                const isOther = d.getMonth() !== currentDate.getMonth();
                const isSelected = ds === selectedDate;
                const weather = weatherForDate(ds);
                const cls = [
                  "cal-month-cell",
                  isToday && "today",
                  isOther && "other",
                  isSelected && "selected",
                  evts.length > 0 && "has-events",
                ].filter(Boolean).join(" ");

                return (
                  <div key={i} className={cls} onClick={() => setSelectedDate(ds)}>
                    <div className="cal-month-date">{d.getDate()}</div>
                    {weather && <span className="cal-weather-icon">{getWeatherIcon(weather.condition)}</span>}
                    <div className="cal-events-wrap">
                      {evts.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="cal-event-chip"
                          style={{ background: ev.color }}
                          title={ev.title}
                          onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {evts.length > 3 && (
                        <span className="cal-more-badge">+{evts.length - 3} {t("more")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ════════ Week View ════════ */}
          {view === "week" && (
            <div className="cal-week-grid">
              {/* Header row */}
              <div className="cal-week-header" />
              {weekDates.map((d, i) => {
                const ds = toStr(d);
                return (
                  <div key={i} className={`cal-week-header${ds === todayStr ? " today" : ""}`}>
                    {t(DAY_LABELS[i])} {d.getDate()}
                  </div>
                );
              })}

              {/* All-day row */}
              <div className="cal-time-label" style={{ fontSize: "9px" }}>{t("All Day")}</div>
              {weekDates.map((d, i) => {
                const ds = toStr(d);
                const allDay = getEventsForDate(ds).filter((ev) => !ev.time);
                return (
                  <div key={i} className={`cal-week-cell${ds === todayStr ? " today" : ""}`} onClick={() => setSelectedDate(ds)}>
                    {allDay.map((ev) => (
                      <div key={ev.id} className="cal-week-event" style={{ background: ev.color }} title={ev.title} onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}>
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Hourly rows */}
              {hours.map((h) => (
                <React.Fragment key={h}>
                  <div className="cal-time-label">{fmtHour(h)}</div>
                  {weekDates.map((d, i) => {
                    const ds = toStr(d);
                    const evts = getEventsForDate(ds).filter((ev) => ev.time && eventInHour(ev, h));
                    return (
                      <div key={i} className={`cal-week-cell${ds === todayStr ? " today" : ""}`} onClick={() => setSelectedDate(ds)}>
                        {evts.map((ev) => (
                          <div key={ev.id} className="cal-week-event" style={{ background: ev.color }} title={ev.title} onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}>
                            {ev.time} {ev.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ════════ Day View ════════ */}
          {view === "day" && (() => {
            const ds = toStr(currentDate);
            const dayEvents = getEventsForDate(ds);
            const allDay = dayEvents.filter((ev) => !ev.time);
            return (
              <div className="cal-day-grid">
                {/* All day row */}
                {allDay.length > 0 && (
                  <div className="cal-day-row">
                    <div className="cal-day-time">{t("All Day")}</div>
                    <div className="cal-day-events">
                      {allDay.map((ev) => (
                        <div key={ev.id} className="cal-day-event-block" style={{ background: ev.color }} onClick={() => openEditEvent(ev)}>
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {hours.map((h) => {
                  const evts = dayEvents.filter((ev) => ev.time && eventInHour(ev, h));
                  return (
                    <div key={h} className="cal-day-row">
                      <div className="cal-day-time">{fmtHour(h)}</div>
                      <div className="cal-day-events">
                        {evts.map((ev) => (
                          <div key={ev.id} className="cal-day-event-block" style={{ background: ev.color }} onClick={() => openEditEvent(ev)}>
                            <span>{ev.title}</span>
                            <div className="cal-day-event-time">{ev.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ════════ Day Detail Panel ════════ */}
          {selectedDate && (() => {
            const evts = getEventsForDate(selectedDate);
            const grouped = {};
            for (const ev of evts) {
              if (!grouped[ev.type]) grouped[ev.type] = [];
              grouped[ev.type].push(ev);
            }
            const sd = toDate(selectedDate);
            return (
              <div className="cal-day-panel">
                <div className="cal-day-panel-title">
                  {formatDateLong(sd)}
                  <span className="c-text3 cursor-pointer" style={{ float: "right", fontSize: "14px" }} onClick={() => setSelectedDate(null)}>&#10005;</span>
                </div>
                {evts.length === 0 && (
                  <div className="c-text3" style={{ fontSize: "13px" }}>{t("No events on this date")}</div>
                )}
                {Object.entries(grouped).map(([typeKey, items]) => {
                  const et = getEventTypeObj(typeKey);
                  return (
                    <div key={typeKey} className="cal-day-section">
                      <div className="cal-day-section-title" style={{ color: et.color }}>
                        {lang === "es" ? et.labelEs : et.label}
                      </div>
                      {items.map((ev) => {
                        const proj = ev.projectId ? (projects || []).find((p) => String(p.id) === String(ev.projectId)) : null;
                        return (
                          <div key={ev.id} className="cal-day-event" onClick={() => openEditEvent(ev)}>
                            <span className="cal-day-event-dot" style={{ background: ev.color }} />
                            <div className="cal-day-event-info">
                              <div className="cal-day-event-title">{ev.title}</div>
                              <div className="cal-day-event-meta">
                                {ev.time && <span>{ev.time}</span>}
                                {proj && <span>{ev.time ? " · " : ""}{proj.name}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
           Event Form Modal
         ═══════════════════════════════════════════════════════════ */}
      {showEventForm && (
        <div className="cal-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEventForm(false); }}>
          <div className="cal-modal">
            <div className="cal-modal-title">
              {typeof showEventForm === "object" && showEventForm.id ? t("Edit Event") : t("New Event")}
            </div>

            <div className="cal-event-form">
              {/* Event type selector */}
              <div>
                <label>{t("Event Type")}</label>
                <div className="cal-event-type-grid">
                  {MANUAL_TYPES.map((et) => (
                    <div
                      key={et.key}
                      className={`cal-event-type-card${eventForm.type === et.key ? " active" : ""}`}
                      onClick={() => setField("type", et.key)}
                    >
                      <span className="cal-filter-dot mr-sp1" style={{ background: et.color, display: "inline-block" }} />
                      {lang === "es" ? et.labelEs : et.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label>{t("Title")}</label>
                <input type="text" value={eventForm.title} onChange={(e) => setField("title", e.target.value)} placeholder={t("Event title...")} />
              </div>

              <div className="form-grid">
                {/* Project */}
                <div>
                  <label>{t("Project")}</label>
                  <select value={eventForm.projectId} onChange={(e) => setField("projectId", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">{t("None")}</option>
                    {(projects || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label>{t("Date")}</label>
                  <input type="date" value={eventForm.date} onChange={(e) => setField("date", e.target.value)} />
                </div>
              </div>

              {/* All Day */}
              <div className="cal-checkbox-row">
                <input type="checkbox" checked={eventForm.allDay} onChange={(e) => setField("allDay", e.target.checked)} />
                {t("All Day")}
              </div>

              {/* Times */}
              {!eventForm.allDay && (
                <div className="form-grid">
                  <div>
                    <label>{t("Start Time")}</label>
                    <input type="time" value={eventForm.startTime} onChange={(e) => setField("startTime", e.target.value)} />
                  </div>
                  <div>
                    <label>{t("End Time")}</label>
                    <input type="time" value={eventForm.endTime} onChange={(e) => setField("endTime", e.target.value)} />
                  </div>
                </div>
              )}

              {/* Assigned To */}
              <div>
                <label>{t("Assigned To")}</label>
                <div className="cal-multi-select">
                  {(employees || []).map((emp) => {
                    const active = eventForm.assignedTo.includes(emp.id);
                    return active ? (
                      <span key={emp.id} className="cal-multi-tag">
                        {emp.name}
                        <button onClick={() => toggleAssigned(emp.id)}>&#10005;</button>
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="mt-sp1 gap-sp1 flex-wrap" style={{ display: "flex" }}>
                  {(employees || [])
                    .filter((emp) => !eventForm.assignedTo.includes(emp.id))
                    .map((emp) => (
                      <span
                        key={emp.id}
                        className="rounded-control fs-tab bg-bg3 c-text2 cursor-pointer" style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--border)" }}
                        onClick={() => toggleAssigned(emp.id)}
                      >
                        + {emp.name}
                      </span>
                    ))}
                </div>
              </div>

              {/* Recurrence */}
              <div className="form-grid">
                <div>
                  <label>{t("Recurrence")}</label>
                  <select
                    value={eventForm.recurrence?.freq || "none"}
                    onChange={(e) => setField("recurrence", { ...eventForm.recurrence, freq: e.target.value })}
                  >
                    <option value="none">{t("None")}</option>
                    <option value="weekly">{t("Weekly")}</option>
                    <option value="biweekly">{t("Biweekly")}</option>
                    <option value="monthly">{t("Monthly")}</option>
                  </select>
                </div>
                {eventForm.recurrence?.freq && eventForm.recurrence.freq !== "none" && (
                  <div>
                    <label>{t("Until")}</label>
                    <input
                      type="date"
                      value={eventForm.recurrence?.until || ""}
                      onChange={(e) => setField("recurrence", { ...eventForm.recurrence, until: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Link RFI */}
              <div className="form-grid">
                <div>
                  <label>{t("Link RFI")}</label>
                  <select value={eventForm.linkedRfiId} onChange={(e) => setField("linkedRfiId", e.target.value)}>
                    <option value="">{t("None")}</option>
                    {(app.rfis || []).map((r) => (
                      <option key={r.id} value={r.id}>RFI #{r.number || r.id} — {r.subject || r.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>{t("Link Change Order")}</label>
                  <select value={eventForm.linkedCOId} onChange={(e) => setField("linkedCOId", e.target.value)}>
                    <option value="">{t("None")}</option>
                    {(app.changeOrders || []).map((co) => (
                      <option key={co.id} value={co.id}>CO #{co.number || co.id} — {co.description || co.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label>{t("Notes")}</label>
                <textarea value={eventForm.notes} onChange={(e) => setField("notes", e.target.value)} placeholder={t("Additional notes...")} />
              </div>
            </div>

            {/* Actions */}
            <div className="cal-modal-actions">
              {typeof showEventForm === "object" && showEventForm.id && (
                <button className="secondary c-red" style={{ borderColor: "var(--red)", marginRight: "auto" }} onClick={deleteEvent}>
                  {t("Delete")}
                </button>
              )}
              <button className="secondary" onClick={() => setShowEventForm(false)}>{t("Cancel")}</button>
              <button className="primary" onClick={saveEvent}>{t("Save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
