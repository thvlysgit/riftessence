import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Analytics } from '@vercel/analytics/react';
import { useLanguage } from './LanguageContext';
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, CookieChoices, CookieConsent, hasCookieConsent, NO_OPTIONAL_COOKIES, readCookieConsent, saveCookieConsent } from '../utils/cookieConsent';

const CookieConsentContext = createContext<{ choices: CookieChoices; openSettings: () => void }>({ choices: NO_OPTIONAL_COOKIES, openSettings: () => {} });
export const useCookieConsent = () => useContext(CookieConsentContext);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const fr = currentLanguage === 'fr';
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<CookieChoices>(NO_OPTIONAL_COOKIES);
  const [error, setError] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const openSettings = useCallback(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    setDraft(readCookieConsent() || NO_OPTIONAL_COOKIES);
    setCustomizing(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    const sync = () => {
      const stored = readCookieConsent();
      setConsent(stored);
      setDraft(stored || NO_OPTIONAL_COOKIES);
      if (!stored) setOpen(true);
      setReady(true);
    };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === COOKIE_CONSENT_KEY) window.location.reload(); };
    sync();
    // Retired tracking identifier has no continuing purpose.
    try { localStorage.removeItem('visitor_tracked'); } catch { /* Storage may be unavailable. */ }
    window.addEventListener('storage', onStorage);
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  useEffect(() => {
    if (open && customizing) panel.current?.focus();
  }, [open, customizing]);

  useEffect(() => {
    if (!consent) return;
    const interval = window.setInterval(() => {
      if (Date.now() >= consent.expiresAt) { setConsent(null); setDraft(NO_OPTIONAL_COOKIES); setOpen(true); }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [consent]);

  const save = (choices: CookieChoices) => {
    try {
      const revoked = consent && (['analytics', 'advertising', 'media'] as const).some(key => consent[key] && !choices[key]);
      const stored = saveCookieConsent(choices);
      setConsent(stored); setOpen(false); setCustomizing(false); setError(false);
      previousFocus.current?.focus();
      // Reload tears down SDK listeners and already loaded third-party players on withdrawal.
      if (revoked) window.location.reload();
    } catch { setError(true); }
  };

  const categories = [
    { key: 'analytics' as const, title: fr ? 'Mesure d’audience' : 'Audience measurement', text: fr ? 'Vercel Web Analytics : pages consultées et données techniques de navigation pour améliorer le site.' : 'Vercel Web Analytics: page views and technical browsing data to improve the site.' },
    { key: 'advertising' as const, title: fr ? 'Mesure des publicités' : 'Ad measurement', text: fr ? 'Chargement des images publicitaires externes et comptage des vues et clics, avec une empreinte de l’adresse IP pour éviter les doublons.' : 'Load external ad images and count views and clicks, using a hashed IP address to avoid duplicate views.' },
    { key: 'media' as const, title: fr ? 'Contenus externes' : 'External media', text: fr ? 'Lecteurs YouTube et médias de profil hébergés à l’extérieur. Ces fournisseurs reçoivent votre adresse IP et peuvent utiliser leurs propres traceurs.' : 'YouTube players and externally hosted profile media. These providers receive your IP address and may use their own trackers.' },
  ];

  return <CookieConsentContext.Provider value={{ choices: consent || NO_OPTIONAL_COOKIES, openSettings }}>
    {children}
    {ready && consent?.analytics ? <Analytics beforeSend={event => hasCookieConsent('analytics') ? { ...event, url: `${window.location.origin}${router.pathname}` } : null} /> : null}
    {ready && open ? <section ref={panel} tabIndex={-1} className="cookie-panel" role="region" aria-labelledby="cookie-title">
      <div className="cookie-panel-copy">
        <h2 id="cookie-title">{fr ? 'Vos choix de confidentialité' : 'Your privacy choices'}</h2>
        <p>{fr ? 'Les cookies nécessaires assurent la connexion, la sécurité et vos préférences demandées. Avec votre accord, nous activons la mesure d’audience, la mesure des publicités et les contenus externes. Vous pouvez refuser sans perdre l’accès au site.' : 'Necessary storage supports sign-in, security, and the preferences you request. With your permission, we enable audience measurement, ad measurement, and external media. You can refuse and still use the site.'} <Link href="/cookies">{fr ? 'Détails et fournisseurs' : 'Details and providers'}</Link> · <Link href="/privacy">{fr ? 'Confidentialité' : 'Privacy'}</Link></p>
      </div>
      {customizing ? <fieldset className="cookie-categories">
        <legend className="sr-only">{fr ? 'Choisir par finalité' : 'Choose by purpose'}</legend>
        <label><input type="checkbox" checked disabled /><span><strong>{fr ? 'Strictement nécessaires — toujours actifs' : 'Strictly necessary — always on'}</strong><small>{fr ? 'Session, protection contre les abus, choix de consentement, langue, thème et fonctions expressément demandées.' : 'Session, abuse prevention, consent choices, language, theme, and features you expressly request.'}</small></span></label>
        {categories.map(category => <label key={category.key}><input type="checkbox" checked={draft[category.key]} onChange={event => setDraft(current => ({ ...current, [category.key]: event.target.checked }))} /><span><strong>{category.title}</strong><small>{category.text}</small></span></label>)}
      </fieldset> : null}
      {error ? <p role="alert">{fr ? 'Votre navigateur bloque l’enregistrement. Les services facultatifs restent désactivés.' : 'Your browser blocked saving your choice. Optional services remain off.'}</p> : null}
      <div className="cookie-actions">
        <button type="button" onClick={() => save(NO_OPTIONAL_COOKIES)}>{fr ? 'Tout refuser' : 'Reject all'}</button>
        <button type="button" onClick={() => save({ analytics: true, advertising: true, media: true })}>{fr ? 'Tout accepter' : 'Accept all'}</button>
        {customizing ? <button type="button" onClick={() => save(draft)}>{fr ? 'Enregistrer mes choix' : 'Save my choices'}</button> : <button type="button" onClick={() => setCustomizing(true)}>{fr ? 'Personnaliser' : 'Customize'}</button>}
      </div>
      <p className="cookie-panel-note">{fr ? 'Choix conservé 6 mois. Modifiable à tout moment via « Choix des cookies » en bas de page.' : 'Choice saved for 6 months. Change it anytime using “Cookie settings” in the footer.'}</p>
    </section> : null}
  </CookieConsentContext.Provider>;
}
