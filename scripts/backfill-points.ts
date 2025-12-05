/**
 * Backfill points for all completed matches
 *
 * This script calculates and updates points for all predictions
 * where the match has been completed but points haven't been calculated yet.
 */

import { PrismaClient } from '@prisma/client';
import { calculatePoints } from '../utils/pointCalculation';

const prisma = new PrismaClient();

async function backfillPoints() {
  try {
    console.log('🔄 Starting point calculation backfill...\n');

    // Get all completed matches
    const completedMatches = await prisma.match.findMany({
      where: {
        completed: true,
        team1Sets: { not: null },
        team2Sets: { not: null },
      },
      include: {
        predictions: true,
      },
      orderBy: [
        { round: 'asc' },
        { matchNumber: 'asc' },
      ],
    });

    console.log(`📊 Found ${completedMatches.length} completed match(es)\n`);

    let totalPredictionsUpdated = 0;
    let totalMatchesProcessed = 0;

    for (const match of completedMatches) {
      const totalSets = (match.team1Sets || 0) + (match.team2Sets || 0);

      console.log(`⚡ ${match.team1} vs ${match.team2}`);
      console.log(`   Winner: ${match.winner === 'team1' ? match.team1 : match.team2}`);
      console.log(`   Set Score: ${match.team1Sets}-${match.team2Sets}`);
      console.log(`   Round: ${match.round}, Total Sets: ${totalSets}`);

      let correctPredictions = 0;
      let perfectPredictions = 0;
      let wrongPredictions = 0;

      for (const prediction of match.predictions) {
        const points = calculatePoints(
          {
            predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
            predictedTotalSets: prediction.predictedTotalSets,
          },
          {
            winner: match.winner as 'team1' | 'team2',
            totalSets,
            round: match.round,
          }
        );

        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { pointsEarned: points },
        });

        if (points === 0) {
          wrongPredictions++;
        } else if (points === 1) {
          correctPredictions++;
        } else {
          perfectPredictions++;
        }

        totalPredictionsUpdated++;
      }

      console.log(`   Predictions: ${match.predictions.length} total`);
      console.log(`   - Perfect (winner + sets): ${perfectPredictions}`);
      console.log(`   - Correct winner only: ${correctPredictions}`);
      console.log(`   - Wrong: ${wrongPredictions}\n`);

      totalMatchesProcessed++;
    }

    console.log('─'.repeat(50));
    console.log(`\n✅ Backfill Complete!`);
    console.log(`   Matches Processed: ${totalMatchesProcessed}`);
    console.log(`   Predictions Updated: ${totalPredictionsUpdated}\n`);

    // Show top 10 users by points
    const topUsers = await prisma.user.findMany({
      include: {
        predictions: {
          select: {
            pointsEarned: true,
          },
        },
      },
      take: 10,
    });

    const leaderboard = topUsers
      .map(user => ({
        name: user.displayName || user.email.split('@')[0],
        points: user.predictions.reduce((sum, p) => sum + (p.pointsEarned || 0), 0),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    console.log('🏆 Top 10 Leaderboard:');
    leaderboard.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. ${entry.name}: ${entry.points.toFixed(2)} points`);
    });

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillPoints();
