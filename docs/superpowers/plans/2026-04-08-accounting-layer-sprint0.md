# Accounting Layer — Sprint 0: Foundation Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five universal data integrity issues that every subsequent accounting slice depends on: soft-delete, audit trails, required field validation, actual labor rates, and duplicate detection.

**Architecture:** All changes are in the existing React SPA. Financial records use localStorage via `useSyncedState`. The `addAudit()` helper in MoreTabs.jsx is the audit pattern. ForemanView.jsx already has soft-delete patterns to follow. No new dependencies.

**Tech Stack:** React, localStorage via `useSyncedState`, existing `addAudit()` helper.

**Spec:** `docs/superpowers/specs/2026-04-08-accounting-layer-design.md` — Sprint 0 sections 0.1 through 0.5.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/utils/financialValidation.js` | Validation, soft-delete, audit-diff, duplicate detection utilities | Create |
| `src/tabs/MoreTabs.jsx` | Financials tab: Invoices, COs, Job Costing, Payroll, Aging | Modify |
| `src/App.jsx` | App state, project cost displays, margin calculations | Modify |
| `src/data/constants.js` | Seed data, add `initCompanySettings` | Modify |

---

### Task 1: Create Financial Validation Utility Module

**Files:**
- Create: `src/utils/financialValidation.js`

This module holds all shared financial logic: validation rules, audit-diff, soft-delete helper, duplicate detection. Keeps MoreTabs.jsx focused on UI.

- [ ] **Step 1: Create the validation module with all five utilities**

```js
// src/utils/financialValidation.js

/**
 * Financial Validation & Control Utilities
 *
 * Shared by all financial record types (invoices, COs, AP bills, etc.)
 * Provides: validation, audit-diff, soft-delete, duplicate detection.
 */

// ── Validation Rules ──

/**
 * Validate an invoice before save.
 * @param {Object} inv - Invoice record
 * @returns {string[]} Array of error messages (empty = valid)
 */
export function validateInvoice(inv) {
  const errors = [];
  if (!inv.projectId) errors.push("Project is required");
  if (!inv.amount || inv.amount <= 0) errors.push("Amount must be greater than $0");
  if (!inv.date) errors.push("Date is required");
  if (!inv.desc && !inv.description) errors.push("Description is required");
  return errors;
}

/**
 * Validate a change order before save.
 * @param {Object} co - Change order record
 * @returns {string[]} Array of error messages (empty = valid)
 */
export function validateChangeOrder(co) {
  const errors = [];
  if (!co.projectId) errors.push("Project is required");
  if (!co.description && !co.desc) errors.push("Description is required");
  if (co.amount === undefined || co.amount === null || co.amount === "") errors.push("Amount is required");
  if (!co.type) errors.push("Type is required (add/deduct/credit/rework)");
  if (!co.number) errors.push("CO number is required");
  return errors;
}

/**
 * Validate an AP bill before save.
 * @param {Object} bill - AP bill record
 * @returns {string[]} Array of error messages (empty = valid)
 */
export function validateAPBill(bill) {
  const errors = [];
  if (!bill.vendorId) errors.push("Vendor is required");
  if (!bill.projectId) errors.push("Project is required");
  if (!bill.amount || bill.amount <= 0) errors.push("Amount must be greater than $0");
  if (!bill.invoiceNumber) errors.push("Invoice number is required");
  if (!bill.date) errors.push("Date is required");
  if (!bill.costType) errors.push("Cost type is required");
  if (!bill.description) errors.push("Description is required");
  return errors;
}

// ── Audit-Diff ──

/**
 * Compare old and new record, call addAudit for each changed critical field.
 * Returns a new audit array with all changes appended.
 *
 * @param {Object} oldRecord - Previous record state
 * @param {Object} newRecord - Updated record state
 * @param {string[]} criticalFields - Field names to track
 * @param {Object} user - Current user {name}
 * @returns {Array} Updated audit array
 */
export function auditDiff(oldRecord, newRecord, criticalFields, user) {
  const audit = [...(oldRecord.audit || [])];
  const now = new Date().toISOString();
  const userName = user?.name || "System";

  for (const field of criticalFields) {
    const oldVal = oldRecord[field];
    const newVal = newRecord[field];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      audit.push({
        timestamp: now,
        userName,
        field,
        oldValue: String(oldVal ?? ""),
        newValue: String(newVal ?? ""),
      });
    }
  }
  return audit;
}

