import prisma from '../prisma';

export type InputControlSurface = string;
export type InputControlRuleKind = 'WORD' | 'PHRASE' | 'PREFIX' | 'REGEX';

export const INPUT_CONTROL_GLOBAL_SURFACE = 'GLOBAL';
export const INPUT_CONTROL_USER_INPUT_SURFACE = 'USER_INPUT';

export const INPUT_CONTROL_SURFACES = [
  { key: INPUT_CONTROL_GLOBAL_SURFACE, label: 'All user input' },
  { key: 'DUO_POST', label: 'Duo posts' },
  { key: 'LFT_POST', label: 'LFT posts' },
  { key: 'COACHING_POST', label: 'Coaching posts' },
  { key: 'CHAT_MESSAGE', label: 'Chat messages' },
  { key: 'PROFILE', label: 'Profiles and settings' },
  { key: 'FEEDBACK', label: 'Feedback and ratings' },
  { key: 'REPORT', label: 'Reports' },
  { key: 'TEAM', label: 'Teams, events, and drafts' },
  { key: 'SCRIM', label: 'Scrims and proposals' },
  { key: 'MATCHUP', label: 'Matchups and collections' },
  { key: 'COMMUNITY', label: 'Communities' },
  { key: 'AD_REQUEST', label: 'Ad requests' },
  { key: 'DEVELOPER_API_REQUEST', label: 'Developer API requests' },
  { key: 'BUG_REPORT', label: 'Bug reports' },
] as const;

export type InputControlRuleSnapshot = {
  id: string;
  label: string;
  kind: InputControlRuleKind;
  pattern: string;
  reason: string | null;
  blockMessage: string | null;
  surfaces: string[];
  enabled: boolean;
};

export type InputControlViolation = {
  code: 'INPUT_CONTROL_BLOCKED';
  surface: InputControlSurface;
  ruleId: string;
  ruleLabel: string;
  reason: string | null;
  message: string;
};

const DEFAULT_RULES: InputControlRuleSnapshot[] = [
  {
    id: 'default-discord-invites',
    label: 'Discord invite advertising',
    kind: 'PREFIX',
    pattern: 'discord.gg/',
    reason: 'External community advertising',
    blockMessage: 'This post looks like advertising and was blocked.',
    surfaces: [INPUT_CONTROL_GLOBAL_SURFACE],
    enabled: true,
  },
  {
    id: 'default-twitch-links',
    label: 'Twitch channel advertising',
    kind: 'PREFIX',
    pattern: 'twitch.tv/',
    reason: 'External channel advertising',
    blockMessage: 'This post looks like advertising and was blocked.',
    surfaces: [INPUT_CONTROL_GLOBAL_SURFACE],
    enabled: true,
  },
];

const CACHE_TTL_MS = 30_000;
const MAX_SCANNED_TEXT_LENGTH = 4000;
const MAX_REGEX_PATTERN_LENGTH = 500;
const MAX_COLLECTED_FIELDS = 80;
let cachedRules: { expiresAt: number; rules: InputControlRuleSnapshot[] } | null = null;
const SENSITIVE_FIELD_PATTERN = /(password|token|secret|authorization|cookie|csrf|captcha|keyhash|webhook|accessToken|refreshToken)/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SCANNED_TEXT_LENGTH);
}

function normalizeUrlishPrefix(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
}

function normalizeSurfaces(surfaces: InputControlSurface | InputControlSurface[] | undefined): InputControlSurface[] {
  const values = Array.isArray(surfaces) ? surfaces : [surfaces || INPUT_CONTROL_USER_INPUT_SURFACE];
  const normalized = values.map((surface) => normalizeText(surface).toUpperCase()).filter(Boolean);
  return Array.from(new Set([INPUT_CONTROL_USER_INPUT_SURFACE, ...normalized]));
}

function ruleAppliesToSurface(rule: InputControlRuleSnapshot, surfaces: InputControlSurface[]): boolean {
  if (!rule.enabled) return false;
  if (rule.surfaces.length === 0) return true;

  const ruleSurfaces = rule.surfaces.map((surface) => normalizeText(surface).toUpperCase());
  return ruleSurfaces.includes(INPUT_CONTROL_GLOBAL_SURFACE)
    || surfaces.some((surface) => ruleSurfaces.includes(surface));
}

