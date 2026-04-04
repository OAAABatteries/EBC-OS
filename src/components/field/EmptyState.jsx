// EmptyState — centered empty state with icon, heading, body copy, and optional action
// Theme-aware via CSS custom properties. Zero hex literals.
// CSS classes live in src/styles.js FIELD COMPONENTS section.
import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, heading, message, action, className, t }) {
  const defaultHeading = t ? t('Nothing here yet') : 'Nothing here yet';
  const defaultMessage = t
    ? t('Check back later or contact your foreman.')
    : 'Check back later or contact your foreman.';

  return (
    <div className={`empty-state${className ? ` ${className}` : ''}`}>
      {Icon && <Icon size={40} className="empty-state-icon" aria-hidden="true" />}
      <div className="empty-state-heading">{heading || defaultHeading}</div>
      {(message || defaultMessage) && (
        <div className="empty-state-body">{message || defaultMessage}</div>
      )}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
