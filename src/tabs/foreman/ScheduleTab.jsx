import { Calendar } from "lucide-react";
import { PremiumCard, EmptyState, StatusBadge } from "../../components/field";

export function ScheduleTab({ mySchedule, selectedProjectId, employees, t }) {
  const projSchedule = (mySchedule || []).filter(s =>
    String(s.projectId) === String(selectedProjectId)
  );
  return (
    <div>
      <div className="section-header">
        <div className="section-title">{t("Project Schedule")}</div>
      </div>
      {projSchedule.length === 0 ? (
        <EmptyState icon={Calendar} heading={t("No schedule entries")} message={t("No shifts scheduled for this project")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {projSchedule.sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((s, i) => {
            const emp = employees.find(e => String(e.id) === String(s.employeeId));
            return (
              <PremiumCard key={i} variant="info">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-card)" }}>{emp?.name || t("Unassigned")}</div>
                    <div style={{ fontSize: "var(--text-label)", color: "var(--text3)", marginTop: "var(--space-1)" }}>
                      {s.date} {s.start_time && `· ${s.start_time} - ${s.end_time || ""}`}
                    </div>
                  </div>
                  <StatusBadge status={s.status || "scheduled"} t={t} />
                </div>
              </PremiumCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
