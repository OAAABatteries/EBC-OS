// FieldInput — touch-target input with error states and inputMode for mobile keyboards
// Enforces 44px min-height via .field-input (set in styles.js FIELD COMPONENTS section)

export function FieldInput({ label, error, errorMessage, className, inputMode, disabled, t, id, ...props }) {
  const inputId = id || `field-input-${label?.replace(/\s/g, '-').toLowerCase() || 'default'}`;

  return (
    <div className="field-input-wrapper">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {t ? t(label) : label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input field-input focus-visible${error ? ' field-input-error' : ''}${className ? ` ${className}` : ''}`}
        inputMode={inputMode}
        disabled={disabled}
        style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        {...props}
      />
      {error && errorMessage && (
        <div className="field-input-error-msg">
          {t ? t(errorMessage) : errorMessage}
        </div>
      )}
    </div>
  );
}
