// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Import Review Modal
//  Shared modal for importing GC documents (punch lists, schedules)
//  Supports paste text and PDF upload with review before commit
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { Upload, FileText, ClipboardPaste, AlertTriangle, Check, X } from "lucide-react";
import { extractPdfText } from "../utils/pdfBidExtractor.js";

/**
 * ImportReviewModal — shared modal for importing GC documents.
 *
 * Props:
 *   open: boolean — whether modal is visible
 *   onClose: () => void — close the modal
 *   title: string — modal title (e.g., "Import GC Punch List")
 *   loadingMessage: string — shown during parsing
 *   emptyMessage: string — shown when no items found
 *   parseText: (text: string) => { items: Array, totalParsed: number, ebcCount: number }
 *   renderItem: (item, index, updateItem) => JSX — render each review row
 *   onConfirm: (selectedItems: Array) => void — called with checked items on confirm
 *   projectSelector: JSX | null — optional project dropdown rendered above input tabs
 */
export function ImportReviewModal({
  open, onClose, title, loadingMessage, emptyMessage,
  parseText, renderItem, onConfirm, projectSelector,
}) {
  const [tab, setTab] = useState("paste");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setTab("paste");
    setPasteText("");
    setLoading(false);
    setResult(null);
    setError("");
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleParse = async (text) => {
    if (!text || text.trim().length < 5) {
      setError("Please provide more text to parse.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await Promise.resolve(parseText(text));
      if (!res.items || res.items.length === 0) {
        setError(emptyMessage || "No relevant items found in this document.");
      } else {
        setResult(res);
      }
    } catch (e) {
      console.error("Import parse error:", e);
      setError("Could not parse this format. Try pasting items as a numbered list.");
    }
    setLoading(false);
  };

  const handlePasteSubmit = () => handleParse(pasteText);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const text = await extractPdfText(file);
      await handleParse(text);
    } catch (e) {
      console.error("PDF extraction error:", e);
      setError("Could not read this PDF. Try pasting the text instead.");
      setLoading(false);
    }
  };

  const updateItem = (index, updates) => {
    setResult((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], ...updates };
      return { ...prev, items: newItems, ebcCount: newItems.filter((i) => i.selected).length };
    });
  };

  const selectedCount = result ? result.items.filter((i) => i.selected).length : 0;

  const handleConfirm = () => {
    if (!result) return;
    const selected = result.items.filter((i) => i.selected);
    onConfirm(selected);
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)", maxWidth: 680, width: "95%",
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div className="flex-between mb-12">
          <h3 className="section-title" style={{ margin: 0 }}>
            <Upload size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            {title}
          </h3>
          <button className="btn btn-ghost" onClick={handleClose}><X size={16} /></button>
        </div>

        {/* Optional project selector */}
        {projectSelector && <div className="mb-12">{projectSelector}</div>}

        {/* Input phase */}
        {!result && !loading && (
          <>
            <div className="flex gap-8 mb-12">
              <button className={`btn btn-sm ${tab === "paste" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("paste")}>
                <ClipboardPaste size={14} className="mr-sp1" /> Paste Text
              </button>
              <button className={`btn btn-sm ${tab === "upload" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("upload")}>
                <FileText size={14} className="mr-sp1" /> Upload PDF
              </button>
            </div>

            {tab === "paste" && (
              <div>
                <textarea
                  className="form-input"
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the GC document text here..."
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
                <button className="btn btn-primary mt-sp2" onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}>
                  Parse Document
                </button>
              </div>
            )}

            {tab === "upload" && (
              <div style={{ border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)",
                padding: "var(--space-6)", textAlign: "center" }}>
                <Upload size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div className="text-sm mb-sp2" style={{ opacity: 0.6 }}>Select a PDF file</div>
                <input type="file" accept=".pdf" onChange={handleFileUpload}
                  style={{ display: "block", margin: "0 auto" }} />
              </div>
            )}
          </>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
            <div className="text-sm mb-sp2" style={{ opacity: 0.6 }}>{loadingMessage}</div>
            <div style={{ width: 32, height: 32, border: "3px solid var(--border-color)",
              borderTopColor: "var(--accent)", borderRadius: "50%",
              animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card p-sp3 mb-12" style={{ background: "var(--danger-bg, #1a0000)",
            border: "1px solid var(--danger, #ff4444)" }}>
            <AlertTriangle size={14} style={{ marginRight: 6, color: "var(--danger, #ff4444)" }} />
            <span className="text-sm">{error}</span>
            <button className="btn btn-sm btn-ghost mt-sp2" onClick={reset}>Try Again</button>
          </div>
        )}

        {/* Review phase */}
        {result && (
          <>
            <div className="card p-sp2 mb-12" style={{
              background: "var(--accent-bg, rgba(0,122,255,0.1))",
              border: "1px solid var(--accent)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Check size={16} style={{ color: "var(--accent)" }} />
              <span className="text-sm fw-bold">
                Found {result.ebcCount} EBC item{result.ebcCount !== 1 ? "s" : ""} out of {result.totalParsed} total
              </span>
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: "var(--space-4)" }}>
              {result.items.map((item, i) => (
                <div key={i} style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderBottom: "1px solid var(--border-color)",
                  opacity: item.selected ? 1 : 0.4,
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <input type="checkbox" checked={item.selected}
                    onChange={(e) => updateItem(i, { selected: e.target.checked })}
                    style={{ marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    {renderItem(item, i, (updates) => updateItem(i, updates))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-8" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handleConfirm}
                disabled={selectedCount === 0}>
                Import {selectedCount} Item{selectedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
