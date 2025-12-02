/**
 * Admin script to complete a match and calculate points
 *
 * Usage:
 *   npx tsx complete-match.ts <matchId> <winner> <set1> <set2> [set3] [set4] [set5]
 *
 * Example:
 *   npx tsx complete-match.ts abc123 team1 "25-20" "23-25" "25-22"
 *   npx tsx complete-match.ts abc123 team2 "20-25" "25-23" "22-25" "25-20" "15-13"
 *
 * Set format: "team1Score-team2Score" (e.g., "25-20")
 * Winner must be either "team1" or "team2"
 */

import { prisma } from './src/lib/prisma.js';
import { calculatePoints, determineWinner, calculateTotalSets } from './src/utils/pointCalculation.js';

async function completeMatch() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('Usage: npx tsx complete-match.ts <matchId> <winner> <set1> <set2> [set3] [set4] [set5]');
    console.error('Example: npx tsx complete-match.ts abc123 team1 "25-20" "23-25" "25-22"');
    process.exit(1);
  }

  const [matchId, winner, ...setScores] = args;

  // Validate winner
  if (!['team1', 'team2'].includes(winner)) {
    console.error('Error: Winner must be "team1" or "team2"');
    process.exit(1);
  }

  // Parse set scores
  const sets: Array<{ team1Score: number; team2Score: number }> = [];
  for (const score of setScores) {
    const match = score.match(/^(\d+)-(\d+)$/);
    if (!match) {
      console.error(`Error: Invalid set score format "${score}". Use format "25-20"`);
      process.exit(1);
    }
    sets.push({
      team1Score: parseInt(match[1]),
      team2Score: parseInt(match[2]),
    });
  }

  // Validate: Must have 3-5 sets
  if (sets.length < 3 || sets.length > 5) {
    console.error('Error: Volleyball matches must have 3-5 sets');
    process.exit(1);
  }

  try {
    // Get match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        predictions: true,
      },
    });

    if (!match) {
      console.error(`Error: Match ${matchId} not found`);
      process.exit(1);
    }

    if (match.completed) {
      console.error(`Error: Match ${matchId} is already completed`);
      console.error('Use recalculate-match.ts if you need to update an existing result');
      process.exit(1);
    }

    // Verify winner matches set results
    const calculatedWinner = determineWinner(sets);
    if (calculatedWinner !== winner) {
      console.error(`Error: Winner "${winner}" does not match set results`);
      console.error(`Based on set scores, the winner should be "${calculatedWinner}"`);
      process.exit(1);
    }

    const totalSets = calculateTotalSets(sets);

    console.log(`\n📋 Match Details:`);
    console.log(`   Round ${match.round}, Match ${match.matchNumber}`);
    console.log(`   ${match.team1} vs ${match.team2}`);
    console.log(`   Winner: ${winner === 'team1' ? match.team1 : match.team2}`);
    console.log(`   Total Sets: ${totalSets}`);
    console.log(`\n📊 Set Scores:`);
    sets.forEach((set, i) => {
      const setWinner = set.team1Score > set.team2Score ? match.team1 : match.team2;
      console.log(`   Set ${i + 1}: ${set.team1Score}-${set.team2Score} (${setWinner})`);
    });

    // Update match as completed
    await prisma.match.update({
      where: { id: matchId },
      data: {
        completed: true,
        winner,
      },
    });

    // Delete existing sets and create new ones
    await prisma.set.deleteMany({
      where: { matchId },
    });

    await prisma.set.createMany({
      data: sets.map((set, index) => ({
        matchId,
        setNumber: index + 1,
        team1Score: set.team1Score,
        team2Score: set.team2Score,
      })),
    });

    // Calculate and update points for all predictions
    console.log(`\n🎯 Calculating points for ${match.predictions.length} predictions...`);

    let correctWinner = 0;
    let perfectPredictions = 0;

    for (const prediction of match.predictions) {
      const points = calculatePoints(
        {
          predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
          predictedTotalSets: prediction.predictedTotalSets,
        },
        {
          winner: winner as 'team1' | 'team2',
          totalSets,
          round: match.round,
        }
      );

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });

      if (points > 0) correctWinner++;
      if (points > 1) perfectPredictions++;
    }

    console.log(`\n✅ Match completed successfully!`);
    console.log(`   Predictions updated: ${match.predictions.length}`);
    console.log(`   Correct winner: ${correctWinner}`);
    console.log(`   Perfect predictions (winner + sets): ${perfectPredictions}`);
    console.log(`   Accuracy: ${match.predictions.length > 0 ? ((correctWinner / match.predictions.length) * 100).toFixed(1) : 0}%\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error completing match:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

completeMatch();
