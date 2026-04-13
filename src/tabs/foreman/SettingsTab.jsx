import { THEMES } from "../../data/constants";

export function SettingsTab({
  activeForeman, setActiveForeman, theme, setTheme,
  lang, setLang, setForemanTab, handleLogout,
  handleNotificationToggle, getInitials, myProjects, t,
}) {
  return (
    <div className="settings-wrap">
      {/* Back button */}
      <button className="btn btn-ghost btn-sm frm-mb-12" onClick={() => setForemanTab("dashboard")}>&#9664; {t("Back")}</button>
      {/* Profile */}
      <div className="settings-section">
        <div className="settings-section-title">{t("Profile")}</div>
        <div className="settings-avatar">{getInitials(activeForeman.name)}</div>
        <div className="frm-text-center frm-mb-12">
          <div className="text-md font-semi">{activeForeman.name}</div>
          <div className="text-xs text-muted">{activeForeman.role} · {activeForeman.phone}</div>
          <div className="text-xs text-dim">{activeForeman.email}</div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">{t("Appearance")}</div>
        <div className="theme-card-grid">
          {Object.entries(THEMES).map(([key, th]) => (
            <div key={key} className={`theme-card${theme === key ? " active" : ""}`}
              onClick={() => setTheme(key)}>
              <div>{th.icon}</div>
              <div className="theme-card-label">{th.label}</div>
            </div>
          ))}
        </div>
        <div className="settings-row frm-mt-12">
          <span className="settings-label">{t("Language")}</span>
          <div className="lang-toggle">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-title">{t("Notifications")}</div>
        <div className="settings-row">
          <span className="settings-label">{t("Schedule changes")}</span>
          <div className={`settings-toggle${activeForeman.notifications?.schedule ? " on" : ""}`}
            onClick={() => handleNotificationToggle("schedule")} />
        </div>
        <div className="settings-row">
          <span className="settings-label">{t("Material updates")}</span>
          <div className={`settings-toggle${activeForeman.notifications?.materials ? " on" : ""}`}
            onClick={() => handleNotificationToggle("materials")} />
        </div>
        <div className="settings-row">
          <span className="settings-label">{t("Delivery updates")}</span>
          <div className={`settings-toggle${activeForeman.notifications?.deliveries ? " on" : ""}`}
            onClick={() => handleNotificationToggle("deliveries")} />
        </div>
      </div>

      {/* Preferences */}
      <div className="settings-section">
        <div className="settings-section-title">{t("Preferences")}</div>
        <div className="settings-row">
          <span className="settings-label">{t("Default Project")}</span>
          <select className="settings-select" style={{ width: "auto", maxWidth: 180 }}
            value={activeForeman.defaultProjectId || ""}
            onChange={e => setActiveForeman({ ...activeForeman, defaultProjectId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{t("None")}</option>
            {myProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Account */}
      <div className="settings-section">
        <div className="settings-section-title">{t("Account")}</div>
        <button className="settings-logout" onClick={handleLogout}>{t("Logout")}</button>
      </div>
    </div>
  );
}
