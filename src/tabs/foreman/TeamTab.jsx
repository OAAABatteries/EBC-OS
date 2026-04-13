import { UserPlus, X, Search, CheckSquare, Square, CheckCircle, Clock, PenLine, Users, Shield } from "lucide-react";
import { PremiumCard, FieldButton, EmptyState, Skeleton, CredentialCard } from "../../components/field";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];

export function TeamTab({
  teamForProject, teamClocks, employees, activeForeman,
  handleCrewClockIn, handleCrewClockOut,
  rollCallMode, setRollCallMode, rollCallSelected, setRollCallSelected, handleBulkClockIn,
  showLaborEntry, setShowLaborEntry, bulkLaborMode, setBulkLaborMode,
  bulkLaborSelected, setBulkLaborSelected,
  laborForm, setLaborForm, handleAddLabor, handleBulkLabor,
  laborEntries, editingLaborId, setEditingLaborId,
  editingLaborHours, setEditingLaborHours,
  handleEditLabor, handleDeleteLabor, clearLaborDraft,
  showCrewAdd, setShowCrewAdd, teamAddSearch, setCrewAddSearch, teamAddRef,
  extraCrewIds, setExtraCrewIds,
  selectedProjectId, areas, COST_CODES,
  pendingRequests, pendingLoading,
  setApprovalSheet, setApprovalComment,
  filteredCrewCerts, certFilter, setCertFilter, certsLoading,
  fmtHours, t,
}) {
  const scheduledIds = new Set(teamForProject.map(c => String(c.id)));
  const extraCrew = extraCrewIds
    .map(id => employees.find(e => String(e.id) === String(id)))
    .filter(Boolean);
  const allDisplayCrew = [...teamForProject, ...extraCrew];

  const teamAddFiltered = (() => {
    const q = teamAddSearch.toLowerCase().trim();
    return (employees || [])
      .filter(e => e.active !== false && !scheduledIds.has(String(e.id)) && !extraCrewIds.some(id => String(id) === String(e.id)))
      .filter(e => !q || e.name.toLowerCase().includes(q))
      .slice(0, 12);
  })();

  return (
    <div className="emp-content">
      {/* Roll Call + Labor Entry action row */}
      <div className="foreman-roll-call-toggle">
        <FieldButton variant="primary" className={`flex-1 foreman-action-btn ${rollCallMode ? "foreman-action-btn--green" : "foreman-action-btn--blue"}`}
          onClick={() => { setRollCallMode(v => !v); if (!rollCallMode) setRollCallSelected({}); }} t={t}>
          <CheckSquare size={15} />
          {rollCallMode ? t("Cancel") : t("Roll Call")}
        </FieldButton>
        <FieldButton variant="primary" className="flex-1 foreman-action-btn foreman-action-btn--amber"
          onClick={() => setShowLaborEntry(v => !v)} t={t}>
          <Clock size={15} />
          {t("Labor Entry")}
        </FieldButton>
      </div>

      {/* Roll Call Mode */}
      {rollCallMode && allDisplayCrew.length > 0 && (
        <div className="frm-roll-call-card">
          <div className="frm-flex-between frm-mb-10">
            <span className="text-sm font-bold">{t("Roll Call")} — {t("Select crew to clock in")}</span>
            <button className="text-xs frm-btn-unstyled--amber frm-amber"
              onClick={() => {
                const allIds = {};
                allDisplayCrew.forEach(c => { if (!teamClocks[c.id]) allIds[c.id] = true; });
                setRollCallSelected(allIds);
              }}>
              {t("Select All")}
            </button>
          </div>
          {allDisplayCrew.map(c => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", cursor: teamClocks[c.id] ? "default" : "pointer", opacity: teamClocks[c.id] ? 0.5 : 1 }}>
              {teamClocks[c.id] ? (
                <CheckCircle size={18} style={{ color: "var(--green)", flexShrink: 0 }} />
              ) : (
                rollCallSelected[c.id]
                  ? <CheckSquare size={18} style={{ color: "var(--accent)", flexShrink: 0 }} onClick={() => setRollCallSelected(p => ({ ...p, [c.id]: false }))} />
                  : <Square size={18} style={{ color: "var(--text3)", flexShrink: 0 }} onClick={() => setRollCallSelected(p => ({ ...p, [c.id]: true }))} />
              )}
              <span className="text-sm frm-flex-1">{c.name}</span>
              {teamClocks[c.id] && <span className="text-xs" style={{ color: "var(--green)" }}>{"\u2713"} {t("Clocked In")}</span>}
            </label>
          ))}
          <button
            className="btn btn-primary touch-target frm-labor-submit frm-mt-12"
            onClick={handleBulkClockIn}
            disabled={Object.values(rollCallSelected).filter(Boolean).length === 0}
          >
            <CheckSquare size={16} /> {t("Clock In Selected")} ({Object.values(rollCallSelected).filter(Boolean).length})
          </button>
        </div>
      )}

      {/* Labor Entry Form (Bulk + Single mode) */}
      {showLaborEntry && (
        <div className="frm-roll-call-card">
          <div className="frm-flex-between frm-mb-10">
            <div className="text-sm font-bold">{t("Labor Entry")}</div>
            <div className="frm-flex-row" style={{ gap: "var(--space-1)" }}>
              <button className={`btn btn-sm ${bulkLaborMode ? "btn-primary" : "btn-ghost"} frm-font-11`} style={{ padding: "var(--space-1) var(--space-3)" }} onClick={() => setBulkLaborMode(true)}>{t("Bulk")}</button>
              <button className={`btn btn-sm ${!bulkLaborMode ? "btn-primary" : "btn-ghost"} frm-font-11`} style={{ padding: "var(--space-1) var(--space-3)" }} onClick={() => setBulkLaborMode(false)}>{t("Single")}</button>
            </div>
          </div>

          {/* Crew selection */}
          {bulkLaborMode ? (
            <div className="frm-labor-crew-list">
              <div className="frm-labor-crew-header">
                <span className="text-xs font-bold">{t("Select crew")} ({Object.values(bulkLaborSelected).filter(Boolean).length})</span>
                <button className="text-xs frm-btn-unstyled--amber frm-amber"
                  onClick={() => { const all = {}; allDisplayCrew.forEach(c => { all[c.id] = true; }); setBulkLaborSelected(all); }}>
                  {t("Select All")}
                </button>
              </div>
              {allDisplayCrew.map(c => (
                <label key={c.id} className="frm-labor-crew-row">
                  {bulkLaborSelected[c.id]
                    ? <CheckSquare size={16} style={{ color: "var(--accent)", flexShrink: 0 }} onClick={() => setBulkLaborSelected(p => ({ ...p, [c.id]: false }))} />
                    : <Square size={16} style={{ color: "var(--text3)", flexShrink: 0 }} onClick={() => setBulkLaborSelected(p => ({ ...p, [c.id]: true }))} />
                  }
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <select className="form-input field-input mb-8" value={laborForm.employeeId} onChange={e => setLaborForm(p => ({ ...p, employeeId: e.target.value }))}>
              <option value="">{t("Select crew member")}</option>
              {allDisplayCrew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Shared fields */}
          <select className="form-input field-input mb-8" value={laborForm.areaId} onChange={e => setLaborForm(p => ({ ...p, areaId: e.target.value }))}>
            <option value="">{t("Select area")}</option>
            {(areas || []).filter(a => String(a.projectId) === String(selectedProjectId)).map(a => <option key={a.id} value={a.id}>{a.name} — {a.floor} {a.zone}</option>)}
          </select>
          <select className="form-input field-input mb-8" value={laborForm.costCode} onChange={e => setLaborForm(p => ({ ...p, costCode: e.target.value }))}>
            {COST_CODES.map(cc => <option key={cc} value={cc}>{t(cc.charAt(0).toUpperCase() + cc.slice(1))}</option>)}
          </select>
          <div className="frm-flex-row">
            <input type="number" className="form-input field-input mb-8" placeholder={t("Hours")} value={laborForm.hours} onChange={e => setLaborForm(p => ({ ...p, hours: e.target.value }))} style={{ flex: 1, fontSize: "var(--text-card)", height: 48 }} />
            <select className="form-input field-input mb-8 frm-flex-1" value={laborForm.payType} onChange={e => setLaborForm(p => ({ ...p, payType: e.target.value }))}>
              <option value="regular">{t("Regular")}</option>
              <option value="overtime">{t("Overtime")}</option>
              <option value="doubletime">{t("Double Time")}</option>
            </select>
          </div>
          <input type="text" className="form-input field-input mb-8" placeholder={t("Notes")} value={laborForm.notes} onChange={e => setLaborForm(p => ({ ...p, notes: e.target.value }))} />

          {/* Submit button */}
          {bulkLaborMode ? (
            <button className="btn btn-primary touch-target frm-labor-submit" onClick={handleBulkLabor}
              disabled={Object.values(bulkLaborSelected).filter(Boolean).length === 0 || !laborForm.areaId || !laborForm.hours}>
              {t("Add Labor")} ({Object.values(bulkLaborSelected).filter(Boolean).length} {t("crew")})
            </button>
          ) : (
            <button className="btn btn-primary touch-target frm-labor-submit" onClick={handleAddLabor}
              disabled={!laborForm.employeeId || !laborForm.areaId || !laborForm.hours}>
              {t("Add Labor")}
            </button>
          )}

          {/* Today's labor entries with edit/delete */}
          {laborEntries.filter(le => le.projectId === selectedProjectId && le.date === new Date().toISOString().slice(0, 10) && le.status !== "deleted").length > 0 && (
            <div className="frm-labor-today">
              <div className="text-xs font-bold mb-4">{t("Today's Labor")} ({laborEntries.filter(le => le.projectId === selectedProjectId && le.date === new Date().toISOString().slice(0, 10) && le.status !== "deleted").reduce((s, le) => s + le.hours, 0).toFixed(1)}h)</div>
              {laborEntries.filter(le => le.projectId === selectedProjectId && le.date === new Date().toISOString().slice(0, 10) && le.status !== "deleted").map(le => (
                <div key={le.id} className="frm-labor-row">
                  <span className="frm-flex-1 frm-truncate">{le.employeeName}</span>
                  <span className="text-muted">{le.costCode}</span>
                  {editingLaborId === le.id ? (
                    <div className="frm-flex-row-center" style={{ gap: "var(--space-1)" }}>
                      <input type="number" value={editingLaborHours} onChange={e => setEditingLaborHours(e.target.value)}
                        className="frm-labor-edit-input"
                        autoFocus onKeyDown={e => { if (e.key === "Enter") { handleEditLabor(le.id, editingLaborHours); setEditingLaborId(null); } if (e.key === "Escape") setEditingLaborId(null); }} />
                      <button className="frm-labor-edit-ok"
                        onClick={() => { handleEditLabor(le.id, editingLaborHours); setEditingLaborId(null); }}>{"\u2713"}</button>
                      <button className="frm-btn-unstyled--text3"
                        onClick={() => setEditingLaborId(null)}>{"\u2715"}</button>
                    </div>
                  ) : (
                    <>
                      <span className="frm-labor-hours">{le.hours}h{le.payType !== "regular" ? ` ${le.payType.slice(0,2).toUpperCase()}` : ""}</span>
                      <button className="frm-btn-unstyled--text3"
                        onClick={() => { setEditingLaborId(le.id); setEditingLaborHours(String(le.hours)); }}>
                        <PenLine size={12} />
                      </button>
                    </>
                  )}
                  <button className="frm-btn-unstyled--red"
                    onClick={() => handleDeleteLabor(le.id)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("Crew Members")}</div>
        <button
          className="btn btn-sm frm-add-crew-btn"
          onClick={() => { setShowCrewAdd(v => !v); setCrewAddSearch(""); }}
        >
          <UserPlus size={15} />
          {t("Add Crew")}
        </button>
      </div>

      {/* Add team member dropdown */}
      {showCrewAdd && (
        <div className="frm-crew-add-wrap">
          <div className="frm-crew-add-header">
            <Search size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
            <input
              ref={teamAddRef}
              autoFocus
              type="text"
              placeholder={t("Search employees...")}
              value={teamAddSearch}
              onChange={e => setCrewAddSearch(e.target.value)}
              className="frm-crew-add-input"
            />
            <button onClick={() => setShowCrewAdd(false)} className="frm-btn-unstyled--text3">
              <X size={14} />
            </button>
          </div>
          {teamAddFiltered.length === 0 ? (
            <div className="frm-crew-add-empty">{t("No employees found")}</div>
          ) : (
            teamAddFiltered.map(emp => (
              <div
                key={emp.id}
                className="frm-crew-add-row"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  setExtraCrewIds(prev => [...prev, emp.id]);
                  setCrewAddSearch("");
                }}
              >
                <div className="frm-crew-add-avatar">
                  {emp.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="frm-flex-1">
                  <div className="frm-font-14" style={{ color: "var(--text)" }}>{emp.name}</div>
                  <div className="frm-font-11" style={{ color: "var(--text3)" }}>{emp.role || ""}</div>
                </div>
                <UserPlus size={14} className="frm-amber" />
              </div>
            ))
          )}
        </div>
      )}

      {allDisplayCrew.length === 0 ? (
        <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
          <div style={{ fontSize: "var(--text-stat)", marginBottom: "var(--space-2)", opacity: 0.5 }}><UserPlus size={36} /></div>
          <div className="empty-text">{t("No team assigned")}</div>
          <div className="text-xs text-muted frm-mt-8">{t("Tap Add Crew to add members")}</div>
        </div>
      ) : (
        <div className="frm-flex-col-6">
          {teamForProject.map(c => (
            <div key={c.id} className="foreman-team-row">
              <div>
                <div className="foreman-team-name">{c.name}</div>
                <div className="foreman-team-role">{t(c.role)}</div>
                <div className="text-xs text-muted frm-mt-2">
                  {DAY_KEYS.filter(d => c.days?.[d]).map(d => t(d.charAt(0).toUpperCase() + d.slice(1))).join(", ")}
                </div>
              </div>
              <div className="frm-text-right">
                <div className="foreman-team-hours">{fmtHours(c.todayHours)}</div>
                <div className="text-xs text-muted">{t("Hours Today")}</div>
                <div className="text-xs text-dim frm-mt-2">
                  {fmtHours(c.weekHours)} {t("This Week").toLowerCase()}
                </div>
              </div>
            </div>
          ))}
          {extraCrew.map(c => (
            <div key={c.id} className="foreman-team-row" style={{ borderLeft: "3px solid var(--amber)" }}>
              <div>
                <div className="foreman-team-name">{c.name}</div>
                <div className="foreman-team-role">{t(c.role)}</div>
                <div className="text-xs frm-mt-2 frm-amber">+ {t("Added today")}</div>
              </div>
              <button
                className="frm-btn-unstyled--text3" style={{ padding: "var(--space-2)" }}
                onClick={() => setExtraCrewIds(prev => prev.filter(id => String(id) !== String(c.id)))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests section */}
      <div className="foreman-team-section">
        <div className="foreman-team-section-label">
          {t("PENDING REQUESTS")} {pendingRequests.length > 0 && <span className="foreman-team-count">{pendingRequests.length}</span>}
        </div>
        {pendingLoading ? (
          <div className="frm-flex-col-8">
            {[1,2].map(i => <Skeleton key={i} width="100%" height="64px" style={{ borderRadius: "var(--radius)" }} />)}
          </div>
        ) : pendingRequests.length === 0 ? (
          <EmptyState icon={Users} heading={t("No pending requests")} message={t("Your crew is all set")} t={t} />
        ) : (
          <div className="foreman-team-requests-list">
            {pendingRequests.map(req => (
              <PremiumCard variant="info" key={req.id} className="foreman-team-request-card">
                <div className="foreman-team-request-header">
                  <div className="foreman-team-request-name">{req.employees?.name || t("Unknown")}</div>
                  <div className={`foreman-team-request-type${req.type === "time_off" ? " foreman-team-request-type--timeoff" : ""}`}>
                    {req.type === "time_off" ? t("TIME OFF") : t("SHIFT REQUEST")}
                  </div>
                </div>
                <div className="foreman-team-request-details">
                  {req.available_shifts?.date && <span>{req.available_shifts.date}</span>}
                  {req.available_shifts?.start_time && req.available_shifts?.end_time && (
                    <span>{req.available_shifts.start_time} - {req.available_shifts.end_time}</span>
                  )}
                </div>
                <div className="foreman-team-request-actions">
                  <FieldButton variant="primary" onClick={() => { setApprovalSheet({ request: req, action: "approve" }); setApprovalComment(""); }}>
                    {t("Approve Request")}
                  </FieldButton>
                  <FieldButton variant="danger" onClick={() => { setApprovalSheet({ request: req, action: "deny" }); setApprovalComment(""); }}>
                    {t("Deny Request")}
                  </FieldButton>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </div>

      {/* Crew Certifications section */}
      <div className="foreman-team-section">
        <div className="foreman-team-section-label">{t("CREW CERTIFICATIONS")}</div>

        <div className="foreman-team-cert-filters">
          {["all", "expiring", "expired"].map(filter => (
            <button
              key={filter}
              className={`foreman-team-cert-chip${certFilter === filter ? " foreman-team-cert-chip--active" : ""}`}
              onClick={() => setCertFilter(filter)}
            >
              {t(filter === "all" ? "All" : filter === "expiring" ? "Expiring" : "Expired")}
            </button>
          ))}
        </div>

        {certsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            {[1,2,3].map(i => <Skeleton key={i} width="100%" height="56px" style={{ borderRadius: "var(--radius)" }} />)}
          </div>
        ) : filteredCrewCerts.length === 0 ? (
          <EmptyState
            icon={Shield}
            heading={certFilter === "expiring" ? t("No expiring credentials") : certFilter === "expired" ? t("No expired credentials") : t("No credentials found")}
            message={certFilter === "expired" ? t("All crew credentials are current") : t("Your crew certs are up to date")}
            t={t}
          />
        ) : (
          <div className="foreman-team-cert-list">
            {filteredCrewCerts.map(member => (
              <PremiumCard variant="info" key={member.id} className="foreman-team-cert-member">
                <div className="foreman-team-cert-member-header">
                  <div className="foreman-team-cert-member-name">{member.name}</div>
                  <div className="foreman-team-cert-summary">
                    {member.activeCount > 0 && <span className="foreman-team-cert-count foreman-team-cert-count--active">{t("{n} active").replace("{n}", member.activeCount)}</span>}
                    {member.expiringCount > 0 && <span className="foreman-team-cert-count foreman-team-cert-count--expiring">{t("{n} expiring").replace("{n}", member.expiringCount)}</span>}
                    {member.expiredCount > 0 && <span className="foreman-team-cert-count foreman-team-cert-count--expired">{t("{n} expired").replace("{n}", member.expiredCount)}</span>}
                  </div>
                </div>
                {member.certs.map(cert => (
                  <CredentialCard
                    key={cert.id}
                    certName={cert.cert_type}
                    issuedDate={cert.issue_date}
                    expiryDate={cert.expiry_date}
                    issuingOrg={cert.issuing_org}
                    status={cert.computedStatus}
                    t={t}
                  />
                ))}
              </PremiumCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
