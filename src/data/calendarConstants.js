// ═══════════════════════════════════════════════════════════════
//  Calendar Module — Data Models, Enums, Seed Data
// ═══════════════════════════════════════════════════════════════

// ── Event Type Registry ──
export const EVENT_TYPES = [
  { key: "inspection", label: "Inspection", labelEs: "Inspección", color: "#3b82f6" },
  { key: "meeting", label: "Meeting", labelEs: "Reunión", color: "#8b5cf6" },
  { key: "training", label: "Training", labelEs: "Capacitación", color: "#06b6d4" },
  { key: "permit", label: "Permit", labelEs: "Permiso", color: "#f59e0b" },
  { key: "toolbox", label: "Toolbox Talk", labelEs: "Charla de Seguridad", color: "#10b981" },
  { key: "delivery", label: "Delivery", labelEs: "Entrega", color: "#ec4899" },
  { key: "safety_standown", label: "Safety Stand-Down", labelEs: "Parada de Seguridad", color: "#ef4444" },
  { key: "mobilization", label: "Mobilization", labelEs: "Movilización", color: "#f97316" },
  { key: "punchlist", label: "Punchlist", labelEs: "Lista de Pendientes", color: "#a855f7" },
  { key: "commissioning", label: "Commissioning", labelEs: "Comisionamiento", color: "#14b8a6" },
  { key: "pto", label: "PTO", labelEs: "Tiempo Libre", color: "#64748b" },
  { key: "weather", label: "Weather", labelEs: "Clima", color: "#78716c" },
  { key: "crew", label: "Crew Assignment", labelEs: "Asignación", color: "#e09422" },
  { key: "gantt", label: "Gantt Task", labelEs: "Tarea Gantt", color: "#22c55e" },
  { key: "equipment", label: "Equipment", labelEs: "Equipo", color: "#0ea5e9" },
  { key: "sub", label: "Subcontractor", labelEs: "Subcontratista", color: "#d946ef" },
  { key: "other", label: "Other", labelEs: "Otro", color: "#94a3b8" },
];

export const CONFLICT_TYPES = [
  "double_book",
  "equipment_double_book",
  "cert_expiring",
  "ot_threshold",
  "fatigue",
  "ratio_violation",
  "phase_overlap",
  "permit_expiring",
  "sub_conflict",
  "capacity_exceeded",
  "pto_conflict",
];

export const PTO_TYPES = [
  { key: "vacation", label: "Vacation", labelEs: "Vacaciones" },
  { key: "sick", label: "Sick Leave", labelEs: "Incapacidad" },
  { key: "personal", label: "Personal", labelEs: "Personal" },
  { key: "bereavement", label: "Bereavement", labelEs: "Duelo" },
  { key: "jury_duty", label: "Jury Duty", labelEs: "Jurado" },
];

export const WEATHER_CONDITIONS = [
  { key: "clear", label: "Clear", icon: "☀️" },
  { key: "rain", label: "Rain", icon: "🌧️" },
  { key: "thunderstorm", label: "Thunderstorm", icon: "⛈️" },
  { key: "heat", label: "Extreme Heat", icon: "🔥" },
  { key: "freeze", label: "Freeze", icon: "❄️" },
  { key: "wind", label: "High Wind", icon: "💨" },
];

export const EQUIPMENT_TYPES = [
  "lift", "scaffolding", "pump", "vehicle", "dumpster", "generator", "laser", "crane", "compressor", "welder",
];

