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
          borderRadius: 16,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--navy, #0f1f2e)",
            padding: "20px 20px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ClipboardCheck size={24} color="var(--green, #22c55e)" />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>
              {tr("Proof of Delivery")}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {delivery?.projectName || delivery?.materialName || ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
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
            padding: "20px 20px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
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
              style={{ marginBottom: 8, display: "block" }}
            >
              {tr("Condition")}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{
                    flex: 1,
                    padding: "12px 4px",
                    borderRadius: 8,
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
                    fontSize: 13,
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
                fontSize: 12,
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                gap: 6,
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
        <div style={{ padding: "12px 20px 20px", display: "flex", gap: 10 }}>
          <button
            className="btn"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "14px",
              fontSize: 15,
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
              padding: "14px",
              fontSize: 15,
              fontWeight: 700,
              background: "var(--green, #22c55e)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
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
