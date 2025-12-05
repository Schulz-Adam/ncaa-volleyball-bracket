import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPoints() {
  try {
    const totalPredictions = await prisma.prediction.count();
    const predictionsWithPoints = await prisma.prediction.count({
      where: {
        pointsEarned: { not: null }
      }
    });

    const completedMatches = await prisma.match.count({
      where: { completed: true }
    });

    console.log('📊 Point Calculation Status:');
    console.log(`  Total Predictions: ${totalPredictions}`);
    console.log(`  Predictions with Points: ${predictionsWithPoints}`);
    console.log(`  Completed Matches: ${completedMatches}`);
    console.log(`  Predictions Missing Points: ${totalPredictions - predictionsWithPoints}`);

    // Sample some predictions
    const samplePredictions = await prisma.prediction.findMany({
      take: 5,
      include: {
        match: {
          select: {
            team1: true,
            team2: true,
            winner: true,
            completed: true,
            team1Sets: true,
            team2Sets: true,
            round: true,
          }
        }
      }
    });

    console.log('\n📋 Sample Predictions:');
    samplePredictions.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.match.team1} vs ${p.match.team2}`);
      console.log(`   Predicted: ${p.predictedWinner} in ${p.predictedTotalSets} sets`);
      console.log(`   Actual: ${p.match.winner || 'TBD'} in ${(p.match.team1Sets || 0) + (p.match.team2Sets || 0)} sets`);
      console.log(`   Points Earned: ${p.pointsEarned ?? 'Not calculated'}`);
      console.log(`   Match Completed: ${p.match.completed}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPoints();
