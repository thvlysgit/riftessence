import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiPlus,
  FiSearch,
  FiShare2,
} from 'react-icons/fi';
import SEOHead from '@components/SEOHead';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { MatchupWorkspaceTabs } from '@components/MatchupWorkspaceTabs';
import {
  MatchupGuideTile,
  type MatchupGuideSummary,
} from '@components/MatchupGuideTile';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const ROLES = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'];
const DIFFICULTIES = [
  'ALL',
  'FREE_WIN',
  'VERY_FAVORABLE',
  'FAVORABLE',
  'SKILL_MATCHUP',
  'HARD',
  'VERY_HARD',
  'FREE_LOSE',
];

interface CollectionItem {
  id: string;
  matchupId: string;
  matchup: MatchupGuideSummary & { user?: { username: string } };
}

interface MatchupCollection {
  id: string;
  champion?: string | null;
  title: string;
  description?: string | null;
  isPublic: boolean;
  authorUsername?: string;
  itemCount: number;
  isOwned: boolean;
  isSaved: boolean;
  items?: CollectionItem[];
}

async function apiRequest(path: string, method = 'GET', body?: object) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeader(),
    } as Record<string, string>,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

async function fetchAllGuides(): Promise<MatchupGuideSummary[]> {
  const guides: MatchupGuideSummary[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await apiRequest(`/api/matchups?limit=100&offset=${offset}`);
    guides.push(...(page.matchups || []));
    hasMore = Boolean(page.hasMore);
    offset += 100;
  }
  return guides;
}

async function fetchAllCollections(): Promise<MatchupCollection[]> {
  const collections: MatchupCollection[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await apiRequest(
      `/api/matchup-collections?limit=100&offset=${offset}`,
    );
    collections.push(...(page.collections || []));
    hasMore = Boolean(page.hasMore);
    offset += 100;
  }
  return collections;
}

function collectionGuide(item: CollectionItem): MatchupGuideSummary {
  return { ...item.matchup, authorUsername: item.matchup.user?.username };
}

