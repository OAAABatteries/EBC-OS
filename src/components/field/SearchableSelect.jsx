// SearchableSelect — touch-target dropdown with filter-as-you-type and optional add-new action.
// Designed for foreman field use: 44px min-height, closes on outside click, shows current
// selection as a styled pill when collapsed, turns into a text input when opened.
//
// Props:
//   value           — current selected value (string/number)
//   onChange        — (newValue) => void
//   options         — [{ value, label, sublabel? }]
//   placeholder     — shown when nothing selected
//   searchPlaceholder — shown inside the search input when open
//   onAddNew        — optional (query: string) => void. When provided, an "+ Add …" row appears
//                     at the bottom of the results whenever the typed query isn't an exact match.
//   addNewLabel     — button text for the add row (defaults to "+ Add")
//   disabled, label, t, className

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";

export function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  onAddNew,
  addNewLabel = "Add",
  disabled = false,
  className,
  t,
}) {
  const tr = t || ((k) => k);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQ("");
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const displayText = selected ? selected.label : "";

  const qLc = q.trim().toLowerCase();
  const filtered = qLc
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(qLc) ||
          (o.sublabel || "").toLowerCase().includes(qLc)
      )
    : options;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setQ("");
  };

  const handleAddNew = () => {
    if (onAddNew && qLc) {
      onAddNew(q.trim());
      setOpen(false);
      setQ("");
    }
  };

  const showAddRow =
    onAddNew &&
    qLc &&
    !filtered.some((o) => o.label.toLowerCase() === qLc);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setQ("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div
      ref={wrapRef}
      className={`field-searchable-wrapper${className ? ` ${className}` : ""}`}
      style={{ position: "relative" }}
    >
      {label && <label className="form-label">{tr(label)}</label>}

      {!open ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className="form-input field-input focus-visible"
          onClick={openDropdown}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openDropdown();
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.45 : 1,
            minHeight: 44,
          }}
        >
          <span
            style={{
              color: selected ? "var(--text)" : "var(--text3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {displayText || tr(placeholder)}
          </span>
          <ChevronDown
            size={14}
            style={{ color: "var(--text3)", marginLeft: 8, flexShrink: 0 }}
          />
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          className="form-input field-input focus-visible"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr(searchPlaceholder)}
          style={{ minHeight: 44 }}
        />
      )}

      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 2px)",
            zIndex: 100,
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm, 6px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.28)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 && !showAddRow && (
            <div
              style={{
                padding: "var(--space-3)",
                color: "var(--text3)",
                fontSize: "var(--text-sm, 12px)",
                textAlign: "center",
              }}
            >
              {tr("No matches")}
            </div>
          )}
          {filtered.map((o) => (
            <div
              key={String(o.value)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(o.value);
              }}
              style={{
                padding: "var(--space-2) var(--space-3)",
                cursor: "pointer",
                fontSize: "var(--text-sm, 13px)",
                color: "var(--text)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-2)",
                minHeight: 44,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg3)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {o.label}
              </span>
              {o.sublabel && (
                <span
                  style={{
                    color: "var(--text3)",
                    fontSize: "var(--text-xs, 11px)",
                    flexShrink: 0,
                  }}
                >
                  {o.sublabel}
                </span>
              )}
            </div>
          ))}
          {showAddRow && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              style={{
                padding: "var(--space-2) var(--space-3)",
                cursor: "pointer",
                fontSize: "var(--text-sm, 13px)",
                color: "var(--accent, #3b82f6)",
                fontWeight: "var(--weight-bold)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                minHeight: 44,
                borderTop: "1px solid var(--border)",
                background: "var(--bg3)",
              }}
            >
              <Plus size={14} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tr(addNewLabel)}: “{q.trim()}”
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
