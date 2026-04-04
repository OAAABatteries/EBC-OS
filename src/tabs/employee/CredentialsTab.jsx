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
  return (
    <div className="emp-content">
      <EmptyState icon={Shield} heading={t("No credentials on file")} action={<FieldButton variant="primary" t={t}>{t("Add Credential")}</FieldButton>} t={t} />
    </div>
  );
}
