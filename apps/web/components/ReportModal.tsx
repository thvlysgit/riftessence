import { useState, type FormEvent } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ReportEvidenceFields,
  parseEvidenceLinks,
} from './ReportEvidenceFields';

export interface ReportModalProps {
  username: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (report: {
    reason: string;
    evidenceUrls: string[];
    contactDiscord: string;
  }) => Promise<void>;
}

export function ReportModal({
  username,
  open,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [contactDiscord, setContactDiscord] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return setError(t('report.reasonRequired'));
    try {
      const evidenceUrls = parseEvidenceLinks(evidenceText);
      setError('');
      setSubmitting(true);
      await onSubmit({
        reason: reason.trim(),
        evidenceUrls,
        contactDiscord: contactDiscord.trim(),
      });
      setReason('');
      setEvidenceText('');
      setContactDiscord('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="report-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-report-title"
        onSubmit={handleSubmit}
      >
        <h2 id="user-report-title">{t('report.reportUser', { username })}</h2>
        <label>
          <strong>{t('report.reasonLabel')}</strong>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t('report.detailsPlaceholder')}
            required
            disabled={submitting}
            autoFocus
          />
        </label>
        <ReportEvidenceFields
          contactDiscord={contactDiscord}
          onContactChange={setContactDiscord}
          evidenceText={evidenceText}
          onEvidenceChange={setEvidenceText}
          disabled={submitting}
        />
        {error ? (
          <p className="report-form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="report-modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? t('report.submitting') : t('report.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
