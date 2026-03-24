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
    return <div style={{ padding: 40, color: "#f59e0b", background: "#0a0e1a", minHeight: "100vh" }}>Redirecting to login...</div>;
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

  // ── Load PDF (cloud URL → IDB cache → Supabase download) ──
  useEffect(() => {
    if (!takeoff) { setLoading(false); setError("Takeoff not found"); return; }
    let cancelled = false;

    (async () => {
      // 1) Cloud-first: signed URL streaming
      if (takeoff.bidId) {
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
      const cachedName = takeoff.drawingState?.pdfFileNames?.[0] || takeoff.drawingFileName || "";
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
  }, [takeoff, takeoffId]);

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0e1a", color: "#fff", gap: 16 }}>
        <div style={{ fontSize: 18, color: "#ef4444" }}>{error}</div>
        <button onClick={handleClose} style={{ padding: "8px 24px", background: "#e09422", color: "#000", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>Back to Estimating</button>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0e1a", color: "#fff", gap: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Loading Drawing...</div>
        <div style={{ width: 280, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: "60%", height: "100%", background: "linear-gradient(90deg, #e09422, #f59e0b)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>{takeoff?.name || "Takeoff"}</div>
        <div style={{ fontSize: 11, color: "#555" }}>Checking cloud storage, then local cache...</div>
      </div>
    );
  }

  // ── No PDF yet — upload prompt ──
  if (!storageUrl && !pdfData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0e1a", color: "#fff", gap: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{takeoff?.name || "Takeoff"}</div>
        <div style={{ color: "#888" }}>No drawing uploaded yet</div>
        <button onClick={() => fileRef.current?.click()}
          style={{ padding: "12px 32px", background: "#e09422", color: "#000", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          Upload Drawing PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleUpload(f); }} />
        <button onClick={handleClose}
          style={{ padding: "8px 20px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer" }}>
          Back to Estimating
        </button>
      </div>
    );
  }

  // ── Full-screen DrawingViewer ──
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0a0e1a" }}>
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
