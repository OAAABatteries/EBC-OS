// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Full-Screen Takeoff Route
//  Renders DrawingViewer at #/takeoff/:takeoffId
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { DrawingViewer } from "../components/DrawingViewer";
import { getDrawingsByBid, getSignedUrl, downloadTakeoffPdf, uploadProjectDrawing, insertProjectDrawing, isSupabaseConfigured, ensureSupabaseAuth } from "../lib/supabase";
import { ASSEMBLIES } from "../data/constants";

const STORAGE_KEY_TAKEOFFS = "ebc_takeoffs";
const STORAGE_KEY_ASSEMBLIES = "ebc_assemblies";

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function TakeoffRoute() {
  // ── Auth guard ──
  const auth = readLS("ebc_auth");
  if (!auth) {
    window.location.hash = "#/";
    return <div className="p-sp10 c-amber" style={{ background: "var(--bg)", minHeight: "100vh" }}>Redirecting to login...</div>;
  }

  // ── Extract takeoff ID from hash: #/takeoff/:id ──
  const takeoffId = window.location.hash.replace("#/takeoff/", "").split("?")[0];

  // ── Load takeoff + assemblies from localStorage ──
  const [takeoff, setTakeoff] = useState(() => {
    const all = readLS(STORAGE_KEY_TAKEOFFS) || [];
    return all.find(t => t.id === takeoffId) || null;
  });
  const [assemblies] = useState(() => {
    const custom = readLS(STORAGE_KEY_ASSEMBLIES);
    return (custom && custom.length > 0) ? custom : ASSEMBLIES;
  });

  // ── PDF loading state ──
  const [pdfData, setPdfData] = useState(null);
  const [storageUrl, setStorageUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  // ── Ensure Supabase auth on mount ──
  useEffect(() => {
    if (isSupabaseConfigured()) ensureSupabaseAuth().catch(() => {});
  }, []);

  // ── Load PDF (cloud URL → IDB cache → Supabase download) ── runs ONCE on mount
  const takeoffRef = useRef(takeoff); // snapshot at mount time — don't re-run on state saves
  useEffect(() => {
    const tk = takeoffRef.current;
    if (!tk) { setLoading(false); setError("Takeoff not found"); return; }
    let cancelled = false;

    (async () => {
      // 1) Cloud-first: signed URL streaming
      if (tk.bidId) {
        try {
          const drawings = await getDrawingsByBid(takeoff.bidId);
          if (drawings.length > 0) {
            const url = await getSignedUrl(drawings[0].storagePath);
            if (url && !cancelled) {
              setStorageUrl(url);
              setFileName(drawings[0].fileName);
              setLoading(false);
              return;
            }
          }
        } catch (e) { console.warn("[TakeoffRoute] Cloud URL failed:", e); }
      }

      // 2) IDB cache
      const cachedName = tk.drawingState?.pdfFileNames?.[0] || tk.drawingFileName || "";
      if (cachedName) {
        try {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open("ebc_takeoff_pdfs", 2);
            req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("pdfs")) req.result.createObjectStore("pdfs"); };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          const data = await new Promise((resolve, reject) => {
            const tx = db.transaction("pdfs", "readonly");
            const req = tx.objectStore("pdfs").get(`${takeoffId}_0`);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
          });
          if (data && !cancelled) {
            setPdfData(new Uint8Array(data));
            setFileName(cachedName);
            setLoading(false);
            return;
          }
        } catch (e) { console.warn("[TakeoffRoute] IDB cache failed:", e); }
      }

      // 3) Supabase download (full bytes)
      if (cachedName) {
        try {
          const buf = await downloadTakeoffPdf(takeoffId, cachedName, 0);
          if (buf && !cancelled) {
            setPdfData(new Uint8Array(buf));
            setFileName(cachedName);
            setLoading(false);
            return;
          }
        } catch (e) { console.warn("[TakeoffRoute] Supabase download failed:", e); }
      }

      // 4) No PDF found — show upload prompt
      if (!cancelled) { setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [takeoffId]); // only re-run if takeoff ID changes, NOT on state saves

  // ── Save takeoff state back to localStorage ──
  const handleStateChange = useCallback((state) => {
    setTakeoff(prev => {
      const updated = { ...prev, drawingState: state };
      // Persist to localStorage
      const all = readLS(STORAGE_KEY_TAKEOFFS) || [];
      const idx = all.findIndex(t => t.id === takeoffId);
      if (idx >= 0) { all[idx] = { ...all[idx], drawingState: state }; }
      writeLS(STORAGE_KEY_TAKEOFFS, all);
      return updated;
    });
  }, [takeoffId]);

  // ── Close: navigate back to main app ──
  const handleClose = useCallback(() => {
    window.location.hash = "#/";
    // Set the estimating tab active after navigation
    setTimeout(() => {
      try {
        const event = new CustomEvent("ebc-set-tab", { detail: "estimating" });
        window.dispatchEvent(event);
      } catch {}
    }, 100);
  }, []);

  // ── Upload PDF handler ──
  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setFileName(file.name);

    try {
      const { path, fileName: uploadedName, fileSize } = await uploadProjectDrawing(null, takeoff?.bidId, file);
      await insertProjectDrawing({
        bidId: takeoff?.bidId || null,
        storagePath: path,
        fileName: uploadedName,
        fileSize,
        revision: 1,
        isCurrent: true,
      });
      const url = await getSignedUrl(path);
      if (url) {
        setStorageUrl(url);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("[TakeoffRoute] Cloud upload failed, loading locally:", err);
    }

    // Fallback: load locally
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPdfData(new Uint8Array(ev.target.result));
      setLoading(false);
    };
    reader.onerror = () => { setLoading(false); setError("Failed to read PDF"); };
    reader.readAsArrayBuffer(file);
  }, [takeoff]);

  // ── Add line item to takeoff ──
  const handleAddToTakeoff = useCallback(({ code, qty, unit, label }) => {
    setTakeoff(prev => {
      if (!prev) return prev;
      const targetRoom = (prev.rooms || [])[0];
      if (!targetRoom) return prev;
      const updated = {
        ...prev,
        rooms: prev.rooms.map(rm => rm.id === targetRoom.id ? {
          ...rm,
          items: [...rm.items, {
            id: "dv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            code,
            desc: label || assemblies.find(a => a.code === code)?.name || code,
            qty, unit, height: 10, diff: 1,
          }]
        } : rm)
      };
      // Persist
      const all = readLS(STORAGE_KEY_TAKEOFFS) || [];
      const idx = all.findIndex(t => t.id === takeoffId);
      if (idx >= 0) all[idx] = updated;
      writeLS(STORAGE_KEY_TAKEOFFS, all);
      return updated;
    });
  }, [takeoffId, assemblies]);

  // ── Error state ──
  if (error) {
    return (
      <div className="flex-col justify-center gap-sp4 c-white" style={{ alignItems: "center", height: "100vh", background: "var(--bg)" }}>
        <div className="fs-section c-red">{error}</div>
        <button onClick={handleClose} className="rounded-control fw-bold cursor-pointer" style={{ padding: "var(--space-2) var(--space-6)", background: "var(--amber)", color: "#000", border: "none" }}>Back to Estimating</button>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex-col justify-center gap-sp5 c-white" style={{ alignItems: "center", height: "100vh", background: "var(--bg)" }}>
        <div className="fw-semi fs-section">Loading Drawing...</div>
        <div className="rounded-control overflow-hidden" style={{ width: 280, height: 8, background: "rgba(255,255,255,0.1)" }}>
          <div className="rounded-control h-full" style={{ width: "60%", background: "linear-gradient(90deg, #e09422, #f59e0b)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
        <div className="fs-label c-text2">{takeoff?.name || "Takeoff"}</div>
        <div className="fs-tab c-text3">Checking cloud storage, then local cache...</div>
      </div>
    );
  }

  // ── No PDF yet — upload prompt ──
  if (!storageUrl && !pdfData) {
    return (
      <div className="flex-col justify-center gap-sp5 c-white" style={{ alignItems: "center", height: "100vh", background: "var(--bg)" }}>
        <div className="fs-subtitle fw-bold">{takeoff?.name || "Takeoff"}</div>
        <div className="c-text2">No drawing uploaded yet</div>
        <button onClick={() => fileRef.current?.click()}
          className="rounded-control fs-secondary fw-bold cursor-pointer" style={{ padding: "var(--space-3) var(--space-8)", background: "var(--amber)", color: "#000", border: "none" }}>
          Upload Drawing PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleUpload(f); }} />
        <button onClick={handleClose}
          className="rounded-control c-text2 cursor-pointer" style={{ padding: "var(--space-2) var(--space-5)", background: "transparent", border: "1px solid rgba(255,255,255,0.15)" }}>
          Back to Estimating
        </button>
      </div>
    );
  }

  // ── Full-screen DrawingViewer ──
  return (
    <div className="overflow-hidden" style={{ width: "100vw", height: "100vh", background: "var(--bg)" }}>
      <DrawingViewer
        pdfData={pdfData}
        storageUrl={storageUrl}
        fileName={fileName}
        assemblies={assemblies}
        takeoffId={takeoffId}
        initialTakeoffState={takeoff?.drawingState || null}
        onTakeoffStateChange={handleStateChange}
        onClose={handleClose}
        onAddToTakeoff={handleAddToTakeoff}
      />
    </div>
  );
}
