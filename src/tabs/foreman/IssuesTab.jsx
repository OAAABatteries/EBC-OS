import { AlertTriangle, MapPin } from "lucide-react";
import { PremiumCard, EmptyState } from "../../components/field";

export function IssuesTab({ problems, setProblems, selectedProjectId, setShowReportProblem, t }) {
  const projProblems = (problems || []).filter(p => String(p.projectId) === String(selectedProjectId))
    .sort((a, b) => new Date(b.reportedAt || b.createdAt) - new Date(a.reportedAt || a.createdAt));
  const openProblems = projProblems.filter(p => p.status !== "resolved");
  const resolvedProblems = projProblems.filter(p => p.status === "resolved");

  return (
    <div className="emp-content">
      <div className="section-header">
        <div>
          <div className="section-title frm-section-title-md">{t("Issues & Blockers")}</div>
          <div className="text-xs text-muted">{openProblems.length} {t("open")} · {resolvedProblems.length} {t("resolved")}</div>
        </div>
        <button className="btn btn-sm frm-report-problem-btn"
          onClick={() => setShowReportProblem(true)}>
          <AlertTriangle size={14} /> {t("Report Problem")}
        </button>
      </div>
      {openProblems.length === 0 && resolvedProblems.length === 0 ? (
        <EmptyState icon={AlertTriangle} heading={t("No issues reported")} message={t("Tap Report Problem to log an issue")} t={t} />
      ) : (
        <div className="frm-flex-col-8">
          {openProblems.map(p => (
            <PremiumCard key={p.id} variant="info" style={{ borderLeft: `3px solid ${p.priority === "high" || p.priority === "critical" ? "var(--red)" : "var(--amber)"}` }}>
              <div className="flex-between mb-4">
                <span className="text-sm font-bold">{p.category || t("General")}</span>
                <span className={`badge ${p.priority === "high" || p.priority === "critical" ? "badge-red" : "badge-amber"}`}>{p.priority || "medium"}</span>
              </div>
              <div className="text-xs text-muted mb-4">{p.description || p.notes || ""}</div>
              {p.location && <div className="text-xs text-dim mb-4"><MapPin size={10} /> {p.location}</div>}
              <div className="flex-between">
                <span className="text-xs text-dim">{p.reportedBy || t("Unknown")} · {new Date(p.reportedAt || p.createdAt).toLocaleDateString()}</span>
                <button className="btn btn-sm badge-green" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", border: "none", cursor: "pointer" }}
                  onClick={() => setProblems(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: "resolved", resolvedAt: new Date().toISOString() } : pr))}>
                  {t("Resolve")}
                </button>
              </div>
              {p.photos?.length > 0 && (
                <div className="frm-photo-thumb-row">
                  {p.photos.slice(0, 3).map((ph, i) => (
                    <img key={i} src={ph} alt="" className="frm-photo-thumb-sm" />
                  ))}
                </div>
              )}
            </PremiumCard>
          ))}
          {resolvedProblems.length > 0 && (
            <div className="frm-mt-8">
              <div className="text-xs font-bold text-muted mb-4">{t("Resolved")} ({resolvedProblems.length})</div>
              {resolvedProblems.slice(0, 5).map(p => (
                <div key={p.id} className="frm-resolved-row">
                  <span style={{ textDecoration: "line-through" }}>{p.category}: {(p.description || "").slice(0, 50)}</span>
                  <span className="text-xs text-dim" style={{ marginLeft: "var(--space-2)" }}>{new Date(p.resolvedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
