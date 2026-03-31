// FieldSelect — touch-target select with focus ring
// Enforces 44px min-height via .field-select (set in styles.js FIELD COMPONENTS section)

export function FieldSelect({ label, className, disabled, children, t, id, ...props }) {
  const selectId = id || `field-select-${label?.replace(/\s/g, '-').toLowerCase() || 'default'}`;

  return (
    <div className="field-select-wrapper">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {t ? t(label) : label}
        </label>
      )}
      <select
        id={selectId}
        className={`form-select field-select focus-visible${className ? ` ${className}` : ''}`}
        disabled={disabled}
        style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
