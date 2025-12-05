import { prisma } from '../lib/prisma';

async function checkMatch() {
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { team1: { contains: 'Colorado', mode: 'insensitive' } },
        { team2: { contains: 'Colorado', mode: 'insensitive' } },
        { team1: { contains: 'American', mode: 'insensitive' } },
        { team2: { contains: 'American', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      team1: true,
      team2: true,
      winner: true,
      completed: true,
      round: true,
    },
  });

  console.log('\n🔍 Matches with Colorado or American:\n');
  matches.forEach(m => {
    console.log(`${m.team1} vs ${m.team2}`);
    console.log(`  Round: ${m.round}, Completed: ${m.completed}, Winner: ${m.winner || 'None'}\n`);
  });

  await prisma.$disconnect();
}

checkMatch();
