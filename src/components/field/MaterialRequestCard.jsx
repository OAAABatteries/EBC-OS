// MaterialRequestCard — shared cross-portal material request card (COMP-11)
// Composes FieldCard + StatusBadge + FieldButton. Zero hex literals.
// Props: { title, status, materialName, quantity, unit, submittedBy, timestamp, actions, className, t }
// actions: array of { label, variant, onClick, loading? } — or null/undefined for read-only view

import { FieldCard } from './FieldCard';
import { StatusBadge } from './StatusBadge';
import { FieldButton } from './FieldButton';

export function MaterialRequestCard({
  title,
  status,
  materialName,
  quantity,
  unit,
  submittedBy,
  timestamp,
  actions,
  className,
  t,
}) {
  return (
    <FieldCard className={className}>
      {/* Header: title + status badge */}
      <div className="mr-card-header">
        <span className="mr-card-title">{title}</span>
        <StatusBadge status={status} t={t} />
      </div>

      {/* Body: material details */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-base)', color: 'var(--text)' }}>
          {materialName}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          <span className="mr-card-qty">{quantity}</span>
          <span className="mr-card-unit">{unit}</span>
        </div>
      </div>

      {/* Footer: meta info */}
      <div>
        {submittedBy && <span className="mr-card-meta">{submittedBy}</span>}
        {submittedBy && timestamp && <span className="mr-card-meta-muted"> · </span>}
        {timestamp && <span className="mr-card-meta-muted">{timestamp}</span>}
      </div>

      {/* Actions: approve/deny buttons */}
      {actions && actions.length > 0 && (
        <div className="mr-card-actions">
          {actions.map((action, i) => (
            <FieldButton
              key={i}
              variant={action.variant || 'ghost'}
              onClick={action.onClick}
              loading={action.loading}
              t={t}
            >
              {t ? t(action.label) : action.label}
            </FieldButton>
          ))}
        </div>
      )}
    </FieldCard>
  );
}
