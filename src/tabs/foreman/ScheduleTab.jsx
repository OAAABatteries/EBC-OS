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
        <div className="flex-col gap-sp3">
          {projSchedule.sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((s, i) => {
            const emp = employees.find(e => String(e.id) === String(s.employeeId));
            return (
              <PremiumCard key={i} variant="info">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="fw-semi fs-card">{emp?.name || t("Unassigned")}</div>
                    <div className="fs-label mt-sp1 c-text3">
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
