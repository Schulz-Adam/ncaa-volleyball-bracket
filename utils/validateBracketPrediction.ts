import { prisma } from '../lib/prisma';

/**
 * Validates if a user's prediction for a Round 2+ match is valid
 * A prediction is only valid if the user correctly predicted the teams that would be in this match
 *
 * @param predictionId - The prediction to validate
 * @param matchId - The match being validated
 * @param userId - The user who made the prediction
 * @returns true if the prediction is valid (user predicted correct matchup), false otherwise
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
      const winnerTeam = pred.predictedWinner === 'team1'
        ? pred.match.team1
        : pred.match.team2;
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
  } else {
    // Normal pairing: matches pair sequentially (0-1, 2-3, 4-5, etc.)
    prevMatch1Idx = matchIndex * 2;
    prevMatch2Idx = matchIndex * 2 + 1;
  }

  const prevMatch1 = previousRound[prevMatch1Idx];
  const prevMatch2 = previousRound[prevMatch2Idx];

  if (!prevMatch1 || !prevMatch2) return false;

  // Check what the user predicted for these previous matches
  const predictedTeam1 = predictedWinners.get(prevMatch1.id);
  const predictedTeam2 = predictedWinners.get(prevMatch2.id);

  // If user didn't predict either previous match, they can't have a valid bracket for this round
  if (!predictedTeam1 || !predictedTeam2) return false;

  // Normalize team names for comparison
  const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

  // Check if the teams the user predicted match the actual teams in this match
  const actualTeam1 = normalize(match.team1);
  const actualTeam2 = normalize(match.team2);
  const userTeam1 = normalize(predictedTeam1);
  const userTeam2 = normalize(predictedTeam2);

  // Teams match if they're in the right slots OR reversed
  const teamsMatch =
    (userTeam1 === actualTeam1 && userTeam2 === actualTeam2) ||
    (userTeam1 === actualTeam2 && userTeam2 === actualTeam1);

  return teamsMatch;
}
