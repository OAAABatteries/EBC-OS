// PortalHeader — COMP-04
// Final form (Session 2):
//   Row 1: [eagle + EBC wordmark in proposal/head font] ...... [userName]
//   Row 2 (right-aligned, directly under userName): [language toggle]
//   Optional foreman title sits centered below row 2.
// No logout button — logout lives inside the settings screen only.
//
// PHONE-PREVIEW MODE (?preview=<role>): the notch sits at the top-center of
// the parent iframe. The header shifts into a two-row layout that clears the
// notch — brand hugs top-left, user hugs top-right, language toggle and
// settings action drop to row 2.
//
// Variants: foreman | employee | driver

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Detect preview-iframe mode once at module load + capture device context.
// Parent frame passes: preview=<role>&device=<id>&orient=<o>&sb=<n>&notchSide=<side>
// Used to decide whether to reserve a center gap for a top notch (iPhone
// portrait) vs. a clean top bar (iPad/Galaxy/phone landscape with side notch).
const previewContext = (() => {
  try {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("preview");
    if (r !== "employee" && r !== "foreman" && r !== "driver") return null;
    return {
      role: r,
      device: sp.get("device") || "iphone-14-pro",
      orient: sp.get("orient") === "landscape" ? "landscape" : "portrait",
      sb: Math.max(0, parseInt(sp.get("sb") || "0", 10) || 0),
      notchSide: sp.get("notchSide") || "none",
    };
  } catch { return null; }
})();
const isPhonePreview = !!previewContext;
const hasTopNotch = previewContext?.notchSide === "top";

// Shared EBC brand mark — uses the ONLY truly-transparent logo asset in
// /public/ (ebc-eagle-white.png), tinted per-theme via CSS mask-image so a
// single source file works across all 8 themes (EBC=white, Daylight=dark,
// Matrix=green, Cyberpunk=cyan, etc). Color comes from --logo-tint set per
// theme in constants.js. The source PNG is a white eagle on true alpha
// transparency — the mask takes the opaque pixels and recolors them.
//
// The mark scales RESPONSIVELY to the iframe/viewport width so it feels
// proportional on phone (390px) through iPad landscape (1194px).
function EbcWordmark({ size = "normal" }) {
  // Track iframe viewport width for responsive sizing. In preview mode this
  // component lives inside the field-portal iframe, so window.innerWidth
  // reflects the device's native viewport (390 / 800 / 834 / 1194 / 1280).
  const [vw, setVw] = useState(() => typeof window !== "undefined" ? window.innerWidth : 390);
  useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Eagle is 512×512 (square). Height brackets tuned so the mark has visible
  // weight on phone headers without dominating the row:
  //  ≤ 480:  28px (phone portrait)
  //  ≤ 900:  34px (phone landscape / small tablet)
  //  > 900:  40px (tablet portrait / landscape)
  const h = vw <= 480 ? 28 : vw <= 900 ? 34 : 40;
  const w = h; // Square source

  return (
    <div
      className="portal-header-wordmark"
      style={{
        display: "flex",
        alignItems: "center",
        flex: "0 0 auto",
        minWidth: 0,
      }}
    >
      {/* mask-image technique: the PNG's alpha channel defines visibility,
          background-color provides the color. Theme switching via CSS var
          means no JS, no extra files, and perfect crispness at any size. */}
      <div
        role="img"
        aria-label="Eagles Brothers Constructors"
        className="flex-shrink-0" style={{ width: w,
          height: h,
          backgroundColor: "var(--logo-tint, #ffffff)",
          WebkitMaskImage: "url(/ebc-eagle-white.png)",
          maskImage: "url(/ebc-eagle-white.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain" }}
      />
    </div>
  );
}

