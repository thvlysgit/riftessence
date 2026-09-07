import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EconomyLayout({
  title,
  description,
  children,
  aside,
  admin = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  admin?: boolean;
}) {
  const { pathname } = useRouter();
  const { currentLanguage } = useLanguage();
  const fr = currentLanguage === 'fr';
  return (
    <div className="essence-page">
      <Head>
        <title>{title.replace(/\.$/, '')} | RiftEssence</title>
      </Head>
      <nav className="essence-nav" aria-label={fr ? 'Prismatic Essence' : 'Prismatic Essence'}>
        <div className="essence-width">
          {[
            ['/purse', fr ? 'Portefeuille' : 'Wallet'],
            ['/games', fr ? 'Jeux' : 'Games'],
            ['/cosmetics', fr ? 'Collection' : 'Collection'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === '/games' ? pathname.startsWith(href) : pathname === href)
                  ? 'page'
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          {admin ? (
            <Link className="essence-nav-end" href="/admin">
              Admin
            </Link>
          ) : null}
        </div>
      </nav>
      <main className="essence-width essence-main">
        <header className="essence-heading">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {aside}
        </header>
        {children}
      </main>
    </div>
  );
}
export function EconomyError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div className="essence-notice essence-error" role="alert">
      <span>{error instanceof Error ? error.message : String(error)}</span>
      {retry ? (
        <button type="button" onClick={retry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
export function EconomyLoading() {
  return (
    <div className="essence-loading" role="status">
      Loading…
    </div>
  );
}
export function SignInPrompt() {
  return (
    <div className="essence-empty">
      <h2>Make your progress count.</h2>
      <p>Sign in to play, earn essence, and build your collection.</p>
      <Link className="essence-button" href="/login">
        Sign in
      </Link>
    </div>
  );
}
