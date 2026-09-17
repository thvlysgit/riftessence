import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiArrowUpRight,
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiDroplet,
  FiFlag,
  FiGrid,
  FiHexagon,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiSearch,
  FiSettings,
  FiShield,
  FiTarget,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type ThemeName } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAuthHeader } from '../utils/auth';
import { getProfileIconUrl } from '../utils/championData';
import PrismaticEssenceIcon from '../src/components/PrismaticEssenceIcon';
import {
  USERNAME_DECORATION_STYLES,
  USERNAME_FONT_FAMILIES,
  USERNAME_HOVER_EFFECT_CLASSES,
} from '../utils/cosmeticStyles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
type SearchResult = {
  id: string;
  username: string;
  verified: boolean;
  profileIconId?: number;
};
type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

function SearchBox({
  mobile,
  query,
  onQueryChange,
  status,
  results,
  onNavigate,
  labels,
}: {
  mobile?: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  status: SearchStatus;
  results: SearchResult[];
  onNavigate: () => void;
  labels: { placeholder: string; searching: string; error: string; noUsers: string; verified: string };
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={`rn-search ${mobile ? 'rn-search-mobile' : 'rn-search-desktop'}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <label className="rn-search-field">
        <FiSearch aria-hidden="true" />
        <span className="sr-only">{labels.placeholder}</span>
        <input
          type="search"
          autoComplete="off"
          value={query}
          placeholder={labels.placeholder}
          onFocus={() => setFocused(true)}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      {focused && query.trim().length >= 2 ? (
        <div className="rn-panel rn-search-panel">
          {status !== 'ready' || results.length === 0 ? (
            <p className="rn-search-status" role="status">
              {status === 'loading' || status === 'idle' ? labels.searching : status === 'error' ? labels.error : labels.noUsers}
            </p>
          ) : null}
          {results.map((result) => (
            <Link
              href={`/profile/${encodeURIComponent(result.username)}`}
              key={result.id}
              className="rn-search-result"
              onClick={onNavigate}
            >
              {result.profileIconId ? (
                <img src={getProfileIconUrl(result.profileIconId)} alt="" width={32} height={32} />
              ) : <FiUser aria-hidden="true" />}
              <span>{result.username}</span>
              {result.verified ? <FiCheckCircle aria-label={labels.verified} /> : null}
              <FiArrowUpRight className="rn-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon: IconType;
  soon?: boolean;
};

function isActiveHref(asPath: string, href: string) {
  const path = asPath.split(/[?#]/)[0] || '/';
  return path === href || path.startsWith(`${href}/`);
}

function ThemeMark({ theme }: { theme: ThemeName }) {
  if (theme === 'ocean-depths') return <FiDroplet aria-hidden="true" />;
  const mark = 'url(#rift-navbar-mark)';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="rift-navbar-mark"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--color-accent-1)" />
          <stop offset="100%" stopColor="var(--color-accent-2)" />
        </linearGradient>
      </defs>
      {theme === 'arcane-pastel' ? (
        <>
          <path
            d="M12 2C12 2 8 4 8 8C8 10 9 11 10 11.5C9 12 8 13 8 15C8 17 10 19 12 22C14 19 16 17 16 15C16 13 15 12 14 11.5C15 11 16 10 16 8C16 4 12 2 12 2Z"
            fill={mark}
          />
          <circle
            cx="12"
            cy="8"
            r="1.5"
            fill="var(--color-bg-primary)"
            opacity="0.3"
          />
          <circle
            cx="12"
            cy="15"
            r="1.5"
            fill="var(--color-bg-primary)"
            opacity="0.3"
          />
        </>
      ) : theme === 'infernal-ember' ? (
        <>
          <path
            d="M12 2C12 2 8 6 8 10C8 13 10 15 12 15C12 15 11 12 13 10C15 8 16 6 16 10C16 14 14 16 12 22C12 22 18 18 18 12C18 6 12 2 12 2Z"
            fill={mark}
          />
          <path
            d="M12 8C12 8 10 10 10 12C10 13.5 11 14.5 12 14.5C12 14.5 13 12 12 8Z"
            fill="var(--color-bg-primary)"
            opacity="0.25"
          />
        </>
      ) : theme === 'nightshade' ? (
        <>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill={mark}
          />
          <circle cx="18" cy="6" r="1" fill="var(--color-accent-1)" />
          <circle cx="20" cy="9" r="0.8" fill="var(--color-accent-2)" />
          <circle cx="16" cy="4" r="0.6" fill="var(--color-accent-1)" />
        </>
      ) : theme === 'radiant-light' ? (
        <>
          <circle cx="12" cy="12" r="4" fill={mark} />
          <path
            d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93"
            stroke={mark}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M6.2 3L3 6.2L10.8 14L8 16.8L4.8 13.6L2 16.4L7.6 22L10.4 19.2L7.2 16L10 13.2L17.8 21L21 17.8L13.2 10L16 7.2L19.2 10.4L22 7.6L16.4 2L13.6 4.8L16.8 8L14 10.8L6.2 3Z"
          fill={mark}
        />
      )}
    </svg>
  );
}

function Destination({
  item,
  path,
  onNavigate,
  soonLabel,
}: {
  item: NavItem;
  path: string;
  onNavigate: () => void;
  soonLabel: string;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="rn-destination-icon" aria-hidden="true" />
      <span className="rn-destination-copy">
        <span>{item.label}</span>
        {item.description ? <small>{item.description}</small> : null}
      </span>
      {item.soon ? (
        <span className="rn-soon">{soonLabel}</span>
      ) : (
        <FiArrowUpRight className="rn-arrow" aria-hidden="true" />
      )}
    </>
  );
  // Arena stays discoverable without inviting users into an unfinished feature.
  return item.soon ? (
    <div className="rn-destination rn-unavailable" aria-disabled="true">
      {content}
    </div>
  ) : (
    <Link
      href={item.href}
      className="rn-destination"
      aria-current={isActiveHref(path, item.href) ? 'page' : undefined}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { currentTheme } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const fr = currentLanguage === 'fr';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [unreadCount, setUnreadCount] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const userId = user?.id;
  const closeMenus = () => {
    setOpenPanel(null);
    setMobileOpen(false);
  };
  const togglePanel = (name: string, button: HTMLButtonElement) => {
    lastTrigger.current = button;
    setOpenPanel((current) => (current === name ? null : name));
    if (name === 'account') setMobileOpen(false);
  };
  const groups = [
    {
      id: 'teams',
      label: t('navbar.teams'),
      items: [
        {
          href: '/lft',
          label: 'LFT',
          description: t('navbar.findTeam'),
          icon: FiUsers,
        },
        {
          href: '/teams/dashboard',
          label: t('navbar.teamsDashboard'),
          icon: FiGrid,
        },
        {
          href: '/teams/schedule',
          label: t('navbar.teamSchedule'),
          icon: FiCalendar,
        },
        {
          href: '/teams/scrims',
          label: t('navbar.scrimFinder'),
          icon: FiTarget,
        },
        { href: '/teams/drafts', label: t('navbar.draftRoom'), icon: FiFlag },
      ],
    },
    {
      id: 'communities',
      label: t('navbar.communities'),
      items: [
        {
          href: '/communities',
          label: t('navbar.communities'),
          description: t('navbar.communitiesHint'),
          icon: FiUsers,
        },
        {
          href: '/advertise',
          label: t('navbar.advertise'),
          description: t('navbar.advertiseHint'),
          icon: FiFlag,
        },
      ],
    },
    {
      id: 'learn',
      label: t('navbar.learn'),
      items: [
        {
          href: '/matchups',
          label: t('navbar.matchups'),
          description: t('navbar.matchupsHint'),
          icon: FiBookOpen,
        },
        {
          href: '/coaching',
          label: t('navbar.coaching'),
          description: t('navbar.coachingHint'),
          icon: FiMessageCircle,
        },
      ],
    },
    {
      id: 'games',
      label: t('navbar.games'),
      items: [
        {
          href: '/games',
          label: t('navbar.webGames'),
          description: t('navbar.webGamesHint'),
          icon: FiGrid,
        },
        { href: '/1v1', label: t('navbar.arena'), icon: FiTarget, soon: true },
        {
          href: '/leaderboards',
          label: t('navbar.leaderboards'),
          description: t('navbar.leaderboardsHint'),
          icon: FiAward,
        },
      ],
    },
  ];
  const accountItems: NavItem[] = [
    { href: '/profile', label: t('navbar.myProfile'), icon: FiUser },
    {
      href: '/purse',
      label: t('navbar.purse'),
      icon: FiHexagon,
      description:
        balance === null
          ? undefined
          : `${balance.toLocaleString(fr ? 'fr-FR' : 'en-US')} PE`,
    },
    {
      href: '/notifications',
      label: t('nav.notifications'),
      icon: FiBell,
      description: unreadCount
        ? t('navbar.unreadCount', { count: unreadCount })
        : undefined,
    },
    { href: '/settings', label: t('nav.settings'), icon: FiSettings },
    ...(isAdmin
      ? [{ href: '/admin', label: t('navbar.adminDashboard'), icon: FiShield }]
      : []),
  ];

  useEffect(() => {
    setOpenPanel(null);
    setMobileOpen(false);
    setSearchQuery('');
  }, [router.asPath]);

  useEffect(() => {
    function outside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!headerRef.current?.contains(target)) {
        setOpenPanel(null);
        setMobileOpen(false);
      } else if (!target.closest('[data-nav-disclosure]')) setOpenPanel(null);
    }
    document.addEventListener('pointerdown', outside);
    // A menu opened on a phone must not reappear after resizing back from desktop.
    const desktop = window.matchMedia('(min-width: 1100px)');
    const reset = () => {
      setMobileOpen(false);
      setOpenPanel(null);
    };
    desktop.addEventListener('change', reset);
    return () => {
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', reset);
    };
  }, []);

  useEffect(() => {
    setUnreadCount(0);
    if (!userId) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const res = await fetch(`${API_URL}/api/notifications`, {
          headers: getAuthHeader(),
          credentials: 'include',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted)
            setUnreadCount(
              data.notifications?.filter((n: { read: boolean }) => !n.read)
                .length || 0,
            );
        }
      } catch {
        /* Keep the last known count during temporary network failures. */
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    setBalance(null);
    if (!userId) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const res = await fetch(`${API_URL}/api/wallet/summary`, {
          headers: getAuthHeader(),
          credentials: 'include',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const value = Number(data?.wallet?.prismaticEssence || 0);
          if (!controller.signal.aborted)
            setBalance(Number.isFinite(value) ? value : 0);
        }
      } catch {
        /* Keep the last known balance during temporary network failures. */
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 45_000);
    window.addEventListener('riftessence:wallet-updated', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('riftessence:wallet-updated', refresh);
    };
  }, [userId]);

  useEffect(() => {
    setIsAdmin(false);
    if (!userId) return;
    const controller = new AbortController();
    let interval: number | undefined;
    const check = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/user/check-admin?userId=${encodeURIComponent(
            userId,
          )}`,
          {
            headers: getAuthHeader(),
            credentials: 'include',
            signal: controller.signal,
          },
        );
        const admin = res.ok && Boolean((await res.json()).isAdmin);
        if (!controller.signal.aborted) setIsAdmin(admin);
        return admin;
      } catch {
        return false;
      }
    };
    void check().then((admin) => {
      if (admin && !controller.signal.aborted)
        interval = window.setInterval(check, 60_000);
    });
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    const query = searchQuery.trim();
    setSearchResults([]);
    if (query.length < 2) {
      setSearchStatus('idle');
      return;
    }
    setSearchStatus('loading');
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/user/search?q=${encodeURIComponent(query)}&limit=5`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('Search unavailable');
        const data = await res.json();
        if (!controller.signal.aborted) {
          setSearchResults(data.users || []);
          setSearchStatus('ready');
        }
      } catch {
        if (!controller.signal.aborted) setSearchStatus('error');
      }
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  const compactBalance =
    balance === null
      ? null
      : new Intl.NumberFormat(fr ? 'fr-FR' : 'en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(balance);
  const searchLabels = {
    placeholder: t('navbar.searchPlaceholder'),
    searching: t('navbar.searching'),
    error: t('navbar.searchError'),
    noUsers: t('navbar.noUsersFound'),
    verified: t('navbar.verified'),
  };
  const onDisclosureBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setOpenPanel(null);
  };

  return (
    <header
      ref={headerRef}
      className="rift-navigation"
      data-nav-theme={currentTheme}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (openPanel) {
          setOpenPanel(null);
          lastTrigger.current?.focus();
        } else if (mobileOpen) {
          setMobileOpen(false);
          mobileTrigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          closeMenus();
      }}
    >
      <div className="rn-bar">
        <Link
          className="rn-brand"
          href="/"
          onClick={closeMenus}
          aria-label="RiftEssence — Home"
        >
          <span className="rn-brand-mark">
            <ThemeMark theme={currentTheme} />
          </span>
          <span className="rn-wordmark">
            Rift<span>Essence</span>
          </span>
        </Link>
        <nav
          id="rift-main-navigation"
          className={`rn-primary${mobileOpen ? ' rn-mobile-open' : ''}`}
          aria-label={t('navbar.mainNavigation')}
        >
          <div className="rn-mobile-heading">{t('navbar.explore')}</div>
          <SearchBox
            mobile
            query={searchQuery}
            onQueryChange={setSearchQuery}
            status={searchStatus}
            results={searchResults}
            onNavigate={closeMenus}
            labels={searchLabels}
          />
          <Link
            href="/feed"
            className="rn-tab"
            aria-current={
              isActiveHref(router.asPath, '/feed') ? 'page' : undefined
            }
            onClick={closeMenus}
          >
            <span>LFD</span>
            <span className="rn-mobile-hint">{t('navbar.findDuo')}</span>
          </Link>
          {groups.map((group) => {
            const active =
              (group.id === 'teams' && isActiveHref(router.asPath, '/teams')) ||
              group.items.some((item) =>
                isActiveHref(router.asPath, item.href),
              );
            const expanded = openPanel === group.id;
            return (
              <div
                className="rn-group"
                key={group.id}
                data-nav-disclosure
                onBlur={onDisclosureBlur}
              >
                <button
                  type="button"
                  className={`rn-tab${active ? ' rn-active' : ''}`}
                  aria-expanded={expanded}
                  aria-controls={`rn-${group.id}`}
                  onClick={(event) =>
                    togglePanel(group.id, event.currentTarget)
                  }
                >
                  <span>{group.label}</span>
                  <FiChevronDown className="rn-chevron" aria-hidden="true" />
                </button>
                {expanded ? (
                  <div
                    id={`rn-${group.id}`}
                    className="rn-panel rn-group-panel"
                  >
                    <p className="rn-panel-label">{group.label}</p>
                    {group.items.map((item) => (
                      <Destination
                        key={item.href}
                        item={item}
                        path={router.asPath}
                        onNavigate={closeMenus}
                        soonLabel={t('navbar.comingSoon')}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="rn-utilities">
          <SearchBox
            query={searchQuery}
            onQueryChange={setSearchQuery}
            status={searchStatus}
            results={searchResults}
            onNavigate={closeMenus}
            labels={searchLabels}
          />
          {user ? (
            <>
              <Link
                href="/purse"
                className="rn-icon-button rn-wallet"
                onClick={closeMenus}
                aria-label={`${t('navbar.purse')}${
                  balance !== null ? `: ${balance} PE` : ''
                }`}
                title={t('navbar.purse')}
              >
                <PrismaticEssenceIcon className="rn-pe-icon" />
                {compactBalance !== null ? (
                  <span className="rn-balance">{compactBalance}</span>
                ) : null}
              </Link>
              <Link
                href="/notifications"
                className="rn-icon-button rn-notifications"
                onClick={closeMenus}
                aria-label={`${t('nav.notifications')}${
                  unreadCount ? ` (${unreadCount})` : ''
                }`}
                title={t('nav.notifications')}
              >
                <FiBell aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="rn-notification-count">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </Link>
            </>
          ) : null}
          {loading ? (
            <span className="rn-auth-placeholder" />
          ) : user ? (
            <div
              className="rn-account"
              data-nav-disclosure
              onBlur={onDisclosureBlur}
            >
              <button
                type="button"
                className="rn-account-trigger"
                aria-label={`${t('navbar.account')}: ${user.username}`}
                aria-expanded={openPanel === 'account'}
                aria-controls="rn-account-panel"
                onClick={(event) => togglePanel('account', event.currentTarget)}
              >
                {user.profileIconId ? (
                  <img
                    className="rn-avatar"
                    src={getProfileIconUrl(user.profileIconId)}
                    alt=""
                    width={32}
                    height={32}
                  />
                ) : (
                  <span className="rn-avatar rn-avatar-fallback">
                    {user.username[0]?.toUpperCase()}
                  </span>
                )}
                <span className="rn-account-name">{user.username}</span>
                <FiChevronDown className="rn-chevron" aria-hidden="true" />
              </button>
              {openPanel === 'account' ? (
                <div
                  id="rn-account-panel"
                  className="rn-panel rn-account-panel"
                >
                  <div className="rn-account-heading">
                    <span
                      className={`username-hover-base ${
                        user.activeHoverEffect
                          ? USERNAME_HOVER_EFFECT_CLASSES[
                              user.activeHoverEffect
                            ] || ''
                          : ''
                      }`}
                      style={{
                        fontFamily: user.activeNameplateFont
                          ? USERNAME_FONT_FAMILIES[user.activeNameplateFont]
                          : undefined,
                        ...(user.activeUsernameDecoration
                          ? USERNAME_DECORATION_STYLES[
                              user.activeUsernameDecoration
                            ]
                          : {}),
                      }}
                    >
                      {user.username}
                    </span>
                    <small>{t('navbar.account')}</small>
                  </div>
                  {accountItems.map((item) => (
                    <Destination
                      key={item.href}
                      item={item}
                      path={router.asPath}
                      onNavigate={closeMenus}
                      soonLabel={t('navbar.comingSoon')}
                    />
                  ))}
                  <button
                    type="button"
                    className="rn-logout"
                    onClick={() => {
                      logout();
                      closeMenus();
                    }}
                  >
                    <FiLogOut aria-hidden="true" />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link className="rn-login" href="/login" onClick={closeMenus}>
              {t('nav.login')}
            </Link>
          )}
          <button
            ref={mobileTrigger}
            type="button"
            className="rn-icon-button rn-mobile-toggle"
            aria-label={
              mobileOpen ? t('navbar.closeMenu') : t('navbar.openMenu')
            }
            aria-expanded={mobileOpen}
            aria-controls="rift-main-navigation"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setOpenPanel(null);
            }}
          >
            {mobileOpen ? (
              <FiX aria-hidden="true" />
            ) : (
              <FiMenu aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
