// ═══════════════════════════════════════════════════════════════
//  EBC-OS · CSV Data Import Wizard
//  Safe bulk-import for projects, contacts, employees, invoices,
//  change orders, bids. Preview → Validate → Commit → Undo.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useRef } from "react";
import { Upload, FileText, CheckSquare, AlertTriangle, RotateCcw, X } from "lucide-react";
import { parseCSV, IMPORT_SCHEMAS, autoDetectMapping, buildPreview, prepareCommit } from "../../utils/csvImport";

const SCHEMA_TO_SETTERS = {
  projects: (app) => ({ setter: app.setProjects, existing: app.projects }),
  contacts: (app) => ({ setter: app.setContacts, existing: app.contacts }),
  employees: (app) => ({ setter: app.setEmployees, existing: app.employees }),
  invoices: (app) => ({ setter: app.setInvoices, existing: app.invoices }),
  changeOrders: (app) => ({ setter: app.setChangeOrders, existing: app.changeOrders }),
  bids: (app) => ({ setter: app.setBids, existing: app.bids }),
};

// Sample CSV templates to help users get started
const SAMPLE_CSV = {
  projects: `Name,GC,Contract,Phase,Status,Start,End,PM,Address
"Example Project","ACME General",500000,"Framing","in-progress","2026-01-15","2026-08-30","Abner Aguilar","123 Main St, Houston TX"`,
  contacts: `Name,Company,Role,Email,Phone,Category
"John Smith","ACME General","Project Manager","john@acme.com","713-555-1234","GC"`,
  employees: `Name,Role,Email,Phone,Hourly Rate,Status,Trade
"Maria Garcia","foreman","maria@ebc.com","713-555-9876",42.50,"active","Drywall"`,
  invoices: `Invoice #,Project Name,Date,Amount,Status,Description
"0001","Example Project","2026-03-01",25000,"pending","March progress"`,
  changeOrders: `CO #,Project Name,Description,Amount,Status,Type,Date
"CO-001","Example Project","Additional framing on L3",8500,"pending","add","2026-03-15"`,
  bids: `Bid Name,GC,Bid Value,Status,Due,Address,Scope
"New Office Tower","XYZ Builders",850000,"estimating","2026-05-15","456 Oak Ave","Drywall, framing, ACT"`,
};

