// AsyncState — four-state wrapper (loading / error / empty / success)
// Delegates to LoadingSpinner, EmptyState, or inline error display.
// Priority: loading > error > empty > children
// Theme-aware via CSS custom properties. Zero hex literals.
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export function AsyncState({
  loading = false,
  empty = false,
  error = null,
  emptyMessage,
  emptyIcon,
  emptyAction,
  skeleton,
  children,
  t,
}) {
  if (loading) {
    return skeleton || (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <LoadingSpinner t={t} />
      </div>
    );
  }

  if (error) {
    const errorHeading = t ? t('Something went wrong.') : 'Something went wrong.';
    const errorBody =
      typeof error === 'string'
        ? error
        : (t
            ? t('Pull down to refresh, or contact support if this keeps happening.')
            : 'Pull down to refresh, or contact support if this keeps happening.');

    return (
      <div className="async-error">
        <AlertTriangle size={48} className="empty-state-icon" aria-hidden="true" />
        <div className="async-error-heading">{errorHeading}</div>
        <div className="async-error-body">{errorBody}</div>
      </div>
    );
  }

  if (empty) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={emptyMessage}
        action={emptyAction}
        t={t}
      />
    );
  }

  return children;
}
