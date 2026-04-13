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
        className="modal-content rounded-card overflow-hidden w-full" style={{ maxWidth: 480,
          background: "var(--card)",
          padding: 0 }}
      >
        {/* Header */}
        <div
          className="gap-sp3" style={{ background: "var(--navy, #0f1f2e)",
            padding: "var(--space-5) var(--space-5) var(--space-4)",
            display: "flex",
            alignItems: "center" }}
        >
          <AlertTriangle size={24} color="var(--amber, #f59e0b)" />
          <div className="flex-1">
            <div className="fw-bold fs-card c-white">
              {tr("Report Issue")}
            </div>
            <div className="fs-label" style={{ color: "rgba(255,255,255,0.55)" }}>
              {delivery?.materialName || ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-control fs-card justify-center cursor-pointer c-white" style={{ background: "rgba(255,255,255,0.1)",
              border: "none",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          className="gap-sp4" style={{ padding: "var(--space-5) var(--space-5) var(--space-2)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "60vh",
            overflowY: "auto" }}
        >
          {/* Issue type buttons */}
          <div>
            <label
              className="form-label mb-sp2 d-block"
            >
              {tr("Issue Type")}
            </label>
            <div
              className="gap-sp2 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              {ISSUE_TYPES.map((type) => {
                const active = issueType === type;
                const color = ISSUE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setIssueType(type)}
                    style={{
                      padding: "var(--space-3) var(--space-2)",
                      borderRadius: "var(--radius-control)",
                      border: active
                        ? `2px solid ${color}`
                        : "2px solid var(--border)",
                      background: active
                        ? `${color}1a`
                        : "var(--bg3)",
                      color: active ? color : "var(--text2)",
                      fontWeight: active ? 700 : 500,
                      fontSize: "var(--text-label)",
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
            <div className="gap-sp3" style={{ display: "flex" }}>
              <div className="flex-1">
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
              <div className="flex-1">
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
              className="fs-label c-text3 gap-sp2" style={{ display: "flex",
                alignItems: "center" }}
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
        <div className="gap-sp3" style={{ padding: "var(--space-3) var(--space-5) var(--space-5)", display: "flex" }}>
          <button
            className="btn"
            onClick={onClose}
            className="fs-secondary p-sp4 bg-bg3 c-text2 flex-1" style={{ border: "1px solid var(--border)" }}
          >
            {tr("Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              flex: 2,
              padding: "var(--space-4)",
              fontSize: "var(--text-secondary)",
              fontWeight: "var(--weight-bold)",
              background: !canSubmit
                ? "var(--bg3)"
                : "var(--amber, #f59e0b)",
              color: !canSubmit ? "var(--text3)" : "#0f1f2e",
              border: "none",
              borderRadius: "var(--radius-control)",
              cursor: !canSubmit ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
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
