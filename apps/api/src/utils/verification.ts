import prisma from '../prisma';

export async function syncUserVerification(userId: string): Promise<boolean> {
  const [riotAccountsCount, discordAccountsCount] = await Promise.all([
    prisma.riotAccount.count({
      where: {
        userId,
        puuid: { not: { startsWith: 'discord_' } },
        OR: [{ rsoLinked: true }, { verified: true }],
      },
    }),
    prisma.discordAccount.count({ where: { userId } }),
  ]);

  const verified = riotAccountsCount > 0 && discordAccountsCount > 0;

  await prisma.user.updateMany({
    where: { id: userId },
    data: { verified },
  });

  return verified;
}
