# EBC-OS Accounting Layer — Full Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Approach:** Hybrid — Foundation Sprint + Vertical Slices (Approach C)
**Architecture:** EBC-OS = accounting-grade capture/review/export layer. QB Desktop = system of record.

---

## Context

Three concurrent audits (bookkeeping controller, construction accountant, estimator) scored the financial layer at 19/100, 14/100, and 44/110 respectively. The financial data model is structurally insufficient: hard deletes on financial records, no required field enforcement, fictional labor rates ($45 blended constant), one invoice across 19 projects, no AP system, no period concept, no retainage tracking, no cost accumulation from transactions, no reconciliation paths, and no management reporting.

EBC stays on QuickBooks Desktop. QB Desktop is the accounting system of record. Gema handles bookkeeping in QB. EBC-OS does not replace QB — it ensures what goes into QB is trustworthy, traceable, and complete. All financial features are designed as accounting-grade data capture + review + export via IIF.

## Architecture Principles

1. **Every financial record is immutable once saved.** No hard deletes. Soft-delete with `status: "deleted"`, `deletedAt`, `deletedBy`, `deletionReason`. Void/reversal creates a new offsetting record.
2. **Every financial edit is audited.** `addAudit()` on every change to amount, date, project, cost code, vendor, status, or any critical field. Captures who, when, old value, new value.
3. **Every financial record has required fields.** Reject save if mandatory fields are empty. No "optional project" on a cost record.
4. **Costs are computed, never manually entered.** Project labor/material/sub costs are always the sum of underlying transactions. No static `laborCost`/`materialCost` fields.
5. **Everything exports to QB Desktop via IIF.** Every new financial record type gets a corresponding IIF export function in `qbExport.js`.
6. **Detail always ties to summary.** Any number shown in a report or dashboard must be reconstructable from the underlying records.

---

## Sprint 0: Foundation Fixes

**Goal:** Fix the universal data integrity issues that every subsequent slice depends on.

### 0.1 Soft-Delete on All Financial Records

**Current state:** Invoices deleted with `.filter()` hard remove at `MoreTabs.jsx:276`. COs same at line 539.

**Target state:** Match the pattern already used in ForemanView:
```js
{ ...record, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: userName, deletionReason: reason }
```

**Scope:**
- Invoices (MoreTabs `InvoicesTab`)
- Change Orders (MoreTabs `ChangeOrdersTab`)
- Any future financial record type

**Filter deleted records from active views** but preserve in data store. Add "Show deleted" toggle for admin/accounting roles.

### 0.2 Audit Trail on All Financial Edits

**Current state:** `addAudit()` exists at `MoreTabs.jsx:19` and is called on invoice status changes and CO status changes. Not called on amount, date, project, or description changes.

**Target state:** Every change to a financial record's critical fields calls `addAudit()`:
- Invoice: amount, date, dueDate, projectId, status, desc, paidDate, checkNum
- Change Order: amount, status, type, submittedDate, approvedDate, desc
- T&M Ticket: already has audit trail (preserve)
- Future AP bills, budget entries, etc.: audit from creation

**Implementation:** Wrap all financial record update functions. Before applying the update, diff old vs new on critical fields and call `addAudit()` for each changed field.

### 0.3 Required Field Enforcement

**Current state:** Invoice creation auto-generates number and date but does not validate project, amount, or description before save.

**Target state:**

| Record Type | Required Fields |
|---|---|
| Invoice | projectId, amount > 0, date, description |
| Change Order | projectId, description, amount, type, number |
| AP Bill (new) | vendorId, projectId, amount > 0, invoiceNumber, date, costType |
| T&M Ticket | projectId, at least one labor or material entry |

**Implementation:** Validation function per record type. Called on save. Returns array of error messages. UI shows inline errors. Save button disabled until valid.

### 0.4 Replace $45 Blended Rate

**Current state:** `const BLENDED_RATE = 45;` at `MoreTabs.jsx:1240`. Job costing multiplies all hours by this constant.

