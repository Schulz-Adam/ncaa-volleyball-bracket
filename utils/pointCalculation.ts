/**
 * Point calculation utilities for NCAA Volleyball Bracket
 *
 * Scoring Rules:
 * - Correct winner: 1 point
 * - Correct winner + correct total sets: 1 point × round multiplier
 *
 * Round Multipliers:
 * - Round of 64 (round 1): 1.1x
 * - Round of 32 (round 2): 1.25x
 * - Sweet 16 (round 3): 1.5x
 * - Elite 8 (round 4): 1.75x
 * - Final Four (round 5): 2x
 * - Championship (round 6): 2.5x
 */

const ROUND_MULTIPLIERS: Record<number, number> = {
  1: 1.1,   // Round of 64
  2: 1.25,  // Round of 32
  3: 1.5,   // Sweet 16
  4: 1.75,  // Elite 8
  5: 2.0,   // Final Four
  6: 2.5,   // Championship
};

interface MatchResult {
  winner: 'team1' | 'team2';
  totalSets: number;
  round: number;
}

interface Prediction {
  predictedWinner: 'team1' | 'team2';
  predictedTotalSets: number;
}

/**
 * Calculate points earned for a single prediction
 * @param prediction User's prediction
 * @param result Actual match result
 * @returns Points earned (0 if wrong, 1 if correct winner, 1×multiplier if both correct)
 */
export function calculatePoints(prediction: Prediction, result: MatchResult): number {
  // Wrong winner = 0 points
  if (prediction.predictedWinner !== result.winner) {
    return 0;
  }

  // Correct winner = 1 point base
  let points = 1;

  // If also predicted correct total sets, apply round multiplier
  if (prediction.predictedTotalSets === result.totalSets) {
    const multiplier = ROUND_MULTIPLIERS[result.round] || 1;
    points = points * multiplier;
  }

  return points;
}

/**
 * Get the multiplier for a specific round
 * @param round Round number (1-6)
 * @returns Multiplier value
 */
export function getRoundMultiplier(round: number): number {
  return ROUND_MULTIPLIERS[round] || 1;
}

/**
 * Calculate total sets from match sets array
 * @param sets Array of set results
 * @returns Total number of sets played
 */
export function calculateTotalSets(sets: Array<{ team1Score: number; team2Score: number }>): number {
  return sets.length;
}

/**
 * Determine winner from match sets
 * @param sets Array of set results
 * @returns 'team1' or 'team2' based on who won more sets, or null if tie/incomplete
 */
export function determineWinner(sets: Array<{ team1Score: number; team2Score: number }>): 'team1' | 'team2' | null {
  let team1Wins = 0;
  let team2Wins = 0;

  for (const set of sets) {
    if (set.team1Score > set.team2Score) {
      team1Wins++;
    } else if (set.team2Score > set.team1Score) {
      team2Wins++;
    }
  }

  // Volleyball is best of 5, need 3 sets to win
  if (team1Wins >= 3) return 'team1';
  if (team2Wins >= 3) return 'team2';

  return null; // Match not complete or invalid
}