/** Critical fields per record type */
export const CRITICAL_FIELDS = {
  invoice: ["amount", "date", "dueDate", "projectId", "status", "desc", "paidDate", "checkNum"],
  changeOrder: ["amount", "status", "type", "submittedDate", "approvedDate", "desc", "description"],
  apBill: ["amount", "date", "dueDate", "vendorId", "projectId", "costType", "invoiceNumber", "status", "description"],
};

// ── Soft-Delete ──

/**
 * Soft-delete a financial record. Returns the updated record.
 * Does NOT remove from array — just marks as deleted.
 *
 * @param {Object} record - Record to soft-delete
 * @param {string} userName - Who is deleting
 * @param {string} reason - Why (from prompt)
 * @returns {Object} Updated record with deleted status
 */
export function softDelete(record, userName, reason) {
  const audit = [...(record.audit || [])];
  audit.push({
    timestamp: new Date().toISOString(),
    userName: userName || "System",
    field: "status",
    oldValue: record.status || "",
    newValue: "deleted",
  });
  return {
    ...record,
    status: "deleted",
    deletedAt: new Date().toISOString(),
    deletedBy: userName || "System",
    deletionReason: reason || "",
    audit,
  };
}

/**
 * Filter out soft-deleted records for active views.
 * @param {Array} records
 * @returns {Array} Records where status !== "deleted"
 */
export function filterActive(records) {
  return records.filter(r => r.status !== "deleted");
}

// ── Duplicate Detection ──

/**
 * Check for duplicate invoice: same number + same projectId.
 * @param {Object} invoice - Invoice to check
 * @param {Array} existingInvoices - All invoices
 * @returns {Object|null} The duplicate record, or null if no duplicate
 */
export function findDuplicateInvoice(invoice, existingInvoices) {
  return existingInvoices.find(
    inv => inv.id !== invoice.id
      && inv.number === invoice.number
      && inv.projectId === invoice.projectId
      && inv.status !== "deleted"
  ) || null;
}

/**
 * Check for duplicate change order: same number + same projectId.
 * @param {Object} co - CO to check
 * @param {Array} existingCOs - All COs
 * @returns {Object|null} The duplicate record, or null
 */
export function findDuplicateCO(co, existingCOs) {
  return existingCOs.find(
    c => c.id !== co.id
      && c.number === co.number
      && c.projectId === co.projectId
      && c.status !== "deleted"
  ) || null;
}

/**
 * Check for duplicate AP bill: same invoiceNumber + same vendorId.
 * @param {Object} bill - AP bill to check
 * @param {Array} existingBills - All AP bills
 * @returns {Object|null} The duplicate record, or null
 */
export function findDuplicateAPBill(bill, existingBills) {
  return existingBills.find(
    b => b.id !== bill.id
      && b.invoiceNumber === bill.invoiceNumber
      && b.vendorId === bill.vendorId
      && b.status !== "deleted"
  ) || null;
}

// ── Labor Cost Computation ──

/**
 * Compute actual labor cost for a project from time entries.
 * Uses each employee's actual hourlyRate, not a blended constant.
 *
 * @param {number} projectId - Project ID (or projectName for legacy entries)
 * @param {string} projectName - Project name (for legacy time entry matching)
 * @param {Array} timeEntries - All time entries
 * @param {Array} employees - All employees (with hourlyRate)
 * @param {number} burdenMultiplier - Labor burden multiplier (default 1.0)
 * @returns {{ hours: number, rawCost: number, burdenedCost: number }}
 */
