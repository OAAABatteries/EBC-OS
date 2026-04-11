// LanguageToggle — globe-style EN/ES switch
// Single pill with a globe icon, current language label, and an inline target.
// Clicking toggles between "en" and "es".
//
// Props:
//   lang: "en" | "es"
//   onChange: (next) => void
//   compact?: boolean  — smaller footprint for phone-preview row 2

import { Globe } from "lucide-react";

export function LanguageToggle({ lang, onChange, compact = false }) {
  const isEn = lang === "en";
  const next = isEn ? "es" : "en";
  const size = compact ? 12 : 14;

  return (
    <button
      type="button"
      className="portal-lang-toggle"
      onClick={() => onChange(next)}
      aria-label={isEn ? "Switch to Spanish" : "Cambiar a Inglés"}
      title={isEn ? "Español" : "English"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--bg2)",
        color: "var(--text2)",
        fontFamily: "var(--font-body, inherit)",
        fontSize: compact ? 10 : 12,
        fontWeight: 600,
        letterSpacing: 0.4,
        lineHeight: 1,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Globe size={size} aria-hidden="true" style={{ opacity: 0.85 }} />
      <span style={{ color: "var(--text)" }}>{isEn ? "EN" : "ES"}</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span style={{ opacity: 0.6 }}>{isEn ? "ES" : "EN"}</span>
    </button>
  );
}
