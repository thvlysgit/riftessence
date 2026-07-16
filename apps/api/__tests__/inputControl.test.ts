jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    inputControlRule: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '../src/prisma';
import { collectInputControlTextFields, inspectInputControl, invalidateInputControlRulesCache } from '../src/utils/inputControl';

const findMany = prisma.inputControlRule.findMany as jest.Mock;

function rule(overrides: Record<string, any>) {
  return {
    id: 'rule-1',
    label: 'Rule',
    kind: 'PHRASE',
    pattern: 'blocked',
    reason: null,
    blockMessage: null,
    surfaces: ['DUO_POST'],
    enabled: true,
    ...overrides,
  };
}

describe('input control matcher', () => {
  beforeEach(() => {
    findMany.mockReset();
    invalidateInputControlRulesCache();
  });

  test('blocks configured advertising prefixes before duo post creation', async () => {
    findMany.mockResolvedValue([
      rule({
        id: 'discord-rule',
        label: 'Discord invite advertising',
        kind: 'PREFIX',
        pattern: 'discord.gg/',
        reason: 'External community advertising',
        blockMessage: 'Advertising is blocked.',
      }),
    ]);

    const result = await inspectInputControl({
      surface: 'DUO_POST',
      fields: ['discord.gg/my-server join here'],
    });

    expect(result).toMatchObject({
      code: 'INPUT_CONTROL_BLOCKED',
      ruleId: 'discord-rule',
      message: 'Advertising is blocked.',
    });
  });

  test('does not match word rules inside larger words', async () => {
    findMany.mockResolvedValue([
      rule({
        id: 'word-rule',
        kind: 'WORD',
        pattern: 'cat',
      }),
    ]);

    const result = await inspectInputControl({
      surface: 'DUO_POST',
      fields: ['Looking for someone to play bot lane with cathedral vibes'],
    });

    expect(result).toBeNull();
  });

  test('ignores invalid regex rules instead of failing the request', async () => {
    findMany.mockResolvedValue([
      rule({
        id: 'bad-regex',
        kind: 'REGEX',
        pattern: '[unterminated',
      }),
    ]);

    const result = await inspectInputControl({
      surface: 'DUO_POST',
      fields: ['anything'],
    });

    expect(result).toBeNull();
  });

  test('applies global rules to any requested surface', async () => {
    findMany.mockResolvedValue([
      rule({
        id: 'global-rule',
        kind: 'PHRASE',
        pattern: 'boosting service',
        surfaces: ['GLOBAL'],
      }),
    ]);

    const result = await inspectInputControl({
      surfaces: ['CHAT_MESSAGE'],
      fields: ['cheap boosting service'],
    });

    expect(result).toMatchObject({
      code: 'INPUT_CONTROL_BLOCKED',
      ruleId: 'global-rule',
      surface: 'CHAT_MESSAGE',
    });
  });

  test('collects nested user text while skipping sensitive fields', () => {
    const fields = collectInputControlTextFields({
      password: 'discord.gg/secret-password',
      profile: {
        bio: 'Looking for duo',
        nested: ['twitch.tv/channel'],
      },
      authToken: 'discord.gg/token',
    });

    expect(fields).toEqual(['Looking for duo', 'twitch.tv/channel']);
  });
});
