// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Role Definitions
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

export const ROLES = {
  owner: {
    label: "Owner",
    access: ["*"],
    description: "Full system access — all financials, projects, settings, user management"
  },
  admin: {
    label: "Admin",
    access: ["*"],
    description: "Full system access — all features, settings, user management"
  },
  pm: {
    label: "Project Manager",
    access: ["dashboard", "bids", "projects", "estimating", "financials", "documents", "calendar", "schedule", "reports", "safety", "jsa", "materials", "incentives", "scope", "contacts", "timeclock", "map", "settings"],
    description: "Manage assigned projects and bids"
  },
  estimator: {
    label: "Estimator",
    access: ["dashboard", "bids", "estimating", "materials", "contacts", "documents"],
    description: "Estimating and bid management"
  },
  project_engineer: {
    label: "Project Engineer",
    access: ["dashboard", "bids", "projects", "estimating", "documents", "calendar", "schedule", "reports", "materials", "scope", "contacts"],
    description: "Project support, submittals, RFIs, documents"
  },
  foreman: {
    label: "Superintendent / Foreman",
    access: ["dashboard", "projects", "schedule", "reports", "safety", "jsa", "materials", "timeclock", "map", "settings"],
    description: "Field operations and crew management"
  },
  safety: {
    label: "Safety Officer",
    access: ["dashboard", "safety", "jsa", "reports", "schedule", "settings"],
    description: "Safety compliance, JSAs, incident reporting"
  },
  accounting: {
    label: "Accounting",
    access: ["dashboard", "financials", "timeclock", "reports", "contacts", "settings"],
    description: "Invoices, change orders, payroll"
  },
  office_admin: {
    label: "Office Admin",
    access: ["dashboard", "bids", "projects", "financials", "documents", "calendar", "contacts", "timeclock", "reports", "settings"],
    description: "Office operations, documents, scheduling"
  },
  employee: {
    label: "Employee / Crew",
    access: ["employee_portal"],
    description: "Clock in/out, schedule, pay stubs"
  },
  driver: {
    label: "Driver",
    access: ["driver_portal"],
    description: "Delivery queue, transit status, material requests"
  }
};

/**
 * Check if a role has access to a given tab/feature
 */
export function hasAccess(role, tabKey) {
  const r = ROLES[role];
  if (!r) return false;
  if (r.access.includes("*")) return true;
  return r.access.includes(tabKey);
}