**Target state:** Job costing labor cost = sum of (hours x employee hourly rate) per time entry per project. Employee rates already exist in seed data (range $22-$42). Remove `BLENDED_RATE` constant entirely.

**Implementation:**
1. Each time entry has an `employeeId`. Look up employee record for `hourlyRate`.
2. Labor cost per project = `timeEntries.filter(e => e.projectId === pid).reduce((sum, e) => sum + e.hours * getEmployeeRate(e.employeeId), 0)`
3. Add configurable `laborBurdenMultiplier` (default 1.0, recommended 1.30-1.40 for taxes/insurance/benefits) at company settings level.
4. Burdened labor cost = raw labor cost x burden multiplier.
5. Update `JobCostingTab` to use computed values.
6. Remove all references to `BLENDED_RATE`.

### 0.5 Duplicate Detection

**Current state:** No duplicate checking anywhere.

**Target state:**
- On invoice save: warn if same `number` + same `projectId` already exists.
- On CO save: warn if same `number` + same `projectId` already exists.
- On AP bill save (new): warn if same `invoiceNumber` + same `vendorId` already exists.

**Implementation:** Check before save. Show warning dialog with existing record details. Allow override with reason captured in audit trail.

---

## Slice 1: Vendor Master + Accounts Payable

**Goal:** EBC can record what it owes, to whom, coded to which project and cost type, with approval and QB export.

### 1.1 Vendor Data Model

```js
{
  id: Number,
  name: String,           // required
  dba: String,            // "doing business as" if different
  address: String,
  city: String,
  state: String,
  zip: String,
  phone: String,
  email: String,
  taxId: String,          // EIN or SSN for 1099
  w9Status: String,       // "received" | "requested" | "missing"
  w9Date: String,         // ISO date when W-9 received
  paymentTerms: String,   // "Net 30" | "Net 15" | "Due on Receipt" | custom
  is1099Eligible: Boolean, // true if vendor gets 1099 (>$600/yr)
  defaultCostType: String, // "subcontractor" | "material" | "equipment" | "other"
  notes: String,
  status: String,         // "active" | "inactive" | "deleted"
  createdAt: String,
  createdBy: String,
  audit: Array
}
```

**UI:** New "Vendors" sub-tab under Financials. List view with search/filter. Detail view for edit. W-9 status badge (green/yellow/red). Vendor deduplication warning on name similarity.

### 1.2 AP Bill Data Model

```js
{
  id: Number,
  vendorId: Number,       // required — links to vendor master
  projectId: Number,      // required — job cost attribution
  phase: String,          // optional — WBS phase
  costType: String,       // required — "labor" | "material" | "subcontractor" | "equipment" | "other"
  invoiceNumber: String,  // required — vendor's invoice number
  date: String,           // required — invoice date
  dueDate: String,        // computed from vendor payment terms, overridable
  amount: Number,         // required — > 0
  description: String,    // required
  status: String,         // "entered" | "approved" | "paid" | "void"
  approvedBy: String,     // captured on approval
  approvedAt: String,     // captured on approval
  approvalNotes: String,
  paidDate: String,
  checkNumber: String,
  paymentMethod: String,  // "check" | "ACH" | "credit card" | "cash"
  retainageRate: Number,  // 0-100, percentage held
  retainageAmount: Number, // computed
  netPayable: Number,     // amount - retainageAmount
  attachments: Array,     // [{name, type, dataUrl, uploadedAt, uploadedBy}]
  lienWaiverStatus: String, // "not_required" | "conditional_received" | "unconditional_received" | "missing"
  lienWaiverDate: String,
  audit: Array
}
```

**Workflow:**
1. Bill entered → status "entered"
2. PM or admin approves → status "approved", captures approvedBy/approvedAt
3. Payment recorded → status "paid", captures paidDate/checkNumber/paymentMethod
4. Void → status "void" with audit trail (does not delete)

**AP Aging:** Computed from AP bills. Bucket by current/30/60/90+ days from due date. Filterable by vendor, project, status. Shows retainage held separately.

