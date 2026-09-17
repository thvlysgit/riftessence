export function parseReportEvidence(value: unknown): {
  urls: string[];
  error?: string;
} {
  if (value === undefined || value === null || value === '')
    return { urls: [] };
  if (!Array.isArray(value) || value.length > 5) {
    return { urls: [], error: 'Provide up to five evidence links' };
  }

  const urls: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length > 500) {
      return {
        urls: [],
        error: 'Evidence links must be HTTPS URLs under 500 characters',
      };
    }
    try {
      const parsed = new URL(entry.trim());
      if (
        parsed.protocol !== 'https:' ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password
      ) {
        return { urls: [], error: 'Evidence links must be public HTTPS URLs' };
      }
      urls.push(parsed.toString());
    } catch {
      return { urls: [], error: 'Evidence links must be valid HTTPS URLs' };
    }
  }
  return { urls: [...new Set(urls)] };
}

export function parseDiscordContact(value: unknown): {
  contact: string | null;
  error?: string;
} {
  if (value === undefined || value === null || value === '')
    return { contact: null };
  if (typeof value !== 'string' || value.trim().length > 64) {
    return {
      contact: null,
      error: 'Discord username must be under 64 characters',
    };
  }
  return { contact: value.trim() || null };
}
