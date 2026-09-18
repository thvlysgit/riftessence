import policy from '../../../packages/types/legal-policy.json';
export const LEGAL_VERSION = policy.version;
export type LegalAcceptanceInput = {
  version: string;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  eligibilityConfirmed: boolean;
  ageGroup: '15-17' | '18+';
  locale: 'en' | 'fr';
};