### 1.3 QB IIF Export for AP

Extend `qbExport.js` with `exportAPBills(bills, vendorMapping)`:
- IIF BILL transaction type
- Maps vendorId to QB vendor name
- Maps projectId to QB job name
- Maps costType to QB expense account
- Validation warnings for unmapped vendors/projects

### 1.4 1099 Report Data

Year-end report: total payments per 1099-eligible vendor. Not a 1099 form (QB handles that), but the data extract Gema needs to verify QB's 1099 list is complete.

---

## Slice 2: Cost Accumulation Engine

**Goal:** Project costs are always computed from transactions, never manually entered. Profitability is real.

### 2.1 Labor Cost Accumulation

**Source:** Time entries (already exist in the system).

**Computation:**
```
project.actualLaborCost = timeEntries
  .filter(e => e.projectId === project.id && e.status !== "deleted")
  .reduce((sum, entry) => {
    const rate = getEmployeeRate(entry.employeeId);
    return sum + (entry.hours * rate);
  }, 0);

project.burdenedLaborCost = project.actualLaborCost * companySettings.laborBurdenMultiplier;
```

**Period breakdown:** Group by month (from entry date) for period-level cost reporting.

### 2.2 Material Cost Accumulation

**Source:** Material requests (already exist) + new AP bills where `costType === "material"`.

**Enhancement to material requests:** Add `actualCost` field. When a material request is fulfilled via a vendor bill, link them. Material cost per project = sum of linked AP bills with costType "material" for that project.

**Fallback:** If no AP bill exists yet, material requests can have an `estimatedCost` from the price book for budgeting purposes (clearly labeled as estimated, not actual).

### 2.3 Subcontractor Cost Accumulation

**Source:** AP bills where `costType === "subcontractor"`.

**Computation:** Sum of AP bill amounts per project, with retainage tracked separately.
```
project.actualSubCost = apBills
  .filter(b => b.projectId === project.id && b.costType === "subcontractor" && b.status !== "void")
  .reduce((sum, b) => sum + b.amount, 0);
```

### 2.4 Equipment and Other Cost Accumulation

**Source:** AP bills where `costType === "equipment"` or `costType === "other"`.

Same accumulation pattern.

### 2.5 Replace Static Cost Fields

**Remove:** `laborCost` and `materialCost` as editable fields on projects. Replace with computed getters.

**Project cost summary (always computed):**
```js
function getProjectCosts(projectId) {
  return {
    labor: computeLaborCost(projectId),
    burdenedLabor: computeBurdenedLaborCost(projectId),
    material: computeMaterialCost(projectId),
    subcontractor: computeSubCost(projectId),
    equipment: computeEquipmentCost(projectId),
    other: computeOtherCost(projectId),
    totalCost: sum of above,
    contract: project.contract + sumApprovedCOs(projectId),
    margin: contract - totalCost,
    marginPercent: (contract - totalCost) / contract * 100
  };
}
```

**Every place in App.jsx that reads `p.laborCost` or `p.materialCost` (20+ references) must be updated** to call this computed function instead.

### 2.6 Cost Type Breakdown per Project

New view in Job Costing: stacked bar or table showing labor / material / sub / equipment / other per project. This is the core cost visibility that the accounting auditor demanded.

---

## Slice 3: Invoice / Billing Overhaul

**Goal:** Billing is structured, retainage is tracked, over/under-billing is visible.

### 3.1 Invoice Model Expansion

```js
{
  id: Number,
  projectId: Number,       // required
  number: String,          // required, auto-generated
  date: String,            // required
  dueDate: String,         // computed from project payment terms
  billingPeriod: String,   // YYYY-MM — which period this billing covers
  lineItems: [             // SOV-based or simple
    {
      description: String,
      sovItem: String,     // optional — SOV line reference
      previousBilled: Number,
      thisPeriod: Number,
      totalBilled: Number,
      percentComplete: Number
    }
  ],
  subtotal: Number,        // sum of lineItems thisPeriod
  retainageRate: Number,   // percentage (e.g., 10)
  retainageAmount: Number, // computed: subtotal * retainageRate / 100
  netAmount: Number,       // subtotal - retainageAmount
  status: String,          // "draft" | "submitted" | "paid" | "partial" | "void"
  paidDate: String,
  paidAmount: Number,      // supports partial payments
  paymentRef: String,      // check number or reference
  description: String,
  attachments: Array,
  audit: Array,
  createdAt: String,
  createdBy: String
}
```

