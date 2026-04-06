// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PhotoCapture — Reusable camera/file input with previews
//  Used by: ReportProblemModal, TmCaptureTab, PunchTab, PodModal,
//           ShortageReportModal, ProductionEntry
// ═══════════════════════════════════════════════════════════════

import React, { useRef } from "react";
import { Camera, X } from "lucide-react";

/**
 * @param {Object} props
 * @param {Array}  props.photos     — array of {name, data} objects (base64)
 * @param {Function} props.onPhotos — setter for photos array
 * @param {boolean} [props.multiple=true] — allow multiple photos
 * @param {string}  [props.label]   — label text (default "Photos")
 * @param {Function} [props.t]      — translation function
 */
export function PhotoCapture({ photos = [], onPhotos, multiple = true, label, t }) {
  const inputRef = useRef(null);
  const tr = (s) => (t ? t(s) : s);

  const handleCapture = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Capture GPS location at time of photo
    const gpsPromise = new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        resolve(null);
      }
    });

    gpsPromise.then((gps) => {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const entry = { name: file.name, data: reader.result, capturedAt: new Date().toISOString(), gps };
          onPhotos((prev) => (multiple ? [...prev, entry] : [entry]));
        };
        reader.readAsDataURL(file);
      });
    });
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removePhoto = (idx) => {
    onPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label !== false && (
        <label style={{ fontSize: "var(--text-sm)", color: "var(--text2)", fontWeight: 600, textTransform: "uppercase" }}>
          {tr(label || "Photos")}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        onChange={handleCapture}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 16px", minHeight: "var(--touch-min, 44px)",
          background: "var(--bg3)", border: "2px dashed var(--border2)",
          borderRadius: "var(--radius-sm, 6px)", color: "var(--text2)",
          cursor: "pointer", fontSize: "var(--text-base, 13px)", fontWeight: 600,
        }}
      >
        <Camera size={18} />
        {tr(photos.length > 0 ? "Add More Photos" : "Take Photo")}
      </button>

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8, marginTop: 4 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-sm, 6px)", overflow: "hidden" }}>
              <img src={p.data} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                style={{
                  position: "absolute", top: 2, right: 2,
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)", border: "none",
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
