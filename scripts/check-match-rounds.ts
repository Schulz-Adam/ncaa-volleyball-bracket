import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMatchRounds() {
  try {
    const completedMatches = await prisma.match.findMany({
      where: {
        completed: true
      },
      select: {
        id: true,
        team1: true,
        team2: true,
        round: true,
        team1Sets: true,
        team2Sets: true
      },
      orderBy: {
        round: 'asc'
      }
    });

    console.log('🔍 Checking Round Values for Completed Matches:\n');

    completedMatches.forEach((match, i) => {
      console.log(`${i + 1}. ${match.team1} vs ${match.team2}`);
      console.log(`   Round: ${match.round} (type: ${typeof match.round})`);
      console.log(`   Score: ${match.team1Sets}-${match.team2Sets}`);
      console.log('');
    });

    // Check for round 1 matches specifically
    const round1Count = completedMatches.filter(m => m.round === 1).length;
    console.log(`\nMatches with round === 1: ${round1Count}`);
    console.log(`Total completed matches: ${completedMatches.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMatchRounds();
