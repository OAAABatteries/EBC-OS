// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PhotoCapture — Reusable camera/file input with previews
//  Used by: ReportProblemModal, TmCaptureTab, PunchTab, PodModal,
//           ShortageReportModal, ProductionEntry
// ═══════════════════════════════════════════════════════════════

import React, { useRef } from "react";
import { Camera, X, Cloud, CloudOff } from "lucide-react";
import { uploadPhoto, isSupabaseConfigured } from "../../lib/supabase";

/**
 * @param {Object} props
 * @param {Array}  props.photos     — array of {name, data} objects (base64)
 * @param {Function} props.onPhotos — setter for photos array
 * @param {boolean} [props.multiple=true] — allow multiple photos
 * @param {string}  [props.label]   — label text (default "Photos")
 * @param {Function} [props.t]      — translation function
 * @param {Object}  [props.uploadContext] — Supabase upload context { context, projectId, entityId }
 */
export function PhotoCapture({ photos = [], onPhotos, multiple = true, label, t, uploadContext }) {
  const inputRef = useRef(null);
  const tr = (s) => (t ? t(s) : s);

  /**
   * Compress an image file via canvas: resize to max 1200px edge, JPEG quality 0.6
   * Reduces ~3MB iPhone photo to ~80-150KB data URL
   */
  const compressPhoto = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        // Fallback: read as-is if compression fails
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });

  const handleCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Capture GPS location at time of photo
    let gps = null;
    try {
      if (navigator.geolocation) {
        gps = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      }
    } catch { /* ignore */ }

    for (const file of files) {
      const data = await compressPhoto(file);
      const entry = { name: file.name, data, capturedAt: new Date().toISOString(), gps };

      // Upload to Supabase in background if configured
      if (isSupabaseConfigured() && uploadContext) {
        uploadPhoto(data, uploadContext).then((result) => {
          if (result) {
            onPhotos((prev) =>
              prev.map((p) =>
                p.capturedAt === entry.capturedAt && p.name === entry.name
                  ? { ...p, storagePath: result.path, storageUrl: result.url }
                  : p
              )
            );
          }
        }).catch(() => { /* keep base64 fallback */ });
      }

      onPhotos((prev) => (multiple ? [...prev, entry] : [entry]));
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removePhoto = (idx) => {
    onPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex-col gap-sp2">
      {label !== false && (
        <label className="fw-semi fs-tab uppercase c-text2">
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
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex fs-label fw-semi bg-bg3 justify-center c-text2 gap-sp2 cursor-pointer" style={{ padding: "var(--space-3) var(--space-4)", minHeight: "var(--touch-min, 44px)", border: "2px dashed var(--border2)",
          borderRadius: "var(--radius-sm, 6px)" }}
      >
        <Camera size={18} />
        {tr(photos.length > 0 ? "Add More Photos" : "Take Photo")}
      </button>

      {photos.length > 0 && (
        <div className="mt-sp1 gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}>
          {photos.map((p, i) => (
            <div key={i} className="relative overflow-hidden" style={{ aspectRatio: "1", borderRadius: "var(--radius-sm, 6px)" }}>
              <img src={p.storageUrl || p.data} alt={p.name} className="h-full w-full" style={{ objectFit: "cover" }} />
              {/* Cloud sync indicator */}
              {isSupabaseConfigured() && uploadContext && (
                <div className="absolute flex justify-center" style={{ bottom: 2, left: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)" }}>
                  {p.storagePath
                    ? <Cloud size={12} color="var(--green)" />
                    : <CloudOff size={12} color="var(--text3)" />}
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="flex justify-center absolute cursor-pointer c-white" style={{ top: 2, right: 2,
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)", border: "none", padding: 0 }}
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
