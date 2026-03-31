// StatusBadge — semantic status-to-badge-class mapper
// Extends existing .badge / .badge-* utility classes from src/styles.js
// Zero hex literals. All colors resolve from CSS custom properties.

const STATUS_CLASS_MAP = {
  approved: 'badge-green',
  pending: 'badge-amber',
  denied: 'badge-red',
  'in-transit': 'badge-blue',
  completed: 'badge-muted',
  project: 'badge-muted',
};

export function StatusBadge({ status, t, className }) {
  const variantClass = STATUS_CLASS_MAP[status] ?? 'badge-muted';
  const label = t ? t(status) : status;

  return (
    <span className={`badge ${variantClass}${className ? ` ${className}` : ''}`}>
      {label}
    </span>
  );
}
