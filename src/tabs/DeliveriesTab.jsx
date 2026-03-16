import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
//  Deliveries Tab — Delivery queue, in-transit, and completed
//  Used by drivers (and visible to anyone with "deliveries" access)
// ═══════════════════════════════════════════════════════════════

export function DeliveriesTab({ app }) {
  const {
    auth, projects, materialRequests, setMaterialRequests, show, t,
  } = app;

  const [subTab, setSubTab] = useState("queue");

  // ── delivery lists ──
  const queueItems = useMemo(
    () => materialRequests.filter(r => r.status === "approved"),
    [materialRequests]
  );

  const inTransitItems = useMemo(
    () => materialRequests.filter(r => r.status === "in-transit" && r.driverId === auth?.id),
    [materialRequests, auth]
  );

  const todayDelivered = useMemo(() => {
    const today = new Date().toDateString();
    return materialRequests.filter(
      r => r.status === "delivered" && r.driverId === auth?.id &&
        r.deliveredAt && new Date(r.deliveredAt).toDateString() === today
    );
  }, [materialRequests, auth]);

  // ── actions ──
  const handleStartDelivery = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "in-transit", driverId: auth.id } : r
    ));
    show(t("Delivery started"), "ok");
  };

  const handleMarkDelivered = (reqId) => {
    setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "delivered", deliveredAt: new Date().toISOString() } : r
    ));
    show(t("Marked as delivered"), "ok");
  };

  // ── format helpers ──
  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  // ── project helpers ──
  const getNavLink = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj?.lat || !proj?.lng) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${proj.lat},${proj.lng}`;
  };

  const getProjectAddress = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    return proj?.address || "";
  };

  const tabs = [
    { key: "queue", label: t("Queue"), count: queueItems.length },
    { key: "transit", label: t("In Transit"), count: inTransitItems.length },
    { key: "completed", label: t("Completed"), count: todayDelivered.length },
  ];

  return (
    <div>
      <div className="section-header">
        <div className="section-title font-head">{t("Deliveries")}</div>
      </div>

      {/* Sub-tabs */}
      <div className="emp-tabs" style={{ marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`emp-tab${subTab === tab.key ? " active" : ""}`}
            onClick={() => setSubTab(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span className="driver-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ QUEUE ═══ */}
      {subTab === "queue" && (
        <div>
          {queueItems.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
              <div className="empty-text">{t("No pending deliveries")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {queueItems.map(req => {
                const navLink = getNavLink(req.projectId);
                const address = getProjectAddress(req.projectId);
                return (
                  <div key={req.id} className="card" style={{ padding: 16 }}>
                    <div className="text-sm font-bold text-amber mb-4">{req.projectName}</div>
                    {address && <div className="text-xs text-muted mb-8">{address}</div>}
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className="text-sm font-mono">{req.qty} {req.unit}</span>
                    </div>
                    <div className="text-xs text-muted mb-8">
                      {t("Requester")}: {req.employeeName} · {fmtDate(req.requestedAt)}
                    </div>
                    {req.notes && <div className="text-xs text-dim mb-8">{req.notes}</div>}
                    <div className="flex gap-8">
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleStartDelivery(req.id)}
                      >
                        {t("Start Delivery")}
                      </button>
                      {navLink && (
                        <a
                          href={navLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          {t("Navigate")} →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ IN TRANSIT ═══ */}
      {subTab === "transit" && (
        <div>
          {inTransitItems.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ fontSize: 40, marginBottom: 8 }}>🚛</div>
              <div className="empty-text">{t("No active deliveries")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inTransitItems.map(req => {
                const navLink = getNavLink(req.projectId);
                const address = getProjectAddress(req.projectId);
                return (
                  <div key={req.id} className="card" style={{ padding: 16, borderLeft: "3px solid var(--amber)" }}>
                    <div className="text-sm font-bold text-amber mb-4">{req.projectName}</div>
                    {address && <div className="text-xs text-muted mb-8">{address}</div>}
                    <div className="flex-between mb-4">
                      <span className="text-sm font-semi">{req.material}</span>
                      <span className="text-sm font-mono">{req.qty} {req.unit}</span>
                    </div>
                    <div className="text-xs text-muted mb-8">
                      {t("Requester")}: {req.employeeName}
                    </div>
                    <div className="flex gap-8">
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                        onClick={() => handleMarkDelivered(req.id)}
                      >
                        {t("Mark Delivered")}
                      </button>
                      {navLink && (
                        <a
                          href={navLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          {t("Navigate")} →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPLETED ═══ */}
      {subTab === "completed" && (
        <div>
          {todayDelivered.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div className="empty-text">{t("No deliveries completed today")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayDelivered.map(req => (
                <div key={req.id} className="card" style={{ padding: 14 }}>
                  <div className="flex-between mb-4">
                    <span className="text-sm font-semi">{req.material}</span>
                    <span className="badge badge-green">{t("Delivered")}</span>
                  </div>
                  <div className="text-xs text-muted mb-4">{req.projectName} — {req.qty} {req.unit}</div>
                  <div className="text-xs text-dim">
                    {t("Delivered")} {fmtTime(req.deliveredAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