export function PortalHeader({
  variant = 'employee',
  title,
  userName,
  languageToggle,
  settingsAction,
  projectSelector,
  className,
  t,
  network,
  theme = null,
  // NOTE: logoutAction intentionally omitted from the header.
  // Logout lives in the settings screen only.
}) {
  // ── PHONE-PREVIEW LAYOUT ──
  if (isPhonePreview) {
    return (
      <>
        <header
          className={`header portal-header-accent-border portal-header--preview ${className || ''}`.trim()}
          style={{
            display: 'block',
            padding: '6px 10px 6px',
            minHeight: 0,
            height: 'auto',
          }}
        >
          {/* Row 1 — brand (top-left) | [notch gap if top-notch] | user (top-right)
              • Top-notch (iPhone portrait): center gap reserved for the island
              • No top-notch (iPad / landscape / Galaxy): no gap, brand + user
                sit side-by-side with the portal header starting cleanly below
                the thin status bar. */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: hasTopNotch ? 4 : 12,
          }}>
            {/* LEFT — eagle + wordmark, hugging the top-left corner */}
            <div style={{ paddingTop: 2, maxWidth: hasTopNotch ? 128 : 180, minWidth: 0 }}>
              <EbcWordmark size="small" />
            </div>
            {/* Reserved notch gap — ONLY when the host frame has a top notch */}
            {hasTopNotch && <div className="flex-shrink-0" style={{ width: 124 }} aria-hidden />}
            {/* RIGHT — user name + language toggle stacked */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 3,
              flex: '0 0 auto',
              minWidth: 0,
              maxWidth: hasTopNotch ? 128 : 200,
              paddingTop: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Pending sync count badge */}
                {network && network.pendingCount > 0 && network.online && (
                  <span className="fw-semi" style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 10, color: 'var(--amber)',
                    background: 'var(--amber-dim)', border: '1px solid var(--amber-border-subtle)',
                    borderRadius: 'var(--radius-pill)', padding: '2px 6px', lineHeight: 1 }}>
                    <span className="flex-shrink-0" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)' }} />
                    {network.pendingCount}
                  </span>
                )}
                {userName && (
                  <span style={{
                    fontSize: 11,
                    color: 'var(--text2)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: hasTopNotch ? 120 : 192,
                  }}>
                    {userName}
                  </span>
                )}
              </div>
              {languageToggle}
              {variant === 'foreman' && settingsAction}
            </div>
          </div>

          {/* Foreman center title falls into a third row */}
          {variant === 'foreman' && title && (
            <div style={{
              textAlign: 'center',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text)',
              marginTop: 4,
            }}>
              {title}
            </div>
          )}
        </header>

        {projectSelector && (
          <div style={{
            position: 'sticky',
            // Slide down to clear the status-bar-padded header. Without this,
            // a tall iPhone status bar (54px) pushes the header taller than
            // the hardcoded 54 offset and the selector overlaps the header.
            top: 54 + (previewContext?.sb || 0),
            zIndex: 99,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            padding: '0 var(--space-4)',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
          }}>
            {projectSelector}
          </div>
        )}

        {network && !network.online && (
          <div className="network-banner network-banner--offline">
            <span className="offline-pulse-dot" />
            <WifiOff size={14} />
            <span><strong>{t ? t("Offline Mode") : "Offline Mode"}</strong> — {t ? t("your work is saved locally") : "your work is saved locally"}</span>
            {network.pendingCount > 0 && (
              <span className="fs-tab ml-auto" style={{ opacity: 0.9 }}>
                {network.pendingCount} {t ? t("changes will sync when connected") : "changes will sync when connected"}
              </span>
            )}
          </div>
        )}
        {network && network.wasOffline && network.online && (
          <div className="network-banner network-banner--reconnecting">
            <span className="fs-secondary">&#10003;</span>
            <span><strong>{t ? t("Back online") : "Back online"}</strong> — {network.pendingCount > 0 ? `${t ? t("syncing") : "syncing"} ${network.pendingCount} ${t ? t("changes") : "changes"}` : (t ? t("all changes synced") : "all changes synced")}</span>
          </div>
        )}
      </>
    );
  }

  // ── REAL-DEVICE LAYOUT ──
  // Header grows from 54px → auto to fit a two-row right column
  // (userName on row 1, language toggle on row 2).
  return (
    <>
      <header
        className={`header portal-header-accent-border ${className || ''}`.trim()}
        style={{
          alignItems: 'center',
          height: 'auto',
          minHeight: 54,
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        {/* LEFT — eagle + wordmark */}
        <EbcWordmark size="normal" />

        {/* CENTER — foreman title (optional) */}
        {variant === 'foreman' && title && (
          <span
            className="flex-1" style={{ textAlign: 'center',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text)' }}
          >
            {title}
          </span>
        )}

        {/* RIGHT — user row 1, language toggle row 2 (directly under user) */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Pending sync count badge */}
            {network && network.pendingCount > 0 && network.online && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semi)',
                  color: 'var(--amber)',
                  background: 'var(--amber-dim)',
                  border: '1px solid var(--amber-border-subtle)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px 8px',
                  lineHeight: 1,
                }}
                title={`${network.pendingCount} change${network.pendingCount > 1 ? 's' : ''} waiting to sync`}
              >
                <span className="flex-shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
                {network.pendingCount}
              </span>
            )}
            {userName && (
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName}
              </span>
            )}
            {variant === 'foreman' && settingsAction}
          </div>
          {languageToggle}
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
            <span className="fs-tab ml-auto" style={{ opacity: 0.9 }}>
              {network.pendingCount} {t ? t("changes will sync when connected") : "changes will sync when connected"}
            </span>
          )}
        </div>
      )}
      {network && network.wasOffline && network.online && (
        <div className="network-banner network-banner--reconnecting">
          <span className="fs-secondary">&#10003;</span>
          <span><strong>{t ? t("Back online") : "Back online"}</strong> — {network.pendingCount > 0 ? `${t ? t("syncing") : "syncing"} ${network.pendingCount} ${t ? t("changes") : "changes"}` : (t ? t("all changes synced") : "all changes synced")}</span>
        </div>
      )}
    </>
  );
}
