import React, { useEffect } from 'react';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import OnboardingWizard from '../components/OnboardingWizard';
import BugReportButton from '../components/BugReportButton'; // TODO: TEMPORARY - Remove after bug reporting period
import ChatWidget from '../components/ChatWidget';
import { GlobalUIProvider } from '../components/GlobalUI';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ChatProvider } from '../contexts/ChatContext';
import { trackNewVisitor } from '../utils/analytics';
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();

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
  '/admin/settings': 'Admin Settings | RiftEssence',
  '/admin/broadcast': 'Broadcast Message | RiftEssence',
};

export default function App({ Component, pageProps, router }: AppProps) {
  const routeTitle = ROUTE_TITLES[router.pathname];
  const pageTitle = pageProps.ssrTitle || routeTitle || 'RiftEssence - The League of Legends Community Platform';
  const pageDescription = pageProps.ssrDescription || 'Find your duo partner, join a team, get free coaching and share matchup knowledge. The all-in-one platform for the LoL community.';

  // Track new visitors on app load
  useEffect(() => {
    trackNewVisitor();
  }, []);
  
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Single source of truth for title/description — reads pageProps for per-page overrides */}
        <title key="title">{pageTitle}</title>
        <meta key="meta-title" name="title" content={pageTitle} />
        <meta key="description" name="description" content={pageDescription} />
        <meta key="og:title" property="og:title" content={pageTitle} />
        <meta key="og:description" property="og:description" content={pageDescription} />
        <meta key="twitter:title" name="twitter:title" content={pageTitle} />
        <meta key="twitter:description" name="twitter:description" content={pageDescription} />
        <meta name="keywords" content="League of Legends, LoL, LFD, Looking for Duo, LFT, Looking for Team, Coaching LoL, Matchups LoL, Communauté LoL, LoL France" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/favicon.png" />
        
        {/* Theme Color for Mobile Browsers */}
        <meta name="theme-color" content="#C8AA6E" />
        
        {/* Structured Data (JSON-LD) for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "RiftEssence",
              "url": "https://riftessence.app",
              "description": "League of Legends duo finder, team recruitment, coaching, and community platform",
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
          <LanguageProvider>
            <AuthProvider>
              <ChatProvider>
                <GlobalUIProvider>
                  <OnboardingWizard />
                  <Navbar />
                  <BugReportButton /> {/* TODO: TEMPORARY - Remove after bug reporting period */}
                  <ChatWidget />
                  <Component {...pageProps} />
                  <Footer />
                  <Analytics />
                </GlobalUIProvider>
              </ChatProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}
