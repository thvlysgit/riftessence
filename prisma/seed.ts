import { PrismaClient, VCPreference, Region, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Badges
  const badgeStaff = await prisma.badge.upsert({
    where: { key: 'staff' },
    update: {},
    create: { key: 'staff', name: 'Staff', description: 'Community staff' },
  })

  const badgeVeteran = await prisma.badge.upsert({
    where: { key: 'veteran' },
    update: {},
    create: { key: 'veteran', name: 'Veteran', description: 'Long-time player' },
  })

  // Users
  const users = [] as any[]
  for (let i = 1; i <= 5; i++) {
    const u = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        username: `player${i}`,
        name: `Player ${i}`,
        bio: `Hello I'm player ${i}`,
        anonymous: false,
        vcPreference: i % 3 === 0 ? VCPreference.ALWAYS : VCPreference.SOMETIMES,
        languages: i % 2 === 0 ? ['en', 'es'] : ['en'],
        playstyles: i % 2 === 0 ? ['aggressive', 'shotcaller'] : ['supportive'],
        primaryRole: i % 5 === 0 ? Role.FLEX : (i % 5 === 1 ? Role.TOP : (i % 5 === 2 ? Role.JUNGLE : (i % 5 === 3 ? Role.MID : Role.ADC))),
        region: i % 2 === 0 ? Region.NA : Region.EUW,
        badges: { connect: [badgeVeteran ? { id: badgeVeteran.id } : undefined].filter(Boolean) },
        verified: i === 1,
      },
    })

    // discord account
    await prisma.discordAccount.create({
      data: {
        discordId: `D${1000 + i}`,
        username: `player${i}`,
        discriminator: `00${i}`,
        userId: u.id,
      },
    })

    // one or two riot accounts
    await prisma.riotAccount.create({
      data: {
        puuid: `puuid-${i}-a`,
        summonerName: `summoner${i}A`,
        region: i % 2 === 0 ? Region.NA : Region.EUW,
        userId: u.id,
      },
    })

    if (i % 2 === 0) {
      await prisma.riotAccount.create({
        data: {
          puuid: `puuid-${i}-b`,
          summonerName: `summoner${i}B`,
          region: Region.NA,
          userId: u.id,
        },
      })
    }

    users.push(u)
  }

  // Communities
  const communityA = await prisma.community.create({
    data: { name: 'NA Chill', slug: 'na-chill', region: Region.NA, description: 'Chill NA community' },
  })
  const communityB = await prisma.community.create({
    data: { name: 'EU Competitive', slug: 'eu-comp', region: Region.EUW, description: 'Competitive EU' },
  })
  const communityC = await prisma.community.create({
    data: { name: 'Global Friends', slug: 'global-friends', description: 'Open to all regions' },
  })

  // memberships
  await prisma.communityMembership.createMany({
    data: [
      { userId: users[0].id, communityId: communityA.id, role: 'ADMIN' },
      { userId: users[1].id, communityId: communityA.id, role: 'MEMBER' },
      { userId: users[2].id, communityId: communityB.id, role: 'MODERATOR' },
      { userId: users[3].id, communityId: communityB.id, role: 'MEMBER' },
      { userId: users[4].id, communityId: communityC.id, role: 'MEMBER' },
    ],
  })

  // Posts: some authored, some external discord
  const postsData = [
    { title: 'LF Duo', content: 'Looking for duo', authorId: users[0].id },
    { title: 'Selling skins', content: 'Cheap skins', externalDiscordId: 'D2001' },
    { title: 'Clan Invite', content: 'Join our clan', authorId: users[1].id },
    { title: 'LFG Tonight', content: 'Playing tonight', externalDiscordId: 'D2002' },
    { title: 'Guide', content: 'Champion guide', authorId: users[2].id },
    { title: 'Voice Chat Invite', content: 'Join voice', authorId: users[3].id },
    { title: 'Tournament', content: 'Tournament signups', authorId: users[4].id },
    { title: 'Random', content: 'Hello', externalDiscordId: 'D3001' },
  ]

  for (const p of postsData) {
    await prisma.post.create({ data: p as any })
  }

  // Ratings (some)
  await prisma.rating.create({
    data: {
      stars: 5,
      moons: 1,
      sharedMatchesCount: 3,
      comment: 'Great teammate',
      raterId: users[1].id,
      receiverId: users[0].id,
    },
  })

  // Match history sample
  await prisma.matchHistory.create({
    data: {
      userId: users[0].id,
      opponentId: users[1].id,
      result: 'WIN',
      sharedMatchesCount: 2,
    },
  })

  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
