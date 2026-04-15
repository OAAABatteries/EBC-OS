import { useState, useEffect, Fragment, lazy, Suspense } from "react";
import { SubTabs } from "./moreShared";
import { resetAllGuides } from "../../components/FeatureGuide";
import { THEMES, COMPANY_DEFAULTS, ASSEMBLIES } from "../../data/constants";
import { Wrench, Shield, Download, ClipboardCopy, Building2, Moon, Sun, Trash2, AlertTriangle, Eye, Lock, Server } from "lucide-react";

const BusinessCardGenerator = lazy(() => import("../../components/BusinessCard"));
function BusinessCardTab({ app }) {
  return <Suspense fallback={<div className="text-sm text-dim">Loading...</div>}><BusinessCardGenerator employees={app.employees} app={app} /></Suspense>;
}

/* ══════════════════════════════════════════════════════════════
   Settings — Main Settings component with sub-tab routing
   ══════════════════════════════════════════════════════════════ */
export function Settings({ app }) {
  const userRole = app.auth?.role || "owner";
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const isForeman = userRole === "foreman";
  const isFullAccess = ["owner", "admin", "pm"].includes(userRole);

  // Simplified settings for non-business roles
  const canSeeInsurance = ["owner", "admin", "pm", "office_admin", "accounting"].includes(userRole);
  const tabs = isFullAccess
    ? ["Company", ...(canSeeInsurance ? ["Insurance"] : []), "Assemblies", "Equipment", "Margin Tiers", "Business Cards", "Data", "QuickBooks", "Theme", "API", "Security", "Account"]
    : [...(canSeeInsurance ? ["Insurance"] : []), "Theme", "Security", "Account"];
  if (isOwnerOrAdmin) tabs.push("Users");
  if (isForeman) tabs.push("Team");
  const [sub, setSub] = useState(isFullAccess ? "Company" : "Theme");

  // Wire app.subTab → internal sub-tab on mount
  useEffect(() => {
    if (app.subTab) {
      const map = { "credentials": "Insurance", "insurance": "Insurance", "company": "Company", "theme": "Theme", "security": "Security", "users": "Users", "api": "API", "quickbooks": "QuickBooks", "assemblies": "Assemblies", "equipment": "Equipment" };
      const mapped = map[app.subTab.toLowerCase()];
      if (mapped && tabs.includes(mapped)) setSub(mapped);
    }
  }, [app.subTab]);

  return (
    <div>
      <SubTabs tabs={tabs} active={sub} onChange={setSub} />
      {sub === "Company" && <CompanyTab app={app} />}
      {sub === "Assemblies" && <AssembliesTab app={app} />}
      {sub === "Equipment" && <EquipmentTab app={app} />}
      {sub === "Margin Tiers" && <MarginTiersTab app={app} />}
      {sub === "Business Cards" && <BusinessCardTab app={app} />}
      {sub === "Data" && <DataTab app={app} />}
      {sub === "QuickBooks" && <QuickBooksTab app={app} />}
      {sub === "Theme" && <ThemeTab app={app} />}
      {sub === "API" && <ApiTab app={app} />}
      {sub === "Security" && <SecurityTab app={app} />}
      {sub === "Account" && <AccountTab app={app} />}
      {sub === "Insurance" && <InsuranceTab app={app} />}
      {sub === "Users" && isOwnerOrAdmin && <UsersTab app={app} />}
      {sub === "Team" && isForeman && <ForemanTeamTab app={app} />}

      {/* ── Account / Logout ── */}
      <div className="card mt-16 more-account-card">
        <div>
          <div className="more-account-name">
            {app.auth?.name || "User"}
          </div>
          <div className="more-account-email">
            {app.auth?.email} &middot; {app.auth?.role?.toUpperCase()}
          </div>
        </div>
        <button
          className="btn btn-ghost more-btn-logout"
          onClick={() => {
            if (confirm("Are you sure you want to log out?")) {
              app.onLogout();
            }
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

/* ── Equipment Database ────────────────────────────────────────── */
const DEFAULT_EQUIPMENT = [
  { id: "eq_1", name: "Scissor Lift (19ft)", type: "Rented", dailyRate: 150, weeklyRate: 450, monthlyRate: 1200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_2", name: "Scissor Lift (26ft)", type: "Rented", dailyRate: 200, weeklyRate: 600, monthlyRate: 1600, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_3", name: "Scissor Lift (32ft)", type: "Rented", dailyRate: 275, weeklyRate: 800, monthlyRate: 2200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_4", name: "Boom Lift (40ft)", type: "Rented", dailyRate: 350, weeklyRate: 1050, monthlyRate: 2800, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_5", name: "Boom Lift (60ft)", type: "Rented", dailyRate: 500, weeklyRate: 1500, monthlyRate: 4000, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_6", name: "Drywall Cart", type: "Owned", dailyRate: 0, weeklyRate: 0, monthlyRate: 0, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_7", name: "Panel Lift (Drywall Jack)", type: "Owned", dailyRate: 25, weeklyRate: 75, monthlyRate: 200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_8", name: "Scaffolding Set", type: "Owned", dailyRate: 30, weeklyRate: 90, monthlyRate: 250, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_9", name: "Baker Scaffold", type: "Owned", dailyRate: 25, weeklyRate: 75, monthlyRate: 200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_10", name: "Stilts (pair)", type: "Owned", dailyRate: 15, weeklyRate: 45, monthlyRate: 120, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_11", name: "Screw Gun", type: "Owned", dailyRate: 10, weeklyRate: 30, monthlyRate: 80, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_12", name: "Rotozip", type: "Owned", dailyRate: 10, weeklyRate: 30, monthlyRate: 80, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_13", name: "Laser Level", type: "Owned", dailyRate: 20, weeklyRate: 60, monthlyRate: 160, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_14", name: "Auto Taper", type: "Owned", dailyRate: 35, weeklyRate: 105, monthlyRate: 280, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_15", name: "Flat Box Set", type: "Owned", dailyRate: 30, weeklyRate: 90, monthlyRate: 240, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_16", name: "Corner Roller", type: "Owned", dailyRate: 10, weeklyRate: 30, monthlyRate: 80, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_17", name: "Mud Pump", type: "Owned", dailyRate: 40, weeklyRate: 120, monthlyRate: 320, status: "Available", assignedProject: "", notes: "" },
];

const EQ_STATUSES = ["Available", "In Use", "Maintenance"];
const EQ_TYPES = ["Owned", "Rented"];

function EquipmentTab({ app }) {
  const [equipment, setEquipment] = useState(() => {
    try {
      const stored = localStorage.getItem("ebc_equipment");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("ebc_equipment", JSON.stringify(DEFAULT_EQUIPMENT));
      return DEFAULT_EQUIPMENT;
    } catch { return DEFAULT_EQUIPMENT; }
  });
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);

  const save = (list) => {
    setEquipment(list);
    localStorage.setItem("ebc_equipment", JSON.stringify(list));
  };

  const startEdit = (eq) => {
    setEditId(eq.id);
    setForm({ ...eq });
    setAdding(false);
  };

  const startAdd = () => {
    setForm({
      id: crypto.randomUUID(),
      name: "", type: "Owned", dailyRate: 0, weeklyRate: 0, monthlyRate: 0,
      status: "Available", assignedProject: "", notes: ""
    });
    setEditId(null);
    setAdding(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) { app.show("Equipment name is required", "err"); return; }
    if (adding) {
      save([...equipment, form]);
      app.show("Equipment added", "ok");
    } else {
      save(equipment.map(eq => eq.id === editId ? form : eq));
      app.show("Equipment updated", "ok");
    }
    setForm(null);
    setEditId(null);
    setAdding(false);
  };

  const cancelEdit = () => { setForm(null); setEditId(null); setAdding(false); };

  const deleteItem = (id) => {
    if (!confirm("Delete this equipment?")) return;
    save(equipment.filter(eq => eq.id !== id));
    app.show("Equipment deleted", "ok");
  };

  const resetDefaults = () => {
    if (!confirm("Reset equipment to defaults? This will overwrite all current data.")) return;
    save(DEFAULT_EQUIPMENT);
    app.show("Equipment reset to defaults", "ok");
  };

  const filtered = filter === "All" ? equipment :
    filter === "Available" ? equipment.filter(e => e.status === "Available") :
    filter === "In Use" ? equipment.filter(e => e.status === "In Use") :
    filter === "Maintenance" ? equipment.filter(e => e.status === "Maintenance") :
    filter === "Owned" ? equipment.filter(e => e.type === "Owned") :
    filter === "Rented" ? equipment.filter(e => e.type === "Rented") : equipment;

  const statusColor = (s) => s === "Available" ? "var(--green)" : s === "In Use" ? "var(--amber)" : "var(--red)";

  return (
    <div className="mt-16">
      <div className="flex-between mb-16">
        <div>
          <div className="section-title">Equipment Database</div>
          <div className="text-sm text-dim">{equipment.length} items tracked</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={resetDefaults}>Reset Defaults</button>
          <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add Equipment</button>
        </div>
      </div>

      <div className="flex gap-4 mb-16 flex-wrap">
        {["All", "Available", "In Use", "Maintenance", "Owned", "Rented"].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Add / Edit Form */}
      {form && (
        <div className="card p-20 mb-20">
          <div className="text-sm font-semi mb-12">{adding ? "Add Equipment" : "Edit Equipment"}</div>
          <div className="form-grid gap-12">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Scissor Lift (26ft)" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {EQ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Daily Rate ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Weekly Rate ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.weeklyRate} onChange={e => setForm({ ...form, weeklyRate: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rate ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.monthlyRate} onChange={e => setForm({ ...form, monthlyRate: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {EQ_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Project</label>
              <select className="form-select" value={form.assignedProject} onChange={e => setForm({ ...form, assignedProject: e.target.value })}>
                <option value="">-- None --</option>
                {(app.projects || []).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Serial number, condition, rental company..." className="resize-v" />
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={saveForm}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Equipment Table */}
      <div className="overflow-x-auto">
        <table className="more-eq-table">
          <thead>
            <tr className="more-eq-thead">
              <th className="more-eq-th">Name</th>
              <th className="more-eq-th">Type</th>
              <th className="more-eq-th">Daily</th>
              <th className="more-eq-th">Weekly</th>
              <th className="more-eq-th">Monthly</th>
              <th className="more-eq-th">Status</th>
              <th className="more-eq-th">Project</th>
              <th className="more-eq-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(eq => (
              <tr key={eq.id} className="more-eq-row">
                <td className="more-eq-td fw-600">{eq.name}</td>
                <td className="more-eq-td">
                  <span className={`badge ${eq.type === "Owned" ? "badge-blue" : "badge-amber"}`}>{eq.type}</span>
                </td>
                <td className="more-eq-td font-mono">${eq.dailyRate}</td>
                <td className="more-eq-td font-mono">${eq.weeklyRate}</td>
                <td className="more-eq-td font-mono">${eq.monthlyRate}</td>
                <td className="more-eq-td">
                  <span className="fw-semi" style={{ color: statusColor(eq.status) }}>{eq.status}</span>
                </td>
                <td style={{ padding: "var(--space-2) var(--space-3)", color: eq.assignedProject ? "var(--text)" : "var(--text3)" }}>
                  {eq.assignedProject || "--"}
                </td>
                <td className="more-eq-td">
                  <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(eq)} className="btn-table-action">Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(eq.id)} className="btn-table-delete">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state mt-16">
          <div className="empty-icon"><Wrench className="more-empty-icon" /></div>
          <div className="empty-text">No equipment matches this filter</div>
        </div>
      )}
    </div>
  );
}

/* ── Margin Tier Rates (Admin-configurable) ────────────────────── */
const DEFAULT_MARGIN_TIERS = {
  bronze: 15,
  silver: 20,
  gold: 25,
  platinum: 30,
};

function MarginTiersTab({ app }) {
  const [tiers, setTiers] = useState(() => {
    try {
      const stored = localStorage.getItem("ebc_margin_tiers");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("ebc_margin_tiers", JSON.stringify(DEFAULT_MARGIN_TIERS));
      return DEFAULT_MARGIN_TIERS;
    } catch { return DEFAULT_MARGIN_TIERS; }
  });

  const saveTiers = (updated) => {
    setTiers(updated);
    localStorage.setItem("ebc_margin_tiers", JSON.stringify(updated));
  };

  const handleChange = (key, val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0 || num > 100) return;
    saveTiers({ ...tiers, [key]: num });
  };

  const resetDefaults = () => {
    if (!confirm("Reset margin tiers to default values?")) return;
    saveTiers(DEFAULT_MARGIN_TIERS);
    app.show("Margin tiers reset to defaults", "ok");
  };

  const TIER_CONFIG = [
    { key: "bronze", label: "Bronze", color: "#cd7f32", bg: "rgba(205,127,50,0.10)", perks: "Thank-you email, referrals, priority scheduling" },
    { key: "silver", label: "Silver", color: "var(--text2)", bg: "rgba(148,163,184,0.10)", perks: "Lunch on EBC, preferred pricing on next bid" },
    { key: "gold", label: "Gold", color: "var(--yellow)", bg: "rgba(234,179,8,0.10)", perks: "Gift card ($100), first-call on new projects" },
    { key: "platinum", label: "Platinum", color: "var(--purple)", bg: "rgba(167,139,250,0.10)", perks: "Annual dinner, exclusive partnership status" },
  ];

  return (
    <div className="mt-16">
      <div className="flex-between mb-16">
        <div>
          <div className="section-title">Margin Tier Rates</div>
          <div className="text-sm text-dim">Set the minimum profit margin % to qualify for each incentive/appreciation tier.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={resetDefaults}>Reset Defaults</button>
      </div>

      <div className="more-tier-grid">
        {TIER_CONFIG.map(tc => (
          <div key={tc.key} className="card" style={{ padding: "var(--space-5)", borderLeft: `4px solid ${tc.color}`, background: tc.bg }}>
            <div className="flex-center-gap-8 mb-12">
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: tc.color }} />
              <div className="fw-bold fs-card" style={{ color: tc.color }}>{tc.label}</div>
            </div>
            <div className="form-group mb-12">
              <label className="form-label">Minimum Margin (%)</label>
              <input
                className="form-input"
                type="number"
                step="1"
                min="0"
                max="100"
                value={tiers[tc.key]}
                onChange={e => handleChange(tc.key, e.target.value)}
                className="more-metric-value more-text-center"
              />
            </div>
            <div className="text-xs text-dim">
              <span className="fw-600">Perks:</span> {tc.perks}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-16 p-16">
        <div className="text-sm font-semi mb-8">How It Works</div>
        <div className="text-sm text-dim">
          When a project is completed, its profit margin determines the appreciation tier.
          Projects with a margin at or above the threshold qualify for that tier's perks.
          These rates are used by the Incentive & Appreciation system.
        </div>
        <div className="mt-12 flex gap-16 flex-wrap">
          {TIER_CONFIG.map(tc => (
            <div key={tc.key} className="fs-13">
              <span className="fw-bold" style={{ color: tc.color }}>{tc.label}:</span>{" "}
              <span className="font-mono">{tiers[tc.key]}%+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Account Settings ────────────────────────────────────────── */
function AccountTab({ app }) {
  const [name, setName] = useState(app.auth?.name || "");
  const [email, setEmail] = useState(app.auth?.email || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [newPin, setNewPin] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("ok");

  const saveProfile = () => {
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === app.auth.id);
      if (idx < 0) return;
      users[idx].name = name;
      users[idx].email = email.toLowerCase();
      localStorage.setItem("ebc_users", JSON.stringify(users));
      const auth = JSON.parse(localStorage.getItem("ebc_auth") || "{}");
      auth.name = name;
      auth.email = email.toLowerCase();
      localStorage.setItem("ebc_auth", JSON.stringify(auth));
      setMsg("Profile updated!");
      setMsgType("ok");
      app.show("Profile updated", "ok");
    } catch { setMsg("Error saving"); setMsgType("err"); }
  };

  const changePassword = async () => {
    if (!currentPw) { setMsg("Enter current password"); setMsgType("err"); return; }
    if (newPw.length < 6) { setMsg("New password must be at least 6 characters"); setMsgType("err"); return; }
    if (newPw !== confirmPw) { setMsg("Passwords do not match"); setMsgType("err"); return; }

    try {
      const { verifyPassword: vp, hashPassword: hp } = await import("../../utils/passwordHash");
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === app.auth.id);
      if (idx < 0) return;

      const ok = await vp(currentPw, users[idx].password);
      if (!ok) {
        setMsg("Current password is incorrect");
        setMsgType("err");
        return;
      }

      users[idx].password = await hp(newPw);
      if (newPin && newPin.length >= 4) {
        users[idx].pin = await hp(newPin);
      }
      localStorage.setItem("ebc_users", JSON.stringify(users));
      setMsg("Password updated!");
      setMsgType("ok");
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setNewPin("");
      app.show("Password changed", "ok");
    } catch { setMsg("Error changing password"); setMsgType("err"); }
  };

  return (
    <div className="mt-16">
      <div className="section-title">My Profile</div>
      <div className="card mt-16">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="mt-16">
          <button className="btn btn-primary btn-sm" onClick={saveProfile}>Save Profile</button>
        </div>
      </div>

      <div className="section-title mt-16">Change Password</div>
      <div className="card mt-16">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">New PIN (optional)</label>
            <input className="form-input" type="text" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="4-digit PIN" />
          </div>
        </div>
        {msg && (
          <div className="mt-8" style={{
            padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", fontSize: "var(--text-label)",
            background: msgType === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: msgType === "ok" ? "var(--green)" : "var(--red)",
            border: `1px solid ${msgType === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            {msg}
          </div>
        )}
        <div className="mt-16">
          <button className="btn btn-primary btn-sm" onClick={changePassword}>Update Password</button>
        </div>
      </div>
      <NotificationSettings userId={app.auth?.id} />
      <InstallGuide />
    </div>
  );
}

/* ── Install Guide (iPhone / Android / Computer) ─────────────── */
function InstallGuide() {
  const [expanded, setExpanded] = useState(false);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return null; // already installed
  return (
    <div className="mt-16">
      <div className="section-title">Install App</div>
      <div className="card mt-8 p-16">
        <div className="mb-sp3 fs-label c-text2">
          Install EBC-OS on your device for offline access and instant launch.
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Hide Guide" : "Show Install Guide"}
        </button>
        {expanded && (
          <div className="flex-col mt-sp4 gap-sp4">
            <div>
              <div className="fw-bold mb-sp2 fs-card c-text">iPhone / iPad</div>
              <ol className="flex-col fs-label c-text2 gap-sp2" style={{ paddingLeft: "var(--space-5)" }}>
                <li>Open <strong>Safari</strong> (must be Safari, not Chrome)</li>
                <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right</li>
                <li>EBC will appear on your home screen</li>
              </ol>
            </div>
            <div>
              <div className="fw-bold mb-sp2 fs-card c-text">Android</div>
              <ol className="flex-col fs-label c-text2 gap-sp2" style={{ paddingLeft: "var(--space-5)" }}>
                <li>Open <strong>Chrome</strong></li>
                <li>Tap the <strong>three-dot menu</strong> (top right)</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Install"</strong></li>
                <li>EBC will appear in your app drawer and home screen</li>
              </ol>
            </div>
            <div>
              <div className="fw-bold mb-sp2 fs-card c-text">Computer (Chrome / Edge)</div>
              <ol className="flex-col fs-label c-text2 gap-sp2" style={{ paddingLeft: "var(--space-5)" }}>
                <li>Open <strong>Chrome</strong> or <strong>Edge</strong></li>
                <li>Click the <strong>install icon</strong> in the address bar (monitor with arrow)</li>
                <li>Click <strong>"Install"</strong></li>
                <li>EBC will open as a standalone window</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Notification Settings ──────────────────────────────────── */
function NotificationSettings({ userId }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const { getNotificationPrefs } = require("../../hooks/useNotifications");
      return getNotificationPrefs(userId);
    } catch {
      return { clockReminders: true, materialUpdates: true, scheduleChanges: true, dailyReportReminder: true, dailyReportTime: "16:30" };
    }
  });
  const [permission, setPermission] = useState(() => "Notification" in window ? Notification.permission : "unsupported");
  const [pushSubscribed, setPushSubscribed] = useState(() => {
    try {
      const { useNotifications } = require("../../hooks/useNotifications");
      return !!localStorage.getItem(`ebc_push_sub_${userId}`);
    } catch { return false; }
  });
  const [pushLoading, setPushLoading] = useState(false);

  const toggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      const { saveNotificationPrefs } = require("../../hooks/useNotifications");
      saveNotificationPrefs(userId, updated);
    } catch {}
  };

  const setTime = (val) => {
    const updated = { ...prefs, dailyReportTime: val };
    setPrefs(updated);
    try {
      const { saveNotificationPrefs } = require("../../hooks/useNotifications");
      saveNotificationPrefs(userId, updated);
    } catch {}
  };

  const requestPerm = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const togglePush = async () => {
    setPushLoading(true);
    try {
      const mod = await import("../../hooks/useNotifications");
      // We need the functions directly, not the hook
      if (pushSubscribed) {
        const { useNotifications } = mod;
        // Unsubscribe inline
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        localStorage.removeItem(`ebc_push_sub_${userId}`);
        setPushSubscribed(false);
      } else {
        // Subscribe
        const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
        if (!VAPID_KEY) { setPushLoading(false); return; }
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setPermission(perm); setPushLoading(false); return; }
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const padding = "=".repeat((4 - (VAPID_KEY.length % 4)) % 4);
          const b64 = (VAPID_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
          const raw = atob(b64);
          const key = Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        }
        localStorage.setItem(`ebc_push_sub_${userId}`, JSON.stringify(sub.toJSON()));
        try {
          await fetch("/.netlify/functions/push-subscribe", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: sub.toJSON(), userId, action: "subscribe" }),
          });
        } catch {}
        setPushSubscribed(true);
        setPermission("granted");
      }
    } catch (err) {
      console.warn("[push] toggle failed:", err.message);
    } finally {
      setPushLoading(false);
    }
  };

  const toggleStyle = (on) => ({
    width: 44, height: 24, borderRadius: "var(--radius-control)", cursor: "pointer", border: "none",
    background: on ? "var(--ebc-gold, #e09422)" : "rgba(255,255,255,0.15)",
    position: "relative", transition: "background 0.2s",
  });
  const dotStyle = (on) => ({
    width: 18, height: 18, borderRadius: "50%", background: "#fff",
    position: "absolute", top: 3, left: on ? 22 : 3, transition: "left 0.2s",
  });

  return (
    <div className="mt-16">
      <div className="section-title">Notifications</div>
      <div className="card mt-8 p-16">
        {permission !== "granted" && permission !== "unsupported" && (
          <div className="rounded-control mb-sp3 fs-label" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(224,148,34,0.1)", border: "1px solid rgba(224,148,34,0.3)" }}>
            Notifications are {permission === "denied" ? "blocked" : "not enabled"}.
            {permission === "default" && <button className="btn btn-sm ml-8" onClick={requestPerm}>Enable</button>}
          </div>
        )}
        {[
          { key: "clockReminders", label: "Clock-in reminders" },
          { key: "materialUpdates", label: "Material request updates" },
          { key: "scheduleChanges", label: "Schedule change alerts" },
          { key: "certExpiryWarnings", label: "Cert expiry warnings" },
          { key: "lateArrivalAlerts", label: "Late arrival alerts" },
          { key: "dailyReportReminder", label: "Daily report reminder" },
        ].map(({ key, label }) => (
          <div key={key} className="more-toggle-row">
            <span className="fs-14">{label}</span>
            <button style={toggleStyle(prefs[key])} onClick={() => toggle(key)}>
              <div style={dotStyle(prefs[key])} />
            </button>
          </div>
        ))}
        {prefs.dailyReportReminder && (
          <div className="more-toggle-row">
            <span className="fs-13 text-muted">Reminder time</span>
            <input type="time" value={prefs.dailyReportTime} onChange={e => setTime(e.target.value)}
              className="rounded-control fs-label" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", padding: "var(--space-1) var(--space-2)", color: "var(--text-primary)" }} />
          </div>
        )}
        {"PushManager" in window && (
          <div className="mt-12 pt-12">
            <div className="more-toggle-row">
              <div>
                <span className="fs-14">Background push</span>
                <div className="fs-11 text-muted mt-2">Receive alerts even when app is closed</div>
              </div>
              <button style={toggleStyle(pushSubscribed)} onClick={togglePush} disabled={pushLoading}>
                <div style={dotStyle(pushSubscribed)} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Insurance / COI Tracker ──────────────────────────────────── */
function InsuranceTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ type: "General Liability", carrier: "", policyNumber: "", effectiveDate: "", expiryDate: "", coverageLimit: "", notes: "" });
  const [fileData, setFileData] = useState(null);

  const policies = app.insurancePolicies || [];
  const now = new Date();

  const POLICY_TYPES = ["General Liability", "Workers Compensation", "Commercial Auto", "Umbrella / Excess", "Professional Liability", "Builders Risk", "Inland Marine", "Pollution Liability"];

  const getStatus = (pol) => {
    if (!pol.expiryDate) return "active";
    const exp = new Date(pol.expiryDate);
    if (exp < now) return "expired";
    if ((exp - now) / 86400000 <= 30) return "expiring";
    return "active";
  };

  const save = () => {
    if (!form.carrier || !form.policyNumber) { app.show("Carrier and policy number required", "err"); return; }
    if (editId) {
      app.setInsurancePolicies(prev => prev.map(p => p.id === editId ? { ...p, ...form, file: fileData || p.file, updatedAt: new Date().toISOString() } : p));
      app.show("Policy updated", "ok");
    } else {
      app.setInsurancePolicies(prev => [...prev, { id: app.nextId(), ...form, file: fileData, uploadedAt: new Date().toISOString() }]);
      app.show("Policy added", "ok");
    }
    setAdding(false); setEditId(null); setFileData(null);
    setForm({ type: "General Liability", carrier: "", policyNumber: "", effectiveDate: "", expiryDate: "", coverageLimit: "", notes: "" });
  };

  const startEdit = (pol) => {
    setForm({ type: pol.type, carrier: pol.carrier, policyNumber: pol.policyNumber, effectiveDate: pol.effectiveDate || "", expiryDate: pol.expiryDate || "", coverageLimit: pol.coverageLimit || "", notes: pol.notes || "" });
    setFileData(pol.file || null);
    setEditId(pol.id); setAdding(true);
  };

  const deletePol = (pol) => {
    if (!confirm(`Remove ${pol.type} policy?`)) return;
    app.setInsurancePolicies(prev => prev.filter(p => p.id !== pol.id));
    app.show("Policy removed", "ok");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileData({ name: file.name, size: file.size, type: file.type, dataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const shareCOI = (pol) => {
    const text = `${pol.type}\nCarrier: ${pol.carrier}\nPolicy #: ${pol.policyNumber}\nEffective: ${pol.effectiveDate || "N/A"}\nExpires: ${pol.expiryDate || "N/A"}\nCoverage: ${pol.coverageLimit || "N/A"}`;
    navigator.clipboard.writeText(text).then(() => app.show("COI info copied to clipboard", "ok")).catch(() => app.show("Copy failed", "err"));
  };

  const STATUS_BADGE = { active: "badge-green", expiring: "badge-amber", expired: "badge-red" };
  const activeCount = policies.filter(p => getStatus(p) === "active").length;
  const expiringCount = policies.filter(p => getStatus(p) === "expiring").length;
  const expiredCount = policies.filter(p => getStatus(p) === "expired").length;

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Insurance & COI Tracker</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(!adding); setEditId(null); setFileData(null); }}>+ Add Policy</button>
      </div>

      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Total Policies</span><strong>{policies.length}</strong></div>
        <div className="kpi-card"><span className="text2">Active</span><strong className="text-green">{activeCount}</strong></div>
        <div className="kpi-card"><span className="text2">Expiring (&lt;30d)</span><strong className="text-amber">{expiringCount}</strong></div>
        <div className="kpi-card"><span className="text2">Expired</span><strong className="text-red">{expiredCount}</strong></div>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="card-header"><div className="card-title">{editId ? "Edit Policy" : "Add Insurance Policy"}</div></div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Policy Type *</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Carrier *</label>
              <input className="form-input" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. State Farm, Liberty Mutual" />
            </div>
            <div className="form-group">
              <label className="form-label">Policy Number *</label>
              <input className="form-input" value={form.policyNumber} onChange={e => setForm({ ...form, policyNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Coverage Limit</label>
              <input className="form-input" value={form.coverageLimit} onChange={e => setForm({ ...form, coverageLimit: e.target.value })} placeholder="e.g. $1,000,000 / $2,000,000" />
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date</label>
              <input className="form-input" type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="form-group full">
              <label className="form-label">COI Document (PDF)</label>
              <input className="form-input" type="file" accept=".pdf,.png,.jpg" onChange={handleFile} />
              {fileData && <div className="text-xs text-muted mt-4">{fileData.name} ({Math.round(fileData.size / 1024)}KB)</div>}
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional insured requirements, endorsements, etc." />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={save}>{editId ? "Update" : "Add Policy"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-16">
        {policies.length === 0 ? (
          <div className="card more-empty-card">
            <div className="more-empty-icon"><Shield className="more-empty-icon" /></div>
            <div className="text-sm text-muted mt-8">No insurance policies on file. Add your GL, WC, Auto, and Umbrella policies.</div>
          </div>
        ) : policies.map(pol => {
          const status = getStatus(pol);
          return (
            <div key={pol.id} className="card" style={{ marginBottom: "var(--space-2)", borderLeft: `4px solid var(--${status === "active" ? "green" : status === "expiring" ? "amber" : "red"})` }}>
              <div className="flex-between">
                <div>
                  <div className="font-semi fs-14">{pol.type}</div>
                  <div className="text-xs text-muted">{pol.carrier} — Policy #{pol.policyNumber}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[status]} fs-10`}>{status}</span>
              </div>
              <div className="more-policy-grid">
                <div><span className="text2">Coverage</span><br />{pol.coverageLimit || "—"}</div>
                <div><span className="text2">Effective</span><br />{pol.effectiveDate || "—"}</div>
                <div><span className="text2">Expires</span><br />{pol.expiryDate || "—"}</div>
              </div>
              {pol.notes && <div className="text-xs text-muted mt-6">{pol.notes}</div>}
              <div className="flex gap-4 mt-8">
                <button className="btn btn-ghost btn-sm fs-10 flex-center-gap-4" onClick={() => shareCOI(pol)}><ClipboardCopy className="icon-12" /> Copy COI Info</button>
                {pol.file && <button className="btn btn-ghost btn-sm fs-10 flex-center-gap-4" onClick={() => { const a = document.createElement("a"); a.href = pol.file.dataUrl; a.download = pol.file.name; a.click(); }}><Download className="icon-12" /> Download</button>}
                <button className="btn btn-ghost btn-sm btn-table-edit--amber" onClick={() => startEdit(pol)}>Edit</button>
                <button className="btn btn-ghost btn-sm btn-table-edit--red" onClick={() => deletePol(pol)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Foreman Team Invite (Foreman only — helpers & team only) ── */
function ForemanTeamTab({ app }) {
  const FOREMAN_INVITE_ROLES = { employee: "Employee / Team", driver: "Driver" };
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", pin: "" });

  const refresh = () => {
    try { setUsers(JSON.parse(localStorage.getItem("ebc_users") || "[]")); } catch {}
  };

  const addCrewMember = async () => {
    if (!form.name || !form.email) { app.show("Name and email required", "err"); return; }
    const existing = users.find(u => u.email.toLowerCase() === form.email.toLowerCase());
    if (existing) { app.show("Email already exists", "err"); return; }
    if (!["employee", "driver"].includes(form.role)) {
      app.show("Foremen can only invite team members and drivers", "err"); return;
    }
    const { hashPasswordSync: hps } = await import("../../utils/passwordHash");
    const newUser = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email.toLowerCase(),
      password: hps(form.name.split(" ")[0] + "123!"),
      role: form.role,
      pin: hps(form.pin || String(1000 + users.length + 1)),
      hourlyRate: 35,
      active: true,
      mustChangePassword: true,
      invitedBy: app.auth?.name || "Foreman",
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setForm({ name: "", email: "", role: "employee", pin: "" });
    setAdding(false);
    app.show(`Added ${newUser.name} — temp password: ${form.name.split(" ")[0]}123!`, "ok");
  };

  const teamMembers = users.filter(u => ["employee", "driver"].includes(u.role));

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div>
          <div className="section-title">Invite Crew Member</div>
          <div className="text-xs text-muted mt-4">As a foreman, you can add team members and drivers to the team.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Crew</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@ebconstructors.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {Object.entries(FOREMAN_INVITE_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PIN (4-digit)</label>
              <input className="form-input" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} placeholder="Auto-generated" />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={addCrewMember}>Add to Team</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div className="more-temp-hint">
            Temp password will be: [FirstName]123! — user will be prompted to change on first login.
          </div>
        </div>
      )}

      <div className="mt-16">
        <div className="text-sm font-semi mb-8">Crew &amp; Drivers ({teamMembers.length})</div>
        {teamMembers.length === 0 ? (
          <div className="empty-state"><div className="empty-text">No team members yet</div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
            </thead>
            <tbody>
              {teamMembers.map(u => (
                <tr key={u.id} style={{ opacity: u.active === false ? 0.5 : 1 }}>
                  <td className="fw-500">{u.name}</td>
                  <td className="fs-12">{u.email}</td>
                  <td><span className="badge badge-blue fs-10">{FOREMAN_INVITE_ROLES[u.role] || u.role}</span></td>
                  <td><span className={`badge ${u.active === false ? "badge-red" : "badge-green"} fs-10`}>{u.active === false ? "Inactive" : "Active"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── User Management (Owner/Admin only) ──────────────────────── */
function UsersTab({ app }) {
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", pin: "", hourlyRate: "" });
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const ROLES_IMPORT = {
    owner: "Owner", admin: "Admin", pm: "Project Manager", estimator: "Estimator",
    project_engineer: "Project Engineer", superintendent: "Superintendent",
    foreman: "Foreman", safety: "Safety Officer", accounting: "Accounting",
    office_admin: "Office Admin", employee: "Employee / Team", driver: "Driver"
  };

  const refresh = () => {
    try { setUsers(JSON.parse(localStorage.getItem("ebc_users") || "[]")); } catch {}
  };

  const addUser = async () => {
    if (!form.name || !form.email) { app.show("Name and email required", "err"); return; }
    const existing = users.find(u => u.email.toLowerCase() === form.email.toLowerCase());
    if (existing) { app.show("Email already exists", "err"); return; }

    const { hashPasswordSync: hps } = await import("../../utils/passwordHash");
    const newUser = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email.toLowerCase(),
      password: hps(form.name.split(" ")[0] + "123!"),
      role: form.role,
      pin: hps(form.pin || String(1000 + users.length + 1)),
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : 35,
      active: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setForm({ name: "", email: "", role: "employee", pin: "", hourlyRate: "" });
    setAdding(false);
    app.show(`Added ${newUser.name} — temp password: ${form.name.split(" ")[0]}123!`, "ok");
  };

  const resetPassword = async (user) => {
    const { hashPasswordSync: hps } = await import("../../utils/passwordHash");
    const tempPw = user.name.split(" ")[0] + "123!";
    const updated = users.map(u =>
      u.id === user.id ? { ...u, password: hps(tempPw), mustChangePassword: true } : u
    );
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`Password reset for ${user.name} — temp: ${tempPw}`, "ok");
  };

  const updateRole = (userId) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: editRole } : u);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setEditId(null);
    app.show("Role updated", "ok");
  };

  const toggleActive = (user) => {
    if (user.id === app.auth.id) { app.show("Cannot deactivate yourself", "err"); return; }
    const updated = users.map(u => u.id === user.id ? { ...u, active: u.active === false ? true : false } : u);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`${user.name} ${user.active === false ? "activated" : "deactivated"}`, "ok");
  };

  const deleteUser = (user) => {
    if (user.id === app.auth.id) { app.show("Cannot delete yourself", "err"); return; }
    if (!confirm(`Permanently remove ${user.name}? This cannot be undone. Consider deactivating instead.`)) return;
    const updated = users.filter(u => u.id !== user.id);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`Removed ${user.name}`, "ok");
  };

  // Filter users
  const filtered = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = users.filter(u => u.active !== false).length;
  const inactiveCount = users.filter(u => u.active === false).length;
  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  // User detail expansion
  const getUserDetails = (user) => {
    const certs = (app.certifications || []).filter(c => c.employeeId === user.id);
    const entries = (app.timeEntries || []).filter(e => e.employeeId === user.id || e.employee === user.name);
    const recentEntries = entries.slice(-5);
    const totalHours = entries.reduce((s, e) => {
      if (e.hours) return s + e.hours;
      if (e.clockIn && e.clockOut) return s + (new Date(e.clockOut) - new Date(e.clockIn)) / 3600000;
      return s;
    }, 0);
    const assignedProjects = (app.teamSchedule || [])
      .filter(cs => cs.employeeId === user.id || (cs.team || []).includes(user.id))
      .map(cs => app.projects.find(p => p.id === cs.projectId)?.name)
      .filter(Boolean);
    return { certs, totalHours, recentEntries, assignedProjects: [...new Set(assignedProjects)] };
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Team Members ({users.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add User</button>
      </div>

      {/* KPI row */}
      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Active</span><strong className="text-green">{activeCount}</strong></div>
        <div className="kpi-card"><span className="text2">Inactive</span><strong style={{ color: inactiveCount > 0 ? "var(--red)" : "var(--text2)" }}>{inactiveCount}</strong></div>
        <div className="kpi-card"><span className="text2">Roles</span><strong>{Object.keys(roleCounts).length}</strong></div>
        <div className="kpi-card"><span className="text2">Temp Passwords</span><strong className="text-amber">{users.filter(u => u.mustChangePassword).length}</strong></div>
      </div>

      {/* Filters */}
      <div className="flex gap-8 mt-16">
        <input className="form-input min-w-150" placeholder="Search by name or email..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        <select className="form-select min-w-150" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v} ({roleCounts[k] || 0})</option>)}
        </select>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@ebconstructors.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PIN (4-digit)</label>
              <input className="form-input" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} placeholder="Auto-generated" />
            </div>
            <div className="form-group">
              <label className="form-label">Hourly Rate</label>
              <input className="form-input" type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} placeholder="35" />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={addUser}>Create User</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div className="more-temp-hint">
            Temp password will be: [FirstName]123! — user will be prompted to change on first login.
          </div>
        </div>
      )}

      <div className="mt-16">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isExpanded = expandedId === u.id;
              const details = isExpanded ? getUserDetails(u) : null;
              return (
                <Fragment key={u.id}>
                <tr style={{ opacity: u.active === false ? 0.5 : 1 }}>
                  <td>
                    <button className="btn btn-ghost btn-table-save" onClick={() => setExpandedId(isExpanded ? null : u.id)}>
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </td>
                  <td className="fw-500">
                    {u.name}
                    {u.id === app.auth.id && <span className="fs-10 text-amber ml-4">(you)</span>}
                    {u.mustChangePassword && <span className="fs-10 text-red ml-4">temp pw</span>}
                  </td>
                  <td className="fs-12">{u.email}</td>
                  <td>
                    {editId === u.id ? (
                      <div className="flex-center-gap-4">
                        <select className="form-select more-edit-select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button className="btn btn-primary btn-table-edit" onClick={() => updateRole(u.id)}>Save</button>
                        <button className="btn btn-ghost btn-table-save" onClick={() => setEditId(null)}>{"\u2715"}</button>
                      </div>
                    ) : (
                      <span className="badge badge-blue fs-xs cursor-pointer"
                        onClick={() => { setEditId(u.id); setEditRole(u.role); }} title="Click to change role">
                        {ROLES_IMPORT[u.role] || u.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.active === false ? "badge-red" : "badge-green"} fs-10 more-cursor-pointer`}
                      onClick={() => toggleActive(u)} title="Click to toggle">
                      {u.active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="more-edit-actions">
                      <button className="btn btn-ghost btn-table-edit--amber"
                        onClick={() => resetPassword(u)} title="Reset to temp password">Reset PW</button>
                      {u.id !== app.auth.id && (
                        <button className="btn btn-ghost btn-table-edit--red"
                          onClick={() => deleteUser(u)}>Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && details && (
                  <tr>
                    <td colSpan={6} className="px-12 py-8 bg-bg3">
                      <div className="more-grid-3">
                        <div>
                          <div className="text-xs text-muted fw-600 mb-6">Certifications</div>
                          {details.certs.length === 0 ? <div className="text-xs text-muted">None on file</div> : (
                            details.certs.map(c => {
                              const expired = c.expiryDate && new Date(c.expiryDate) < new Date();
                              return (
                                <div key={c.id} className="fs-11 mb-3">
                                  <span className={`badge ${expired ? "badge-red" : "badge-green"} fs-9`}>{c.name}</span>
                                  {c.expiryDate && <span className="text-xs text-muted ml-4">exp {c.expiryDate}</span>}
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted fw-600 mb-6">Time Summary</div>
                          <div className="btn-table-action">Total hours logged: <strong>{details.totalHours.toFixed(1)}h</strong></div>
                          <div className="fs-11 mt-2">Rate: <strong>${u.hourlyRate || 35}/hr</strong></div>
                          <div className="fs-11 mt-2 text-muted">Created: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted fw-600 mb-6">Assigned Projects</div>
                          {details.assignedProjects.length === 0 ? <div className="text-xs text-muted">None currently</div> : (
                            details.assignedProjects.map((p, i) => (
                              <div key={i} className="badge badge-blue fs-9 mb-2">{p}</div>
                            ))
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Company ─────────────────────────────────────────────────── */
function CompanyTab({ app }) {
  const [form, setForm] = useState(() => ({ ...app.company }));

  const save = () => {
    app.setCompany({ ...form });
    app.show("Company info saved", "ok");
  };

  return (
    <div className="mt-16">
      <div className="section-title">Company Information</div>
      <div className="card mt-16">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">License</label>
            <input className="form-input" value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Bookkeeping Email</label>
            <input className="form-input" value={form.bookkeepingEmail || ""} onChange={e => setForm({ ...form, bookkeepingEmail: e.target.value })} placeholder="bookkeeping@ebconstructors.com" />
            <div className="text-xs text-muted mt-4">JSA auto-routing sends completed JSAs to this email.</div>
          </div>
        </div>
      </div>

      <div className="section-title mt-16">Company Logo</div>
      <div className="card mt-16 flex-center-gap-12">
        {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="rounded-control" style={{ maxHeight: 64, maxWidth: 200, objectFit: "contain" }} />}
        <div>
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result }));
            reader.readAsDataURL(file);
          }} />
          <div className="text-xs text-muted mt-4">PNG or JPG recommended. Stored locally.</div>
          {form.logoUrl && <button className="btn btn-ghost btn-sm mt-8 text-red fs-11" onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}>Remove Logo</button>}
        </div>
      </div>

      <div className="mt-16">
        <button className="btn btn-primary btn-sm" onClick={save}>Save Company Info</button>
      </div>
    </div>
  );
}

/* ── Assemblies ──────────────────────────────────────────────── */
function AssembliesTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", unit: "LF", matRate: "", labRate: "", verified: false });
  const [editing, setEditing] = useState(null); // id being edited
  const [editVals, setEditVals] = useState({ matRate: "", labRate: "" });

  const save = () => {
    if (!form.code || !form.name) return app.show("Fill required fields", "err");
    const newAsm = {
      code: form.code,
      name: form.name,
      unit: form.unit,
      matRate: Number(form.matRate) || 0,
      labRate: Number(form.labRate) || 0,
      verified: form.verified,
    };
    app.setAssemblies(prev => [...prev, newAsm]);
    app.show("Assembly added", "ok");
    setAdding(false);
    setForm({ code: "", name: "", unit: "LF", matRate: "", labRate: "", verified: false });
  };

  const startEdit = (asm) => {
    setEditing(asm.code);
    setEditVals({ matRate: asm.matRate, labRate: asm.labRate });
  };

  const saveEdit = (code) => {
    app.setAssemblies(prev => prev.map(a =>
      a.code === code ? { ...a, matRate: Number(editVals.matRate), labRate: Number(editVals.labRate) } : a
    ));
    app.show("Assembly updated", "ok");
    setEditing(null);
  };

  const deleteAsm = (code) => {
    if (!confirm(`Delete assembly ${code}?`)) return;
    app.setAssemblies(prev => prev.filter(a => a.code !== code));
    app.show("Assembly deleted", "ok");
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Assemblies</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Assembly</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Code</label>
              <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="LF">LF</option>
                <option value="SF">SF</option>
                <option value="EA">EA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mat Rate</label>
              <input className="form-input" type="number" step="0.01" value={form.matRate} onChange={e => setForm({ ...form, matRate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Lab Rate</label>
              <input className="form-input" type="number" step="0.01" value={form.labRate} onChange={e => setForm({ ...form, labRate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label flex-center-gap-8">
                <input type="checkbox" checked={form.verified} onChange={e => setForm({ ...form, verified: e.target.checked })} />
                Verified
              </label>
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Unit</th><th>Mat Rate</th><th>Lab Rate</th><th>Verified</th><th></th></tr></thead>
          <tbody>
            {app.assemblies.length === 0 && <tr><td colSpan={7} className="more-text-center">No assemblies</td></tr>}
            {app.assemblies.map(asm => (
              <tr key={asm.code}>
                <td>{asm.code}</td>
                <td>{asm.name}</td>
                <td>{asm.unit}</td>
                <td>
                  {editing === asm.code ? (
                    <input className="form-input" type="number" step="0.01" style={{ width: 80 }} value={editVals.matRate} onChange={e => setEditVals({ ...editVals, matRate: e.target.value })} />
                  ) : (
                    `$${asm.matRate.toFixed(2)}`
                  )}
                </td>
                <td>
                  {editing === asm.code ? (
                    <input className="form-input" type="number" step="0.01" style={{ width: 80 }} value={editVals.labRate} onChange={e => setEditVals({ ...editVals, labRate: e.target.value })} />
                  ) : (
                    `$${asm.labRate.toFixed(2)}`
                  )}
                </td>
                <td>{asm.verified ? <span className="badge-green">Yes</span> : <span className="badge-muted">No</span>}</td>
                <td>
                  {editing === asm.code ? (
                    <div className="flex gap-8">
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(asm.code)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(asm)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAsm(asm.code)}>Del</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Data Management ─────────────────────────────────────────── */
function DataTab({ app }) {
  const doExport = () => {
    const data = {
      invoices: app.invoices,
      changeOrders: app.changeOrders,
      rfis: app.rfis,
      submittals: app.submittals,
      schedule: app.schedule,
      incidents: app.incidents,
      toolboxTalks: app.toolboxTalks,
      dailyReports: app.dailyReports,
      projects: app.projects,
      company: app.company,
      assemblies: app.assemblies,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebc-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    app.show("Data exported", "ok");
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.invoices) app.setInvoices(data.invoices);
        if (data.changeOrders) app.setChangeOrders(data.changeOrders);
        if (data.rfis) app.setRfis(data.rfis);
        if (data.submittals) app.setSubmittals(data.submittals);
        if (data.schedule) app.setSchedule(data.schedule);
        if (data.incidents) app.setIncidents(data.incidents);
        if (data.toolboxTalks) app.setToolboxTalks(data.toolboxTalks);
        if (data.dailyReports) app.setDailyReports(data.dailyReports);
        if (data.projects) app.setProjects(data.projects);
        if (data.company) app.setCompany(data.company);
        if (data.assemblies) app.setAssemblies(data.assemblies);
        app.show("Data imported successfully", "ok");
      } catch {
        app.show("Invalid JSON file", "err");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doReset = () => {
    if (!confirm("Reset ALL data to defaults? This cannot be undone.")) return;
    app.setCompany({ ...COMPANY_DEFAULTS });
    app.setAssemblies([...ASSEMBLIES]);
    app.setInvoices([]);
    app.setChangeOrders([]);
    app.setRfis([]);
    app.setSubmittals([]);
    app.setSchedule([]);
    app.setIncidents([]);
    app.setToolboxTalks([]);
    app.setDailyReports([]);
    app.show("Data reset to defaults", "ok");
  };

  return (
    <div className="mt-16">
      <div className="section-title">Data Management</div>
      <div className="card mt-16">
        <div className="flex-col gap-16">
          <div>
            <strong>Export Data</strong>
            <p className="text2 mt-4 mb-8">Download all app data as a JSON backup file.</p>
            <button className="btn btn-primary btn-sm" onClick={doExport}>Export JSON</button>
          </div>
          <div className="border-top pt-16">
            <strong>Import Data</strong>
            <p className="text2 mt-4 mb-8">Restore data from a previously exported JSON file.</p>
            <input type="file" accept=".json" onChange={doImport} className="fs-13" />
          </div>
          <div className="border-top pt-16">
            <strong>Feature Guides</strong>
            <p className="text2 mt-4 mb-8">Re-enable step-by-step guides for all sections. Guides will auto-trigger on your next visit to each section.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { resetAllGuides(); app.show("Guides reset — they will show on next visit to each section", "ok"); }}>Reset All Guides</button>
          </div>
          <div className="border-top pt-16">
            <strong>Reset All Data</strong>
            <p className="text2 mt-4 mb-8">Clear all data and restore factory defaults. This cannot be undone.</p>
            <button className="btn btn-danger btn-sm" onClick={doReset}>Reset to Defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── QuickBooks Desktop Mapping ──────────────────────────────── */
function QuickBooksTab({ app }) {
  const QB_STORAGE = "ebc_qb_name_map";
  // Migrate from old key if needed
  const [mappings, setMappings] = useState(() => {
    try {
      const fresh = localStorage.getItem(QB_STORAGE);
      if (fresh) return JSON.parse(fresh);
      // migrate legacy key
      const legacy = localStorage.getItem("ebc_qb_mappings");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(QB_STORAGE, legacy);
        return parsed;
      }
      return {};
    } catch { return {}; }
  });

  const save = (updated) => {
    setMappings(updated);
    localStorage.setItem(QB_STORAGE, JSON.stringify(updated));
    // Keep legacy key in sync for qbExport.js compatibility
    localStorage.setItem("ebc_qb_mappings", JSON.stringify(updated));
  };

  const updateMapping = (type, name, value) => {
    const trimmed = value.trim();
    const section = { ...(mappings[type] || {}) };
    if (trimmed) { section[name] = trimmed; } else { delete section[name]; }
    save({ ...mappings, [type]: section });
  };

  // Pre-populate employees from app.employees (the full roster), plus any from time entries
  const employeeNames = [...new Set([
    ...(app.employees || []).filter(e => e.active !== false).map(e => e.name),
    ...(app.timeEntries || []).map(e => e.employeeName),
  ].filter(Boolean))].sort();

  const projectNames = [...new Set([
    ...(app.projects || []).map(p => p.name),
    ...(app.timeEntries || []).map(e => e.projectName),
  ].filter(Boolean))].sort();

  const empMap = mappings.employees || {};
  const jobMap = mappings.jobs || {};
  const empMappedCount = employeeNames.filter(n => empMap[n]).length;
  const jobMappedCount = projectNames.filter(n => jobMap[n]).length;

  // Status indicator
  const StatusDot = ({ mapped }) => (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: mapped ? "var(--green)" : "var(--yellow)",
      boxShadow: mapped ? "0 0 6px var(--green)" : "0 0 6px var(--yellow)",
    }} title={mapped ? "Mapped" : "Unmapped — will use EBC name as-is"} />
  );

  const MappingRow = ({ type, name }) => {
    const mapped = (mappings[type] || {})[name];
    return (
      <tr>
        <td className="px-12 py-6 fs-13 ws-nowrap">
          <div className="flex-center-gap-8">
            <StatusDot mapped={!!mapped} />
            {name}
          </div>
        </td>
        <td className="px-12 py-6 fs-13">
          <input
            className="form-input"
            style={{ fontSize: "var(--text-label)", padding: "var(--space-1) var(--space-2)", width: "100%", maxWidth: 300, background: mapped ? "var(--bg3)" : "var(--bg2)" }}
            value={mapped || ""}
            placeholder={name}
            onChange={e => updateMapping(type, name, e.target.value)}
          />
        </td>
      </tr>
    );
  };

  // Test export handler
  const handleTestExport = () => {
    import("../../utils/qbExport.js").then(({ generateTimeIIF, downloadIIF }) => {
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const sampleEntries = [
        {
          employeeName: employeeNames[0] || "Sample Employee",
          projectName: projectNames[0] || "Sample Project",
          clockIn: new Date(yesterday.setHours(7, 0, 0)).toISOString(),
          clockOut: new Date(yesterday.setHours(15, 30, 0)).toISOString(),
          notes: "Test entry — verify names match QB Desktop"
        },
        {
          employeeName: employeeNames[1] || employeeNames[0] || "Sample Employee 2",
          projectName: projectNames[0] || "Sample Project",
          clockIn: new Date(yesterday.setHours(7, 0, 0)).toISOString(),
          clockOut: new Date(yesterday.setHours(14, 0, 0)).toISOString(),
          notes: "Test entry 2"
        }
      ];
      const iif = generateTimeIIF(sampleEntries, {
        serviceItem: mappings.serviceItem || "Drywall Labor",
        payrollItem: mappings.payrollItem || "Hourly Rate",
      });
      downloadIIF(iif, `EBC_QB_TEST_${now.toISOString().slice(0, 10)}.iif`);
      app.show("Test IIF downloaded — import into QB Desktop to verify format", "ok");
    });
  };

  return (
    <div className="mt-16">
      <div className="section-title">QuickBooks Desktop Integration</div>

      {/* Instructions Panel */}
      <div className="card" style={{ borderLeft: "3px solid var(--blue)" }}>
        <div className="fs-secondary fw-semi mb-sp2 c-text">How It Works</div>
        <ol className="fs-label c-text2" style={{ lineHeight: 1.8, paddingLeft: "var(--space-5)", margin: "0" }}>
          <li>Map EBC-OS employee and project names to their <strong>exact</strong> QuickBooks Desktop names below.</li>
          <li>Export IIF files from <strong>Time Clock Admin</strong> (payroll) or <strong>Financials &gt; Invoices</strong>.</li>
          <li>Transfer the <code>.iif</code> file to Anna's computer.</li>
          <li>In QB Desktop: <em>File &gt; Utilities &gt; Import &gt; IIF Files</em> and select the file.</li>
        </ol>
        <div className="rounded-control fs-label mt-sp3 c-amber" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--amber-dim)" }}>
          QB imports fail silently if names don't match exactly (case-sensitive). Use the Test Export button below to verify.
        </div>
      </div>

      {/* Employee Mappings */}
      <div className="card mt-16">
        <div className="flex fs-secondary fw-semi mb-sp1 gap-sp2 c-text">
          Employee Name Mapping
          <span style={{ fontWeight: "var(--weight-normal)", fontSize: "var(--text-label)", color: empMappedCount === employeeNames.length && employeeNames.length > 0 ? "var(--green)" : "var(--text2)" }}>
            {empMappedCount}/{employeeNames.length} mapped
          </span>
        </div>
        <p className="mb-sp3 fs-label c-text2">
          Leave blank if the EBC name matches QB exactly. Only fill in names that differ.
        </p>
        {employeeNames.length === 0 ? (
          <p className="fs-label c-text2" style={{ fontStyle: "italic" }}>No employees found. Add employees in the team roster.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead><tr>
                <th className="fs-label text-left" style={{ padding: "var(--space-2) var(--space-3)" }}>EBC-OS Name</th>
                <th className="fs-label text-left" style={{ padding: "var(--space-2) var(--space-3)" }}>QB Desktop Name</th>
              </tr></thead>
              <tbody>
                {employeeNames.map(name => <MappingRow key={name} type="employees" name={name} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project/Job Mappings */}
      <div className="card mt-16">
        <div className="flex fs-secondary fw-semi mb-sp1 gap-sp2 c-text">
          Project / Job Mapping
          <span style={{ fontWeight: "var(--weight-normal)", fontSize: "var(--text-label)", color: jobMappedCount === projectNames.length && projectNames.length > 0 ? "var(--green)" : "var(--text2)" }}>
            {jobMappedCount}/{projectNames.length} mapped
          </span>
        </div>
        <p className="mb-sp3 fs-label c-text2">
          Use the QB <code>Customer:Job</code> format (e.g. "Satterfield Properties:Memorial Heights Ph2").
        </p>
        {projectNames.length === 0 ? (
          <p className="fs-label c-text2" style={{ fontStyle: "italic" }}>No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead><tr>
                <th className="fs-label text-left" style={{ padding: "var(--space-2) var(--space-3)" }}>EBC-OS Name</th>
                <th className="fs-label text-left" style={{ padding: "var(--space-2) var(--space-3)" }}>QB Desktop Name (Customer:Job)</th>
              </tr></thead>
              <tbody>
                {projectNames.map(name => <MappingRow key={name} type="jobs" name={name} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QB Export Defaults */}
      <div className="card mt-16">
        <div className="fs-secondary fw-semi mb-sp2 c-text">QB Export Defaults</div>
        <p className="mb-sp3 fs-label c-text2">Default service and payroll item names used when generating IIF exports.</p>
        <div className="gap-sp4 d-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          <div>
            <label className="mb-sp1 fs-label c-text2 d-block">Payroll Item Name</label>
            <input className="form-input fs-label w-full" style={{ padding: "var(--space-1) var(--space-2)" }}
              value={mappings.payrollItem || ""}
              placeholder="Hourly Rate"
              onChange={e => save({ ...mappings, payrollItem: e.target.value || undefined })} />
          </div>
          <div>
            <label className="mb-sp1 fs-label c-text2 d-block">Service Item (Invoices)</label>
            <input className="form-input fs-label w-full" style={{ padding: "var(--space-1) var(--space-2)" }}
              value={mappings.serviceItem || ""}
              placeholder="Drywall Labor"
              onChange={e => save({ ...mappings, serviceItem: e.target.value || undefined })} />
          </div>
          <div>
            <label className="mb-sp1 fs-label c-text2 d-block">Income Account</label>
            <input className="form-input fs-label w-full" style={{ padding: "var(--space-1) var(--space-2)" }}
              value={mappings.incomeAccount || ""}
              placeholder="Construction Income"
              onChange={e => save({ ...mappings, incomeAccount: e.target.value || undefined })} />
          </div>
          <div>
            <label className="mb-sp1 fs-label c-text2 d-block">A/R Account</label>
            <input className="form-input fs-label w-full" style={{ padding: "var(--space-1) var(--space-2)" }}
              value={mappings.arAccount || ""}
              placeholder="Accounts Receivable"
              onChange={e => save({ ...mappings, arAccount: e.target.value || undefined })} />
          </div>
        </div>
      </div>

      {/* Test Export */}
      <div className="card mt-16 gap-sp3 flex-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="fs-secondary fw-semi c-text">Test Export</div>
          <div className="fs-label c-text2" style={{ maxWidth: 480 }}>
            Generate a sample IIF file with dummy time entries to verify the format imports correctly into QB Desktop.
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleTestExport}>
          Download Test IIF
        </button>
      </div>

      {/* Reset */}
      <div className="card mt-16 flex-between">
        <div>
          <div className="fw-semi fs-label c-text">Reset All Mappings</div>
          <div className="more-account-email">Clear all QB name mappings and defaults. Start fresh.</div>
        </div>
        <button className="btn btn-ghost btn-sm more-btn-logout"
          onClick={() => { if (confirm("Reset all QB mappings and defaults?")) { save({}); app.show("QB mappings cleared"); } }}>
          Reset
        </button>
      </div>
    </div>
  );
}

/* ── Theme Picker ────────────────────────────────────────────── */
function ThemeTab({ app }) {
  return (
    <div className="mt-16">
      <div className="section-title">Theme</div>
      <div className="mt-sp4 gap-sp4 d-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {Object.entries(THEMES).map(([key, theme]) => {
          const isActive = app.theme === key;
          return (
            <div
              key={key}
              className="card"
              onClick={() => app.setTheme(key)}
              style={{
                cursor: "pointer",
                border: isActive ? "2px solid var(--amber)" : "2px solid transparent",
                textAlign: "center",
                padding: "var(--space-6)",
                transition: "border-color 0.2s",
              }}
            >
              <div className="justify-center" style={{ display: "flex" }}>{
                theme.icon === "logo" ? <img src={app.theme === "daylight" ? "/ebc-eagle.png" : "/ebc-eagle-white.png"} alt="EBC" style={{ width: 32, height: 32, objectFit: "contain" }} /> :
                theme.icon === "building-2" ? <Building2 size={32} /> :
                theme.icon === "moon" ? <Moon size={32} /> :
                theme.icon === "sun" ? <Sun size={32} /> :
                <span className="fs-stat">{theme.icon}</span>
              }</div>
              <div className="fw-semi mt-sp2">{theme.name}</div>
              {isActive && <div className="badge-green mt-8">Active</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Security & Privacy ─────────────────────────────────────── */
function SecurityTab({ app }) {
  const [inventory, setInventory] = useState(null);

  const scanStorage = () => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const val = localStorage.getItem(k) || "";
      const size = new Blob([val]).size;
      const isSensitive = /api|key|password|token|secret|auth/i.test(k);
      items.push({ key: k, size, isSensitive });
    }
    items.sort((a, b) => b.size - a.size);
    setInventory(items);
  };

  const clearApiKey = () => {
    if (!confirm("Clear API key from this browser? You'll need to re-enter it to use AI features.")) return;
    app.setApiKey("");
    localStorage.removeItem("ebc_apiKey");
    app.show("API key cleared", "ok");
  };

  const clearAllData = () => {
    if (!confirm("⚠ NUCLEAR OPTION: This will erase ALL EBC-OS data from this browser — bids, projects, settings, everything.\n\nExport a backup first from Settings → Data.\n\nType YES to confirm.")) return;
    const secondConfirm = prompt("Type YES to confirm clearing all local data:");
    if (secondConfirm !== "YES") { app.show("Cancelled", "err"); return; }
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith("ebc_") || k.startsWith("ebc-")) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    app.show(`Cleared ${keysToRemove.length} items. Reloading...`, "ok");
    setTimeout(() => window.location.reload(), 1500);
  };

  const fmtSize = (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  return (
    <div className="mt-16">
      <div className="section-title flex-center-gap-8"><Shield style={{ width: 16, height: 16 }} /> Security & Privacy</div>

      {/* Clear API Key */}
      <div className="card mt-16">
        <div className="flex-between">
          <div>
            <strong className="flex-center-gap-8"><Lock style={{ width: 14, height: 14 }} /> API Key</strong>
            <p className="text2 mt-4">
              {app.apiKey
                ? <>Key stored: <span className="font-mono">sk-ant-...{app.apiKey.slice(-4)}</span></>
                : "No API key stored"}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm text-red" onClick={clearApiKey} disabled={!app.apiKey}>
            <Trash2 style={{ width: 14, height: 14 }} /> Clear Key
          </button>
        </div>
      </div>

      {/* Storage Inventory */}
      <div className="card mt-16">
        <div className="flex-between mb-12">
          <div>
            <strong className="flex-center-gap-8"><Eye style={{ width: 14, height: 14 }} /> Storage Inventory</strong>
            <p className="text2 mt-4">See what EBC-OS stores in your browser.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={scanStorage}>
            {inventory ? "Refresh" : "Scan Storage"}
          </button>
        </div>
        {inventory && (
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <table className="w-full fs-13">
              <thead>
                <tr className="text-left">
                  <th className="px-8 py-4">Key</th>
                  <th className="px-8 py-4">Size</th>
                  <th className="px-8 py-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.key} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-8 py-4 font-mono" style={{ fontSize: 11, wordBreak: "break-all" }}>{item.key}</td>
                    <td className="px-8 py-4 ws-nowrap">{fmtSize(item.size)}</td>
                    <td className="px-8 py-4">{item.isSensitive ? <span className="badge badge-red">Sensitive</span> : <span className="badge badge-muted">Data</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-dim mt-8">
              Total: {inventory.length} keys · {fmtSize(inventory.reduce((s, i) => s + i.size, 0))}
            </div>
          </div>
        )}
      </div>

      {/* Nuclear Option */}
      <div className="card mt-16" style={{ border: "1px solid var(--red)", background: "rgba(239,68,68,0.04)" }}>
        <strong className="flex-center-gap-8 text-red"><AlertTriangle style={{ width: 14, height: 14 }} /> Clear All Local Data</strong>
        <p className="text2 mt-4 mb-12">Permanently erase all EBC-OS data from this browser. Export a backup first.</p>
        <button className="btn btn-danger btn-sm" onClick={clearAllData}>
          <Trash2 style={{ width: 14, height: 14 }} /> Erase Everything
        </button>
      </div>
    </div>
  );
}

/* ── API Settings ────────────────────────────────────────────── */
const API_KEY_WARNING_KEY = "ebc_api_key_warning_dismissed";

function ApiTab({ app }) {
  const [key, setKey] = useState(app.apiKey || "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);
  const [warningDismissed, setWarningDismissed] = useState(() => localStorage.getItem(API_KEY_WARNING_KEY) === "1");

  const dismissWarning = () => {
    localStorage.setItem(API_KEY_WARNING_KEY, "1");
    setWarningDismissed(true);
  };

  const saveKey = () => {
    if (key && !key.startsWith("sk-ant-")) {
      app.show("Key should start with sk-ant-", "err");
      return;
    }
    app.setApiKey(key);
    app.show(key ? "API key saved" : "API key cleared");
  };

  const testConnection = async () => {
    if (!key) { app.show("Enter an API key first", "err"); return; }
    setTesting(true);
    setStatus(null);
    try {
      const { callClaude } = await import("../../utils/api.js");
      const result = await callClaude(key, "Reply with exactly: EBC connected", 32);
      if (result.toLowerCase().includes("connected")) {
        setStatus("ok");
        app.show("API connected successfully");
      } else {
        setStatus("ok");
        app.show("API responding");
      }
    } catch (err) {
      setStatus("err");
      app.show("Connection failed: " + err.message, "err");
    }
    setTesting(false);
  };

  return (
    <div className="mt-16">
      {/* F2: One-time security warning */}
      {!warningDismissed && (
        <div className="card mb-16" style={{ border: "1px solid var(--amber)", background: "var(--amber-dim)" }}>
          <div className="flex-between">
            <div className="flex-center-gap-8">
              <AlertTriangle style={{ width: 16, height: 16, color: "var(--amber)", flexShrink: 0 }} />
              <div>
                <strong className="text-sm">Security Notice</strong>
                <p className="text-xs text-dim mt-2">
                  Your API key is stored in this browser's local storage and is visible in developer tools.
                  Do not use shared or public computers. Clear your key when done on shared machines.
                </p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm ws-nowrap" onClick={dismissWarning}>Got it</button>
          </div>
        </div>
      )}

      <div className="section-title">Anthropic API</div>
      <div className="card mt-16">
        <div className="text-sm text-dim mb-16">
          Connect your Anthropic API key to enable Gmail bid sync and AI-drafted appreciation emails.
        </div>
        <div className="form-grid">
          <div className="form-group full">
            <label className="form-label">API Key</label>
            <input
              className="form-input font-mono"
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
        </div>
        <div className="flex gap-8 mt-16 items-center">
          <button className="btn btn-primary btn-sm" onClick={saveKey}>Save Key</button>
          <button className="btn btn-ghost btn-sm" onClick={testConnection} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {key && <button className="btn btn-ghost btn-sm text-red" onClick={() => { setKey(""); app.setApiKey(""); app.show("API key cleared"); }}>Clear Key</button>}
          {status === "ok" && <span className="badge badge-green">Connected</span>}
          {status === "err" && <span className="badge badge-red">Failed</span>}
          {app.apiKey && !status && <span className="text-xs text-muted">Key set: sk-ant-...{app.apiKey.slice(-4)}</span>}
        </div>
      </div>

      {/* F4: Backend proxy — future work */}
      <div className="card mt-16" style={{ border: "1px dashed var(--border2)", opacity: 0.8 }}>
        <div className="flex-center-gap-8 mb-8">
          <Server style={{ width: 14, height: 14, color: "var(--text3)" }} />
          <strong className="text-sm" style={{ color: "var(--text3)" }}>Backend Proxy (Coming Soon)</strong>
        </div>
        <p className="text-xs text-dim">
          Future: API calls will route through a Netlify Function or Supabase Edge Function so the key never touches the browser.
          This doesn't block daily use — your key works fine locally for now.
        </p>
      </div>

      <div className="section-title mt-16">Features</div>
      <div className="card mt-16">
        <div className="fs-13">
          <div className="border-b" style={{ padding: "var(--space-2) 0" }}>
            <strong>Gmail Bid Sync</strong> — Analyze emails for bid information and auto-populate bid tracker
          </div>
          <div className="border-b" style={{ padding: "var(--space-2) 0" }}>
            <strong>AI Appreciation Emails</strong> — Draft thank-you emails based on project performance tiers
          </div>
          <div className="py-8">
            <strong>Bid Analysis</strong> — Get AI insights on bid patterns and win rate optimization
          </div>
        </div>
      </div>
    </div>
  );
}
