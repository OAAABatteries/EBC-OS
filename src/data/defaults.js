// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Default Empty State
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

export const EMPTY_STATE = {
  bids: [],
  projects: [],
  contacts: [],
  callLog: [],
  invoices: [],
  changeOrders: [],
  rfis: [],
  submittals: [],
  schedule: [],
  incidents: [],
  toolboxTalks: [],
  dailyReports: [],
  takeoffs: [],
  employees: [],
  timeEntries: [],
  teamSchedule: [],
  materialRequests: [],
  tmTickets: [],
  jsas: [],
  calendarEvents: [],
  ptoRequests: [],
  equipment: [],
  equipmentBookings: [],
  certifications: [],
  subSchedule: [],
  weatherAlerts: [],
  scheduleConflicts: [],
};

/**
 * Check if demo mode is enabled
 */
export function isDemoMode() {
  try {
    return window.localStorage.getItem("ebc_demo_mode") === "true";
  } catch {
    return false;
  }
}
