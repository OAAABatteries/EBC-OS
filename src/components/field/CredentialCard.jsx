// CredentialCard — credential/certification display for wallet views
// Uses PremiumCard info variant. Status determines visual treatment.

import { PremiumCard } from './PremiumCard';
import { StatusBadge } from './StatusBadge';
import { Shield } from 'lucide-react';

export function CredentialCard({
  certName,
  issuedDate,
  expiryDate,
  issuingOrg,
  status = 'active',
  onTap,
  className,
  t,
}) {
  return (
    <PremiumCard
      variant="info"
      className={`credential-card${className ? ` ${className}` : ''}`}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <div className="credential-card-header">
        <Shield size={16} aria-hidden="true" className="credential-card-icon" />
        <div className="credential-card-title">{certName}</div>
        <StatusBadge status={status} t={t} />
      </div>
      <div className="credential-card-body">
        {issuingOrg && <div className="credential-card-org">{issuingOrg}</div>}
        <div className="credential-card-dates">
          {issuedDate && <span>{t ? t('Issued') : 'Issued'}: {issuedDate}</span>}
          {expiryDate && <span>{t ? t('Expires') : 'Expires'}: {expiryDate}</span>}
        </div>
      </div>
    </PremiumCard>
  );
}
