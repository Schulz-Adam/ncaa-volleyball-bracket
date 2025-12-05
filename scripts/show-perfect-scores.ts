import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showPerfectScores() {
  try {
    // Get predictions with points > 1 (perfect predictions with multiplier)
    const perfectPredictions = await prisma.prediction.findMany({
      where: {
        pointsEarned: { gt: 1 }
      },
      include: {
        match: {
          select: {
            team1: true,
            team2: true,
            round: true,
            winner: true,
            team1Sets: true,
            team2Sets: true,
          }
        }
      },
      take: 10
    });

    console.log('🎯 Perfect Predictions (Correct Winner + Correct Sets):\n');

    perfectPredictions.forEach((p, i) => {
      const totalSets = (p.match.team1Sets || 0) + (p.match.team2Sets || 0);
      console.log(`${i + 1}. ${p.match.team1} vs ${p.match.team2}`);
      console.log(`   Predicted: ${p.predictedWinner} in ${p.predictedTotalSets} sets`);
      console.log(`   Actual: ${p.match.winner} in ${totalSets} sets`);
      console.log(`   Points Earned: ${p.pointsEarned?.toFixed(2)} pts (Round ${p.match.round} multiplier: 1.1x)\n`);
    });

    console.log(`\nTotal Perfect Predictions Found: ${perfectPredictions.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showPerfectScores();
