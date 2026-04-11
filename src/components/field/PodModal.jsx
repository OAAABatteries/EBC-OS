// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PodModal — Proof-of-Delivery modal for driver use
//  Captures recipient, condition, notes, photo, signature, GPS
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from "react";
import { PhotoCapture } from "./PhotoCapture";
import { FieldSignaturePad } from "./FieldSignaturePad";
import { FieldInput } from "./FieldInput";
import { FieldButton } from "./FieldButton";
import { ClipboardCheck } from "lucide-react";

const CONDITIONS = ["Intact", "Partial", "Damaged"];

export function PodModal({ delivery, onConfirm, onClose, t }) {
  const tr = t || ((k) => k);

  const [recipientName, setRecipientName] = useState("");
  const [condition, setCondition] = useState("Intact");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");

  const sigRef = useRef(null);

  const handleSigReady = (sigApi) => {
    sigRef.current = sigApi;
  };

  const handleConfirm = async () => {
    if (!recipientName.trim()) {
      if (!window.confirm(tr("No recipient name — are you sure?"))) return;
    }
    setSaving(true);

    // Capture signature
    const signature = sigRef.current?.getSig?.() || null;

    // Capture GPS
    let gps = null;
    try {
      setGpsStatus(tr("Getting location..."));
      gps = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
      setGpsStatus(tr("Location captured"));
    } catch {
      setGpsStatus(tr("Location unavailable"));
    }

    const pod = {
      recipientName: recipientName.trim(),
      condition,
      notes: notes.trim(),
      photos,
      signature,
      timestamp: new Date().toISOString(),
      gps,
    };

    onConfirm(pod);
    setSaving(false);
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--card)",
          borderRadius: "var(--radius-card)",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--navy, #0f1f2e)",
            padding: "var(--space-5) var(--space-5) var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <ClipboardCheck size={24} color="var(--green, #22c55e)" />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)" }}>
              {tr("Proof of Delivery")}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "var(--text-label)" }}>
              {delivery?.projectName || delivery?.materialName || ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              borderRadius: "var(--radius-control)",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: "var(--text-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "var(--space-5) var(--space-5) var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {/* Recipient */}
          <FieldInput
            label={tr("Recipient Name")}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={tr("Who received it?")}
            t={tr}
          />

          {/* Condition */}
          <div>
            <label
              className="form-label"
              style={{ marginBottom: "var(--space-2)", display: "block" }}
            >
              {tr("Condition")}
            </label>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{
                    flex: 1,
                    padding: "var(--space-3) var(--space-1)",
                    borderRadius: "var(--radius-control)",
                    border:
                      condition === c
                        ? "2px solid var(--green, #22c55e)"
                        : "2px solid var(--border)",
                    background:
                      condition === c
                        ? "rgba(34,197,94,0.12)"
                        : "var(--bg3)",
                    color:
                      condition === c
                        ? "var(--green, #22c55e)"
                        : "var(--text2)",
                    fontWeight: condition === c ? 700 : 500,
                    fontSize: "var(--text-label)",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {tr(c)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <FieldInput
            label={tr("Notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tr("Optional notes...")}
            t={tr}
          />

          {/* Photo */}
          <PhotoCapture photos={photos} onPhotos={setPhotos} t={tr} />

          {/* Signature */}
          <FieldSignaturePad
            label={tr("Signature")}
            onSave={handleSigReady}
            t={tr}
          />

          {gpsStatus && (
            <div
              style={{
                fontSize: "var(--text-label)",
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: gpsStatus.includes("captured")
                    ? "var(--green)"
                    : "var(--amber)",
                  display: "inline-block",
                }}
              />
              {gpsStatus}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "var(--space-3) var(--space-5) var(--space-5)", display: "flex", gap: "var(--space-3)" }}>
          <button
            className="btn"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "var(--space-4)",
              fontSize: "var(--text-secondary)",
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              color: "var(--text2)",
            }}
          >
            {tr("Cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{
              flex: 2,
              padding: "var(--space-4)",
              fontSize: "var(--text-secondary)",
              fontWeight: "var(--weight-bold)",
              background: "var(--green, #22c55e)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-control)",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            <ClipboardCheck
              size={18}
              color="#fff"
            />
            {saving ? tr("Saving...") : tr("Confirm Delivery")}
          </button>
        </div>
      </div>
    </div>
  );
}
