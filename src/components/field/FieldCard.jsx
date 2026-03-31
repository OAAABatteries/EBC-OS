// FieldCard — theme-aware card wrapper with default/glass variants
// Extends .card/.card-glass with .field-card for touch-safe hover (media-query gated in styles.js)

const VARIANT_CLASS = {
  default: 'card',
  glass: 'card-glass',
};

export function FieldCard({ variant = 'default', children, className, ...props }) {
  const baseClass = VARIANT_CLASS[variant] ?? VARIANT_CLASS.default;
  const composedClass = `${baseClass} field-card${className ? ` ${className}` : ''}`;

  return (
    <div className={composedClass} {...props}>
      {children}
    </div>
  );
}
