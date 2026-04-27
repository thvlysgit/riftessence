import React, { ReactNode, useEffect } from 'react';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import Navbar from '@components/Navbar';
import Footer from '@components/Footer';
import BugReportButton from '@components/BugReportButton'; // TODO: TEMPORARY - Remove after bug reporting period
import ChatWidget from '@components/ChatWidget';
import AccessRequirementModal from '@components/AccessRequirementModal';
import { GlobalUIProvider } from '@components/GlobalUI';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ChatProvider } from '../contexts/ChatContext';
import { trackNewVisitor } from '../utils/analytics';
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function RouteAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [adminCountdown, setAdminCountdown] = React.useState(3);

  const pathname = router.pathname || '/';
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const requiresAccount = pathname === '/profile'
    || pathname === '/settings'
    || pathname === '/notifications'
    || pathname === '/purse'
    || pathname.startsWith('/teams/dashboard');
  const isAdminUser = Boolean(user?.badges?.some((badge) => badge.key === 'admin'));
  const isBlocked = (!loading && isAdminRoute && !isAdminUser) || (!loading && requiresAccount && !user);

  useEffect(() => {
    if (!isAdminRoute) {
      setAdminCountdown(3);
      return;
    }
    if (loading) return;
    if (isAdminUser) return;

    setAdminCountdown(3);
    const tickInterval = window.setInterval(() => {
      setAdminCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const redirectTimeout = window.setTimeout(() => {
      if (user) {
        router.replace('/profile');
      } else {
        router.replace('/');
      }
    }, 3000);

    return () => {
      window.clearInterval(tickInterval);
      window.clearTimeout(redirectTimeout);
    };
  }, [isAdminRoute, loading, isAdminUser, user, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading || isBlocked) return;
    sessionStorage.setItem('riftessence_last_accessible_path', router.asPath);
  }, [loading, isBlocked, router.asPath]);

  if (loading) {
    return <>{children}</>;
  }

  if (isAdminRoute && !isAdminUser) {
    return <AccessRequirementModal type="admin-only" countdown={adminCountdown} />;
  }

  if (requiresAccount && !user) {
    return <AccessRequirementModal type="account-required" reason="You need to have an account to access this page." />;
  }

  return <>{children}</>;
}

function ThemedAppFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme.colors.accent1);
    }
  }, [theme.colors.accent1]);

  return (
    <div className="app-theme-shell">
      <div className="app-theme-content">{children}</div>
    </div>
  );
}

// Route → browser tab title map. Dynamic pages override via document.title in useEffect.
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Find Your Duo - League of Legends | RiftEssence',
  '/feed': 'Looking for Duo | RiftEssence',
  '/create': 'Create Duo Post | RiftEssence',
  '/lft': 'Looking for Team | RiftEssence',
  '/login': 'Login | RiftEssence',
  '/register': 'Sign Up | RiftEssence',
  '/authenticate': 'Connecting... | RiftEssence',
  '/profile': 'Profile | RiftEssence',
  '/settings': 'Settings | RiftEssence',
  '/notifications': 'Notifications | RiftEssence',
  '/purse': 'Purse | RiftEssence',
  '/leaderboards': 'Leaderboards | RiftEssence',
  '/communities': 'Communities | RiftEssence',
  '/communities/register': 'Register Community | RiftEssence',
  '/communities/guide': 'Community Guide | RiftEssence',
  '/coaching': 'Free Coaching | RiftEssence',
  '/matchups': 'My Matchups | RiftEssence',
  '/matchups/marketplace': 'Matchup Marketplace | RiftEssence',
  '/matchups/create': 'Create Matchup | RiftEssence',
  '/status': 'Server Status | RiftEssence',
  '/terms': 'Terms of Service | RiftEssence',
  '/privacy': 'Privacy Policy | RiftEssence',
  '/cookies': 'Cookie Policy | RiftEssence',
  '/admin': 'Admin Dashboard | RiftEssence',
  '/admin/users': 'User Management | RiftEssence',
  '/admin/reports': 'Reports | RiftEssence',
  '/admin/badges': 'Badge Management | RiftEssence',
  '/admin/ads': 'Ad Management | RiftEssence',
  '/admin/prismatic': 'Prismatic Grants | RiftEssence',
  '/admin/settings': 'Admin Settings | RiftEssence',
  '/admin/broadcast': 'Broadcast Message | RiftEssence',
  // Region / role landing pages
  '/region/na':   'Find Duo Partner NA | RiftEssence',
  '/region/euw':  'Find Duo Partner EUW | RiftEssence',
  '/region/eune': 'Find Duo Partner EUNE | RiftEssence',
  '/region/kr':   'Find Duo Partner KR | RiftEssence',
  '/region/br':   'Find Duo Partner BR | RiftEssence',
  '/region/lan':  'Find Duo Partner LAN | RiftEssence',
  '/region/las':  'Find Duo Partner LAS | RiftEssence',
  '/region/oce':  'Find Duo Partner OCE | RiftEssence',
  '/region/jp':   'Find Duo Partner JP | RiftEssence',
  '/region/tr':   'Find Duo Partner TR | RiftEssence',
  '/region/ru':   'Find Duo Partner RU | RiftEssence',
  '/role/top':     'Find Top Lane Duo | RiftEssence',
  '/role/jungle':  'Find Jungle Duo | RiftEssence',
  '/role/mid':     'Find Mid Lane Duo | RiftEssence',
  '/role/adc':     'Find ADC Duo | RiftEssence',
  '/role/support': 'Find Support Duo | RiftEssence',
};

