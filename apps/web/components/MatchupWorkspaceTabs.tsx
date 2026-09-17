import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

interface MatchupWorkspaceTabsProps {
  activeTab: 'library' | 'discover';
}

export function MatchupWorkspaceTabs({ activeTab }: MatchupWorkspaceTabsProps) {
  const { t } = useLanguage();

  return (
    <nav className="matchup-workspace-tabs" aria-label={t('matchups.title')}>
      <Link
        href="/matchups/marketplace"
        aria-current={activeTab === 'discover' ? 'page' : undefined}
      >
        {t('matchups.discoveryTab')}
      </Link>
      <Link
        href="/matchups"
        aria-current={activeTab === 'library' ? 'page' : undefined}
      >
        {t('matchups.libraryTab')}
      </Link>
    </nav>
  );
}
