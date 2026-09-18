import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { LEGAL_VERSION } from '../utils/legalPolicy';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAuthHeader } from '../utils/auth';
import LegalAcceptanceFields, { emptyLegalAcceptance, legalFormComplete } from './LegalAcceptanceFields';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const PUBLIC_LEGAL_PAGES = new Set(['/privacy', '/terms', '/cookies', '/legal']);

export default function LegalAcceptanceGate({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { currentLanguage } = useLanguage();
  const { pathname } = useRouter();
  const fr = currentLanguage === 'fr';
  const [value, setValue] = useState(emptyLegalAcceptance);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = useQuery(['legal-acceptance', user?.id], async () => {
    const response = await fetch(`${API_URL}/api/legal/status`, { credentials: 'include', headers: getAuthHeader() });
    if (!response.ok) throw new Error('Could not load acceptance status.');
    return response.json() as Promise<{ accepted: boolean; requiredVersion: string }>;
  }, { enabled: Boolean(user), retry: 1, staleTime: 60_000 });

  useEffect(() => {
    const review = () => { void status.refetch(); };
    window.addEventListener('legal-acceptance-required', review);
    return () => window.removeEventListener('legal-acceptance-required', review);
  }, [status.refetch]);

  if (PUBLIC_LEGAL_PAGES.has(pathname) || (!loading && !user)) return <>{children}</>;
  if (loading || status.isLoading) return <main className="legal-review" aria-busy="true"><p role="status">{fr ? 'Chargement…' : 'Loading…'}</p></main>;
  if (status.data?.accepted && status.data.requiredVersion === LEGAL_VERSION) return <>{children}</>;

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!legalFormComplete(value) || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/legal/accept`, { method: 'POST', credentials: 'include', headers: { ...getAuthHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...value, locale: fr ? 'fr' : 'en' }) });
      if (!response.ok) throw new Error(fr ? 'Impossible d’enregistrer votre accord. Réessayez.' : 'Could not save your acceptance. Please try again.');
      await status.refetch();
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  return <main className="legal-review">
    <h1>{fr ? 'Bienvenue sur RiftEssence' : 'Welcome to RiftEssence'}</h1>
    <p>{fr ? 'Avant d’utiliser votre compte, consultez les documents ci-dessous. Cette étape s’applique à tous les modes d’inscription, y compris Discord et Riot, et aux comptes créés avant cette mise à jour.' : 'Before using your account, review the documents below. This applies to every registration method, including Discord and Riot, and to accounts created before this update.'}</p>
    {status.isError ? <><p role="alert">{fr ? 'Le statut de votre accord est indisponible.' : 'Your acceptance status could not be loaded.'}</p><button type="button" onClick={() => void status.refetch()}>{fr ? 'Réessayer' : 'Retry'}</button></> : <form onSubmit={accept}>
      <LegalAcceptanceFields value={value} onChange={setValue} />
      {error ? <p role="alert">{error}</p> : null}
      <button className="legal-primary" type="submit" disabled={busy || !legalFormComplete(value)}>{busy ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Accepter et continuer' : 'Accept and continue')}</button>
    </form>}
    <button className="legal-decline" type="button" onClick={logout}>{fr ? 'Me déconnecter sans accepter' : 'Sign out without accepting'}</button>
  </main>;
}
