import { useState, useCallback, useEffect, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { CredentialCard, EmptyState, FieldButton, FieldInput, FieldSelect, LoadingSpinner } from '../../components/field';
import { supabase } from '../../lib/supabase';

/**
 * CredentialsTab — Credential wallet with add-credential bottom sheet
 *
 * Props:
 *   activeEmp       — logged-in employee object
 *   t               — translation function
 *   lang            — 'en' | 'es'
 *   show            — toast notification function
 *   onBadgeUpdate   — callback(count) to update tab badge in shell
 */
export function CredentialsTab({ activeEmp, t, lang, show, onBadgeUpdate }) {
  const [credentials, setCredentials] = useState([]);
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsError, setCredsError] = useState(null);
  const [showAddCredSheet, setShowAddCredSheet] = useState(false);
  const [credForm, setCredForm] = useState({ certType: '', issueDate: '', expiryDate: '', issuingOrg: '', photo: null });
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credSubmitError, setCredSubmitError] = useState(null);

  const loadCredentials = useCallback(async () => {
    if (!activeEmp?.id) return;
    setCredsLoading(true);
    setCredsError(null);
    try {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('employee_id', activeEmp.id);
      if (error) throw error;
      setCredentials(data || []);
    } catch (err) {
      setCredsError(err.message);
    } finally {
      setCredsLoading(false);
    }
  }, [activeEmp?.id]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  function credStatus(expiryDate) {
    if (!expiryDate) return 'active';
    const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'active';
  }

  const sortedCredentials = useMemo(() => {
    const today = new Date();
    const msPerDay = 86400000;
    return [...credentials].sort((a, b) => {
      const daysA = a.expiry_date ? Math.ceil((new Date(a.expiry_date) - today) / msPerDay) : Infinity;
      const daysB = b.expiry_date ? Math.ceil((new Date(b.expiry_date) - today) / msPerDay) : Infinity;
      return daysA - daysB;
    });
  }, [credentials]);

  useEffect(() => {
    if (!onBadgeUpdate) return;
    const count = credentials.filter(c => {
      const status = credStatus(c.expiry_date);
      return status === 'expired' || status === 'expiring';
    }).length;
    onBadgeUpdate(count);
  }, [credentials, onBadgeUpdate]);

  const handleAddCredential = useCallback(async () => {
    if (!activeEmp?.id || !credForm.certType) return;
    setCredSubmitting(true);
    setCredSubmitError(null);
    try {
      let photoPath = null;
      if (credForm.photo) {
        const fileName = `certs/${activeEmp.id}/${Date.now()}_${credForm.photo.name}`;
        const { error: uploadErr } = await supabase.storage.from('certifications').upload(fileName, credForm.photo);
        if (!uploadErr) photoPath = fileName;
      }
      const { error } = await supabase
        .from('certifications')
        .insert({
          employee_id: activeEmp.id,
          cert_type: credForm.certType,
          issue_date: credForm.issueDate || null,
          expiry_date: credForm.expiryDate || null,
          issuing_org: credForm.issuingOrg || null,
          photo_path: photoPath,
        });
      if (error) throw error;
      setShowAddCredSheet(false);
      setCredForm({ certType: '', issueDate: '', expiryDate: '', issuingOrg: '', photo: null });
      loadCredentials();
      if (show) show(t('Add Credential') + ' — OK', 'ok');
    } catch (err) {
      setCredSubmitError(t('Could not submit your request. Try again.'));
    } finally {
      setCredSubmitting(false);
    }
  }, [activeEmp?.id, credForm, show, t, loadCredentials]);

  return (
    <div className="emp-content">
      <div className="home-alerts-header">
        <span className="section-label">{t('Credentials')}</span>
        <button className="view-all-link" onClick={() => setShowAddCredSheet(true)}>{t('Add Credential')}</button>
      </div>

      {credsLoading ? (
        <LoadingSpinner />
      ) : credsError ? (
        <EmptyState icon={Shield} heading={t('Could not load Credentials. Check your connection and try again.')}
          action={<FieldButton variant="primary" onClick={loadCredentials} t={t}>{t('Retry')}</FieldButton>} t={t} />
      ) : sortedCredentials.length === 0 ? (
        <EmptyState icon={Shield} heading={t('No credentials on file')}
          action={<FieldButton variant="primary" onClick={() => setShowAddCredSheet(true)} t={t}>{t('Add Credential')}</FieldButton>} t={t} />
      ) : (
        <div className="cred-list">
          {sortedCredentials.map(cert => (
            <CredentialCard key={cert.id}
              certName={cert.cert_type}
              issuedDate={cert.issue_date}
              expiryDate={cert.expiry_date}
              issuingOrg={cert.issuing_org}
              status={credStatus(cert.expiry_date)}
              onTap={() => {}}
              t={t} />
          ))}
        </div>
      )}

      {/* Add credential bottom sheet — CRED-02 */}
      {showAddCredSheet && (
        <div className="sheet-overlay" onClick={() => setShowAddCredSheet(false)} />
      )}
      <div className={`sheet-container${showAddCredSheet ? ' open' : ''}`}>
        <div className="sheet-header">
          <span className="text-lg font-bold">{t('Add Credential')}</span>
          <button className="view-all-link" onClick={() => setShowAddCredSheet(false)} aria-label="Close">&#10005;</button>
        </div>
        <div className="sheet-form">
          <FieldSelect label={t('Credential Type')} value={credForm.certType}
            onChange={(e) => setCredForm(f => ({ ...f, certType: e.target.value }))}
            options={[
              { value: 'OSHA 10', label: 'OSHA 10' },
              { value: 'OSHA 30', label: 'OSHA 30' },
              { value: 'CPR/First Aid', label: 'CPR/First Aid' },
              { value: 'Forklift', label: t('Forklift') },
              { value: 'Scaffold', label: t('Scaffold') },
              { value: 'Fall Protection', label: t('Fall Protection') },
              { value: 'Confined Space', label: t('Confined Space') },
              { value: 'Other', label: t('Other') },
            ]} t={t} />
          <FieldInput type="date" label={t('Issue Date')} value={credForm.issueDate}
            onChange={(e) => setCredForm(f => ({ ...f, issueDate: e.target.value }))} t={t} />
          <FieldInput type="date" label={t('Expiry Date')} value={credForm.expiryDate}
            onChange={(e) => setCredForm(f => ({ ...f, expiryDate: e.target.value }))} t={t} />
          <FieldInput label={t('Issuing Organization')} value={credForm.issuingOrg}
            onChange={(e) => setCredForm(f => ({ ...f, issuingOrg: e.target.value }))} t={t} />
          <div>
            <label className="text-sm font-bold" style={{ color: 'var(--text2)', display: 'block', marginBottom: 'var(--space-1)' }}>{t('Photo (optional)')}</label>
            <input type="file" accept="image/*" capture="environment"
              onChange={(e) => setCredForm(f => ({ ...f, photo: e.target.files?.[0] || null }))}
              style={{ color: 'var(--text)', fontSize: 'var(--text-base)' }} />
          </div>
          {credSubmitError && <div className="text-sm" style={{ color: 'var(--red)' }}>{credSubmitError}</div>}
          <FieldButton variant="primary" onClick={handleAddCredential} loading={credSubmitting} t={t}>
            {t('Submit Request')}
          </FieldButton>
        </div>
      </div>
    </div>
  );
}
