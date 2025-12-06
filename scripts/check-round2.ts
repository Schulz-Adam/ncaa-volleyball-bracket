import { prisma } from '../lib/prisma';

async function checkRound2() {
  const round2 = await prisma.match.findMany({
    where: { round: 2 },
    orderBy: { matchNumber: 'asc' },
  });

  console.log(`\n📊 Round 2 Matches (${round2.length} total):\n`);

  round2.forEach((match, idx) => {
    console.log(`${idx + 1}. ${match.team1} vs ${match.team2}`);
    console.log(`   Completed: ${match.completed} | Winner: ${match.winner || 'N/A'}`);
    console.log(`   Sets: ${match.team1Sets}-${match.team2Sets}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkRound2();
