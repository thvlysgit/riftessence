import { useCookieConsent } from '../contexts/CookieConsentContext';
import { useLanguage } from '../contexts/LanguageContext';

export function isFirstPartyMedia(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'https://riftessence.app' : window.location.origin);
    const api = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333');
    return (parsed.origin === api.origin || (typeof window !== 'undefined' && parsed.origin === window.location.origin)) && parsed.pathname.startsWith('/api/user/profile-media/');
  } catch { return false; }
}

export default function ExternalMediaConsent({ children, src }: { children: React.ReactNode; src?: string }) {
  const { choices, openSettings } = useCookieConsent();
  const { currentLanguage } = useLanguage();
  if (choices.media || (src && isFirstPartyMedia(src))) return <>{children}</>;
  return <div className="external-media-consent"><p>{currentLanguage === 'fr' ? 'Ce média externe est désactivé selon vos choix de confidentialité.' : 'This external media is disabled by your privacy choices.'}</p><button type="button" onClick={openSettings}>{currentLanguage === 'fr' ? 'Choisir les contenus externes' : 'Manage external media'}</button></div>;
}
