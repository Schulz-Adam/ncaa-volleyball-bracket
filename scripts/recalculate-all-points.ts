import { prisma } from '../lib/prisma';
import { calculatePoints } from '../utils/pointCalculation';
import { validateBracketPrediction } from '../utils/validateBracketPrediction';

/**
 * Recalculates ALL prediction points with proper bracket validation
 * This fixes the bug where Round 2+ predictions were getting points
 * even if the user predicted the wrong teams to advance
 */
async function recalculateAllPoints() {
  console.log('🔄 Recalculating all prediction points with bracket validation...\n');

  // Get all completed matches
  const completedMatches = await prisma.match.findMany({
    where: { completed: true },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    include: {
      predictions: true,
    },
  });

  console.log(`Found ${completedMatches.length} completed matches\n`);

  let totalUpdated = 0;
  let pointsChanged = 0;

  for (const match of completedMatches) {
    if (match.predictions.length === 0) continue;

    console.log(`Round ${match.round}: ${match.team1} vs ${match.team2}`);
    console.log(`  Winner: ${match.winner === 'team1' ? match.team1 : match.team2}`);

    const totalSets = (match.team1Sets || 0) + (match.team2Sets || 0);
    let matchPointsChanged = 0;

    for (const prediction of match.predictions) {
      const oldPoints = prediction.pointsEarned || 0;
      let newPoints = 0;

      // For Round 2+, validate bracket correctness
      if (match.round > 1) {
        const isValidPrediction = await validateBracketPrediction(
          prediction.id,
          match.id,
          prediction.userId
        );

        if (!isValidPrediction) {
          // User predicted wrong matchup - 0 points
          newPoints = 0;
        } else {
          // Valid matchup - calculate normally
          newPoints = calculatePoints(
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
        }
      } else {
        // Round 1 - calculate normally
        newPoints = calculatePoints(
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
      }

      // Update if points changed
      if (oldPoints !== newPoints) {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { pointsEarned: newPoints },
        });
        matchPointsChanged++;
        pointsChanged++;
      }

      totalUpdated++;
    }

    if (matchPointsChanged > 0) {
      console.log(`  ✏️  Updated ${matchPointsChanged} predictions with corrected points`);
    } else {
      console.log(`  ✓ All predictions already correct`);
    }
  }

  console.log(`\n✅ Recalculation complete!`);
  console.log(`   Total predictions checked: ${totalUpdated}`);
  console.log(`   Points corrected: ${pointsChanged}\n`);

  await prisma.$disconnect();
}

recalculateAllPoints();