export function computeProjectLaborCost(projectId, projectName, timeEntries, employees, burdenMultiplier = 1.0) {
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const employeeNameMap = new Map(employees.map(e => [e.name, e]));

  const projEntries = timeEntries.filter(te => {
    if (te.status === "deleted") return false;
    if (!te.clockIn || !te.clockOut) return false;
    if (te.isTM) return false; // T&M tracked separately
    // Match by projectId if available, else by projectName (legacy)
    if (te.projectId && te.projectId === projectId) return true;
    if (te.projectName && te.projectName === projectName) return true;
    return false;
  });

  let totalHours = 0;
  let rawCost = 0;

  for (const te of projEntries) {
    const hours = (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000;
    // Look up employee rate: by employeeId first, then by employeeName
    const emp = employeeMap.get(te.employeeId) || employeeNameMap.get(te.employeeName);
    const rate = emp?.hourlyRate || 0;
    totalHours += hours;
    rawCost += hours * rate;
  }

  return {
    hours: totalHours,
    rawCost,
    burdenedCost: rawCost * burdenMultiplier,
  };
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Run: `node -e "require('./src/utils/financialValidation.js')" 2>&1 || echo "Module uses ESM exports, expected"`

Expected: This will fail because of ESM `export` syntax in a CJS check. That's fine — the real check is that the React app builds. For now, visually confirm no typos.

- [ ] **Step 3: Commit**

```bash
git add src/utils/financialValidation.js
git commit -m "feat: add financial validation utility module

Shared utilities for all financial record types:
- validateInvoice, validateChangeOrder, validateAPBill
- auditDiff for field-level change tracking
- softDelete helper matching ForemanView pattern
- findDuplicateInvoice, findDuplicateCO, findDuplicateAPBill
- computeProjectLaborCost using actual employee hourlyRate

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 2: Replace Hard Deletes with Soft-Delete on Invoices

**Files:**
- Modify: `src/tabs/MoreTabs.jsx:276` (invoice delete button)
- Modify: `src/tabs/MoreTabs.jsx` (invoice list rendering — filter deleted)

- [ ] **Step 1: Import soft-delete utilities at top of MoreTabs.jsx**

At the top of `src/tabs/MoreTabs.jsx`, after the existing imports, add:

```js
import { softDelete, filterActive, auditDiff, CRITICAL_FIELDS, validateInvoice, findDuplicateInvoice, validateChangeOrder, findDuplicateCO, computeProjectLaborCost } from "../utils/financialValidation";
```

- [ ] **Step 2: Replace invoice hard-delete with soft-delete**

In `src/tabs/MoreTabs.jsx`, find the invoice delete button (around line 276):

```js
onClick={() => { if (confirm("Delete this invoice?")) { app.setInvoices(prev => prev.filter(i => i.id !== inv.id)); app.show("Invoice deleted"); } }}
```

Replace with:

```js
onClick={() => {
  const reason = prompt("Reason for voiding this invoice:");
  if (reason !== null) {
    app.setInvoices(prev => prev.map(i => i.id === inv.id ? softDelete(i, app.auth?.name, reason) : i));
    app.show("Invoice voided");
  }
}}
```

- [ ] **Step 3: Filter deleted invoices from the active list**

In the `InvoicesTab` component, find where invoices are iterated (around line 220). The invoices are currently rendered with `app.invoices.filter(...)`. Add a `showDeleted` state toggle and filter:

Add state at the top of `InvoicesTab`:
```js
const [showDeleted, setShowDeleted] = useState(false);
```

Wrap the invoice list filter to exclude deleted unless toggled:
```js
const visibleInvoices = (showDeleted ? app.invoices : filterActive(app.invoices))
  .filter(i => !filterProj || i.projectId === filterProj);
```

Add a toggle button near the filter controls:
```js
<button className={`btn btn-ghost btn-sm ${showDeleted ? "btn-active" : ""}`}
  onClick={() => setShowDeleted(v => !v)}>
  {showDeleted ? "Hide Voided" : "Show Voided"}
</button>
```

- [ ] **Step 4: Style deleted invoices visually**

In the invoice row rendering, add a visual indicator for deleted records:

```js
<tr key={inv.id} style={inv.status === "deleted" ? { opacity: 0.5, textDecoration: "line-through" } : {}}>
```

- [ ] **Step 5: Verify in browser — delete an invoice, confirm it shows as voided, not removed**

Run the app: `npm run dev`
Navigate to Financials > Invoices. Click the delete button on Invoice #0004. Enter a reason. Confirm:
- Invoice is still in the list (grayed out, line-through)
- Toggle "Show Voided" hides/shows it
- The invoice status is "deleted" in the data

- [ ] **Step 6: Commit**

```bash
git add src/tabs/MoreTabs.jsx
git commit -m "fix: replace invoice hard-delete with soft-delete

Invoices are now voided (status='deleted') with reason, deletedAt,
deletedBy, and audit trail entry instead of being removed from the
array. Deleted invoices are hidden by default with a 'Show Voided'
toggle for admin/accounting review.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 3: Replace Hard Deletes with Soft-Delete on Change Orders

**Files:**
- Modify: `src/tabs/MoreTabs.jsx:539` (CO delete button)

- [ ] **Step 1: Replace CO hard-delete with soft-delete**

In `src/tabs/MoreTabs.jsx`, find the CO delete button (around line 539):

```js
onClick={() => { if (confirm("Delete this change order?")) { app.setChangeOrders(prev => prev.filter(c => c.id !== co.id)); app.show("Change order deleted"); } }}
```

Replace with:

```js
onClick={() => {
  const reason = prompt("Reason for voiding this change order:");
  if (reason !== null) {
    app.setChangeOrders(prev => prev.map(c => c.id === co.id ? softDelete(c, app.auth?.name, reason) : c));
    app.show("Change order voided");
  }
}}
```

- [ ] **Step 2: Filter deleted COs from the active list**

Add `showDeletedCO` state to the `ChangeOrdersTab` and filter the CO list the same way as invoices:

```js
const [showDeletedCO, setShowDeletedCO] = useState(false);
const visibleCOs = (showDeletedCO ? app.changeOrders : filterActive(app.changeOrders))
  .filter(c => !coFilterProj || c.projectId === coFilterProj);
```

Add toggle button and deleted row styling (same pattern as Task 2).

- [ ] **Step 3: Also fix the CO delete in App.jsx (project detail view)**

In `src/App.jsx`, find the CO delete at approximately line 4485:

```js
const deleteCo = (coId) => { if (confirm("Delete this change order?")) app.setChangeOrders(prev => prev.filter(c => c.id !== coId)); };
```

Replace with:

```js
const deleteCo = (coId) => {
  const reason = prompt("Reason for voiding this change order:");
  if (reason !== null) {
    app.setChangeOrders(prev => prev.map(c => c.id === coId ? softDelete(c, app.auth?.name, reason) : c));
    app.show("Change order voided");
  }
};
```

Note: Import `softDelete` at the top of App.jsx:
```js
import { softDelete, filterActive, computeProjectLaborCost } from "./utils/financialValidation";
```

- [ ] **Step 4: Verify in browser — void a CO, confirm soft-delete behavior**

- [ ] **Step 5: Commit**

```bash
git add src/tabs/MoreTabs.jsx src/App.jsx
git commit -m "fix: replace change order hard-delete with soft-delete

Change orders are now voided with reason, deletedAt, deletedBy, and
audit trail. Matches invoice soft-delete pattern. Also fixes CO delete
in the project detail view (App.jsx).

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 4: Extend Audit Trail to All Financial Field Changes

**Files:**
- Modify: `src/tabs/MoreTabs.jsx` (invoice edit handler, CO status toggle)

- [ ] **Step 1: Add audit-diff to invoice edits**

Find the invoice edit/save logic in MoreTabs.jsx. When an invoice field is changed (amount, date, description, project, status), use `auditDiff` to capture all changes:

Wherever invoice updates happen (the `Mark Paid` button already audits status — keep that). For any inline edit of invoice fields, wrap the update:

```js
// Before saving invoice edits, diff the old and new:
const oldInv = app.invoices.find(i => i.id === editId);
const updatedInv = { ...oldInv, ...editedFields };
updatedInv.audit = auditDiff(oldInv, updatedInv, CRITICAL_FIELDS.invoice, app.auth);
app.setInvoices(prev => prev.map(i => i.id === editId ? updatedInv : i));
```

- [ ] **Step 2: Add audit-diff to CO status changes**

The CO status toggle (around line 517) already calls `addAudit` for status. Extend it to also audit amount, type, and description changes when editing a CO:

```js
// For CO edits in the project detail view (App.jsx ~4464):
const oldCo = app.changeOrders.find(c => c.id === coEditId);
const updatedCo = { ...oldCo, number: num, description: coForm.description, type: coForm.type, amount: finalAmt, status: coForm.status, date: coForm.date, notes: coForm.notes, tmTicketIds: tmIds };
updatedCo.audit = auditDiff(oldCo, updatedCo, CRITICAL_FIELDS.changeOrder, app.auth);
app.setChangeOrders(prev => prev.map(c => c.id === coEditId ? updatedCo : c));
```

- [ ] **Step 3: Verify — edit an invoice, check that audit trail shows field changes**

Navigate to Financials > Invoices. Edit an invoice's description. Check the Change History section shows the old and new values.

- [ ] **Step 4: Commit**

```bash
git add src/tabs/MoreTabs.jsx src/App.jsx
git commit -m "feat: extend audit trail to all financial field changes

All invoice and change order edits now capture field-level changes
via auditDiff: amount, date, project, description, status, type.
Previously only status transitions were audited.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 5: Add Required Field Validation on Invoice Save

**Files:**
- Modify: `src/tabs/MoreTabs.jsx` (invoice creation form)

- [ ] **Step 1: Add validation errors state and display**

In the invoice creation section of `InvoicesTab`, add validation state:

```js
const [invoiceErrors, setInvoiceErrors] = useState([]);
```

- [ ] **Step 2: Validate before save**

Find the invoice save handler. Before saving, validate:

```js
const errors = validateInvoice({ projectId: newInv.projectId, amount: newInv.amount, date: newInv.date, desc: newInv.desc });
if (errors.length > 0) {
  setInvoiceErrors(errors);
  return;
}
setInvoiceErrors([]);
// ...proceed with save
```

- [ ] **Step 3: Show validation errors in UI**

Below the invoice form, render errors:

```jsx
{invoiceErrors.length > 0 && (
  <div className="mt-4" style={{ color: "var(--red)", fontSize: "var(--fs-11)" }}>
    {invoiceErrors.map((err, i) => <div key={i}>• {err}</div>)}
  </div>
)}
```

- [ ] **Step 4: Add duplicate detection warning before save**

After validation passes but before saving, check for duplicates:

```js
const duplicate = findDuplicateInvoice({ number: newInv.number, projectId: newInv.projectId }, app.invoices);
if (duplicate) {
  const proceed = confirm(`Warning: Invoice #${newInv.number} already exists for this project (${app.fmt(duplicate.amount)}). Save anyway?`);
  if (!proceed) return;
}
```

- [ ] **Step 5: Verify in browser — try saving an invoice with empty fields, confirm errors show**

- [ ] **Step 6: Commit**

```bash
git add src/tabs/MoreTabs.jsx
git commit -m "feat: add required field validation and duplicate detection on invoices

Invoice save now validates: projectId, amount > 0, date, description.
Shows inline error messages. Also warns on duplicate invoice number +
project before save with option to override.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 6: Add Required Field Validation on Change Order Save

**Files:**
- Modify: `src/tabs/MoreTabs.jsx` (CO creation) and `src/App.jsx` (project detail CO form)

- [ ] **Step 1: Add CO validation to the MoreTabs CO creation**

Same pattern as Task 5 — add `coErrors` state, call `validateChangeOrder` before save, show errors, check `findDuplicateCO`.

- [ ] **Step 2: Add CO validation to the App.jsx project detail CO form**

The CO form at `App.jsx:~4460` also creates/edits COs. Add the same validation there:

```js
const errors = validateChangeOrder({ projectId: draft.id, description: coForm.description, amount: finalAmt, type: coForm.type, number: num });
if (errors.length > 0) {
  setCoErrors(errors);
  return;
}
```

- [ ] **Step 3: Verify in browser — try saving a CO with missing fields**

- [ ] **Step 4: Commit**

```bash
git add src/tabs/MoreTabs.jsx src/App.jsx
git commit -m "feat: add required field validation and duplicate detection on change orders

CO save validates: projectId, description, amount, type, number.
Shows inline errors. Warns on duplicate CO number + project.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 7: Replace BLENDED_RATE with Actual Employee Rates

**Files:**
- Modify: `src/tabs/MoreTabs.jsx:1240` (JobCostingTab — remove BLENDED_RATE)
- Modify: `src/data/constants.js` (add companySettings)
- Modify: `src/App.jsx` (add companySettings state, update margin calculations)

- [ ] **Step 1: Add company settings to constants.js**

In `src/data/constants.js`, add near the other seed data exports:

```js
// ── SEED: COMPANY SETTINGS ──
export const initCompanySettings = {
  laborBurdenMultiplier: 1.0,  // Set to 1.30-1.40 for burdened labor (taxes/insurance/benefits)
  defaultRetainageRate: 10,     // percent
  marginAlertThreshold: 25,     // percent — flag projects below this margin
};
```

- [ ] **Step 2: Add companySettings state in App.jsx**

In `src/App.jsx`, add to the state declarations (around line 377):

```js
const [companySettings, setCompanySettings] = useSyncedState("companySettings", initCompanySettings);
```

Add `companySettings` and `setCompanySettings` to the `app` object that's passed to child components.

- [ ] **Step 3: Replace BLENDED_RATE in JobCostingTab**

In `src/tabs/MoreTabs.jsx`, find the `JobCostingTab` section (around line 1230). Replace:

```js
const BLENDED_RATE = 45;
const projEntries = (app.timeEntries || []).filter(te => te.projectName === proj.name && te.clockIn && te.clockOut && !te.isTM);
const laborHours = projEntries.reduce((s, te) => s + (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000, 0);
const laborCost = laborHours * BLENDED_RATE;
```

With:

```js
const laborData = computeProjectLaborCost(
  proj.id,
  proj.name,
  app.timeEntries || [],
  app.employees || [],
  app.companySettings?.laborBurdenMultiplier || 1.0
);
const laborHours = laborData.hours;
const laborCost = laborData.burdenedCost;
```

- [ ] **Step 4: Update the labor cost display in JobCostingTab**

The existing display shows labor hours and labor cost. Update the display to also show the burden multiplier when it's > 1.0:

```jsx
<div><span className="text2">Labor Hours</span><br /><span className="font-mono">{laborHours.toFixed(1)}h</span></div>
<div><span className="text2">Labor Cost{(app.companySettings?.laborBurdenMultiplier || 1) > 1 ? " (burdened)" : ""}</span><br /><span className="font-mono">{app.fmt(laborCost)}</span></div>
```

- [ ] **Step 5: Update App.jsx margin calculations that use static laborCost/materialCost**

In `src/App.jsx`, find the margin calculation (around line 917-928) that reads `p.laborCost` and `p.materialCost`. These static fields remain on existing projects as seed data, but the computed cost should be used where available.

For now, keep the existing `p.laborCost`/`p.materialCost` as fallback but prefer computed values. This will be fully replaced in Slice 2 (Cost Accumulation Engine). Add a comment:

```js
// TODO(slice-2): Replace with computeProjectLaborCost once cost accumulation engine is built.
// For now, use static laborCost/materialCost as fallback if no time entries exist.
const computedLabor = computeProjectLaborCost(p.id, p.name, timeEntries, employees, companySettings?.laborBurdenMultiplier || 1.0);
const totalCost = (computedLabor.burdenedCost || p.laborCost || 0) + (p.materialCost || 0);
```

- [ ] **Step 6: Verify in browser — Job Costing tab now shows actual rates**

Check that the Job Costing tab shows labor cost calculated from individual employee rates, not the $45 flat rate. Compare: if Oscar (Foreman, $42/hr) has 10 hours, it should show $420, not $450.

- [ ] **Step 7: Commit**

```bash
git add src/utils/financialValidation.js src/tabs/MoreTabs.jsx src/data/constants.js src/App.jsx
git commit -m "feat: replace BLENDED_RATE with actual employee hourly rates

Job costing now uses each employee's actual hourlyRate from their
profile instead of the hardcoded $45 blended rate. Adds company
settings for laborBurdenMultiplier (taxes/insurance/benefits).
Labor cost = sum(hours × employee.hourlyRate) × burdenMultiplier.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 8: Verify All Sprint 0 Changes Together

**Files:** None — this is a verification task.

- [ ] **Step 1: Run the app and test all five fixes**

Run: `npm run dev`

Test checklist:
1. **Soft-delete invoices:** Delete an invoice → shows as voided, not removed. Toggle "Show Voided" works.
2. **Soft-delete COs:** Void a CO → shows as voided. Toggle works.
3. **Audit trail:** Edit an invoice field → Change History shows old/new values.
4. **Required fields:** Try saving invoice with empty project → error shown. Try saving CO with empty description → error shown.
5. **Duplicate detection:** Create invoice with same number + project as existing → warning shown.
6. **Actual labor rates:** Job Costing tab shows labor cost from actual employee rates, not $45.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: sprint 0 verification fixes

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## What's Next

Sprint 0 is complete. The foundation is solid. Next plans (separate documents):

1. **Slice 1:** `2026-04-08-accounting-layer-slice1-vendor-ap.md` — Vendor master + AP bills + AP aging + IIF export
2. **Slice 2:** `2026-04-08-accounting-layer-slice2-cost-engine.md` — Cost accumulation engine + replace static cost fields
3. **Slice 3:** `2026-04-08-accounting-layer-slice3-billing.md` — Invoice overhaul + SOV + retainage + WIP
4. **Slice 4:** `2026-04-08-accounting-layer-slice4-periods.md` — Period discipline + accruals + cutoff
5. **Slice 5:** `2026-04-08-accounting-layer-slice5-budget.md` — Budget structure + committed costs
6. **Slice 6:** `2026-04-08-accounting-layer-slice6-reporting.md` — Management reporting + exception dashboard

Slices 1 and 2 can run in parallel after Sprint 0. Slices 3-5 depend on 1+2. Slice 6 comes last.
