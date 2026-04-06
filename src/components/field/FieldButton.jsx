// FieldButton — touch-optimized button with loading state and three variants
// Extends existing .btn / .btn-primary / .btn-ghost / .btn-danger CSS classes
// Zero hex literals. Direct Lucide import (avoids circular dependency with LoadingSpinner).
import { Loader2 } from 'lucide-react';

const VARIANT_CLASS_MAP = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  warning: 'btn-warning',
  outline: 'btn-outline',
};

export function FieldButton({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  className,
  t,
  ...props
}) {
  const variantClass = VARIANT_CLASS_MAP[variant] ?? 'btn-primary';
  const isDisabled = disabled || loading;
  const ariaLabel = loading
    ? (t ? t('Loading, please wait') : 'Loading, please wait')
    : undefined;

  return (
    <button
      className={`btn ${variantClass} touch-target focus-visible${className ? ` ${className}` : ''}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      style={
        isDisabled
          ? { opacity: loading ? 0.7 : 0.45, pointerEvents: 'none' }
          : undefined
      }
      {...props}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}
