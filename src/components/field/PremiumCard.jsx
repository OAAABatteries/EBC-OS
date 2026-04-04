// PremiumCard — three-variant card for Premium Construction design language
// Variants: hero (gradient + accent border), info (flat bg2), alert (accent-tinted + dot indicator)
// Does NOT replace FieldCard — exists alongside it per D-01.
// CSS classes live in src/styles.js PREMIUM CARDS section.

export function PremiumCard({
  variant = 'info',
  alertType = 'warning',
  children,
  className,
  ...props
}) {
  const baseClass = {
    hero: 'premium-card-hero',
    info: 'premium-card-info',
    alert: 'premium-card-alert',
  }[variant] ?? 'premium-card-info';

  // Alert variant appends type modifier for color differentiation
  const typeModifier = variant === 'alert' && alertType !== 'warning'
    ? ` premium-card-alert--${alertType}`
    : '';

  return (
    <div
      className={`${baseClass}${typeModifier}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </div>
  );
}
