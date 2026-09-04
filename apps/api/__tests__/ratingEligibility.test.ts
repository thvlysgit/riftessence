jest.mock('../src/riotClient', () => ({ getRecentMatchIds: jest.fn() }));
import * as riot from '../src/riotClient';
import { checkRatingEligibility } from '../src/services/ratingEligibility';

describe('rating shared-game eligibility', () => {
  const raters = [
    { id: 'r1', puuid: 'rater-1', region: 'EUW' },
    { id: 'r2', puuid: 'rater-2', region: 'NA' },
  ];
  const receivers = [
    { id: 'target-1', puuid: 'receiver-1', region: 'EUW' },
    { id: 'target-2', puuid: 'receiver-2', region: 'NA' },
  ];
  beforeEach(() => jest.resetAllMocks());

  test('checks the latest 50 games of every linked account and finds a match on a secondary account', async () => {
    (riot.getRecentMatchIds as jest.Mock).mockImplementation(async (puuid: string, _region: string, count: number) => {
      expect(count).toBe(50);
      return puuid === 'rater-2' || puuid === 'receiver-1' ? ['shared-secondary'] : [`only-${puuid}`];
    });
    const result = await checkRatingEligibility(raters, receivers);
    expect(riot.getRecentMatchIds).toHaveBeenCalledTimes(4);
    expect(result).toEqual(expect.objectContaining({
      sharedMatchesCount: 1, eligibleRaterPuuids: ['rater-2'],
      eligibleReceiverAccountIds: ['target-1'], checkedRaterAccounts: 2,
      checkedReceiverAccounts: 2, matchWindow: 50,
    }));
  });

  test('returns no eligibility when all latest-50 histories are disjoint', async () => {
    (riot.getRecentMatchIds as jest.Mock).mockImplementation(async (puuid: string) => [`only-${puuid}`]);
    expect((await checkRatingEligibility(raters, receivers)).sharedMatchesCount).toBe(0);
  });

  test('Riot outage fails the eligibility gate instead of allowing a rating form', async () => {
    (riot.getRecentMatchIds as jest.Mock).mockRejectedValue(new Error('Riot 503'));
    await expect(checkRatingEligibility(raters, receivers)).rejects.toThrow('Riot 503');
  });

  test('detects the same Riot identity before fetching public match history', async () => {
    await expect(checkRatingEligibility(raters, [{ ...receivers[0], puuid: 'rater-2' }])).rejects.toThrow(/yourself/);
    expect(riot.getRecentMatchIds).not.toHaveBeenCalled();
  });
});
