import prisma from '../prisma';

export type InputControlSurface = 'DUO_POST';
export type InputControlRuleKind = 'WORD' | 'PHRASE' | 'PREFIX' | 'REGEX';

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
    surfaces: ['DUO_POST'],
    enabled: true,
  },
  {
    id: 'default-twitch-links',
    label: 'Twitch channel advertising',
    kind: 'PREFIX',
    pattern: 'twitch.tv/',
    reason: 'External channel advertising',
    blockMessage: 'This post looks like advertising and was blocked.',
    surfaces: ['DUO_POST'],
    enabled: true,
  },
];

const CACHE_TTL_MS = 30_000;
const MAX_SCANNED_TEXT_LENGTH = 4000;
const MAX_REGEX_PATTERN_LENGTH = 500;
let cachedRules: { expiresAt: number; rules: InputControlRuleSnapshot[] } | null = null;

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

function ruleAppliesToSurface(rule: InputControlRuleSnapshot, surface: InputControlSurface): boolean {
  return rule.enabled && (rule.surfaces.length === 0 || rule.surfaces.includes(surface));
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

export async function inspectInputControl(input: {
  surface: InputControlSurface;
  fields: Array<unknown>;
}): Promise<InputControlViolation | null> {
  const text = normalizeText(input.fields.filter(Boolean).join(' '));
  if (!text) return null;

  const rules = await loadRules();
  const matchingRule = rules.find((rule) => ruleAppliesToSurface(rule, input.surface) && matchesRule(text, rule));
  if (!matchingRule) return null;

  return {
    code: 'INPUT_CONTROL_BLOCKED',
    surface: input.surface,
    ruleId: matchingRule.id,
    ruleLabel: matchingRule.label,
    reason: matchingRule.reason,
    message: matchingRule.blockMessage || 'This content is not allowed by the current input rules.',
  };
}