// ── Seed Data: Calendar Events ──
export const initCalendarEvents = [
  {
    id: "ce_1", type: "inspection", title: "Framing Inspection — Level 2",
    projectId: 1, date: "2026-03-20", startTime: "09:00", endTime: "11:00",
    allDay: false, assignedTo: [1], location: "", notes: "City inspector confirmed",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-13T10:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_2", type: "meeting", title: "Weekly OAC Meeting",
    projectId: 1, date: "2026-03-17", startTime: "10:00", endTime: "11:30",
    allDay: false, assignedTo: [1, 5], location: "Jobsite trailer", notes: "",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: { freq: "weekly", until: "2026-08-31" },
    createdAt: "2026-03-01T08:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_3", type: "toolbox", title: "Fall Protection Refresher",
    projectId: 1, date: "2026-03-18", startTime: "06:30", endTime: "07:00",
    allDay: false, assignedTo: [1, 2, 3, 4], location: "", notes: "",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-10T09:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_4", type: "delivery", title: "Drywall Material Delivery",
    projectId: 1, date: "2026-03-19", startTime: "07:00", endTime: "08:00",
    allDay: false, assignedTo: [7], location: "Loading dock", notes: "12 pallets — Georgia Pacific",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-12T14:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_5", type: "permit", title: "Hot Work Permit — Welding Level 3",
    projectId: 1, date: "2026-03-25", startTime: null, endTime: null,
    allDay: true, assignedTo: [2], location: "", notes: "Fire watch required",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-13T11:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_6", type: "training", title: "OSHA 10 — New Hire Orientation",
    projectId: null, date: "2026-03-24", startTime: "08:00", endTime: "17:00",
    allDay: false, assignedTo: [3], location: "Office", notes: "",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-13T12:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_7", type: "mobilization", title: "Mobilize to Escapology SA",
    projectId: 2, date: "2026-04-01", startTime: null, endTime: null,
    allDay: true, assignedTo: [1, 2, 4], location: "", notes: "Tool trailer + generator",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-13T13:00:00Z", createdBy: "admin", audit: [],
  },
  {
    id: "ce_8", type: "safety_standown", title: "Company Safety Stand-Down",
    projectId: null, date: "2026-04-08", startTime: "06:30", endTime: "08:00",
    allDay: false, assignedTo: [1, 2, 3, 4, 5, 6, 7], location: "All sites",
    notes: "OSHA National Safety Stand-Down — Fall Prevention",
    status: "scheduled", linkedRfiId: null, linkedSubmittalId: null, linkedCOId: null,
    recurrence: null, createdAt: "2026-03-13T14:00:00Z", createdBy: "admin", audit: [],
  },
];

// ── Seed Data: PTO Requests ──
export const initPtoRequests = [
  {
    id: "pto_1", employeeId: 3, type: "vacation",
    startDate: "2026-04-06", endDate: "2026-04-10",
    status: "pending", reason: "Family vacation",
    reviewedBy: null, reviewedAt: null,
    createdAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "pto_2", employeeId: 6, type: "personal",
    startDate: "2026-03-21", endDate: "2026-03-21",
    status: "approved", reason: "Appointment",
    reviewedBy: "admin", reviewedAt: "2026-03-11T10:00:00Z",
    createdAt: "2026-03-09T08:00:00Z",
  },
];

// ── Seed Data: Equipment ──
export const initEquipment = [
  { id: "eq_1", name: "Scissor Lift #1", type: "lift", status: "available" },
  { id: "eq_2", name: "Scissor Lift #2", type: "lift", status: "available" },
  { id: "eq_3", name: "Scaffolding Set A", type: "scaffolding", status: "available" },
  { id: "eq_4", name: "Scaffolding Set B", type: "scaffolding", status: "available" },
  { id: "eq_5", name: "Concrete Pump", type: "pump", status: "available" },
  { id: "eq_6", name: "Box Truck #1", type: "vehicle", status: "available" },
  { id: "eq_7", name: "Box Truck #2", type: "vehicle", status: "available" },
  { id: "eq_8", name: "20yd Dumpster", type: "dumpster", status: "available" },
  { id: "eq_9", name: "Generator 7500W", type: "generator", status: "available" },
  { id: "eq_10", name: "Laser Level (Topcon)", type: "laser", status: "available" },
];

// ── Seed Data: Equipment Bookings ──
export const initEquipmentBookings = [
  {
    id: "eb_1", equipmentId: "eq_1", projectId: 1,
    startDate: "2026-03-16", endDate: "2026-03-21",
    status: "confirmed", bookedBy: "admin",
    bookedAt: "2026-03-13T10:00:00Z", notes: "Ceiling work Level 2",
  },
  {
    id: "eb_2", equipmentId: "eq_8", projectId: 1,
    startDate: "2026-03-09", endDate: "2026-03-28",
    status: "confirmed", bookedBy: "admin",
    bookedAt: "2026-03-08T09:00:00Z", notes: "Demo debris",
  },
];

