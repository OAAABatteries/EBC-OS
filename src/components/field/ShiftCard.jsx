// ShiftCard — shift display for schedule views
// Uses PremiumCard info variant. Status via StatusBadge. Pick Up via FieldButton.

import { PremiumCard } from './PremiumCard';
import { StatusBadge } from './StatusBadge';
import { FieldButton } from './FieldButton';
import { Clock, MapPin } from 'lucide-react';

export function ShiftCard({
  timeRange,
  project,
  location,
  status = 'scheduled',
  isAvailable = false,
  isOvertime = false,
  onPickUp,
  className,
  t,
}) {
  const isActive = status === 'active';

  return (
    <PremiumCard
      variant="info"
      className={`shift-card${isActive ? ' shift-card--active' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="shift-card-header">
        <div className="shift-card-time">
          <Clock size={14} aria-hidden="true" />
          <span>{timeRange}</span>
        </div>
        <div className="shift-card-badges">
          {isOvertime && <span className="shift-card-overtime">{t ? t('OVERTIME') : 'OVERTIME'}</span>}
          <StatusBadge status={status} t={t} />
        </div>
      </div>
      <div className="shift-card-body">
        <div className="shift-card-project">{project}</div>
        {location && (
          <div className="shift-card-location">
            <MapPin size={12} aria-hidden="true" />
            <span>{location}</span>
          </div>
        )}
      </div>
      {isAvailable && onPickUp && (
        <div className="shift-card-action">
          <FieldButton variant="primary" onClick={onPickUp} t={t}>
            {t ? t('Pick Up Shift') : 'Pick Up Shift'}
          </FieldButton>
        </div>
      )}
    </PremiumCard>
  );
}
