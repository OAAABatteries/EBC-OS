// AlertCard — tappable alert for notification feeds
// Uses PremiumCard alert variant. Type determines color.

import { PremiumCard } from './PremiumCard';

export function AlertCard({ type = 'warning', message, timestamp, onTap, className, t }) {
  return (
    <PremiumCard
      variant="alert"
      alertType={type}
      className={`alert-card${className ? ` ${className}` : ''}`}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <div className="alert-card-content">
        <div className="alert-card-message">{t ? t(message) : message}</div>
        {timestamp && <div className="alert-card-time">{timestamp}</div>}
      </div>
    </PremiumCard>
  );
}
