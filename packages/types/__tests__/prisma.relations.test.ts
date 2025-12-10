// use require to avoid mismatched @prisma/client type export differences
const _prismaPkg: any = require('@prisma/client')
const PrismaClient = _prismaPkg.PrismaClient || _prismaPkg.default || _prismaPkg
const prisma = new PrismaClient()

if (!process.env.DATABASE_URL) {
  describe.skip('Prisma relations and constraints (skipped)', () => {
    test('skipped because DATABASE_URL is not set', () => {
      expect(true).toBe(true)
    })
  })
} else {
  describe('Prisma relations and constraints', () => {
  let userId: any
  let ratingId: any

  beforeAll(async () => {
    // Create a user with discord and riot accounts
    const u = await prisma.user.create({
      data: {
        username: 'test_rel_user',
        email: 'test_rel_user@example.com',
        name: 'Rel User',
        languages: ['en'],
        playstyles: ['supportive'],
        region: 'NA',
      },
    })

    userId = u.id

    await prisma.discordAccount.create({
      data: {
        discordId: `TEST-DISCORD-${Date.now()}`,
        username: 'testrel',
        userId: u.id,
      },
    })

    await prisma.riotAccount.create({
      data: {
        puuid: `puuid-test-${Date.now()}`,
        summonerName: 'testSumm',
        region: 'NA',
        userId: u.id,
      },
    })

    // create another user to rate
    const other = await prisma.user.create({
      data: { username: 'test_rel_other', email: `other-${Date.now()}@example.com` },
    })

    // create rating
    const r = await prisma.rating.create({
      data: {
        stars: 4,
        moons: 0,
        sharedMatchesCount: 2,
        raterId: other.id,
        receiverId: u.id,
      },
    })

    ratingId = r.id
  })

  afterAll(async () => {
    // cleanup: delete ratings, accounts, users
    if (ratingId) await prisma.rating.deleteMany({ where: { id: ratingId } })
    if (userId) {
      await prisma.riotAccount.deleteMany({ where: { userId } })
      await prisma.discordAccount.deleteMany({ where: { userId } })
      await prisma.communityMembership.deleteMany({ where: { userId } })
      await prisma.rating.deleteMany({ where: { receiverId: userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
    }

    // delete the 'other' user(s)
    await prisma.user.deleteMany({ where: { username: { contains: 'test_rel_other' } } })

    await prisma.$disconnect()
  })

  test('user has discord and at least one riot account', async () => {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      include: { discordAccount: true, riotAccounts: true },
    })

    expect(u).toBeTruthy()
    expect(u?.discordAccount).toBeTruthy()
    expect(u?.riotAccounts.length).toBeGreaterThanOrEqual(1)
  })

  test('rating relation exists and can be appealed', async () => {
    const r = await prisma.rating.findUnique({ where: { id: ratingId }, include: { rater: true, receiver: true } })
    expect(r).toBeTruthy()
    expect(r?.rater).toBeTruthy()
    expect(r?.receiver).toBeTruthy()

    const appeal = await prisma.ratingAppeal.create({
      data: {
        ratingId: ratingId,
        userId: r!.receiverId,
        reason: 'I disagree with this rating',
      },
    })

    expect(appeal).toBeTruthy()
    expect(appeal.status).toBe('OPEN')
  })

  test('post can be created with external discord id', async () => {
    const p = await prisma.post.create({ data: { title: 'External post', content: 'By external', externalDiscordId: 'D-EX-1' } })
    expect(p).toBeTruthy()
    expect(p.externalDiscordId).toBe('D-EX-1')
    // cleanup
    await prisma.post.delete({ where: { id: p.id } })
  })
  })
}
