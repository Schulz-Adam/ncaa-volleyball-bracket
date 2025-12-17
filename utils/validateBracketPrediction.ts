import { prisma } from '../lib/prisma';

/**
 * Validates if a user's prediction for a Round 2+ match is valid
 * A prediction is only valid if the user correctly predicted the WINNING team to advance
 * (We don't care if they got the losing team wrong)
 *
 * @param predictionId - The prediction to validate
 * @param matchId - The match being validated
 * @param userId - The user who made the prediction
 * @returns true if the prediction is valid (user predicted winning team to advance), false otherwise
 */
export async function validateBracketPrediction(
  predictionId: string,
  matchId: string,
  userId: string
): Promise<boolean> {
  // Get the match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) return false;

  // Round 1 matches are always valid (no previous rounds to check)
  if (match.round === 1) return true;

  // For Round 2+, we need to validate the user predicted the correct teams
  // Get all matches ordered to find which previous matches feed into this one
  const allMatches = await prisma.match.findMany({
    where: { round: { lte: match.round } },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  // Get user's predictions for previous rounds
  const userPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      match: { round: { lt: match.round } },
    },
    include: { match: true },
  });

  // Build a map of user's predicted winners by match ID
  const predictedWinners = new Map<string, string>();
  for (const pred of userPredictions) {
    if (pred.match.completed && pred.match.winner) {
      // Use predictedTeamName if available (new method), otherwise fall back to position-based lookup
      const winnerTeam = pred.predictedTeamName
        ? pred.predictedTeamName
        : (pred.predictedWinner === 'team1' ? pred.match.team1 : pred.match.team2);
      predictedWinners.set(pred.matchId, winnerTeam);
    }
  }

  // Determine which previous matches feed into this match
  const matchesByRound = allMatches.reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {} as Record<number, typeof allMatches>);

  const currentRound = matchesByRound[match.round];
  const previousRound = matchesByRound[match.round - 1];

  if (!currentRound || !previousRound) return false;

  const matchIndex = currentRound.findIndex(m => m.id === matchId);
  if (matchIndex === -1) return false;

  // Calculate which previous round matches feed into this match
  let prevMatch1Idx: number;
  let prevMatch2Idx: number;

  if (match.round === 5) {
    // Final Four: pair matches 0-2 and 1-3 from Elite 8
    prevMatch1Idx = matchIndex;
    prevMatch2Idx = matchIndex + 2;
  } else if (match.round === 4) {
    // Elite 8: reversed pairing due to regional crossover
    // R4[0] ← R3[6,7], R4[1] ← R3[4,5], R4[2] ← R3[2,3], R4[3] ← R3[0,1]
    const reversedIndex = (currentRound.length - 1) - matchIndex;
    prevMatch1Idx = reversedIndex * 2;
    prevMatch2Idx = reversedIndex * 2 + 1;
  } else {
    // Normal pairing: matches pair sequentially (0-1, 2-3, 4-5, etc.)
    prevMatch1Idx = matchIndex * 2;
    prevMatch2Idx = matchIndex * 2 + 1;
  }

  const prevMatch1 = previousRound[prevMatch1Idx];
  const prevMatch2 = previousRound[prevMatch2Idx];

  if (!prevMatch1 || !prevMatch2) return false;

  // Get the actual winning team name
  if (!match.winner) return false; // Match not completed yet
  const actualWinner = match.winner === 'team1' ? match.team1 : match.team2;

  // Check what the user predicted for the previous matches
  const predictedTeam1 = predictedWinners.get(prevMatch1.id);
  const predictedTeam2 = predictedWinners.get(prevMatch2.id);

  // If user didn't predict either previous match, they can't have a valid bracket
  if (!predictedTeam1 || !predictedTeam2) return false;

  // Normalize team names for comparison
  const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

  // Check if the user predicted the WINNING team to advance from either previous match
  // We only care that they predicted the winner correctly, not the losing team
  const normalizedWinner = normalize(actualWinner);
  const userPredictedTeam1 = normalize(predictedTeam1);
  const userPredictedTeam2 = normalize(predictedTeam2);

  // Valid if the winning team matches either of the user's predicted teams
  const winnerMatches =
    normalizedWinner === userPredictedTeam1 ||
    normalizedWinner === userPredictedTeam2;

  return winnerMatches;
}
