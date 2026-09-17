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
  FiFeather,
  FiFlag,
  FiGrid,
  FiHexagon,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiMoon,
  FiSearch,
  FiSettings,
  FiShield,
  FiSun,
  FiTarget,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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

const themeMarks = {
  classic: FiHexagon,
  'arcane-pastel': FiFeather,
  nightshade: FiMoon,
  'infernal-ember': FiZap,
  'radiant-light': FiSun,
  'ocean-depths': FiDroplet,
};

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
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [unreadCount, setUnreadCount] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const ThemeMark = themeMarks[currentTheme];
  const userId = user?.id;
  const closeMenus = () => {
    setOpenPanel(null);
    setMobileOpen(false);
  };
  const togglePanel = (name: string, button: HTMLButtonElement) => {
    lastTrigger.current = button;
    setOpenPanel((current) => (current === name ? null : name));
    if (name === 'account' || name === 'search') setMobileOpen(false);
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
        balance === null ? undefined : `${balance.toLocaleString(fr ? 'fr-FR' : 'en-US')} PE`,
    },
    {
      href: '/notifications',
      label: t('nav.notifications'),
      icon: FiBell,
      description: unreadCount ? t('navbar.unreadCount', { count: unreadCount }) : undefined,
    },
    { href: '/settings', label: t('nav.settings'), icon: FiSettings },
    ...(isAdmin ? [{ href: '/admin', label: t('navbar.adminDashboard'), icon: FiShield }] : []),
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
    if (openPanel === 'search') searchInput.current?.focus();
  }, [openPanel]);

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
              data.notifications?.filter((n: { read: boolean }) => !n.read).length || 0,
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
          if (!controller.signal.aborted) setBalance(Number.isFinite(value) ? value : 0);
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
          `${API_URL}/api/user/check-admin?userId=${encodeURIComponent(userId)}`,
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
      if (admin && !controller.signal.aborted) interval = window.setInterval(check, 60_000);
    });
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    const query = searchQuery.trim();
    setSearchResults([]);
    if (openPanel !== 'search' || query.length < 2) {
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
  }, [searchQuery, openPanel]);

  const compactBalance =
    balance === null
      ? null
      : new Intl.NumberFormat(fr ? 'fr-FR' : 'en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(balance);
  const onDisclosureBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenPanel(null);
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
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          closeMenus();
      }}
    >
      <div className="rn-bar">
        <Link className="rn-brand" href="/" onClick={closeMenus} aria-label="RiftEssence — Home">
          <span className="rn-brand-mark">
            <ThemeMark aria-hidden="true" />
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
          <Link
            href="/feed"
            className="rn-tab"
            aria-current={isActiveHref(router.asPath, '/feed') ? 'page' : undefined}
            onClick={closeMenus}
          >
            <span>LFD</span>
            <span className="rn-mobile-hint">{t('navbar.findDuo')}</span>
          </Link>
          {groups.map((group) => {
            const active =
              (group.id === 'teams' && isActiveHref(router.asPath, '/teams')) ||
              group.items.some((item) => isActiveHref(router.asPath, item.href));
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
                  onClick={(event) => togglePanel(group.id, event.currentTarget)}
                >
                  <span>{group.label}</span>
                  <FiChevronDown className="rn-chevron" aria-hidden="true" />
                </button>
                {expanded ? (
                  <div id={`rn-${group.id}`} className="rn-panel rn-group-panel">
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
          <div className="rn-search" data-nav-disclosure onBlur={onDisclosureBlur}>
            <button
              type="button"
              className="rn-icon-button"
              aria-label={t('navbar.searchPlaceholder')}
              title={t('navbar.searchPlaceholder')}
              aria-expanded={openPanel === 'search'}
              aria-controls="rn-search-panel"
              onClick={(event) => togglePanel('search', event.currentTarget)}
            >
              <FiSearch aria-hidden="true" />
            </button>
            {openPanel === 'search' ? (
              <div id="rn-search-panel" className="rn-panel rn-search-panel">
                <label className="rn-panel-label" htmlFor="rn-search-input">
                  {t('navbar.searchPlaceholder')}
                </label>
                <div className="rn-search-field">
                  <FiSearch aria-hidden="true" />
                  <input
                    ref={searchInput}
                    id="rn-search-input"
                    type="search"
                    autoComplete="off"
                    value={searchQuery}
                    placeholder={t('navbar.searchHint')}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <div role="status" className="rn-search-status">
                  {searchStatus === 'loading'
                    ? t('navbar.searching')
                    : searchStatus === 'error'
                    ? t('navbar.searchError')
                    : searchStatus === 'idle'
                    ? t('navbar.searchHint')
                    : !searchResults.length
                    ? t('navbar.noUsersFound')
                    : null}
                </div>
                {searchResults.map((result) => (
                  <Link
                    href={`/profile/${encodeURIComponent(result.username)}`}
                    key={result.id}
                    className="rn-search-result"
                    onClick={closeMenus}
                  >
                    {result.profileIconId ? (
                      <img
                        src={getProfileIconUrl(result.profileIconId)}
                        alt=""
                        width={32}
                        height={32}
                      />
                    ) : (
                      <FiUser aria-hidden="true" />
                    )}
                    <span>{result.username}</span>
                    {result.verified ? <FiCheckCircle aria-label={t('navbar.verified')} /> : null}
                    <FiArrowUpRight className="rn-arrow" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          {user ? (
            <>
              <Link
                href="/purse"
                className="rn-icon-button rn-wallet"
                onClick={closeMenus}
                aria-label={`${t('navbar.purse')}${balance !== null ? `: ${balance} PE` : ''}`}
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
                aria-label={`${t('nav.notifications')}${unreadCount ? ` (${unreadCount})` : ''}`}
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
            <div className="rn-account" data-nav-disclosure onBlur={onDisclosureBlur}>
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
                <FiChevronDown className="rn-chevron" aria-hidden="true" />
              </button>
              {openPanel === 'account' ? (
                <div id="rn-account-panel" className="rn-panel rn-account-panel">
                  <div className="rn-account-heading">
                    <span
                      className={`username-hover-base ${
                        user.activeHoverEffect
                          ? USERNAME_HOVER_EFFECT_CLASSES[user.activeHoverEffect] || ''
                          : ''
                      }`}
                      style={{
                        fontFamily: user.activeNameplateFont
                          ? USERNAME_FONT_FAMILIES[user.activeNameplateFont]
                          : undefined,
                        ...(user.activeUsernameDecoration
                          ? USERNAME_DECORATION_STYLES[user.activeUsernameDecoration]
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
            aria-label={mobileOpen ? t('navbar.closeMenu') : t('navbar.openMenu')}
            aria-expanded={mobileOpen}
            aria-controls="rift-main-navigation"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setOpenPanel(null);
            }}
          >
            {mobileOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
