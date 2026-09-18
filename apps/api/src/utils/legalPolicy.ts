// Runtime JSON keeps the API's dist layout unchanged; the frontend uses this same policy file.
const policy: { version: string; minimumAccountAge: number } = require('../../../../packages/types/legal-policy.json');
export const LEGAL_VERSION = policy.version;
export type LegalAcceptanceInput = {
  version: string;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  eligibilityConfirmed: boolean;
  ageGroup: '15-17' | '18+';
  locale: 'en' | 'fr';
};
