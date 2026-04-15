# Phase B — Submittal Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a company-wide submittal library, link it to project submittals with multi-select + auto-populate, and surface RFI/submittal counts in the project overview.

**Architecture:** New `submittalLibrary` state array persisted via `useSyncedState`. New `SubmittalLibraryTab.jsx` under More. ModalHub.jsx modified to merge submittals+rfis tabs and add overview status strip + library picker. Seed data extracted from existing submittals tagged "Available in EBC submittal library".

**Tech Stack:** React 19, localStorage via useSyncedState, lucide-react icons, existing CSS class system.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/data/constants.js` | Modify | Add `SUBMITTAL_CATEGORIES`, `_demoSubmittalLibrary` seed, `initSubmittalLibrary` export |
| `src/App.jsx` | Modify | Add `submittalLibrary` state, `setSubmittalLibrary`, register in `app` object, add `"submittalLibrary"` to SECONDARY_TABS and routing |
| `src/tabs/MoreTabs.jsx` | Modify | Add lazy import + case for `submittalLibrary` |
| `src/tabs/more/SubmittalLibraryTab.jsx` | Create | Master catalog UI — search, filter, add/edit/delete |
| `src/components/ModalHub.jsx` | Modify | Merge submittals+rfis tabs, add overview status strip, add "Add from Library" picker |

---

### Task 1: Add Submittal Library Data Layer (constants.js + App.jsx)

**Files:**
- Modify: `src/data/constants.js:517` (after `_demoSubmittals`)
- Modify: `src/App.jsx:88` (SECONDARY_TABS), `src/App.jsx:384` (state), `src/App.jsx:685` (app object), `src/App.jsx:4986` (routing)

- [ ] **Step 1: Add SUBMITTAL_CATEGORIES and seed data to constants.js**

After line 517 (after `_demoSubmittals` closing bracket), add:

```javascript
// ── SUBMITTAL CATEGORIES ──
export const SUBMITTAL_CATEGORIES = [
  "Framing", "Drywall/Gypsum", "Acoustical Ceilings", "Insulation",
  "Doors/Frames", "Sheathing", "Specialty", "Accessories"
];

