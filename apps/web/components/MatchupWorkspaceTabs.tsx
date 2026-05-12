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
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl p-2 shadow-lg"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 18px 45px rgba(0,0,0,0.18)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <Link key={tab.id} href={tab.href} shallow={tab.href.startsWith('/matchups?')}>
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:translate-y-[-1px]"
              style={{
                background: isActive ? 'var(--btn-gradient)' : 'transparent',
                color: isActive ? 'var(--btn-gradient-text)' : 'var(--color-text-secondary)',
                border: isActive ? '1px solid rgba(200,170,110,0.42)' : '1px solid transparent',
                boxShadow: isActive ? '0 10px 24px rgba(200,170,110,0.16)' : 'none',
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
