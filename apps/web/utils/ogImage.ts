export const GLOBAL_OG_IMAGE_VERSION = 'global-brand-20260507-2';

export function globalOgImageUrl(baseUrl: string): string {
  return `${baseUrl}/api/og/app?v=${GLOBAL_OG_IMAGE_VERSION}`;
}
