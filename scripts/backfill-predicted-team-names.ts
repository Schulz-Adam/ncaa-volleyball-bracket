import { prisma } from '../lib/prisma';

/**
 * Backfills the predictedTeamName field for all existing predictions
 *
 * Strategy:
 * - Round 1: Use the match's team1 or team2 based on predictedWinner
 * - Round 2+: Reconstruct the bracket by following previous predictions
 */
async function backfillPredictedTeamNames() {
  console.log('🔄 Backfilling predictedTeamName for existing predictions...\n');

  // Get all predictions that don't have predictedTeamName set
  const predictions = await prisma.prediction.findMany({
    where: {
      predictedTeamName: null,
    },
    include: {
      match: true,
    },
    orderBy: [
      { match: { round: 'asc' } },
      { match: { matchNumber: 'asc' } },
      { createdAt: 'asc' },
    ],
  });

  console.log(`Found ${predictions.length} predictions to backfill\n`);

  if (predictions.length === 0) {
    console.log('✅ All predictions already have predictedTeamName set!\n');
    await prisma.$disconnect();
    return;
  }

  // Group by user to process each user's bracket independently
  const predictionsByUser = new Map<string, typeof predictions>();
  for (const pred of predictions) {
    if (!predictionsByUser.has(pred.userId)) {
      predictionsByUser.set(pred.userId, []);
    }
    predictionsByUser.get(pred.userId)!.push(pred);
  }

  console.log(`Processing ${predictionsByUser.size} users...\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const [userId, userPredictions] of predictionsByUser.entries()) {
    console.log(`User: ${userId.substring(0, 8)}... (${userPredictions.length} predictions)`);

    // Build a map of user's predicted winners by match ID
    const userPredictedWinners = new Map<string, string>();

    for (const prediction of userPredictions) {
      const match = prediction.match;
      let predictedTeamName: string | null = null;

      if (match.round === 1) {
        // Round 1: Simple - just use the match's team1 or team2
        predictedTeamName = prediction.predictedWinner === 'team1' ? match.team1 : match.team2;
      } else {
        // Round 2+: Need to reconstruct from previous predictions
        predictedTeamName = await reconstructPredictedTeam(
          userId,
          match,
          prediction.predictedWinner as 'team1' | 'team2',
          userPredictedWinners
        );
      }

      if (predictedTeamName && predictedTeamName !== 'TBD') {
        // Update the prediction
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { predictedTeamName },
        });

        // Store for future rounds
        userPredictedWinners.set(match.id, predictedTeamName);

        totalUpdated++;
        console.log(`  ✓ R${match.round} Match ${match.matchNumber}: ${predictedTeamName}`);
      } else {
        totalSkipped++;
        console.log(`  ⚠ R${match.round} Match ${match.matchNumber}: Could not determine team (TBD or missing data)`);
      }
    }

    console.log('');
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}\n`);

  await prisma.$disconnect();
}

/**
 * Reconstructs which team the user predicted for a Round 2+ match
 * by looking at their previous round predictions
 */
async function reconstructPredictedTeam(
  userId: string,
  match: any,
  predictedPosition: 'team1' | 'team2',
  userPredictedWinners: Map<string, string>
): Promise<string | null> {
  // Get all matches to understand bracket structure
  const allMatches = await prisma.match.findMany({
    where: { round: { lte: match.round } },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const matchesByRound = allMatches.reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {} as Record<number, typeof allMatches>);

  const currentRound = matchesByRound[match.round];
  const previousRound = matchesByRound[match.round - 1];

  if (!currentRound || !previousRound) return null;

  const matchIndex = currentRound.findIndex(m => m.id === match.id);
  if (matchIndex === -1) return null;

  // Calculate which previous round matches feed into this match
  let prevMatchIdx: number;

  if (match.round === 5) {
    // Final Four: special pairing (0-2, 1-3)
    prevMatchIdx = predictedPosition === 'team1' ? matchIndex : matchIndex + 2;
  } else if (match.round === 4) {
    // Elite 8: reversed pairing due to regional crossover
    // R4[0] ← R3[6,7], R4[1] ← R3[4,5], R4[2] ← R3[2,3], R4[3] ← R3[0,1]
    const reversedIndex = (currentRound.length - 1) - matchIndex;
    prevMatchIdx = reversedIndex * 2 + (predictedPosition === 'team1' ? 0 : 1);
  } else {
    // Normal pairing: matches pair sequentially (0-1, 2-3, 4-5, etc.)
    prevMatchIdx = matchIndex * 2 + (predictedPosition === 'team1' ? 0 : 1);
  }

  const prevMatch = previousRound[prevMatchIdx];
  if (!prevMatch) return null;

  // Check if we already know what the user predicted for this previous match
  if (userPredictedWinners.has(prevMatch.id)) {
    return userPredictedWinners.get(prevMatch.id)!;
  }

  // Look up the user's prediction for the previous match
  const prevPrediction = await prisma.prediction.findUnique({
    where: {
      userId_matchId: {
        userId,
        matchId: prevMatch.id,
      },
    },
  });

  if (!prevPrediction) {
    // User didn't predict the previous match - can't determine team
    return null;
  }

  // If the previous prediction already has predictedTeamName, use that
  if (prevPrediction.predictedTeamName) {
    return prevPrediction.predictedTeamName;
  }

  // Otherwise, use the previous match's team1/team2
  const predictedTeam = prevPrediction.predictedWinner === 'team1'
    ? prevMatch.team1
    : prevMatch.team2;

  return predictedTeam;
}

backfillPredictedTeamNames();