export default function App({ Component, pageProps, router }: AppProps) {
  const routeTitle = ROUTE_TITLES[router.pathname];
  const pageTitle = pageProps.ssrTitle || routeTitle || 'RiftEssence - The League of Legends Community Platform';
  const pageDescription = pageProps.ssrDescription || 'Find your duo partner, join a team, get free coaching and share matchup knowledge. The all-in-one platform for the LoL community.';

  // Track new visitors on app load
  useEffect(() => {
    trackNewVisitor();
  }, []);

  // Enforce IP blacklist redirects for unauthenticated browsing as well.
  useEffect(() => {
    let cancelled = false;

    const checkIpBlacklist = async () => {
      if (router.pathname === '/banned') return;

      try {
        const res = await fetch(`${API_URL}/api/communities?limit=1`);
        if (!res.ok && res.status === 403) {
          const payload = await res.json().catch(() => null);
          if (!cancelled && payload?.code === 'IP_BLACKLISTED') {
            router.replace('/banned');
          }
        }
      } catch {
        // Network issues should not block normal page usage.
      }
    };

    checkIpBlacklist();

    return () => {
      cancelled = true;
    };
  }, [router.pathname, router]);
  
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Single source of truth for title/description — reads pageProps for per-page overrides */}
        <title key="title">{pageTitle}</title>
        <meta key="meta-title" name="title" content={pageTitle} />
        <meta key="description" name="description" content={pageDescription} />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:site_name" property="og:site_name" content="RiftEssence" />
        <meta key="og:title" property="og:title" content={pageTitle} />
        <meta key="og:description" property="og:description" content={pageDescription} />
        <meta key="og:image" property="og:image" content="https://www.riftessence.app/assets/og-image.png" />
        <meta key="og:image:width" property="og:image:width" content="1200" />
        <meta key="og:image:height" property="og:image:height" content="630" />
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="twitter:title" name="twitter:title" content={pageTitle} />
        <meta key="twitter:description" name="twitter:description" content={pageDescription} />
        <meta key="twitter:image" name="twitter:image" content="https://www.riftessence.app/assets/og-image.png" />
        <meta name="keywords" content="league of legends duo finder, lol duo partner, league of legends duo queue, lol ranked duo, duo partner lol, LoL duo finder, find duo partner, lol duo NA, lol duo EUW, lol duo EUNE, lol duo KR, duo partner lol plat, duo partner lol diamond, duo partner lol gold, League of Legends, LoL, LFD, Looking for Duo, LFT, Looking for Team, Coaching LoL, Matchups LoL" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/favicon.png" />
        
        {/* Structured Data (JSON-LD) for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "RiftEssence",
              "url": "https://riftessence.app",
              "description": "Find your perfect League of Legends duo partner. The premier LoL duo finder for ranked games across all regions (NA, EUW, EUNE, KR, OCE) and ranks (Iron-Challenger). Team recruitment, free coaching, and matchup guides.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://riftessence.app/feed?search={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "RiftEssence",
                "url": "https://riftessence.app"
              }
            })
          }}
        />
      </Head>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedAppFrame>
            <LanguageProvider>
              <AuthProvider>
                <ChatProvider>
                  <GlobalUIProvider>
                    <Navbar />
                    <BugReportButton /> {/* TODO: TEMPORARY - Remove after bug reporting period */}
                    <ChatWidget />
                    <RouteAccessGate>
                      <Component {...pageProps} />
                    </RouteAccessGate>
                    <Footer />
                    <Analytics />
                  </GlobalUIProvider>
                </ChatProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemedAppFrame>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}
