// ═══════════════════════════════════════════════════════════════
//  EBC-OS · ShortageReportModal — Shortage/damage report for driver
//  Captures type, qty discrepancy, description, photo, GPS
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { PhotoCapture } from "./PhotoCapture";
import { FieldInput } from "./FieldInput";
import { AlertTriangle } from "lucide-react";

const ISSUE_TYPES = ["Shortage", "Damage", "Wrong Item", "Refused"];

const ISSUE_COLORS = {
  Shortage: "var(--amber, #f59e0b)",
  Damage: "var(--red, #ef4444)",
  "Wrong Item": "var(--accent, #3b82f6)",
  Refused: "var(--text2)",
};

export function ShortageReportModal({ delivery, onReport, onClose, t }) {
  const tr = t || ((k) => k);

  const [issueType, setIssueType] = useState("Shortage");
  const [expectedQty, setExpectedQty] = useState(
    delivery?.qty != null ? String(delivery.qty) : ""
  );
  const [receivedQty, setReceivedQty] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");

  const isShortage = issueType === "Shortage";

  const handleSubmit = async () => {
    setSaving(true);

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

    const report = {
      id: crypto.randomUUID(),
      type: issueType,
      expectedQty: isShortage ? Number(expectedQty) || null : null,
      receivedQty: isShortage ? Number(receivedQty) || null : null,
      description: description.trim(),
      photos,
      gps,
      timestamp: new Date().toISOString(),
      deliveryId: delivery?.id || null,
      materialName: delivery?.materialName || "",
    };

    onReport(report);
    setSaving(false);
  };

  const canSubmit =
    issueType &&
    (description.trim() || photos.length > 0 || (isShortage && receivedQty));

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
          <AlertTriangle size={24} color="var(--amber, #f59e0b)" />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>
              {tr("Report Issue")}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {delivery?.materialName || ""}
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
          {/* Issue type buttons */}
          <div>
            <label
              className="form-label"
              style={{ marginBottom: 8, display: "block" }}
            >
              {tr("Issue Type")}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {ISSUE_TYPES.map((type) => {
                const active = issueType === type;
                const color = ISSUE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setIssueType(type)}
                    style={{
                      padding: "12px 8px",
                      borderRadius: 8,
                      border: active
                        ? `2px solid ${color}`
                        : "2px solid var(--border)",
                      background: active
                        ? `${color}1a`
                        : "var(--bg3)",
                      color: active ? color : "var(--text2)",
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {tr(type)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shortage qty fields */}
          {isShortage && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <FieldInput
                  label={tr("Expected Qty")}
                  type="number"
                  inputMode="numeric"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                  min="0"
                  t={tr}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FieldInput
                  label={tr("Received Qty")}
                  type="number"
                  inputMode="numeric"
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(e.target.value)}
                  placeholder="0"
                  min="0"
                  t={tr}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <FieldInput
            label={tr("Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tr("What happened?")}
            t={tr}
          />

          {/* Photo */}
          <PhotoCapture photos={photos} onPhotos={setPhotos} t={tr} />

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
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              flex: 2,
              padding: "14px",
              fontSize: 15,
              fontWeight: 700,
              background: !canSubmit
                ? "var(--bg3)"
                : "var(--amber, #f59e0b)",
              color: !canSubmit ? "var(--text3)" : "#0f1f2e",
              border: "none",
              borderRadius: 10,
              cursor: !canSubmit ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <AlertTriangle
              size={18}
              color={!canSubmit ? "var(--text3)" : "#0f1f2e"}
            />
            {saving ? tr("Submitting...") : tr("Submit Report")}
          </button>
        </div>
      </div>
    </div>
  );
}
