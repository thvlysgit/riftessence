export type ApiRateLimitClass = {
  bucket: 'read' | 'write';
  max: number;
};

export function getApiRateLimitClass(method: unknown, authenticated: boolean): ApiRateLimitClass {
  const normalizedMethod = String(method || '').toUpperCase();
  const bucket = ['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod) ? 'read' : 'write';
  if (authenticated) return { bucket, max: bucket === 'read' ? 3000 : 1000 };
  return { bucket, max: bucket === 'read' ? 1000 : 300 };
}