export default function MatchupsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useGlobalUI();
  const [guides, setGuides] = useState<MatchupGuideSummary[]>([]);
  const [collections, setCollections] = useState<MatchupCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [difficulty, setDifficulty] = useState('ALL');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [dragOverCollection, setDragOverCollection] = useState<string | null>(
    null,
  );
  const [organizeGuide, setOrganizeGuide] =
    useState<MatchupGuideSummary | null>(null);
  const [organizeDestination, setOrganizeDestination] = useState('new');
  const [organizePartner, setOrganizePartner] = useState('');
  const [organizeTitle, setOrganizeTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const refresh = useCallback(async () => {
    const [nextGuides, nextCollections] = await Promise.all([
      fetchAllGuides(),
      fetchAllCollections(),
    ]);
    setGuides(nextGuides);
    setCollections(nextCollections);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void router.replace('/login');
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([fetchAllGuides(), fetchAllCollections()])
      .then(([nextGuides, nextCollections]) => {
        if (alive) {
          setGuides(nextGuides);
          setCollections(nextCollections);
          setCollapsed(
            new Set(
              nextCollections.slice(1).map((collection) => collection.id),
            ),
          );
        }
      })
      .catch(() => {
        if (alive) showToast(t('common.error'), 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authLoading, user?.id, router, showToast, t]);

  useEffect(() => {
    if (!organizeGuide) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOrganizeGuide(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [organizeGuide]);

  const run = async (
    operation: () => Promise<unknown>,
    success?: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await operation();
      await refresh();
      if (success) showToast(success, 'success');
      return true;
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('common.error'),
        'error',
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const ownedCollections = collections.filter(
    (collection) => collection.isOwned,
  );
  const groupedIds = new Set(
    ownedCollections.flatMap((collection) =>
      (collection.items || []).map((item) => item.matchupId),
    ),
  );
  const query = search.trim().toLowerCase();
  const matches = (guide: MatchupGuideSummary) =>
    (role === 'ALL' || guide.role === role) &&
    (difficulty === 'ALL' || guide.difficulty === difficulty) &&
    (!query ||
      [
        guide.title,
        guide.myChampion,
        guide.enemyChampion,
        guide.authorUsername,
      ].some((value) => value?.toLowerCase().includes(query)));
  const ungrouped = guides.filter(
    (guide) => !groupedIds.has(guide.id) && matches(guide),
  );
  const visibleCollections = collections.filter((collection) =>
    !query && role === 'ALL' && difficulty === 'ALL'
      ? true
      : (query &&
          role === 'ALL' &&
          difficulty === 'ALL' &&
          collection.title.toLowerCase().includes(query)) ||
        (collection.items || []).some((item) => matches(collectionGuide(item))),
  );
  const guideToCollection = useMemo(() => {
    const map = new Map<string, string>();
    ownedCollections.forEach((collection) =>
      (collection.items || []).forEach((item) =>
        map.set(item.matchupId, collection.id),
      ),
    );
    return map;
  }, [collections]);
  const guideById = useMemo(
    () => new Map(guides.map((guide) => [guide.id, guide])),
    [guides],
  );

  const moveGuide = async (
    guideId: string,
    collectionId: string,
  ): Promise<boolean> => {
    if (busy) return false;
    if (guideToCollection.get(guideId) === collectionId) return true;
    return run(
      () =>
        apiRequest(`/api/matchup-collections/${collectionId}/items`, 'POST', {
          matchupId: guideId,
        }),
      t('matchups.addedToCollection'),
    );
  };

  const groupGuides = async (
    sourceId: string,
    targetId: string,
    title?: string,
  ) => {
    if (
      busy ||
      sourceId === targetId ||
      !guides.some((guide) => guide.id === sourceId) ||
      !guides.some((guide) => guide.id === targetId)
    )
      return;
    setBusy(true);
    try {
      const data = await apiRequest('/api/matchup-collections/group', 'POST', {
        matchupIds: [targetId, sourceId],
        title,
      });
      await refresh();
      setCollapsed((previous) => {
        const next = new Set(previous);
        next.delete(data.collection.id);
        return next;
      });
      setOrganizeGuide(null);
      showToast(t('matchups.collectionCreated'), 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('common.error'),
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDropOnCard = (sourceId: string, targetId: string) => {
    const destination = guideToCollection.get(targetId);
    if (destination) void moveGuide(sourceId, destination);
    else void groupGuides(sourceId, targetId);
  };

  const openOrganize = (guide: MatchupGuideSummary) => {
    setOrganizeGuide(guide);
    setOrganizeDestination(ownedCollections[0]?.id || 'new');
    setOrganizePartner(
      guides.find((candidate) => candidate.id !== guide.id)?.id || '',
    );
    setOrganizeTitle('');
  };

  const deleteGuide = async (guide: MatchupGuideSummary) => {
    const approved = await confirm({
      title: guide.isOwned
        ? t('matchups.delete')
        : t('matchups.removeFromLibrary'),
      message: guide.isOwned
        ? t('matchups.confirmDelete')
        : t('matchups.confirmRemoveSaved'),
      confirmText: guide.isOwned
        ? t('common.delete')
        : t('matchups.removeFromLibrary'),
      cancelText: t('common.cancel'),
    });
    if (approved)
      await run(() =>
        apiRequest(
          `/api/matchups/${guide.id}${guide.isOwned ? '' : '/saved'}`,
          'DELETE',
        ),
      );
  };

  const renderGuide = (
    guide: MatchupGuideSummary,
    item?: CollectionItem,
    collection?: MatchupCollection,
  ) => {
    const libraryGuide = guideById.get(guide.id);
    const displayGuide = { ...guide, ...libraryGuide };
    return (
      <MatchupGuideTile
        key={guide.id}
        guide={displayGuide}
        sharedInCollection={Boolean(
          collection?.isPublic && !displayGuide.isPublic,
        )}
        onOrganize={
          libraryGuide && collection?.isOwned !== false
            ? openOrganize
            : undefined
        }
        onDropGuide={
          collection?.isOwned === false ? undefined : handleDropOnCard
        }
        onEdit={
          displayGuide.isOwned ||
          displayGuide.authorId === user?.id ||
          displayGuide.userId === user?.id
            ? () => void router.push(`/matchups/create?id=${guide.id}`)
            : undefined
        }
        onDelete={
          displayGuide.isOwned
            ? () => void deleteGuide(displayGuide)
            : undefined
        }
        onRemoveSaved={
          displayGuide.isSaved && !displayGuide.isOwned
            ? () => void deleteGuide(displayGuide)
            : undefined
        }
        onUngroup={
          item && collection?.isOwned
            ? () =>
                void run(() =>
                  apiRequest(
                    `/api/matchup-collections/${collection.id}/items/${item.id}`,
                    'DELETE',
                  ),
                )
            : undefined
        }
      />
    );
  };

  if (authLoading || !user) return null;

  return (
    <>
      <SEOHead
        title="Matchup Library"
        description="Organize your saved League of Legends matchup guides into shareable collections."
        path="/matchups"
      />
      <main className="matchup-library-page">
        <div className="matchup-library-width">
          <header className="matchup-page-header">
            <h1>{t('matchups.title')}</h1>
            <Link className="matchup-primary-button" href="/matchups/create">
              <FiPlus aria-hidden="true" /> {t('matchups.createNew')}
            </Link>
          </header>
          <MatchupWorkspaceTabs activeTab="library" />
          <div className="matchup-library-intro">
            <div>
              <h2>{t('matchups.libraryHeading')}</h2>
              <p>{t('matchups.libraryDescription')}</p>
            </div>
            <button
              type="button"
              className="matchup-secondary-button"
              onClick={() => setShowCreate((value) => !value)}
            >
              <FiPlus aria-hidden="true" /> {t('matchups.createCollection')}
            </button>
          </div>

          {showCreate ? (
            <form
              className="matchup-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newCollectionTitle.trim()) return;
                void run(
                  () =>
                    apiRequest('/api/matchup-collections', 'POST', {
                      title: newCollectionTitle.trim(),
                      isPublic: false,
                    }),
                  t('matchups.collectionCreated'),
                ).then((ok) => {
                  if (ok) {
                    setNewCollectionTitle('');
                    setShowCreate(false);
                  }
                });
              }}
            >
              <label htmlFor="new-collection-title">
                {t('matchups.collectionTitle')}
              </label>
              <input
                id="new-collection-title"
                value={newCollectionTitle}
                maxLength={100}
                onChange={(event) => setNewCollectionTitle(event.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={busy || !newCollectionTitle.trim()}
              >
                {t('matchups.createCollection')}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </button>
            </form>
          ) : null}

          <div className="matchup-library-filters">
            <label className="matchup-search-filter">
              <FiSearch aria-hidden="true" />
              <span className="sr-only">{t('common.search')}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('matchups.searchLibrary')}
              />
            </label>
            <label>
              <span className="sr-only">{t('matchups.role')}</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {value === 'ALL' ? t('matchups.allRoles') : value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{t('matchups.difficulty')}</span>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                {DIFFICULTIES.map((value) => (
                  <option key={value} value={value}>
                    {value === 'ALL'
                      ? t('matchups.allDifficulties')
                      : t(`matchups.difficulty.${value.toLowerCase()}` as any)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="matchup-loading">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {visibleCollections.map((collection) => {
                const isCollapsed = collapsed.has(collection.id);
                const items = (collection.items || []).filter((item) =>
                  matches(collectionGuide(item)),
                );
                return (
                  <section
                    className={`matchup-collection${
                      dragOverCollection === collection.id
                        ? ' is-drop-target'
                        : ''
                    }`}
                    key={collection.id}
                    onDragOver={(event) => {
                      if (
                        !collection.isOwned ||
                        !event.dataTransfer.types.includes(
                          'application/x-rift-guide',
                        )
                      )
                        return;
                      event.preventDefault();
                      setDragOverCollection(collection.id);
                    }}
                    onDragLeave={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node | null,
                        )
                      )
                        setDragOverCollection(null);
                    }}
                    onDrop={(event) => {
                      if (!collection.isOwned) return;
                      event.preventDefault();
                      setDragOverCollection(null);
                      const id = event.dataTransfer.getData(
                        'application/x-rift-guide',
                      );
                      if (id) void moveGuide(id, collection.id);
                    }}
                  >
                    <div className="matchup-collection-header">
                      <button
                        type="button"
                        className="matchup-collection-toggle"
                        aria-expanded={!isCollapsed}
                        onClick={() =>
                          setCollapsed((previous) => {
                            const next = new Set(previous);
                            if (next.has(collection.id))
                              next.delete(collection.id);
                            else next.add(collection.id);
                            return next;
                          })
                        }
                      >
                        {isCollapsed ? (
                          <FiChevronRight aria-hidden="true" />
                        ) : (
                          <FiChevronDown aria-hidden="true" />
                        )}
                        <FiFolder aria-hidden="true" />
                        <strong>{collection.title}</strong>
                        <span>
                          {t('matchups.collectionItemCount', {
                            count: collection.itemCount,
                          })}
                        </span>
                        <span>
                          {collection.isPublic
                            ? t('matchups.public')
                            : t('matchups.private')}
                        </span>
                      </button>
                      <div className="matchup-collection-tools">
                        {collection.isOwned ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void run(
                                  () =>
                                    apiRequest(
                                      `/api/matchup-collections/${collection.id}`,
                                      'PUT',
                                      { isPublic: !collection.isPublic },
                                    ),
                                  !collection.isPublic
                                    ? t('matchups.collectionShared')
                                    : t('matchups.collectionPrivate'),
                                )
                              }
                            >
                              {collection.isPublic
                                ? t('matchups.makePrivate')
                                : t('matchups.shareCollection')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(collection.id);
                                setEditingTitle(collection.title);
                              }}
                            >
                              {t('matchups.rename')}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void confirm({
                                  title: t('matchups.deleteCollection'),
                                  message: t(
                                    'matchups.confirmDeleteCollection',
                                  ),
                                  confirmText: t('common.delete'),
                                  cancelText: t('common.cancel'),
                                }).then((approved) => {
                                  if (approved)
                                    void run(() =>
                                      apiRequest(
                                        `/api/matchup-collections/${collection.id}`,
                                        'DELETE',
                                      ),
                                    );
                                })
                              }
                            >
                              {t('matchups.delete')}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void run(() =>
                                apiRequest(
                                  `/api/matchup-collections/${collection.id}/saved`,
                                  'DELETE',
                                ),
                              )
                            }
                          >
                            {t('matchups.removeFromLibrary')}
                          </button>
                        )}
                        {collection.isPublic ? (
                          <Link href={`/matchups/collections/${collection.id}`}>
                            <FiShare2 aria-hidden="true" />{' '}
                            {t('matchups.viewShareLink')}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    {editingId === collection.id ? (
                      <form
                        className="matchup-inline-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!editingTitle.trim()) return;
                          void run(() =>
                            apiRequest(
                              `/api/matchup-collections/${collection.id}`,
                              'PUT',
                              { title: editingTitle.trim() },
                            ),
                          ).then((ok) => {
                            if (ok) setEditingId(null);
                          });
                        }}
                      >
                        <label htmlFor={`rename-${collection.id}`}>
                          {t('matchups.collectionTitle')}
                        </label>
                        <input
                          id={`rename-${collection.id}`}
                          value={editingTitle}
                          maxLength={100}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={busy || !editingTitle.trim()}
                        >
                          {t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          {t('common.cancel')}
                        </button>
                      </form>
                    ) : null}
                    {!isCollapsed ? (
                      <div className="matchup-collection-body">
                        {collection.description ? (
                          <p>{collection.description}</p>
                        ) : null}
                        {items.length ? (
                          <div className="matchup-guide-grid">
                            {items.map((item) =>
                              renderGuide(
                                collectionGuide(item),
                                item,
                                collection,
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="matchup-empty-collection">
                            {collection.isOwned
                              ? t('matchups.dropIntoCollection')
                              : t('matchups.noMatchups')}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}

              <section className="matchup-ungrouped">
                <div className="matchup-section-heading">
                  <h2>{t('matchups.ungrouped')}</h2>
                  <span>
                    {t('matchups.collectionItemCount', {
                      count: ungrouped.length,
                    })}
                  </span>
                </div>
                {ungrouped.length ? (
                  <div className="matchup-guide-grid">
                    {ungrouped.map((guide) => renderGuide(guide))}
                  </div>
                ) : (
                  <div className="matchup-empty-collection">
                    {guides.length ? (
                      t('matchups.noUngrouped')
                    ) : (
                      <>
                        <p>{t('matchups.noMatchups')}</p>
                        <Link href="/matchups/marketplace">
                          {t('matchups.discover')}
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {organizeGuide ? (
        <div
          className="matchup-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOrganizeGuide(null);
          }}
        >
          <form
            className="matchup-organize-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="organize-title"
            onSubmit={(event) => {
              event.preventDefault();
              if (organizeDestination === 'new') {
                if (organizePartner)
                  void groupGuides(
                    organizeGuide.id,
                    organizePartner,
                    organizeTitle.trim(),
                  );
              } else {
                void moveGuide(organizeGuide.id, organizeDestination).then(
                  (ok) => {
                    if (ok) setOrganizeGuide(null);
                  },
                );
              }
            }}
          >
            <h2 id="organize-title">
              {t('matchups.organize')} · {organizeGuide.myChampion} vs{' '}
              {organizeGuide.enemyChampion}
            </h2>
            <p>{t('matchups.organizeHint')}</p>
            <label>
              {t('matchups.destination')}
              <select
                value={organizeDestination}
                onChange={(event) => setOrganizeDestination(event.target.value)}
                autoFocus
              >
                <option value="new">{t('matchups.newWithGuide')}</option>
                {ownedCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </label>
            {organizeDestination === 'new' ? (
              <>
                <label>
                  {t('matchups.secondGuide')}
                  <select
                    value={organizePartner}
                    onChange={(event) => setOrganizePartner(event.target.value)}
                  >
                    {guides
                      .filter((guide) => guide.id !== organizeGuide.id)
                      .map((guide) => (
                        <option key={guide.id} value={guide.id}>
                          {guide.myChampion} vs {guide.enemyChampion}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {t('matchups.collectionTitle')}
                  <input
                    value={organizeTitle}
                    onChange={(event) => setOrganizeTitle(event.target.value)}
                    maxLength={100}
                    placeholder={t('matchups.optionalName')}
                  />
                </label>
              </>
            ) : null}
            <div className="matchup-dialog-actions">
              <button type="button" onClick={() => setOrganizeGuide(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={
                  busy || (organizeDestination === 'new' && !organizePartner)
                }
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
