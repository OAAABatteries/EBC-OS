// ═══════════════════════════════════════════════════════════════
//  Conflict Detection Engine — Pure functions, no React
//  Called via useMemo in CalendarView to detect scheduling issues
// ═══════════════════════════════════════════════════════════════

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// ── Helpers ──

function toDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function datesOverlap(s1, e1, s2, e2) {
  return s1 <= e2 && s2 <= e1;
}

function parseHours(start, end) {
  if (!start || !end) return 8;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}

function empName(empId, employees) {
  const e = employees.find(x => x.id === empId);
  return e ? e.name : `Employee #${empId}`;
}

function projName(projId, projects) {
  const p = projects?.find(x => x.id === projId);
  return p ? p.name : `Project #${projId}`;
}

// ── Get team schedule entries for a specific date ──
export function getCrewForDate(date, teamSchedule) {
  const d = typeof date === "string" ? toDate(date) : date;
  const monday = getMonday(d);
  const weekStr = toStr(monday);
  const dayIdx = (d.getDay() + 6) % 7; // 0=mon, 6=sun
  const dayKey = DAY_KEYS[dayIdx];

  return teamSchedule.filter(cs => {
    if (cs.weekStart !== weekStr) return false;
    return cs.days?.[dayKey];
  });
}

// ── Employee weekly hours from team schedule ──
export function getEmployeeWeeklyHours(empId, teamSchedule, weekStart) {
  const entries = teamSchedule.filter(cs => cs.weekStart === weekStart && cs.employeeId === empId);
  let total = 0;
  for (const cs of entries) {
    const dayCount = DAY_KEYS.filter(k => cs.days?.[k]).length;
    const dailyHours = parseHours(cs.hours?.start, cs.hours?.end);
    total += dayCount * dailyHours;
  }
  return total;
}