// ── SEED: SUBMITTAL LIBRARY (master catalog) ──
const _demoSubmittalLibrary = [
  { id: "sl-001", itemName: "USG Sheetrock Firecode X Panels", manufacturer: "USG", specModel: "Firecode X 5/8\"", category: "Drywall/Gypsum", specSection: "09 21 16", type: "product data", lastUsedDate: "2026-03-03", lastUsedProject: "Arch-Con - Sprouts Farmers Market", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-002", itemName: "Sheetrock Mold Tough Firecode X Panels", manufacturer: "USG", specModel: "Mold Tough Firecode X 5/8\"", category: "Drywall/Gypsum", specSection: "09 21 16", type: "product data", lastUsedDate: "2026-03-03", lastUsedProject: "Arch-Con - Sprouts Farmers Market", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-003", itemName: "Knauf EcoBatt Insulation R-11", manufacturer: "Knauf", specModel: "EcoBatt R-11", category: "Insulation", specSection: "07 21 00", type: "product data", lastUsedDate: "2026-01-27", lastUsedProject: "PPER - Missouri City", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-004", itemName: "Knauf EcoBatt Insulation R-8", manufacturer: "Knauf", specModel: "EcoBatt R-8", category: "Insulation", specSection: "07 21 00", type: "product data", lastUsedDate: "2026-01-27", lastUsedProject: "PPER - Missouri City", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-005", itemName: "Knauf EcoBatt Insulation R-19", manufacturer: "Knauf", specModel: "EcoBatt R-19", category: "Insulation", specSection: "07 21 00", type: "product data", lastUsedDate: "2026-01-27", lastUsedProject: "PPER - Missouri City", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-006", itemName: "Armstrong Prelude XL 15/16\" Exposed Tee Grid", manufacturer: "Armstrong", specModel: "Prelude XL 15/16\"", category: "Acoustical Ceilings", specSection: "09 51 00", type: "product data", lastUsedDate: "2026-03-03", lastUsedProject: "Arch-Con - Sprouts Farmers Market", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-007", itemName: "ToughRock Fireguard X Mold Guard", manufacturer: "GP", specModel: "Fireguard X Mold Guard 5/8\"", category: "Drywall/Gypsum", specSection: "09 21 16", type: "product data", lastUsedDate: "2026-03-03", lastUsedProject: "Arch-Con - Sprouts Farmers Market", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-008", itemName: "DensShield Tile Backer", manufacturer: "GP", specModel: "DensShield 1/2\"", category: "Sheathing", specSection: "09 28 00", type: "product data", lastUsedDate: "2026-02-24", lastUsedProject: "Texas Heart Center - Baytown", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-009", itemName: "USG Durock Cement Board with EdgeGuard", manufacturer: "USG", specModel: "Durock 1/2\"", category: "Specialty", specSection: "09 28 00", type: "product data", lastUsedDate: "2026-02-24", lastUsedProject: "Texas Heart Center - Baytown", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-010", itemName: "DensGlass Gold Exterior Sheathing", manufacturer: "GP", specModel: "DensGlass Gold 5/8\"", category: "Sheathing", specSection: "07 25 00", type: "product data", lastUsedDate: "2026-01-27", lastUsedProject: "PPER - Missouri City", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-011", itemName: "Owens Corning Thermal Batt Insulation", manufacturer: "Owens Corning", specModel: "Thermal Batt", category: "Insulation", specSection: "07 21 00", type: "product data", lastUsedDate: "2026-01-27", lastUsedProject: "PPER - Missouri City", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
  { id: "sl-012", itemName: "Knauf EcoBatt Insulation", manufacturer: "Knauf", specModel: "EcoBatt (general)", category: "Insulation", specSection: "07 21 00", type: "product data", lastUsedDate: "2026-03-03", lastUsedProject: "Arch-Con - Sprouts Farmers Market", approvalStatus: "approved", notes: "", createdAt: "2026-01-01" },
];
```

- [ ] **Step 2: Add initSubmittalLibrary export**

Find the line `export const initSubmittals = _demoSubmittals;` (line 747) and add after it:

```javascript
export const initSubmittalLibrary = _demoSubmittalLibrary;
```

- [ ] **Step 3: Add submittalLibrary state to App.jsx**

In `src/App.jsx`, add the import — find the line importing `initRfis, initSubmittals` (line 8) and add `initSubmittalLibrary` to the import list.

Then after line 384 (`const [submittals, setSubmittals, _syncSubmittals] = useSyncedState("submittals", initSubmittals);`), add:

```javascript
const [submittalLibrary, setSubmittalLibrary, _syncSubLibrary] = useSyncedState("submittalLibrary", initSubmittalLibrary);
```

- [ ] **Step 4: Add submittalLibrary to the app object**

In the `app` object (line 685), after `submittals, setSubmittals,` add:

```javascript
submittalLibrary, setSubmittalLibrary,
```

- [ ] **Step 5: Register submittalLibrary in SECONDARY_TABS**

In `SECONDARY_TABS` (line 88), add after the `{ key: "documents", label: "Documents" },` line:

```javascript
{ key: "submittalLibrary", label: "Submittal Library" },
```

- [ ] **Step 6: Add submittalLibrary to the MoreTabs routing**

In `src/App.jsx` line 4986, add `"submittalLibrary"` to the array:

```javascript
{["financials", "documents", "submittalLibrary", "schedule", "reports", "safety", "timeclock", "sds", "map", "settings"].includes(tab) && <MoreTabs app={app} />}
```

- [ ] **Step 7: Commit**

```bash
git add src/data/constants.js src/App.jsx
git commit -m "feat(B1): add submittal library data layer — seed data, state, routing"
```

---

### Task 2: Create SubmittalLibraryTab.jsx + Wire into MoreTabs

**Files:**
- Create: `src/tabs/more/SubmittalLibraryTab.jsx`
- Modify: `src/tabs/MoreTabs.jsx`

- [ ] **Step 1: Create SubmittalLibraryTab.jsx**

Create `src/tabs/more/SubmittalLibraryTab.jsx`:

```jsx
import { useState } from "react";
import { SUBMITTAL_CATEGORIES } from "../../data/constants";

const APPROVAL_BADGE = {
  approved: "badge-green",
  pending: "badge-amber",
  "not submitted": "badge-ghost",
};

const EMPTY_FORM = {
  itemName: "", manufacturer: "", specModel: "", category: "",
  specSection: "", type: "product data", approvalStatus: "not submitted", notes: "",
};

export function SubmittalLibrary({ app }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const library = app.submittalLibrary || [];

  const filtered = library.filter(item => {
    if (catFilter !== "all" && item.category !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return item.itemName.toLowerCase().includes(q)
      || (item.manufacturer || "").toLowerCase().includes(q)
      || (item.specModel || "").toLowerCase().includes(q)
      || (item.specSection || "").toLowerCase().includes(q);
  });

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); };

  const openEdit = (item) => {
    setForm({
      itemName: item.itemName || "",
      manufacturer: item.manufacturer || "",
      specModel: item.specModel || "",
      category: item.category || "",
      specSection: item.specSection || "",
      type: item.type || "product data",
      approvalStatus: item.approvalStatus || "not submitted",
      notes: item.notes || "",
    });
    setEditId(item.id);
    setFormOpen(true);
  };

  const save = () => {
    if (!form.itemName) return app.show("Item name is required", "err");
    if (editId) {
      app.setSubmittalLibrary(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i));
      app.show("Library item updated", "ok");
    } else {
      const newItem = {
        id: "sl-" + crypto.randomUUID().slice(0, 8),
        ...form,
        lastUsedDate: null,
        lastUsedProject: null,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      app.setSubmittalLibrary(prev => [...prev, newItem]);
      app.show("Item added to library", "ok");
    }
    resetForm();
    setFormOpen(false);
  };

  const deleteItem = (id) => {
    app.setSubmittalLibrary(prev => prev.filter(i => i.id !== id));
    app.show("Item removed from library", "ok");
  };

  return (
    <div>
      <div className="flex-between mb-12">
        <div className="section-title">Submittal Library</div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setFormOpen(!formOpen); }}>+ Add Item</button>
      </div>

      {/* Search + Category Filter */}
      <div className="flex gap-8 mb-12 flex-wrap">
        <input
          className="form-input flex-1"
          placeholder="Search by name, manufacturer, spec..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 200, maxWidth: 400 }}
        />
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All Categories</option>
          {SUBMITTAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Add/Edit Form */}
      {formOpen && (
        <div className="card mb-16 p-sp4 bg-bg3" style={{ border: "1px solid var(--blue-dim)" }}>
          <div className="flex-between mb-8">
            <span className="font-semi text-sm">{editId ? "Edit Library Item" : "New Library Item"}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input className="form-input" placeholder="e.g. Armstrong Cortega 2x2 #704" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <input className="form-input" placeholder="e.g. Armstrong, USG, Knauf" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec / Model</label>
              <input className="form-input" placeholder="e.g. Firecode X 5/8&quot;" value={form.specModel} onChange={e => setForm(f => ({ ...f, specModel: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec Section</label>
              <input className="form-input" placeholder="e.g. 09 21 16" value={form.specSection} onChange={e => setForm(f => ({ ...f, specSection: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select...</option>
                {SUBMITTAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="product data">Product Data</option>
                <option value="sample">Sample</option>
                <option value="shop drawings">Shop Drawings</option>
                <option value="calculations">Calculations</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Approval Status</label>
              <select className="form-select" value={form.approvalStatus} onChange={e => setForm(f => ({ ...f, approvalStatus: e.target.value }))}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="not submitted">Not Submitted</option>
              </select>
            </div>
          </div>
          <div className="form-group mt-8">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-8 mt-12">
            <button className="btn btn-primary btn-sm" onClick={save}>{editId ? "Update" : "Add"} Item</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Library Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Manufacturer</th>
              <th>Spec / Model</th>
              <th style={{ width: 80 }}>Spec Sec.</th>
              <th style={{ width: 130 }}>Category</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 130 }}>Last Used</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-dim" style={{ padding: "var(--space-6)" }}>
                {search || catFilter !== "all" ? "No items match your search" : "No items in library — click \"+ Add Item\" to start"}
              </td></tr>
            )}
            {filtered.map(item => (
              <tr key={item.id}>
                <td className="font-semi">{item.itemName}</td>
                <td>{item.manufacturer || "—"}</td>
                <td className="text-sm">{item.specModel || "—"}</td>
                <td className="font-mono text-xs">{item.specSection || "—"}</td>
                <td className="text-xs">{item.category || "—"}</td>
                <td><span className={`badge ${APPROVAL_BADGE[item.approvalStatus] || "badge-ghost"} fs-10 capitalize`}>{item.approvalStatus}</span></td>
                <td className="text-xs">{item.lastUsedDate ? `${item.lastUsedDate}` : "—"}</td>
                <td>
                  <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm fs-10" onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn btn-ghost btn-sm fs-10 text-red" onClick={() => deleteItem(item.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {library.length > 0 && (
        <div className="flex gap-16 mt-12 text-xs text-dim">
          <span>Total: {library.length}</span>
          <span className="text-green">Approved: {library.filter(i => i.approvalStatus === "approved").length}</span>
          <span className="text-amber">Pending: {library.filter(i => i.approvalStatus === "pending").length}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into MoreTabs.jsx**

In `src/tabs/MoreTabs.jsx`, add the lazy import after line 12:

```javascript
const SubmittalLibrary = lazy(() => import("./more/SubmittalLibraryTab").then(m => ({ default: m.SubmittalLibrary })));
```

Add a case in the switch statement after `case "documents":`:

```javascript
case "submittalLibrary": return <SubmittalLibrary app={app} />;
```

- [ ] **Step 3: Commit**

```bash
git add src/tabs/more/SubmittalLibraryTab.jsx src/tabs/MoreTabs.jsx
git commit -m "feat(B1): submittal library UI — searchable catalog with add/edit/delete"
```

---

### Task 3: Merge Submittals + RFIs Tabs in Project Modal (B3)

**Files:**
- Modify: `src/components/ModalHub.jsx:488` (projTabs), `src/components/ModalHub.jsx:705` (overview tab), `src/components/ModalHub.jsx:1102` (submittals tab), `src/components/ModalHub.jsx:1275` (rfis tab)

- [ ] **Step 1: Update projTabs array to replace "submittals" and "rfis" with "rfis & submittals"**

In `src/components/ModalHub.jsx`, find line 488:

```javascript
const projTabs = ["overview", "notes", "change orders", "submittals", "rfis", "areas", "punch", "log", "reports", "team", "financials", "closeout", "logistics", "settings"];
```

Replace with:

```javascript
const projTabs = ["overview", "notes", "change orders", "rfis & submittals", "areas", "punch", "log", "reports", "team", "financials", "closeout", "logistics", "settings"];
```

- [ ] **Step 2: Add status strip to the overview tab**

Find the overview tab opening (line 715, the `return (` inside `projTab === "overview"`). After the opening `<div className="flex-col gap-12">`, before the first `<div className="flex gap-16 flex-wrap">` (the CONTRACT/BILLED/REMAINING row), add:

```jsx
{/* RFI & Submittal status strip */}
{(() => {
  const openRfis = projRFIs.filter(r => r.status === "open").length;
  const pendingSubs = projSubmittals.filter(s => s.status === "submitted" || s.status === "revise & resubmit").length;
  const hasIssues = openRfis > 0 || pendingSubs > 0;
  return (
    <div
      className="flex gap-16 items-center"
      style={{
        padding: "var(--space-2) var(--space-4)",
        borderRadius: "var(--radius)",
        background: hasIssues ? "rgba(var(--amber-rgb, 245,158,11), 0.08)" : "rgba(var(--green-rgb, 34,197,94), 0.08)",
        border: `1px solid ${hasIssues ? "var(--amber-dim, rgba(245,158,11,0.2))" : "var(--green-dim, rgba(34,197,94,0.2))"}`,
        cursor: hasIssues ? "pointer" : "default",
      }}
      onClick={() => hasIssues && setProjTab("rfis & submittals")}
    >
      <span className="text-xs" style={{ color: openRfis > 0 ? "var(--amber)" : "var(--green)" }}>
        {openRfis > 0 ? `${openRfis} RFI${openRfis !== 1 ? "s" : ""} open` : "All RFIs answered"}
      </span>
      <span className="text-xs text-dim">·</span>
      <span className="text-xs" style={{ color: pendingSubs > 0 ? "var(--amber)" : "var(--green)" }}>
        {pendingSubs > 0 ? `${pendingSubs} submittal${pendingSubs !== 1 ? "s" : ""} pending` : "All submittals resolved"}
      </span>
    </div>
  );
})()}
```

- [ ] **Step 3: Add badge count to the "rfis & submittals" tab button**

Find line 697 where the tab buttons are rendered:

```javascript
<button key={tab} className={`btn btn-sm fs-tab capitalize nowrap ${projTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjTab(tab)}>{tab}</button>
```

Replace with:

```jsx
<button key={tab} className={`btn btn-sm fs-tab capitalize nowrap ${projTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjTab(tab)}>
  {tab}
  {tab === "rfis & submittals" && (() => {
    const count = projRFIs.filter(r => r.status === "open").length + projSubmittals.filter(s => s.status === "submitted" || s.status === "revise & resubmit").length;
    return count > 0 ? <span className="ml-sp1 badge badge-amber fs-xs" style={{ padding: "0 5px", minWidth: "auto" }}>{count}</span> : null;
  })()}
</button>
```

- [ ] **Step 4: Create the combined "rfis & submittals" tab section**

Find the line `{projTab === "submittals" && (` (line 1102). This is the start of the submittals tab block. We need to wrap both the submittals block (lines 1102-1272) and rfis block (lines 1275-onwards) into one combined block.

Replace `{projTab === "submittals" && (` with:

```jsx
{projTab === "rfis & submittals" && (() => {
  const [rfiSubTab, setRfiSubTab] = useState("Submittals");
  return (
    <div>
      <div className="flex gap-4 mb-12 border-b" style={{ paddingBottom: "var(--space-2)" }}>
        {["Submittals", "RFIs"].map(t => (
          <button key={t} className={`btn btn-sm ${rfiSubTab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setRfiSubTab(t)}>
            {t}
            {t === "RFIs" && (() => { const c = projRFIs.filter(r => r.status === "open").length; return c > 0 ? <span className="ml-sp1 badge badge-amber fs-xs" style={{ padding: "0 5px", minWidth: "auto" }}>{c}</span> : null; })()}
            {t === "Submittals" && (() => { const c = projSubmittals.filter(s => s.status === "submitted" || s.status === "revise & resubmit").length; return c > 0 ? <span className="ml-sp1 badge badge-amber fs-xs" style={{ padding: "0 5px", minWidth: "auto" }}>{c}</span> : null; })()}
          </button>
        ))}
      </div>
      {rfiSubTab === "Submittals" && (
```

Then find the closing of the old submittals block (line 1272, the `)}` after the summary stats) and replace it with:

```jsx
      )}
```

Remove the old `{projTab === "rfis" && (` opening (was line 1275). The rfis content becomes:

```jsx
      {rfiSubTab === "RFIs" && (
```

And at the very end of the old rfis block closing, close the whole combined section:

```jsx
      )}
    </div>
  );
})()}
```

And remove the old separate `{projTab === "submittals" && (` and `{projTab === "rfis" && (` blocks entirely — they're now inside the combined block.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModalHub.jsx
git commit -m "feat(B3): merge submittals+rfis into combined tab, add overview status strip with counts"
```

---

### Task 4: Add "Add from Library" Picker to Project Modal (B2)

**Files:**
- Modify: `src/components/ModalHub.jsx` (inside the combined rfis & submittals tab, submittals sub-section)

- [ ] **Step 1: Add library picker state**

Inside the `viewProject` block in ModalHub.jsx (after the existing submittal state declarations like `subFormOpen`, `subForm`, etc.), add:

```javascript
const [libPickerOpen, setLibPickerOpen] = useState(false);
const [libSearch, setLibSearch] = useState("");
const [libCatFilter, setLibCatFilter] = useState("all");
const [libSelected, setLibSelected] = useState(new Set());
```

Also import `SUBMITTAL_CATEGORIES` at the top of ModalHub.jsx — find the imports from constants.js and add `SUBMITTAL_CATEGORIES`:

```javascript
import { SUBMITTAL_CATEGORIES } from "../data/constants";
```

- [ ] **Step 2: Add the "Add from Library" button next to "+ Add Submittal"**

In the submittals sub-section header (the `flex-between mb-8` div), find the `<button className="btn btn-primary btn-sm" onClick={() => { resetSubForm(); setSubFormOpen(!subFormOpen); }}>+ Add Submittal</button>` line and add before it:

```jsx
<button className="btn btn-ghost btn-sm" onClick={() => { setLibPickerOpen(!libPickerOpen); setLibSelected(new Set()); setLibSearch(""); setLibCatFilter("all"); }}>+ Add from Library</button>
```

- [ ] **Step 3: Add the library picker modal overlay**

Right after the `{/* Header + Add button */}` div and before `{/* Quick Filters */}`, add:

```jsx
{libPickerOpen && (() => {
  const lib = (app.submittalLibrary || []);
  const libFiltered = lib.filter(item => {
    if (libCatFilter !== "all" && item.category !== libCatFilter) return false;
    if (!libSearch) return true;
    const q = libSearch.toLowerCase();
    return item.itemName.toLowerCase().includes(q) || (item.manufacturer || "").toLowerCase().includes(q) || (item.specSection || "").toLowerCase().includes(q);
  });

  const toggleItem = (id) => {
    setLibSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addSelected = () => {
    if (libSelected.size === 0) return app.show("Select at least one item", "err");
    const selectedItems = lib.filter(i => libSelected.has(i.id));
    const today = new Date().toISOString().slice(0, 10);
    const gcContact = draft.contact || draft.gcSuperName || draft.gcPmName || "";

    // Auto-detect numbering pattern
    const existingNums = projSubmittals.map(s => s.number || "");
    let nextNum = projSubmittals.length + 1;
    let prefix = "SUB-";
    if (existingNums.length > 0) {
      const last = existingNums[existingNums.length - 1];
      const match = last.match(/^([A-Za-z0-9]+-?)(\d+)$/);
      if (match) {
        prefix = match[1];
        nextNum = parseInt(match[2]) + 1;
      }
    }

    const newSubmittals = selectedItems.map((item, idx) => ({
      id: crypto.randomUUID(),
      projectId: draft.id,
      number: prefix + String(nextNum + idx).padStart(3, "0"),
      description: item.itemName,
      specSection: item.specSection || "",
      type: item.type || "product data",
      status: "submitted",
      dateSubmitted: today,
      dateReturned: "",
      distributedBy: gcContact,
      notes: `From library: ${item.manufacturer || ""} ${item.specModel || ""}`.trim(),
      created: new Date().toISOString(),
      libraryItemId: item.id,
    }));

    app.setSubmittals(prev => [...prev, ...newSubmittals]);

    // Update library items' lastUsedDate and lastUsedProject
    const projName = draft.name || "Unknown";
    app.setSubmittalLibrary(prev => prev.map(i =>
      libSelected.has(i.id) ? { ...i, lastUsedDate: today, lastUsedProject: projName } : i
    ));

    app.show(`${newSubmittals.length} submittal${newSubmittals.length !== 1 ? "s" : ""} added from library`, "ok");
    setLibPickerOpen(false);
    setLibSelected(new Set());
  };

  return (
    <div className="card mb-12 p-sp4 bg-bg3" style={{ border: "1px solid var(--blue-dim)" }}>
      <div className="flex-between mb-8">
        <span className="font-semi text-sm">Pick from Submittal Library</span>
        <div className="flex gap-8">
          {libSelected.size > 0 && <button className="btn btn-primary btn-sm" onClick={addSelected}>Add Selected ({libSelected.size})</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => setLibPickerOpen(false)}>Cancel</button>
        </div>
      </div>
      <div className="flex gap-8 mb-8 flex-wrap">
        <input className="form-input flex-1" placeholder="Search library..." value={libSearch} onChange={e => setLibSearch(e.target.value)} style={{ minWidth: 200, maxWidth: 300 }} />
        <select className="form-select" value={libCatFilter} onChange={e => setLibCatFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">All Categories</option>
          {SUBMITTAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        <table className="data-table">
          <thead><tr><th style={{ width: 30 }}></th><th>Item</th><th>Manufacturer</th><th style={{ width: 80 }}>Spec</th><th style={{ width: 110 }}>Category</th><th style={{ width: 80 }}>Status</th></tr></thead>
          <tbody>
            {libFiltered.length === 0 && <tr><td colSpan={6} className="text-center text-dim" style={{ padding: "var(--space-4)" }}>No items match</td></tr>}
            {libFiltered.map(item => (
              <tr key={item.id} className="cursor-pointer" onClick={() => toggleItem(item.id)} style={{ background: libSelected.has(item.id) ? "rgba(var(--blue-rgb, 59,130,246), 0.1)" : undefined }}>
                <td><input type="checkbox" checked={libSelected.has(item.id)} onChange={() => toggleItem(item.id)} /></td>
                <td className="font-semi text-sm">{item.itemName}</td>
                <td className="text-xs">{item.manufacturer || "—"}</td>
                <td className="font-mono text-xs">{item.specSection || "—"}</td>
                <td className="text-xs">{item.category || "—"}</td>
                <td><span className={`badge fs-xs capitalize ${item.approvalStatus === "approved" ? "badge-green" : item.approvalStatus === "pending" ? "badge-amber" : "badge-ghost"}`}>{item.approvalStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ModalHub.jsx
git commit -m "feat(B2): library picker in project modal — multi-select, auto-populate from project data"
```

---

### Task 5: Add "Save to Library" Prompt on Manual Submittal Save

**Files:**
- Modify: `src/components/ModalHub.jsx` (inside the `saveSub` function in the viewProject submittals section)

- [ ] **Step 1: Find the saveSub function and add library prompt after save**

Find the `saveSub` function inside the viewProject block (search for `const saveSub`). At the end of the function, after the `app.show` success toast and before the form reset, add:

```javascript
// Prompt to add to library if not already from library
if (!subEditId) {
  const desc = subForm.description || "";
  const alreadyInLib = (app.submittalLibrary || []).some(li =>
    li.itemName.toLowerCase() === desc.toLowerCase()
  );
  if (!alreadyInLib && desc.length > 3) {
    setTimeout(() => {
      if (confirm(`Add "${desc}" to the Submittal Library for future use?`)) {
        const libItem = {
          id: "sl-" + crypto.randomUUID().slice(0, 8),
          itemName: desc,
          manufacturer: "",
          specModel: "",
          category: "",
          specSection: subForm.specSection || "",
          type: subForm.type || "product data",
          approvalStatus: subForm.status === "approved" ? "approved" : "not submitted",
          notes: "",
          lastUsedDate: new Date().toISOString().slice(0, 10),
          lastUsedProject: draft.name || "",
          createdAt: new Date().toISOString().slice(0, 10),
        };
        app.setSubmittalLibrary(prev => [...prev, libItem]);
        app.show("Added to Submittal Library", "ok");
      }
    }, 300);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ModalHub.jsx
git commit -m "feat(B2): prompt to save manual submittals to library for reuse"
```

---

### Task 6: Verify and Test

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 2: Start dev server and verify Submittal Library page**

```bash
npm run dev
```

Navigate to More → Submittal Library. Verify:
- 12 seed items display in the table
- Search filters work (type "USG", see only USG items)
- Category filter works (select "Insulation", see 4 items)
- Add Item form opens and saves a new item
- Edit and Delete work

- [ ] **Step 3: Verify project modal changes**

Open a project (e.g. Arch-Con Sprouts). Verify:
- Overview tab shows RFI/submittal status strip at the top
- "rfis & submittals" tab replaces separate "submittals" and "rfis" tabs
- Badge count shows on the tab
- Sub-tabs toggle between Submittals and RFIs
- Existing submittal/RFI data displays correctly

- [ ] **Step 4: Test "Add from Library" flow**

In a project's RFIs & Submittals tab → Submittals sub-tab:
- Click "+ Add from Library"
- Picker shows all 12 library items
- Search/filter works
- Multi-select 3 items → click "Add Selected (3)"
- 3 new submittals appear with auto-populated data (today's date, GC contact, sequential numbers)
- Library items' "Last Used" updates

- [ ] **Step 5: Test "Save to Library" prompt**

In a project → + Add Submittal → fill in a new item → save.
Verify the confirm dialog asks to add to library.
Click Yes → verify item appears in More → Submittal Library.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(B): address verification issues from Phase B testing"
```
