import { useState, type FormEvent } from 'react';
import { FiFlag } from 'react-icons/fi';
import { useGlobalUI } from './GlobalUI';
import { useLanguage } from '../contexts/LanguageContext';
import { getAuthHeader } from '../utils/auth';
import {
  ReportEvidenceFields,
  parseEvidenceLinks,
} from './ReportEvidenceFields';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [contactDiscord, setContactDiscord] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useGlobalUI();
  const { t } = useLanguage();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (description.trim().length < 10)
      return setError(t('bug.pleaseDescribe'));
    try {
      const evidenceUrls = parseEvidenceLinks(evidenceText);
      setError('');
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/api/bug-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        credentials: 'include',
        body: JSON.stringify({
          description: description.trim(),
          pageUrl: window.location.href,
          evidenceUrls,
          contactDiscord: contactDiscord.trim(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || t('bug.submitError'));
      }
      showToast(t('bug.submitSuccess'), 'success');
      setDescription('');
      setEvidenceText('');
      setContactDiscord('');
      setIsOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('bug.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="bug-report-trigger"
        onClick={() => setIsOpen(true)}
        aria-label={t('bug.reportBug')}
      >
        <FiFlag aria-hidden="true" /> <span>{t('bug.reportBug')}</span>
      </button>
      {isOpen ? (
        <div
          className="report-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting)
              setIsOpen(false);
          }}
        >
          <form
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-report-title"
            onSubmit={handleSubmit}
          >
            <h2 id="bug-report-title">{t('bug.reportButton')}</h2>
            <p>{t('bug.description')}</p>
            <label>
              <strong>{t('report.details')}</strong>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('bug.descriptionPlaceholder')}
                rows={5}
                maxLength={2000}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </label>
            <ReportEvidenceFields
              contactDiscord={contactDiscord}
              onContactChange={setContactDiscord}
              evidenceText={evidenceText}
              onEvidenceChange={setEvidenceText}
              disabled={isSubmitting}
            />
            {error ? (
              <p className="report-form-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="report-modal-actions">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('bug.submitting') : t('common.submit')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