// ── Count consecutive scheduled days for an employee ──
export function getConsecutiveDays(empId, teamSchedule) {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    const teamList = getCrewForDate(d, teamSchedule);
    if (teamList.some(cs => cs.employeeId === empId)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════
//  Individual Detectors
// ═══════════════════════════════════════════════════════════════

// 1. Employee double-booking (same employee, 2+ projects, same day)
export function detectDoubleBooking(teamSchedule, employees, projects, dateRange) {
  const conflicts = [];
  const { start, end } = dateRange;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const teamList = getCrewForDate(d, teamSchedule);
    const byEmployee = {};
    for (const cs of teamList) {
      if (!byEmployee[cs.employeeId]) byEmployee[cs.employeeId] = [];
      byEmployee[cs.employeeId].push(cs);
    }
    for (const [empIdStr, entries] of Object.entries(byEmployee)) {
      const uniqueProjects = [...new Set(entries.map(e => e.projectId))];
      if (uniqueProjects.length > 1) {
        const empId = Number(empIdStr);
        conflicts.push({
          id: `db_${empId}_${toStr(d)}`,
          type: "double_book",
          severity: "error",
          date: toStr(d),
          entityType: "employee",
          entityId: empId,
          description: `${empName(empId, employees)} assigned to ${uniqueProjects.length} projects: ${uniqueProjects.map(p => projName(p, projects)).join(", ")}`,
          relatedIds: { teamScheduleIds: entries.map(e => e.id) },
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return conflicts;
}

// 2. Equipment double-booking
export function detectEquipmentConflicts(equipmentBookings, equipment, projects) {
  const conflicts = [];
  const active = equipmentBookings.filter(b => b.status === "confirmed");
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if (a.equipmentId === b.equipmentId && datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
        const eq = equipment.find(e => e.id === a.equipmentId);
        conflicts.push({
          id: `eqdb_${a.id}_${b.id}`,
          type: "equipment_double_book",
          severity: "error",
          date: a.startDate,
          entityType: "equipment",
          entityId: a.equipmentId,
          description: `${eq?.name || a.equipmentId} double-booked: ${projName(a.projectId, projects)} & ${projName(b.projectId, projects)}`,
          relatedIds: { bookingIds: [a.id, b.id] },
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return conflicts;
}

// 3. Certification expirations
export function detectCertExpirations(certifications, employees, daysAhead = 30) {
  const conflicts = [];
  const cutoff = addDays(new Date(), daysAhead);
  const today = new Date();
  for (const cert of certifications) {
    const exp = toDate(cert.expiryDate);
    if (exp <= cutoff) {
      const isExpired = exp <= today;
      conflicts.push({
        id: `cert_${cert.id}`,
        type: "cert_expiring",
        severity: isExpired ? "error" : "warning",
        date: cert.expiryDate,
        entityType: "employee",
        entityId: cert.employeeId,
        description: `${empName(cert.employeeId, employees)} — ${cert.name} ${isExpired ? "EXPIRED" : "expires"} ${cert.expiryDate}`,
        relatedIds: { certId: cert.id },
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return conflicts;
}

// 4. Overtime risk (approaching 40h)
export function detectOvertimeRisk(teamSchedule, employees, dateRange) {
  const conflicts = [];
  const monday = getMonday(dateRange.start);
  const weekStr = toStr(monday);
  for (const emp of employees) {
    if (!emp.active) continue;
    const hours = getEmployeeWeeklyHours(emp.id, teamSchedule, weekStr);
    if (hours > 40) {
      conflicts.push({
        id: `ot_${emp.id}_${weekStr}`,
        type: "ot_threshold",
        severity: "warning",
        date: weekStr,
        entityType: "employee",
        entityId: emp.id,
        description: `${emp.name} scheduled for ${hours.toFixed(1)}h this week (>${40}h OT threshold)`,
        relatedIds: {},
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    } else if (hours >= 36) {
      conflicts.push({
        id: `ot_risk_${emp.id}_${weekStr}`,
        type: "ot_threshold",
        severity: "info",
        date: weekStr,
        entityType: "employee",
        entityId: emp.id,
        description: `${emp.name} at ${hours.toFixed(1)}h — approaching OT threshold`,
        relatedIds: {},
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return conflicts;
}

// 5. Fatigue (consecutive days > maxConsecutive)
export function detectFatigue(teamSchedule, employees, maxConsecutive = 6) {
  const conflicts = [];
  for (const emp of employees) {
    if (!emp.active) continue;
    const consecutive = getConsecutiveDays(emp.id, teamSchedule);
    if (consecutive >= maxConsecutive) {
      conflicts.push({
        id: `fatigue_${emp.id}`,
        type: "fatigue",
        severity: consecutive >= 10 ? "error" : "warning",
        date: toStr(new Date()),
        entityType: "employee",
        entityId: emp.id,
        description: `${emp.name} has worked ${consecutive} consecutive days`,
        relatedIds: {},
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return conflicts;
}

// 6. Apprentice-to-journeyman ratio
export function detectRatioViolation(teamSchedule, employees, projects, dateRange) {
  const conflicts = [];
  const { start, end } = dateRange;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const teamList = getCrewForDate(d, teamSchedule);
    const byProject = {};
    for (const cs of teamList) {
      if (!byProject[cs.projectId]) byProject[cs.projectId] = [];
      byProject[cs.projectId].push(cs);
    }
    for (const [projIdStr, entries] of Object.entries(byProject)) {
      let apprentices = 0, journeymen = 0;
      for (const cs of entries) {
        const emp = employees.find(e => e.id === cs.employeeId);
        if (emp?.role === "Apprentice") apprentices++;
        if (emp?.role === "Journeyman" || emp?.role === "Foreman") journeymen++;
      }
      if (apprentices > 0 && journeymen === 0) {
        conflicts.push({
          id: `ratio_${projIdStr}_${toStr(d)}`,
          type: "ratio_violation",
          severity: "error",
          date: toStr(d),
          entityType: "project",
          entityId: Number(projIdStr),
          description: `${projName(Number(projIdStr), projects)}: ${apprentices} apprentice(s) with no journeyman/foreman`,
          relatedIds: {},
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      } else if (apprentices > journeymen && journeymen > 0) {
        conflicts.push({
          id: `ratio_warn_${projIdStr}_${toStr(d)}`,
          type: "ratio_violation",
          severity: "warning",
          date: toStr(d),
          entityType: "project",
          entityId: Number(projIdStr),
          description: `${projName(Number(projIdStr), projects)}: ${apprentices} apprentice(s) vs ${journeymen} journeyman(s) — ratio > 1:1`,
          relatedIds: {},
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return conflicts;
}

// 7. Permit expiration
export function detectPermitExpiration(calendarEvents, daysAhead = 14) {
  const conflicts = [];
  const cutoff = addDays(new Date(), daysAhead);
  const today = new Date();
  const permits = calendarEvents.filter(e => e.type === "permit" && e.status === "scheduled");
  for (const p of permits) {
    const expDate = toDate(p.date);
    if (expDate <= cutoff && expDate >= today) {
      conflicts.push({
        id: `permit_${p.id}`,
        type: "permit_expiring",
        severity: "warning",
        date: p.date,
        entityType: "project",
        entityId: p.projectId,
        description: `Permit "${p.title}" on ${p.date}`,
        relatedIds: { eventId: p.id },
        resolved: false,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return conflicts;
}

// 8. Foreman overload (on 3+ projects same day)
export function detectForemanOverload(teamSchedule, employees, projects, dateRange) {
  const conflicts = [];
  const foremen = employees.filter(e => e.role === "Foreman" && e.active);
  const { start, end } = dateRange;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const teamList = getCrewForDate(d, teamSchedule);
    for (const f of foremen) {
      const assignments = teamList.filter(cs => cs.employeeId === f.id);
      const uniqueProjects = [...new Set(assignments.map(a => a.projectId))];
      if (uniqueProjects.length >= 3) {
        conflicts.push({
          id: `overload_${f.id}_${toStr(d)}`,
          type: "capacity_exceeded",
          severity: "warning",
          date: toStr(d),
          entityType: "employee",
          entityId: f.id,
          description: `${f.name} assigned to ${uniqueProjects.length} projects on ${toStr(d)}`,
          relatedIds: {},
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return conflicts;
}

// 9. PTO conflicts (approved PTO but still on team schedule)
export function detectPtoConflicts(ptoRequests, teamSchedule, employees) {
  const conflicts = [];
  const approved = ptoRequests.filter(p => p.status === "approved");
  for (const pto of approved) {
    const start = toDate(pto.startDate);
    const end = toDate(pto.endDate);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const teamList = getCrewForDate(d, teamSchedule);
      const assigned = teamList.filter(cs => cs.employeeId === pto.employeeId);
      if (assigned.length > 0) {
        conflicts.push({
          id: `pto_${pto.id}_${toStr(d)}`,
          type: "pto_conflict",
          severity: "error",
          date: toStr(d),
          entityType: "employee",
          entityId: pto.employeeId,
          description: `${empName(pto.employeeId, employees)} has approved PTO but is on team schedule`,
          relatedIds: { ptoId: pto.id },
          resolved: false,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return conflicts;
}

// ═══════════════════════════════════════════════════════════════
//  Main Entry Point
// ═══════════════════════════════════════════════════════════════

export function detectAllConflicts({
  teamSchedule, employees, projects, equipment, equipmentBookings,
  certifications, calendarEvents, ptoRequests, dateRange,
}) {
  const start = dateRange?.start ? toDate(dateRange.start) : getMonday(new Date());
  const end = dateRange?.end ? toDate(dateRange.end) : addDays(start, 27);
  const range = { start, end };

  const all = [
    ...detectDoubleBooking(teamSchedule || [], employees || [], projects || [], range),
    ...detectEquipmentConflicts(equipmentBookings || [], equipment || [], projects || []),
    ...detectCertExpirations(certifications || [], employees || [], 30),
    ...detectOvertimeRisk(teamSchedule || [], employees || [], range),
    ...detectFatigue(teamSchedule || [], employees || [], 6),
    ...detectRatioViolation(teamSchedule || [], employees || [], projects || [], range),
    ...detectPermitExpiration(calendarEvents || [], 14),
    ...detectForemanOverload(teamSchedule || [], employees || [], projects || [], range),
    ...detectPtoConflicts(ptoRequests || [], teamSchedule || [], employees || []),
  ];

  // Deduplicate by id
  const seen = new Set();
  return all.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