// ── Seed Data: Certifications ──
export const initCertifications = [
  { id: "cert_1", employeeId: 1, name: "OSHA 30", issueDate: "2025-06-15", expiryDate: "2028-06-15", status: "valid" },
  { id: "cert_2", employeeId: 1, name: "Fall Protection Competent Person", issueDate: "2025-09-01", expiryDate: "2026-09-01", status: "valid" },
  { id: "cert_3", employeeId: 1, name: "First Aid / CPR", issueDate: "2025-04-01", expiryDate: "2027-04-01", status: "valid" },
  { id: "cert_4", employeeId: 2, name: "OSHA 10", issueDate: "2025-03-01", expiryDate: "2028-03-01", status: "valid" },
  { id: "cert_5", employeeId: 2, name: "Confined Space Entry", issueDate: "2025-10-01", expiryDate: "2026-10-01", status: "valid" },
  { id: "cert_6", employeeId: 3, name: "Forklift Operator", issueDate: "2025-08-01", expiryDate: "2026-08-01", status: "valid" },
  { id: "cert_7", employeeId: 4, name: "OSHA 10", issueDate: "2025-05-15", expiryDate: "2028-05-15", status: "valid" },
  { id: "cert_8", employeeId: 4, name: "Confined Space Entry", issueDate: "2025-10-01", expiryDate: "2026-10-01", status: "valid" },
  { id: "cert_9", employeeId: 5, name: "OSHA 30", issueDate: "2024-11-01", expiryDate: "2027-11-01", status: "valid" },
  { id: "cert_10", employeeId: 5, name: "First Aid / CPR", issueDate: "2025-06-01", expiryDate: "2027-06-01", status: "valid" },
  { id: "cert_11", employeeId: 6, name: "OSHA 10", issueDate: "2025-07-01", expiryDate: "2028-07-01", status: "valid" },
  { id: "cert_12", employeeId: 7, name: "CDL Class B", issueDate: "2025-01-15", expiryDate: "2027-01-15", status: "valid" },
  { id: "cert_13", employeeId: 7, name: "OSHA 10", issueDate: "2025-02-01", expiryDate: "2028-02-01", status: "valid" },
];

// ── Seed Data: Subcontractor Schedule ──
export const initSubSchedule = [
  {
    id: "ss_1", projectId: 1, subName: "Lone Star Painting",
    trade: "Painting", startDate: "2026-05-15", endDate: "2026-06-15",
    area: "Levels 1-3", notes: "Two coats — Sherwin-Williams spec",
    contactName: "Marco Reyes", contactPhone: "713-555-8001",
  },
  {
    id: "ss_2", projectId: 1, subName: "Gulf Coast Mechanical",
    trade: "HVAC", startDate: "2026-04-01", endDate: "2026-05-30",
    area: "All levels", notes: "Ductwork + VAV boxes",
    contactName: "James Chen", contactPhone: "713-555-8002",
  },
  {
    id: "ss_3", projectId: 2, subName: "Apex Electrical",
    trade: "Electrical", startDate: "2026-04-10", endDate: "2026-06-01",
    area: "Full build-out", notes: "",
    contactName: "Tony Nguyen", contactPhone: "210-555-8003",
  },
];

// ── Seed Data: Weather Alerts ──
export const initWeatherAlerts = [
  {
    id: "wa_1", projectId: 1, date: "2026-03-18",
    condition: "thunderstorm", highTemp: 78,
    advisory: "Severe thunderstorm watch — secure materials",
    impactsWork: true, createdAt: "2026-03-17T06:00:00Z",
  },
  {
    id: "wa_2", projectId: 1, date: "2026-03-25",
    condition: "heat", highTemp: 98,
    advisory: "Heat advisory — mandatory water breaks every 30 min",
    impactsWork: false, createdAt: "2026-03-24T06:00:00Z",
  },
];

// ── Seed Data: Schedule Conflicts (starts empty — computed at runtime) ──
export const initScheduleConflicts = [];
