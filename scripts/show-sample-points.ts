import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showSamplePoints() {
  try {
    // Get predictions with points > 0 to show decimal formatting
    const predictions = await prisma.prediction.findMany({
      where: {
        pointsEarned: { gt: 0 }
      },
      include: {
        match: {
          select: {
            team1: true,
            team2: true,
            round: true,
          }
        }
      },
      take: 10
    });

    console.log('📊 Sample Points with Decimal Display:\n');

    predictions.forEach((p, i) => {
      console.log(`${i + 1}. ${p.match.team1} vs ${p.match.team2} (Round ${p.match.round})`);
      console.log(`   Points Earned: ${p.pointsEarned?.toFixed(2)} pts\n`);
    });

    // Show a user's total points
    const user = await prisma.user.findFirst({
      include: {
        predictions: {
          select: {
            pointsEarned: true
          }
        }
      }
    });

    if (user) {
      const totalPoints = user.predictions.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
      console.log(`Sample User Total: ${user.displayName || user.email}`);
      console.log(`Total Points: ${totalPoints.toFixed(2)}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showSamplePoints();