### 3.2 Schedule of Values (SOV)

Per-project SOV structure:
```js
project.scheduleOfValues = [
  { id: 1, description: "Drywall — Level 4 Finish", contractAmount: 85000 },
  { id: 2, description: "Framing — Metal Studs", contractAmount: 62000 },
  { id: 3, description: "ACT Ceiling", contractAmount: 41000 },
  ...
];
```

SOV can be set up at project creation or imported from the estimating takeoff. Billing draws against SOV items.

### 3.3 Retainage Register

**Retainage Receivable:** Per project, per invoice. Running total of retainage withheld by GC. Retainage release is a separate invoice type (retainageRelease: true).

**Retainage Payable:** Per subcontractor, per project. Tracked from AP bills with retainageRate > 0. Running total of retainage EBC holds from subs. Retainage release is a separate AP payment type.

**Dashboard visibility:** Total retainage receivable across all projects. Total retainage payable across all subs. Net retainage exposure.

### 3.4 Over/Under-Billing (WIP)

Per project:
```
billedToDate = sum of all invoice subtotals
costToDate = getProjectCosts(projectId).totalCost
percentComplete = costToDate / estimatedTotalCost  // cost-based method (default)
// Alternative: manual % complete override per project for cases where cost ≠ progress
earnedRevenue = percentComplete * totalContractValue
overUnderBilling = billedToDate - earnedRevenue
```

Positive = overbilled (cash ahead of earnings). Negative = underbilled (earnings ahead of cash).

**WIP Summary Table:** All active projects showing contract, billed, cost, earned, over/under. This is the deliverable for bonding/lender review.

### 3.5 QB IIF Export for Invoices

Extend existing invoice IIF export:
- Add line items (SPL lines per SOV item)
- Track retainage as separate account line
- Payment receipts as PAYMENT transaction type

---

## Slice 4: Period Discipline

**Goal:** Month-end close is achievable. Periods are real. Accruals are supported.

### 4.1 Period Model

Every financial transaction gets a `period` field (YYYY-MM) derived from its date. Periods are months.

**Period registry:**
```js
{
  period: "2026-03",
  status: "open" | "closed" | "locked",
  closedAt: String,
  closedBy: String,
  notes: String
}
```

### 4.2 Period Close

- Admin/accounting can close a period.
- Closed period: new entries with dates in that period trigger a warning. Override requires reason + audit trail entry.
- Locked period: no entries allowed, period over. Only admin can unlock.

### 4.3 Accrual Support

**Accrual entry model:**
```js
{
  id: Number,
  type: "accrual",
  accrualType: String,    // "labor_stub" | "sub_accrual" | "material_accrual" | "other"
  projectId: Number,
  costType: String,
  amount: Number,
  period: String,         // the period this accrual belongs to
  description: String,
  autoReverse: Boolean,   // if true, creates offsetting entry when next period opens
  reversalPeriod: String, // the period where the reversal posts
  status: String,         // "posted" | "reversed" | "void"
  createdAt: String,
  createdBy: String,
  audit: Array
}
```

**Use cases:**
- Labor stub: last 3 days of March fall in April pay period. Accrue estimated labor cost in March.
- Sub accrual: subcontractor performed work in March but invoice arrives in April. Accrue estimated cost.
- Material accrual: material delivered in March, invoice in April.

**Auto-reversal:** When the next period opens, auto-reverse accruals marked `autoReverse: true`. This prevents double-counting when the actual invoice arrives.

### 4.4 Cutoff Report

