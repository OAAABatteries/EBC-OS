// StatTile — dashboard metric tile (Hours, Tasks, Pending)
// Uses PremiumCard info variant as container.
// CSS classes in styles.js PREMIUM CARDS section.

import { PremiumCard } from './PremiumCard';

export function StatTile({ label, value, color, onTap, className, t }) {
  return (
    <PremiumCard
      variant="info"
      className={`stat-tile${className ? ` ${className}` : ''}`}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      style={color ? { '--stat-color': color } : undefined}
    >
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{t ? t(label) : label}</div>
    </PremiumCard>
  );
}
