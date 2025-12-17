import { prisma } from '../lib/prisma';
import { calculatePoints } from '../utils/pointCalculation';
import { validateBracketPrediction } from '../utils/validateBracketPrediction';

/**
 * MASTER FIX SCRIPT
 *
 * This script applies all the bracket pairing fixes to all users:
 * 1. Fix Round 4 predictions using Round 5 data
 * 2. Reset and re-backfill Round 4+ predictions with corrected pairing logic
 * 3. Recalculate all points with proper bracket validation
 */

async function fixAllPredictions() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MASTER FIX: Correcting All Predictions and Points');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // ============================================================
    // STEP 1: Fix Round 4 predictions using Round 5 data
    // ============================================================
    console.log('📋 STEP 1/4: Fixing Round 4 predictions from Round 5 data...\n');
    await fixR4FromR5();

    // ============================================================
    // STEP 2: Reset Round 4+ predictedTeamName
    // ============================================================
    console.log('\n📋 STEP 2/4: Resetting Round 4+ predictedTeamName values...\n');
    await resetRound4Plus();

    // ============================================================
    // STEP 3: Re-backfill with corrected pairing logic
    // ============================================================
    console.log('\n📋 STEP 3/4: Re-backfilling predictions with fixed pairing...\n');
    await backfillPredictedTeamNames();

    // ============================================================
    // STEP 4: Recalculate all points
    // ============================================================
    console.log('\n📋 STEP 4/4: Recalculating all points with bracket validation...\n');
    await recalculateAllPoints();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR during fix process:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// STEP 1: Fix Round 4 from Round 5
// ============================================================
async function fixR4FromR5() {
  const r5Predictions = await prisma.prediction.findMany({
    where: {
      match: { round: 5 },
      predictedTeamName: { not: null },
    },
    include: {
      match: true,
      user: true,
    },
  });

  console.log(`   Found ${r5Predictions.length} Round 5 predictions to process`);

  let fixedCount = 0;

  for (const r5Pred of r5Predictions) {
    const predictedTeam = r5Pred.predictedTeamName!;
    const userId = r5Pred.userId;
    const r5Match = r5Pred.match;
    const r5MatchIndex = r5Match.matchNumber - 1;

    let r4MatchIndices: number[];
    if (r5MatchIndex === 0) {
      r4MatchIndices = [3, 1]; // R5 Match 1 ← R4 Matches 4 & 2
    } else {
      r4MatchIndices = [0, 2]; // R5 Match 2 ← R4 Matches 1 & 3
    }

    const r4Predictions = await prisma.prediction.findMany({
      where: {
        userId,
        match: {
          round: 4,
          matchNumber: { in: r4MatchIndices.map(i => i + 1) },
        },
      },
      include: { match: true },
    });

    for (const r4Pred of r4Predictions) {
      const r4Match = r4Pred.match;

      if (r4Match.team1 === predictedTeam || r4Match.team2 === predictedTeam) {
        const correctPredictedWinner = r4Match.team1 === predictedTeam ? 'team1' : 'team2';
        const correctPredictedTeamName = predictedTeam;

        if (r4Pred.predictedWinner !== correctPredictedWinner || r4Pred.predictedTeamName !== correctPredictedTeamName) {
          await prisma.prediction.update({
            where: { id: r4Pred.id },
            data: {
              predictedWinner: correctPredictedWinner,
              predictedTeamName: correctPredictedTeamName,
            },
          });
          fixedCount++;
        }
        break;
      }
    }
  }

  console.log(`   ✓ Fixed ${fixedCount} Round 4 predictions\n`);
}

// ============================================================
// STEP 2: Reset Round 4+ predictedTeamName
// ============================================================
async function resetRound4Plus() {
  const result = await prisma.prediction.updateMany({
    where: {
      match: { round: { gte: 4 } },
    },
    data: {
      predictedTeamName: null,
    },
  });

  console.log(`   ✓ Reset ${result.count} predictions (Rounds 4+)\n`);
}