Show all entries where `createdAt` is after the period close date but `period` is in the closed month. This is how an accountant verifies that a period is complete — "what got sneaked in after we closed?"

---

## Slice 5: Budget Structure + Committed Costs

**Goal:** Budget vs actual vs committed by cost code. Uncommitted budget visible.

### 5.1 Budget by Cost Code

Per-project budget structure:
```js
project.budget = [
  { phase: "Framing", costType: "labor", budgetAmount: 45000 },
  { phase: "Framing", costType: "material", budgetAmount: 28000 },
  { phase: "Drywall", costType: "labor", budgetAmount: 62000 },
  { phase: "Drywall", costType: "material", budgetAmount: 35000 },
  { phase: "Drywall", costType: "subcontractor", budgetAmount: 15000 },
  ...
];
```

Budget can be set at project setup. Can be imported from estimating takeoff assemblies (labor/material split from assembly rates).

### 5.2 Committed Cost Register

**Commitments:** Purchase orders and subcontract values.

```js
{
  id: Number,
  type: "purchase_order" | "subcontract",
  projectId: Number,
  vendorId: Number,
  phase: String,
  costType: String,
  originalAmount: Number,
  changeOrders: Number,   // sum of CO adjustments to this commitment
  revisedAmount: Number,  // original + changeOrders
  invoicedToDate: Number, // sum of AP bills against this commitment
  remainingCommitment: Number, // revised - invoiced
  description: String,
  status: String,         // "active" | "complete" | "void"
  audit: Array
}
```

### 5.3 Budget vs Actual vs Committed View

Per project, per cost code:
```
Budget | Actual | Committed | Projected Final | Variance
$45,000 | $28,000 | $12,000 | $40,000 | $5,000 favorable
```

Where:
- Actual = accumulated cost from transactions
- Committed = remaining commitment from POs/subcontracts
- Projected Final = Actual + Committed
- Variance = Budget - Projected Final

**Over-budget flagging:** If Projected Final > Budget, flag red. This is the primary exception the accounting auditor demanded.

---

## Slice 6: Management Reporting + Exception Dashboard

**Goal:** Produce management packages from the system. Surface exceptions before they become problems.

### 6.1 Project Financial Summary (P&L per Project)

```
Contract Value:        $215,100
Approved COs:          + $32,500
Adjusted Contract:     $247,600

Cost to Date:
  Labor (burdened):    $68,400
  Material:            $42,300
  Subcontractor:       $31,200
  Equipment:           $2,800
  Other:               $1,500
  Total Cost:          $146,200

Gross Margin:          $101,400  (41.0%)

Billed to Date:        $165,000
Retainage Held:        $16,500
Net Received:          $132,000
Over/(Under) Billed:   ($12,400)
```

Every number traceable to underlying records.

### 6.2 Portfolio Summary

All-project table:
| Project | Contract | Cost | Margin% | Billed | Over/Under | Status |
Sortable by any column. Color-coded by margin health and billing status.

### 6.3 WIP Schedule

Per-project WIP for bonding/lender:
| Project | Contract | Billed | Cost | % Complete | Earned | Over/Under |
Total row at bottom. This is the deliverable a surety or lender expects.

### 6.4 Exception Dashboard

Flagged conditions (each is a card with count + drill-to-list):

- **Over budget:** Projects where projected final cost > budget
- **Stale billing:** Active projects with no billing in 30+ days
- **Unapproved bills:** AP bills in "entered" status for 7+ days
- **Missing W-9:** Vendors with 1099 eligibility and no W-9 on file
- **Missing lien waivers:** Sub payments without lien waiver received
- **Retainage exposure:** Total retainage receivable and payable
- **Period violations:** Entries posted to closed periods
- **Cost coding gaps:** Transactions without phase or cost type
- **Margin alerts:** Projects where margin dropped below threshold (configurable, default 25%)

### 6.5 QB Reconciliation Report

After IIF export: summary of what was exported vs EBC-OS totals. Allows accounting to verify the export was complete before importing to QB.

---

## Data Model Summary

