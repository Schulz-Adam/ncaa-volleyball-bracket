import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySetScores() {
  try {
    const completedMatches = await prisma.match.findMany({
      where: {
        completed: true,
        team1Sets: { not: null }
      },
      select: {
        team1: true,
        team2: true,
        winner: true,
        team1Sets: true,
        team2Sets: true,
      },
      take: 10
    });

    console.log('✅ Sample of matches with set scores:\n');

    completedMatches.forEach(match => {
      const winnerName = match.winner === 'team1' ? match.team1 : match.team2;
      console.log(`${match.team1} vs ${match.team2}`);
      console.log(`  Winner: ${winnerName}`);
      console.log(`  Set Score: ${match.team1Sets}-${match.team2Sets}\n`);
    });

    const totalWithSets = await prisma.match.count({
      where: {
        team1Sets: { not: null },
        team2Sets: { not: null }
      }
    });

    console.log(`📊 Total matches with set scores: ${totalWithSets}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySetScores();
