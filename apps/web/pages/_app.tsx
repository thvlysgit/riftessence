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

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  // Track new visitors on app load
  useEffect(() => {
    trackNewVisitor();
  }, []);
  
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Primary Meta Tags */}
        <title>RiftEssence - Plateforme Communautaire League of Legends</title>
        <meta name="title" content="RiftEssence - Plateforme Communautaire League of Legends" />
        <meta name="description" content="Trouvez votre duo, rejoignez une équipe, obtenez du coaching gratuit et partagez vos connaissances sur les matchups. La plateforme tout-en-un pour la communauté LoL francophone." />
        <meta name="keywords" content="League of Legends, LoL, LFD, Looking for Duo, LFT, Looking for Team, Coaching LoL, Matchups LoL, Communauté LoL, LoL France" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        
        {/* Theme Color for Mobile Browsers */}
        <meta name="theme-color" content="#C8AA6E" />
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
                </GlobalUIProvider>
              </ChatProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}
