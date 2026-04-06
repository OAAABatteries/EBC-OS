// PortalHeader — COMP-04
// Three-variant portal header with glass background and optional project selector sub-strip.
// Variants: foreman | employee | driver
// Extends existing .header and .logo CSS classes from src/styles.js

import { WifiOff } from "lucide-react";

export function PortalHeader({
  variant = 'employee',
  title,
  userName,
  logoutAction,
  languageToggle,
  settingsAction,
  projectSelector,
  className,
  t,
  network,
  theme = null,
}) {
  return (
    <>
      <header className={`header portal-header-accent-border ${className || ''}`.trim()}>
        <img
          src="/ebc-eagle-white.png"
          alt="EBC Eagle"
          className={`portal-header-logo${theme === 'daylight' ? ' portal-header-logo--dark' : ''}`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* Center slot — foreman variant only */}
        {variant === 'foreman' && title && (
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text)',
            }}
          >
            {title}
          </span>
        )}

        {/* Right slot — varies by variant */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          {variant === 'employee' && languageToggle}
          {userName && (
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text2)',
              }}
            >
              {userName}
            </span>
          )}
          {variant === 'foreman' && (
            <>
              {languageToggle}
              {settingsAction}
            </>
          )}
          {logoutAction}
        </div>
      </header>

      {/* Project selector sub-strip — optional, typically foreman-only */}
      {projectSelector && (
        <div
          style={{
            position: 'sticky',
            top: 54,
            zIndex: 99,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            padding: '0 var(--space-4)',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {projectSelector}
        </div>
      )}

      {/* Network status banner — offline confidence indicator */}
      {network && !network.online && (
        <div className="network-banner network-banner--offline">
          <span className="offline-pulse-dot" />
          <WifiOff size={14} />
          <span><strong>{t ? t("Offline Mode") : "Offline Mode"}</strong> — {t ? t("your work is saved locally") : "your work is saved locally"}</span>
          {network.pendingCount > 0 && (
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.9 }}>
              {network.pendingCount} {t ? t("changes will sync when connected") : "changes will sync when connected"}
            </span>
          )}
        </div>
      )}
      {network && network.wasOffline && network.online && (
        <div className="network-banner network-banner--reconnecting">
          <span style={{ fontSize: 14 }}>&#10003;</span>
          <span><strong>{t ? t("Back online") : "Back online"}</strong> — {network.pendingCount > 0 ? `${t ? t("syncing") : "syncing"} ${network.pendingCount} ${t ? t("changes") : "changes"}` : (t ? t("all changes synced") : "all changes synced")}</span>
        </div>
      )}
    </>
  );
}
