// LoadingSpinner — Lucide Loader2 spinner with amber CSS variable color
// Skeleton — shimmer placeholder block for async content
// Both are theme-aware via CSS custom properties. Zero hex literals.
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 20, className, t }) {
  const ariaLabel = t ? t('Loading') : 'Loading';
  return (
    <Loader2
      size={size}
      className={`animate-spin${className ? ` ${className}` : ''}`}
      style={{ color: 'var(--amber)' }}
      aria-label={ariaLabel}
      aria-hidden="false"
    />
  );
}

export function Skeleton({ width = '100%', height = '1em', className, style }) {
  return (
    <div
      className={`skeleton-shimmer${className ? ` ${className}` : ''}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