### New Data Stores (added to app state)

| Store | Purpose |
|---|---|
| `vendors` | Vendor master for AP and 1099 |
| `apBills` | Accounts payable bills |
| `commitments` | POs and subcontract commitment register |
| `accruals` | Period-end accrual entries |
| `periods` | Period open/close status registry |
| `companySettings` | Labor burden multiplier, retainage defaults, margin alert threshold |

### Modified Data Stores

| Store | Changes |
|---|---|
| `invoices` | Expanded model: line items, retainage, billing period, SOV linkage |
| `projects` | Add: `scheduleOfValues[]`, `budget[]`. Remove: static `laborCost`/`materialCost` as editable fields (replace with computed) |
| `changeOrders` | Add: `costEstimate`, `actualCostToDate`, `costCodeAssignment` |
| `materialRequests` | Add: `actualCost`, `linkedBillId` |

### Removed

| Item | Reason |
|---|---|
| `BLENDED_RATE` constant | Replaced by actual employee rates |
| Hard delete on invoices | Replaced by soft-delete |
| Hard delete on COs | Replaced by soft-delete |
| Static `laborCost`/`materialCost` editable fields | Replaced by computed accumulation |

---

## QB Desktop Integration

All financial data flows **one direction: EBC-OS → QB Desktop via IIF export.**

| Data Type | IIF Transaction Type | Status |
|---|---|---|
| Time entries | TIMEACT | Exists in `qbExport.js` |
| AR Invoices | TRNS/SPL/ENDTRNS (Invoice) | Exists, needs line item expansion |
| AP Bills | TRNS/SPL/ENDTRNS (Bill) | New |
| Payments received | TRNS (Payment) | New |
| Payments made | TRNS (Bill Payment) | New |

**Reconciliation flow:** Export from EBC-OS → Import to QB → Compare EBC-OS report totals to QB report totals → Flag discrepancies.

---

## Implementation Sequence

| Phase | Scope | Dependencies |
|---|---|---|
| **Sprint 0** | Soft-delete, audit trail, required fields, replace blended rate, duplicate detection | None |
| **Slice 1** | Vendor master, AP bills, AP aging, AP IIF export, 1099 data | Sprint 0 |
| **Slice 2** | Cost accumulation engine, replace static costs, cost type breakdown | Sprint 0 |
| **Slice 3** | Invoice overhaul, SOV, retainage register, over/under-billing, WIP | Slice 1 (for sub retainage), Slice 2 (for cost-based % complete) |
| **Slice 4** | Period close, accrual support, cutoff reports | Slice 2 (costs must exist to accrue) |
| **Slice 5** | Budget structure, committed costs, budget vs actual vs committed | Slice 1 (AP bills), Slice 2 (cost accumulation) |
| **Slice 6** | Project P&L, portfolio summary, WIP schedule, exception dashboard, QB reconciliation | All previous slices |

**Slices 1 and 2 can run in parallel** after Sprint 0. Slices 3-5 depend on 1+2. Slice 6 comes last.

---

## Success Criteria

Re-run all three auditors after implementation. Target scores:

| Audit | Current Score | Target Score |
|---|---|---|
| Bookkeeping | 19/100 | 70+ |
| Accounting | 14/100 | 70+ |

The accounting auditor's core test must pass:
> "Show me the gross margin on Project X for the month of March, broken out by cost type, with committed costs visible, and explain why the number is different from last month."

If answering that question requires opening a spreadsheet, the implementation is incomplete.

---

## What This Spec Does NOT Cover

- **Estimating fixes** (quantity traceability, $/SF, addenda tracking) — deferred per user decision
- **Supabase migration** — QB Desktop is the system of record; localStorage stays for now
- **Payroll processing** — EBC-OS captures time; QB handles payroll
- **Tax filing** — EBC-OS provides 1099 data extract; QB handles filing
- **Bank reconciliation** — QB handles this; EBC-OS provides export reconciliation
- **General ledger** — QB is the GL; EBC-OS is the capture/review/export layer
