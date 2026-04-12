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
    access: ["dashboard", "bids", "projects", "estimating", "financials", "documents", "calendar", "schedule", "reports", "safety", "jsa", "materials", "deliveries", "incentives", "scope", "contacts", "timeclock", "sds", "map", "settings"],
    description: "Manage assigned projects and bids"
  },
  estimator: {
    label: "Estimator",
    access: ["dashboard", "bids", "estimating", "materials", "contacts", "documents", "sds"],
    description: "Estimating and bid management"
  },
  project_engineer: {
    label: "Project Engineer",
    access: ["dashboard", "bids", "projects", "estimating", "documents", "calendar", "schedule", "reports", "materials", "scope", "contacts", "sds"],
    description: "Project support, submittals, RFIs, documents"
  },
  foreman: {
    label: "Superintendent / Foreman",
    access: ["dashboard", "projects", "schedule", "reports", "safety", "jsa", "materials", "deliveries", "timeclock", "sds", "map", "settings"],
    description: "Field operations and team management"
  },
  safety: {
    label: "Safety Officer",
    access: ["dashboard", "safety", "jsa", "reports", "schedule", "sds", "settings"],
    description: "Safety compliance, JSAs, incident reporting"
  },
  accounting: {
    label: "Accounting",
    access: ["dashboard", "financials", "timeclock", "reports", "contacts", "projects", "calendar", "schedule", "sds", "settings"],
    description: "Invoices, change orders, payroll, project budgets, PTO visibility"
  },
  office_admin: {
    label: "Office Admin",
    access: ["dashboard", "bids", "projects", "financials", "documents", "calendar", "contacts", "timeclock", "sds", "reports", "settings"],
    description: "Office operations, documents, scheduling"
  },
  employee: {
    label: "Employee / Team",
    access: ["dashboard", "timeclock", "schedule", "materials", "sds", "settings"],
    description: "Clock in/out, schedule, material requests"
  },
  driver: {
    label: "Driver",
    access: ["dashboard", "deliveries", "materials", "sds", "settings"],
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
