// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Seed Accounts
//  Eagles Brothers Constructors · Houston, TX
//  ⚠️ TEMP PASSWORDS — All users should change on first login
// ═══════════════════════════════════════════════════════════════

const hash = (str) => btoa(encodeURIComponent(str));

export const SEED_ACCOUNTS = [
  {
    id: 1,
    name: "Emmanuel Aguilar",
    email: "emmanuel@ebconstructors.com",
    password: hash("Emmanuel123!"),
    role: "owner",
    pin: "1001",
    title: "Owner / Senior PM / Senior Estimator",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Oscar Aguilar",
    email: "oscar@ebconstructors.com",
    password: hash("Oscar123!"),
    role: "owner",
    pin: "1002",
    title: "Senior Superintendent / Owner",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Abner Aguilar",
    email: "abner@ebconstructors.com",
    password: hash("Abner123!"),
    role: "admin",
    pin: "1003",
    title: "Estimator / PM / Admin",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 4,
    name: "Isai Aguilar",
    email: "isai@ebconstructors.com",
    password: hash("Isai123!"),
    role: "pm",
    pin: "1004",
    title: "Estimator / PM",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 5,
    name: "Gema Aguilar",
    email: "gema@ebconstructors.com",
    password: hash("Gema123!"),
    role: "office_admin",
    pin: "1005",
    title: "Office Admin / Project Engineer",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 6,
    name: "Anna Aguilar",
    email: "office@ebconstructors.com",
    password: hash("Anna123!"),
    role: "accounting",
    pin: "1006",
    title: "Accounting / Office Admin",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 7,
    name: "Sacramento Aguilar",
    email: "sacra@ebconstructors.com",
    password: hash("Sacra123!"),
    role: "safety",
    pin: "1007",
    title: "Safety Officer / Delivery",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 8,
    name: "Rigoberto Martinez",
    email: "rigo@ebconstructors.com",
    password: hash("Rigo123!"),
    role: "driver",
    pin: "1008",
    title: "Delivery Driver",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 9,
    name: "Antonio Hernandez",
    email: "antonio@ebconstructors.com",
    password: hash("Antonio123!"),
    role: "foreman",
    pin: "1009",
    title: "Foreman",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: 10,
    name: "Hazael Aguilar",
    email: "haza@ebconstructors.com",
    password: hash("Haza123!"),
    role: "employee",
    pin: "1010",
    title: "Crew",
    mustChangePassword: true,
    createdAt: "2026-03-16T00:00:00.000Z",
  },
];

// Increment this when seed data changes so existing installs get updated
const SEED_VERSION = 2;

/**
 * Seed accounts into localStorage if none exist.
 * Also re-seeds (merges) when SEED_VERSION changes to fix typos / add accounts.
 * Returns true if seeded, false if users already exist and are up to date.
 */
export function seedAccountsIfEmpty() {
  try {
    const existing = JSON.parse(localStorage.getItem("ebc_users") || "[]");
    const storedVersion = Number(localStorage.getItem("ebc_seed_version") || "0");

    if (existing.length === 0) {
      localStorage.setItem("ebc_users", JSON.stringify(SEED_ACCOUNTS));
      localStorage.setItem("ebc_seed_version", String(SEED_VERSION));
      return true;
    }

    // Re-merge seed accounts when version bumps (fix typos, add missing accounts)
    if (storedVersion < SEED_VERSION) {
      const merged = [...existing];
      for (const seed of SEED_ACCOUNTS) {
        const idx = merged.findIndex(u => u.id === seed.id);
        if (idx >= 0) {
          // Update email (fix typos) but preserve user-changed passwords/pins
          merged[idx] = {
            ...merged[idx],
            email: seed.email,
            name: seed.name,
            role: seed.role,
            title: seed.title,
          };
        } else {
          // New account not in localStorage — add it
          merged.push(seed);
        }
      }
      localStorage.setItem("ebc_users", JSON.stringify(merged));
      localStorage.setItem("ebc_seed_version", String(SEED_VERSION));
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