function matchesRule(text: string, rule: InputControlRuleSnapshot): boolean {
  const pattern = normalizeText(rule.pattern);
  if (!pattern) return false;

  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  if (rule.kind === 'WORD') {
    const matcher = new RegExp(`(^|[^a-z0-9_])${escapeRegex(lowerPattern)}($|[^a-z0-9_])`, 'i');
    return matcher.test(lowerText);
  }

  if (rule.kind === 'PREFIX') {
    return normalizeUrlishPrefix(text).startsWith(normalizeUrlishPrefix(lowerPattern));
  }

  if (rule.kind === 'REGEX') {
    if (pattern.length > MAX_REGEX_PATTERN_LENGTH) return false;

    try {
      return new RegExp(pattern, 'i').test(text);
    } catch {
      return false;
    }
  }

  return lowerText.includes(lowerPattern);
}

async function loadRules(): Promise<InputControlRuleSnapshot[]> {
  if (cachedRules && cachedRules.expiresAt > Date.now()) {
    return cachedRules.rules;
  }

  try {
    const rules = await prisma.inputControlRule.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        label: true,
        kind: true,
        pattern: true,
        reason: true,
        blockMessage: true,
        surfaces: true,
        enabled: true,
      },
    });

    cachedRules = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      rules: rules.map((rule: any) => ({
        ...rule,
        kind: rule.kind as InputControlRuleKind,
        surfaces: Array.isArray(rule.surfaces) ? rule.surfaces : [],
      })),
    };

    return cachedRules.rules;
  } catch (error: any) {
    if (error?.code === 'P2021' || error?.code === 'P2022') {
      return DEFAULT_RULES;
    }

    throw error;
  }
}

export function invalidateInputControlRulesCache() {
  cachedRules = null;
}

export function getInputControlSurfaceCatalog() {
  return INPUT_CONTROL_SURFACES;
}

export function isKnownInputControlSurface(surface: unknown): boolean {
  const normalized = normalizeText(surface).toUpperCase();
  return INPUT_CONTROL_SURFACES.some((item) => item.key === normalized);
}

export function collectInputControlTextFields(value: unknown, path: string[] = [], fields: string[] = []): string[] {
  if (fields.length >= MAX_COLLECTED_FIELDS || value === null || typeof value === 'undefined') {
    return fields;
  }

  if (typeof value === 'string') {
    const key = path[path.length - 1] || '';
    const normalized = normalizeText(value);
    if (normalized && !SENSITIVE_FIELD_PATTERN.test(key)) {
      fields.push(normalized);
    }
    return fields;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectInputControlTextFields(item, path, fields);
      if (fields.length >= MAX_COLLECTED_FIELDS) break;
    }
    return fields;
  }

  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_PATTERN.test(key)) continue;
      collectInputControlTextFields(child, [...path, key], fields);
      if (fields.length >= MAX_COLLECTED_FIELDS) break;
    }
  }

  return fields;
}

export async function inspectInputControl(input: {
  surface?: InputControlSurface;
  surfaces?: InputControlSurface[];
  fields: Array<unknown>;
}): Promise<InputControlViolation | null> {
  const text = normalizeText(input.fields.filter(Boolean).join(' '));
  if (!text) return null;

  const rules = await loadRules();
  const surfaces = normalizeSurfaces(input.surfaces || input.surface);
  const matchingRule = rules.find((rule) => ruleAppliesToSurface(rule, surfaces) && matchesRule(text, rule));
  if (!matchingRule) return null;

  return {
    code: 'INPUT_CONTROL_BLOCKED',
    surface: surfaces.find((surface) => surface !== INPUT_CONTROL_USER_INPUT_SURFACE) || INPUT_CONTROL_USER_INPUT_SURFACE,
    ruleId: matchingRule.id,
    ruleLabel: matchingRule.label,
    reason: matchingRule.reason,
    message: matchingRule.blockMessage || 'This content is not allowed by the current input rules.',
  };
}
