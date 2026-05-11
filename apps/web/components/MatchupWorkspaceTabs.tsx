import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLanguage } from '../contexts/LanguageContext';

type MatchupWorkspaceTab = 'library' | 'collections' | 'discover';

interface MatchupWorkspaceTabsProps {
  activeTab: MatchupWorkspaceTab;
}

const tabs: Array<{ id: MatchupWorkspaceTab; href: string; labelKey: any }> = [
  { id: 'library', href: '/matchups', labelKey: 'matchups.myLibrary' },
  { id: 'collections', href: '/matchups?tab=collections', labelKey: 'matchups.collections' },
  { id: 'discover', href: '/matchups/marketplace', labelKey: 'matchups.discover' },
];

export const MatchupWorkspaceTabs: React.FC<MatchupWorkspaceTabsProps> = ({ activeTab }) => {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2 rounded-lg p-2"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <Link key={tab.id} href={tab.href} shallow={tab.href.startsWith('/matchups?')}>
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
              style={{
                backgroundColor: isActive ? 'var(--color-accent-primary-bg)' : 'transparent',
                color: isActive ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
                border: isActive ? '1px solid var(--color-accent-primary-border)' : '1px solid transparent',
              }}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => {
                if (tab.id === 'library' && router.pathname === '/matchups') {
                  event.preventDefault();
                  router.push('/matchups', undefined, { shallow: true });
                }
              }}
            >
              {t(tab.labelKey)}
            </button>
          </Link>
        );
      })}
    </div>
  );
};
