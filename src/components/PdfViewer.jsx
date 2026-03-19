import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export function PdfViewer({ pdfData, fileName, onClose, isCachedOffline }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const touchRef = useRef({ startDist: 0, startScale: 1 });

  // Load PDF document
  useEffect(() => {
    if (!pdfData) return;
    let cancelled = false;
    pdfjsLib.getDocument({ data: pdfData }).promise.then((doc) => {
      if (!cancelled) {
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
      }
    });
    return () => { cancelled = true; };
  }, [pdfData]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);

    pdf.getPage(page).then((p) => {
      if (cancelled) return;
      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth - 32 : 800;
      const baseViewport = p.getViewport({ scale: 1 });
      const fitScale = containerWidth / baseViewport.width;
      const viewport = p.getViewport({ scale: fitScale * scale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      p.render({ canvasContext: ctx, viewport }).promise.then(() => {
        if (!cancelled) setRendering(false);
      });
    });

    return () => { cancelled = true; };
  }, [pdf, page, scale]);

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { startDist: Math.sqrt(dx * dx + dy * dy), startScale: scale };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / (touchRef.current.startDist || 1);
      setScale(Math.min(4, Math.max(0.5, touchRef.current.startScale * ratio)));
    }
  }, []);

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(4, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const resetZoom = () => setScale(1);

  const btnStyle = {
    padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 14,
  };
  const btnDisabled = { ...btnStyle, opacity: 0.4, cursor: "default" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.8)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ ...btnStyle, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" }}>
            Close
          </button>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName || "Drawing"}
          </span>
          {isCachedOffline && (
            <span title="Available offline" style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, color: "#4ade80", background: "rgba(74,222,128,0.12)",
              padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(74,222,128,0.25)",
              whiteSpace: "nowrap",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Offline
            </span>
          )}
        </div>

        {/* Page nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevPage} style={page <= 1 ? btnDisabled : btnStyle} disabled={page <= 1}>Prev</button>
          <span style={{ color: "#ccc", fontSize: 13, minWidth: 80, textAlign: "center" }}>
            {page} / {numPages}
          </span>
          <button onClick={nextPage} style={page >= numPages ? btnDisabled : btnStyle} disabled={page >= numPages}>Next</button>
        </div>

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={zoomOut} style={btnStyle}>−</button>
          <span style={{ color: "#ccc", fontSize: 12, minWidth: 48, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} style={btnStyle}>+</button>
          <button onClick={resetZoom} style={{ ...btnStyle, fontSize: 12 }}>Fit</button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          flex: 1, overflow: "auto", display: "flex", justifyContent: "center",
          padding: 16, WebkitOverflowScrolling: "touch",
        }}
      >
        <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />
      </div>

      {rendering && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          color: "#fff", fontSize: 14, background: "rgba(0,0,0,0.7)", padding: "8px 16px", borderRadius: 8,
        }}>
          Loading page...
        </div>
      )}
    </div>
  );
}
