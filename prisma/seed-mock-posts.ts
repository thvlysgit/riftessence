import { PrismaClient, Region, Role, VCPreference, DuoType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the user "thomas"
  const thomasUser = await prisma.user.findUnique({
    where: { username: 'thomas' },
    include: { riotAccounts: true },
  });

  if (!thomasUser) {
    console.error('User "thomas" not found');
    process.exit(1);
  }

  // Get the main Riot account
  const mainRiotAccount = thomasUser.riotAccounts.find(acc => acc.isMain) || thomasUser.riotAccounts[0];
  
  if (!mainRiotAccount) {
    console.error('No Riot account found for user "thomas"');
    process.exit(1);
  }

  console.log(`Creating 20 mock posts for user: ${thomasUser.username}`);
  console.log(`Using Riot Account: ${mainRiotAccount.summonerName}`);

  const roles: Role[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const regions: Region[] = ['EUW', 'NA', 'EUNE', 'KR', 'BR'];
  const messages = [
    'LF chill duo for ranked',
    'Looking for someone to grind with',
    'Anyone down for some normals?',
    'Need duo for promos',
    'Looking for consistent duo partner',
    'LF friendly teammates',
    'Trying to hit Diamond, need duo',
    'Casual player looking for fun games',
    'Ranked grind session tonight',
    'Looking for long-term duo',
    'Just for fun, no flame',
    'Serious ranked climb',
    'Practice new champs together',
    'Voice chat preferred',
    'Learning my role, patient duo wanted',
    'High win rate, looking for same',
    'Weekend warrior looking for duo',
    'Late night gaming sessions',
    'Early morning ranked games',
    'Looking for shot caller duo',
  ];

  const languages = [['en'], ['en', 'fr'], ['en', 'de'], ['en', 'es']];
  const vcPrefs: VCPreference[] = ['ALWAYS', 'SOMETIMES', 'NEVER'];
  const duoTypes: DuoType[] = ['SHORT_TERM', 'LONG_TERM', 'BOTH'];

  const now = new Date();
  const posts = [];

  for (let i = 0; i < 20; i++) {
    // Create posts with varying timestamps over the last 24 hours
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));

    const post = await prisma.post.create({
      data: {
        authorId: thomasUser.id,
        postingRiotAccountId: mainRiotAccount.id,
        region: regions[i % regions.length],
        role: roles[i % roles.length],
        message: messages[i],
        languages: languages[i % languages.length],
        vcPreference: vcPrefs[i % vcPrefs.length],
        duoType: duoTypes[i % duoTypes.length],
        createdAt,
        source: 'app',
      },
    });

    posts.push(post);
    console.log(`Created post ${i + 1}/20: ${post.message} (${post.role} - ${post.region})`);
  }

  console.log(`\nSuccessfully created ${posts.length} mock posts for user "${thomasUser.username}"`);
  console.log('Posts created with timestamps spread over the last 24 hours');
}

main()
  .catch((e) => {
    console.error('Error creating mock posts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
