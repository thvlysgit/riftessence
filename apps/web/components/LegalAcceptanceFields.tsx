import Link from 'next/link';
import { LEGAL_VERSION, LegalAcceptanceInput } from '../utils/legalPolicy';
import { useLanguage } from '../contexts/LanguageContext';

export type LegalFormValue = Omit<LegalAcceptanceInput, 'ageGroup'> & { ageGroup: '' | LegalAcceptanceInput['ageGroup'] };
export const emptyLegalAcceptance: LegalFormValue = { version: LEGAL_VERSION, termsAccepted: false, privacyAcknowledged: false, eligibilityConfirmed: false, ageGroup: '', locale: 'en' };
export const legalFormComplete = (value: LegalFormValue) => value.termsAccepted && value.privacyAcknowledged && value.eligibilityConfirmed && Boolean(value.ageGroup);

export default function LegalAcceptanceFields({ value, onChange }: { value: LegalFormValue; onChange: (value: LegalFormValue) => void }) {
  const { currentLanguage } = useLanguage();
  const fr = currentLanguage === 'fr';
  const update = (patch: Partial<LegalFormValue>) => onChange({ ...value, ...patch, locale: fr ? 'fr' : 'en' });
  return <fieldset className="legal-acceptance-fields">
    <legend>{fr ? 'Avant de continuer' : 'Before continuing'}</legend>
    <label><input type="checkbox" checked={value.termsAccepted} onChange={event => update({ termsAccepted: event.target.checked })} required /><span>{fr ? 'J’accepte les ' : 'I accept the '}<Link href="/terms" target="_blank" rel="noopener">{fr ? 'Conditions d’utilisation' : 'Terms of Service'}</Link> ({LEGAL_VERSION}).</span></label>
    <label><input type="checkbox" checked={value.privacyAcknowledged} onChange={event => update({ privacyAcknowledged: event.target.checked })} required /><span>{fr ? 'J’ai pris connaissance de la ' : 'I have read the '}<Link href="/privacy" target="_blank" rel="noopener">{fr ? 'Politique de confidentialité' : 'Privacy Policy'}</Link>{fr ? ' et de la ' : ' and '}<Link href="/cookies" target="_blank" rel="noopener">{fr ? 'Politique relative aux cookies' : 'Cookie Policy'}</Link>.</span></label>
    <label className="legal-age-field"><span>{fr ? 'Tranche d’âge (non publique)' : 'Age range (not public)'}</span><select value={value.ageGroup} onChange={event => update({ ageGroup: event.target.value as LegalFormValue['ageGroup'] })} required><option value="">{fr ? 'Choisir' : 'Select'}</option><option value="15-17">15–17</option><option value="18+">18+</option></select></label>
    <label><input type="checkbox" checked={value.eligibilityConfirmed} onChange={event => update({ eligibilityConfirmed: event.target.checked })} required /><span>{fr ? 'J’ai au moins 15 ans. Si je suis mineur, j’ai l’autorisation de mon représentant légal lorsqu’elle est nécessaire.' : 'I am at least 15. If I am a minor, I have my parent’s or legal guardian’s permission where required.'}</span></label>
    <p>{fr ? 'Ces confirmations n’activent aucun cookie facultatif. Vos choix de confidentialité restent indépendants.' : 'These confirmations do not enable optional cookies. Your privacy choices remain separate.'}</p>
  </fieldset>;
}
