import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiShare2 } from 'react-icons/fi';
import SEOHead from '@components/SEOHead';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { MatchupWorkspaceTabs } from '@components/MatchupWorkspaceTabs';
import {
  MatchupGuideTile,
  type MatchupGuideSummary,
} from '@components/MatchupGuideTile';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface CollectionDetail {
  id: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  isOwned: boolean;
  isSaved: boolean;
  authorUsername: string;
  items: Array<{
    id: string;
    matchup: MatchupGuideSummary & { user?: { username: string } };
  }>;
}

export default function MatchupCollectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useGlobalUI();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = typeof router.query.id === 'string' ? router.query.id : '';

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    fetch(`${API_URL}/api/matchup-collections/${encodeURIComponent(id)}`, {
      headers: getAuthHeader() as Record<string, string>,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Collection not found'
              : 'This collection is private or unavailable',
          );
        return response.json();
      })
      .then((data) => {
        if (alive) {
          setCollection(data.collection);
          setError('');
        }
      })
      .catch((cause) => {
        if (alive)
          setError(cause instanceof Error ? cause.message : t('common.error'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, user?.id, t]);

  const toggleSave = async () => {
    if (!user) {
      void router.push('/login');
      return;
    }
    if (!collection || busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        `${API_URL}/api/matchup-collections/${collection.id}/${
          collection.isSaved ? 'saved' : 'save'
        }`,
        {
          method: collection.isSaved ? 'DELETE' : 'POST',
          headers: getAuthHeader() as Record<string, string>,
        },
      );
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).error || t('common.error'),
        );
      setCollection({ ...collection, isSaved: !collection.isSaved });
      showToast(
        collection.isSaved
          ? t('matchups.collectionRemoved')
          : t('matchups.collectionSaved'),
        'success',
      );
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : t('common.error'),
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEOHead
        title={collection?.title || 'Matchup collection'}
        description={
          collection?.description || 'A shared collection of matchup guides.'
        }
        path={`/matchups/collections/${id}`}
      />
      <main className="matchup-collection-detail-page">
        <div className="matchup-library-width">
          <header className="matchup-page-header">
            <h1>{t('matchups.title')}</h1>
            <Link
              className="matchup-secondary-button"
              href="/matchups/marketplace"
            >
              <FiArrowLeft aria-hidden="true" /> {t('matchups.discover')}
            </Link>
          </header>
          <MatchupWorkspaceTabs activeTab="discover" />
          {loading ? (
            <div className="matchup-loading">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="matchup-empty-collection">{error}</div>
          ) : collection ? (
            <>
              <div className="matchup-detail-heading">
                <div>
                  <span>{t('matchups.sharedCollections')}</span>
                  <h2>{collection.title}</h2>
                  <p>
                    {collection.description ||
                      `${t('matchups.author')}: ${collection.authorUsername}`}
                  </p>
                </div>
                <div className="matchup-detail-actions">
                  {collection.isPublic ? (
                    <button
                      type="button"
                      className="matchup-secondary-button"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(window.location.href)
                          .then(() =>
                            showToast(t('matchups.linkCopied'), 'success'),
                          )
                          .catch(() => showToast(t('common.error'), 'error'))
                      }
                    >
                      <FiShare2 aria-hidden="true" /> {t('matchups.copyLink')}
                    </button>
                  ) : null}
                  {!collection.isOwned ? (
                    <button
                      type="button"
                      className="matchup-primary-button"
                      disabled={busy}
                      onClick={() => void toggleSave()}
                    >
                      {collection.isSaved
                        ? t('matchups.removeFromLibrary')
                        : t('matchups.saveCollection')}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="matchup-guide-grid">
                {collection.items.map((item) => (
                  <MatchupGuideTile
                    key={item.id}
                    guide={{
                      ...item.matchup,
                      authorUsername: item.matchup.user?.username,
                    }}
                    sharedInCollection={
                      collection.isPublic && !item.matchup.isPublic
                    }
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