// ============================================================
// STEP 3: Backfill with corrected pairing
// ============================================================
async function backfillPredictedTeamNames() {
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

  console.log(`   Found ${predictions.length} predictions to backfill`);

  const predictionsByUser = new Map<string, typeof predictions>();
  for (const pred of predictions) {
    if (!predictionsByUser.has(pred.userId)) {
      predictionsByUser.set(pred.userId, []);
    }
    predictionsByUser.get(pred.userId)!.push(pred);
  }

  console.log(`   Processing ${predictionsByUser.size} users...`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const [userId, userPredictions] of predictionsByUser.entries()) {
    const userPredictedWinners = new Map<string, string>();

    for (const prediction of userPredictions) {
      const match = prediction.match;
      let predictedTeamName: string | null = null;

      if (match.round === 1) {
        predictedTeamName = prediction.predictedWinner === 'team1' ? match.team1 : match.team2;
      } else {
        predictedTeamName = await reconstructPredictedTeam(
          userId,
          match,
          prediction.predictedWinner as 'team1' | 'team2',
          userPredictedWinners
        );
      }

      if (predictedTeamName && predictedTeamName !== 'TBD') {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { predictedTeamName },
        });
        userPredictedWinners.set(match.id, predictedTeamName);
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
  }

  console.log(`   ✓ Updated: ${totalUpdated}, Skipped: ${totalSkipped}\n`);
}

async function reconstructPredictedTeam(
  userId: string,
  match: any,
  predictedPosition: 'team1' | 'team2',
  userPredictedWinners: Map<string, string>
): Promise<string | null> {
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

  let prevMatchIdx: number;

  if (match.round === 5) {
    prevMatchIdx = predictedPosition === 'team1' ? matchIndex : matchIndex + 2;
  } else if (match.round === 4) {
    // Elite 8: reversed pairing
    const reversedIndex = (currentRound.length - 1) - matchIndex;
    prevMatchIdx = reversedIndex * 2 + (predictedPosition === 'team1' ? 0 : 1);
  } else {
    prevMatchIdx = matchIndex * 2 + (predictedPosition === 'team1' ? 0 : 1);
  }

  const prevMatch = previousRound[prevMatchIdx];
  if (!prevMatch) return null;

  if (userPredictedWinners.has(prevMatch.id)) {
    return userPredictedWinners.get(prevMatch.id)!;
  }

  const prevPrediction = await prisma.prediction.findUnique({
    where: {
      userId_matchId: {
        userId,
        matchId: prevMatch.id,
      },
    },
  });

  if (!prevPrediction) return null;

  if (prevPrediction.predictedTeamName) {
    return prevPrediction.predictedTeamName;
  }

  const predictedTeam = prevPrediction.predictedWinner === 'team1'
    ? prevMatch.team1
    : prevMatch.team2;

  return predictedTeam;
}

// ============================================================
// STEP 4: Recalculate all points
// ============================================================
async function recalculateAllPoints() {
  const completedMatches = await prisma.match.findMany({
    where: { completed: true },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    include: {
      predictions: true,
    },
  });

  console.log(`   Found ${completedMatches.length} completed matches`);

  let totalUpdated = 0;
  let pointsChanged = 0;

  for (const match of completedMatches) {
    if (match.predictions.length === 0) continue;

    const totalSets = (match.team1Sets || 0) + (match.team2Sets || 0);
    const winnerTeamName = match.winner === 'team1' ? match.team1 : match.team2;

    for (const prediction of match.predictions) {
      const oldPoints = prediction.pointsEarned || 0;
      let newPoints = 0;

      if (match.round > 1) {
        const isValidPrediction = await validateBracketPrediction(
          prediction.id,
          match.id,
          prediction.userId
        );

        if (!isValidPrediction) {
          newPoints = 0;
        } else {
          newPoints = calculatePoints(
            {
              predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
              predictedTeamName: prediction.predictedTeamName,
              predictedTotalSets: prediction.predictedTotalSets,
            },
            {
              winner: match.winner as 'team1' | 'team2',
              winnerTeamName,
              totalSets,
              round: match.round,
            }
          );
        }
      } else {
        newPoints = calculatePoints(
          {
            predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
            predictedTeamName: prediction.predictedTeamName,
            predictedTotalSets: prediction.predictedTotalSets,
          },
          {
            winner: match.winner as 'team1' | 'team2',
            winnerTeamName,
            totalSets,
            round: match.round,
          }
        );
      }

      if (oldPoints !== newPoints) {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { pointsEarned: newPoints },
        });
        pointsChanged++;
      }

      totalUpdated++;
    }
  }

  console.log(`   ✓ Checked: ${totalUpdated} predictions`);
  console.log(`   ✓ Corrected: ${pointsChanged} point values\n`);
}

// Run the master fix
fixAllPredictions();
