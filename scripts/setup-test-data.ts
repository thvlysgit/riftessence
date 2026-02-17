import { PrismaClient, Role, Region, VCPreference, DuoType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting test data setup...');

  // 1. Find the user "thomas"
  const user = await prisma.user.findUnique({
    where: { username: 'thomas' },
  });

  if (!user) {
    console.error('User "thomas" not found in database!');
    process.exit(1);
  }

  console.log(`Found user: ${user.username} (ID: ${user.id})`);

  // 2. Set password to "T01102007b"
  const hashedPassword = await bcrypt.hash('T01102007b', 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });
  console.log('✓ Password set successfully');

  // 3. Create 20 mock duo posts
  const roles = [Role.TOP, Role.JUNGLE, Role.MID, Role.ADC, Role.SUPPORT];
  const regions = [Region.EUW, Region.NA, Region.EUNE, Region.KR];
  const vcPrefs = [VCPreference.ALWAYS, VCPreference.SOMETIMES, VCPreference.NEVER];
  const duoTypes = [DuoType.SHORT_TERM, DuoType.LONG_TERM, DuoType.BOTH];

  const descriptions = [
    'Looking for chill duo partner to climb ranked!',
    'Need a support main who can make plays',
    'Searching for long-term duo, let\'s improve together',
    'Want to play some normals and have fun',
    'LF serious duo for challenger push',
    'Casual player looking for friends to play with',
    'Need jungle main who can gank my lane',
    'Looking for ADC to synergize with',
    'Want duo who communicates well',
    'Searching for someone to play clash with',
    'Need top laner for flex queue',
    'Looking for mid laner with good roams',
    'Want aggressive support to dominate bot lane',
    'LF duo for late night gaming sessions',
    'Need someone to help me improve',
    'Looking for duo with positive mental',
    'Want to spam ranked and climb fast',
    'Searching for duo partner for new season',
    'Need someone who plays tanks',
    'Looking for carry player to duo with',
  ];

  console.log('\nCreating 20 mock duo posts...');
  
  for (let i = 0; i < 20; i++) {
    const post = await prisma.duoPost.create({
      data: {
        userId: user.id,
        role: roles[i % roles.length],
        region: regions[i % regions.length],
        description: descriptions[i],
        vcPreference: vcPrefs[i % vcPrefs.length],
        duoType: duoTypes[i % duoTypes.length],
        languages: i % 3 === 0 ? ['en', 'fr'] : i % 3 === 1 ? ['en', 'es'] : ['en'],
        playstyles: i % 2 === 0 ? ['aggressive', 'shotcaller'] : ['supportive', 'flexible'],
        active: true,
      },
    });
    console.log(`✓ Created post ${i + 1}/20 (ID: ${post.id})`);
  }

  console.log('\n✓ All test data setup complete!');
  console.log('\nSummary:');
  console.log(`- Username: thomas`);
  console.log(`- Password: T01102007b`);
  console.log(`- Riot Account: Thvlys#9099`);
  console.log(`- Created 20 mock duo posts`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
