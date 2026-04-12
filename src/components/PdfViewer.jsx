import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

/**
 * PdfViewer — smooth zoom/pan for construction plans
 *
 * Architecture:
 *  - Canvas renders at a fixed "render scale" (high-res once)
 *  - CSS transform handles live zoom/pan (instant, no re-render)
 *  - On gesture end, re-render canvas at final zoom level for sharpness
 *  - Debounced re-render prevents mid-gesture thrash
 */
export function PdfViewer({ pdfData, fileName, onClose, isCachedOffline }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [rendering, setRendering] = useState(false);

  // Zoom/pan state
  const [renderScale, setRenderScale] = useState(1); // the scale at which canvas is rendered
  const [cssScale, setCssScale] = useState(1);       // live CSS transform scale (relative to renderScale)
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const touchRef = useRef({ startDist: 0, startCssScale: 1, startPanX: 0, startPanY: 0, midX: 0, midY: 0 });
  const renderTimer = useRef(null);
  const renderIdRef = useRef(0);

  // Effective scale = renderScale * cssScale
  const effectiveScale = renderScale * cssScale;

  // Load PDF document
  useEffect(() => {
    if (!pdfData) return;
    let cancelled = false;
    pdfjsLib.getDocument({ data: pdfData }).promise.then((doc) => {
      if (!cancelled) {
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
        setRenderScale(1);
        setCssScale(1);
        setPanX(0);
        setPanY(0);
      }
    });
    return () => { cancelled = true; };
  }, [pdfData]);

  // Render canvas at renderScale (only on page change or committed zoom)
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    const id = ++renderIdRef.current;
    setRendering(true);

    pdf.getPage(page).then((p) => {
      if (cancelled || id !== renderIdRef.current) return;
      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth - 32 : 800;
      const baseViewport = p.getViewport({ scale: 1 });
      const fitScale = containerWidth / baseViewport.width;
      const viewport = p.getViewport({ scale: fitScale * renderScale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      p.render({ canvasContext: ctx, viewport }).promise.then(() => {
        if (!cancelled && id === renderIdRef.current) setRendering(false);
      });
    });

    return () => { cancelled = true; };
  }, [pdf, page, renderScale]);

  // Commit: merge cssScale into renderScale and re-render sharp
  const commitZoom = useCallback(() => {
    if (cssScale === 1) return; // nothing to commit
    const newScale = Math.min(4, Math.max(0.5, renderScale * cssScale));
    setRenderScale(newScale);
    setCssScale(1);
  }, [renderScale, cssScale]);

  // Debounced commit after gesture ends
  const scheduleCommit = useCallback(() => {
    clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(commitZoom, 300);
  }, [commitZoom]);

  // ── Pinch-to-zoom (touch) ──
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = {
        startDist: Math.sqrt(dx * dx + dy * dy),
        startCssScale: cssScale,
        startPanX: panX,
        startPanY: panY,
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, [cssScale, panX, panY]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / (touchRef.current.startDist || 1);
      const newCss = Math.min(4 / renderScale, Math.max(0.5 / renderScale, touchRef.current.startCssScale * ratio));
      setCssScale(newCss);
    }
  }, [renderScale]);

  const handleTouchEnd = useCallback(() => {
    scheduleCommit();
  }, [scheduleCommit]);

  // ── Wheel-to-zoom (desktop) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setCssScale((prev) => {
          const next = Math.min(4 / renderScale, Math.max(0.5 / renderScale, prev + delta));
          return next;
        });
        scheduleCommit();
      }
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [renderScale, scheduleCommit]);

  // ── Button zoom controls ──
  const zoomIn = () => {
    const newScale = Math.min(4, effectiveScale + 0.25);
    setRenderScale(newScale);
    setCssScale(1);
    setPanX(0);
    setPanY(0);
  };
  const zoomOut = () => {
    const newScale = Math.max(0.5, effectiveScale - 0.25);
    setRenderScale(newScale);
    setCssScale(1);
    setPanX(0);
    setPanY(0);
  };
  const resetZoom = () => {
    setRenderScale(1);
    setCssScale(1);
    setPanX(0);
    setPanY(0);
  };

  const prevPage = () => { setPage((p) => Math.max(1, p - 1)); setCssScale(1); setPanX(0); setPanY(0); };
  const nextPage = () => { setPage((p) => Math.min(numPages, p + 1)); setCssScale(1); setPanX(0); setPanY(0); };

  const btnStyle = {
    padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-control)", border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: "var(--text-secondary)",
    minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center", justifyContent: "center",
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
        padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.8)", flexShrink: 0, flexWrap: "wrap", gap: "var(--space-2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button onClick={onClose} style={{ ...btnStyle, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" }}>
            Close
          </button>
          <span style={{ color: "#fff", fontSize: "var(--text-secondary)", fontWeight: "var(--weight-semi)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName || "Drawing"}
          </span>
          {isCachedOffline && (
            <span title="Available offline" style={{
              display: "inline-flex", alignItems: "center", gap: "var(--space-1)",
              fontSize: "var(--text-tab)", color: "#4ade80", background: "rgba(74,222,128,0.12)",
              padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", border: "1px solid rgba(74,222,128,0.25)",
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button onClick={prevPage} style={page <= 1 ? btnDisabled : btnStyle} disabled={page <= 1}>Prev</button>
          <span style={{ color: "var(--text2)", fontSize: "var(--text-label)", minWidth: 80, textAlign: "center" }}>
            {page} / {numPages}
          </span>
          <button onClick={nextPage} style={page >= numPages ? btnDisabled : btnStyle} disabled={page >= numPages}>Next</button>
        </div>

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button onClick={zoomOut} style={btnStyle} aria-label="Zoom out">&minus;</button>
          <span style={{ color: "var(--text2)", fontSize: "var(--text-label)", minWidth: 48, textAlign: "center" }}>{Math.round(effectiveScale * 100)}%</span>
          <button onClick={zoomIn} style={btnStyle} aria-label="Zoom in">+</button>
          <button onClick={resetZoom} style={{ ...btnStyle, fontSize: "var(--text-label)" }}>Fit</button>
        </div>
      </div>

      {/* Canvas area — overflow:auto for pan, CSS transform for live zoom */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1, overflow: "auto", display: "flex", justifyContent: "center",
          padding: "var(--space-4)", WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y",
        }}
      >
        <div style={{
          transform: `scale(${cssScale}) translate(${panX}px, ${panY}px)`,
          transformOrigin: "center top",
          transition: cssScale === 1 ? "none" : undefined,
          willChange: "transform",
        }}>
          <canvas ref={canvasRef} style={{ display: "block", maxWidth: cssScale > 1 ? "none" : "100%", height: "auto" }} />
        </div>
      </div>

      {rendering && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          color: "#fff", fontSize: "var(--text-secondary)", background: "rgba(0,0,0,0.7)", padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-control)",
          pointerEvents: "none",
        }}>
          Rendering...
        </div>
      )}
    </div>
  );
}