export function ImportWizard({ app }) {
  const [dataType, setDataType] = useState("projects");
  const [csvText, setCsvText] = useState("");
  const [step, setStep] = useState(1); // 1: paste, 2: map, 3: preview, 4: done
  const [mapping, setMapping] = useState({});
  const [lastCommit, setLastCommit] = useState(null); // for undo
  const fileInputRef = useRef(null);

  const schema = IMPORT_SCHEMAS[dataType];
  const { headers, rows } = useMemo(() => parseCSV(csvText), [csvText]);
  const { existing } = SCHEMA_TO_SETTERS[dataType](app);
  const context = { projects: app.projects };

  const preview = useMemo(() => {
    if (step < 3 || rows.length === 0) return [];
    return buildPreview(schema, mapping, rows, existing, context);
  }, [schema, mapping, rows, existing, step, context]);

  const stats = useMemo(() => {
    const s = { new: 0, match: 0, error: 0 };
    preview.forEach(p => { s[p.status]++; });
    return s;
  }, [preview]);

  const handleFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(f);
  };

  const goToMap = () => {
    if (headers.length === 0) { app.show("No data to parse", "err"); return; }
    setMapping(autoDetectMapping(schema, headers));
    setStep(2);
  };

  const goToPreview = () => {
    // Verify required fields are mapped
    const missingRequired = schema.fields.filter(f => f.required && (mapping[f.key] === undefined || mapping[f.key] < 0));
    if (missingRequired.length > 0) {
      app.show(`Missing required field mapping: ${missingRequired.map(f => f.label).join(", ")}`, "err");
      return;
    }
    setStep(3);
  };

  const commit = () => {
    const { toInsert, toUpdate, skipped } = prepareCommit(preview, context, app.auth);
    if (toInsert.length === 0 && toUpdate.length === 0) {
      app.show("Nothing to import (all rows had errors)", "err");
      return;
    }
    const { setter } = SCHEMA_TO_SETTERS[dataType](app);
    const insertedIds = new Set(toInsert.map(r => r.id));
    const updatedIds = new Set(toUpdate.map(r => r.id));
    // Snapshot before commit for undo
    const snapshot = existing.map(r => ({ ...r }));
    setter(prev => {
      // Remove old versions of updated records, keep everything else, then add inserted + updated
      const unchanged = prev.filter(r => !updatedIds.has(r.id));
      return [...unchanged, ...toUpdate, ...toInsert];
    });
    setLastCommit({
      dataType,
      snapshot,
      insertedIds: [...insertedIds],
      updatedIds: [...updatedIds],
      when: new Date().toISOString(),
      who: app.auth?.name || "Unknown",
    });
    app.show(`Imported ${toInsert.length} new + ${toUpdate.length} updated${skipped.length > 0 ? `, ${skipped.length} skipped` : ""}`, "ok");
    setStep(4);
  };

  const undo = () => {
    if (!lastCommit) return;
    if (!confirm(`Roll back last import? This will restore ${lastCommit.insertedIds.length + lastCommit.updatedIds.length} ${lastCommit.dataType} records to their previous state.`)) return;
    const { setter } = SCHEMA_TO_SETTERS[lastCommit.dataType](app);
    setter(lastCommit.snapshot);
    app.show(`Rolled back ${lastCommit.dataType} import`, "ok");
    setLastCommit(null);
    reset();
  };

  const reset = () => {
    setCsvText("");
    setMapping({});
    setStep(1);
  };

  // ── Render ──
  return (
    <div>
      <div className="mb-sp4">
        <h3 className="font-head" style={{ fontSize: "var(--text-section)" }}>{app.t("Bulk Data Import")}</h3>
        <p className="text-sm text-dim">
          {app.t("Import projects, contacts, employees, invoices, change orders, and bids from CSV. Preview and validate before commit. Rollback available.")}
        </p>
      </div>

      {/* Data type selector + undo */}
      <div className="flex-between mb-sp4 flex-wrap gap-8">
        <div className="flex gap-8 flex-center">
          <label className="form-label" style={{ marginBottom: 0 }}>{app.t("Data Type")}:</label>
          <select className="form-select" value={dataType} onChange={(e) => { setDataType(e.target.value); reset(); }} disabled={step > 1}>
            {Object.entries(IMPORT_SCHEMAS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
        {lastCommit && (
          <button className="btn btn-ghost btn-sm flex-center-gap-4" onClick={undo}>
            <RotateCcw size={14} /> {app.t("Undo last import")} ({lastCommit.dataType})
          </button>
        )}
      </div>

      {/* Step progress */}
      <div className="flex gap-8 mb-sp4">
        {["Paste CSV", "Map Columns", "Preview", "Done"].map((label, i) => (
          <div key={i} className={`p-sp2 flex-1 text-center rounded-control ${step === i + 1 ? "bg-amber text-dark fw-bold" : step > i + 1 ? "bg-green text-dark" : "bg-bg3 text-dim"}`}>
            {i + 1}. {app.t(label)}
          </div>
        ))}
      </div>

      {/* STEP 1: Paste CSV */}
      {step === 1 && (
        <div className="card p-sp4">
          <div className="mb-sp3 flex-between flex-wrap gap-8">
            <div className="text-sm font-semi">{app.t("Paste CSV text or upload a file")}</div>
            <div className="flex gap-8">
              <button className="btn btn-ghost btn-sm" onClick={() => setCsvText(SAMPLE_CSV[dataType])}>
                {app.t("Load sample")}
              </button>
              <button className="btn btn-ghost btn-sm flex-center-gap-4" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> {app.t("Upload file")}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
          </div>
          <textarea className="form-textarea" value={csvText} onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Paste CSV data here. First row must be headers.\n\nExample:\n${SAMPLE_CSV[dataType]}`}
            style={{ minHeight: 260, fontFamily: "monospace", fontSize: "var(--text-tab)" }} />
          {headers.length > 0 && (
            <div className="text-xs text-dim mt-8">
              {app.t("Detected")}: {headers.length} {app.t("columns")}, {rows.length} {app.t("rows")}
            </div>
          )}
          <div className="flex-end mt-sp3">
            <button className="btn btn-primary" onClick={goToMap} disabled={headers.length === 0}>
              {app.t("Next: Map Columns")} →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Column mapping */}
      {step === 2 && (
        <div className="card p-sp4">
          <div className="text-sm font-semi mb-sp3">{app.t("Map your CSV columns to app fields")}</div>
          <div className="text-xs text-dim mb-sp3">{app.t("Auto-detected from headers. Adjust if any are wrong.")}</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>{app.t("App Field")}</th><th>{app.t("Required?")}</th><th>{app.t("CSV Column")}</th><th>{app.t("Preview (first row)")}</th></tr>
              </thead>
              <tbody>
                {schema.fields.map(f => (
                  <tr key={f.key}>
                    <td className="fw-semi">{f.label} {f.type && <span className="text-xs text-dim">({f.type})</span>}</td>
                    <td>{f.required ? <span className="badge badge-red fs-xs">{app.t("required")}</span> : <span className="text-xs text-dim">—</span>}</td>
                    <td>
                      <select className="form-select fs-12" value={mapping[f.key] ?? -1}
                        onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}>
                        <option value={-1}>— {app.t("not mapped")} —</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </td>
                    <td className="text-xs text-dim" style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {mapping[f.key] >= 0 && rows[0] ? (rows[0][mapping[f.key]] || "—") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-between mt-sp3">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← {app.t("Back")}</button>
            <button className="btn btn-primary" onClick={goToPreview}>{app.t("Next: Preview")} →</button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 3 && (
        <div className="card p-sp4">
          <div className="flex-between mb-sp3 flex-wrap gap-8">
            <div className="text-sm font-semi">{app.t("Review before committing")}</div>
            <div className="flex gap-8 flex-center">
              <span className="badge badge-amber">{stats.new} {app.t("new")}</span>
              <span className="badge badge-blue">{stats.match} {app.t("match")}</span>
              {stats.error > 0 && <span className="badge badge-red">{stats.error} {app.t("error")}</span>}
            </div>
          </div>
          <div style={{ maxHeight: 500, overflow: "auto" }} className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{app.t("Status")}</th>
                  <th>#</th>
                  {schema.fields.filter(f => mapping[f.key] >= 0 || f.required).map(f => <th key={f.key}>{f.label}</th>)}
                  <th>{app.t("Issues")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} style={{ background: p.status === "error" ? "rgba(239,68,68,0.08)" : p.status === "match" ? "rgba(59,130,246,0.05)" : "rgba(245,158,11,0.05)" }}>
                    <td>
                      {p.status === "new" && <span className="badge badge-amber fs-xs">{app.t("NEW")}</span>}
                      {p.status === "match" && <span className="badge badge-blue fs-xs">{app.t("MATCH")}</span>}
                      {p.status === "error" && <span className="badge badge-red fs-xs">{app.t("ERROR")}</span>}
                    </td>
                    <td>{i + 1}</td>
                    {schema.fields.filter(f => mapping[f.key] >= 0 || f.required).map(f => (
                      <td key={f.key} className="text-xs" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.mapped[f.key] === undefined || p.mapped[f.key] === "" ? <span className="text-dim">—</span> : String(p.mapped[f.key])}
                      </td>
                    ))}
                    <td className="text-xs" style={{ color: "var(--red)" }}>{p.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-between mt-sp3">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← {app.t("Back")}</button>
            <div className="flex gap-8">
              <button className="btn btn-ghost" onClick={reset}>{app.t("Cancel")}</button>
              <button className="btn btn-primary flex-center-gap-4" onClick={commit} disabled={stats.new + stats.match === 0}>
                <CheckSquare size={14} /> {app.t("Commit")} ({stats.new + stats.match} {app.t("records")})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 4 && (
        <div className="card p-sp4 text-center">
          <CheckSquare size={32} style={{ color: "var(--green)", marginBottom: 12 }} />
          <div className="font-semi">{app.t("Import complete")}</div>
          <div className="text-sm text-dim mt-4">
            {app.t("Committed at")} {new Date(lastCommit?.when).toLocaleString()} {app.t("by")} {lastCommit?.who}
          </div>
          <div className="flex gap-8 flex-center mt-sp3">
            {lastCommit && (
              <button className="btn btn-ghost flex-center-gap-4" onClick={undo}>
                <RotateCcw size={14} /> {app.t("Undo")}
              </button>
            )}
            <button className="btn btn-primary" onClick={reset}>{app.t("Import more")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
