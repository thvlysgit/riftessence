import { useLanguage } from '../contexts/LanguageContext';

export function parseEvidenceLinks(input: string): string[] {
  const links = input
    .split(/\r?\n/)
    .map((link) => link.trim())
    .filter(Boolean);
  if (links.length > 5)
    throw new Error('Add no more than five evidence links.');
  for (const link of links) {
    try {
      const url = new URL(link);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        link.length > 500
      )
        throw new Error();
    } catch {
      throw new Error(
        'Use public HTTPS links for screenshots, videos, or files.',
      );
    }
  }
  return links;
}

export function ReportEvidenceFields({
  contactDiscord,
  onContactChange,
  evidenceText,
  onEvidenceChange,
  disabled = false,
}: {
  contactDiscord: string;
  onContactChange: (value: string) => void;
  evidenceText: string;
  onEvidenceChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="report-evidence-fields">
      <label>
        <strong>{t('report.discordContact')}</strong>
        <span>{t('report.discordContactHint')}</span>
        <input
          type="text"
          value={contactDiscord}
          maxLength={64}
          onChange={(event) => onContactChange(event.target.value)}
          placeholder={t('report.discordPlaceholder')}
          disabled={disabled}
        />
      </label>
      <label>
        <strong>{t('report.evidenceLinks')}</strong>
        <span>{t('report.evidenceHint')}</span>
        <textarea
          value={evidenceText}
          onChange={(event) => onEvidenceChange(event.target.value)}
          rows={3}
          placeholder="https://..."
          disabled={disabled}
        />
      </label>
    </div>
  );
}
