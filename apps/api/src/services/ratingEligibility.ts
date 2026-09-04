import * as riotClient from '../riotClient';

export type RiotAccountForEligibility = { id: string; puuid: string; region: string };

export type RatingEligibility = {
  sharedMatchesCount: number;
  eligibleRaterPuuids: string[];
  eligibleReceiverAccountIds: string[];
  checkedRaterAccounts: number;
  checkedReceiverAccounts: number;
  matchWindow: 50;
};

/** Check the newest 50 matches for every linked account on both sides. */
export async function checkRatingEligibility(
  raterAccounts: RiotAccountForEligibility[],
  receiverAccounts: RiotAccountForEligibility[],
): Promise<RatingEligibility> {
  if (raterAccounts.some(source => receiverAccounts.some(target => source.puuid === target.puuid))) {
    throw Object.assign(new Error('You cannot rate yourself.'), { statusCode: 400 });
  }
  const unique = new Map<string, RiotAccountForEligibility>();
  [...raterAccounts, ...receiverAccounts].forEach(account => unique.set(account.puuid, account));
  const histories = new Map<string, string[]>();
  await Promise.all([...unique.values()].map(async account => {
    histories.set(account.puuid, await riotClient.getRecentMatchIds(account.puuid, account.region, 50));
  }));

  const shared = new Set<string>();
  const raterPuuids = new Set<string>();
  const receiverIds = new Set<string>();
  for (const source of raterAccounts) {
    const sourceMatches = new Set(histories.get(source.puuid) || []);
    for (const target of receiverAccounts) {
      const common = (histories.get(target.puuid) || []).filter(id => sourceMatches.has(id));
      if (!common.length) continue;
      raterPuuids.add(source.puuid); receiverIds.add(target.id);
      common.forEach(id => shared.add(id));
    }
  }
  return {
    sharedMatchesCount: shared.size,
    eligibleRaterPuuids: [...raterPuuids],
    eligibleReceiverAccountIds: [...receiverIds],
    checkedRaterAccounts: raterAccounts.length,
    checkedReceiverAccounts: receiverAccounts.length,
    matchWindow: 50,
  };
}
