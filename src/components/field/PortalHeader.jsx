// PortalHeader — COMP-04
// Three-variant portal header with glass background and optional project selector sub-strip.
// Variants: foreman | employee | driver
// Extends existing .header and .logo CSS classes from src/styles.js

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
}) {
  return (
    <>
      <header className={`header ${className || ''}`.trim()}>
        <img
          src="/ebc-eagle-white.png"
          alt="EBC"
          className="portal-header-logo"
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
          {variant === 'foreman' && settingsAction}
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
    </>
  );
}
