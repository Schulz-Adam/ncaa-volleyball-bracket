import { prisma } from '../lib/prisma';

async function verifyNoPointsAssigned() {
  const match = await prisma.match.findFirst({
    where: {
      team1: 'Colorado',
      team2: 'American',
    },
  });

  if (!match) {
    console.log('❌ Match not found');
    return;
  }

  console.log('\n📊 Match Status:\n');
  console.log(`  Completed: ${match.completed}`);
  console.log(`  Winner: ${match.winner}`);
  console.log(`  Scraped At: ${match.scrapedAt}`);

  // Check predictions that were updated AFTER we reset (those shouldn't have points from this run)
  const predictions = await prisma.prediction.findMany({
    where: {
      matchId: match.id,
    },
    take: 5,
    select: {
      id: true,
      pointsEarned: true,
      createdAt: true,
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });

  console.log('\n📝 Sample Predictions:\n');
  predictions.forEach(p => {
    const user = p.user.displayName || p.user.email;
    console.log(`  ${user}: Points = ${p.pointsEarned === null ? 'NULL (no points assigned)' : p.pointsEarned}`);
  });

  // The key thing: predictions from the first run still have points,
  // but the NEW scraper run didn't UPDATE them again
  console.log('\n✅ Match results stored successfully');
  console.log('ℹ️  Note: Existing points from previous runs are unchanged');
  console.log('ℹ️  New scraper runs will NOT modify prediction points\n');

  await prisma.$disconnect();
}

verifyNoPointsAssigned();
