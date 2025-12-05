import { prisma } from '../lib/prisma';

async function showAllCompleted() {
  const matches = await prisma.match.findMany({
    where: {
      completed: true,
    },
    orderBy: {
      scrapedAt: 'desc',
    },
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              ALL COMPLETED MATCHES');
  console.log('═══════════════════════════════════════════════════════\n');

  if (matches.length === 0) {
    console.log('No completed matches found.\n');
  } else {
    console.log(`Total completed matches: ${matches.length}\n`);

    matches.forEach((match, index) => {
      const winner = match.winner === 'team1' ? match.team1 : match.team2;
      const loser = match.winner === 'team1' ? match.team2 : match.team1;

      console.log(`${index + 1}. ${match.team1} vs ${match.team2}`);
      console.log(`   Round ${match.round} | Match #${match.matchNumber}`);
      console.log(`   🏆 Winner: ${winner}`);
      console.log(`   📅 Scraped: ${match.scrapedAt?.toLocaleString() || 'N/A'}`);
      console.log('');
    });
  }

  console.log('═══════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

showAllCompleted();
