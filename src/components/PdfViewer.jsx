import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Pencil, Type, ArrowRight, Square as SquareIcon, Circle, Eraser, Save } from "lucide-react";
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
const MARKUP_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e", "#fff"];
const MARKUP_TOOLS = [
  { id: "pen", icon: Pencil, label: "Draw" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "rect", icon: SquareIcon, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Erase" },
];

export function PdfViewer({ pdfData, fileName, onClose, isCachedOffline, onSaveAnnotations, annotations: savedAnnotations }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [rendering, setRendering] = useState(false);

  // Zoom/pan state
  const [renderScale, setRenderScale] = useState(1); // the scale at which canvas is rendered
  const [cssScale, setCssScale] = useState(1);       // live CSS transform scale (relative to renderScale)
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Annotation state
  const [markupMode, setMarkupMode] = useState(false);
  const [markupTool, setMarkupTool] = useState("pen");
  const [markupColor, setMarkupColor] = useState("#ef4444");
  const [annotations, setAnnotations] = useState(savedAnnotations || {}); // { pageNum: [elements] }
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [shapeStart, setShapeStart] = useState(null);
  const [textInput, setTextInput] = useState(null); // { x, y } or null
  const svgRef = useRef(null);

  const pageAnnotations = annotations[page] || [];

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

  // ── Annotation handlers ──
  const getSvgPoint = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const addAnnotation = (element) => {
    setAnnotations(prev => ({
      ...prev,
      [page]: [...(prev[page] || []), { ...element, id: crypto.randomUUID(), color: markupColor, timestamp: new Date().toISOString() }],
    }));
  };

  const handleMarkupPointerDown = (e) => {
    if (!markupMode) return;
    if (markupTool === "text") {
      const pt = getSvgPoint(e);
      setTextInput(pt);
      return;
    }
    if (markupTool === "eraser") return;
    setDrawing(true);
    const pt = getSvgPoint(e);
    if (markupTool === "pen") {
      setCurrentPath([pt]);
    } else {
      setShapeStart(pt);
    }
  };

  const handleMarkupPointerMove = (e) => {
    if (!drawing || !markupMode) return;
    const pt = getSvgPoint(e);
    if (markupTool === "pen") {
      setCurrentPath(prev => [...prev, pt]);
    }
  };

  const handleMarkupPointerUp = (e) => {
    if (!drawing || !markupMode) return;
    setDrawing(false);
    const pt = getSvgPoint(e);

    if (markupTool === "pen" && currentPath.length > 1) {
      addAnnotation({ type: "path", points: currentPath, strokeWidth: 3 });
    } else if (markupTool === "arrow" && shapeStart) {
      addAnnotation({ type: "arrow", x1: shapeStart.x, y1: shapeStart.y, x2: pt.x, y2: pt.y, strokeWidth: 3 });
    } else if (markupTool === "rect" && shapeStart) {
      addAnnotation({ type: "rect", x: Math.min(shapeStart.x, pt.x), y: Math.min(shapeStart.y, pt.y), w: Math.abs(pt.x - shapeStart.x), h: Math.abs(pt.y - shapeStart.y), strokeWidth: 2 });
    } else if (markupTool === "circle" && shapeStart) {
      const rx = Math.abs(pt.x - shapeStart.x) / 2;
      const ry = Math.abs(pt.y - shapeStart.y) / 2;
      addAnnotation({ type: "ellipse", cx: (shapeStart.x + pt.x) / 2, cy: (shapeStart.y + pt.y) / 2, rx, ry, strokeWidth: 2 });
    }

    setCurrentPath([]);
    setShapeStart(null);
  };

  const handleTextSubmit = (text) => {
    if (text && textInput) {
      addAnnotation({ type: "text", x: textInput.x, y: textInput.y, text, fontSize: 16 });
    }
    setTextInput(null);
  };

  const handleErase = (id) => {
    if (markupTool !== "eraser" || !markupMode) return;
    setAnnotations(prev => ({
      ...prev,
      [page]: (prev[page] || []).filter(el => el.id !== id),
    }));
  };

  const handleSaveAnnotations = () => {
    if (onSaveAnnotations) onSaveAnnotations(annotations);
  };

  // Render SVG elements for annotations
  const renderAnnotation = (el) => {
    const cursorStyle = markupTool === "eraser" && markupMode ? "pointer" : "default";
    const clickHandler = () => handleErase(el.id);
    switch (el.type) {
      case "path": {
        const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
        return <path key={el.id} d={d} stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: cursorStyle }} onClick={clickHandler} />;
      }
      case "arrow": {
        const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
        const headLen = 12;
        return <g key={el.id} style={{ cursor: cursorStyle }} onClick={clickHandler}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} />
          <line x1={el.x2} y1={el.y2} x2={el.x2 - headLen * Math.cos(angle - 0.5)} y2={el.y2 - headLen * Math.sin(angle - 0.5)} stroke={el.color} strokeWidth={el.strokeWidth} />
          <line x1={el.x2} y1={el.y2} x2={el.x2 - headLen * Math.cos(angle + 0.5)} y2={el.y2 - headLen * Math.sin(angle + 0.5)} stroke={el.color} strokeWidth={el.strokeWidth} />
        </g>;
      }
      case "rect":
        return <rect key={el.id} x={el.x} y={el.y} width={el.w} height={el.h} stroke={el.color} strokeWidth={el.strokeWidth} fill="none" style={{ cursor: cursorStyle }} onClick={clickHandler} />;
      case "ellipse":
        return <ellipse key={el.id} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} stroke={el.color} strokeWidth={el.strokeWidth} fill="none" style={{ cursor: cursorStyle }} onClick={clickHandler} />;
      case "text":
        return <text key={el.id} x={el.x} y={el.y} fill={el.color} fontSize={el.fontSize} fontWeight="bold" style={{ cursor: cursorStyle }} onClick={clickHandler}>{el.text}</text>;
      default: return null;
    }
  };

  const btnStyle = {
    padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-control)", border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: "var(--text-secondary)",
    minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
  const btnDisabled = { ...btnStyle, opacity: 0.4, cursor: "default" };

  return (
    <div className="flex-col overflow-hidden" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)" }}>
      {/* Header */}
      <div className="flex-between gap-sp2 flex-wrap flex-shrink-0" style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.8)" }}>
        <div className="flex gap-sp3">
          <button onClick={onClose} style={{ ...btnStyle, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" }}>
            Close
          </button>
          <span className="fs-secondary fw-semi nowrap overflow-hidden c-white" style={{ maxWidth: 300, textOverflow: "ellipsis" }}>
            {fileName || "Drawing"}
          </span>
          {isCachedOffline && (
            <span title="Available offline" className="rounded-control fs-tab d-inline-flex gap-sp1 nowrap" style={{ alignItems: "center", color: "#4ade80", background: "rgba(74,222,128,0.12)",
              padding: "var(--space-1) var(--space-2)", border: "1px solid rgba(74,222,128,0.25)" }}>
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
        <div className="flex gap-sp2">
          <button onClick={prevPage} style={page <= 1 ? btnDisabled : btnStyle} disabled={page <= 1}>Prev</button>
          <span className="fs-label c-text2 text-center" style={{ minWidth: 80 }}>
            {page} / {numPages}
          </span>
          <button onClick={nextPage} style={page >= numPages ? btnDisabled : btnStyle} disabled={page >= numPages}>Next</button>
        </div>

        {/* Zoom + Markup toggle */}
        <div className="flex gap-sp2">
          <button onClick={zoomOut} style={btnStyle} aria-label="Zoom out">&minus;</button>
          <span className="fs-label c-text2 text-center" style={{ minWidth: 48 }}>{Math.round(effectiveScale * 100)}%</span>
          <button onClick={zoomIn} style={btnStyle} aria-label="Zoom in">+</button>
          <button onClick={resetZoom} className="fs-label" style={{ ...btnStyle }}>Fit</button>
          <button onClick={() => setMarkupMode(!markupMode)} style={{ ...btnStyle, background: markupMode ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)", borderColor: markupMode ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.2)" }}>
            <Pencil size={16} />
          </button>
          {markupMode && onSaveAnnotations && (
            <button onClick={handleSaveAnnotations} style={{ ...btnStyle, background: "rgba(34,197,94,0.2)", borderColor: "rgba(34,197,94,0.4)" }}>
              <Save size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Markup toolbar */}
      {markupMode && (
        <div className="flex gap-sp2 flex-shrink-0 flex-wrap" style={{ padding: "var(--space-2) var(--space-4)", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.85)" }}>
          {MARKUP_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => setMarkupTool(tool.id)}
              style={{ ...btnStyle, padding: "var(--space-1) var(--space-3)", minHeight: 36, minWidth: 36,
                background: markupTool === tool.id ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)",
                borderColor: markupTool === tool.id ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)" }}>
              <tool.icon size={14} />
            </button>
          ))}
          <div style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "0 var(--space-1)" }} />
          {MARKUP_COLORS.map(c => (
            <button key={c} onClick={() => setMarkupColor(c)}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: markupColor === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.3)", cursor: "pointer", padding: 0 }} />
          ))}
          <div style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "0 var(--space-1)" }} />
          <span className="fs-tab c-text2" style={{ alignSelf: "center" }}>
            {pageAnnotations.length} mark{pageAnnotations.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Canvas area — overflow:auto for pan, CSS transform for live zoom */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="p-sp4 justify-center overflow-auto flex-1" style={{ display: "flex", WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y" }}
      >
        <div style={{
          transform: `scale(${cssScale}) translate(${panX}px, ${panY}px)`,
          transformOrigin: "center top",
          transition: cssScale === 1 ? "none" : undefined,
          willChange: "transform",
          position: "relative",
        }}>
          <canvas ref={canvasRef} style={{ display: "block", maxWidth: cssScale > 1 ? "none" : "100%", height: "auto" }} />
          {/* Annotation SVG overlay */}
          {markupMode && canvasRef.current && (
            <svg
              ref={svgRef}
              onPointerDown={handleMarkupPointerDown}
              onPointerMove={handleMarkupPointerMove}
              onPointerUp={handleMarkupPointerUp}
              style={{
                position: "absolute", top: 0, left: 0,
                width: canvasRef.current.style.width,
                height: canvasRef.current.style.height,
                cursor: markupTool === "eraser" ? "crosshair" : markupTool === "text" ? "text" : "crosshair",
                touchAction: "none",
              }}
            >
              {pageAnnotations.map(renderAnnotation)}
              {/* Live drawing preview */}
              {drawing && markupTool === "pen" && currentPath.length > 1 && (
                <path d={currentPath.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")}
                  stroke={markupColor} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
              )}
              {drawing && markupTool === "rect" && shapeStart && (
                <rect x={Math.min(shapeStart.x, currentPath[currentPath.length - 1]?.x || shapeStart.x)}
                  y={Math.min(shapeStart.y, currentPath[currentPath.length - 1]?.y || shapeStart.y)}
                  width={Math.abs((currentPath[currentPath.length - 1]?.x || shapeStart.x) - shapeStart.x)}
                  height={Math.abs((currentPath[currentPath.length - 1]?.y || shapeStart.y) - shapeStart.y)}
                  stroke={markupColor} strokeWidth={2} fill="none" opacity={0.7} />
              )}
            </svg>
          )}
          {/* Always show saved annotations even when not in markup mode */}
          {!markupMode && pageAnnotations.length > 0 && canvasRef.current && (
            <svg style={{
              position: "absolute", top: 0, left: 0,
              width: canvasRef.current.style.width,
              height: canvasRef.current.style.height,
              pointerEvents: "none",
            }}>
              {pageAnnotations.map(renderAnnotation)}
            </svg>
          )}
          {/* Text input overlay */}
          {textInput && (
            <div style={{ position: "absolute", left: textInput.x, top: textInput.y, zIndex: 10 }}>
              <input
                autoFocus
                className="rounded-control"
                style={{ background: "rgba(0,0,0,0.8)", color: markupColor, border: `2px solid ${markupColor}`, padding: "var(--space-1) var(--space-2)", fontSize: 16, fontWeight: "bold", minWidth: 120 }}
                placeholder="Type..."
                onKeyDown={e => { if (e.key === "Enter") handleTextSubmit(e.target.value); if (e.key === "Escape") setTextInput(null); }}
                onBlur={e => handleTextSubmit(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {rendering && (
        <div className="rounded-control fs-secondary absolute c-white" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.7)", padding: "var(--space-2) var(--space-4)",
          pointerEvents: "none" }}>
          Rendering...
        </div>
      )}
    </div>
  );
}
