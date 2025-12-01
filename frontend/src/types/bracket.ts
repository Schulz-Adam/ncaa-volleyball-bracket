export interface Set {
  id: string;
  matchId: string;
  setNumber: number;
  team1Score: number;
  team2Score: number;
  createdAt: string;
}

export interface Match {
  id: string;
  round: number; // 1-6 (Round of 64, 32, 16, 8, 4, Championship)
  matchNumber: number;
  team1: string;
  team2: string;
  winner: string | null; // "team1" or "team2" when completed
  completed: boolean;
  matchDate: string;
  scrapedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sets?: Set[];
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedWinner: string; // "team1" or "team2"
  predictedTotalSets: number; // 3, 4, or 5
  pointsEarned: number | null;
  createdAt: string;
}

export interface MatchWithPrediction extends Match {
  userPrediction?: Prediction;
}

export const ROUND_NAMES: Record<number, string> = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final Four',
  6: 'Championship',
};
