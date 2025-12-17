import { prisma } from '../lib/prisma';

/**
 * Fix Round 4 predictions by working backwards from Round 5
 * If a user predicted a team in Round 5, they must have predicted that team to win in Round 4
 */
async function fixR4FromR5() {
  console.log('🔄 Fixing Round 4 predictions based on Round 5...\n');

  // Get all Round 5 predictions
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

  console.log(`Found ${r5Predictions.length} Round 5 predictions\n`);

  let fixedCount = 0;

  for (const r5Pred of r5Predictions) {
    const predictedTeam = r5Pred.predictedTeamName!;
    const userId = r5Pred.userId;
    const r5Match = r5Pred.match;

    console.log(`User ${r5Pred.user.email}: Predicted ${predictedTeam} in R5 Match ${r5Match.matchNumber}`);

    // Find which R4 match this team should have come from
    // R5 actual pairing: R5[0] ← R4[3,1], R5[1] ← R4[0,2]
    const r5MatchIndex = r5Match.matchNumber - 1; // Convert to 0-based
    let r4MatchIndices: number[];

    if (r5MatchIndex === 0) {
      r4MatchIndices = [3, 1]; // R5 Match 1 ← R4 Matches 4 & 2
    } else {
      r4MatchIndices = [0, 2]; // R5 Match 2 ← R4 Matches 1 & 3
    }

    console.log(`  This team should come from R4 Match ${r4MatchIndices[0] + 1} or ${r4MatchIndices[1] + 1}`);

    // Get the user's R4 predictions for these matches
    const r4Predictions = await prisma.prediction.findMany({
      where: {
        userId,
        match: {
          round: 4,
          matchNumber: { in: r4MatchIndices.map(i => i + 1) },
        },
      },
      include: {
        match: true,
      },
    });

    // Find which R4 match contains the predicted team
    for (const r4Pred of r4Predictions) {
      const r4Match = r4Pred.match;

      // Check if the predicted team is in this match
      if (r4Match.team1 === predictedTeam || r4Match.team2 === predictedTeam) {
        // Determine the correct predictedWinner value
        const correctPredictedWinner = r4Match.team1 === predictedTeam ? 'team1' : 'team2';
        const correctPredictedTeamName = predictedTeam;

        if (r4Pred.predictedWinner !== correctPredictedWinner || r4Pred.predictedTeamName !== correctPredictedTeamName) {
          console.log(`  → Found in R4 Match ${r4Match.matchNumber}: ${r4Match.team1} vs ${r4Match.team2}`);
          console.log(`     Old: predictedWinner=${r4Pred.predictedWinner}, predictedTeamName=${r4Pred.predictedTeamName}`);
          console.log(`     New: predictedWinner=${correctPredictedWinner}, predictedTeamName=${correctPredictedTeamName}`);

          await prisma.prediction.update({
            where: { id: r4Pred.id },
            data: {
              predictedWinner: correctPredictedWinner,
              predictedTeamName: correctPredictedTeamName,
            },
          });

          console.log(`     ✓ Fixed!\n`);
          fixedCount++;
        } else {
          console.log(`  → Already correct in R4 Match ${r4Match.matchNumber}\n`);
        }
        break;
      }
    }
  }

  console.log(`✅ Fixed ${fixedCount} Round 4 predictions\n`);
  await prisma.$disconnect();
}

fixR4FromR5();
