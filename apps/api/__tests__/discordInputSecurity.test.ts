import { buildDiscordDisplayUsername, parseRiotId } from '../src/routes/discordFeed';
import { formatDuoPost } from '../src/utils/developerFeed';

describe('Discord-origin display input hardening', () => {
  test('rejects markup-shaped Riot IDs instead of turning them into account names', () => {
    const parsed = parseRiotId('<img src="" onerror=alert(window.origin)>');

    expect(parsed).toEqual({
      summonerName: null,
      gameName: null,
      tagLine: null,
    });
  });

  test('keeps valid Riot IDs intact', () => {
    const parsed = parseRiotId('WhyRWhy#EUW');

    expect(parsed).toEqual({
      summonerName: 'WhyRWhy#EUW',
      gameName: 'WhyRWhy',
      tagLine: 'EUW',
    });
  });

  test('strips HTML metacharacters from Discord-backed usernames', () => {
    const username = buildDiscordDisplayUsername('<img src="" onerror=alert(window.origin)>', '123456');

    expect(username).toBe('img src= onerror=alert(window.origin)');
    expect(username).not.toMatch(/[<>]/);
  });

  test('strips legacy stored markup from duo feed identity fields', () => {
    const formatted = formatDuoPost({
      id: 'post-1',
      createdAt: new Date('2026-05-13T18:30:00Z'),
      message: '<script>alert(window.origin)</script>',
      role: 'SUPPORT',
      secondRole: null,
      region: 'EUW',
      languages: ['English'],
      vcPreference: 'ALWAYS',
      duoType: 'BOTH',
      authorId: 'user-1',
      postingRiotAccountId: 'riot-1',
      author: {
        id: 'user-1',
        username: '<img src="" onerror=alert(window.origin)>',
        anonymous: false,
        reportCount: 0,
        ratingsReceived: [],
        discordAccount: { username: '<script>alert(1)</script>' },
        riotAccounts: [
          {
            id: 'riot-1',
            puuid: 'discord_123456',
            summonerName: '<img src="" onerror=alert(window.origin)>#EUW',
            gameName: '<img src="" onerror=alert(window.origin)>',
            tagLine: 'EUW',
            region: 'EUW',
            rank: 'UNRANKED',
            isMain: true,
          },
        ],
      },
      community: {
        id: 'community-1',
        name: '<b>EUW</b>',
        isPartner: false,
        inviteLink: null,
      },
    });

    expect(formatted.username).not.toMatch(/[<>]/);
    expect(formatted.discordUsername).not.toMatch(/[<>]/);
    expect(formatted.postingRiotAccount?.gameName).not.toMatch(/[<>]/);
    expect(formatted.community?.name).not.toMatch(/[<>]/);
  });
});
